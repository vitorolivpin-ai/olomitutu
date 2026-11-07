"use client";

import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { fileToAvatarDataUrl } from "@/lib/avatar";
import { roleLabel } from "@/lib/permissions";

export default function PerfilPage() {
  const { currentUser, state, updateProfile, updateHouseSettings } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [pixKey, setPixKey] = useState("");
  const [pixHolder, setPixHolder] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  const canEditPix =
    currentUser?.role === "pai_de_santo" || currentUser?.role === "administrador";

  useEffect(() => {
    if (!currentUser) return;
    setFullName(currentUser.full_name);
    setEmail(currentUser.email);
    setPhone(currentUser.phone ?? "");
    setAvatarUrl(currentUser.avatar_url);
    setPixKey(state.houseSettings?.pix_key ?? "");
    setPixHolder(state.houseSettings?.pix_holder_name ?? "");
  }, [currentUser, state.houseSettings]);

  if (!currentUser) {
    return <EmptyState title="Faça login para editar o perfil" />;
  }

  if (currentUser.role === "cliente") {
    return (
      <EmptyState
        title="Perfil da casa"
        description="Clientes editam os dados em Minha conta."
        action={
          <Link href="/cliente/conta">
            <Button>Ir para minha conta</Button>
          </Link>
        }
      />
    );
  }

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setError("");
    setOk("");
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar a foto.");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    const result = updateProfile({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      avatar_url: avatarUrl,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (canEditPix) {
      const pixResult = updateHouseSettings({
        pix_key: pixKey,
        pix_holder_name: pixHolder,
      });
      if (!pixResult.ok) {
        setError(pixResult.error);
        return;
      }
    }
    setOk("Perfil salvo. Nome e foto passam a aparecer nas conversas e no menu.");
  }

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-5">
      <BrandPageHeader
        title="Meu perfil"
        subtitle={`${roleLabel(currentUser.role)} · nome, foto e e-mail`}
      />

      <Card>
        <div className="flex flex-col items-center gap-3 text-center">
          <UserAvatar name={fullName || currentUser.full_name} src={avatarUrl} size="lg" />
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" /> {avatarUrl ? "Trocar foto" : "Adicionar foto"}
            </Button>
            {avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAvatarUrl(undefined);
                  setOk("");
                }}
              >
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Dados do perfil</CardTitle>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="full_name">Nome</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Como quer aparecer nas conversas"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone (opcional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 90000-0000"
            />
          </div>
          {canEditPix ? (
            <>
              <div>
                <Label htmlFor="pix_key">Chave Pix da casa (aleatória ou e-mail/CPF)</Label>
                <Input
                  id="pix_key"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Cole a chave Pix usada na loja"
                />
              </div>
              <div>
                <Label htmlFor="pix_holder">Nome no Pix (opcional)</Label>
                <Input
                  id="pix_holder"
                  value={pixHolder}
                  onChange={(e) => setPixHolder(e.target.value)}
                  placeholder="ILÉ OLÓRÒKÈ ÀṢẸ"
                />
              </div>
            </>
          ) : null}
          {error ? <ErrorMessage message={error} /> : null}
          {ok ? <p className="text-sm text-success">{ok}</p> : null}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar perfil"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
