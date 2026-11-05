"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { canAccess, canManageHouseContent } from "@/lib/permissions";
import { uid } from "@/lib/utils";

export default function FotosPage() {
  const { state, currentUser, upsertPhotoAlbum, removePhotoAlbum } = useAppStore();
  const canEdit = canManageHouseContent(currentUser?.role);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  if (!canAccess(currentUser?.role, "house_content")) {
    return <EmptyState title="Acesso negado" />;
  }

  const albums = (state.photoAlbums ?? [])
    .filter((a) => canEdit || a.published)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const open = albums.find((a) => a.id === openId);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const photos = photoUrl.trim()
      ? [{ id: uid("ph"), url: photoUrl.trim(), caption: undefined }]
      : [];
    const result = upsertPhotoAlbum({
      title,
      description,
      drive_url: driveUrl,
      cover_url: photos[0]?.url,
      photos,
      published: true,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setDescription("");
    setDriveUrl("");
    setPhotoUrl("");
    setWriting(false);
  }

  if (open) {
    return (
      <div className="animate-rise space-y-5">
        <div>
          <button
            type="button"
            className="text-sm text-navy/55 hover:text-navy"
            onClick={() => setOpenId(null)}
          >
            ← Álbuns
          </button>
          <h1 className="font-display text-3xl text-navy">{open.title}</h1>
          {open.description ? (
            <p className="mt-1 text-sm text-navy/60">{open.description}</p>
          ) : null}
        </div>

        {open.drive_url ? (
          <a href={open.drive_url} target="_blank" rel="noreferrer">
            <Button variant="gold">
              <ExternalLink className="h-4 w-4" /> Abrir Drive completo
            </Button>
          </a>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {open.photos.map((ph) => (
            <Card key={ph.id} className="overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt={ph.caption || open.title} className="aspect-[4/3] w-full object-cover" />
              {ph.caption ? (
                <p className="px-4 py-3 text-sm text-navy/65">{ph.caption}</p>
              ) : null}
            </Card>
          ))}
          {open.photos.length === 0 ? (
            <EmptyState
              title="Sem fotos embutidas"
              description="Use o link do Drive para ver o acervo completo."
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/conteudo" className="text-sm text-navy/55 hover:text-navy">
            ← Conteúdo da casa
          </Link>
          <h1 className="font-display text-3xl text-navy">Fotos</h1>
          <p className="text-sm text-navy/60">
            Memórias do barracão — fotos no app ou link do Drive
          </p>
        </div>
        {canEdit ? (
          <Button onClick={() => setWriting((v) => !v)}>
            {writing ? "Fechar" : "Novo álbum"}
          </Button>
        ) : null}
      </div>

      {writing && canEdit ? (
        <Card>
          <CardTitle>Novo álbum</CardTitle>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Link do Drive (recomendado para acervos grandes)</Label>
              <Input
                type="url"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/…"
              />
            </div>
            <div>
              <Label>URL de uma foto de capa (opcional)</Label>
              <Input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <Button type="submit">Salvar álbum</Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {albums.map((alb) => (
          <Card key={alb.id} className="overflow-hidden p-0">
            <button type="button" className="w-full text-left" onClick={() => setOpenId(alb.id)}>
              {alb.cover_url || alb.photos[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={alb.cover_url || alb.photos[0]?.url}
                  alt={alb.title}
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-mist text-navy/40">
                  Álbum
                </div>
              )}
              <div className="p-4">
                <CardTitle>{alb.title}</CardTitle>
                {alb.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-navy/60">{alb.description}</p>
                ) : null}
              </div>
            </button>
            <div className="flex gap-2 px-4 pb-4">
              {alb.drive_url ? (
                <a href={alb.drive_url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="gold">
                    <ExternalLink className="h-4 w-4" /> Drive
                  </Button>
                </a>
              ) : null}
              {canEdit ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Remover álbum?")) removePhotoAlbum(alb.id);
                  }}
                >
                  Remover
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
        {albums.length === 0 ? <EmptyState title="Nenhum álbum ainda" /> : null}
      </div>
    </div>
  );
}
