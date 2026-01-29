import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getPlatformTreeService } from "@/lib/solana/PlatformTreeService"

/**
 * GET /api/admin/platform-trees
 * 
 * Get platform Merkle tree statistics
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { success: false, message: "Admin access required" },
                { status: 403 }
            )
        }

        const platformTreeService = getPlatformTreeService()
        const stats = await platformTreeService.getTreeStats()

        // Get all trees with details
        const trees = await prisma.platformMerkleTree.findMany({
            orderBy: [
                { type: 'asc' },
                { createdAt: 'desc' },
            ],
        })

        return NextResponse.json({
            success: true,
            stats,
            trees: trees.map(tree => ({
                id: tree.id,
                address: tree.address,
                type: tree.type,
                maxDepth: tree.maxDepth,
                capacity: tree.capacity,
                minted: tree.minted,
                available: tree.capacity - tree.minted,
                usagePercent: Math.round((tree.minted / tree.capacity) * 100),
                isActive: tree.isActive,
                collectionAddress: tree.collectionAddress,
                createdAt: tree.createdAt,
            })),
        })
    } catch (error) {
        console.error("Error fetching platform trees:", error)
        return NextResponse.json(
            { success: false, message: "Failed to fetch platform trees" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/admin/platform-trees
 * 
 * Initialize or create new platform Merkle trees
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { success: false, message: "Admin access required" },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { action } = body

        const platformTreeService = getPlatformTreeService()

        if (action === "initialize") {
            // Initialize platform trees if not already done
            console.log("Initializing platform Merkle trees...")
            await platformTreeService.initializeIfNeeded()

            const stats = await platformTreeService.getTreeStats()

            return NextResponse.json({
                success: true,
                message: "Platform trees initialized",
                stats,
            })
        }

        if (action === "create_ticket_tree") {
            console.log("Creating new ticket Merkle tree...")
            const tree = await platformTreeService.getActiveTree('ticket')

            return NextResponse.json({
                success: true,
                message: "Ticket tree ready",
                tree: {
                    id: tree.id,
                    address: tree.address,
                    capacity: tree.capacity,
                    available: tree.available,
                },
            })
        }

        if (action === "create_poap_tree") {
            console.log("Creating new POAP Merkle tree...")
            const tree = await platformTreeService.getActiveTree('poap')

            return NextResponse.json({
                success: true,
                message: "POAP tree ready",
                tree: {
                    id: tree.id,
                    address: tree.address,
                    capacity: tree.capacity,
                    available: tree.available,
                },
            })
        }

        return NextResponse.json(
            { success: false, message: "Invalid action. Use: initialize, create_ticket_tree, create_poap_tree" },
            { status: 400 }
        )
    } catch (error) {
        console.error("Error managing platform trees:", error)
        return NextResponse.json(
            { success: false, message: `Failed: ${(error as Error).message}` },
            { status: 500 }
        )
    }
}
