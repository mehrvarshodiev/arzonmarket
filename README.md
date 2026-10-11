# ArzonMarket — MERN e-commerce

A full-stack online marketplace starter built with MongoDB, Express, React, and Node.js.

## Project structure

- `client/` — React + Vite storefront
- `server/` — Express REST API, MongoDB models, authentication, products and orders routes

## Requirements

- Node.js 18+
- MongoDB instance (local or hosted)

## Setup

### 1. API server

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Set `MONGODB_URI`, `JWT_SECRET`, and other environment values in `server/.env`.

### 2. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL` to the API base URL.

## Security

Never commit real `.env` files, credentials, or production secrets. The `.env.example` files contain placeholders only.

## Note

This repository is being populated with the project source. Review configuration and run tests/builds before production deployment.
