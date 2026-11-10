import { NextRequest, NextResponse } from "next/server";
import { modalidadeLabel, visitorAccessPath } from "@/lib/jogo";
import type { JogoModalidade } from "@/types";

type Body = {
  to?: string;
  event?: "confirmado" | "recusado" | "novo_comprovante" | "comprovante_recebido";
  scheduled_at?: string;
  modalidade?: JogoModalidade;
  access_token?: string;
  ficha_code?: string;
};

function whenLabel(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function buildHtml(body: Body) {
  const when = whenLabel(body.scheduled_at);
  const mod = modalidadeLabel(body.modalidade);
  const code = body.ficha_code ? `Código ${body.ficha_code}` : "";
  const access =
    body.access_token && body.event === "confirmado"
      ? `<p style="margin:20px 0"><a href="${visitorAccessPath(body.access_token)}" style="display:inline-block;background:#c99a38;color:#0b326b;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Acessar atendimento</a></p>`
      : "";

  if (body.event === "confirmado") {
    return `<!doctype html><html lang="pt-BR"><body style="font-family:Georgia,serif;color:#0B1F3A;background:#f7f4ef;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e5dfd3">
        <p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#C9A227">ILÉ OLÓRÒKÈ ÀṢẸ</p>
        <h1 style="margin:8px 0 12px;font-size:24px">Seu Jogo foi confirmado</h1>
        <p>Confirmamos seu atendimento.</p>
        <p><strong>Data/horário:</strong> ${when}<br/><strong>Modalidade:</strong> ${mod}<br/>${code}</p>
        ${access}
        <p style="font-size:12px;color:#8a96a3">Este e-mail não contém dados sensíveis. Use somente o link do seu atendimento.</p>
      </div></body></html>`;
  }
  if (body.event === "recusado") {
    return `<!doctype html><html lang="pt-BR"><body style="font-family:Georgia,serif;color:#0B1F3A;background:#f7f4ef;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e5dfd3">
        <h1 style="font-size:22px">Atualização sobre sua solicitação de Jogo</h1>
        <p>Sua solicitação para ${when} (${mod}) não foi confirmada neste momento.</p>
        <p style="font-size:12px;color:#8a96a3">Sem dados sensíveis neste aviso. Em caso de dúvida, responda apenas pelo canal indicado na marcação.</p>
      </div></body></html>`;
  }
  if (body.event === "novo_comprovante") {
    return `<!doctype html><html lang="pt-BR"><body style="font-family:Georgia,serif;color:#0B1F3A;background:#f7f4ef;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e5dfd3">
        <h1 style="font-size:22px">Precisamos de um novo comprovante</h1>
        <p>Para o horário ${when} (${mod}), envie novamente o comprovante pelo app.</p>
      </div></body></html>`;
  }
  return `<!doctype html><html lang="pt-BR"><body style="font-family:Georgia,serif;color:#0B1F3A;background:#f7f4ef;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e5dfd3">
      <h1 style="font-size:22px">Comprovante recebido</h1>
      <p>Recebemos seu comprovante. A confirmação do Jogo pode levar até 24 horas.</p>
      <p>Horário solicitado: ${when} · ${mod}</p>
    </div></body></html>`;
}

function subjectFor(event: Body["event"]) {
  if (event === "confirmado") return "Seu Jogo foi confirmado";
  if (event === "recusado") return "Atualização da sua solicitação de Jogo";
  if (event === "novo_comprovante") return "Envie um novo comprovante do Jogo";
  return "Comprovante do Jogo recebido";
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const to = body.to?.trim();
  if (!to || !body.event) {
    return NextResponse.json(
      { ok: false, error: "Informe destinatário e evento." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Olomitutu <onboarding@resend.dev>";
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "E-mail não configurado (RESEND_API_KEY). Evento registrado no app.",
      prepared: true,
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: subjectFor(body.event),
      html: buildHtml(body),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { ok: false, error: text || `Resend HTTP ${res.status}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
