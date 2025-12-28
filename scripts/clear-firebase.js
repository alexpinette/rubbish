/**
 * Script to clear all Firebase Realtime Database data for testing
 * 
 * WARNING: This will delete ALL data from your Firebase database!
 * Only run this in development mode.
 * 
 * Usage: bun run scripts/clear-firebase.js
 * 
 * Note: Bun automatically loads .env files, so no dotenv needed
 */

import admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';

// Check if we're in dev mode
const isDev = process.env.NODE_ENV !== 'production';
if (!isDev) {
	console.error('❌ This script can only be run in development mode!');
	console.error('Set NODE_ENV=development or remove NODE_ENV to run this script.');
	process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = {
	type: 'service_account',
	project_id: 'balderdash2-dev',
	private_key_id: process.env.PRIVATE_DEV_FB_KEY_ID,
	private_key: Buffer.from(process.env.PRIVATE_DEV_FB_KEY_B64 || '', 'base64')
		.toString('utf-8')
		.replace(/\\n/g, '\n'),
	client_email: process.env.PRIVATE_DEV_FB_CLIENT_EMAIL,
	client_id: process.env.PRIVATE_DEV_FB_CLIENT_ID,
	auth_uri: 'https://accounts.google.com/o/oauth2/auth',
	token_uri: 'https://oauth2.googleapis.com/token',
	auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
	client_x509_cert_url: process.env.PRIVATE_DEV_FB_CLIENT_X509_CERT_URL,
	universe_domain: 'googleapis.com',
};

const firebaseApp = admin.apps.length > 0
	? admin.app()
	: admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
			databaseURL: process.env.PUBLIC_DEV_FB_DATABASE_URL,
		});

const rtdb = getDatabase(firebaseApp);

// Database paths to clear
const pathsToClear = ['sessions', 'contact', 'feedback'];

async function clearDatabase() {
	console.log('🗑️  Clearing Firebase Realtime Database...\n');

	try {
		for (const path of pathsToClear) {
			const ref = rtdb.ref(path);
			const snapshot = await ref.once('value');
			const data = snapshot.val();
			
			if (data) {
				const count = Object.keys(data).length;
				console.log(`  Clearing ${path}... (${count} entries)`);
				await ref.remove();
				console.log(`  ✅ Cleared ${path}\n`);
			} else {
				console.log(`  ℹ️  ${path} is already empty\n`);
			}
		}

		console.log('✅ Firebase database cleared successfully!');
	} catch (error) {
		console.error('❌ Error clearing database:', error);
		process.exit(1);
	} finally {
		await admin.app().delete();
	}
}

clearDatabase();

