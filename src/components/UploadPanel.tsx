"use client";

import { useState } from "react";
import { Upload, File, Image as ImageIcon, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UploadPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{
    type: string;
    url: string;
    name: string;
  }[]>([]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);

    const previewURLs = selectedFiles.map((file) => ({
      type: file.type.startsWith("image")
        ? "image"
        : file.type.startsWith("video")
        ? "video"
        : "file",
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setPreviews(previewURLs);
  };

  return (
    <Card className="max-w-3xl mx-auto bg-background/80 backdrop-blur-md rounded-2xl shadow-lg border border-border">
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Upload Area */}
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-xl p-8 cursor-pointer hover:border-primary transition-all duration-300"
        >
          <Upload className="w-12 h-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-center">
            Drag & drop or <span className="text-primary font-semibold">click to upload</span>
          </p>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*, video/*, .pdf, .doc, .docx, .ppt, .pptx"
            className="hidden"
            onChange={handleFiles}
          />
        </label>

        {/* Preview Section */}
        {previews.length > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {previews.map((file, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden border border-border"
              >
                {file.type === "image" ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : file.type === "video" ? (
                  <video
                    src={file.url}
                    controls
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 bg-muted text-center p-4">
                    <File className="w-8 h-8 mb-2 text-primary" />
                    <p className="text-sm truncate">{file.name}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* File Info Summary */}
        {files.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {files.length} file(s) ready for upload
          </div>
        )}
      </CardContent>
    </Card>
  );
}