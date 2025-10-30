# Vercel Deployment Guide

## Prerequisites

1. A Vercel account
2. PostgreSQL database (e.g., from Neon, Supabase, or Railway)
3. Solana wallet private key

## Environment Variables

You need to set the following environment variables in your Vercel project settings:

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Solana Configuration
SOLANA_PRIVATE_KEY="[1,2,3,...]"  # Your wallet private key as an array
SOLANA_RPC_URL="https://api.devnet.solana.com"  # or mainnet
SOLANA_NETWORK="devnet"  # or mainnet-beta

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-random-secret-key-here"

# Next.js
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```

## Setting Environment Variables in Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable above with the appropriate values
4. Make sure to set them for **Production**, **Preview**, and **Development** environments

## Deployment Steps

### 1. Connect Your Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub/GitLab repository
4. Vercel will automatically detect Next.js

### 2. Configure Build Settings

Vercel should auto-detect the following:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (already configured in vercel.json)
- **Install Command**: `npm install` (already configured in vercel.json)
- **Output Directory**: `.next` (default)

### 3. Set Environment Variables

Add all the environment variables listed above in the Vercel dashboard under:
**Project Settings → Environment Variables**

### 4. Deploy

Click "Deploy" and Vercel will:
1. Install dependencies
2. Generate Prisma client (via postinstall script)
3. Build your Next.js application
4. Deploy to production

## Database Setup

After deployment, you need to run migrations on your production database:

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Pull environment variables
vercel env pull

# Run migrations
npx prisma migrate deploy

# Optional: Seed the database
npx prisma db seed
```

## Post-Deployment Steps

### 1. Initialize Marketplace

Make a POST request to initialize the Auction House:
```bash
curl -X POST https://your-domain.vercel.app/api/marketplace/init
```

### 2. Verify Deployment

Check these endpoints:
- `GET /api/categories` - Should return categories
- `GET /api/events` - Should return events (may be empty)

## Troubleshooting

### Build Errors

**Error: "SOLANA_PRIVATE_KEY environment variable is required"**
- Solution: This has been fixed by lazy-loading services. Make sure you've deployed the latest code.

**Error: "Prisma Client could not locate Query Engine"**
- Solution: The `binaryTargets` in schema.prisma includes `rhel-openssl-3.0.x` for Vercel compatibility.
- Make sure `postinstall` script runs: `npm run postinstall` or `prisma generate`

### Runtime Errors

**Database Connection Issues**
- Verify `DATABASE_URL` is correct and accessible from Vercel
- Check if your database allows connections from Vercel IPs
- For Neon/Supabase, make sure connection pooling is enabled

**Solana Transaction Failures**
- Verify your `SOLANA_PRIVATE_KEY` is valid
- Check if your wallet has sufficient SOL balance
- Verify `SOLANA_RPC_URL` is accessible

## Performance Optimization

1. **Database Connection Pooling**: Use a connection pooler like Prisma Accelerate or PgBouncer
2. **RPC Endpoint**: Consider using a paid RPC endpoint like QuickNode or Helius for better performance
3. **Caching**: Implement API response caching where appropriate

## Security Checklist

- [ ] Keep `SOLANA_PRIVATE_KEY` secure and never commit to git
- [ ] Use environment variables for all sensitive data
- [ ] Enable Vercel's authentication for admin endpoints
- [ ] Set up proper CORS policies
- [ ] Use `JWT_SECRET` with strong random value
- [ ] Enable SSL/HTTPS (automatic on Vercel)
- [ ] Regularly rotate secrets and keys

## Monitoring

Monitor your deployment:
- Check Vercel logs for errors
- Monitor database connection pool usage
- Track Solana transaction success rates
- Set up error tracking (e.g., Sentry)

## Support

If you encounter issues:
1. Check Vercel logs: Project → Deployments → [Latest] → Logs
2. Check function logs for API routes
3. Verify all environment variables are set correctly
4. Test locally with production environment variables

