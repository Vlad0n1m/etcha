import { NextRequest, NextResponse } from "next/server"
import { PKPass } from "passkit-generator"
import path from "path"
import fs from "fs"

// Generate a demo Apple Wallet pass for testing
export async function GET(request: NextRequest) {
    try {
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
            return NextResponse.json({
                success: false,
                message: "Apple Wallet is not configured. Please set up Apple Developer certificates.",
                missingCerts: true,
                paths: {
                    wwdr: fs.existsSync(wwdrPath),
                    signerCert: fs.existsSync(signerCertPath),
                    signerKey: fs.existsSync(signerKeyPath),
                    passModel: fs.existsSync(passModelPath),
                }
            }, { status: 501 })
        }

        const passphrase = process.env.APPLE_WALLET_PASSPHRASE || ""

        // Demo event data
        const demoEvent = {
            title: "Etcha Demo Event",
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            time: "19:00",
            location: "Demo Venue, San Francisco",
            organizer: "Etcha Team",
        }

        const formattedDate = demoEvent.date.toLocaleDateString("en-US", {
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
            serialNumber: `demo-${Date.now()}`,
            description: `Ticket for ${demoEvent.title}`,
            organizationName: demoEvent.organizer,
            teamIdentifier: process.env.APPLE_TEAM_ID || "",
            passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || "",
        })

        // Set pass type to eventTicket
        pass.type = "eventTicket"

        // Set header fields
        pass.headerFields.push({
            key: "event",
            label: "EVENT",
            value: demoEvent.title,
        })

        // Set primary fields
        pass.primaryFields.push({
            key: "eventName",
            label: "EVENT",
            value: demoEvent.title,
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
                value: demoEvent.time,
            }
        )

        // Set auxiliary fields
        pass.auxiliaryFields.push(
            {
                key: "location",
                label: "LOCATION",
                value: demoEvent.location,
            },
            {
                key: "ticketNumber",
                label: "TICKET #",
                value: "#DEMO001",
            }
        )

        // Set back fields
        pass.backFields.push(
            {
                key: "info",
                label: "DEMO TICKET",
                value: "This is a demo ticket to test Apple Wallet integration. It is not valid for any real event.",
            },
            {
                key: "platform",
                label: "PLATFORM",
                value: "Etcha - NFT Ticketing Platform",
            }
        )

        // Set barcode
        pass.setBarcodes({
            format: "PKBarcodeFormatQR",
            message: JSON.stringify({
                ticketId: "demo",
                type: "demo-ticket",
                timestamp: Date.now(),
            }),
            messageEncoding: "iso-8859-1",
        })

        // Set relevant date
        pass.setRelevantDate(demoEvent.date)

        // Generate the pass buffer
        const passBuffer = pass.getAsBuffer()

        // Return the pass file
        return new NextResponse(new Uint8Array(passBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.apple.pkpass",
                "Content-Disposition": `attachment; filename="etcha-demo-ticket.pkpass"`,
            },
        })
    } catch (error) {
        console.error("Error generating demo Apple Wallet pass:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to generate pass"
            },
            { status: 500 }
        )
    }
}
