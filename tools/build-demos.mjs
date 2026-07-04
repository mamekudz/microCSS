// Builds the µCSS marketing demos (glittery + flyex + buttons) into each demo's dist/ folder.
//
// Usage: node tools/build-demos.mjs
//        npx gulp BUILD_DEMOS   (µGulp dashboard or CLI)

import { join, dirname, resolve } from "node:path";
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

export const DEMOS = [
	{ id: "glittery", manifest: _FindManifest(join(repoRoot, "demos", "glittery"), "glittery") },
	{ id: "flyex", manifest: _FindManifest(join(repoRoot, "demos", "flyex"), "flyex") },
	{ id: "buttons", manifest: _FindManifest(join(repoRoot, "demos", "buttons"), "buttons") }
];

export function CheckDemoAssets() {
	const glitterDir = join(repoRoot, "demos", "glittery", "dev", "media", "raw", "glittery", "imgs");
	const buttonsPsd = join(repoRoot, "demos", "buttons", "dev", "media", "drafts", "buttons.psd");
	if (!existsSync(glitterDir)) {
		throw new Error(
			"Demo assets missing. Place raw frames under demos/*/dev/media/ (see demos/README.md)."
		);
	}
	if (!existsSync(buttonsPsd)) {
		throw new Error(
			`buttons.psd missing: ${buttonsPsd}\n`
			+ "Copy from gulp-mu-ps/examples/drafts/buttons.psd (same file as the µCSS 1 sample)."
		);
	}
	if (!existsSync(legacyRoot)) {
		console.warn("oldsrcs/LegacySkinExtract not found — assuming demo assets were copied manually.");
	}
}

/**
 * @param {object} [_options]
 * @param {boolean | object} [_options.debug] forwarded to BuildSkin()
 * @param {(value: number, label?: string) => void} [_options.onProgress]
 * @param {(demoId: string, report: object) => void} [_options.onDemoBuilt]
 * @param {(message: string) => void} [_options.log]
 */
export async function BuildDemos(_options = {}) {
	CheckDemoAssets();
	const log = _options.log ?? ((line) => console.log(line));
	for (let index = 0; index < DEMOS.length; index++) {
		const demo = DEMOS[index];
		if (!existsSync(demo.manifest)) {
			throw new Error(`manifest not found: ${demo.manifest}`);
		}
		const demoRoot = dirname(demo.manifest);
		const outputDir = join(demoRoot, "dist");
		_options.onProgress?.(index / DEMOS.length, demo.id);
		log(`\n=== ${demo.id} ===`);
		const buildOptions = { rootDir: demoRoot, outputDir, force: false };
		if (_options.debug) buildOptions.debug = _options.debug;
		const report = await BuildSkin(demo.manifest, buildOptions);
		log(`  css: ${join(outputDir, "demo.css")}`);
		if (report.sounds?.length) {
			log(`  sounds: ${report.sounds[0].sounds.join(", ")} (${report.sounds[0].skipped ? "cached" : "built"})`);
		}
		if (report.atlas) {
			const count = Object.keys(report.atlas.atlas?.sprites ?? {}).length;
			log(`  atlas: ${report.atlas.skipped ? "cached" : "built"} (${count} sprites)`);
		}
		_options.onDemoBuilt?.(demo.id, report);
	}
	_options.onProgress?.(1, "done");
	log("\nDone. Open demos/glittery/, demos/flyex/, or demos/buttons/ (via a local static server).");
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
	BuildDemos().catch((_error) => {
		console.error(_error);
		process.exit(1);
	});
}
