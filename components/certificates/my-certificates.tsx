"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Award, CalendarDays, ChevronRight, Hourglass } from "lucide-react";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { CertificateArt, CERT_H, CERT_W } from "@/components/certificates/certificate-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingBlock } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";
import { useWorkshops } from "@/hooks/use-workshops";
import { formatLongDate, formatTimeRange, REGISTRATION_STATUS_LABEL, todayYmd } from "@/lib/workshops";

const THUMB_W = 120;

/** “Meus certificados” + “Minhas oficinas” — portal do Cliente e do Filho. */
export function MyCertificates({ base, backHref }: { base: string; backHref: string }) {
  const { currentUser } = useAppStore();
  const { ready, myCertificates, workshops, registrations } = useWorkshops();

  const myRegs = useMemo(() => {
    if (!currentUser) return [];
    const email = currentUser.email.toLowerCase();
    const today = todayYmd();
    return registrations
      .filter(
        (r) =>
          r.status !== "cancelada" &&
          (r.user_id === currentUser.id || r.email.toLowerCase() === email),
      )
      .map((r) => ({ r, w: workshops.find((w) => w.id === r.workshop_id) }))
      .filter((x) => x.w && (!x.w.date || x.w.date >= today) && x.r.status !== "presente");
  }, [currentUser, registrations, workshops]);

  if (!ready) return <LoadingBlock />;

  return (
    <div className="animate-rise space-y-6">
      <BrandPageHeader
        title="Meus certificados"
        subtitle="Oficinas que você participou e cursos que concluiu."
        backHref={backHref}
      />

      {myRegs.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-display text-xl text-navy">Minhas próximas oficinas</h2>
          {myRegs.map(({ r, w }) => (
            <Link key={r.id} href={`/oficinas/${w!.id}`}>
              <Card className="flex items-center gap-3 p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist">
                  {r.status === "lista_espera" ? (
                    <Hourglass className="h-5 w-5 text-gold-deep" />
                  ) : (
                    <CalendarDays className="h-5 w-5 text-gold-deep" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{w!.title}</p>
                  <p className="text-xs text-navy/60">
                    {w!.date ? formatLongDate(w!.date) : "Data a definir"}
                    {formatTimeRange(w!) ? ` · ${formatTimeRange(w!)}` : ""}
                  </p>
                </div>
                <Badge tone={r.status === "lista_espera" ? "warning" : "success"}>
                  {REGISTRATION_STATUS_LABEL[r.status]}
                </Badge>
              </Card>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="space-y-2">
        {myRegs.length > 0 ? <h2 className="font-display text-xl text-navy">Certificados</h2> : null}
        {myCertificates.length === 0 ? (
          <EmptyState
            title="Você ainda não tem certificados"
            description="Participe de uma oficina ou conclua um curso. Quando a casa liberar, o certificado aparece aqui."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myCertificates.map((c) => (
              <Link key={c.id} href={`${base}/${c.id}`}>
                <Card className="flex items-center gap-3 p-3 transition hover:border-gold/40">
                  <div
                    className="relative shrink-0 overflow-hidden rounded-lg shadow"
                    style={{ width: THUMB_W, height: (THUMB_W * CERT_H) / CERT_W }}
                    aria-hidden="true"
                  >
                    <div
                      style={{
                        width: CERT_W,
                        height: CERT_H,
                        transform: `scale(${THUMB_W / CERT_W})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <CertificateArt cert={c} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={c.kind === "oficina" ? "info" : "gold"}>
                        {c.kind === "oficina" ? "Oficina" : "Curso"}
                      </Badge>
                      {!c.seen_at ? <Badge tone="success">Novo</Badge> : null}
                    </div>
                    <p className="mt-1 font-semibold leading-snug text-navy">{c.title}</p>
                    <p className="text-xs text-navy/60">{formatLongDate(c.completed_on)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-navy/30" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link href="/oficinas" className="block">
        <Button variant="secondary" className="w-full">
          <Award className="h-5 w-5" /> Ver oficinas abertas
        </Button>
      </Link>
    </div>
  );
}
