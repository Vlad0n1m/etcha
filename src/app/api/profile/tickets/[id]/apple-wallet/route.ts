import { NextRequest, NextResponse } from "next/server"
import { PKPass } from "passkit-generator"
import { prisma } from "@/lib/db"
import path from "path"
import fs from "fs"
import { PublicKey } from "@solana/web3.js"

// Generate Apple Wallet pass for a ticket
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const nftMintAddress = resolvedParams.id // This is the NFT mint address from URL
        const body = await request.json()
        const { walletAddress } = body

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, message: "Wallet address required" },
                { status: 400 }
            )
        }

        // Normalize NFT mint address to Base58 format
        let normalizedNftMintAddress = nftMintAddress
        try {
            const nftPublicKey = new PublicKey(nftMintAddress)
            normalizedNftMintAddress = nftPublicKey.toBase58()
        } catch {
            // Already in correct format
        }

        // Fetch ticket with event details and user info
        const ticket = await prisma.ticket.findUnique({
            where: { nftMintAddress: normalizedNftMintAddress },
            include: {
                event: {
                    include: {
                        organizer: true,
                    },
                },
                user: {
                    select: {
                        walletAddress: true,
                        internalWalletAddress: true,
                    },
                },
            },
        })

        if (!ticket) {
            return NextResponse.json(
                { success: false, message: "Ticket not found" },
                { status: 404 }
            )
        }

        // Verify ownership - check if wallet matches user's external or internal wallet
        const isOwner = ticket.user.walletAddress === walletAddress ||
            ticket.user.internalWalletAddress === walletAddress

        if (!isOwner) {
            return NextResponse.json(
                { success: false, message: "You don't own this ticket" },
                { status: 403 }
            )
        }

        // Check if Apple Wallet certificates are configured
        const certsPath = process.env.APPLE_WALLET_CERTS_PATH || path.join(process.cwd(), "certs", "apple-wallet")
        const wwdrPath = path.join(certsPath, "wwdr.pem")
        const signerCertPath = path.join(certsPath, "signerCert.pem")
        const signerKeyPath = path.join(certsPath, "signerKey.pem")
        const passModelPath = path.join(process.cwd(), "pass-models", "eventTicket.pass")

        // Check if certificates exist
        const certsExist =
            fs.existsSync(wwdrPath) &&
            fs.existsSync(signerCertPath) &&
            fs.existsSync(signerKeyPath) &&
            fs.existsSync(passModelPath)

        if (!certsExist) {
            // Return a demo/placeholder response when certificates are not configured
            return NextResponse.json({
                success: false,
                message: "Apple Wallet is not configured. Please set up Apple Developer certificates.",
                missingCerts: true,
            }, { status: 501 })
        }

        const passphrase = process.env.APPLE_WALLET_PASSPHRASE || ""

        // Format date and time
        const eventDate = new Date(ticket.event.date)
        const formattedDate = eventDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })

        // Create the pass
        const pass = await PKPass.from({
            model: passModelPath,
            certificates: {
                wwdr: fs.readFileSync(wwdrPath),
                signerCert: fs.readFileSync(signerCertPath),
                signerKey: fs.readFileSync(signerKeyPath),
                signerKeyPassphrase: passphrase,
            },
        }, {
            serialNumber: ticket.id,
            description: `Ticket for ${ticket.event.title}`,
            organizationName: ticket.event.organizer?.companyName || "Etcha",
            teamIdentifier: process.env.APPLE_TEAM_ID || "",
            passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || "",
        })

        // Set pass type to eventTicket
        pass.type = "eventTicket"

        // Set header fields
        pass.headerFields.push({
            key: "event",
            label: "EVENT",
            value: ticket.event.title,
        })

        // Set primary fields
        pass.primaryFields.push({
            key: "eventName",
            label: "EVENT",
            value: ticket.event.title,
        })

        // Set secondary fields
        pass.secondaryFields.push(
            {
                key: "date",
                label: "DATE",
                value: formattedDate,
            },
            {
                key: "time",
                label: "TIME",
                value: ticket.event.time || "TBA",
            }
        )

        // Set auxiliary fields
        pass.auxiliaryFields.push(
            {
                key: "location",
                label: "LOCATION",
                value: ticket.event.fullAddress || "TBA",
            },
            {
                key: "ticketNumber",
                label: "TICKET #",
                value: `#${ticket.tokenId}`,
            }
        )

        // Set back fields (shown when pass is flipped)
        pass.backFields.push(
            {
                key: "nftAddress",
                label: "NFT ADDRESS",
                value: ticket.nftMintAddress,
            },
            {
                key: "ownerWallet",
                label: "OWNER WALLET",
                value: walletAddress,
            },
            {
                key: "terms",
                label: "TERMS & CONDITIONS",
                value: "This ticket is a blockchain-backed NFT. Present this pass at the event entrance for validation. The QR code contains your unique ticket identifier.",
            }
        )

        // Set barcode with ticket ID for scanning
        pass.setBarcodes({
            format: "PKBarcodeFormatQR",
            message: JSON.stringify({
                ticketId: ticket.id,
                nftAddress: ticket.nftMintAddress,
                eventId: ticket.eventId,
            }),
            messageEncoding: "iso-8859-1",
        })

        // Set relevant date for notification
        pass.setRelevantDate(eventDate)

        // Generate the pass buffer
        const passBuffer = pass.getAsBuffer()

        // Return the pass file
        return new NextResponse(new Uint8Array(passBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.apple.pkpass",
                "Content-Disposition": `attachment; filename="ticket-${ticket.id}.pkpass"`,
            },
        })
    } catch (error) {
        console.error("Error generating Apple Wallet pass:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to generate pass"
            },
            { status: 500 }
        )
    }
}
