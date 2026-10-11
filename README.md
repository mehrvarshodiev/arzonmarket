# ArzonMarket

ArzonMarket is a full-stack online marketplace built with React, Vite, Tailwind CSS, Express, and MongoDB.

## Project structure

- `client/` — responsive React storefront and admin UI.
- `server/` — Express REST API, authentication, product/order routes, and MongoDB models.
- `docs/ARCHITECTURE.md` — application structure, request flow, and clean-code conventions.

## Requirements

- Node.js 18+
- MongoDB instance (local or hosted)

## Setup

Install dependencies:

```bash
npm run install:all
```

Configure environment variables using the examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Set `MONGO_URI` and `JWT_SECRET` in `server/.env`, and set `VITE_API_URL` in `client/.env` to the API base URL. Never commit real credentials or environment files.

Run the API and frontend in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Create a production frontend build:

```bash
npm run build:client
```

## Frontend architecture

- `src/main.jsx` — React root, router, error boundary, and providers.
- `src/App.jsx` — shared application shell.
- `src/routes/AppRoutes.jsx` — lazy-loaded routes and route guards.
- `src/pages/` — route-level screens.
- `src/components/` — reusable UI and layout components.
- `src/context/` — shared authentication, cart, and theme state.
- `src/api.js` — API client configuration.

See [the architecture guide](docs/ARCHITECTURE.md) for details.
