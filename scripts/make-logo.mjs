import fs from "fs";
import path from "path";

const publicDir = path.resolve("public");
fs.mkdirSync(publicDir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#153f8a"/>
      <stop offset="100%" stop-color="#0a2f6e"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="48" fill="url(#g)"/>
  <circle cx="256" cy="210" r="78" fill="none" stroke="#d4a017" stroke-width="10"/>
  <circle cx="256" cy="210" r="28" fill="#1f7a3a"/>
  <text x="256" y="340" text-anchor="middle" fill="#f7f3e8" font-family="Georgia, serif" font-size="28" font-weight="700">ILÉ OLÓRÒKÈ ÀṢẸ</text>
  <text x="256" y="378" text-anchor="middle" fill="#e8bc3a" font-family="Georgia, serif" font-size="20">OLÓMÌ TÚTÙ</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, "logo.svg"), svg);

try {
  const sharp = (await import("sharp")).default;
  if (fs.existsSync(path.join(publicDir, "logo.webp"))) {
    await sharp(path.join(publicDir, "logo.webp")).jpeg({ quality: 92 }).toFile(path.join(publicDir, "logo.jpg"));
    console.log("Converted logo.webp -> logo.jpg");
  } else {
    await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(path.join(publicDir, "logo.jpg"));
    console.log("Generated logo.jpg from SVG");
  }
} catch (e) {
  console.log("sharp unavailable:", e.message);
  if (!fs.existsSync(path.join(publicDir, "logo.jpg")) && fs.existsSync(path.join(publicDir, "logo.webp"))) {
    // fallback: BrandMark can use webp; keep copy note
    console.log("Keep logo.webp; update BrandMark if jpg missing");
  }
}

fs.writeFileSync(
  path.join(publicDir, "manifest.webmanifest"),
  JSON.stringify(
    {
      name: "ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ",
      short_name: "ILÉ OLÓRÒKÈ",
      description: "Gestão e organização do barracão",
      start_url: "/",
      display: "standalone",
      background_color: "#0A2F6E",
      theme_color: "#0A2F6E",
      lang: "pt-BR",
      icons: [{ src: "/logo.jpg", sizes: "512x512", type: "image/jpeg", purpose: "any" }],
    },
    null,
    2,
  ),
);

console.log({
  jpg: fs.existsSync(path.join(publicDir, "logo.jpg")),
  webp: fs.existsSync(path.join(publicDir, "logo.webp")),
  svg: fs.existsSync(path.join(publicDir, "logo.svg")),
});
