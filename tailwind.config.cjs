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
				custom: [
					{
						name: 'rubbish',
						properties: {
							// Modern, clean color scheme inspired by Fibbage 4
							'--theme-font-family-base': 'Quicksand, sans-serif',
							'--theme-font-family-heading': 'Quicksand, sans-serif',
							'--theme-font-color-base': '0 0 0',
							'--theme-font-color-dark': '255 255 255',
							'--theme-rounded-base': '12px',
							'--theme-rounded-container': '16px',
							'--theme-border-base': '1px',
							// Primary colors - vibrant blue/purple
							'--color-primary-50': '239 246 255',
							'--color-primary-100': '219 234 254',
							'--color-primary-200': '191 219 254',
							'--color-primary-300': '147 197 253',
							'--color-primary-400': '96 165 250',
							'--color-primary-500': '59 130 246',
							'--color-primary-600': '37 99 235',
							'--color-primary-700': '29 78 216',
							'--color-primary-800': '30 64 175',
							'--color-primary-900': '30 58 138',
							// Surface colors - clean whites and grays
							'--color-surface-50': '249 250 251',
							'--color-surface-100': '243 244 246',
							'--color-surface-200': '229 231 235',
							'--color-surface-300': '209 213 219',
							'--color-surface-400': '156 163 175',
							'--color-surface-500': '107 114 128',
							'--color-surface-600': '75 85 99',
							'--color-surface-700': '55 65 81',
							'--color-surface-800': '31 41 55',
							'--color-surface-900': '17 24 39',
						},
					},
				],
			},
		}),
	],
};

