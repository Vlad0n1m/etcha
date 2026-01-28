import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PublicKey } from "@solana/web3.js"
import nacl from "tweetnacl"
import bs58 from "bs58"

export async function POST(request: NextRequest) {
    try {
        // Get current session
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized. Please sign in." },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { walletAddress, signature, message } = body

        // Validate input
        if (!walletAddress || !signature || !message) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Verify wallet address is valid
        let publicKey: PublicKey
        try {
            publicKey = new PublicKey(walletAddress)
        } catch {
            return NextResponse.json(
                { error: "Invalid wallet address" },
                { status: 400 }
            )
        }

        // Verify message contains the correct user ID
        if (!message.includes(session.user.id)) {
            return NextResponse.json(
                { error: "Invalid message: user ID mismatch" },
                { status: 400 }
            )
        }

        // Verify signature
        try {
            const messageBytes = new TextEncoder().encode(message)
            const signatureBytes = bs58.decode(signature)
            const publicKeyBytes = publicKey.toBytes()

            const isValid = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKeyBytes
            )

            if (!isValid) {
                return NextResponse.json(
                    { error: "Invalid signature" },
                    { status: 400 }
                )
            }
        } catch (err) {
            console.error("Signature verification error:", err)
            return NextResponse.json(
                { error: "Failed to verify signature" },
                { status: 400 }
            )
        }

        // Check if wallet is already linked to another account
        const existingUser = await prisma.user.findUnique({
            where: { walletAddress },
        })

        if (existingUser && existingUser.id !== session.user.id) {
            return NextResponse.json(
                { error: "This wallet is already linked to another account" },
                { status: 400 }
            )
        }

        // Link wallet to user
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                walletAddress,
                walletLinkedAt: new Date(),
            },
            select: {
                id: true,
                email: true,
                walletAddress: true,
                walletLinkedAt: true,
            },
        })

        return NextResponse.json({
            success: true,
            user: updatedUser,
            message: "Wallet linked successfully",
        })
    } catch (error) {
        console.error("Wallet link error:", error)
        return NextResponse.json(
            { error: "Failed to link wallet" },
            { status: 500 }
        )
    }
}
