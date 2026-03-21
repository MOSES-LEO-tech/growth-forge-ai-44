import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// S3 client configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'growth-forge-uploads';
const CDN_URL = process.env.CDN_URL; // Optional CDN front

export type UploadType = 'images' | 'videos' | 'documents' | 'thumbnails';

const contentTypeMap: Record<UploadType, string[]> = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    videos: ['video/mp4', 'video/webm', 'video/quicktime'],
    documents: ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    thumbnails: ['image/jpeg', 'image/png', 'image/webp'],
};

export interface UploadResult {
    url: string;
    key: string;
    thumbnailUrl?: string;
}

export interface S3Config {
    bucket: string;
    region: string;
    cdnUrl?: string;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
    fileBuffer: Buffer,
    key: string,
    contentType: string,
    metadata?: Record<string, string>
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000',
        ...(metadata && { Metadata: metadata }),
    });

    await s3Client.send(command);

    if (CDN_URL) {
        return `${CDN_URL}/${key}`;
    }
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    await s3Client.send(command);
}

/**
 * Generate a presigned URL for direct upload
 */
export async function generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for download
 */
export async function generatePresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Validate file type for upload
 */
export function validateFileType(
    contentType: string,
    uploadType: UploadType
): boolean {
    const allowedTypes = contentTypeMap[uploadType] || [];
    return allowedTypes.includes(contentType);
}

/**
 * Generate a unique S3 key for an uploaded file
 */
export function generateS3Key(
    userId: number,
    uploadType: UploadType,
    originalFilename: string
): string {
    const extension = originalFilename.split('.').pop() || 'bin';
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    return `uploads/${uploadType}/${userId}/${timestamp}-${uniqueId}.${extension}`;
}

/**
 * Process and upload an image (with optional thumbnail generation)
 * Note: Thumbnail generation requires sharp or similar library
 */
export async function uploadImage(
    fileBuffer: Buffer,
    userId: number,
    originalFilename: string,
    contentType: string
): Promise<UploadResult> {
    if (!validateFileType(contentType, 'images')) {
        throw new Error('Invalid image file type');
    }

    const key = generateS3Key(userId, 'images', originalFilename);
    const url = await uploadToS3(fileBuffer, key, contentType);

    return {
        url,
        key,
    };
}

/**
 * Process and upload a video
 */
export async function uploadVideo(
    fileBuffer: Buffer,
    userId: number,
    originalFilename: string,
    contentType: string
): Promise<UploadResult> {
    if (!validateFileType(contentType, 'videos')) {
        throw new Error('Invalid video file type');
    }

    const key = generateS3Key(userId, 'videos', originalFilename);
    const url = await uploadToS3(fileBuffer, key, contentType);

    return {
        url,
        key,
    };
}

/**
 * Process and upload a document
 */
export async function uploadDocument(
    fileBuffer: Buffer,
    userId: number,
    originalFilename: string,
    contentType: string
): Promise<UploadResult> {
    if (!validateFileType(contentType, 'documents')) {
        throw new Error('Invalid document file type');
    }

    const key = generateS3Key(userId, 'documents', originalFilename);
    const url = await uploadToS3(fileBuffer, key, contentType);

    return {
        url,
        key,
    };
}

/**
 * Get S3 configuration
 */
export function getS3Config(): S3Config {
    return {
        bucket: BUCKET_NAME,
        region: process.env.AWS_REGION || 'us-east-1',
        cdnUrl: CDN_URL,
    };
}

/**
 * Check if S3 is properly configured
 */
export function isS3Configured(): boolean {
    return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.AWS_S3_BUCKET
    );
}
