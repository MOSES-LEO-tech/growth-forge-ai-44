import { Request, Response } from 'express';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';

export const uploadFile = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const file = req.file;
        const fileUrl = `/uploads/${file.filename}`;
        const isImage = file.mimetype.startsWith('image/');

        let thumbnailUrl = null;

        // Generate thumbnail for images
        if (isImage) {
            try {
                const thumbnailsDir = path.join(__dirname, '../../uploads/thumbnails');
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

        res.status(200).json({
            message: 'File uploaded successfully',
            file: {
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                url: fileUrl,
                thumbnailUrl: thumbnailUrl
            }
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'File upload failed', error: error.message });
    }
};

export const uploadMultipleFiles = async (req: Request, res: Response) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const files = req.files as Express.Multer.File[];
        const uploadedFiles = [];

        for (const file of files) {
            const fileUrl = `/uploads/${file.filename}`;
            const isImage = file.mimetype.startsWith('image/');
            let thumbnailUrl = null;

            // Generate thumbnail for images
            if (isImage) {
                try {
                    const thumbnailsDir = path.join(__dirname, '../../uploads/thumbnails');
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

        res.status(200).json({
            message: 'Files uploaded successfully',
            files: uploadedFiles
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'File upload failed', error: error.message });
    }
};

export const deleteFile = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        if (!filename) {
            return res.status(400).json({ message: 'Filename is required' });
        }

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
            res.status(200).json({ message: 'File deleted successfully' });
        } else {
            res.status(404).json({ message: 'File not found' });
        }
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'File deletion failed', error: error.message });
    }
};
