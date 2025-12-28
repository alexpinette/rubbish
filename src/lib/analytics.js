import { PostHog } from 'posthog-node';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';

/**
 * PostHog is optional for local development.
 * If keys are not provided, export a no-op client so the app can run.
 */
function makeNoopClient() {
	const noop = () => {};
	return {
		capture: noop,
		identify: noop,
		alias: noop,
		groupIdentify: noop,
		flush: async () => {},
		shutdown: async () => {},
	};
}

const apiKey = dev ? env.PUBLIC_DEV_POSTHOG_API_KEY : env.PUBLIC_PROD_POSTHOG_API_KEY;
const host = dev ? env.PUBLIC_DEV_POSTHOG_HOST : env.PUBLIC_PROD_POSTHOG_HOST;

export const client = apiKey ? new PostHog(apiKey, host ? { host } : {}) : makeNoopClient();
