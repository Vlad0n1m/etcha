import { SolanaService } from '../src/lib/solana/SolanaService';
import { prisma } from '../src/lib/db';
import { PublicKey } from '@solana/web3.js';

/**
 * This script transfers tickets that were minted but not properly transferred to users
 * Run this with: npx tsx scripts/transfer-stuck-tickets.ts
 */

async function transferStuckTickets() {
    console.log('🔧 Starting ticket transfer utility...\n');

    const solanaService = new SolanaService();
    const metaplex = solanaService.getMetaplex();
    const platformWallet = solanaService.getWalletAddress();

    console.log(`Platform wallet: ${platformWallet}`);
    console.log('---\n');

    // Get all tickets from database
    const tickets = await prisma.ticket.findMany({
        include: {
            user: true,
            event: true,
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log(`Found ${tickets.length} tickets in database\n`);

    let transferred = 0;
    let skipped = 0;
    let failed = 0;

    for (const ticket of tickets) {
        try {
            console.log(`\n📋 Checking ticket: ${ticket.nftMintAddress.slice(0, 8)}...${ticket.nftMintAddress.slice(-8)}`);
            console.log(`   Event: ${ticket.event.title}`);
            console.log(`   Should be owned by: ${ticket.user.walletAddress.slice(0, 8)}...${ticket.user.walletAddress.slice(-8)}`);

            // Check if NFT exists and get current owner
            try {
                const nft = await metaplex.nfts().findByMint({
                    mintAddress: new PublicKey(ticket.nftMintAddress)
                });

                // Get actual owner from token account
                const connection = solanaService.getConnection();
                const tokenAccounts = await connection.getTokenLargestAccounts(nft.mint.address);

                let currentOwner: string | null = null;
                for (const account of tokenAccounts.value) {
                    if (account.uiAmount && account.uiAmount > 0) {
                        const accountInfo = await connection.getParsedAccountInfo(account.address);
                        if (accountInfo.value && 'parsed' in accountInfo.value.data) {
                            currentOwner = accountInfo.value.data.parsed.info.owner;
                            break;
                        }
                    }
                }

                if (!currentOwner) {
                    console.log('   ⚠️  Could not determine current owner, skipping');
                    skipped++;
                    continue;
                }

                console.log(`   Current owner: ${currentOwner.slice(0, 8)}...${currentOwner.slice(-8)}`);

                // Check if already owned by correct user
                if (currentOwner === ticket.user.walletAddress) {
                    console.log('   ✅ Already owned by correct user, skipping');
                    skipped++;
                    continue;
                }

                // Check if owned by platform (needs transfer)
                if (currentOwner === platformWallet) {
                    console.log('   🔄 Owned by platform, transferring to user...');

                    // Transfer NFT
                    const transferResult = await metaplex.nfts().transfer({
                        nftOrSft: nft,
                        toOwner: new PublicKey(ticket.user.walletAddress),
                    });

                    const signature = (transferResult.response as any).signature || 'unknown';
                    console.log(`   ✅ Transferred successfully! Tx: ${signature}`);
                    transferred++;
                } else {
                    console.log(`   ⚠️  Owned by different wallet: ${currentOwner}`);
                    console.log('   This ticket may have been traded or transferred outside our platform');
                    skipped++;
                }

            } catch (nftError) {
                console.log(`   ❌ NFT not found on blockchain: ${(nftError as Error).message}`);
                failed++;
            }

        } catch (error) {
            console.log(`   ❌ Error processing ticket: ${(error as Error).message}`);
            failed++;
        }
    }

    console.log('\n\n=== Summary ===');
    console.log(`Total tickets: ${tickets.length}`);
    console.log(`✅ Transferred: ${transferred}`);
    console.log(`⏭️  Skipped (already correct): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);

    await prisma.$disconnect();
}

transferStuckTickets().catch(console.error);

