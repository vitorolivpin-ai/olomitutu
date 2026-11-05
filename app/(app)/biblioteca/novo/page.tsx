"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import {
  acceptForKind,
  fileToDataUrl,
  formatBytes,
  maxBytesForKind,
} from "@/lib/library";
import { canManageLibrary } from "@/lib/permissions";
import type { LibraryKind } from "@/types";

export default function BibliotecaNovoPage() {
  const { currentUser, upsertLibraryItem } = useAppStore();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<LibraryKind>("cantiga");
  const [externalUrl, setExternalUrl] = useState("");
  const [visibleToClients, setVisibleToClients] = useState(true);
  const [fileDataUrl, setFileDataUrl] = useState<string | undefined>();
  const [fileName, setFileName] = useState<string | undefined>();
  const [mimeType, setMimeType] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canManageLibrary(currentUser?.role)) {
    return (
      <EmptyState
        title="Publicação restrita"
        description="Use a aba Biblioteca no início do app, ou entre como Pai de Santo / Administrador."
        action={
          <Link href="/biblioteca">
            <Button variant="secondary">Voltar</Button>
          </Link>
        }
      />
    );
  }

  async function onFile(file: File | null) {
    setError("");
    if (!file) return;
    const max = maxBytesForKind(kind);
    if (file.size > max) {
      setError(
        `Arquivo grande demais (${formatBytes(file.size)}). Limite no demo: ${formatBytes(max)}. Para vídeo, prefira colar um link do YouTube ou Drive.`,
      );
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setFileDataUrl(dataUrl);
      setFileName(file.name);
      setMimeType(file.type || undefined);
    } catch {
      setError("Não foi possível ler o arquivo.");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const result = upsertLibraryItem({
      title,
      description,
      kind,
      external_url: externalUrl.trim() || undefined,
      file_data_url: fileDataUrl,
      file_name: fileName,
      mime_type: mimeType,
      visible_to_clients: visibleToClients,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace(`/biblioteca/${result.item.id}`);
  }

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-5">
      <div>
        <Link href="/biblioteca" className="text-sm text-navy/55 hover:text-navy">
          ← Biblioteca
        </Link>
        <h1 className="font-display text-3xl text-navy">Novo material</h1>
        <p className="text-sm text-navy/60">
          Suba vídeo, cantiga ou PDF — ou cole um link
        </p>
      </div>

      <Card>
        <CardTitle>Publicar</CardTitle>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Cantiga de Oxum"
              required
            />
          </div>
          <div>
            <Label htmlFor="kind">Tipo</Label>
            <Select
              id="kind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as LibraryKind);
                setFileDataUrl(undefined);
                setFileName(undefined);
                setMimeType(undefined);
              }}
            >
              <option value="cantiga">Cantiga (áudio)</option>
              <option value="video">Vídeo</option>
              <option value="pdf">PDF</option>
              <option value="outro">Outro</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve orientação sobre o material"
            />
          </div>
          <div>
            <Label htmlFor="url">Link (YouTube, Drive, áudio online…)</Label>
            <Input
              id="url"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://…"
            />
            <p className="mt-1 text-xs text-navy/50">
              Ideal para vídeos grandes. No demo, arquivos locais têm limite de tamanho.
            </p>
          </div>
          <div>
            <Label htmlFor="file">Ou enviar arquivo</Label>
            <Input
              id="file"
              type="file"
              accept={acceptForKind(kind)}
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
            {fileName ? (
              <p className="mt-1 text-xs text-success">Selecionado: {fileName}</p>
            ) : (
              <p className="mt-1 text-xs text-navy/50">
                Limite aproximado: {formatBytes(maxBytesForKind(kind))}
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-navy/75">
            <input
              type="checkbox"
              checked={visibleToClients}
              onChange={(e) => setVisibleToClients(e.target.checked)}
            />
            Visível no App do Cliente
          </label>
          {error ? <ErrorMessage message={error} /> : null}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Publicando..." : "Publicar na biblioteca"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
