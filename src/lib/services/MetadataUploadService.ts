/**
 * Metadata Upload Service
 * Handles uploading images and JSON metadata to Cloudinary
 */

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import { NFTMetadataOutput } from '../utils/nft-metadata'

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload an image buffer to Cloudinary
 * @param imageBuffer - Buffer containing image data
 * @param fileName - Original file name (used for public_id)
 * @returns Cloudinary URL
 */
export async function uploadImage(
    imageBuffer: Buffer,
    fileName: string
): Promise<string> {
    try {
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 9)
        const baseName = fileName.replace(/\.[^/.]+$/, '') // Remove extension
        const publicId = `nft-${baseName}-${timestamp}-${randomString}`

        const uploadResponse = await new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'etcha-nft-images',
                    public_id: publicId,
                    resource_type: 'image',
                    transformation: [
                        {
                            width: 1200,
                            height: 1200,
                            crop: 'limit',
                            quality: 'auto:good',
                        }
                    ],
                },
                (error, result) => {
                    if (error) reject(error)
                    else if (result) resolve(result)
                    else reject(new Error('No result from Cloudinary'))
                }
            )
            uploadStream.end(imageBuffer)
        })

        console.log(`Image uploaded to Cloudinary: ${uploadResponse.secure_url}`)
        return uploadResponse.secure_url
    } catch (error) {
        console.error('Failed to upload image to Cloudinary:', error)
        throw new Error(`Image upload failed: ${error}`)
    }
}

/**
 * Upload JSON metadata to Cloudinary as a raw file
 * @param metadata - JSON object to upload
 * @returns Cloudinary URL for the JSON file
 */
export async function uploadMetadata(
    metadata: object
): Promise<string> {
    try {
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 9)
        const publicId = `metadata-${timestamp}-${randomString}`

        const jsonString = JSON.stringify(metadata, null, 2)
        const buffer = Buffer.from(jsonString, 'utf-8')

        const uploadResponse = await new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'etcha-nft-metadata',
                    public_id: publicId,
                    resource_type: 'raw',
                },
                (error, result) => {
                    if (error) reject(error)
                    else if (result) resolve(result)
                    else reject(new Error('No result from Cloudinary'))
                }
            )
            uploadStream.end(buffer)
        })

        console.log(`Metadata uploaded to Cloudinary: ${uploadResponse.secure_url}`)
        return uploadResponse.secure_url
    } catch (error) {
        console.error('Failed to upload metadata to Cloudinary:', error)
        throw new Error(`Metadata upload failed: ${error}`)
    }
}

/**
 * Upload collection image and metadata to Cloudinary
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
        // Upload image first
        const imageUri = await uploadImage(imageBuffer, imageName)

        // Create metadata with image URI
        const metadata = {
            ...collectionMetadata,
            image: imageUri,
        }

        // Upload metadata
        const metadataUri = await uploadMetadata(metadata)

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
 * Upload all ticket metadata to Cloudinary
 * This uploads only the JSON metadata, assuming images are already uploaded
 * @param ticketMetadataArray - Array of ticket metadata
 * @returns Array of metadata URIs in the same order
 */
export async function uploadAllTicketMetadata(
    ticketMetadataArray: NFTMetadataOutput[]
): Promise<string[]> {
    try {
        console.log(`Uploading ${ticketMetadataArray.length} ticket metadata to Cloudinary...`)

        const uris: string[] = []

        // Upload metadata sequentially to avoid rate limiting
        for (let i = 0; i < ticketMetadataArray.length; i++) {
            const metadata = ticketMetadataArray[i]
            const uri = await uploadMetadata(metadata)
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
    ticketMetadataArray: NFTMetadataOutput[],
    batchSize: number = 5
): Promise<string[]> {
    try {
        console.log(`Uploading ${ticketMetadataArray.length} ticket metadata to Cloudinary in batches of ${batchSize}...`)

        const uris: string[] = []

        // Process in batches
        for (let i = 0; i < ticketMetadataArray.length; i += batchSize) {
            const batch = ticketMetadataArray.slice(i, i + batchSize)

            // Upload batch in parallel
            const batchUris = await Promise.all(
                batch.map(metadata => uploadMetadata(metadata))
            )

            uris.push(...batchUris)

            console.log(`Uploaded ${Math.min(i + batchSize, ticketMetadataArray.length)}/${ticketMetadataArray.length} metadata`)

            // Small delay between batches to avoid rate limiting
            if (i + batchSize < ticketMetadataArray.length) {
                await new Promise(resolve => setTimeout(resolve, 200))
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
 * Convert base64 string to Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    return Buffer.from(base64Data, 'base64')
}

