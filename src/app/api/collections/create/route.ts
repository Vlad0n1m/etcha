import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import {
    createCollection,
    createCandyMachineV3,
    initializeUmiWithSigner,
} from '@/lib/services/CandyMachineService'
import {
    uploadCollectionAssets,
    uploadTicketMetadataBatched,
    uploadMetadata,
    base64ToBuffer,
} from '@/lib/services/MetadataUploadService'
import {
    createCollectionMetadata,
    generateAllTicketMetadata,
    NFTMetadataInput,
} from '@/lib/utils/nft-metadata'
import { loadCandyMachineAuthority, isValidSolanaAddress } from '@/lib/utils/wallet'

const prisma = new PrismaClient()

/**
 * POST /api/collections/create
 * 
 * Create NFT collection and Candy Machine for an event
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        const {
            eventId,
            organizerWallet,
            totalSupply,
            priceInSol,
            metadata,
        } = body

        if (!eventId || !organizerWallet || !totalSupply || !priceInSol || !metadata) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate organizer wallet address
        if (!isValidSolanaAddress(organizerWallet)) {
            return NextResponse.json(
                { success: false, message: 'Invalid organizer wallet address' },
                { status: 400 }
            )
        }

        // Validate metadata
        const {
            name,
            symbol,
            description,
            image, // base64 or URL
            eventDate,
            eventTime,
            location,
            category,
            organizer,
        } = metadata

        if (!name || !symbol || !description || !image || !eventDate || !eventTime || !location || !category || !organizer) {
            return NextResponse.json(
                { success: false, message: 'Missing required metadata fields' },
                { status: 400 }
            )
        }

        // Check if event exists
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizer: true,
                category: true,
            },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, message: 'Event not found' },
                { status: 404 }
            )
        }

        // Check if event already has a collection
        if (event.collectionNftAddress || event.candyMachineAddress) {
            return NextResponse.json(
                { success: false, message: 'Event already has a collection' },
                { status: 400 }
            )
        }

        console.log(`Creating collection for event: ${eventId}`)

        // Load authority
        const authority = loadCandyMachineAuthority()

        // Step 1: Save collection image and metadata locally
        console.log('Step 1: Saving collection assets...')

        let imageUri: string

        // Check if image is already a URL (uploaded file)
        if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) {
            // Image is already a URL, use it directly
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
            imageUri = image.startsWith('/') ? `${baseUrl}${image}` : image
            console.log('Using existing image URL:', imageUri)
        } else {
            // Image is base64, need to save it
            const imageBuffer = image.startsWith('data:')
                ? base64ToBuffer(image)
                : Buffer.from(image, 'base64')

            const { imageUri: uploadedImageUri } = await uploadCollectionAssets(
                imageBuffer,
                `${symbol.toLowerCase()}-collection.png`,
                { name, symbol, description } as any
            )
            imageUri = uploadedImageUri
        }

        const collectionMetadata = createCollectionMetadata({
            name,
            symbol,
            description,
            image: imageUri,
            organizerWallet,
        })

        // Upload metadata JSON
        const metadataUri = await uploadMetadata(collectionMetadata)

        console.log('Collection assets uploaded:', { imageUri, metadataUri })

        // Step 2: Create NFT Collection
        console.log('Step 2: Creating NFT collection...')
        const { collectionAddress, signature: collectionSignature } = await createCollection({
            name,
            symbol,
            uri: metadataUri,
            authority,
        })

        console.log('Collection created:', collectionAddress)

        // Step 3: Generate and upload all ticket metadata
        console.log('Step 3: Generating ticket metadata...')
        const baseTicketInput: Omit<NFTMetadataInput, 'ticketNumber'> = {
            eventName: name,
            eventDescription: description,
            eventImage: imageUri,
            eventDate,
            eventTime,
            location,
            category,
            organizerName: organizer.name,
            organizerAvatar: organizer.avatar,
            organizerDescription: organizer.description,
            organizerWallet,
        }

        const allTicketMetadata = generateAllTicketMetadata(baseTicketInput, totalSupply)

        console.log('Saving ticket metadata...')
        const ticketMetadataUris = await uploadTicketMetadataBatched(allTicketMetadata, 5)

        console.log(`Uploaded ${ticketMetadataUris.length} ticket metadata`)

        // Step 4: Create Candy Machine V3
        console.log('Step 4: Creating Candy Machine V3...')
        const items = ticketMetadataUris.map((uri, index) => ({
            name: `${name} - Ticket #${index + 1}`,
            uri,
        }))

        const platformWallet = process.env.PLATFORM_WALLET_PUBLIC_KEY || authority.publicKey.toBase58()

        const { candyMachineAddress, signature: candyMachineSignature } = await createCandyMachineV3({
            collectionAddress,
            itemsAvailable: totalSupply,
            priceInSol,
            sellerFeeBasisPoints: 0, // No royalties on initial sale (we handle split via payment distribution)
            platformWallet,
            authority,
            items,
        })

        console.log('Candy Machine created:', candyMachineAddress)

        // Step 5: Update event in database
        console.log('Step 5: Updating event in database...')
        await prisma.event.update({
            where: { id: eventId },
            data: {
                collectionNftAddress: collectionAddress,
                candyMachineAddress,
            },
        })

        console.log('Event updated successfully')

        return NextResponse.json({
            success: true,
            collectionAddress,
            candyMachineAddress,
            collectionSignature,
            candyMachineSignature,
            message: 'Collection and Candy Machine created successfully',
        })
    } catch (error: any) {
        console.error('Error creating collection:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to create collection',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

