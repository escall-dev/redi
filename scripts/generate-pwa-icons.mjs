import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"

const ICONS_DIR = path.resolve(process.cwd(), "public/icons")
const SOURCE_SVG = path.resolve(process.cwd(), "public/icon.svg")
const APPLE_ICON = path.resolve(process.cwd(), "app/apple-icon.png")

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true })
}

async function generateIcons() {
  console.log("Generating PWA icons from", SOURCE_SVG)

  // 1. icon-192.png
  await sharp(SOURCE_SVG)
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, "icon-192.png"))
  console.log("✓ Created public/icons/icon-192.png (192x192)")

  // 2. icon-512.png
  await sharp(SOURCE_SVG)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, "icon-512.png"))
  console.log("✓ Created public/icons/icon-512.png (512x512)")

  // 3. icon-maskable-512.png
  const emblemBuffer = await sharp(SOURCE_SVG)
    .resize(400, 400)
    .toBuffer()

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: emblemBuffer, top: 56, left: 56 }])
    .png()
    .toFile(path.join(ICONS_DIR, "icon-maskable-512.png"))
  console.log("✓ Created public/icons/icon-maskable-512.png (512x512 maskable)")

  // 4. app/apple-icon.png (180x180)
  await sharp(SOURCE_SVG)
    .resize(180, 180)
    .png()
    .toFile(APPLE_ICON)
  console.log("✓ Created app/apple-icon.png (180x180)")
}

generateIcons().catch((err) => {
  console.error("Failed to generate icons:", err)
  process.exit(1)
})
