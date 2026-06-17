// Builds the µCSS marketing demos (glittery + flyex) into each demo's dist/ folder.
//
// Usage: node tools/build-demos.mjs
//        npx gulp demos:build

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync } from "node:fs";
import { BuildSkin } from "../gulp-mu-css/src/index.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const legacyRoot = join(repoRoot, "oldsrcs", "LegacySkinExtract");

function _FindManifest(_demoDir, _stem) {
	const match = readdirSync(_demoDir).find(
		(_name) => _name.startsWith(`${_stem}.`) && _name.endsWith("css.mjs")
	);
	if (!match) {
		throw new Error(`No manifest matching ${_stem}.*css.mjs in ${_demoDir}`);
	}
	return join(_demoDir, match);
}

const DEMOS = [
	{ id: "glittery", manifest: _FindManifest(join(repoRoot, "demos", "glittery"), "glittery") },
	{ id: "flyex", manifest: _FindManifest(join(repoRoot, "demos", "flyex"), "flyex") },
	{ id: "buttons", manifest: _FindManifest(join(repoRoot, "demos", "buttons"), "buttons") }
];

function _CheckAssets() {
	const glitterDir = join(repoRoot, "demos", "glittery", "dev", "media", "raw", "glittery", "imgs");
	const buttonsPsd = join(repoRoot, "demos", "buttons", "dev", "media", "drafts", "buttons.psd");
	if (!existsSync(glitterDir)) {
		console.error("Demo assets missing. Run demos:build after placing raw frames under demos/*/dev/media/ (see demos/README.md).");
		process.exit(1);
	}
	if (!existsSync(buttonsPsd)) {
		console.error(`buttons.psd missing: ${buttonsPsd}`);
		console.error("Copy from gulp-mu-ps/examples/drafts/buttons.psd (same file as the µCSS 1 sample).");
		process.exit(1);
	}
	if (!existsSync(legacyRoot)) {
		console.warn("oldsrcs/LegacySkinExtract not found — assuming demo assets were copied manually.");
	}
}

async function _BuildDemo(_demo) {
	const demoRoot = dirname(_demo.manifest);
	const outputDir = join(demoRoot, "dist");
	console.log(`\n=== ${_demo.id} ===`);
	const report = await BuildSkin(_demo.manifest, { rootDir: demoRoot, outputDir, force: false });
	console.log(`  css: ${join(outputDir, "demo.css")}`);
	if (report.sounds?.length) {
		console.log(`  sounds: ${report.sounds[0].sounds.join(", ")} (${report.sounds[0].skipped ? "cached" : "built"})`);
	}
	if (report.atlas) {
		console.log(`  atlas: ${report.atlas.skipped ? "cached" : "built"} (${Object.keys(report.atlas.atlas?.sprites ?? {}).length} sprites)`);
	}
}

async function _Main() {
	_CheckAssets();
	for (const demo of DEMOS) {
		if (!existsSync(demo.manifest)) {
			console.error(`manifest not found: ${demo.manifest}`);
			process.exit(1);
		}
		await _BuildDemo(demo);
	}
	console.log("\nDone. Open demos/glittery/, demos/flyex/, or demos/buttons/ (via a local static server).");
}

_Main().catch((_error) => {
	console.error(_error);
	process.exit(1);
});
