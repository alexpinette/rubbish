import { browser, dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import posthog from 'posthog-js';

export const load = async () => {
	if (!browser) return;

	const apiKey = dev ? env.PUBLIC_DEV_POSTHOG_API_KEY : env.PUBLIC_PROD_POSTHOG_API_KEY;
	const apiHost = dev ? env.PUBLIC_DEV_POSTHOG_HOST : env.PUBLIC_PROD_POSTHOG_HOST;

	// PostHog is optional in local development.
	if (!apiKey) return;

	posthog.init(apiKey, {
		api_host: apiHost,
		person_profiles: 'always',
	});
};
