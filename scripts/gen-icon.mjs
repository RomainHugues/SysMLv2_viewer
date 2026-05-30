// Rasterize icons/logo.svg into a 256x256 PNG used as the extension/VSIX icon.
//   node scripts/gen-icon.mjs
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");

await sharp(path.join(repo, "icons/logo.svg"))
  .resize(256, 256)
  .png()
  .toFile(path.join(repo, "icons/icon.png"));

console.log("[icon] wrote icons/icon.png (256x256)");
