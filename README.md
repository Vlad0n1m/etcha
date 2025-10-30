This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Database Setup

This project uses **PostgreSQL** as the database (required for Vercel deployment).

### Local Development

1. Set up a PostgreSQL database (Docker, local installation, or Neon):
   ```bash
   # Using Docker
   docker run --name etcha-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=etcha -p 5432:5432 -d postgres:15
   ```

2. Create `.env.local` file:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/etcha?schema=public"
   ```

3. Run migrations:
   ```bash
   npm run db:migrate
   ```

4. Seed the database (optional):
   ```bash
   npm run db:seed
   ```

### Production Deployment on Vercel

⚠️ **Important**: Vercel does not support SQLite. You must use a remote PostgreSQL database.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick setup:**
1. Create a PostgreSQL database (recommended: [Neon](https://neon.tech) or Vercel Postgres)
2. Add `DATABASE_URL` environment variable in Vercel
3. Migrations run automatically during build

For more details, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - SQLite to PostgreSQL migration guide

# etcha

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/vlad0n1ms-projects/v0-etcha)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/Lb46hOAmyjc)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/vlad0n1ms-projects/v0-etcha](https://vercel.com/vlad0n1ms-projects/v0-etcha)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/Lb46hOAmyjc](https://v0.app/chat/projects/Lb46hOAmyjc)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository