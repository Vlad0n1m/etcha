/**
 * Setup Merkle Tree for cNFT Events
 * 
 * This script creates a Merkle tree for an event to enable cNFT minting.
 * Run this after creating an event that should use compressed NFTs.
 * 
 * Usage:
 *   npx ts-node scripts/setup-merkle-tree.ts --eventId=<event-id> --size=SMALL
 * 
 * Tree sizes:
 *   - SMALL:  16,384 tickets (~0.1 SOL)
 *   - MEDIUM: 131,072 tickets (~0.5 SOL)
 *   - LARGE:  1,048,576 tickets (~1.5 SOL)
 * 
 * Requirements:
 *   - SOLANA_PRIVATE_KEY environment variable must be set
 *   - Platform wallet must have enough SOL for tree creation
 */

import { config } from 'dotenv';
config();

import { PrismaClient } from '../src/generated/prisma';
import { SolanaService } from '../src/lib/solana/SolanaService';
import { CollectionService } from '../src/lib/solana/CollectionService';
import { CandyMachineService } from '../src/lib/solana/CandyMachineService';
import { MerkleTreeSize, MERKLE_TREE_CONFIGS } from '../src/lib/solana/BubblegumService';

const prisma = new PrismaClient();

interface Args {
    eventId?: string;
    size?: MerkleTreeSize;
    listEvents?: boolean;
}

function parseArgs(): Args {
    const args: Args = {};

    for (const arg of process.argv.slice(2)) {
        if (arg.startsWith('--eventId=')) {
            args.eventId = arg.split('=')[1];
        } else if (arg.startsWith('--size=')) {
            const size = arg.split('=')[1] as MerkleTreeSize;
            if (['SMALL', 'MEDIUM', 'LARGE'].includes(size)) {
                args.size = size;
            } else {
                console.error(`Invalid size: ${size}. Must be SMALL, MEDIUM, or LARGE.`);
                process.exit(1);
            }
        } else if (arg === '--list') {
            args.listEvents = true;
        }
    }

    return args;
}

async function listEvents() {
    const events = await prisma.event.findMany({
        select: {
            id: true,
            title: true,
            ticketsAvailable: true,
            ticketsSold: true,
            nftType: true,
            merkleTreeAddress: true,
            candyMachineAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });

    console.log('\n📋 Recent Events:\n');
    console.log('ID'.padEnd(30) + 'Title'.padEnd(35) + 'Tickets'.padEnd(12) + 'Type'.padEnd(10) + 'Status');
    console.log('-'.repeat(100));

    for (const event of events) {
        const tickets = `${event.ticketsSold}/${event.ticketsAvailable}`;
        const nftType = event.nftType || 'legacy';
        let status = '❓ Not configured';

        if (event.merkleTreeAddress) {
            status = '🌳 cNFT Ready';
        } else if (event.candyMachineAddress) {
            status = '🍭 Candy Machine';
        }

        console.log(
            event.id.padEnd(30) +
            event.title.substring(0, 33).padEnd(35) +
            tickets.padEnd(12) +
            nftType.padEnd(10) +
            status
        );
    }

    console.log('\n');
}

async function setupMerkleTree(eventId: string, size: MerkleTreeSize = 'SMALL') {
    console.log('\n🌳 Setting up Merkle Tree for cNFT\n');
    console.log('Event ID:', eventId);
    console.log('Tree Size:', size);
    console.log('Capacity:', MERKLE_TREE_CONFIGS[size].capacity.toLocaleString(), 'tickets');
    console.log('');

    // Get event
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            organizer: {
                include: {
                    user: true,
                },
            },
        },
    });

    if (!event) {
        console.error('❌ Event not found');
        process.exit(1);
    }

    console.log('Event:', event.title);
    console.log('Tickets Available:', event.ticketsAvailable);

    if (event.merkleTreeAddress) {
        console.error('❌ This event already has a Merkle tree:', event.merkleTreeAddress);
        process.exit(1);
    }

    const organizerWallet = event.organizer?.user?.walletAddress;
    if (!organizerWallet) {
        console.error('❌ Organizer wallet not found');
        process.exit(1);
    }

    console.log('Organizer Wallet:', organizerWallet);
    console.log('');

    // Initialize services
    const solanaService = new SolanaService();
    const collectionService = new CollectionService();
    const candyMachineService = new CandyMachineService(solanaService, collectionService);
    const bubblegumService = candyMachineService.getBubblegumService();

    // Check balance
    const balance = await solanaService.getBalance();
    console.log('Platform Wallet Balance:', balance.toFixed(4), 'SOL');

    const estimatedCost = size === 'SMALL' ? 0.15 : size === 'MEDIUM' ? 0.6 : 2.0;
    if (balance < estimatedCost) {
        console.error(`❌ Insufficient balance. Need ~${estimatedCost} SOL`);
        process.exit(1);
    }

    console.log('Estimated Cost:', `~${estimatedCost} SOL`);
    console.log('');

    // Create Collection NFT if needed
    let collectionNftAddress = event.collectionNftAddress;
    if (!collectionNftAddress) {
        console.log('📦 Creating Collection NFT...');
        const collectionResult = await bubblegumService.createCollectionNFT({
            name: event.title,
            symbol: event.title.substring(0, 4).toUpperCase(),
            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/metadata/${eventId}`,
            sellerFeeBasisPoints: 250,
        });
        collectionNftAddress = collectionResult.collectionAddress;
        console.log('✅ Collection NFT created:', collectionNftAddress);
        console.log('   Signature:', collectionResult.signature);
        console.log('');
    } else {
        console.log('📦 Using existing Collection NFT:', collectionNftAddress);
        console.log('');
    }

    // Create Merkle Tree
    console.log('🌳 Creating Merkle Tree...');
    const treeResult = await bubblegumService.createMerkleTree(size);
    console.log('✅ Merkle Tree created!');
    console.log('   Address:', treeResult.merkleTreeAddress);
    console.log('   Max Depth:', treeResult.maxDepth);
    console.log('   Buffer Size:', treeResult.maxBufferSize);
    console.log('   Capacity:', treeResult.capacity.toLocaleString(), 'tickets');
    console.log('   Signature:', treeResult.signature);
    console.log('');

    // Update database
    console.log('💾 Updating database...');
    await prisma.event.update({
        where: { id: eventId },
        data: {
            collectionNftAddress,
            merkleTreeAddress: treeResult.merkleTreeAddress,
            merkleTreeDepth: treeResult.maxDepth,
            nftType: 'cnft',
        },
    });
    console.log('✅ Database updated!');
    console.log('');

    // Final summary
    console.log('🎉 Setup Complete!\n');
    console.log('='.repeat(60));
    console.log('Event:', event.title);
    console.log('NFT Type: cNFT (Compressed NFT)');
    console.log('Collection NFT:', collectionNftAddress);
    console.log('Merkle Tree:', treeResult.merkleTreeAddress);
    console.log('Capacity:', treeResult.capacity.toLocaleString(), 'tickets');
    console.log('');
    console.log('💰 Cost Savings:');
    console.log('   Traditional NFT mint: ~0.015 SOL/ticket');
    console.log('   cNFT mint: ~0.0003 SOL/ticket');
    console.log('   Savings: ~98%');
    console.log('='.repeat(60));
    console.log('');
}

async function main() {
    const args = parseArgs();

    if (args.listEvents) {
        await listEvents();
        return;
    }

    if (!args.eventId) {
        console.log('Usage:');
        console.log('  npx ts-node scripts/setup-merkle-tree.ts --eventId=<event-id> --size=SMALL');
        console.log('  npx ts-node scripts/setup-merkle-tree.ts --list');
        console.log('');
        console.log('Options:');
        console.log('  --eventId=<id>  Event ID to setup');
        console.log('  --size=<size>   Tree size: SMALL (16K), MEDIUM (131K), LARGE (1M)');
        console.log('  --list          List recent events');
        process.exit(1);
    }

    await setupMerkleTree(args.eventId, args.size || 'SMALL');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
