import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import jwt from "jsonwebtoken";
import { auth } from "@/lib/auth";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/feed/upload
 * Upload an image for a feed post
 */
export async function POST(request: NextRequest) {
  try {
    let isAuthenticated = false;

    // Try NextAuth session first
    const session = await auth();
    if (session?.user?.id) {
      isAuthenticated = true;
    }

    // Fallback to JWT token (wallet auth)
    if (!isAuthenticated) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
          isAuthenticated = true;
        } catch {
          // Invalid token
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Allow image types
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only JPG, PNG, WebP, GIF, and HEIC images are allowed",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResponse = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "etcha-feed",
            resource_type: "image",
            transformation: [
              {
                width: 1200,
                height: 1200,
                crop: "limit",
                quality: "auto:good",
                fetch_format: "auto",
              },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error("No result from Cloudinary"));
          }
        );

        uploadStream.end(buffer);
      }
    );

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}
