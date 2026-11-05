"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { OrganogramNode } from "@/components/house/organogram-node";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { fileToAvatarDataUrl } from "@/lib/avatar";
import { OFFICE_LABEL, OFFICE_RING } from "@/lib/house-content";
import { canAccess, canManageHouseContent } from "@/lib/permissions";
import type { HouseOffice } from "@/types";

export default function HierarquiaPage() {
  const { state, currentUser, upsertHierarchyPerson, removeHierarchyPerson } = useAppStore();
  const canEdit = canManageHouseContent(currentUser?.role);
  const [writing, setWriting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [office, setOffice] = useState<HouseOffice>("abian");
  const [parentId, setParentId] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [error, setError] = useState("");

  const people = useMemo(
    () =>
      (state.hierarchyPeople ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [state.hierarchyPeople],
  );

  const roots = people.filter((p) => !p.parent_id);

  if (!canAccess(currentUser?.role, "house_content")) {
    return <EmptyState title="Acesso negado" />;
  }

  async function onPhoto(file: File | null) {
    if (!file) return;
    try {
      setPhotoUrl(await fileToAvatarDataUrl(file, 320));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na foto");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = upsertHierarchyPerson({
      full_name: fullName,
      office,
      parent_id: parentId || null,
      bio,
      photo_url: photoUrl,
      sort_order: people.length,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFullName("");
    setBio("");
    setPhotoUrl(undefined);
    setParentId("");
    setWriting(false);
  }

  return (
    <div className="animate-rise space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/conteudo" className="text-sm text-navy/55 hover:text-navy">
            ← Conteúdo da casa
          </Link>
          <h1 className="font-display text-3xl text-navy">Hierarquia</h1>
          <p className="text-sm text-navy/60">
            Organograma do barracão — a cor do anel indica o cargo
          </p>
        </div>
        {canEdit ? (
          <Button onClick={() => setWriting((v) => !v)}>
            {writing ? "Fechar" : "Adicionar pessoa"}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardTitle>Legenda dos cargos</CardTitle>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {(Object.keys(OFFICE_LABEL) as HouseOffice[]).map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm text-navy/75">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: OFFICE_RING[key] }}
              />
              {OFFICE_LABEL[key]}
            </li>
          ))}
        </ul>
      </Card>

      {writing && canEdit ? (
        <Card>
          <CardTitle>Nova pessoa no organograma</CardTitle>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label>Cargo</Label>
              <Select value={office} onChange={(e) => setOffice(e.target.value as HouseOffice)}>
                {(Object.keys(OFFICE_LABEL) as HouseOffice[]).map((key) => (
                  <option key={key} value={key}>
                    {OFFICE_LABEL[key]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Ligado a (acima na hierarquia)</Label>
              <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— Raiz / topo —</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Foto</Label>
              <Input type="file" accept="image/*" onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>Nota curta</Label>
              <Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            {error ? <ErrorMessage message={error} /> : null}
            <Button type="submit">Salvar no organograma</Button>
          </form>
        </Card>
      ) : null}

      <Card className="overflow-x-auto">
        <div className="min-w-[640px] py-4">
          {roots.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-10">
              {roots.map((root) => (
                <OrganogramNode
                  key={root.id}
                  person={root}
                  childrenPeople={people.filter((p) => p.parent_id === root.id)}
                  all={people}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Organograma vazio" />
          )}
        </div>
      </Card>

      {canEdit && people.length > 0 ? (
        <Card>
          <CardTitle>Gerenciar pessoas</CardTitle>
          <ul className="mt-3 space-y-2">
            {people.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-2xl bg-mist/70 px-3 py-2 text-sm"
              >
                <span>
                  {p.full_name} · {OFFICE_LABEL[p.office]}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Remover ${p.full_name}?`)) removeHierarchyPerson(p.id);
                  }}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
