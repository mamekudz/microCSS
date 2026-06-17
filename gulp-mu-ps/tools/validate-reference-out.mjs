// Flags reference PNGs that are empty or nearly transparent (stale/broken export).
// Usage: node tools/validate-reference-out.mjs

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outRoot = join(here, "../examples/reference/out");

const MIN_BYTES = 7000;
const MIN_AVG_ALPHA = 1;

function* WalkPngs(_dir, _base) {
	if (!existsSync(_dir)) return;
	for (const name of readdirSync(_dir)) {
		const path = join(_dir, name);
		if (statSync(path).isDirectory()) {
			if (name === "overview") continue;
			yield* WalkPngs(path, _base);
		} else if (name.endsWith(".png")) {
			yield path.slice(_base.length + 1).replace(/\\/g, "/");
		}
	}
}

async function ValidateReferenceOut() {
	const bad = [];
	let ok = 0;
	for (const rel of WalkPngs(outRoot, outRoot)) {
		const path = join(outRoot, rel);
		const bytes = statSync(path).size;
		const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		const n = info.width * info.height;
		let alphaSum = 0;
		for (let i = 0; i < n; i++) alphaSum += data[i * info.channels + (info.channels - 1)];
		const avgAlpha = alphaSum / n;
		const minBytes = Math.min(MIN_BYTES, Math.max(500, Math.floor(n * 0.4)));
		if (bytes < minBytes || avgAlpha < MIN_AVG_ALPHA) {
			bad.push({ rel, bytes, avgAlpha: avgAlpha.toFixed(2) });
		} else {
			ok++;
		}
	}
	if (bad.length === 0) {
		console.log(`OK: ${ok} reference PNG(s) look valid.`);
		return;
	}
	console.log(`WARN: ${bad.length} suspicious PNG(s) (${ok} OK):\n`);
	for (const item of bad) {
		console.log(`  ${item.rel}  ${item.bytes} bytes  avgAlpha=${item.avgAlpha}`);
	}
	console.log("\nRe-run export-mups-reference.jsx in Photoshop (full run, do not stop early).");
	process.exit(1);
}

await ValidateReferenceOut();
