/**
 * @typedef {import("firebase-admin").ServiceAccount} ServiceAccount
 * @typedef {import("$lib/types").Session} Session
 * @typedef {import('@sveltejs/kit').Cookies} Cookies
 */

import jwt from 'jsonwebtoken';
import config from '$lib/config';
import { CONTACT_DB, DB, FEEDBACK, ROOMS_DB, TOKEN } from '$lib/constants';
import { getDatabase } from 'firebase-admin/database';
import { dev } from '$app/environment';
import admin from 'firebase-admin';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import {
	PRIVATE_DEV_FB_CLIENT_EMAIL,
	PRIVATE_DEV_FB_CLIENT_ID,
	PRIVATE_DEV_FB_CLIENT_X509_CERT_URL,
	PRIVATE_DEV_FB_KEY_B64,
	PRIVATE_DEV_FB_KEY_ID,
	PRIVATE_PROD_FB_CLIENT_EMAIL,
	PRIVATE_PROD_FB_CLIENT_ID,
	PRIVATE_PROD_FB_CLIENT_X509_CERT_URL,
	PRIVATE_PROD_FB_KEY_B64,
	PRIVATE_PROD_FB_KEY_ID,
	PRIVATE_SECRET_TOKEN,
} from '$env/static/private';
import {
	PUBLIC_DEV_FB_DATABASE_URL,
	PUBLIC_PROD_FB_DATABASE_URL,
	PUBLIC_DEV_FB_PROJECT_ID,
	PUBLIC_PROD_FB_PROJECT_ID,
} from '$env/static/public';
import { client } from '$lib/analytics.js';

const letters = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase();

function requiredEnv(name, value) {
	if (value === undefined || value === null || String(value).trim() === '') {
		throw new Error(
			`Missing environment variable ${name}. You need to configure Firebase + PostHog (optional). See .env.example for a starting template.`,
		);
	}
	return value;
}

const firebaseProjectId = requiredEnv(
	dev ? 'PUBLIC_DEV_FB_PROJECT_ID' : 'PUBLIC_PROD_FB_PROJECT_ID',
	dev ? PUBLIC_DEV_FB_PROJECT_ID : PUBLIC_PROD_FB_PROJECT_ID,
);

const firebaseDatabaseUrl = requiredEnv(
	dev ? 'PUBLIC_DEV_FB_DATABASE_URL' : 'PUBLIC_PROD_FB_DATABASE_URL',
	dev ? PUBLIC_DEV_FB_DATABASE_URL : PUBLIC_PROD_FB_DATABASE_URL,
);

// Firebase Admin service account fields
const privateKeyB64 = requiredEnv(
	dev ? 'PRIVATE_DEV_FB_KEY_B64' : 'PRIVATE_PROD_FB_KEY_B64',
	dev ? PRIVATE_DEV_FB_KEY_B64 : PRIVATE_PROD_FB_KEY_B64,
);

const serviceAccount = {
	type: 'service_account',
	project_id: firebaseProjectId,
	private_key_id: requiredEnv(dev ? 'PRIVATE_DEV_FB_KEY_ID' : 'PRIVATE_PROD_FB_KEY_ID', dev ? PRIVATE_DEV_FB_KEY_ID : PRIVATE_PROD_FB_KEY_ID),
	private_key: Buffer.from(privateKeyB64, 'base64').toString('utf8').replace(/\\n/g, '\n'),
	client_email: requiredEnv(dev ? 'PRIVATE_DEV_FB_CLIENT_EMAIL' : 'PRIVATE_PROD_FB_CLIENT_EMAIL', dev ? PRIVATE_DEV_FB_CLIENT_EMAIL : PRIVATE_PROD_FB_CLIENT_EMAIL),
	client_id: requiredEnv(dev ? 'PRIVATE_DEV_FB_CLIENT_ID' : 'PRIVATE_PROD_FB_CLIENT_ID', dev ? PRIVATE_DEV_FB_CLIENT_ID : PRIVATE_PROD_FB_CLIENT_ID),
	auth_uri: 'https://accounts.google.com/o/oauth2/auth',
	token_uri: 'https://oauth2.googleapis.com/token',
	auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
	client_x509_cert_url: requiredEnv(
		dev ? 'PRIVATE_DEV_FB_CLIENT_X509_CERT_URL' : 'PRIVATE_PROD_FB_CLIENT_X509_CERT_URL',
		dev ? PRIVATE_DEV_FB_CLIENT_X509_CERT_URL : PRIVATE_PROD_FB_CLIENT_X509_CERT_URL,
	),
	universe_domain: 'googleapis.com',
};

// Validate JWT signing secret early, so local setup errors are obvious.
requiredEnv('PRIVATE_SECRET_TOKEN', PRIVATE_SECRET_TOKEN);

const firebaseApp =
	getApps().length > 0
		? getApp()
		: initializeApp({
				credential: admin.credential.cert(/** @type {ServiceAccount} */ (serviceAccount)),
				databaseURL: firebaseDatabaseUrl,
			});

const rtdb = getDatabase(firebaseApp);
export const dbRef = rtdb.ref(DB);
export const roomsRef = rtdb.ref(ROOMS_DB);
export const contactRef = rtdb.ref(CONTACT_DB);
export const feedbackRef = rtdb.ref(FEEDBACK);

/**
 * Get session from ID
 * @param {string} id - session ID
 * @returns {Promise<Session>} - session data
 */
export async function getSession(id) {
	if (!(await sessionIdExists(id))) return null;
	const snapshot = await dbRef.child(id).get();
	return /** @type {Session} */ (snapshot.val());
}

/**
 * Retrieve a random character from a string of characters
 * @param {string} array - an array of strings
 * @returns {string} - a random string from the array
 */
function generateRandomIndex(array = letters) {
	const index = Math.floor(Math.random() * array.length);
	return array[index];
}

/**
 * Create a random string of characters
 * @param {number} len - length of string to generate
 * @param {string} root - root string
 * @returns {string} - a random string
 */
function generateRandomString(len, root = '') {
	if (len === 0) return root;
	const newRoot = root + generateRandomIndex();
	return generateRandomString(len - 1, newRoot);
}

/**
 * Generate a random number as a string
 * @param {number} len - length of number to generate
 * @returns {string} - a random number formatted as a string
 */
function generateRandomNumber(len) {
	const max = Math.pow(10, len) - 1;
	const num = Math.floor(Math.random() * max);
	return String(num).padStart(len, '0');
}

/**
 * Generate a session ID consisting out of letters and integers
 * @param {number} characters - number of characters that must appear in the ID
 * @param {number} integers - number of integers that must appear in the ID
 * @returns {string} - session ID
 */
export function generateSessionId(
	characters = config.sessionId.numCharacters,
	integers = config.sessionId.numIntegers,
) {
	return generateRandomString(characters) + generateRandomNumber(integers);
}

/**
 * Create a new session ID
 * @returns {Promise<string>} session ID
 */
export async function createNewSessionId() {
	const id = generateSessionId();
	if (await sessionIdExists(id)) return createNewSessionId();
	else return id;
}

/**
 * Get room from code
 * @param {string} code - room code
 * @returns {Promise<any>} - room data (untyped)
 */
export async function getRoom(code) {
	const snapshot = await roomsRef.child(code).get();
	return snapshot.exists() ? snapshot.val() : null;
}

/**
 * Check if room code exists
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function roomCodeExists(code) {
	const snapshot = await roomsRef.child(code).get();
	return snapshot.exists();
}

/**
 * Create a new unique room code
 * @returns {Promise<string>}
 */
export async function createNewRoomCode() {
	const code = generateSessionId();
	if (await roomCodeExists(code)) return createNewRoomCode();
	return code;
}

/**
 * Check if a session ID exists
 * @param {string} id - session ID
 * @returns {Promise<boolean>} - whether the session ID exists
 */
export async function sessionIdExists(id) {
	const snapshot = await dbRef.child(id).get();
	return snapshot.exists();
}

/**
 * Sign a token
 * @param {Object} payload - the payload to sign
 * @returns signed JWT token
 */
export function signToken(payload) {
	return jwt.sign(payload, PRIVATE_SECRET_TOKEN, { expiresIn: config.jwtTokenExpiration });
}

/**
 * Check whether the token is valid or not
 * @param {string} token - JWT token
 * @returns {boolean} - whether the token is valid
 */
export function tokenIsValid(token) {
	try {
		jwt.verify(token, PRIVATE_SECRET_TOKEN);
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Validate JWT token
 * @param {Cookies} cookies
 * @throws {Error} - if the token is invalid
 * @returns {void}
 */
export function validateToken(cookies) {
	if (!tokenIsValid(cookies.get(TOKEN) || '')) {
		client.capture({
			event: 'error',
			properties: { type: 'invalid_token' },
		});
		throw new Error('Invalid JWT token');
	}
}
