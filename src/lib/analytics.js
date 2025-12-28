import { PostHog } from 'posthog-node';
import { dev } from '$app/environment';
import {
	PUBLIC_DEV_POSTHOG_API_KEY,
	PUBLIC_DEV_POSTHOG_HOST,
	PUBLIC_PROD_POSTHOG_API_KEY,
	PUBLIC_PROD_POSTHOG_HOST,
} from '$env/static/public';

const apiKey = dev ? PUBLIC_DEV_POSTHOG_API_KEY : PUBLIC_PROD_POSTHOG_API_KEY;
const host = dev ? PUBLIC_DEV_POSTHOG_HOST : PUBLIC_PROD_POSTHOG_HOST;

// Create a no-op client that matches PostHog's interface
const createNoOpClient = () => ({
	capture: () => {},
	shutdown: () => Promise.resolve(),
	flush: () => Promise.resolve(),
});

// Only initialize PostHog if we have a valid API key
const hasValidKey = apiKey && typeof apiKey === 'string' && apiKey.trim() !== '';

if (!hasValidKey) {
	console.warn('[PostHog] API key is missing or empty. PostHog will not be initialized.');
	console.warn('[PostHog] Debug - apiKey type:', typeof apiKey, 'value:', apiKey ? `"${apiKey.substring(0, 10)}..."` : 'undefined/null');
}

export const client = hasValidKey
	? new PostHog(apiKey, {
			host: host,
		})
	: createNoOpClient();
