"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { BRASAO_SRC } from "@/components/brand/logo";
import { certificateUrl, formatLongDate, MODALITY_LABEL } from "@/lib/workshops";
import type { Certificate } from "@/types";

/** Largura/altura do A4 paisagem em px (96 dpi). */
export const CERT_W = 1123;
export const CERT_H = 794;

export type CertificateData = Pick<
  Certificate,
  | "code"
  | "kind"
  | "printed_name"
  | "title"
  | "completed_on"
  | "modality"
  | "workload"
  | "signer_name"
  | "signer_title"
  | "second_signer_label"
  | "signature_data_url"
  | "issued_at"
>;

const CSS = `
@font-face { font-family: "OltPlayfair"; src: url("/fonts/certificado/PlayfairDisplay.ttf"); font-weight: 400 900; font-display: block; }
@font-face { font-family: "OltNunito"; src: url("/fonts/certificado/Nunito.ttf"); font-weight: 200 1000; font-display: block; }
@font-face { font-family: "OltVibes"; src: url("/fonts/certificado/GreatVibes-Regular.ttf"); font-display: block; }
.olt-cert { --navy:#0b326b; --gold:#c99a38; --gold-dark:#9c7529; --beige:#f4ecdd; --beige-2:#eadfcb; --text:#3e3a35;
  position:relative; width:297mm; height:210mm; overflow:hidden; font-family:"OltNunito",sans-serif; color:var(--text);
  background: radial-gradient(ellipse at 50% 40%, #fbf6ec 0%, var(--beige) 55%, var(--beige-2) 100%); text-align:center; }
.olt-cert * { box-sizing:border-box; margin:0; padding:0; }
.olt-cert .graf { position:absolute; inset:0; width:100%; height:100%; }
.olt-cert .m1 { position:absolute; inset:7mm; border:0.6mm solid var(--navy); }
.olt-cert .m2 { position:absolute; inset:9.5mm; border:0.35mm solid var(--gold); }
.olt-cert .m3 { position:absolute; inset:11mm; border:0.15mm solid var(--gold); }
.olt-cert .ct { position:absolute; inset:14mm 26mm 31mm; display:flex; flex-direction:column; align-items:center; }
.olt-cert .brasao { height:44mm; margin-top:1mm; }
.olt-cert h1 { font-family:"OltPlayfair",serif; font-weight:700; color:var(--navy); font-size:40pt; letter-spacing:0.28em; margin-top:3mm; margin-right:-0.28em; line-height:1; }
.olt-cert .tipo { display:flex; align-items:center; gap:4mm; margin-top:2.5mm; font-weight:800; color:var(--gold-dark); font-size:11.5pt; letter-spacing:0.35em; text-transform:uppercase; }
.olt-cert .tipo::before, .olt-cert .tipo::after { content:""; width:22mm; height:0.3mm; background:var(--gold); }
.olt-cert .tipo span { margin-right:-0.35em; }
.olt-cert .cert-p { margin-top:5mm; font-size:12.5pt; }
.olt-cert .nome { font-family:"OltVibes",cursive; color:var(--navy); line-height:1.15; margin-top:0.5mm; padding:0 10mm 1mm; border-bottom:0.35mm solid var(--gold); min-width:150mm; max-width:235mm; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.olt-cert .texto { margin-top:4.5mm; max-width:205mm; font-size:12.5pt; line-height:1.6; }
.olt-cert .texto strong { color:var(--navy); font-weight:800; }
.olt-cert .casa { font-weight:800; color:var(--navy); letter-spacing:0.04em; }
.olt-cert .rodape { margin-top:auto; width:100%; display:grid; grid-template-columns:1fr auto 1fr; align-items:end; gap:10mm; }
.olt-cert .ass { padding:0 6mm; position:relative; }
.olt-cert .ass-img { position:absolute; left:50%; bottom:calc(100% - 13mm); transform:translateX(-50%); height:22mm; max-width:80mm; object-fit:contain; pointer-events:none; }
.olt-cert .ass-space { height:12mm; }
.olt-cert .linha { height:0.3mm; background:var(--navy); opacity:0.7; margin-bottom:1.8mm; }
.olt-cert .nome-ass { font-weight:800; color:var(--navy); font-size:10.5pt; }
.olt-cert .cargo { font-size:9pt; color:var(--gold-dark); font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-top:0.5mm; }
.olt-cert .selo { width:30mm; height:30mm; margin-bottom:-2mm; }
.olt-cert .base { position:absolute; left:17mm; right:17mm; bottom:14mm; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; }
.olt-cert .verif { justify-self:end; display:flex; align-items:center; gap:2.5mm; text-align:left; }
.olt-cert .verif img { width:15mm; height:15mm; }
.olt-cert .verif p, .olt-cert .emissao { font-size:6.8pt; line-height:1.45; color:#6b6358; text-align:left; }
.olt-cert .verif b, .olt-cert .emissao b { color:var(--navy); }
.olt-cert .lema { font-size:7.5pt; letter-spacing:0.25em; color:var(--gold-dark); font-weight:700; text-transform:uppercase; }
.olt-cert .lema i { font-style:normal; color:var(--gold); padding:0 2mm; }
`;

function nameSize(name: string) {
  const n = name.length;
  if (n <= 24) return "46pt";
  if (n <= 32) return "40pt";
  if (n <= 40) return "34pt";
  return "29pt";
}

function issuedText(iso: string) {
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, "0");
  return formatLongDate(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
}

/** Arte do certificado em tamanho real (A4 paisagem). */
export const CertificateArt = forwardRef<HTMLDivElement, { cert: CertificateData }>(
  function CertificateArt({ cert }, ref) {
    const [qr, setQr] = useState("");
    useEffect(() => {
      void QRCode.toDataURL(certificateUrl(cert.code), {
        margin: 0,
        width: 220,
        color: { dark: "#0b326b", light: "#00000000" },
      }).then(setQr);
    }, [cert.code]);

    const oficina = cert.kind === "oficina";
    const dataTexto = `${oficina ? "realizada" : "finalizado"} em ${formatLongDate(cert.completed_on)}`;

    return (
      <div ref={ref} className="olt-cert" data-cert-art>
        <style>{CSS}</style>
        <svg className="graf" viewBox="0 0 297 210" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" stroke="#C9A04A" strokeOpacity="0.22" strokeWidth="0.5">
            <circle cx="12" cy="214" r="22" />
            <circle cx="12" cy="214" r="30" />
            <circle cx="12" cy="214" r="38" />
            <circle cx="12" cy="214" r="46" />
            <circle cx="292" cy="-4" r="22" />
            <circle cx="292" cy="-4" r="30" />
            <circle cx="292" cy="-4" r="38" />
            <path d="M18 40 q16 -14 34 0 q-16 14 -34 0 z M52 40 l9 -7 v14 z" />
            <path d="M26 36 l3 4 l-3 4 M33 34 l3 6 l-3 6 M40 35 l3 5 l-3 5" />
            <circle cx="47" cy="38.5" r="0.9" />
            <path d="M279 170 q-16 -14 -34 0 q16 14 34 0 z M245 170 l-9 -7 v14 z" />
            <path d="M271 166 l-3 4 l3 4 M264 164 l-3 6 l3 6 M257 165 l-3 5 l3 5" />
            <circle cx="250" cy="168.5" r="0.9" />
          </g>
          <g fill="#C9A04A" fillOpacity="0.16">
            <polygon points="232,196 238,186 244,196" />
            <polygon points="246,196 252,186 258,196" />
            <polygon points="260,196 266,186 272,196" />
            <polygon points="274,196 280,186 286,196" />
            <polygon points="11,14 17,24 23,14" />
            <polygon points="25,14 31,24 37,14" />
            <polygon points="39,14 45,24 51,14" />
          </g>
          <g fill="none" stroke="#0b326b" strokeOpacity="0.10" strokeWidth="0.5">
            <path d="M16 70 l4 5 l-4 5 l4 5 l-4 5 l4 5 l-4 5 l4 5 l-4 5 l4 5 l-4 5 l4 5 l-4 5 l4 5" />
            <path d="M281 70 l-4 5 l4 5 l-4 5 l4 5 l-4 5 l4 5 l-4 5 l4 5 l-4 5 l4 5 l-4 5 l4 5 l-4 5" />
          </g>
          <g fill="#C9A04A">
            <rect x="8.2" y="8.2" width="4" height="4" transform="rotate(45 10.2 10.2)" />
            <rect x="284.8" y="8.2" width="4" height="4" transform="rotate(45 286.8 10.2)" />
            <rect x="8.2" y="197.8" width="4" height="4" transform="rotate(45 10.2 199.8)" />
            <rect x="284.8" y="197.8" width="4" height="4" transform="rotate(45 286.8 199.8)" />
          </g>
        </svg>
        <div className="m1" />
        <div className="m2" />
        <div className="m3" />

        <div className="ct">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brasao" src={BRASAO_SRC} alt="Brasão Ilé Olóròkè Àṣẹ Olómi Tútù" />
          <h1>CERTIFICADO</h1>
          <div className="tipo">
            <span>de {oficina ? "Participação" : "Conclusão"}</span>
          </div>
          <p className="cert-p">Certificamos que</p>
          <div className="nome" style={{ fontSize: nameSize(cert.printed_name) }}>
            {cert.printed_name}
          </div>
          <p className="texto">
            {oficina ? "participou da oficina" : "concluiu o curso"} <strong>{cert.title}</strong>,{" "}
            {dataTexto}, na modalidade {MODALITY_LABEL[cert.modality].toLowerCase()}
            {cert.workload ? (
              <>
                , com carga horária de <strong>{cert.workload}</strong>
              </>
            ) : null}
            , no <span className="casa">Ilé Olóròkè Àṣẹ Olómi&nbsp;Tútù</span>.
          </p>

          <div className="rodape">
            <div className="ass">
              {cert.signature_data_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="ass-img" src={cert.signature_data_url} alt="" />
              ) : null}
              <div className="ass-space" />
              <div className="linha" />
              <div className="nome-ass">{cert.signer_name}</div>
              <div className="cargo">{cert.signer_title}</div>
            </div>

            <svg className="selo" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <radialGradient id={`g-${cert.code}`} cx="40%" cy="35%" r="70%">
                  <stop offset="0" stopColor="#F3D27A" />
                  <stop offset="0.6" stopColor="#D6A845" />
                  <stop offset="1" stopColor="#A97D2C" />
                </radialGradient>
                <path id={`arco-${cert.code}`} d="M50 16 a34 34 0 1 1 -0.01 0" />
              </defs>
              <polygon
                fill={`url(#g-${cert.code})`}
                points="50,2 56,10 66,5 69,15 79,14 78,24 88,27 83,36 91,42 84,50 91,58 83,64 88,73 78,76 79,86 69,85 66,95 56,90 50,98 44,90 34,95 31,85 21,86 22,76 12,73 17,64 9,58 16,50 9,42 17,36 12,27 22,24 21,14 31,15 34,5 44,10"
              />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#FFF4D6" strokeWidth="1" opacity="0.8" />
              <circle cx="50" cy="50" r="27" fill="none" stroke="#FFF4D6" strokeWidth="0.8" opacity="0.8" />
              <text fontFamily="OltNunito" fontWeight="800" fontSize="6.4" fill="#FFF8E6" letterSpacing="0.9">
                <textPath href={`#arco-${cert.code}`} startOffset="50%" textAnchor="middle" textLength="205">
                  TRADIÇÃO · CONHECIMENTO · ACOLHIMENTO ·
                </textPath>
              </text>
              <text x="50" y="47" textAnchor="middle" fontFamily="OltPlayfair" fontWeight="700" fontSize="11" fill="#0b326b">
                OLÓMI
              </text>
              <text x="50" y="59" textAnchor="middle" fontFamily="OltPlayfair" fontWeight="700" fontSize="11" fill="#0b326b">
                TÚTÙ
              </text>
            </svg>

            <div className="ass">
              <div className="ass-space" />
              <div className="linha" />
              <div className="nome-ass">{cert.second_signer_label}</div>
              <div className="cargo">Ilé Olóròkè Àṣẹ Olómi Tútù</div>
            </div>
          </div>
        </div>

        <div className="base">
          <div className="emissao">
            Emitido em <b>{issuedText(cert.issued_at)}</b>
            <br />
            pelo aplicativo Olómi Tútù
          </div>
          <div className="lema">
            Tradição<i>•</i>Conhecimento<i>•</i>Acolhimento
          </div>
          <div className="verif">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code de verificação" />
            ) : (
              <span style={{ width: "15mm", height: "15mm", display: "inline-block" }} />
            )}
            <p>
              Código de verificação
              <br />
              <b>{cert.code}</b>
              <br />
              Escaneie para validar
            </p>
          </div>
        </div>
      </div>
    );
  },
);

/** Certificado que se ajusta à largura da tela (celular, tablet e notebook). */
export function ScaledCertificate({
  cert,
  artRef,
}: {
  cert: CertificateData;
  artRef?: React.Ref<HTMLDivElement>;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / CERT_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden rounded-xl shadow-[0_8px_30px_rgba(11,50,107,0.18)]"
      style={{ aspectRatio: `${CERT_W} / ${CERT_H}` }}
    >
      <div
        style={{
          width: CERT_W,
          height: CERT_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        <CertificateArt ref={artRef} cert={cert} />
      </div>
    </div>
  );
}

async function renderPng(node: HTMLElement) {
  const { toPng } = await import("html-to-image");
  if (document.fonts?.ready) await document.fonts.ready;
  // 1ª chamada aquece fontes/imagens embutidas (Safari)
  await toPng(node, { pixelRatio: 1, cacheBust: true }).catch(() => undefined);
  return toPng(node, { pixelRatio: 2.5, cacheBust: true, width: CERT_W, height: CERT_H });
}

function fileBase(cert: CertificateData) {
  const slug = cert.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `certificado-${slug || "olomi-tutu"}-${cert.code}`;
}

export async function downloadCertificatePdf(node: HTMLElement, cert: CertificateData) {
  const png = await renderPng(node);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.addImage(png, "PNG", 0, 0, 297, 210);
  pdf.setProperties({ title: `Certificado — ${cert.title}`, author: "Ilé Olóròkè Àṣẹ Olómi Tútù" });
  pdf.save(`${fileBase(cert)}.pdf`);
}

export async function downloadCertificatePng(node: HTMLElement, cert: CertificateData) {
  const png = await renderPng(node);
  const a = document.createElement("a");
  a.href = png;
  a.download = `${fileBase(cert)}.png`;
  a.click();
}

/** Compartilha a imagem (celular) ou o link de verificação. */
export async function shareCertificate(node: HTMLElement, cert: CertificateData) {
  const url = certificateUrl(cert.code);
  const text = `Meu certificado de ${cert.kind === "oficina" ? "participação" : "conclusão"} — ${cert.title} · Ilé Olóròkè Àṣẹ Olómi Tútù`;
  try {
    const png = await renderPng(node);
    const blob = await (await fetch(png)).blob();
    const file = new File([blob], `${fileBase(cert)}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Certificado", text: `${text}\n${url}` });
      return "shared";
    }
  } catch {
    /* segue para link */
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: "Certificado", text, url });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  await navigator.clipboard?.writeText(url);
  return "copied";
}
