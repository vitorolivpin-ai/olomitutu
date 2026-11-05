import type { LibraryItem, LibraryKind } from "@/types";

export const LIBRARY_KIND_LABEL: Record<LibraryKind, string> = {
  video: "Vídeo",
  cantiga: "Cantiga",
  pdf: "PDF",
  outro: "Outro",
};

export const LIBRARY_LIMITS = {
  cantigaBytes: 4 * 1024 * 1024,
  pdfBytes: 5 * 1024 * 1024,
  videoBytes: 8 * 1024 * 1024,
  outroBytes: 4 * 1024 * 1024,
} as const;

export function acceptForKind(kind: LibraryKind) {
  switch (kind) {
    case "video":
      return "video/mp4,video/webm,video/*";
    case "cantiga":
      return "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/*";
    case "pdf":
      return "application/pdf";
    default:
      return "*/*";
  }
}

export function maxBytesForKind(kind: LibraryKind) {
  switch (kind) {
    case "video":
      return LIBRARY_LIMITS.videoBytes;
    case "cantiga":
      return LIBRARY_LIMITS.cantigaBytes;
    case "pdf":
      return LIBRARY_LIMITS.pdfBytes;
    default:
      return LIBRARY_LIMITS.outroBytes;
  }
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const parts = u.pathname.split("/");
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIdx + 1]}`;
      }
      const shortIdx = parts.indexOf("shorts");
      if (shortIdx >= 0 && parts[shortIdx + 1]) {
        return `https://www.youtube.com/embed/${parts[shortIdx + 1]}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export function sortLibrary(items: LibraryItem[]) {
  return items.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}
