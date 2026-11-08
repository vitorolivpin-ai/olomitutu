"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { WorkshopImage } from "@/components/workshops/workshop-card";
import { useWorkshops, type WorkshopInput } from "@/hooks/use-workshops";
import type { Workshop, WorkshopModality, WorkshopStatus } from "@/types";

async function compressImage(file: File, maxW = 1200): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxW / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl bg-mist/60 p-3">
      <span>
        <span className="block text-sm font-semibold text-navy">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-navy/55">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[#0b326b]"
      />
    </label>
  );
}

export function WorkshopForm({ initial }: { initial?: Workshop }) {
  const router = useRouter();
  const { upsertWorkshop } = useWorkshops();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [shortDesc, setShortDesc] = useState(initial?.short_description ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [topics, setTopics] = useState<string[]>(initial?.topics?.length ? initial.topics : [""]);
  const [image, setImage] = useState(initial?.image_url ?? "");
  const [modality, setModality] = useState<WorkshopModality>(initial?.modality ?? "presencial");
  const [status, setStatus] = useState<WorkshopStatus>(initial?.status ?? "publicada");
  const [date, setDate] = useState(initial?.date ?? "");
  const [start, setStart] = useState(initial?.start_time ?? "");
  const [end, setEnd] = useState(initial?.end_time ?? "");
  const [location, setLocation] = useState(initial?.location ?? "Ilé Olóròkè Àṣẹ");
  const [link, setLink] = useState(initial?.online_link ?? "");
  const [spots, setSpots] = useState(String(initial?.total_spots ?? 20));
  const [waitlist, setWaitlist] = useState(initial?.allow_waitlist ?? true);
  const [deadline, setDeadline] = useState(initial?.registration_deadline ?? "");
  const [price, setPrice] = useState(initial?.price ? String(initial.price).replace(".", ",") : "");
  const [workload, setWorkload] = useState(initial?.workload ?? "");
  const [cert, setCert] = useState(initial?.issues_certificate ?? true);
  const [signer, setSigner] = useState(initial?.certificate_signer_name ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const preview: Workshop = {
    id: initial?.id ?? "preview",
    title: title || "Nome da oficina",
    short_description: shortDesc,
    topics,
    image_url: image || undefined,
    modality,
    status,
    total_spots: Number(spots) || 0,
    allow_waitlist: waitlist,
    price: 0,
    issues_certificate: cert,
    created_at: "",
    updated_at: "",
  };

  async function save(e: FormEvent, override?: WorkshopStatus) {
    e.preventDefault();
    setError("");
    const total = Number(spots);
    if (!Number.isFinite(total) || total < 0) {
      setError("Informe a quantidade de vagas (0 = sem limite).");
      return;
    }
    const input: WorkshopInput = {
      id: initial?.id,
      title,
      short_description: shortDesc,
      about: about.trim() || undefined,
      topics,
      image_url: image || undefined,
      modality,
      status: override ?? status,
      date: date || undefined,
      start_time: start || undefined,
      end_time: end || undefined,
      location: modality === "presencial" ? location.trim() || undefined : undefined,
      online_link: modality === "online" ? link.trim() || undefined : undefined,
      total_spots: Math.round(total),
      allow_waitlist: waitlist,
      registration_deadline: deadline || undefined,
      price: Number(price.replace(",", ".")) || 0,
      workload: workload.trim() || undefined,
      issues_certificate: cert,
      certificate_signer_name: signer.trim() || undefined,
      created_by: initial?.created_by,
      created_by_name: initial?.created_by_name,
    };
    setSaving(true);
    const res = await upsertWorkshop(input);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/gestao-oficinas");
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-4">
      <Card className="space-y-4">
        <CardTitle className="text-xl">Informações</CardTitle>
        <div>
          <Label htmlFor="of-titulo">Nome da oficina *</Label>
          <Input id="of-titulo" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="of-curta">Descrição curta *</Label>
          <Input
            id="of-curta"
            value={shortDesc}
            maxLength={120}
            onChange={(e) => setShortDesc(e.target.value)}
            required
          />
          <p className="mt-1 text-right text-xs text-navy/45">{shortDesc.length}/120 — aparece no card</p>
        </div>
        <div>
          <Label htmlFor="of-sobre">Sobre esta oficina</Label>
          <Textarea id="of-sobre" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
        </div>
        <div>
          <Label>Conteúdo (tópicos)</Label>
          <div className="space-y-2">
            {topics.map((t, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={t}
                  onChange={(e) => setTopics(topics.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Tópico ${i + 1}`}
                  aria-label={`Tópico ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => setTopics(topics.length > 1 ? topics.filter((_, j) => j !== i) : [""])}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-navy/15 bg-white text-navy/60 hover:text-danger"
                  aria-label="Remover tópico"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button type="button" size="sm" variant="secondary" onClick={() => setTopics([...topics, ""])}>
              <Plus className="h-4 w-4" /> Adicionar tópico
            </Button>
          </div>
        </div>
        <div>
          <Label>Foto de capa</Label>
          <div className="flex items-center gap-3">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-2xl">
              <WorkshopImage workshop={preview} />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-2xl border border-navy/15 bg-white px-3 text-sm font-semibold text-navy hover:bg-cream">
                <ImagePlus className="h-4 w-4" /> {image ? "Trocar foto" : "Enviar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setImage(await compressImage(f));
                  }}
                />
              </label>
              {image ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setImage("")}>
                  Remover
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <CardTitle className="text-xl">Data e local</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="of-mod">Modalidade</Label>
            <Select id="of-mod" value={modality} onChange={(e) => setModality(e.target.value as WorkshopModality)}>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="of-status">Status</Label>
            <Select id="of-status" value={status} onChange={(e) => setStatus(e.target.value as WorkshopStatus)}>
              <option value="publicada">Publicada (inscrições abertas)</option>
              <option value="em_breve">Em breve (sem inscrição)</option>
              <option value="rascunho">Rascunho (não aparece)</option>
              <option value="encerrada">Encerrada</option>
              <option value="cancelada">Cancelada</option>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="of-data">Data</Label>
            <Input id="of-data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="of-ini">Início</Label>
            <Input id="of-ini" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="of-fim">Término</Label>
            <Input id="of-fim" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        {modality === "presencial" ? (
          <div>
            <Label htmlFor="of-local">Local</Label>
            <Input id="of-local" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        ) : (
          <div>
            <Label htmlFor="of-link">Link da sala (só inscritos confirmados veem)</Label>
            <Input
              id="of-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://meet.google.com/…"
            />
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <CardTitle className="text-xl">Vagas e inscrição</CardTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="of-vagas">Quantidade de vagas *</Label>
            <Input
              id="of-vagas"
              type="number"
              min={0}
              inputMode="numeric"
              value={spots}
              onChange={(e) => setSpots(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-navy/50">0 = sem limite</p>
          </div>
          <div>
            <Label htmlFor="of-prazo">Inscrições até</Label>
            <Input id="of-prazo" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="of-valor">Valor (R$)</Label>
            <Input
              id="of-valor"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="Gratuita"
            />
          </div>
        </div>
        <Toggle
          checked={waitlist}
          onChange={setWaitlist}
          label="Lista de espera quando esgotar"
          hint="Se alguém cancelar, a 1ª pessoa da lista é confirmada automaticamente."
        />
      </Card>

      <Card className="space-y-4">
        <CardTitle className="text-xl">Certificado</CardTitle>
        <Toggle
          checked={cert}
          onChange={setCert}
          label="Emite certificado de participação"
          hint="Liberado para quem estiver marcado como Presente."
        />
        {cert ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="of-carga">Carga horária</Label>
              <Input
                id="of-carga"
                value={workload}
                onChange={(e) => setWorkload(e.target.value)}
                placeholder="3 horas"
              />
            </div>
            <div>
              <Label htmlFor="of-resp">Quem assina (opcional)</Label>
              <Input
                id="of-resp"
                value={signer}
                onChange={(e) => setSigner(e.target.value)}
                placeholder="Padrão: Pai de Santo"
              />
            </div>
          </div>
        ) : null}
      </Card>

      {error ? <ErrorMessage message={error} /> : null}

      <div className="sticky bottom-3 z-10 grid gap-2 rounded-3xl bg-background/90 p-2 backdrop-blur sm:grid-cols-3">
        <Button type="button" variant="secondary" onClick={() => router.push("/gestao-oficinas")}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={(e) => void save(e as unknown as FormEvent, "rascunho")}
        >
          Salvar rascunho
        </Button>
        <Button type="submit" variant="gold" disabled={saving}>
          {saving ? "Salvando…" : initial ? "Salvar alterações" : "Publicar oficina"}
        </Button>
      </div>
    </form>
  );
}
