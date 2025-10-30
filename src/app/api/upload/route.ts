import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 })
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, message: "File size must be less than 10MB" },
                { status: 400 }
            )
        }

        // Allow more image types including HEIC/HEIF (Apple formats)
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: "Only JPG, PNG, WebP, and HEIC images are allowed" },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to Cloudinary with automatic optimization and transformation
        // Cloudinary will handle HEIC/HEIF and all other formats natively
        const uploadResponse = await new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'etcha-events',
                    resource_type: 'image',
                    transformation: [
                        {
                            width: 1200,
                            height: 1200,
                            crop: 'limit',
                            quality: 'auto:good',
                            fetch_format: 'auto', // Automatically serve best format (WebP, AVIF, etc.)
                        }
                    ],
                },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            )

            uploadStream.end(buffer)
        })

        return NextResponse.json({
            success: true,
            url: uploadResponse.secure_url,
            filename: uploadResponse.public_id,
        })
    } catch (error) {
        console.error("Error uploading file:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to upload file",
            },
            { status: 500 }
        )
    }
}

