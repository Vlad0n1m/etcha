import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { isValidSolanaAddress } from '@/lib/utils/wallet'

const prisma = new PrismaClient()

/**
 * POST /api/profile/tickets
 * Get all NFT tickets from database for the user
 * Body: { walletAddress: string, signature: string (hex) }
 * Returns tickets stored in database, not from blockchain
 */
export async function POST(request: NextRequest) {
    try {
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
            return NextResponse.json({
                success: true,
                tickets: [],
                message: 'User not found',
            })
        }

        // Always derive internal wallet from signature for verification
        const { deriveKeypairFromSignature, getDerivationSalt } = await import('@/lib/utils/keyDerivation.server')
        
        console.log('=== Profile Tickets Request ===')
        console.log('Signature format: string (hex)')
        console.log('Signature length (hex):', signature.length)
        console.log('Signature first 20 chars:', signature.substring(0, 20))
        console.log('Wallet address:', walletAddress)
        
        const salt = getDerivationSalt()
        console.log('Using salt (first 10 chars):', salt.substring(0, 10))
        
        const userKeypair = deriveKeypairFromSignature(signature, walletAddress, salt)
        const internalWalletAddress = userKeypair.publicKey.toBase58()

        console.log('Derived internal wallet from signature:', internalWalletAddress)
        console.log('=== End Profile Tickets Request ===')

        // Get tickets from database for this user
        console.log('Fetching tickets from database for user:', user.id)
        
        const tickets = await prisma.ticket.findMany({
            where: {
                userId: user.id,
            },
            include: {
                event: {
                    include: {
                        category: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                order: {
                    select: {
                        transactionHash: true,
                        createdAt: true,
                        totalPrice: true,
                        quantity: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        console.log(`Found ${tickets.length} tickets in database`)

        // Get all listings to check which tickets are on resale
        const allListings = await prisma.listing.findMany({
            where: {
                status: 'active',
            },
            select: {
                nftMintAddress: true,
                price: true,
                originalPrice: true,
            },
        })

        // Create a map of listings for quick lookup
        const listingsMap = new Map(
            allListings.map(listing => [listing.nftMintAddress, listing])
        )

        // Transform tickets to response format
        const now = new Date()
        const transformedTickets = tickets.map(ticket => {
            const listing = listingsMap.get(ticket.nftMintAddress)
            const eventDate = new Date(ticket.event.date)
            const isPastEvent = eventDate < now
            const isOnResale = !!listing

            // Determine status
            let status: 'bought' | 'on_resale' | 'passed' | 'nft' = 'bought'
            if (isOnResale) {
                status = 'on_resale'
            } else if (isPastEvent) {
                status = 'passed'
            } else {
                status = 'bought'
            }

            // Calculate price per ticket
            let pricePerTicket = ticket.event.price
            if (ticket.order.totalPrice > 0 && ticket.order.quantity > 0) {
                pricePerTicket = ticket.order.totalPrice / ticket.order.quantity
            }

            return {
                id: ticket.nftMintAddress, // Use NFT mint address as ID for URL links
                nftId: ticket.nftMintAddress,
                eventTitle: ticket.event.title,
                eventImage: ticket.event.imageUrl,
                date: ticket.event.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
                time: ticket.event.time,
                location: ticket.event.fullAddress,
                price: listing ? listing.price : pricePerTicket, // Current price (listing or calculated price)
                originalPrice: ticket.event.price,
                marketPrice: listing ? listing.price : pricePerTicket,
                status: status,
                tokenId: ticket.tokenId,
                isValid: ticket.isValid,
                isUsed: ticket.isUsed,
                createdAt: ticket.createdAt.toISOString(),
                transactionHash: ticket.order.transactionHash,
            }
        })

        // Sort by date (newest first) - already sorted by DB query, but double-check
        transformedTickets.sort((a, b) => {
            const dateA = new Date(a.date).getTime()
            const dateB = new Date(b.date).getTime()
            return dateB - dateA
        })

        return NextResponse.json({
            success: true,
            tickets: transformedTickets,
        })
    } catch (error: any) {
        console.error('Error fetching user tickets:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch tickets',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

