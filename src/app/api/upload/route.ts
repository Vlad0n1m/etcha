import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from 'cloudinary'
import sharp from 'sharp'

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

        // Check file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: "Only JPG, PNG, and WebP images are allowed" },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Process image with sharp: resize to 1200x1200 max, convert to JPEG, optimize
        const processedImage = await sharp(buffer)
            .resize(1200, 1200, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer()

        // Upload to Cloudinary
        const uploadResponse = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'etcha-events',
                    resource_type: 'image',
                    format: 'jpg',
                },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            )

            uploadStream.end(processedImage)
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

