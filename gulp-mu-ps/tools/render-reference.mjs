// Renders mups-reference.psd into a directory mirroring examples/reference/out/.
// Usage: node tools/render-reference.mjs [outputDir]

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ReferenceRenderer } from "../src/creators/ReferenceRenderer.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const psdFile = join(here, "../examples/drafts/mups-reference.psd");
const defaultOut = join(here, "../test/.tmp-mups-reference");
const outDir = process.argv[2] ? process.argv[2] : defaultOut;

if (!existsSync(psdFile)) {
	console.error("mups-reference.psd not found. Run build-mups-reference.jsx in Photoshop first.");
	console.error(psdFile);
	process.exit(1);
}

const files = await ReferenceRenderer.RenderAll(psdFile, outDir, { retina: false });
console.log(`Rendered ${files.length} PNG(s) -> ${outDir}`);
