const { join } = require('path');

const forms = require('@tailwindcss/forms');
const typography = require('@tailwindcss/typography');
const { skeleton } = require('@skeletonlabs/tw-plugin');
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}'),
	],
	theme: {
		extend: {
			minWidth: {
				'2xs': '375px',
				xs: '400px',
			},
		},
		screens: {
			'2xs': '375px',
			sm: '400px',
			...defaultTheme.screens,
		},
	},
	plugins: [
		forms,
		typography,
		skeleton({
			themes: {
				preset: [{ name: 'crimson', enhancements: true }],
			},
		}),
	],
};

