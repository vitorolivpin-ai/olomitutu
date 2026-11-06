/**
 * Helpers de Pix da casa (chave única + QR visual).
 * Não é EMV completo de PSP — gera payload simples + QR SVG para exibição.
 */

export function buildPixCopyPaste(input: {
  key: string;
  holderName?: string;
  amount?: number;
  description?: string;
}) {
  const key = input.key.trim();
  const name = (input.holderName ?? "ILE OLOROKE ASE").slice(0, 25);
  const amount =
    typeof input.amount === "number" && input.amount > 0
      ? input.amount.toFixed(2)
      : "";
  const desc = (input.description ?? "Loja").slice(0, 40);
  // Payload demonstrativo legível (chave + valor) para copiar
  return [
    "000201",
    "26580014BR.GOV.BCB.PIX",
    `01${String(key.length).padStart(2, "0")}${key}`,
    "52040000",
    "5303986",
    amount ? `54${String(amount.length).padStart(2, "0")}${amount}` : "",
    "5802BR",
    `59${String(name.length).padStart(2, "0")}${name}`,
    "6009SAO PAULO",
    `62${String(4 + desc.length).padStart(2, "0")}05${String(desc.length).padStart(2, "0")}${desc}`,
    "6304CASA",
  ]
    .filter(Boolean)
    .join("");
}

export function pixQrDataUrl(copyPaste: string, label?: string) {
  const caption = encodeURIComponent(label ?? "PIX");
  // QR visual (placeholder em grade) — o valor real está no copia-e-cola
  const cells: string[] = [];
  let h = 0;
  for (let i = 0; i < copyPaste.length; i++) h = (h * 31 + copyPaste.charCodeAt(i)) >>> 0;
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const finder =
        (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const bit = ((h >> ((x * 3 + y) % 16)) & 1) === 1;
      if (finder || bit) {
        cells.push(
          `<rect x="${20 + x * 8}" y="${20 + y * 8}" width="7" height="7" fill="#0B1F3A"/>`,
        );
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="240" viewBox="0 0 220 240">
  <rect width="220" height="240" fill="#fff"/>
  ${cells.join("")}
  <text x="110" y="228" text-anchor="middle" font-size="11" fill="#0B1F3A" font-family="sans-serif">${caption}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
