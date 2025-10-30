import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 })
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, message: "File size must be less than 5MB" },
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

        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 9)
        const extension = path.extname(file.name)
        const filename = `event-${timestamp}-${randomString}${extension}`

        // Save to public/uploads directory
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        const filepath = path.join(uploadDir, filename)

        await writeFile(filepath, buffer)

        // Return the public URL
        const url = `/uploads/${filename}`

        return NextResponse.json({
            success: true,
            url,
            filename,
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

