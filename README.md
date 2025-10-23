# Etcha - Decentralized Event Ticketing Platform

## Overview

Etcha is a modern web application built with Next.js, designed as a decentralized event ticketing and resale marketplace. It leverages Solana blockchain for wallet integration, allowing users to buy, sell, and manage event tickets securely. The platform features event discovery, category-based filtering, ticket resale with dynamic pricing, and a mobile-responsive UI.

Key functionalities include:
- Browsing upcoming events categorized by topics like Blockchain, AI/ML, Web3, Marketing, etc.
- Ticket resale marketplace where users can list and purchase secondary market tickets.
- Solana wallet connection for secure transactions (currently set to Devnet).
- Responsive design with mobile-first components like drawers and carousels.

The project was bootstrapped with Create Next App and enhanced with UI components from shadcn/ui, Solana wallet adapters, and custom event/ticket management logic using mock data.

## Tech Stack

- **Framework**: Next.js 15.5.6 (App Router, TypeScript)
- **UI Library**: React 19.1.0, Tailwind CSS 4, shadcn/ui components (Button, Card, Drawer, Input, etc.)
- **Styling**: Tailwind CSS with custom animations (framer-motion), class-variance-authority (CVA) for variants
- **Blockchain Integration**: @solana/web3.js, @solana/wallet-adapter-react (Phantom, Solflare, Torus wallets)
- **Other Dependencies**:
  - Embla Carousel for banner carousels
  - Lucide React for icons
  - Vaul for drawers
  - Math.js (unused in current implementation)
- **Dev Tools**: ESLint 9, TypeScript 5, PostCSS

## Project Structure

```
etcha/
├── components.json          # shadcn/ui configuration
├── eslint.config.mjs       # ESLint configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Dependencies and scripts
├── postcss.config.mjs      # PostCSS config for Tailwind
├── public/                 # Static assets (logos, banners, SVGs)
├── README.md               # This file
├── src/
│   ├── app/                # App Router pages and layouts
│   │   ├── event/[id]/     # Dynamic event detail page
│   │   │   └── page.tsx
│   │   ├── globals.css     # Global styles (Tailwind imports, wallet adapter styles)
│   │   ├── layout.tsx      # Root layout with fonts, WalletProvider, NavigationProvider
│   │   ├── page.tsx        # Home page: Event listing with filters and carousel
│   │   ├── profile/        # User profile page (basic/placeholder)
│   │   │   └── page.tsx
│   │   ├── resale/         # Resale marketplace page
│   │   │   └── page.tsx
│   │   └── tickets/        # Tickets page (empty/not implemented)
│   ├── components/         # Reusable React components
│   │   ├── BannerCarousel.tsx  # Rotating banner carousel
│   │   ├── BottomNav.tsx       # Bottom navigation (mobile)
│   │   ├── EventCard.tsx       # Event card display
│   │   ├── EventCardSkeleton.tsx # Loading skeleton for events
│   │   ├── EventFilters.tsx     # Category filters for events
│   │   ├── JoinDrawer.tsx       # Join community drawer
│   │   ├── MobileHeader.tsx     # Mobile-specific header
│   │   ├── NavigationProvider.tsx # Navigation context provider
│   │   ├── PageTransition.tsx   # Page transition animations
│   │   ├── ResaleCategoryFilter.tsx # Filters for resale page
│   │   ├── ResaleTicketCard.tsx # Resale ticket card
│   │   ├── TicketCard.tsx       # Standard ticket card
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── carousel.tsx
│   │   │   ├── drawer.tsx
│   │   │   └── input.tsx
│   │   ├── WalletDrawer.tsx     # Wallet connection drawer
│   │   └── WalletProvider.tsx   # Solana wallet context provider
└── lib/
    └── utils.ts                # Utility functions (e.g., cn for class merging)
```

## Key Features

### Home Page (/app/page.tsx)
- **Banner Carousel**: Rotating promotional banners for sponsorships and wallet connection.
- **Event Listing**: Displays mock events grouped by date (Today/Tomorrow/Weekday). Supports filtering by category (All, Blockchain, AI/ML, Web3, etc.).
- **Loading States**: Skeleton cards during filter changes.
- **Empty States**: Handles no events found gracefully.
- Uses test data for events with details like title, price (in some unit, e.g., $ or tokens), date/time, location, organizer.

### Resale Marketplace (/app/resale/page.tsx)
- **Ticket Search and Filters**: Search by event/venue/seller, category filters (Music, Tech, Sports, Art, etc.), price sorting (low-high/high-low), resale price comparison (cheaper/more expensive/same as original).
- **Resale Tickets**: Displays secondary market tickets with seller info, original vs. resale price, seats, and availability (mock data).
- **Reset Filters**: Clears all filters.
- Responsive grid layout with loading skeletons.

### Event Details (/app/event/[id]/page.tsx)
- Dynamic route for individual event pages (content not read, assumed to display event details and ticket purchase).

### Profile (/app/profile/page.tsx)
- Basic user profile page (placeholder, details not read).

### Tickets (/app/tickets/)
- Empty directory; likely planned for user's purchased tickets management.

### Wallet Integration
- **WalletProvider**: Wraps the app with Solana connection (Devnet), supports Phantom, Solflare, Torus wallets.
- **WalletDrawer**: UI for connecting/disconnecting wallets.
- Auto-connect on load; modal for wallet selection.

### Mobile Features
- MobileHeader for top navigation.
- BottomNav for bottom tabs.
- Drawers for modals (e.g., Join, Wallet).

## Setup and Installation

### Prerequisites
- Node.js 20+ (with npm, yarn, pnpm, or bun)
- Solana wallet (e.g., Phantom) for testing blockchain features

### Getting Started

First, clone or download the repository and install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the home page.

### Available Scripts

From `package.json`:
- `npm run dev`: Start development server with Turbopack.
- `npm run build`: Build for production.
- `npm run start`: Run production server.
- `npm run lint`: Run ESLint for code quality.

### Environment Variables
- No custom env vars required for basic setup (uses Devnet by default).
- For mainnet, update `network` in `WalletProvider.tsx`.

### Testing Wallet Integration
1. Navigate to the app.
2. Click "Connect Wallet" in the banner or drawer.
3. Select a wallet (Phantom recommended).
4. Approve connection (Devnet for testing).

## Usage

### Browsing Events
- On the home page, use category filters to narrow down events.
- Events are grouped by date with timelines.
- Click an event to view details (route: `/event/[id]`).

### Resale Tickets
- Visit `/resale` for secondary market.
- Use search and filters to find tickets.
- Each card shows resale price vs. original, seats, and seller.

### Adding Real Data
- Replace mock data in `page.tsx` and `resale/page.tsx` with API calls (e.g., to a backend or Solana program).
- Integrate real Solana transactions for ticket purchases.

### Customization
- Add new categories/filters in `EventFilters.tsx` and `ResaleCategoryFilter.tsx`.
- Extend wallet functionality for ticket minting/NFTs.
- Implement authentication beyond wallet (e.g., profile management).

## Components Breakdown

- **EventCard / ResaleTicketCard / TicketCard**: Core display components for events/tickets with images, prices, dates, and CTAs.
- **BannerCarousel**: Embla-based slider for promotional content.
- **EventFilters / ResaleCategoryFilter**: Pill-based category selectors.
- **MobileHeader / BottomNav**: Mobile navigation.
- **WalletProvider / WalletDrawer**: Blockchain wallet management.
- **UI Components** (shadcn): Reusable primitives with Tailwind variants.
- **PageTransition**: Framer Motion for smooth page changes.

For full component details, refer to source files in `/src/components/`.

## Deployment

The easiest way to deploy is using Vercel (integrated with v0.app):

1. Push to GitHub.
2. Import to Vercel dashboard.
3. Deploy automatically.

Live demo: [https://vercel.com/vlad0n1ms-projects/v0-etcha](https://vercel.com/vlad0n1ms-projects/v0-etcha)

Built with [v0.app](https://v0.app) for rapid UI prototyping.

For custom deployments:
- Build: `npm run build`
- Start: `npm start`
- Ensure Solana RPC endpoint is configured for production (mainnet-beta).

## Contributing

1. Fork the repo.
2. Create a feature branch.
3. Commit changes with conventional commits.
4. Run `npm run lint` before pushing.
5. Open a PR.

## License

This project is unlicensed (or MIT by default from Create Next App). See original template for details.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

*This documentation was generated automatically based on project analysis.*