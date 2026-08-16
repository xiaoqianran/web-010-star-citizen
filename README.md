# web-010-star-citizen

A Star Citizen–themed **Fleet Hangar** — a single-page web app for browsing ships
across the 'verse, filtering them by role, searching the shipyards, and assembling
your own personal fleet with live totals for cargo capacity and fleet value.

Built with [Vite](https://vite.dev/), [React](https://react.dev/) and TypeScript.

## Getting started

Requirements: Node.js 22+ and npm.

```bash
npm install      # install dependencies
npm run dev      # start the dev server on http://localhost:5173
```

## Available scripts

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server (with hot reload).       |
| `npm run build`   | Type-check and produce a production build in `dist/`. |
| `npm run preview` | Preview the production build locally.              |
| `npm run lint`    | Run ESLint over the project.                       |

## Project structure

```
├── index.html            # App entry HTML
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Fleet Hangar UI + interactions
│   ├── data/ships.ts     # Ship catalog data
│   └── index.css         # Theme and styles
└── .cursor/environment.json  # Cloud Agent dev environment config
```

## Cloud Agent environment

The [`.cursor/environment.json`](.cursor/environment.json) installs dependencies with
`npm ci` and starts the dev server (`npm run dev`) in a persistent terminal so the app
is available while an agent works.

> Fan-made demo. Ship data is illustrative and not affiliated with Cloud Imperium Games.
