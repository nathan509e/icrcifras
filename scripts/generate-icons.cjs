const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const INPUT_LOGO = path.join(__dirname, '../public/logo.png')
const OUTPUT_DIR = path.join(__dirname, '../public')

async function generateIcons() {
  if (!fs.existsSync(INPUT_LOGO)) {
    console.error('Source logo.png not found at:', INPUT_LOGO)
    process.exit(1)
  }

  const sizes = [192, 512]

  for (const size of sizes) {
    const outputPath = path.join(OUTPUT_DIR, `pwa-${size}x${size}.png`)
    await sharp(INPUT_LOGO)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath)
    console.log(`Generated ${outputPath}`)
  }

  // Generate apple-touch-icon (180x180 is the standard size for iOS)
  const appleIconPath = path.join(OUTPUT_DIR, 'apple-touch-icon.png')
  await sharp(INPUT_LOGO)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile(appleIconPath)
  console.log(`Generated ${appleIconPath}`)

  console.log('All icons generated successfully!')
}

generateIcons().catch(console.error)