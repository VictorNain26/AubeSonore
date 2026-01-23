const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '../assets/images/logo.jpg');
const OUTPUT_DIR = path.join(__dirname, '../assets/images');

async function generateIcons() {
  // Check source exists
  if (!fs.existsSync(SOURCE)) {
    console.error('Source logo not found:', SOURCE);
    process.exit(1);
  }

  const metadata = await sharp(SOURCE).metadata();
  console.log(`Source: ${metadata.width}x${metadata.height} ${metadata.format}`);

  // 1. App Icon (1024x1024 PNG, square, filled)
  console.log('Generating icon.png (1024x1024)...');
  await sharp(SOURCE)
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'icon.png'));

  // 2. Adaptive Icon Foreground (1024x1024 PNG)
  // For adaptive icons, the foreground should be centered with padding
  // The safe zone is 66% of the total size (center 66%)
  console.log('Generating adaptive-icon.png (1024x1024 with padding)...');
  const iconSize = 1024;
  const safeZone = Math.floor(iconSize * 0.66);

  await sharp(SOURCE)
    .resize(safeZone, safeZone, { fit: 'cover' })
    .extend({
      top: Math.floor((iconSize - safeZone) / 2),
      bottom: Math.ceil((iconSize - safeZone) / 2),
      left: Math.floor((iconSize - safeZone) / 2),
      right: Math.ceil((iconSize - safeZone) / 2),
      background: { r: 15, g: 17, b: 24, alpha: 1 }, // #0f1118
    })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'adaptive-icon.png'));

  // 3. Splash Icon (1024x1024 PNG, centered logo)
  console.log('Generating splash-icon.png (1024x1024)...');
  const splashIconSize = 512; // Logo size on splash

  await sharp(SOURCE)
    .resize(splashIconSize, splashIconSize, { fit: 'cover' })
    .extend({
      top: Math.floor((iconSize - splashIconSize) / 2),
      bottom: Math.ceil((iconSize - splashIconSize) / 2),
      left: Math.floor((iconSize - splashIconSize) / 2),
      right: Math.ceil((iconSize - splashIconSize) / 2),
      background: { r: 15, g: 17, b: 24, alpha: 1 }, // #0f1118
    })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'splash-icon.png'));

  // 4. Favicon (48x48 PNG)
  console.log('Generating favicon.png (48x48)...');
  await sharp(SOURCE)
    .resize(48, 48, { fit: 'cover' })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'favicon.png'));

  console.log('Done! All icons generated.');
}

generateIcons().catch(console.error);
