import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { isValidSolanaAddress } from '@/lib/utils/wallet'
import { deriveKeypairFromSignature, getDerivationSalt } from '@/lib/utils/keyDerivation.server'
import { Connection, PublicKey } from '@solana/web3.js'
import { Metaplex } from '@metaplex-foundation/js'

const prisma = new PrismaClient()

/**
 * POST /api/profile/tickets/[id]/resale
 * Create a resale listing for a ticket
 * Body: { price: number, walletAddress: string }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const ticketId = resolvedParams.id
        const body = await request.json()
        const { price, walletAddress } = body

        // Log request to create resale listing
        console.log('=== Resale Listing Request ===')
        console.log('Ticket ID:', ticketId)
        console.log('Wallet Address (external):', walletAddress)
        console.log('Price:', price, 'SOL')

        // Validation
        if (!walletAddress) {
            return NextResponse.json(
                { success: false, message: 'walletAddress is required' },
                { status: 400 }
            )
        }

        if (!isValidSolanaAddress(walletAddress)) {
            return NextResponse.json(
                { success: false, message: 'Invalid wallet address format' },
                { status: 400 }
            )
        }

        if (!price || typeof price !== 'number' || price <= 0) {
            return NextResponse.json(
                { success: false, message: 'Valid price in SOL is required' },
                { status: 400 }
            )
        }

        // Seller signature is required for future NFT transfers
        // We'll store it and use it when someone buys the ticket
        const { signature } = body
        if (!signature) {
            return NextResponse.json(
                { success: false, message: 'Signature is required for resale listing' },
                { status: 400 }
            )
        }

        // Find user by external wallet address
        const user = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress,
            },
            select: {
                id: true,
                internalWalletAddress: true,
            },
        })

        if (!user) {
            console.log('User not found for wallet:', walletAddress)
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            )
        }

        console.log('User found - User ID:', user.id)
        console.log('User internal wallet address (current):', user.internalWalletAddress)

        // Get ticket with event information
        const ticket = await prisma.ticket.findUnique({
            where: {
                id: ticketId,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        price: true,
                    },
                },
            },
        })

        if (!ticket) {
            console.log('Ticket not found:', ticketId)
            return NextResponse.json(
                { success: false, message: 'Ticket not found' },
                { status: 404 }
            )
        }

        console.log('Ticket found - NFT Mint Address:', ticket.nftMintAddress)
        console.log('Event ID:', ticket.eventId)

        // Verify ownership
        if (ticket.userId !== user.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized: You do not own this ticket' },
                { status: 403 }
            )
        }

        // Check if ticket is already on resale
        const existingListing = await prisma.listing.findUnique({
            where: {
                nftMintAddress: ticket.nftMintAddress,
            },
        })

        if (existingListing && existingListing.status === 'active') {
            return NextResponse.json(
                { success: false, message: 'This ticket is already listed for resale' },
                { status: 400 }
            )
        }

        // Check if event has passed
        const eventDate = new Date(ticket.event.date)
        const now = new Date()
        if (eventDate < now) {
            return NextResponse.json(
                { success: false, message: 'Cannot list tickets for past events' },
                { status: 400 }
            )
        }

        // Generate placeholder addresses for blockchain integration (will be replaced later)
        // For now, we'll use a deterministic address based on ticket ID
        const listingAddress = `listing_${ticketId}_${Date.now()}`
        const auctionHouseAddress = process.env.AUCTION_HOUSE_ADDRESS || 'placeholder_auction_house_address'

        // Store seller signature for future NFT transfers
        // This allows the system to transfer NFT from seller to buyer without seller being online
        const sellerSignatureHex = typeof signature === 'string'
            ? signature
            : Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')

        console.log('Signature format:', typeof signature === 'string' ? 'string' : 'Uint8Array')
        console.log('Signature length (hex):', sellerSignatureHex.length)
        console.log('Signature first 20 chars:', sellerSignatureHex.substring(0, 20))
        console.log('Wallet address:', walletAddress)

        // Derive seller keypair from signature to verify/update internalWalletAddress
        // This ensures the signature will derive the same address that's stored in the database
        const salt = getDerivationSalt()
        console.log('Using salt (first 10 chars):', salt.substring(0, 10))

        const sellerKeypair = deriveKeypairFromSignature(sellerSignatureHex, walletAddress, salt)
        const derivedInternalAddress = sellerKeypair.publicKey.toBase58()

        console.log('Derived internal wallet address from signature:', derivedInternalAddress)

        // Check if derived address matches existing internalWalletAddress
        // If not, update it to ensure consistency for future purchases
        let updatedUser = user
        if (user.internalWalletAddress !== derivedInternalAddress) {
            console.log(`Updating seller internalWalletAddress: ${user.internalWalletAddress} -> ${derivedInternalAddress}`)
            updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: {
                    internalWalletAddress: derivedInternalAddress,
                },
                select: {
                    id: true,
                    internalWalletAddress: true,
                },
            })
        } else {
            console.log('Internal wallet address matches - no update needed')
        }

        // Verify NFT ownership on blockchain before creating listing
        console.log('Verifying NFT ownership on blockchain...')
        try {
            const connection = new Connection(
                process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
                { commitment: 'confirmed' }
            )
            const metaplex = Metaplex.make(connection)

            // Get all NFTs owned by seller's internal wallet
            const sellerNfts = await metaplex.nfts().findAllByOwner({
                owner: sellerKeypair.publicKey,
            })

            console.log(`Seller has ${sellerNfts.length} NFTs in wallet`)

            // Check if the NFT is actually in seller's wallet
            const sellerOwnsNFT = sellerNfts.some(nft =>
                nft.address.toBase58() === ticket.nftMintAddress ||
                nft.mint.address.toBase58() === ticket.nftMintAddress
            )

            if (!sellerOwnsNFT) {
                console.error('NFT not found in seller wallet:', {
                    searchedNFT: ticket.nftMintAddress,
                    sellerWallet: derivedInternalAddress,
                    sellerNFTs: sellerNfts.map(n => ({ address: n.address.toBase58(), mint: n.mint.address.toBase58() }))
                })
                return NextResponse.json(
                    {
                        success: false,
                        message: `Cannot list NFT for resale: NFT ${ticket.nftMintAddress} is not in your wallet. The NFT may have been transferred or is in a different wallet.`,
                    },
                    { status: 400 }
                )
            }

            console.log('NFT ownership verified on blockchain')
        } catch (blockchainError: unknown) {
            console.error('Error verifying NFT ownership on blockchain:', blockchainError)
            // Don't fail the listing creation, but log the error
            // In production, you might want to require blockchain verification
            console.warn('Continuing with listing creation despite blockchain verification error')
        }

        // Create listing in database
        // Note: Blockchain integration will be added later via AuctionHouseService
        console.log('Creating resale listing in database...')
        const listing = await prisma.listing.create({
            data: {
                nftMintAddress: ticket.nftMintAddress,
                eventId: ticket.eventId,
                sellerId: user.id,
                listingAddress: listingAddress,
                auctionHouseAddress: auctionHouseAddress,
                price: price,
                originalPrice: ticket.event.price,
                status: 'active',
                sellerSignature: sellerSignatureHex, // Store signature for future NFT transfers
                // transactionHash will be set when blockchain transaction is completed
            },
            include: {
                event: {
                    select: {
                        title: true,
                        imageUrl: true,
                    },
                },
            },
        })

        console.log('Resale listing created successfully - Listing ID:', listing.id)
        console.log('Listing Address:', listingAddress)
        console.log('=== End Resale Listing Request ===')

        return NextResponse.json({
            success: true,
            listing: {
                id: listing.id,
                nftMintAddress: listing.nftMintAddress,
                price: listing.price,
                originalPrice: listing.originalPrice,
                listingAddress: listing.listingAddress,
                auctionHouseAddress: listing.auctionHouseAddress,
                status: listing.status,
                createdAt: listing.createdAt.toISOString(),
                event: {
                    title: listing.event.title,
                    imageUrl: listing.event.imageUrl,
                },
            },
            message: 'Ticket listed for resale successfully',
        })
    } catch (error: any) {
        console.error('Error creating resale listing:', error)

        // Handle unique constraint violation (ticket already listed)
        if (error.code === 'P2002') {
            return NextResponse.json(
                { success: false, message: 'This ticket is already listed for resale' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to create resale listing',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}
