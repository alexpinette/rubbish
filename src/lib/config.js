export default {
	devPort: 4173,
	backendEnabled: true,
	url: 'https://www.balderdash.app',
	appVersion: '1.0.0',
	jwtTokenExpiration: '1h',
	toastTimeout: 5000,
	maxUsernameLength: 12,
	minPlayersRequired: 3,
	maxPlayers: 12,
	customPrompt: {
		minPromptLength: 2,
		maxPromptLength: 64,
		minResponseLength: 4,
		maxResponseLength: 300,
	},
	timer: {
		default: 60,
		increment: 10,
		min: 30,
		max: 120,
	},
	sessionId: {
		numCharacters: 4,
		numIntegers: 0,
	},
	rounds: {
		default: 4,
		min: 4,
		max: 15,
	},
	categories: [
		{
			name: 'Rare words',
			description: 'Guess the definition',
			source:
				'https://raw.githubusercontent.com/alexpinette/rubbish-data/main/data/rare_words.json',
			enabled: true,
			promptName: 'word',
			responseName: 'definition',
		},
		{
			name: 'Famous people',
			description: 'Guess why they are famous',
			source:
				'https://raw.githubusercontent.com/alexpinette/rubbish-data/main/data/famous_people.json',
			enabled: true,
			promptName: 'person',
			responseName: 'claim to fame',
		},
		{
			name: 'Movie titles',
			description: 'Guess the plot',
			source:
				'https://raw.githubusercontent.com/alexpinette/rubbish-data/main/data/movie_titles.json',
			enabled: true,
			promptName: 'movie title',
			responseName: 'plot',
		},
		{
			name: 'Laws',
			description: 'Guess what the law says',
			source:
				'https://raw.githubusercontent.com/alexpinette/rubbish-data/main/data/laws.json',
			enabled: true,
			promptName: 'law',
			responseName: 'description',
		},
	],
};
