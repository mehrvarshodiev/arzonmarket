# ArzonMarket architecture

## Repository layout

```text
arzonmarket/
├── client/                    # React + Vite storefront
│   ├── public/                 # Static files served as-is
│   ├── src/
│   │   ├── api.js              # HTTP client and API base URL
│   │   ├── components/         # Reusable UI components
│   │   │   ├── layout/          # Shared page layout (header/footer)
│   │   │   ├── AppErrorBoundary.jsx
│   │   │   ├── AppLoader.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/             # Shared app state: auth, cart, theme
│   │   ├── pages/               # Route-level screens
│   │   ├── routes/              # Route table and access rules
│   │   ├── styles.css           # Global styles, tokens, theme overrides
│   │   ├── App.jsx              # Application shell
│   │   └── main.jsx             # React root and provider composition
│   └── package.json
├── server/
│   ├── middleware/              # Request middleware and auth guards
│   ├── models/                  # MongoDB/Mongoose schemas
│   ├── routes/                  # REST API endpoints
│   ├── server.js                # API bootstrap and middleware
│   └── package.json
├── docs/
│   └── ARCHITECTURE.md
└── package.json                 # Root-level development scripts
```

## Frontend component order

1. `main.jsx` mounts React and composes the router, error boundary, and providers.
2. `App.jsx` defines the shared visual shell: navigation, route outlet, and footer.
3. `routes/AppRoutes.jsx` maps URLs to lazy-loaded pages and applies route guards.
4. `pages/` contains complete screens; each page composes reusable components.
5. `components/` contains UI and layout pieces shared by multiple screens.
6. `context/` owns cross-page state; keep page-specific state inside the page where possible.
7. `api.js` centralizes HTTP access instead of scattering API configuration.

## Backend request flow

`Request → Helmet/CORS/body parsing → rate limiting (where configured) → route → model → JSON response`

- `routes/` handles HTTP concerns and validation.
- `models/` defines persistence shape.
- `middleware/` contains reusable request guards.
- `server.js` should only wire middleware, routes, health checks, database startup, and error handling.

## Clean-code conventions

- Use one component/module per file and name files after their primary export.
- Keep route definitions separate from layout markup.
- Extract repeated UI into reusable components only when their behavior and styling are genuinely shared.
- Keep API URLs and requests in `api.js`; do not duplicate request configuration in pages.
- Use descriptive names, early returns for guard clauses, and consistent 2-space indentation.
- Avoid changing business behavior during structural refactors.
- Keep secrets in environment variables; never commit real `.env` files.
- Before deploying, verify the frontend production build and inspect the deployment status.
