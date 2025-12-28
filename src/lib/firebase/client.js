import { getApp, getApps, initializeApp } from 'firebase/app';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';

function pickPublic(devKey, prodKey) {
	// Prefer the env for the current mode, but allow fallback so local dev doesn't
	// require prod vars and vice versa.
	const primary = dev ? env[devKey] : env[prodKey];
	const fallback = dev ? env[prodKey] : env[devKey];
	return primary ?? fallback;
}

const fbConfig = {
	apiKey: pickPublic('PUBLIC_DEV_FB_API_KEY', 'PUBLIC_PROD_FB_API_KEY'),
	authDomain: pickPublic('PUBLIC_DEV_FB_AUTH_DOMAIN', 'PUBLIC_PROD_FB_AUTH_DOMAIN'),
	projectId: pickPublic('PUBLIC_DEV_FB_PROJECT_ID', 'PUBLIC_PROD_FB_PROJECT_ID'),
	storageBucket: pickPublic('PUBLIC_DEV_FB_STORAGE_BUCKET', 'PUBLIC_PROD_FB_STORAGE_BUCKET'),
	messagingSenderId: pickPublic(
		'PUBLIC_DEV_FB_MESSAGING_SENDER_ID',
		'PUBLIC_PROD_FB_MESSAGING_SENDER_ID',
	),
	appId: pickPublic('PUBLIC_DEV_FB_APP_ID', 'PUBLIC_PROD_FB_APP_ID'),
	measurementId: pickPublic('PUBLIC_DEV_FB_MEASUREMENT_ID', 'PUBLIC_PROD_FB_MEASUREMENT_ID'),
	databaseURL: pickPublic('PUBLIC_DEV_FB_DATABASE_URL', 'PUBLIC_PROD_FB_DATABASE_URL'),
};

// If config is missing, fail with a readable message (avoids silent hydration failures)
if (!fbConfig.apiKey || !fbConfig.projectId || !fbConfig.databaseURL) {
	throw new Error(
		'Firebase web config is missing. Set PUBLIC_DEV_FB_* (or PUBLIC_PROD_FB_*) in .env.local. ' +
			'Required: API_KEY, PROJECT_ID, DATABASE_URL.',
	);
}

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(fbConfig);
