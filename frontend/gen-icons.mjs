import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateIcons() {
  try {
    const inputSvg = path.join(__dirname, 'public', 'favicon.svg');
    const icon192 = path.join(__dirname, 'public', 'icon-192.png');
    const icon512 = path.join(__dirname, 'public', 'icon-512.png');

    console.log('Generating 192x192 icon...');
    await sharp(inputSvg)
      .resize(192, 192)
      .png()
      .toFile(icon192);

    console.log('Generating 512x512 icon...');
    await sharp(inputSvg)
      .resize(512, 512)
      .png()
      .toFile(icon512);

    console.log('Successfully generated PWA PNG icons from favicon.svg!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
