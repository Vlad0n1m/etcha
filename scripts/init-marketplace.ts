/**
 * Marketplace Initialization Script
 * 
 * This script initializes the NFT ticket resale marketplace by creating
 * the Metaplex Auction House and saving its configuration to the database.
 * 
 * Usage:
 *   npx ts-node scripts/init-marketplace.ts
 * 
 * Or via API:
 *   curl -X POST http://localhost:3000/api/marketplace/init
 */

async function initializeMarketplace() {
    try {
        console.log('🏪 Initializing marketplace...\n');

        const response = await fetch('http://localhost:3000/api/marketplace/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Success!');
            console.log('Auction House Address:', data.data.auctionHouseAddress);
            console.log('\n📋 Next steps:');
            console.log('1. Users can now list their tickets for resale');
            console.log('2. Buyers can purchase from the marketplace');
            console.log('3. Platform earns 2.5% fee on all sales');
            console.log('\n🔗 Visit these pages to test:');
            console.log('- Profile page: List your tickets');
            console.log('- Event page: See resale offers');
            console.log('- Resale page: Browse all listings');
        } else {
            console.error('❌ Error:', data.error);
            if (data.error.includes('already initialized')) {
                console.log('\n✅ Marketplace is already initialized and ready to use!');

                // Fetch the config to show the address
                const configResponse = await fetch('http://localhost:3000/api/marketplace/config');
                const configData = await configResponse.json();

                if (configData.success) {
                    console.log('Auction House Address:', configData.data.auctionHouseAddress);
                }
            }
        }
    } catch (error) {
        console.error('❌ Fatal error:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure the server is running: npm run dev');
        console.log('2. Check database connection');
        console.log('3. Verify Solana RPC endpoint');
        console.log('4. Ensure platform wallet has SOL for transactions');
    }
}

// Run if called directly
initializeMarketplace().then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
}).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});

export { initializeMarketplace };

