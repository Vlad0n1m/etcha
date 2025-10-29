/**
 * Metadata Upload Service
 * Handles uploading images and JSON metadata locally (no Arweave)
 */

import { writeFile } from 'fs/promises'
import path from 'path'
import { NFTMetadataOutput } from '../utils/nft-metadata'

/**
 * Get base URL for the application
 */
function getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

/**
 * Save an image buffer locally
 * @param imageBuffer - Buffer containing image data
 * @param fileName - Original file name
 * @returns Local URI (e.g., "http://localhost:3000/uploads/...")
 */
export async function uploadImage(
    imageBuffer: Buffer,
    fileName: string
): Promise<string> {
    try {
        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 9)
        const extension = path.extname(fileName)
        const uniqueFileName = `nft-${timestamp}-${randomString}${extension}`

        // Save to public/uploads directory
        const uploadDir = path.join(process.cwd(), 'public', 'uploads')
        const filepath = path.join(uploadDir, uniqueFileName)

        await writeFile(filepath, imageBuffer)

        // Return public URL
        const uri = `${getBaseUrl()}/uploads/${uniqueFileName}`
        console.log(`Image saved locally: ${uri}`)
        return uri
    } catch (error) {
        console.error('Failed to save image:', error)
        throw new Error(`Image upload failed: ${error}`)
    }
}

/**
 * Save JSON metadata locally
 * @param metadata - JSON object to save
 * @returns Local URI
 */
export async function uploadMetadata(
    metadata: object
): Promise<string> {
    try {
        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 9)
        const fileName = `metadata-${timestamp}-${randomString}.json`

        // Save to public/uploads directory
        const uploadDir = path.join(process.cwd(), 'public', 'uploads')
        const filepath = path.join(uploadDir, fileName)

        await writeFile(filepath, JSON.stringify(metadata, null, 2))

        // Return public URL
        const uri = `${getBaseUrl()}/uploads/${fileName}`
        console.log(`Metadata saved locally: ${uri}`)
        return uri
    } catch (error) {
        console.error('Failed to save metadata:', error)
        throw new Error(`Metadata upload failed: ${error}`)
    }
}

/**
 * Save collection image and metadata locally
 * @returns Object containing image URI and metadata URI
 */
export async function uploadCollectionAssets(
    imageBuffer: Buffer,
    imageName: string,
    collectionMetadata: Omit<NFTMetadataOutput, 'attributes'>
): Promise<{
    imageUri: string
    metadataUri: string
}> {
    try {
        // Save image first
        const imageUri = await uploadImage(imageBuffer, imageName)

        // Create metadata with image URI
        const metadata = {
            ...collectionMetadata,
            image: imageUri,
        }

        // Save metadata
        const metadataUri = await uploadMetadata(metadata)

        return {
            imageUri,
            metadataUri,
        }
    } catch (error) {
        console.error('Failed to save collection assets:', error)
        throw new Error(`Collection assets upload failed: ${error}`)
    }
}

/**
 * Save all ticket metadata locally
 * This saves only the JSON metadata, assuming images are already uploaded
 * @param ticketMetadataArray - Array of ticket metadata
 * @returns Array of metadata URIs in the same order
 */
export async function uploadAllTicketMetadata(
    ticketMetadataArray: NFTMetadataOutput[]
): Promise<string[]> {
    try {
        console.log(`Saving ${ticketMetadataArray.length} ticket metadata...`)

        const uris: string[] = []

        // Save metadata sequentially
        for (let i = 0; i < ticketMetadataArray.length; i++) {
            const metadata = ticketMetadataArray[i]
            const uri = await uploadMetadata(metadata)
            uris.push(uri)

            // Log progress every 10 tickets
            if ((i + 1) % 10 === 0) {
                console.log(`Saved ${i + 1}/${ticketMetadataArray.length} metadata`)
            }
        }

        console.log(`All ${ticketMetadataArray.length} ticket metadata saved successfully`)
        return uris
    } catch (error) {
        console.error('Failed to save ticket metadata:', error)
        throw new Error(`Ticket metadata upload failed: ${error}`)
    }
}

/**
 * Save ticket metadata in batches for better performance
 * @param batchSize - Number of metadata to save in parallel (default: 5)
 */
export async function uploadTicketMetadataBatched(
    ticketMetadataArray: NFTMetadataOutput[],
    batchSize: number = 5
): Promise<string[]> {
    try {
        console.log(`Saving ${ticketMetadataArray.length} ticket metadata in batches of ${batchSize}...`)

        const uris: string[] = []

        // Process in batches
        for (let i = 0; i < ticketMetadataArray.length; i += batchSize) {
            const batch = ticketMetadataArray.slice(i, i + batchSize)

            // Save batch in parallel
            const batchUris = await Promise.all(
                batch.map(metadata => uploadMetadata(metadata))
            )

            uris.push(...batchUris)

            console.log(`Saved ${Math.min(i + batchSize, ticketMetadataArray.length)}/${ticketMetadataArray.length} metadata`)

            // Small delay between batches
            if (i + batchSize < ticketMetadataArray.length) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }

        console.log(`All ${ticketMetadataArray.length} ticket metadata saved successfully`)
        return uris
    } catch (error) {
        console.error('Failed to save ticket metadata in batches:', error)
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

