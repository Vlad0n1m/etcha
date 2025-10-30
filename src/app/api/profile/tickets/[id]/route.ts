import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { isValidSolanaAddress } from '@/lib/utils/wallet'
import { PublicKey } from '@solana/web3.js'

const prisma = new PrismaClient()

/**
 * POST /api/profile/tickets/[id]
 * Get detailed information about a specific ticket by NFT mint address
 * Body: { walletAddress: string, signature: string (hex) }
 * ID in URL is the NFT mint address
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const nftMintAddress = resolvedParams.id // NFT mint address from URL
        const body = await request.json()
        const { walletAddress, signature } = body

        if (!walletAddress || !signature) {
            return NextResponse.json(
                { success: false, message: 'walletAddress and signature are required' },
                { status: 400 }
            )
        }

        // Validate wallet address
        if (!isValidSolanaAddress(walletAddress)) {
            return NextResponse.json(
                { success: false, message: 'Invalid wallet address format' },
                { status: 400 }
            )
        }

        // Validate NFT mint address
        if (!isValidSolanaAddress(nftMintAddress)) {
            return NextResponse.json(
                { success: false, message: 'Invalid NFT mint address format' },
                { status: 400 }
            )
        }

        // Find user by external wallet address (just to verify user exists)
        const user = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress,
            },
            select: {
                id: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            )
        }

        // Derive internal wallet from signature
        const { deriveKeypairFromSignature, getDerivationSalt } = await import('@/lib/utils/keyDerivation.server')
        const salt = getDerivationSalt()
        const userKeypair = deriveKeypairFromSignature(signature, walletAddress, salt)
        const internalWalletAddress = userKeypair.publicKey.toBase58()

        // Normalize NFT mint address to Base58 format for database lookup
        // Ensure address is in correct format (handle both string and PublicKey)
        let normalizedNftMintAddress = nftMintAddress
        try {
            // Try to parse as PublicKey and convert to Base58 to ensure format consistency
            const nftPublicKey = new PublicKey(nftMintAddress)
            normalizedNftMintAddress = nftPublicKey.toBase58()
        } catch {
            // If not a valid PublicKey, assume it's already in Base58 format
            console.log('NFT mint address appears to be already normalized:', nftMintAddress)
        }

        console.log('Fetching ticket from database:', normalizedNftMintAddress)
        console.log('Original address:', nftMintAddress)
        console.log('For internal wallet:', internalWalletAddress)
        console.log('For external wallet:', walletAddress)

        // Find ticket in database by NFT mint address (using normalized address)
        const ticket = await prisma.ticket.findUnique({
            where: {
                nftMintAddress: normalizedNftMintAddress,
            },
            include: {
                event: {
                    include: {
                        category: true,
                        organizer: {
                            include: {
                                user: {
                                    select: {
                                        walletAddress: true,
                                    },
                                },
                            },
                        },
                    },
                },
                order: {
                    select: {
                        id: true,
                        totalPrice: true,
                        quantity: true,
                        status: true,
                        transactionHash: true,
                        createdAt: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        walletAddress: true,
                        internalWalletAddress: true,
                    },
                },
            },
        })

        if (!ticket) {
            // Ticket not found in DB - return error
            const allTickets = await prisma.ticket.findMany({
                where: {
                    user: {
                        OR: [
                            { walletAddress: walletAddress },
                            { internalWalletAddress: internalWalletAddress },
                        ],
                    },
                },
                select: {
                    nftMintAddress: true,
                    id: true,
                },
                take: 10,
            })

            console.log('Ticket not found in database. Available tickets for user:', allTickets.map(t => ({ id: t.id, nftMintAddress: t.nftMintAddress })))
            console.log('Normalized searched address:', normalizedNftMintAddress)

            return NextResponse.json(
                {
                    success: false,
                    message: `Ticket not found in database for NFT: ${normalizedNftMintAddress}`,
                    debug: {
                        searchedAddress: normalizedNftMintAddress,
                        originalAddress: nftMintAddress,
                        userWallet: walletAddress,
                        internalWallet: internalWalletAddress,
                        userTicketsCount: allTickets.length,
                    }
                },
                { status: 404 }
            )
        }

        console.log('Ticket found in database:', {
            ticketId: ticket.id,
            nftMintAddress: ticket.nftMintAddress,
            userId: ticket.userId,
            userWallet: ticket.user.walletAddress,
            userInternalWallet: ticket.user.internalWalletAddress,
        })

        // Verify ownership - check if ticket belongs to the user
        // Check both external wallet and internal wallet
        const isOwner = ticket.user.walletAddress === walletAddress ||
            ticket.user.internalWalletAddress === internalWalletAddress

        if (!isOwner) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized: You do not own this ticket' },
                { status: 403 }
            )
        }

        console.log('Ticket ownership verified. Ticket owner:', ticket.user.walletAddress)

        // Check if ticket is on resale (use normalized address)
        const listing = await prisma.listing.findUnique({
            where: {
                nftMintAddress: normalizedNftMintAddress,
            },
        })

        // Determine status
        const now = new Date()
        const eventDate = new Date(ticket.event.date)
        const isPastEvent = eventDate < now
        const isOnResale = !!listing && listing.status === 'active'

        let status: 'bought' | 'on_resale' | 'passed' | 'nft' = 'bought'
        if (isOnResale) {
            status = 'on_resale'
        } else if (isPastEvent) {
            status = 'passed'
        } else {
            status = 'bought'
        }

        // Calculate price per ticket
        // If order.totalPrice is 0 or invalid, fall back to event price
        let pricePerTicket = ticket.event.price
        if (ticket.order.totalPrice > 0 && ticket.order.quantity > 0) {
            pricePerTicket = ticket.order.totalPrice / ticket.order.quantity
        }

        const marketPrice = listing ? listing.price : ticket.event.price

        // Format response
        const response = {
            success: true,
            ticket: {
                id: ticket.id,
                nftMintAddress: ticket.nftMintAddress,
                tokenId: ticket.tokenId,
                metadataUri: ticket.metadataUri,
                isValid: ticket.isValid,
                isUsed: ticket.isUsed,
                status: status,
                createdAt: ticket.createdAt.toISOString(),
                price: pricePerTicket,
                originalPrice: ticket.event.price,
                marketPrice: marketPrice,
                // Event information
                event: {
                    id: ticket.event.id,
                    title: ticket.event.title,
                    description: ticket.event.description,
                    imageUrl: ticket.event.imageUrl,
                    date: ticket.event.date.toISOString().split('T')[0],
                    time: ticket.event.time,
                    fullAddress: ticket.event.fullAddress,
                    category: ticket.event.category.name,
                    organizer: ticket.event.organizer ? {
                        name: ticket.event.organizer.companyName,
                        walletAddress: ticket.event.organizer.user.walletAddress,
                    } : null,
                },
                // Order information
                order: {
                    id: ticket.order.id,
                    totalPrice: ticket.order.totalPrice,
                    quantity: ticket.order.quantity,
                    status: ticket.order.status,
                    transactionHash: ticket.order.transactionHash,
                    createdAt: ticket.order.createdAt.toISOString(),
                },
                // Listing information (if on resale)
                listing: listing ? {
                    id: listing.id,
                    price: listing.price,
                    originalPrice: listing.originalPrice,
                    listingAddress: listing.listingAddress,
                    auctionHouseAddress: listing.auctionHouseAddress,
                    status: listing.status,
                    createdAt: listing.createdAt.toISOString(),
                } : null,
            },
        }

        return NextResponse.json(response)
    } catch (error: unknown) {
        console.error('Error fetching ticket details:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch ticket details',
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        )
    }
}
