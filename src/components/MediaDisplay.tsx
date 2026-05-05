import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type MediaKind = "image" | "video" | "document" | "pdf";

interface MediaDisplayProps {
  src?: string | null;
  alt?: string;
  kind?: MediaKind;
  className?: string;
  mediaClassName?: string;
  fallbackLabel?: string;
  fit?: "cover" | "contain";
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  loading?: "eager" | "lazy";
}

const inferKind = (src?: string | null, kind?: MediaKind): MediaKind => {
  if (kind) return kind;
  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(src || "")) return "video";
  if (/\.pdf(\?|#|$)/i.test(src || "")) return "document";
  return "image";
};

const fallbackIcon = (kind: MediaKind) => {
  if (kind === "video") return Video;
  if (kind === "document" || kind === "pdf") return FileText;
  return ImageIcon;
};

export function MediaDisplay({
  src,
  alt = "Media preview",
  kind,
  className,
  mediaClassName,
  fallbackLabel,
  fit = "cover",
  controls = false,
  autoPlay = false,
  muted = true,
  playsInline = true,
  loading = "lazy",
}: MediaDisplayProps) {
  const [failed, setFailed] = useState(false);
  const mediaKind = inferKind(src, kind);
  const Icon = fallbackIcon(mediaKind);
  const fitClassName = fit === "contain" ? "object-contain" : "object-cover";

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed && mediaKind === "video") {
    return (
      <div className={cn("relative h-full w-full overflow-hidden bg-muted", className)}>
        <video
          src={src}
          controls={controls}
          autoPlay={autoPlay}
          muted={muted}
          playsInline={playsInline}
          preload="metadata"
          onError={() => setFailed(true)}
          className={cn("h-full w-full", fitClassName, mediaClassName)}
        />
        {!controls && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 text-white">
            <Video className="h-10 w-10 drop-shadow-md" />
          </div>
        )}
      </div>
    );
  }

  if (src && !failed && mediaKind === "image") {
    return (
      <div className={cn("h-full w-full overflow-hidden bg-muted", className)}>
        <img
          src={src}
          alt={alt}
          loading={loading}
          onError={() => setFailed(true)}
          className={cn("h-full w-full", fitClassName, mediaClassName)}
        />
      </div>
    );
  }

  if (src && !failed && (mediaKind === "document" || mediaKind === "pdf")) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("flex h-full w-full items-center justify-center gap-3 bg-muted p-4 text-muted-foreground", className)}
      >
        <FileText className="h-8 w-8 shrink-0" />
        <span className="truncate text-sm font-medium">{fallbackLabel || alt || "Open document"}</span>
      </a>
    );
  }

  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-4 text-center text-muted-foreground", className)}>
      <Icon className="h-10 w-10 opacity-70" />
      <span className="max-w-full truncate text-xs">{fallbackLabel || "Preview unavailable"}</span>
    </div>
  );
}
