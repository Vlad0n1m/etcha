<div align="center">

# Etcha — secure blockchain-based ticket resale platform

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![Solana](https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana&logoColor=black)
![Vercel](https://img.shields.io/badge/Deploy%20on-Vercel-000000?logo=vercel)

<br/>

<img src="./public/etcha.png" alt="Etcha" width="640" />

</div>

### What is it
Etcha is a mobile first web platform for primary and secondary ticket sales powered by Solana. Users connect crypto wallets, create event collections, mint NFT tickets, buy/sell them on a marketplace, and manage ownership securely and transparently.

### Key features
- 🪪 NFT tickets on Solana: minting, holding, and ownership verification
- 💱 Resale marketplace: listing, purchasing, and price comparison vs original
- 👛 Wallet connection: SOLANA SEEKER, Phantom, Solflare and others via wallet adapter

---

## Tech stack
- Next.js 15 (App Router, React 19, TypeScript)
- Prisma + PostgreSQL (SQLite for local development only)
- Solana / Metaplex (UMI, Candy Machine, Auction House)
- Tailwind CSS 4, shadcn/ui, framer‑motion
- Cloudinary for media uploads (images, HEIC → PNG)

Full dependency list is in `package.json`.

---

## Quick start
1) Install dependencies:
```bash
npm install
```

2) Create `.env.local` (minimal for local dev):
```env
DATABASE_URL="postgresql://"

NEXTAUTH_URL=""
NEXTAUTH_SECRET="your-secret-key-here"

SOLANA_NETWORK="devnet"
SOLANA_RPC_URL="https://api.devnet.solana.com"

JWT_SECRET="your-jwt-secret-here"
PLATFORM_WALLET_PRIVATE_KEY="[]"
SOLANA_PRIVATE_KEY="[]"
SOLANA_RPC_URL=https://api.devnet.solana.com

NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
DERIVATION_SALT=etcha-platform-salt
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

3) Start Postgres (for example, with Docker):
```bash
docker run --name etcha-postgres \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=etcha \
  -p 5432:5432 -d postgres:15
```

4) Apply schema and generate client:
```bash
npx prisma migrate dev
npx prisma generate
```

5) (Optional) Seed data:
```bash
npm run db:seed
```

6) Start the dev server:
```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Scripts
- `dev` — development (Turbopack)
- `build` — `prisma generate && next build`
- `start` — production server
- `postinstall` — `prisma generate`
- `db:seed` — seeder `prisma/seed.ts`

For production, apply migrations with:
```bash
npx prisma migrate deploy
```

---

## Environment (ENV)
Minimum variables required:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_SOLANA_NETWORK` — `devnet` | `mainnet-beta`
- `SOLANA_RPC_ENDPOINT` — Solana RPC endpoint
- `CLOUDINARY_*` — if media uploads are enabled

See also `CLOUDINARY_SETUP.md`, `HEIC_FIX.md`, `TRANSACTION_SIGNING_FIX.md`.

---

## Architecture and directories
- `src/app` — App Router routes and API routes (`/api/*`)
- `src/components` — UI components (wallet, marketplace, modals, etc.)
- `src/lib` — services (Solana, Candy Machine, Metadata, Auction House), utilities
- `prisma` — database schema, migrations, and seeds

APIs live in `src/app/api/...` and cover profiles, tickets, minting, resale, wallets, uploads, and more.

---

## Solana, Candy Machine, and Marketplace
- Metaplex modules: Candy Machine, Token Metadata, Auction House
- Services: `src/lib/services/*`

Also see signature and wallet verification utilities: `src/lib/blockchain/wallet-verifier.ts`.

---

## Deployment
Vercel is recommended for the frontend. Use PostgreSQL in production (SQLite is not supported by Vercel).

In production, run:
```bash
npx prisma migrate deploy
```

---

## Screenshots
The `public/` folder contains images (banners, logos). Add UI screenshots for a more illustrative README.

---

## Contributing
1. Create a branch from `main`
2. Make changes with clear commit messages
3. Run lints/build
4. Open a PR
