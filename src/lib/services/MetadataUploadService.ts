/**
 * Metadata Upload Service
 * Handles uploading images and JSON metadata to Arweave via Irys (formerly Bundlr)
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
import { createGenericFile } from '@metaplex-foundation/umi'
import { Umi } from '@metaplex-foundation/umi'
import { NFTMetadataOutput } from '../utils/nft-metadata'

/**
 * Initialize UMI with Irys uploader
 */
export function initializeUmi(): Umi {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'

    const umi = createUmi(rpcUrl)
        .use(irysUploader())

    return umi
}

/**
 * Upload an image buffer to Arweave
 * @param imageBuffer - Buffer containing image data
 * @param fileName - Original file name
 * @returns Arweave URI (e.g., "https://arweave.net/...")
 */
export async function uploadImage(
    umi: Umi,
    imageBuffer: Buffer,
    fileName: string
): Promise<string> {
    try {
        // Detect content type from file extension
        const contentType = getContentType(fileName)

        // Create generic file for UMI
        const file = createGenericFile(imageBuffer, fileName, {
            contentType,
        })

        // Upload to Arweave via Irys
        const [uri] = await umi.uploader.upload([file])

        console.log(`Image uploaded successfully: ${uri}`)
        return uri
    } catch (error) {
        console.error('Failed to upload image:', error)
        throw new Error(`Image upload failed: ${error}`)
    }
}

/**
 * Upload JSON metadata to Arweave
 * @param metadata - JSON object to upload
 * @returns Arweave URI
 */
export async function uploadMetadata(
    umi: Umi,
    metadata: object
): Promise<string> {
    try {
        const uri = await umi.uploader.uploadJson(metadata)
        console.log(`Metadata uploaded successfully: ${uri}`)
        return uri
    } catch (error) {
        console.error('Failed to upload metadata:', error)
        throw new Error(`Metadata upload failed: ${error}`)
    }
}

/**
 * Upload collection image and metadata
 * @returns Object containing image URI and metadata URI
 */
export async function uploadCollectionAssets(
    umi: Umi,
    imageBuffer: Buffer,
    imageName: string,
    collectionMetadata: Omit<NFTMetadataOutput, 'attributes'>
): Promise<{
    imageUri: string
    metadataUri: string
}> {
    try {
        // Upload image first
        const imageUri = await uploadImage(umi, imageBuffer, imageName)

        // Create metadata with image URI
        const metadata = {
            ...collectionMetadata,
            image: imageUri,
        }

        // Upload metadata
        const metadataUri = await uploadMetadata(umi, metadata)

        return {
            imageUri,
            metadataUri,
        }
    } catch (error) {
        console.error('Failed to upload collection assets:', error)
        throw new Error(`Collection assets upload failed: ${error}`)
    }
}

/**
 * Upload all ticket metadata for a collection
 * This uploads only the JSON metadata, assuming images are already uploaded
 * @param ticketMetadataArray - Array of ticket metadata
 * @returns Array of metadata URIs in the same order
 */
export async function uploadAllTicketMetadata(
    umi: Umi,
    ticketMetadataArray: NFTMetadataOutput[]
): Promise<string[]> {
    try {
        console.log(`Uploading ${ticketMetadataArray.length} ticket metadata...`)

        const uris: string[] = []

        // Upload metadata sequentially to avoid rate limits
        for (let i = 0; i < ticketMetadataArray.length; i++) {
            const metadata = ticketMetadataArray[i]
            const uri = await uploadMetadata(umi, metadata)
            uris.push(uri)

            // Log progress every 10 tickets
            if ((i + 1) % 10 === 0) {
                console.log(`Uploaded ${i + 1}/${ticketMetadataArray.length} metadata`)
            }
        }

        console.log(`All ${ticketMetadataArray.length} ticket metadata uploaded successfully`)
        return uris
    } catch (error) {
        console.error('Failed to upload ticket metadata:', error)
        throw new Error(`Ticket metadata upload failed: ${error}`)
    }
}

/**
 * Upload ticket metadata in batches for better performance
 * @param batchSize - Number of metadata to upload in parallel (default: 5)
 */
export async function uploadTicketMetadataBatched(
    umi: Umi,
    ticketMetadataArray: NFTMetadataOutput[],
    batchSize: number = 5
): Promise<string[]> {
    try {
        console.log(`Uploading ${ticketMetadataArray.length} ticket metadata in batches of ${batchSize}...`)

        const uris: string[] = []

        // Process in batches
        for (let i = 0; i < ticketMetadataArray.length; i += batchSize) {
            const batch = ticketMetadataArray.slice(i, i + batchSize)

            // Upload batch in parallel
            const batchUris = await Promise.all(
                batch.map(metadata => uploadMetadata(umi, metadata))
            )

            uris.push(...batchUris)

            console.log(`Uploaded ${Math.min(i + batchSize, ticketMetadataArray.length)}/${ticketMetadataArray.length} metadata`)

            // Small delay between batches to avoid rate limits
            if (i + batchSize < ticketMetadataArray.length) {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        console.log(`All ${ticketMetadataArray.length} ticket metadata uploaded successfully`)
        return uris
    } catch (error) {
        console.error('Failed to upload ticket metadata in batches:', error)
        throw new Error(`Batched ticket metadata upload failed: ${error}`)
    }
}

/**
 * Get content type from file extension
 */
function getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()

    const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
    }

    return contentTypes[extension || ''] || 'application/octet-stream'
}

/**
 * Convert base64 string to Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    return Buffer.from(base64Data, 'base64')
}

