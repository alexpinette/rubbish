# Rubbish

A web-based version of the classic **Balderdash** board game - the ultimate party game of bluffing and trivia!

## Overview

Rubbish is an online multiplayer game where players craft convincing but false responses to prompts, trying to fool their friends while also identifying the correct answer. This project is a fork of [ivan-rivera/balderdash-web](https://github.com/ivan-rivera/balderdash-web), which was built using SvelteKit and Firebase.

### Features

- Multiple categories: Rare words, Scientific names, Film taglines, Famous people
- Support for custom definitions
- Ability to double bluff for extra points
- AI/NPC guesses to make the game more interesting
- Ability to invite players into the session
- Optional timer that forces players to respond quickly
- Ability to kick unresponsive players
- Ability to resume game after a player disconnects
- Feedback collection mechanisms
- Dark mode, improved UI and better desktop support
- Clean, modern design inspired by Fibbage 4

## Gameplay

- You need at least 3 people to play
- One person sets up the game, the others join
- The game is played in rounds where one person will be the "dasher" and the others will be "guessers"
- The dasher selects a challenging prompt (e.g. rare word) and the guessers first try to either guess it or come up with a convincing fake response (e.g. word definition)
- The dasher marks submitted guesses and points are awarded to the correct submissions
- The rest of the guesses are submitted into a shared pool and the guessers then need to vote for the correct response
- Points are awarded based on the number of votes received (see the Rules tab in-game for more info about scoring)

## Attribution

This project is a fork of [ivan-rivera/balderdash-web](https://github.com/ivan-rivera/balderdash-web), which was created by an independent developer. The original project uses data from [ivan-rivera/balderdash-data](https://github.com/ivan-rivera/balderdash-data).

## For Developers

This app is built using SvelteKit and Firebase. All contributions are welcome!

### Getting Started

1. Clone the repository
2. Run `bun install` (or `npm install` if you prefer)
3. Set up a Firebase project and PostHog project (both are free)
4. Add the necessary environment variables to `.env` (see `.github/workflows/ci.yaml` and `src/lib/firebase/server.js` for required variables)
5. Run `bun dev` to start the development server
6. Run `bun test:lib` to run tests

### Contributing

- Submit an issue
- Submit a pull request with an improvement (suggest starting with an issue first to discuss the change)
- Play the game and provide feedback

If you would like to work on this project but are struggling to get started, please feel free to reach out!

## License

This project is for personal entertainment only and is not monetized. This website does not hold the trademark to the game Balderdash.
