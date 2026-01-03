<script>
	import { page } from '$app/stores';
	import Entry from '../../components/forms/Entry.svelte';
	import { CLIENT_TYPES } from '$lib/constants';
	import { SlideToggle } from '@skeletonlabs/skeleton';
	import config from '$lib/config';
	import { normalizeSessionId } from '$lib/normalize';

	let username = '';
	let sessionId = $page.url.searchParams.get('id') || '';
	let joinAsSpectator = false;

	const sessionIdLen = (config.sessionId?.numCharacters ?? 4) + (config.sessionId?.numIntegers ?? 0);
	function onSessionIdInput(e) {
		sessionId = normalizeSessionId(e.currentTarget?.value ?? '');
	}
</script>

<main>
	<h1 class="h1 text-center pb-10">Join Game</h1>
	<Entry bind:username>
		<label class="label">
			<span class="font-bold small-gap">Room Code</span>
			<input
				class="input"
				title="sessionId"
				name="sessionId"
				type="text"
				placeholder="ABCD1"
				bind:value={sessionId}
				on:input={onSessionIdInput}
				autocomplete="off"
				autocapitalize="characters"
				maxlength={sessionIdLen}
				required
			/>
		</label>
		<br class="pb-5" />
		<div class="small-gap">
			<SlideToggle
				size="sm"
				name="join-as-spectator"
				bind:checked={joinAsSpectator}
			>
				<span class="inline-block text-left text-xs xs:text-base">
					Join as <span class="text-primary-500">Spectator</span> (observe only, no participation)
				</span>
			</SlideToggle>
		</div>
		<input type="hidden" name="clientType" value={joinAsSpectator ? CLIENT_TYPES.SPECTATOR : CLIENT_TYPES.PLAYER} />
	</Entry>
</main>
