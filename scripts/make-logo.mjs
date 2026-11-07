/**
 * Gera ícones/PWA a partir do brasão oficial (com leão).
 * Não recria a logo SVG antiga sem leão.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const publicDir = path.resolve("public");
const crest = path.join(publicDir, "brasao-designer.png");
const NAVY = { r: 0x0b, g: 0x34, b: 0x75, alpha: 1 };

if (!fs.existsSync(crest)) {
  console.error("Missing public/brasao-designer.png");
  process.exit(1);
}

const crestTrimmed = await sharp(crest).trim().png().toBuffer();

async function makeIcon(size, out, pad = 0.08) {
  const inner = Math.round(size * (1 - pad * 2));
  const img = await sharp(crestTrimmed)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: img, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote", path.basename(out));
}

await makeIcon(192, path.join(publicDir, "icon-192.png"), 0.08);
await makeIcon(512, path.join(publicDir, "icon-512.png"), 0.06);
await makeIcon(180, path.join(publicDir, "apple-touch-icon.png"), 0.08);

const crestBuf = await sharp(crestTrimmed)
  .resize(460, 460, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: NAVY } })
  .composite([{ input: crestBuf, gravity: "center" }])
  .jpeg({ quality: 92 })
  .toFile(path.join(publicDir, "logo.jpg"));
await sharp(path.join(publicDir, "logo.jpg")).webp({ quality: 90 }).toFile(path.join(publicDir, "logo.webp"));

const splashW = 1080;
const splashH = 1920;
const crestH = Math.round(splashW * 0.52);
const splashCrest = await sharp(crestTrimmed)
  .resize(crestH, crestH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await sharp({ create: { width: splashW, height: splashH, channels: 4, background: NAVY } })
  .composite([{ input: splashCrest, gravity: "center" }])
  .png()
  .toFile(path.join(publicDir, "splash.png"));

fs.writeFileSync(
  path.join(publicDir, "manifest.webmanifest"),
  JSON.stringify(
    {
      name: "ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ",
      short_name: "OLÓMÌ TÚTÙ",
      description: "Gestão e organização do barracão",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#0B3475",
      theme_color: "#0B3475",
      lang: "pt-BR",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    null,
    2,
  ),
);

console.log("icons + splash + manifest updated from brasao-designer.png");
