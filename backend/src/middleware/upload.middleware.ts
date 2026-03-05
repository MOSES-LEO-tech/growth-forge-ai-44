import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');
const documentsDir = path.join(uploadsDir, 'documents');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

[uploadsDir, imagesDir, videosDir, documentsDir, thumbnailsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        const isDocument = file.mimetype === 'application/pdf' || 
                           file.mimetype === 'application/msword' || 
                           file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        if (isImage) {
            cb(null, imagesDir);
        } else if (isVideo) {
            cb(null, videosDir);
        } else if (isDocument) {
            cb(null, documentsDir);
        } else {
            cb(new Error('Invalid file type'), '');
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomstring-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        // Sanitize filename
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
    }
});

// File filter for validation
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Allow ALL image types by checking if it starts with 'image/'
    const isImage = file.mimetype.startsWith('image/');
    // Allowed video types
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const isVideo = allowedVideoTypes.includes(file.mimetype);
    // Allowed document types
    const allowedDocumentTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const isDocument = allowedDocumentTypes.includes(file.mimetype);

    if (isImage || isVideo || isDocument) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: Images, Videos, PDFs, and Word Documents.`));
    }
};

// Create multer instance with configuration
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    }
});

// Middleware to handle multer errors
export const handleMulterError = (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large. Maximum size is 50MB.' });
        }
        return res.status(400).json({ message: err.message });
    } else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};
