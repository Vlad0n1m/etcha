import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 client singleton
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return s3Client;
}

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "etcha-uploads";
const CLOUDFRONT_URL = process.env.AWS_CLOUDFRONT_URL; // Optional CDN URL

/**
 * Generate a presigned URL for uploading a file to S3
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a unique key for an uploaded file
 */
export function generateUploadKey(
  userId: string,
  filename: string,
  folder: string = "posts"
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const ext = filename.split(".").pop() || "jpg";
  const sanitizedFilename = `${timestamp}-${randomId}.${ext}`;
  return `${folder}/${userId}/${sanitizedFilename}`;
}

/**
 * Get the public URL for an uploaded file
 */
export function getPublicUrl(key: string): string {
  if (CLOUDFRONT_URL) {
    return `${CLOUDFRONT_URL}/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await client.send(command);
}

/**
 * Extract the S3 key from a full URL
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Handle CloudFront URL
    if (CLOUDFRONT_URL && url.startsWith(CLOUDFRONT_URL)) {
      return urlObj.pathname.substring(1); // Remove leading slash
    }
    // Handle S3 URL
    if (urlObj.hostname.includes("s3")) {
      return urlObj.pathname.substring(1); // Remove leading slash
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate file type for upload
 */
export function isValidImageType(contentType: string): boolean {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  return validTypes.includes(contentType);
}

/**
 * Maximum file size (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
