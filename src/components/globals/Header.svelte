<script>
	import { goto } from '$app/navigation';
	function goHome() {
		goto('/');
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
	class="logo-container"
	on:click={goHome}
	role="button"
	tabindex="0"
	on:keydown={(e) => e.key === 'Enter' && goHome()}
>
	<div class="roys-text">Roy's</div>
	<div class="rubbish-text">
		<span class="rubbish-r">R</span><span class="rubbish-rest">ubbish</span>
	</div>
</div>

<style>
	.logo-container {
		@apply relative cursor-pointer p-10;
		font-family: 'Mea Culpa', cursive;
		user-select: none;
		min-height: 160px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.roys-text {
		@apply text-primary-500;
		font-size: 3.5rem;
		line-height: 1;
		position: absolute;
		top: 2.5rem;
		left: 50%;
		transform: translateX(-20%) translateY(0);
		z-index: 2;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	.rubbish-text {
		@apply text-black dark:text-white;
		font-size: 5.5rem;
		line-height: 0.9;
		position: relative;
		display: inline-block;
		text-align: center;
	}

	.rubbish-r {
		@apply text-primary-500;
		display: inline-block;
		font-size: 1.5em;
		position: relative;
		z-index: 1;
	}

	.rubbish-rest {
		display: inline-block;
		letter-spacing: 0.02em;
	}

	@media (max-width: 640px) {
		.logo-container {
			min-height: 160px;
		}

		.roys-text {
			font-size: 3.5rem;
			top: 2.5rem;
			transform: translateX(-20%) translateY(0);
		}

		.rubbish-text {
			font-size: 5.5rem;
		}
	}
</style>
