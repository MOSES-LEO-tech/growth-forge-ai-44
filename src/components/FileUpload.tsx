import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Video, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
    accept?: string;
    maxSize?: number; // in MB
    onFileSelect?: (file: File | null) => void;
    onUrlChange?: (url: string) => void;
    preview?: boolean;
    className?: string;
}

export const FileUpload = ({
    accept = "image/*,video/*",
    maxSize = 10,
    onFileSelect,
    onUrlChange,
    preview = true,
    className
}: FileUploadProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string>("");
    const [urlInput, setUrlInput] = useState("");

    const validateFile = (file: File): string | null => {
        const maxSizeBytes = maxSize * 1024 * 1024;

        if (file.size > maxSizeBytes) {
            return `File size must be less than ${maxSize}MB`;
        }

        const acceptedTypes = accept.split(",").map(t => t.trim());
        const isAccepted = acceptedTypes.some(type => {
            if (type === "image/*") return file.type.startsWith("image/");
            if (type === "video/*") return file.type.startsWith("video/");
            return file.type === type;
        });

        if (!isAccepted) {
            return "File type not supported";
        }

        return null;
    };

    const handleFile = useCallback((selectedFile: File) => {
        const validationError = validateFile(selectedFile);

        if (validationError) {
            setError(validationError);
            return;
        }

        setError("");
        setFile(selectedFile);
        onFileSelect?.(selectedFile);

        // Create preview
        if (preview && (selectedFile.type.startsWith("image/") || selectedFile.type.startsWith("video/"))) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
        }
    }, [maxSize, accept, preview, onFileSelect]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFile(droppedFile);
        }
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFile(selectedFile);
        }
    };

    const handleRemove = () => {
        setFile(null);
        setPreviewUrl("");
        setError("");
        onFileSelect?.(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    };

    const handleUrlChange = (url: string) => {
        setUrlInput(url);
        onUrlChange?.(url);
        setFile(null);
        setPreviewUrl(url);
        setError("");
    };

    const isImage = file?.type.startsWith("image/") || urlInput.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isVideo = file?.type.startsWith("video/") || urlInput.match(/\.(mp4|webm|mov)$/i);

    return (
        <div className={cn("space-y-4", className)}>
            {/* Drag and Drop Zone */}
            {!file && !urlInput && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                        error && "border-destructive"
                    )}
                >
                    <input
                        type="file"
                        accept={accept}
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className={cn(
                            "w-12 h-12 mx-auto mb-4",
                            isDragging ? "text-primary" : "text-muted-foreground"
                        )} />
                        <p className="text-sm font-medium mb-1">
                            {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Max file size: {maxSize}MB
                        </p>
                    </label>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <FileWarning className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}

            {/* Preview */}
            {(previewUrl || file) && (
                <div className="relative rounded-lg border overflow-hidden">
                    {isImage && (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-48 object-cover"
                        />
                    )}
                    {isVideo && (
                        <video
                            src={previewUrl}
                            controls
                            className="w-full h-48 object-cover"
                        />
                    )}
                    {!isImage && !isVideo && file && (
                        <div className="flex items-center gap-3 p-4 bg-muted">
                            <FileWarning className="w-8 h-8 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemove}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* URL Input Option */}
            {!file && (
                <div className="space-y-2">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or enter URL
                            </span>
                        </div>
                    </div>
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            )}
        </div>
    );
};
