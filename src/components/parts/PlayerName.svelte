<script>
	/**
	 * @typedef {import("$lib/types").Session} Session
	 */
	import { session } from '$lib/store';
	import { getAllPlayerColors } from '$lib/utils';

	export let player = '';
	export let className = '';
	export let showBackground = true;
	export let showBorder = true;
	export let size = 'normal'; // 'small' | 'normal' | 'large'

	const { data } = session;
	
	$: playerColors = getAllPlayerColors($data?.playerColors ?? {}, [player]);
	$: playerColor = playerColors[player] || { bg: '#6B7280', text: '#FFFFFF', border: '#4B5563' };
	
	$: sizeClasses = {
		small: 'text-xs px-2 py-1',
		normal: 'text-sm px-3 py-1.5',
		large: 'text-base px-4 py-2'
	};
</script>

<span
	class="player-name-tag {className} {sizeClasses[size]}"
	class:no-bg={!showBackground}
	class:no-border={!showBorder}
	style="--player-bg: {playerColor.bg}; --player-text: {playerColor.text}; --player-border: {playerColor.border};"
>
	{player}
</span>

<style>
	.player-name-tag {
		display: inline-block;
		background-color: var(--player-bg);
		color: var(--player-text);
		border: 2px solid var(--player-border);
		border-radius: 0.375rem;
		font-weight: 600;
		white-space: nowrap;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
	}

	.player-name-tag.no-bg {
		background-color: transparent;
		color: var(--player-bg);
	}

	.player-name-tag.no-border {
		border: none;
	}

	.player-name-tag:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.15);
	}
</style>

