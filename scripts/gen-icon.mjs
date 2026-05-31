// Resize the CELERIS logo (celeris.png) into the 256x256 PNG used as the
// extension/VSIX icon.
//   node scripts/gen-icon.mjs
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");

await sharp(path.join(repo, "celeris.png"))
  .resize(256, 256, { fit: "cover", position: "centre" })
  .png()
  .toFile(path.join(repo, "icons/icon.png"));

console.log("[icon] wrote icons/icon.png (256x256) from celeris.png");
