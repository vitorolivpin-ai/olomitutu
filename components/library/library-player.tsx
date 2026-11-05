"use client";

import type { LibraryItem } from "@/types";
import { youtubeEmbedUrl } from "@/lib/library";

export function LibraryPlayer({ item }: { item: LibraryItem }) {
  const src = item.file_data_url || item.external_url;
  if (!src) {
    return <p className="text-sm text-navy/55">Sem arquivo ou link neste material.</p>;
  }

  if (item.kind === "video") {
    const yt = item.external_url ? youtubeEmbedUrl(item.external_url) : null;
    if (yt) {
      return (
        <div className="aspect-video overflow-hidden rounded-2xl bg-navy/90">
          <iframe
            src={yt}
            title={item.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <video controls className="w-full rounded-2xl bg-navy/90" src={src}>
        Seu navegador não reproduz este vídeo.
      </video>
    );
  }

  if (item.kind === "cantiga") {
    return (
      <div className="rounded-2xl bg-mist/80 p-4">
        <audio controls className="w-full" src={src} preload="metadata">
          Seu navegador não reproduz este áudio.
        </audio>
      </div>
    );
  }

  if (item.kind === "pdf") {
    return (
      <div className="space-y-3">
        <iframe
          title={item.title}
          src={src}
          className="h-[70vh] w-full rounded-2xl border border-navy/10 bg-white"
        />
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm font-medium text-gold-deep underline"
        >
          Abrir PDF em nova aba
        </a>
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="inline-flex rounded-2xl bg-navy px-4 py-3 text-sm font-medium text-white"
    >
      Abrir arquivo{item.file_name ? `: ${item.file_name}` : ""}
    </a>
  );
}
