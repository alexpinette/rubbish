<script>
	import { handleError } from '$lib/utils';
	import { signIn } from '$lib/firebase/auth';
	import { FIREBASE } from '$lib/constants';
	import { firebaseApp } from '$lib/firebase/client';
	import { AppShell, Modal, Toast, getToastStore, initializeStores } from '@skeletonlabs/skeleton';
	import { onMount, setContext } from 'svelte';
	import '../app.postcss';
	import Footer from '../components/footer/Footer.svelte';
	import Kick from '../components/modals/Kick.svelte';
	import Prompt from '../components/modals/Prompt.svelte';
	import Header from '../components/globals/Header.svelte';

	initializeStores();
	const toastStore = getToastStore();
	const modalRegistry = {
		prompt: { ref: Prompt },
		kick: { ref: Kick },
	};
	setContext(FIREBASE, firebaseApp);
	onMount(
		async () =>
			await signIn(firebaseApp)
				.then((cred) => (document.cookie = `uid=${cred}`))
				.catch((error) => handleError(toastStore, new Error(error))),
	);
</script>

<Modal components={modalRegistry} />
<Toast />
<AppShell>
	<Header />
	<div class="content-container min-w-2xs max-w-lg mx-auto px-5">
		<slot />
	</div>
	<svelte:fragment slot="footer">
		<Footer />
	</svelte:fragment>
</AppShell>

<style>
	/* Responsive container sizing - follows pattern used by successful web games */
	/* Base: Mobile-first approach with constrained width */
	.content-container {
		max-width: 32rem; /* lg = 32rem (512px) - good for mobile/tablet */
		width: 100%;
		margin-left: auto;
		margin-right: auto;
	}

	/* Tablet and small desktop */
	@media (min-width: 768px) {
		.content-container {
			max-width: 36rem; /* Slightly wider for tablets */
		}
	}

	/* Standard desktop displays */
	@media (min-width: 1024px) {
		.content-container {
			max-width: 40rem; /* Comfortable reading width */
		}
	}

	/* Large desktop displays (1440p, etc.) */
	@media (min-width: 1536px) {
		.content-container {
			max-width: 42rem; /* xl = 42rem (672px) */
		}
	}

	/* Very large displays (4K, etc.) - use viewport-based scaling */
	/* Instead of transform:scale(), use viewport units for better rendering */
	@media (min-width: 1920px) {
		.content-container {
			max-width: min(48rem, 90vw); /* 2xl but never more than 90% of viewport */
		}
	}

	/* Ultra-wide displays - constrain to reasonable maximum */
	@media (min-width: 2560px) {
		.content-container {
			max-width: min(48rem, 75vw); /* Scale down proportionally on ultra-wide */
		}
	}
</style>
