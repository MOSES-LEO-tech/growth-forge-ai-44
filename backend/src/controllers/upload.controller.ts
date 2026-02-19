import { Request, Response } from 'express';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';
import { ApiResponse } from '../utils/api.response';

export const uploadFile = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return ApiResponse.error(res, 'No file uploaded', 400);
        }

        const file = req.file;
        console.log(`Processing single file upload: ${file.originalname}`);
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        // Build correct URL based on where multer stored the file (images/ or videos/ subdirectory)
        const subDir = isImage ? 'images' : isVideo ? 'videos' : '';
        const fileUrl = subDir ? `/uploads/${subDir}/${file.filename}` : `/uploads/${file.filename}`;

        let thumbnailUrl = null;

        // Generate thumbnail for images
        if (isImage) {
            try {
                const thumbnailsDir = path.join(__dirname, '../../uploads/thumbnails');
                // Ensure thumbnails directory exists
                if (!fs.existsSync(thumbnailsDir)) {
                    fs.mkdirSync(thumbnailsDir, { recursive: true });
                }

                const thumbnailFilename = `thumb_${file.filename}`;
                const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

                await sharp(file.path)
                    .resize(300, 300, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .jpeg({ quality: 80 })
                    .toFile(thumbnailPath);

                thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
            } catch (error) {
                console.error('Thumbnail generation failed:', error);
                // Continue without thumbnail
            }
        }

        return ApiResponse.success(res, {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            url: fileUrl,
            thumbnailUrl: thumbnailUrl
        }, 'File uploaded successfully');
    } catch (error: any) {
        console.error('Upload error:', error);
        return ApiResponse.error(res, 'File upload failed', 500, error);
    }
};

export const uploadMultipleFiles = async (req: Request, res: Response) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return ApiResponse.error(res, 'No files uploaded', 400);
        }

        const files = req.files as Express.Multer.File[];
        console.log(`Processing multiple files upload: ${files.length} files`);
        const uploadedFiles = [];

        for (const file of files) {
            const isImage = file.mimetype.startsWith('image/');
            const isVideo = file.mimetype.startsWith('video/');
            const subDir = isImage ? 'images' : isVideo ? 'videos' : '';
            const fileUrl = subDir ? `/uploads/${subDir}/${file.filename}` : `/uploads/${file.filename}`;
            let thumbnailUrl = null;

            // Generate thumbnail for images
            if (isImage) {
                try {
                    const thumbnailsDir = path.join(__dirname, '../../uploads/thumbnails');
                    // Ensure thumbnails directory exists
                    if (!fs.existsSync(thumbnailsDir)) {
                        fs.mkdirSync(thumbnailsDir, { recursive: true });
                    }

                    const thumbnailFilename = `thumb_${file.filename}`;
                    const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

                    await sharp(file.path)
                        .resize(300, 300, {
                            fit: 'cover',
                            position: 'center'
                        })
                        .jpeg({ quality: 80 })
                        .toFile(thumbnailPath);

                    thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
                } catch (error) {
                    console.error('Thumbnail generation failed:', error);
                }
            }

            uploadedFiles.push({
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                url: fileUrl,
                thumbnailUrl: thumbnailUrl
            });
        }

        return ApiResponse.success(res, uploadedFiles, 'Files uploaded successfully');
    } catch (error: any) {
        console.error('Upload error:', error);
        return ApiResponse.error(res, 'File upload failed', 500, error);
    }
};

export const deleteFile = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        if (!filename) {
            return ApiResponse.error(res, 'Filename is required', 400);
        }

        console.log(`Deleting file: ${filename}`);

        // Sanitize filename to prevent directory traversal
        const sanitizedFilename = path.basename(filename);

        // Check in images and videos directories
        const imagePath = path.join(__dirname, '../../uploads/images', sanitizedFilename);
        const videoPath = path.join(__dirname, '../../uploads/videos', sanitizedFilename);
        const thumbnailPath = path.join(__dirname, '../../uploads/thumbnails', `thumb_${sanitizedFilename}`);

        let deleted = false;

        // Try to delete from images
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            deleted = true;

            // Delete thumbnail if exists
            if (fs.existsSync(thumbnailPath)) {
                fs.unlinkSync(thumbnailPath);
            }
        }

        // Try to delete from videos
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
            deleted = true;
        }

        if (deleted) {
            return ApiResponse.success(res, null, 'File deleted successfully');
        } else {
            return ApiResponse.error(res, 'File not found', 404);
        }
    } catch (error: any) {
        console.error('Delete error:', error);
        return ApiResponse.error(res, 'File deletion failed', 500, error);
    }
};
