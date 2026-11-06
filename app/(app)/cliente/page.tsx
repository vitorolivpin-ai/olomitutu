"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { CLIENT_WHATSAPP } from "@/lib/client-whatsapp";
import { isClientRegistrationComplete } from "@/lib/client-registration";
import { BLOG_CATEGORY_LABEL } from "@/lib/house-content";
import { LIBRARY_KIND_LABEL, sortLibrary } from "@/lib/library";
function StoryBlock({
  title,
  excerpt,
  body,
  badge,
}: {
  title: string;
  excerpt?: string;
  body: string;
  badge: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className="block w-full text-left" onClick={() => setOpen(!open)}>
      <Card className="border-l-4 border-l-gold transition hover:border-gold/40">
        <Badge tone="gold">{badge}</Badge>
        <CardTitle className="mt-2 text-2xl">{title}</CardTitle>
        {open ? (
          <div className="mt-3 space-y-3">
            {body
              .split(/\n\s*\n/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-navy/75">
                  {p}
                </p>
              ))}
            <p className="text-xs font-medium text-gold-deep">Toque para recolher</p>
          </div>
        ) : (
          <>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-navy/70">
              {excerpt || body}
            </p>
            <p className="mt-3 text-xs font-medium text-gold-deep">Ler história ↓</p>
          </>
        )}
      </Card>
    </button>
  );
}

export default function ClienteHomePage() {
  const { state, currentUser } = useAppStore();

  const posts = useMemo(
    () => (state.blogPosts ?? []).filter((p) => p.published),
    [state.blogPosts],
  );
  const libraryPreview = useMemo(
    () => sortLibrary(state.libraryItems ?? []).filter((i) => i.visible_to_clients).slice(0, 3),
    [state.libraryItems],
  );
  const shopPreview = useMemo(
    () =>
      (state.shopProducts ?? [])
        .filter((p) => p.available)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
        .slice(0, 3),
    [state.shopProducts],
  );

  if (currentUser?.role !== "cliente") {
    return <EmptyState title="Área exclusiva do cliente" />;
  }
  if (!currentUser.client_id) {
    return (
      <EmptyState
        title="Preparando sua conta…"
        description="Se ficar assim, saia e entre de novo. No Supabase, confira se a migration 017_ensure_client.sql foi aplicada."
      />
    );
  }

  const client = state.clients.find((c) => c.id === currentUser.client_id);
  const registered = isClientRegistrationComplete(client);
  const historiaCasa = posts.find((p) => p.category === "historia_casa");
  const historiaPai = posts.find((p) => p.category === "historia_pai");
  const outros = posts.filter(
    (p) => p.category !== "historia_casa" && p.category !== "historia_pai",
  );

  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <BrandMark className="h-20 w-20" priority />
        <div>
          <p className="text-sm font-medium text-gold-deep">App do Cliente</p>
          <h1 className="font-display text-3xl text-navy sm:text-4xl">Quem somos</h1>
          <p className="mt-1 text-sm text-navy/60">
            História da casa, do Pai, biblioteca e loja.
          </p>
        </div>
      </div>

      {!registered ? (
        <Card className="border-l-4 border-l-gold">
          <CardTitle>Complete seu cadastro</CardTitle>
          <p className="mt-2 text-sm text-navy/65">
            Nome completo, data de nascimento e telefone — para a casa te conhecer.
          </p>
          <Link href="/cliente/cadastro" className="mt-4 block">
            <Button variant="gold" className="w-full">
              Fazer meu cadastro
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-leaf">
          <p className="text-sm text-navy/70">
            Olá, <strong>{client?.full_name ?? currentUser.full_name}</strong> — cadastro ok.
          </p>
          <Link href="/cliente/cadastro" className="mt-3 inline-block">
            <Button size="sm" variant="secondary">
              Ver / editar cadastro
            </Button>
          </Link>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-navy">História da casa</h2>
        {historiaCasa ? (
          <StoryBlock
            title={historiaCasa.title}
            excerpt={historiaCasa.excerpt}
            body={historiaCasa.body}
            badge={BLOG_CATEGORY_LABEL.historia_casa}
          />
        ) : (
          <EmptyState title="História da casa em breve" />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-navy">História do Pai de Santo</h2>
        {historiaPai ? (
          <StoryBlock
            title={historiaPai.title}
            excerpt={historiaPai.excerpt}
            body={historiaPai.body}
            badge={BLOG_CATEGORY_LABEL.historia_pai}
          />
        ) : (
          <EmptyState title="História do Pai em breve" />
        )}
      </section>

      <Card className="border-l-4 border-l-navy">
        <CardTitle>Biblioteca</CardTitle>
        <p className="mt-2 text-sm text-navy/65">
          Cantigas, vídeos e PDFs publicados pela casa.
        </p>
        {libraryPreview.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {libraryPreview.map((item) => (
              <li key={item.id} className="rounded-xl bg-mist/60 px-3 py-2 text-sm text-navy/80">
                <span className="font-medium">{item.title}</span>
                <span className="text-navy/45"> · {LIBRARY_KIND_LABEL[item.kind]}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href="/cliente/biblioteca" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            Abrir biblioteca
          </Button>
        </Link>
      </Card>

      <Card className="border-l-4 border-l-gold">
        <CardTitle>Loja da casa</CardTitle>
        <p className="mt-2 text-sm text-navy/65">
          Produtos à venda — combine a retirada ou entrega pelo chat com o Pai.
        </p>
        {shopPreview.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {shopPreview.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-mist/60 px-3 py-2 text-sm"
              >
                <span className="font-medium text-navy">{p.name}</span>
                <span className="shrink-0 text-gold-deep">
                  R$ {p.price.toFixed(2).replace(".", ",")}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href="/cliente/loja" className="mt-4 block">
          <Button variant="gold" className="w-full">
            Ver loja
          </Button>
        </Link>
      </Card>

      <Card className="border-l-4 border-l-navy">
        <CardTitle>Horários e jogos</CardTitle>
        <p className="mt-2 text-sm text-navy/65">
          Veja horários livres e marque seu atendimento.
        </p>
        <Link href="/cliente/horarios" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            Ver horários
          </Button>
        </Link>
      </Card>

      <Card className="border-l-4 border-l-navy">
        <CardTitle>Chat com o Pai de Santo</CardTitle>
        <p className="mt-2 text-sm text-navy/65">
          Conversa direta — texto, áudio, vídeo e chamada.
        </p>
        <Link href="/cliente/mensagens" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            Abrir chat com o Pai
          </Button>
        </Link>
      </Card>

      <Card className="border-l-4 border-l-leaf">
        <div className="flex items-start gap-3">
          <WhatsAppIcon className="mt-0.5 h-6 w-6 text-gold-deep" />
          <div className="min-w-0 flex-1">
            <CardTitle>{CLIENT_WHATSAPP.duvidas.label}</CardTitle>
            <p className="mt-2 text-sm text-navy/65">
              Fale direto com o Pai de Santo pelo WhatsApp.
            </p>
            <a
              href={CLIENT_WHATSAPP.duvidas.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block"
            >
              <Button variant="gold" className="w-full">
                Abrir WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </Card>

      <Card className="border-l-4 border-l-leaf">
        <div className="flex items-start gap-3">
          <WhatsAppIcon className="mt-0.5 h-6 w-6 text-gold-deep" />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg leading-snug">
              {CLIENT_WHATSAPP.grupo.label}
            </CardTitle>
            <p className="mt-2 text-sm text-navy/65">
              Entre no grupo da casa no WhatsApp, se quiser.
            </p>
            <a
              href={CLIENT_WHATSAPP.grupo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block"
            >
              <Button variant="secondary" className="w-full">
                Entrar no grupo
              </Button>
            </a>
          </div>
        </div>
      </Card>

      {outros.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-navy">Mais da casa</h2>
          {outros.map((post) => (
            <StoryBlock
              key={post.id}
              title={post.title}
              excerpt={post.excerpt}
              body={post.body}
              badge={BLOG_CATEGORY_LABEL[post.category]}
            />
          ))}
        </section>
      ) : null}

    </div>
  );
}
