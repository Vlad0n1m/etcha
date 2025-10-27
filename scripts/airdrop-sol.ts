/**
 * Airdrop SOL to Platform Wallet (Devnet)
 * 
 * This script airdrops SOL to the platform wallet configured in .env
 * 
 * Usage:
 *   npx ts-node scripts/airdrop-sol.ts [amount]
 * 
 * Examples:
 *   npx ts-node scripts/airdrop-sol.ts 10    # Airdrop 10 SOL
 *   npx ts-node scripts/airdrop-sol.ts      # Airdrop 5 SOL (default)
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function airdropSol() {
    try {
        // Get amount from command line or use default
        const amount = parseFloat(process.argv[2] || '5');

        if (amount <= 0 || amount > 10) {
            console.error('❌ Amount must be between 0 and 10 SOL (devnet limit)');
            process.exit(1);
        }

        console.log('🪂 Starting SOL airdrop...\n');

        // Get private key from env
        const privateKeyString = process.env.SOLANA_PRIVATE_KEY;
        if (!privateKeyString) {
            throw new Error('SOLANA_PRIVATE_KEY not found in .env');
        }

        // Parse private key
        const privateKeyArray = JSON.parse(privateKeyString);
        const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
        const publicKey = keypair.publicKey.toString();

        console.log('📍 Wallet Address:', publicKey);

        // Connect to devnet
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

        // Check current balance
        const balanceBefore = await connection.getBalance(keypair.publicKey);
        console.log('💰 Current Balance:', (balanceBefore / LAMPORTS_PER_SOL).toFixed(4), 'SOL');

        // Request airdrop
        console.log(`\n🚀 Requesting ${amount} SOL airdrop...`);
        const signature = await connection.requestAirdrop(
            keypair.publicKey,
            amount * LAMPORTS_PER_SOL
        );

        // Wait for confirmation
        console.log('⏳ Waiting for confirmation...');
        await connection.confirmTransaction(signature, 'confirmed');

        // Check new balance
        const balanceAfter = await connection.getBalance(keypair.publicKey);
        console.log('\n✅ Airdrop successful!');
        console.log('💰 New Balance:', (balanceAfter / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
        console.log('📈 Received:', ((balanceAfter - balanceBefore) / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
        console.log('🔗 Transaction:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

        console.log('\n✨ Ready to mint tickets!');
    } catch (error) {
        console.error('\n❌ Airdrop failed:', error);

        if (error instanceof Error) {
            if (error.message.includes('airdrop request failed')) {
                console.log('\n💡 Tips:');
                console.log('1. Devnet faucet may be rate-limited');
                console.log('2. Try again in a few seconds');
                console.log('3. Or use web faucet: https://faucet.solana.com/');
                console.log('4. Maximum 10 SOL per airdrop on devnet');
            }
        }

        process.exit(1);
    }
}

// Run the airdrop
airdropSol().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});

export { airdropSol };

