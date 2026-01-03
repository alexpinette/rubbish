<script>
	import { page } from '$app/stores';
	import { round, session } from '$lib/store';
	import {
		SESSION,
		CORRECT,
		DASHER,
		GUESSES,
		SCOREBOARD,
		VOTES,
		USERNAME,
		TRUE_RESPONSE,
	} from '$lib/constants';
	import { enhance } from '$app/forms';
	import { onMount, tick } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { quintOut, elasticOut } from 'svelte/easing';
	import { getContext } from 'svelte';
	import { getCategoryWords } from '$lib/utils';
	import Header from '../globals/Header.svelte';
	import PlayerName from '../parts/PlayerName.svelte';

	const { players, data, scoreboard, hostPlayer, limit } = session;
	const { guesses, dasher, votes, response, category, prompt, number } = round;
	let sessionId = $page.params.sessionId;
	$: ({ prompt: promptLabel } = getCategoryWords($category));
	const user = getContext(USERNAME);

	// Check if current user is the dasher (can control progression from reveal)
	$: isDasher = $dasher === user && $dasher !== 'UNKNOWN';

	// Get all phony answers (incorrect guesses) with their authors and voters
	// Sort by vote count (most to least fooled) for reveal order
	$: phonyAnswers = Object.entries($guesses)
		.filter(([player, guess]) => player !== $dasher && !guess.correct)
		.map(([player, guess]) => {
			// Find all players who voted for this answer's group
			const guessGroupStr = String(guess.group ?? '').trim();
			const voters = Object.entries($votes)
				.filter(([_, group]) => String(group ?? '').trim() === guessGroupStr)
				.map(([voter]) => voter);

			return {
				player,
				response: guess.response,
				double: guess.double,
				// IMPORTANT: keep this as the exact group label (e.g. "Group 5"), not a number.
				// Votes are stored as that label, so converting to Number() breaks vote matching and scoring.
				group: guessGroupStr,
				voters,
				voteCount: voters.length,
			};
		})
		.sort((a, b) => b.voteCount - a.voteCount); // Sort most to least fooled

	// Find the maximum vote count to identify top fooling answers
	$: maxVoteCount =
		phonyAnswers.length > 0 ? Math.max(...phonyAnswers.map((pa) => pa.voteCount)) : 0;

	// Get players who selected the real answer (correct guessers)
	$: correctGuessersList = Object.keys($guesses).filter((player) => $guesses[player].correct);

	// Get players who voted for the real answer
	$: realAnswerVoters = Object.entries($votes)
		.filter(([_, group]) => {
			const groupStr = String(group).trim();
			return groupStr === TRUE_RESPONSE || groupStr === 'True Response';
		})
		.map(([voter]) => voter);

	// Combine correct guessers and voters for the real answer (remove duplicates)
	$: realAnswerPlayers = [...new Set([...correctGuessersList, ...realAnswerVoters])];

	// ---------------------------------------------------------------------------
	// Responsive sizing helpers (supports up to ~12 players / ~11 phony answers)
	// ---------------------------------------------------------------------------
	let /** @type {HTMLDivElement | null} */ answersContainerEl = null;
	let answersContainerHeight = 0;
	let answersContainerWidth = 0;

	// Estimate per-card width (each card spans 2 of the "double columns")
	$: cardWidthPx =
		answersContainerWidth && gridCols
			? Math.max(140, Math.floor((answersContainerWidth / gridCols) * 2 - 16))
			: 240;

	// Answer text scaling heuristic (avoid scroll/cutoff for long answers)
	$: allAnswerTexts = [$response, ...phonyAnswers.map((pa) => pa.response)];
	$: maxAnswerLength =
		allAnswerTexts.length > 0 ? Math.max(...allAnswerTexts.map((t) => t?.length ?? 0)) : 0;
	// Longest single token (e.g. "WWWWWW...") is what breaks wrapping the most
	$: maxTokenLength =
		allAnswerTexts.length > 0
			? Math.max(
					...allAnswerTexts.map((t) => {
						const words = String(t ?? '').split(/\s+/);
						return Math.max(...words.map((w) => w.length || 0), 0);
					}),
				)
			: 0;
	// Length-based scaling (keeps long answers readable without scrolling)
	$: lengthFontScale =
		maxAnswerLength > 280
			? 0.7
			: maxAnswerLength > 220
				? 0.78
				: maxAnswerLength > 170
					? 0.88
					: maxAnswerLength > 120
						? 0.98
						: maxAnswerLength > 80
							? 1.05
							: 1.12;

	// ============================================================================
	// GRID LAYOUT CALCULATION - Brick pattern layout
	// ============================================================================
	$: phonyCount = phonyAnswers.length;
	// Number of phony rows (real row is always row 1)
	$: phonyRowCount = (() => {
		if (phonyCount <= 0) return 0;
		if (phonyCount <= 4) return 1;
		if (phonyCount <= 8) return 2;
		return Math.ceil(phonyCount / 4); // 9+ in rows of 4
	})();
	$: totalRowCount = 1 + phonyRowCount;

	// Calculate a card height that fits the available container height.
	// This avoids clipping when there are many answers (e.g., 9-11 phony answers).
	const GRID_GAP_Y_PX = 8; // 0.5rem
	$: minCardHeight = answersContainerHeight
		? Math.max(
				120,
				Math.floor((answersContainerHeight - (totalRowCount - 1) * GRID_GAP_Y_PX) / totalRowCount),
			)
		: 180;

	// Space-based scaling: when cards are taller (fewer rows / larger screens), allow bigger text.
	// Clamp to avoid giant fonts on very large screens.
	$: spaceFontScale = Math.min(1.15, Math.max(0.85, minCardHeight / 180));
	$: answerFontScale = Math.min(1.2, Math.max(0.7, lengthFontScale * spaceFontScale));

	// Final font-size in pixels (avoid CSS calc() multiplication — not reliably supported across browsers)
	// Tuned for TV/monitor host display.
	const BASE_ANSWER_FONT_PX = 20;
	// Allow smaller fonts only when needed (dense rows / long token) so content never overflows.
	$: MIN_ANSWER_FONT_PX = totalRowCount >= 3 || maxTokenLength >= 22 ? 14 : 18;
	const MAX_ANSWER_FONT_PX = 24;
	$: answerFontPx = Math.round(
		Math.min(
			MAX_ANSWER_FONT_PX,
			Math.max(MIN_ANSWER_FONT_PX, BASE_ANSWER_FONT_PX * answerFontScale),
		),
	);

	/**
	 * Per-card font fitting: shrink only the cards that need it so text never gets cut off.
	 * Heuristic estimates how many wrapped lines a string will take at a given font size.
	 * @param {string} text
	 */
	function computeAnswerFontPx(text) {
		const t = String(text ?? '');
		if (!t) return answerFontPx;

		// Reserve vertical space inside the fixed-height card:
		// - card padding (0.5rem top + bottom) ≈ 16px
		// - answer-content padding-top (3.5rem) ≈ 56px
		// - answer-content padding-bottom (0.5rem) ≈ 8px
		// - submitter bar min-height ≈ 32px
		const RESERVED_Y_PX = 112;
		const availH = Math.max(24, minCardHeight - RESERVED_Y_PX);

		// Start from the global font, then shrink only if needed.
		let font = answerFontPx;
		const minFont = 12;
		const lineHeight = 1.3;

		while (font > minFont) {
			const maxLines = Math.max(1, Math.floor(availH / (font * lineHeight)));
			// Rough chars/line estimate using avg character width (~0.6em)
			const charsPerLine = Math.max(8, Math.floor(cardWidthPx / (font * 0.6)));
			const linesNeeded = Math.max(1, Math.ceil(t.length / charsPerLine));

			if (linesNeeded <= maxLines) break;
			font -= 1;
		}

		return font;
	}

	// DOM-measured fitter (handles zoom/subpixel differences far better than heuristics)
	let fitRaf = 0;
	function scheduleFit() {
		if (fitRaf) cancelAnimationFrame(fitRaf);
		fitRaf = requestAnimationFrame(() => {
			fitRaf = 0;
			void fitAllAnswerText();
		});
	}

	async function fitAllAnswerText() {
		if (!answersContainerEl) return;
		await tick();

		/** @type {NodeListOf<HTMLElement>} */
		const cards = answersContainerEl.querySelectorAll('.answer-card');
		for (const card of cards) {
			const content = card.querySelector('.answer-content');
			const text = card.querySelector('.answer-text');
			if (!(content instanceof HTMLElement) || !(text instanceof HTMLElement)) continue;

			// Available height is the content box MINUS padding (text cannot occupy padding)
			const contentStyle = getComputedStyle(content);
			const padTop = parseFloat(contentStyle.paddingTop || '0') || 0;
			const padBot = parseFloat(contentStyle.paddingBottom || '0') || 0;
			const availH = Math.max(0, content.clientHeight - padTop - padBot);
			if (!availH) continue;

			let font = Math.floor(parseFloat(getComputedStyle(text).fontSize || '0')) || answerFontPx;
			const minFont = 10;

			// Reset to the (heuristic) card variable first so we don't only ever shrink
			const resetFont = computeAnswerFontPx(text.textContent ?? '');
			card.style.setProperty('--answer-font-px', `${resetFont}px`);
			await tick();
			font = Math.floor(parseFloat(getComputedStyle(text).fontSize || '0')) || resetFont;

			// Shrink until it fits (include 1px buffer for zoom rounding)
			let guard = 24;
			while (guard-- > 0) {
				const fits = text.scrollHeight <= availH + 1;
				if (fits) break;
				font = Math.max(minFont, font - 1);
				card.style.setProperty('--answer-font-px', `${font}px`);
				await tick();
				if (font === minFont) break;
			}
		}
	}

	// Determine grid columns based on phony answer count
	// Use double columns to allow brick pattern positioning (cards can span 2 columns)
	$: gridCols = (() => {
		if (phonyCount <= 4) return phonyCount * 2; // 1-4: all in one row, double columns for spacing
		if (phonyCount === 5) return 6; // 5: 3-2 layout (3 cards in row 2, 2 in row 3)
		if (phonyCount === 6) return 6; // 6: 3-3 layout
		if (phonyCount === 7) return 8; // 7: 4-3 layout
		if (phonyCount === 8) return 8; // 8: 4-4 layout
		return 8; // 9+: 4 columns max, doubled
	})();

	// Real answer: always in row 1, centered
	// For doubled columns, center spans the middle 2 columns
	// For 6 columns: center is columns 3-4 (middle of 1-6)
	$: realAnswerColStart = Math.floor((gridCols - 2) / 2) + 1;
	$: realAnswerColEnd = realAnswerColStart + 2;

	// Calculate phony answer positions (sorted by vote count for final layout)
	// Brick pattern: partial rows are centered in gaps between cards above
	$: phonyAnswerPositions = (() => {
		const positions = [];

		// Determine row structure based on phony count
		let rowStructure = [];
		if (phonyCount <= 4) {
			// All in one row
			rowStructure = [phonyCount];
		} else if (phonyCount === 5) {
			// 3 cards in first phony row, 2 in second (centered in gaps)
			rowStructure = [3, 2];
		} else if (phonyCount === 6) {
			// 3 cards per row
			rowStructure = [3, 3];
		} else if (phonyCount === 7) {
			// 4 cards in first row, 3 in second (centered in gaps)
			rowStructure = [4, 3];
		} else if (phonyCount === 8) {
			// 4 cards per row
			rowStructure = [4, 4];
		} else {
			// 9+: distribute in rows of 4
			const fullRows = Math.floor(phonyCount / 4);
			rowStructure = Array(fullRows).fill(4);
			const remainder = phonyCount % 4;
			if (remainder > 0) {
				rowStructure.push(remainder);
			}
		}

		let sortedIndex = 0;
		for (let phonyRow = 0; phonyRow < rowStructure.length; phonyRow++) {
			const cardsInThisRow = rowStructure[phonyRow];
			const rowNumber = 2 + phonyRow; // Row 1 is real answer
			const isPartialRow = phonyRow > 0 && cardsInThisRow < rowStructure[phonyRow - 1];

			// Calculate column positions
			for (let positionInRow = 0; positionInRow < cardsInThisRow; positionInRow++) {
				const phonyAnswer = sortedPhonyAnswers[sortedIndex];

				let colStart, colEnd;

				if (isPartialRow) {
					// Partial row: center cards in gaps between cards above
					// Previous row cards span: 1-2, 3-4, 5-6, etc.
					// Gaps are between these cards: at columns 2-3, 4-5, etc.
					// Partial row cards should span these gaps: 2-3, 4-5, etc.
					colStart = 2 + positionInRow * 2; // Start at first gap (col 2), then every 2 columns
					colEnd = colStart + 2;
				} else {
					// Full row: cards span 2 columns each, starting from column 1
					colStart = positionInRow * 2 + 1;
					colEnd = colStart + 2;
				}

				positions.push({
					phonyAnswer,
					sortedIndex,
					row: rowNumber,
					colStart,
					colEnd,
				});

				sortedIndex++;
			}
		}

		return positions;
	})();

	// Convert guesses to the format needed for scoring
	$: guessSpecs = Object.entries($guesses)
		.filter(([player]) => player !== $dasher)
		.reduce(
			(/** @type {Record<string, {group: string, double: boolean}>} */ acc, [user, guess]) => {
				acc[user] = { group: String(guess.group ?? '').trim(), double: guess.double };
				return acc;
			},
			{},
		);

	// State for reveal flow
	let stage = 'showing-phony'; // 'showing-phony' | 'real-appearing' | 'real-extracted' | 'revealing-real-voters' | 'revealing-phony'
	let realAnswerRevealed = false; // Track when real answer gets green styling
	let visiblePhonyCount = 0; // Track how many phony answers are visible (for one-by-one appearance)
	let placedVoteBoxes = new Set(); // Track which answers have vote boxes placed
	/** @param {number} index */
	function addPlacedVoteBox(index) {
		// IMPORTANT: Sets are mutated in-place; reassign to trigger Svelte reactivity reliably.
		placedVoteBoxes = new Set([...placedVoteBoxes, index]);
	}
	let transitioningStage = false; // Track if we're transitioning between stages
	let canContinue = false; // Track if dasher can proceed
	/** @type {Array<{player: string, response: string, double: boolean, group: string, voters: string[], voteCount: number}>} */
	let shuffledPhonyAnswers = []; // Phony answers in random order for appearance
	// Track phony answer reveal state
	let currentPhonyRevealIndex = 0; // Which phony answer we're revealing (sorted by vote count)
	let showingVotersForCurrentPhony = false; // Whether we're showing voters or submitter for current phony
	/** @type {Array<{player: string, response: string, double: boolean, group: string, voters: string[], voteCount: number}>} */
	let revealedPhonyAnswers = [];
	let allowRealAnswerVisible = false; // gate real answer visibility so suspense delay actually works

	// Timing constants (single source of truth)
	const PHONY_APPEAR_INTERVAL_MS = 800;
	const AFTER_LAST_PHONY_BEFORE_REAL_MS = 2000; // user-requested: keep 2s here
	const AFTER_REAL_GREEN_BEFORE_REAL_VOTERS_MS = 800;
	const AFTER_REAL_VOTERS_BEFORE_PHONY_REVEAL_MS = 1500; // faster: voting/submission assignments start after this

	// Voter chip display: avoid “missing votes” by capping visible chips and showing +N.
	$: maxPhonyVoterChips = gridCols >= 8 ? 4 : 6; // smaller cards when 4-across
	// Keep the real answer to the same “4 + N” rule (prevents cutoffs on certain zoom levels)
	$: maxRealVoterChips = 4;

	// Voter chip sizing for dense layouts (prevents overflow on 4-across / big lobbies)
	$: voterChipFontPx = gridCols >= 8 ? 11 : 12;
	$: voterChipPadY = gridCols >= 8 ? '4px' : '6px';
	$: voterChipPadX = gridCols >= 8 ? '8px' : '10px';
	$: voterChipGap = gridCols >= 8 ? '4px' : '8px';

	// Create shuffled array of phony answers in random order for appearance
	$: {
		// Shuffle phony answers randomly for appearance order
		shuffledPhonyAnswers = [...phonyAnswers].sort(() => Math.random() - 0.5);
		visiblePhonyCount = 0; // Reset when phony answers change
		allowRealAnswerVisible = false; // Reset real-answer gate when round data changes
	}

	// Get phony answers sorted by vote count (most to least)
	$: sortedPhonyAnswers = [...phonyAnswers].sort((a, b) => b.voteCount - a.voteCount);

	// Real answer visibility
	// IMPORTANT: this must be gated by allowRealAnswerVisible, otherwise the real card appears immediately
	// when visiblePhonyCount reaches the end (making the suspense delay ineffective).
	$: isRealVisible =
		shuffledPhonyAnswers.length === 0 ||
		(visiblePhonyCount >= shuffledPhonyAnswers.length && allowRealAnswerVisible);

	onMount(() => {
		// Observe container size so the grid can adapt (TVs / window resizes / different row counts)
		let /** @type {ResizeObserver | null} */ ro = null;
		if (typeof ResizeObserver !== 'undefined') {
			ro = new ResizeObserver((entries) => {
				const entry = entries[0];
				if (!entry) return;
				// Subtract padding + a small zoom safety buffer to avoid bottom-row clipping at certain zoom levels.
				const ZOOM_SAFE_PX = 6;
				if (answersContainerEl) {
					const cs = getComputedStyle(answersContainerEl);
					const padY =
						(parseFloat(cs.paddingTop || '0') || 0) + (parseFloat(cs.paddingBottom || '0') || 0);
					const padX =
						(parseFloat(cs.paddingLeft || '0') || 0) + (parseFloat(cs.paddingRight || '0') || 0);
					answersContainerHeight = Math.max(0, Math.floor(entry.contentRect.height - padY - ZOOM_SAFE_PX));
					answersContainerWidth = Math.max(0, Math.floor(entry.contentRect.width - padX));
				} else {
					answersContainerHeight = Math.max(0, Math.floor(entry.contentRect.height - ZOOM_SAFE_PX));
					answersContainerWidth = Math.max(0, Math.floor(entry.contentRect.width));
				}
				scheduleFit();
			});
			if (answersContainerEl) ro.observe(answersContainerEl);
		}
		// Initial fit pass (in case RO doesn’t fire immediately)
		scheduleFit();

		// Stage 1: Phony answers appear one by one in random order (slower for suspense)
		const appearInterval = setInterval(() => {
			if (visiblePhonyCount < shuffledPhonyAnswers.length) {
				visiblePhonyCount++;
				scheduleFit();
			} else {
				clearInterval(appearInterval);
				// Stage 2: After all phony answers are visible, pause before showing real answer
				setTimeout(() => {
					allowRealAnswerVisible = true; // this is the *actual* knob for last-phony -> real delay
					transitioningStage = true;
					setTimeout(() => {
						stage = 'real-appearing';
						transitioningStage = false;
						// Real answer appears at top
						setTimeout(() => {
							stage = 'real-extracted';
							// After appearing, color it green
							setTimeout(() => {
								realAnswerRevealed = true;
								// Stage 3: Reveal real answer voters
								setTimeout(() => {
									stage = 'revealing-real-voters';
									addPlacedVoteBox(0); // Show real answer voters

									// Wait before revealing phony answers (voting and submission assignments)
									setTimeout(() => {
										stage = 'revealing-phony';
										scheduleFit();
										revealedPhonyAnswers = [];
										currentPhonyRevealIndex = 0;
										showingVotersForCurrentPhony = true;

										// Start revealing phony answers in order (most to least votes)
										revealNextPhonyAnswer();
									}, AFTER_REAL_VOTERS_BEFORE_PHONY_REVEAL_MS); // before voting/submission reveals
								}, AFTER_REAL_GREEN_BEFORE_REAL_VOTERS_MS); // before showing voters
							}, 500); // Brief pause before coloring green
						}, 200); // Brief transition
					}, 200); // Brief transition
				}, AFTER_LAST_PHONY_BEFORE_REAL_MS); // last-phony -> real suspense delay
			}
		}, PHONY_APPEAR_INTERVAL_MS); // phony appearance cadence

		return () => {
			clearInterval(appearInterval);
			if (ro) ro.disconnect();
		};
	});

	// Function to reveal next phony answer (voters then submitter)
	function revealNextPhonyAnswer() {
		if (currentPhonyRevealIndex >= sortedPhonyAnswers.length) {
			// All phony answers revealed, allow continuation after delay
			setTimeout(() => {
				canContinue = true;
			}, 1000); // 1 second delay before allowing continuation
			return;
		}

		const currentPhony = sortedPhonyAnswers[currentPhonyRevealIndex];

		if (showingVotersForCurrentPhony) {
			// Show voters for current phony answer
			// Map to placement index (real answer is 0, phony answers start at 1)
			const placementIndex = currentPhonyRevealIndex + 1;
			addPlacedVoteBox(placementIndex);
			scheduleFit();

			// Check if there are voters - if not, skip the wait time
			const hasVoters = currentPhony.voters && currentPhony.voters.length > 0;
			const voterWaitTime = hasVoters ? 1000 : 0; // Skip wait if no voters

			// Wait (or skip if no voters), then show submitter
			setTimeout(() => {
				showingVotersForCurrentPhony = false;
				revealedPhonyAnswers = [...revealedPhonyAnswers, currentPhony];
				scheduleFit();
				// Wait before moving to next phony answer
				setTimeout(() => {
					currentPhonyRevealIndex++;
					showingVotersForCurrentPhony = true;
					revealNextPhonyAnswer();
				}, 1000); // 1 second pause after showing submitter
			}, voterWaitTime); // Wait time depends on whether there are voters
		}
	}
</script>

<div class="reveal-host-container">
	<!-- Top Header Bar -->
	<div class="host-header-bar">
		<!-- Round Info - Top Left -->
		<div class="round-info">
			<span class="round-text">Round {$number} of {$limit}</span>
		</div>

		<!-- Logo - Center -->
		<div class="header-logo">
			<Header />
		</div>

		<!-- Room Code - Top Right -->
		<div class="room-code-badge">
			<span class="room-code-label">Room Code</span>
			<span class="room-code-value">{sessionId}</span>
		</div>
	</div>

	<div class="reveal-header-section">
		<h2 class="h2 text-center mb-1">Revealing answers for...</h2>
		<div class="prompt-info">
			<p class="prompt-text">{$prompt}</p>
			<p class="category-text">Category: <span class="category-name">{$category}</span></p>
		</div>
	</div>

	<div class="answers-container" bind:this={answersContainerEl}>
		<div
			class="answers-grid extracted-grid"
			class:transitioning={transitioningStage}
			style="--extracted-cols: {gridCols}; --min-card-height: {minCardHeight}px; --card-height: {minCardHeight}px; --answer-font-px: {answerFontPx}px; --voter-chip-font-px: {voterChipFontPx}px; --voter-chip-pad-y: {voterChipPadY}; --voter-chip-pad-x: {voterChipPadX}; --voter-chip-gap: {voterChipGap}; grid-template-columns: repeat({gridCols}, 1fr);"
		>
			<!-- Real answer - always in DOM to reserve space, but hidden until all phony answers appear -->
			<div
				class="real-answer-wrapper"
				class:visible={isRealVisible}
				style="grid-column: {realAnswerColStart} / {realAnswerColEnd}; grid-row: 1;"
			>
				<div
					class="answer-card"
					class:real={realAnswerRevealed}
					class:phony={!realAnswerRevealed}
					class:extracted-real={realAnswerRevealed}
					class:dramatic-reveal={realAnswerRevealed}
					style="--answer-font-px: {computeAnswerFontPx($response)}px;"
				>
					{#if realAnswerRevealed}
						<div class="real-answer-glow"></div>
					{/if}
					<div class="answer-content">
						<p class="answer-text" class:real-text={realAnswerRevealed}>{$response}</p>
					</div>
					<!-- Player boxes inside answer - correct guessers and voters -->
					{#if (stage === 'revealing-real-voters' || stage === 'revealing-phony') && placedVoteBoxes.has(0) && realAnswerPlayers.length > 0}
						{@const visibleRealPlayers = realAnswerPlayers.slice(0, maxRealVoterChips)}
						{@const extraRealPlayers = Math.max(
							0,
							realAnswerPlayers.length - visibleRealPlayers.length,
						)}
						<div class="player-boxes-inside fade-in">
							{#each visibleRealPlayers as player}
								<div class="player-box correct-guesser">
									<PlayerName {player} showBackground={false} showBorder={false} size="small" />
								</div>
							{/each}
							{#if extraRealPlayers > 0}
								<div class="player-box overflow-count">+{extraRealPlayers}</div>
							{/if}
						</div>
					{/if}
					<!-- No "Submitted by" for real answer - dasher isn't playing -->
				</div>
			</div>

			<!-- Phony answers - always in their calculated positions -->
			{#each phonyAnswerPositions as { phonyAnswer, sortedIndex, row, colStart, colEnd }}
				{@const shuffledIndex = shuffledPhonyAnswers.findIndex(
					(pa) => pa.response === phonyAnswer.response,
				)}
				{@const isVisible = stage === 'showing-phony' ? shuffledIndex < visiblePhonyCount : true}
				{@const isRevealed =
					stage === 'revealing-phony' &&
					revealedPhonyAnswers.some((ra) => ra.response === phonyAnswer.response)}
				{@const isTopFooler = phonyAnswer.voteCount > 0 && phonyAnswer.voteCount === maxVoteCount}
				<div
					class="phony-answer-wrapper"
					class:visible={isVisible}
					style="grid-row: {row}; grid-column: {colStart} / {colEnd};"
				>
					<div
						class="answer-card phony"
						class:no-votes={phonyAnswer.voteCount === 0}
						class:few-votes={phonyAnswer.voteCount === 1}
						class:many-votes={phonyAnswer.voteCount >= 2}
						class:revealed={isRevealed}
						class:dramatic-reveal={isRevealed}
						class:top-fooler={isTopFooler && isRevealed}
						style="--answer-font-px: {computeAnswerFontPx(phonyAnswer.response)}px;"
					>
						<div class="answer-content">
							<p class="answer-text">{phonyAnswer.response}</p>
						</div>
						<!-- Player boxes inside answer - voters (fooled players) -->
						{#if stage === 'revealing-phony' && phonyAnswer.voters.length > 0}
							{@const placementIndex = sortedIndex + 1}
							{#if placedVoteBoxes.has(placementIndex)}
								{@const visibleVoters = phonyAnswer.voters.slice(0, maxPhonyVoterChips)}
								{@const extraVoters = Math.max(0, phonyAnswer.voters.length - visibleVoters.length)}
								<div
									class="player-boxes-inside"
									class:fade-in={placedVoteBoxes.has(placementIndex)}
									class:top-fooler-players={isTopFooler}
								>
									{#each visibleVoters as voter}
										<div class="player-box" class:top-fooler-voter={isTopFooler}>
											<PlayerName
												player={voter}
												showBackground={false}
												showBorder={false}
												size="small"
											/>
										</div>
									{/each}
									{#if extraVoters > 0}
										<div class="player-box overflow-count" class:top-fooler-voter={isTopFooler}>
											+{extraVoters}
										</div>
									{/if}
								</div>
							{/if}
						{/if}
						<!-- Always reserve space for submitter so card height never changes -->
						<div class="answer-submitter" class:visible={isRevealed}>
							{#if isRevealed}
								<span class="submitter-name"
									>Submitted by <PlayerName
										player={phonyAnswer.player}
										showBackground={false}
										showBorder={false}
										size="small"
									/></span
								>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Only dasher can proceed, and only after all reveals are complete -->
	{#if stage === 'revealing-phony' && canContinue && (revealedPhonyAnswers.length === phonyAnswers.length || phonyAnswers.length === 0)}
		{#if isDasher}
			<form action="?/reveal.proceed" method="POST" use:enhance class="mt-8">
				<input type="text" name={SESSION} value={JSON.stringify($data)} hidden />
				<input name={VOTES} value={JSON.stringify($votes)} type="text" hidden />
				<input name={GUESSES} value={JSON.stringify(guessSpecs)} type="text" hidden />
				<input name={CORRECT} value={JSON.stringify(correctGuessersList)} type="text" hidden />
				<input name={SCOREBOARD} value={JSON.stringify($scoreboard)} type="text" hidden />
				<input name={DASHER} value={$dasher} type="text" hidden />
				<button class="btn variant-filled btn-lg rounded-lg w-full" type="submit">
					Continue to Tally
				</button>
			</form>
		{/if}
	{/if}
</div>

<style>
	.reveal-host-container {
		width: 100%;
		@apply mx-auto text-center;
		padding: 0;
		padding-top: 0; /* No extra padding, stage navigation handles spacing */
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		min-height: 0;
		/* IMPORTANT: RevealHost is rendered inside HostGame (which already locks to 16:9).
		   So size to the parent to avoid bottom clipping when HostGame shows the “dasher” chip. */
		height: 100%;
		max-height: 100%;
		max-width: 100%;
		overflow: hidden; /* No scrolling - everything must fit */
		position: relative;
	}

	/* Top Header Bar - Fixed at top */
	.host-header-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 0.75rem 2rem;
		@apply bg-surface-50 dark:bg-surface-900;
		z-index: 10;
	}

	.round-info {
		@apply flex items-center;
		justify-self: start;
	}

	.header-logo {
		@apply flex items-center justify-center;
		justify-self: center;
	}

	.header-logo :global(.logo-container) {
		padding: 0.5rem 1rem;
		min-height: auto;
	}

	.header-logo :global(.roys-text) {
		font-size: 1.5rem;
		top: 0.75rem;
	}

	.header-logo :global(.rubbish-text) {
		font-size: 2.5rem;
	}

	.header-logo :global(.rubbish-r) {
		font-size: 1.5em;
	}

	.round-text {
		font-size: clamp(1rem, 2vh, 1.5rem);
		@apply font-semibold text-surface-700 dark:text-surface-300;
	}

	.room-code-badge {
		@apply flex flex-col items-end gap-1;
		padding: 0.5rem 1rem;
		@apply bg-primary-100 dark:bg-primary-900 rounded-lg border border-primary-300 dark:border-primary-700;
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
		justify-self: end;
	}

	.room-code-label {
		font-size: clamp(0.625rem, 1vh, 0.75rem);
		@apply text-primary-600 dark:text-primary-400 font-medium;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.room-code-value {
		font-size: clamp(1.25rem, 2.5vh, 1.75rem);
		@apply font-bold text-primary-500 font-mono;
		letter-spacing: 0.15em;
	}

	.reveal-header-section {
		flex-shrink: 0;
		@apply mb-1;
		width: 100%;
		max-width: 100%;
		margin-top: 0.5rem; /* Close to stage navigation above */
		box-sizing: border-box;
		overflow-wrap: break-word;
		word-wrap: break-word;
		word-break: break-word;
		padding: 0 0.5rem; /* Add small padding to prevent edge overflow */
		overflow-x: hidden; /* Prevent horizontal overflow */
	}

	.reveal-host-container :global(h2) {
		font-size: clamp(1rem, 1.8vh, 1.5rem);
		@apply mb-0.5;
		overflow-wrap: break-word;
		word-wrap: break-word;
		word-break: break-word;
		max-width: 100%;
		width: 100%;
		white-space: normal;
		box-sizing: border-box;
		padding: 0 0.5rem;
	}

	.prompt-info {
		@apply text-center;
		flex-shrink: 0;
		max-width: 100%;
		box-sizing: border-box;
		overflow-wrap: break-word;
		word-wrap: break-word;
		margin-bottom: 0.5rem; /* Reduced from default to give more space to cards */
	}

	.prompt-text {
		font-size: clamp(1rem, 2vh, 1.5rem);
		@apply font-semibold text-primary-500 mb-1;
		overflow-wrap: break-word;
		word-wrap: break-word;
		word-break: break-word;
		max-width: 100%;
		width: 100%;
		line-height: 1.3;
		white-space: normal;
		box-sizing: border-box;
	}

	.category-text {
		font-size: clamp(0.875rem, 1.5vh, 1.125rem);
		@apply text-surface-600 dark:text-surface-400;
		overflow-wrap: break-word;
		word-wrap: break-word;
		word-break: break-word;
		max-width: 100%;
		width: 100%;
		white-space: normal;
		box-sizing: border-box;
	}

	.category-name {
		@apply text-primary-400 font-semibold;
	}

	.answers-container {
		width: 100%;
		/* Match the stage navigation width - don't extend past it */
		max-width: min(85vw, 100%);
		margin: 0 auto;
		/* Ensure container fits on screen - use flex to fill available space */
		flex: 1;
		display: flex;
		align-items: flex-start; /* Align to top to show all content */
		justify-content: center;
		min-height: 0;
		overflow: hidden; /* No scrolling - content must fit */
		box-sizing: border-box;
		padding: 0 0.5rem; /* Outer padding */
		/* Tiny inset so borders don’t get clipped at certain browser zoom levels */
		padding-bottom: 2px;
		padding-top: 2px;
		/* Ensure container doesn't exceed available space */
		max-height: 100%;
	}

	.answers-grid {
		display: grid;
		/* IMPORTANT: we use “double columns” and span 2 columns per card.
		   Grid column gaps get INCLUDED inside a span, which can cause edge cutoffs on zoom.
		   So: keep column gap = 0, and create horizontal spacing via wrapper padding. */
		row-gap: 0.5rem;
		column-gap: 0;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		grid-auto-rows: auto;
		justify-content: center;
		align-items: start;
		overflow-x: hidden; /* Prevent horizontal overflow */
		overflow-y: visible; /* Allow vertical overflow for player boxes */
	}

	/* Smooth transition state */
	.answers-grid.transitioning {
		opacity: 0.95;
		transition: opacity 0.2s ease-in-out;
		/* Don't transition grid-template-columns - it's set explicitly via inline style */
	}

	/* Extracted grid: real answer on top (centered), phony answers below */
	/* IMPORTANT: grid-template-columns is set via inline style for dynamic column count */
	/* This CSS is just a fallback - inline style will override */
	.answers-grid.extracted-grid,
	.extracted-grid {
		/* Fallback if inline style doesn't apply - but inline style should take precedence */
		grid-template-columns: repeat(var(--extracted-cols, 2), 1fr);
		grid-auto-rows: minmax(
			var(--min-card-height, 180px),
			auto
		); /* Responsive rows: min height, grow with content */
		justify-content: center;
		justify-items: stretch; /* Stretch items to fill their grid cells */
		align-items: stretch; /* Stretch items to fill their grid cells vertically */
		/* Explicit positioning - items use grid-row and grid-column from inline styles */
		/* Use 'dense' to fill gaps, but explicit positioning should take precedence */
		grid-auto-flow: row dense;
		/* Center items when rows aren't full (e.g., 5 items: 3-2 layout) */
		align-content: start;
		/* Max width to prevent cards from getting too wide */
		max-width: 100%;
		width: 100%;
		box-sizing: border-box;
		row-gap: 0.5rem;
		column-gap: 0;
		/* No scrolling - content must fit */
		overflow: hidden;
		/* Ensure grid fits within container */
		max-height: 100%;
	}

	/* Real answer wrapper - contains card and meta info */
	.real-answer-wrapper {
		/* Same sizing as phony answer wrappers */
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: stretch; /* Stretch to fill grid cell */
		justify-content: flex-start;
		gap: 0;
		overflow: hidden; /* Prevent animations from going outside */
		position: relative;
		/* Ensure player boxes can extend beyond wrapper */
		min-height: 0;
		/* Real answer is part of the grid - same size as phony answers, centered */
		/* Grid position is set via inline style - no transitions on grid properties */
		transition: opacity 0.4s ease-in;
		/* Ensure full card height is visible - align to start of grid row */
		align-self: stretch; /* Stretch to fill grid cell */
		/* Remove margins to ensure cards touch */
		margin: 0;
		padding: 0;
		/* Horizontal spacing between cards (prevents span+gap issues and zoom cutoffs) */
		padding-inline: 0.25rem;
	}

	/* Real answer card */
	.extracted-grid .extracted-real {
		justify-self: stretch; /* Same as phony answers */
	}

	/* Phony answer wrapper - contains card and meta info */
	.phony-answer-wrapper {
		display: flex;
		flex-direction: column;
		align-items: stretch; /* Stretch to fill grid cell */
		justify-content: flex-start;
		gap: 0;
		overflow: hidden; /* Prevent animations from going outside */
		position: relative;
		/* Ensure wrapper doesn't force card width - same as real answer */
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		/* Ensure player boxes can extend beyond wrapper */
		min-height: 0;
		/* Grid position is set via inline style - no transitions on grid properties */
		transition: opacity 0.4s ease-in;
		/* Constrain wrapper to grid cell */
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		/* Remove margins to ensure cards touch */
		margin: 0;
		padding: 0;
		/* Horizontal spacing between cards (prevents span+gap issues and zoom cutoffs) */
		padding-inline: 0.25rem;
	}

	/* Card sizing - responsive container-based approach */
	.answers-grid .answer-card {
		/* Cards fill 100% of their grid cell (container determines size) */
		width: 100%;
		max-width: 100%;
		/* Fixed height per row so ALL cards remain the same size (no growth when submitter appears) */
		height: var(--card-height, var(--min-card-height, 180px));
		min-height: var(--card-height, var(--min-card-height, 180px));
		max-height: var(--card-height, var(--min-card-height, 180px));
		/* Rectangle shape - much wider than tall, but responsive */
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		box-sizing: border-box;
		/* Reduced padding to fit more content */
		padding: 0.5rem;
		/* Prevent overflow - cards stay within their containers */
		overflow: hidden;
		/* CSS containment to prevent animations from causing overflow */
		contain: layout style;
		/* Allow cards to grow with content but maintain minimum */
		flex-shrink: 1;
		min-width: 0; /* Allow cards to shrink below their content size in grid */
		/* Ensure player boxes can extend beyond card boundaries */
		position: relative;
		/* Prevent cards from expanding beyond their containers */
		max-width: 100%;
	}

	/* Card content area - prevent text overflow */
	.answer-card .answer-content {
		overflow: hidden; /* Prevent text from overflowing card */
	}

	/* In extracted grid, cards fill their grid cells completely */
	.extracted-grid .answer-card {
		/* Cards fill 100% of grid cell */
		width: 100%;
		max-width: 100%;
		min-width: 0; /* Allow cards to shrink below their content size in grid */
		/* Ensure cards stay within their containers */
		box-sizing: border-box;
	}

	/* Ensure phony answer wrappers respect explicit grid positioning */
	.extracted-grid .phony-answer-wrapper {
		/* Explicit grid positioning from inline styles will be respected */
		width: 100%;
		max-width: 100%;
	}

	/* Visibility control for staged appearance */
	.real-answer-wrapper:not(.visible),
	.phony-answer-wrapper:not(.visible) {
		/* Reserve space in grid even when hidden */
		min-height: var(--min-card-height, 180px);
		opacity: 0;
		pointer-events: none;
	}

	.real-answer-wrapper:not(.visible) .answer-card,
	.phony-answer-wrapper:not(.visible) .answer-card {
		opacity: 0;
		visibility: hidden;
	}

	.real-answer-wrapper.visible .answer-card,
	.phony-answer-wrapper.visible .answer-card {
		opacity: 1;
		visibility: visible;
		transition:
			opacity 0.4s ease-in,
			visibility 0.4s ease-in;
	}

	/* Phony answers are positioned explicitly from the start - no grid transitions needed */
	.extracted-grid .phony-answer-wrapper {
		/* Explicit grid positioning from inline styles - no transitions on grid properties */
		transition: opacity 0.4s ease-in;
	}

	.extracted-real {
		/* Smooth extraction animation - reduced scale to prevent overflow */
		animation: extractReal 2s cubic-bezier(0.16, 1, 0.3, 1);
		z-index: 10;
		box-shadow:
			0 8px 16px -4px rgba(34, 197, 94, 0.4),
			0 4px 8px -2px rgba(34, 197, 94, 0.3);
		transition:
			box-shadow 1s ease-out,
			border-color 1s ease-out,
			background-color 1s ease-out;
		will-change: transform;
		/* Prevent overflow during animation */
		overflow: hidden;
	}

	@keyframes extractReal {
		0% {
			transform: translateX(0) translateY(0);
			opacity: 1;
		}
		20% {
			transform: translateX(0) translateY(-3px);
			opacity: 1;
		}
		40% {
			transform: translateX(0) translateY(-6px);
			opacity: 1;
		}
		60% {
			transform: translateX(0) translateY(-8px);
			opacity: 1;
		}
		80% {
			transform: translateX(0) translateY(-10px);
			opacity: 1;
		}
		100% {
			transform: translateX(0) translateY(-8px);
			opacity: 1;
		}
	}

	/* Smooth reveal animation when real answer gets green styling - reduced scale */
	.dramatic-reveal {
		/* Disable “pulsing”/reveal animations entirely to prevent any layout jank */
		animation: none !important;
	}

	@keyframes subtleReveal {
		0% {
			transform: translateY(0);
			opacity: 0.9;
		}
		50% {
			transform: translateY(-2px);
			opacity: 0.95;
		}
		100% {
			transform: translateY(-3px);
			opacity: 1;
		}
	}

	.answer-card.phony:not(.revealed) {
		opacity: 0.8;
		transition: opacity 0.4s ease-out;
	}

	.answer-card.phony.revealed {
		opacity: 1;
		transition:
			opacity 0.6s ease-out,
			transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	/* Smooth reveal for phony answers - reduced scale to prevent overflow */
	.answer-card.phony.dramatic-reveal {
		/* Disable “pulsing”/reveal animations entirely to prevent any layout jank */
		animation: none !important;
	}

	@keyframes phonyReveal {
		0% {
			transform: translateY(2px);
			opacity: 0.75;
		}
		50% {
			transform: translateY(-1px);
			opacity: 0.9;
		}
		100% {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.answer-card {
		@apply bg-surface-200 dark:bg-surface-800 rounded-lg border-2;
		transition:
			all 0.4s cubic-bezier(0.4, 0, 0.2, 1),
			border-color 0.5s ease-out,
			background-color 0.5s ease-out,
			box-shadow 0.5s ease-out;
		position: relative;
		transform-origin: center;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		/* Prevent any content (including long answers) from spilling outside card */
		overflow: hidden;
	}

	.answer-card.phony {
		@apply border-primary-500;
	}

	.answer-card.phony.no-votes {
		@apply border-surface-400 bg-surface-100 dark:bg-surface-700;
	}

	.answer-card.phony.few-votes {
		@apply border-warning-400 bg-warning-50 dark:bg-warning-900/20;
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
	}

	.answer-card.phony.many-votes {
		@apply border-success-500 bg-success-50 dark:bg-success-900/20;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	/* Highlight top fooling phony answers */
	.answer-card.phony.top-fooler {
		@apply border-warning-500 bg-warning-100 dark:bg-warning-900/30;
		box-shadow:
			0 6px 12px -2px rgba(234, 179, 8, 0.4),
			0 4px 8px -2px rgba(234, 179, 8, 0.3);
		/* Pulsing animation removed */
		transition:
			border-color 0.6s ease-out,
			background-color 0.6s ease-out,
			box-shadow 0.6s ease-out;
		position: relative;
	}

	/* topFoolerPulse keyframes removed - pulsing animation disabled */

	.answer-card.real {
		@apply border-success-500 bg-success-50 dark:bg-success-900/20;
		/* Smooth color transition */
		transition:
			border-color 0.8s ease-out,
			background-color 0.8s ease-out,
			box-shadow 0.8s ease-out;
		/* Pulsing animation removed */
		box-shadow:
			0 4px 8px -2px rgba(34, 197, 94, 0.2),
			0 2px 4px -1px rgba(34, 197, 94, 0.15);
	}

	.real-answer-glow {
		position: absolute;
		inset: -4px;
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.2));
		border-radius: 0.5rem;
		z-index: -1;
		/* Smooth glow appearance - pulsing removed */
		animation: glowFadeIn 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
		filter: blur(6px);
		opacity: 0;
		animation-fill-mode: forwards;
	}

	@keyframes glowFadeIn {
		0% {
			opacity: 0;
		}
		50% {
			opacity: 0.3;
		}
		100% {
			opacity: 0.5;
		}
	}

	/* realAnswerPulse and glowPulse keyframes removed - pulsing animations disabled */

	/* Submitter name inside box at bottom */
	.answer-submitter {
		text-align: center;
		padding: 0.4rem 0.5rem;
		@apply border-t border-surface-300 dark:border-surface-600;
		margin-top: auto;
		flex-shrink: 0;
		/* Reserve height so layout never shifts */
		min-height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		border-top-color: transparent;
	}

	.answer-submitter.visible {
		opacity: 1;
		@apply border-t border-surface-300 dark:border-surface-600;
		transition: opacity 0.2s ease-out;
	}

	.submitter-name {
		font-size: clamp(0.75rem, 1.2vh, 0.9rem);
		@apply font-semibold text-surface-600 dark:text-surface-400;
	}

	.answer-content {
		flex: 1;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		@apply px-2;
		/* Account for player boxes bar at top (min-height 2.5rem = 40px + padding 0.5rem top = 8px = 48px total) */
		padding-top: 3.5rem;
		padding-bottom: 0.5rem;
		min-height: 2rem;
		/* No internal scrollbars on host view; we shrink per-card fonts instead */
		overflow-y: hidden;
		overflow-x: hidden;
		flex-shrink: 1;
		min-width: 0; /* Allow content to shrink in grid */
		width: 100%;
		box-sizing: border-box;
		/* Ensure content wraps properly */
		overflow-wrap: break-word;
		word-wrap: break-word;
	}

	.answer-text {
		margin: 0;
		font-size: clamp(14px, var(--answer-font-px, 20px), 24px);
		@apply font-semibold text-center text-surface-900 dark:text-surface-100;
		word-wrap: break-word;
		overflow-wrap: break-word;
		overflow-wrap: anywhere;
		word-break: break-word;
		hyphens: auto;
		line-height: 1.3;
		max-width: 100%;
		width: 100%;
		/* Allow full text to display with natural wrapping */
		display: block;
		overflow: hidden;
		text-overflow: unset;
		white-space: normal;
		box-sizing: border-box;
		white-space: normal;
		width: 100%;
	}

	.real-text {
		@apply text-success-700 dark:text-success-300;
		transition: color 0.8s ease-out;
		animation: textColorFadeIn 0.8s ease-out;
	}

	@keyframes textColorFadeIn {
		from {
			opacity: 0.7;
		}
		to {
			opacity: 1;
		}
	}

	/* Player boxes inside answer cards - Jackbox style horizontal bar */
	.player-boxes-inside {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: var(--voter-chip-gap, 8px);
		z-index: 5;
		pointer-events: none;
		/* Background bar like Jackbox */
		@apply bg-surface-300 dark:bg-surface-700;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem 0.5rem 0 0;
		/* Ensure it spans full width but stays within card */
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		/* No wrapping; we show +N instead (prevents hidden “missing voters”) */
		flex-wrap: nowrap;
		min-height: 2.5rem;
		/* Start hidden, will fade in when fade-in class is added */
		opacity: 0;
		transform: translateY(-8px);
		transition:
			opacity 0.3s ease-out,
			transform 0.3s ease-out;
		/* Keep on one line without scrolling */
		overflow: hidden;
	}

	/* +N overflow badge */
	.player-box.overflow-count {
		@apply bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-200;
		@apply border-surface-400 dark:border-surface-600;
		opacity: 0.9;
	}

	.player-boxes-inside.fade-in {
		opacity: 1;
		transform: translateY(0);
		animation: fadeInUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.player-box {
		@apply bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100;
		padding: var(--voter-chip-pad-y, 6px) var(--voter-chip-pad-x, 10px);
		border-radius: 0.5rem;
		font-size: var(--voter-chip-font-px, 12px);
		@apply font-bold;
		border: 2px solid;
		@apply border-surface-400 dark:border-surface-600;
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 2px 4px -1px rgba(0, 0, 0, 0.2),
			0 1px 2px -1px rgba(0, 0, 0, 0.1);
		line-height: 1.2;
		flex-shrink: 0;
		/* More prominent styling */
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: all 0.2s ease-out;
	}

	/* Real answer voters - green theme */
	.answer-card.real .player-boxes-inside {
		@apply bg-success-200 dark:bg-success-800;
	}

	.answer-card.real .player-box {
		@apply bg-success-50 dark:bg-success-900 text-success-800 dark:text-success-200;
		@apply border-success-400 dark:border-success-600;
		box-shadow:
			0 2px 4px -1px rgba(34, 197, 94, 0.3),
			0 1px 2px -1px rgba(34, 197, 94, 0.2);
	}

	.player-box.correct-guesser {
		@apply bg-success-100 dark:bg-success-900 text-success-800 dark:text-success-200;
		@apply border-success-500 dark:border-success-500;
		box-shadow:
			0 3px 6px -1px rgba(34, 197, 94, 0.4),
			0 1px 3px -1px rgba(34, 197, 94, 0.3);
	}

	/* Phony answer voters - themed by vote count */
	.answer-card.phony.many-votes .player-boxes-inside {
		@apply bg-success-200 dark:bg-success-800;
	}

	.answer-card.phony.few-votes .player-boxes-inside {
		@apply bg-warning-200 dark:bg-warning-800;
	}

	.answer-card.phony.no-votes .player-boxes-inside {
		@apply bg-surface-300 dark:bg-surface-700;
	}

	.answer-card.phony.many-votes .player-box {
		@apply bg-success-50 dark:bg-success-900 text-success-800 dark:text-success-200;
		@apply border-success-400 dark:border-success-600;
		box-shadow:
			0 2px 4px -1px rgba(34, 197, 94, 0.3),
			0 1px 2px -1px rgba(34, 197, 94, 0.2);
	}

	.answer-card.phony.few-votes .player-box {
		@apply bg-warning-50 dark:bg-warning-900 text-warning-800 dark:text-warning-200;
		@apply border-warning-400 dark:border-warning-600;
		box-shadow:
			0 2px 4px -1px rgba(234, 179, 8, 0.3),
			0 1px 2px -1px rgba(234, 179, 8, 0.2);
	}

	.player-box.top-fooler-voter {
		@apply bg-warning-100 dark:bg-warning-900 text-warning-800 dark:text-warning-200;
		@apply border-warning-500 dark:border-warning-500;
		box-shadow:
			0 3px 6px -1px rgba(234, 179, 8, 0.4),
			0 1px 3px -1px rgba(234, 179, 8, 0.3);
		/* Removed scale to prevent overflow */
	}

	.player-boxes-inside.top-fooler-players {
		@apply bg-warning-300 dark:bg-warning-700;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		50% {
			opacity: 0.7;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Smooth transitions for submitter reveal */
	.answer-submitter {
		animation: slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(8px);
			max-height: 0;
		}
		to {
			opacity: 1;
			transform: translateY(0);
			max-height: 100px;
		}
	}
</style>
