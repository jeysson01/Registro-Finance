import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceCandidates = [path.join(root, "CF.png"), path.join(root, "public/icons/cf.png")];
const source = sourceCandidates.find((file) => {
  try {
    readFileSync(file);
    return true;
  } catch {
    return false;
  }
});

if (!source) {
  throw new Error("No encontré CF.png en la raíz ni en public/icons/cf.png");
}

const iconsDir = path.join(root, "public/icons");
mkdirSync(iconsDir, { recursive: true });

const master = path.join(iconsDir, "cf.png");
if (source !== master) {
  writeFileSync(master, readFileSync(source));
}

async function png(size, file) {
  await sharp(master).resize(size, size, { fit: "cover" }).png().toFile(path.join(iconsDir, file));
}

async function maskable() {
  const size = 512;
  const inner = Math.round(size * 0.8);
  const logo = await sharp(master)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#F9FAFB" },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(iconsDir, "icon-maskable-512.png"));
}

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

await png(192, "icon-192.png");
await png(512, "icon-512.png");
await png(180, "apple-touch-icon.png");
await maskable();

const png16 = await sharp(master).resize(16, 16).png().toBuffer();
const png32 = await sharp(master).resize(32, 32).png().toBuffer();
writeFileSync(path.join(root, "public/favicon.ico"), ico([
  { size: 16, data: png16 },
  { size: 32, data: png32 },
]));
writeFileSync(path.join(root, "app/icon.png"), await sharp(master).resize(512, 512).png().toBuffer());
writeFileSync(path.join(root, "app/apple-icon.png"), await sharp(master).resize(180, 180).png().toBuffer());

const original = path.join(root, "CF.png");
if (source === original) rmSync(original);

console.log("Íconos generados desde", source);
