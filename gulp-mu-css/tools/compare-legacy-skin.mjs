// M5 acceptance test: builds a converted legacy µCSS 1 skin with the new
// microCSS pipeline and compares the generated CSS structurally against the
// legacy compiled output (skins/std/std.css and friends).
//
// The comparison is rule/property based, with normalizations for the known
// intentional differences:
//   - vendor-prefixed properties/values (dropped per CONCEPT.md, D6)
//   - cursor image-set() lines (new feature, old output had none)
//   - atlas-dependent background-position values (the new atlas packs
//     differently; values are masked as "@atlas" in sprite/keyframe rules)
//   - the div.csspreload rule (not present in the legacy build)
//
// Missing sprite source images (the extract is incomplete) are generated as
// transparent placeholders with the original dimensions from the legacy
// µ.std.css.cache, so width/height in the CSS still match.
//
// Usage: node tools/compare-legacy-skin.mjs [projectDir]

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import sharp from "sharp";
import { SequenceStrip } from "gulp-mu-ps";
import { BuildSkin } from "../src/index.mjs";
import { NormalizeLegacyGradients } from "../src/compile/Compiler.mjs";

sharp.cache(false);

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(here, process.argv[2] ?? "../../oldsrcs/LegacySkinExtract");
const oldSkinDir = join(projectDir, "skins/std");
const newSkinDir = join(projectDir, "skins/std-new");
const manifestFile = join(projectDir, "skins/src/std.µcss.mjs");
const legacyCacheFile = join(oldSkinDir, "µ.std.css.cache");

// Sequence-strip maps missing from the extract, reconstructed from the legacy
// std.css output (margins = -off/2, width/height = max/2, steps = cells).
// dsdSource points to the raw DSD image (project-relative): the real strip
// (1x + @2x + json map) is regenerated from it via microPS SequenceStrip -
// the dimensions match the legacy strips exactly, so the atlas layout and
// the rule comparison are unaffected. Synthetic map + transparent placeholder
// remain as fallback when the raw source is unavailable.
const SYNTHETIC_MAPS = {
	"imgs/general/gui/flyex/flyex.json": {
		frames: 23, cellW: 30, cellH: 30, dsdSource: "dev/media/raw/flyex/imgs/flyex.png",
		map: { info: { maxWidth: 60, maxHeight: 60, offX: 28, offY: 28 }, series: { standard: 0 }, sprites: [] }
	},
	"imgs/general/gui/flyex/flyexutils.json": {
		frames: 3, cellW: 42, cellH: 42, dsdSource: "dev/media/raw/flyex/imgs/flyexutils.png",
		map: { info: { maxWidth: 84, maxHeight: 84, offX: 76, offY: 58 }, series: { standard: 0 }, sprites: [] }
	}
};

function _RetinaUrl(_url) {
	const dot = _url.lastIndexOf(".");
	return dot < 0 ? `${_url}@2x` : `${_url.slice(0, dot)}@2x${_url.slice(dot)}`;
}

// Same recovery logic as in convert-mucss.mjs: Latin-1 fallback plus repair
// of files that contain literal U+FFFD where µ used to be.
function _ReadLegacy(_file) {
	const utf8 = readFileSync(_file, "utf8");
	if (!utf8.includes("\uFFFD")) return utf8;
	const latin1 = readFileSync(_file, "latin1");
	if (latin1.includes("ï¿½")) return utf8.replace(/\uFFFD/g, "µ");
	return latin1;
}

// ------------------------------------------------------------------ prepare

function _CopyTreeIfNewer(_sourceDir, _targetDir) {
	for (const entry of readdirSync(_sourceDir, { withFileTypes: true })) {
		const source = join(_sourceDir, entry.name);
		const target = join(_targetDir, entry.name);
		if (entry.isDirectory()) {
			_CopyTreeIfNewer(source, target);
		} else if (!existsSync(target) || statSync(target).mtimeMs < statSync(source).mtimeMs) {
			mkdirSync(dirname(target), { recursive: true });
			copyFileSync(source, target);
		}
	}
}

async function _Placeholder(_file, _width, _height) {
	if (existsSync(_file)) return false;
	mkdirSync(dirname(_file), { recursive: true });
	await sharp({ create: { width: _width, height: _height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
		.png().toFile(_file);
	return true;
}

// Regenerates a strip (1x + @2x + json map) from its raw DSD image via
// microPS - the extract lacks the generated final strips, but the raw DSD
// sources are still present. Returns false when the strip already exists
// or the raw source is unavailable.
async function _StripFromDsd(_stripFile, _dsdFile) {
	if (existsSync(_stripFile) || !existsSync(_dsdFile)) return false;
	mkdirSync(dirname(_stripFile), { recursive: true });
	await SequenceStrip.Create({ dsdImage: _dsdFile, outputFile: _stripFile, retina: true, writeMapFile: true });
	return true;
}

async function _PrepareNewSkin() {
	mkdirSync(newSkinDir, { recursive: true });
	_CopyTreeIfNewer(join(oldSkinDir, "imgs"), join(newSkinDir, "imgs"));
	_CopyTreeIfNewer(join(oldSkinDir, "fonts"), join(newSkinDir, "fonts"));

	// Sequence-strip maps for the M4 hooks (the legacy build copied only the
	// PNG files into the skin).
	const glitteryMap = join(projectDir, "dev/media/final/general/gui/glittery/glittery.json");
	const glitteryTarget = join(newSkinDir, "imgs/general/gui/glittery/glittery.json");
	if (existsSync(glitteryMap) && !existsSync(glitteryTarget)) copyFileSync(glitteryMap, glitteryTarget);

	// Every synthesized placeholder is reported individually so missing
	// sources (e.g. final strips never generated from dev/media/raw) are
	// visible instead of silently shipping transparent atlas cells.
	const placeholders = [];
	for (const [mapUrl, spec] of Object.entries(SYNTHETIC_MAPS)) {
		const stripUrl = mapUrl.replace(/\.json$/, ".png");
		const stripW = spec.frames * spec.cellW;
		// Prefer the real strip regenerated from the raw DSD source (writes
		// 1x, @2x and the json map); synthetic map plus transparent
		// placeholder are only the fallback when the raw source is missing.
		if (spec.dsdSource
			&& await _StripFromDsd(join(newSkinDir, stripUrl), join(projectDir, spec.dsdSource))) {
			console.log(`regenerated from raw DSD source: ${stripUrl}`);
		}
		const mapFile = join(newSkinDir, mapUrl);
		if (!existsSync(mapFile)) {
			mkdirSync(dirname(mapFile), { recursive: true });
			const sprites = Array.from({ length: spec.frames }, (_v, _i) =>
				[0, _i * spec.cellW * 2, spec.cellW * 2, spec.cellH * 2, 0, 0]);
			writeFileSync(mapFile, JSON.stringify({ ...spec.map, sprites }), "utf8");
		}
		if (await _Placeholder(join(newSkinDir, stripUrl), stripW, spec.cellH)) {
			placeholders.push(`${stripUrl} (sequence strip, ${spec.frames}x${spec.cellW}x${spec.cellH})`);
		}
		await _Placeholder(join(newSkinDir, _RetinaUrl(stripUrl)), stripW * 2, spec.cellH * 2);
	}

	// Placeholders for sprite sources missing from the extract, sized from
	// the legacy cache so the generated width/height properties still match.
	const legacySizes = JSON.parse(_ReadLegacy(legacyCacheFile)).images ?? {};
	for (const [url, info] of Object.entries(legacySizes)) {
		if (await _Placeholder(join(newSkinDir, url), info.width, info.height)) {
			placeholders.push(`${url} (${info.width}x${info.height}, size from legacy cache)`);
		}
		await _Placeholder(join(newSkinDir, _RetinaUrl(url)), info.width * 2, info.height * 2);
	}

	// Last resort for sprite URLs neither in the skin nor in the cache.
	// Comments are stripped so commented-out rules do not produce placeholders.
	const sourceDir = join(projectDir, "skins/src");
	for (const file of readdirSync(sourceDir).filter((_f) => _f.endsWith(".µ.css"))) {
		const text = readFileSync(join(sourceDir, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
		for (const match of text.matchAll(/Sprite\("([^"]+)"/g)) {
			const url = match[1];
			if (await _Placeholder(join(newSkinDir, url), 40, 40)) {
				placeholders.push(`${url} (40x40, no size info - guessed)`);
			}
			await _Placeholder(join(newSkinDir, _RetinaUrl(url)), 80, 80);
		}
	}
	if (placeholders.length) {
		console.warn(`WARN  ${placeholders.length} source image(s) missing from the extract - `
			+ "transparent placeholders (plus @2x) were generated:");
		for (const entry of placeholders.sort()) console.warn(`  - ${entry}`);
	}
}

// ------------------------------------------------------------- css flatten

function _NormalizeSelector(_selector) {
	return _selector.replace(/\s+/g, " ").replace(/\s*([>,+~])\s*/g, "$1").trim();
}

function _NormalizeValue(_value) {
	let value = _value.replace(/\s+/g, " ").trim();
	value = value.replace(/,\s+/g, ",");
	value = value.replace(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g, "url($1)");
	value = value.replace(/(^|\s|\()-0px/g, "$10px");
	value = value.replace(/;+$/, "");
	// Legacy gradient direction keywords are normalized to the modern "to ..."
	// form by the compiler (D6 follow-up); the legacy reference still carries
	// the keyword form, so normalize both sides to keep them comparable.
	value = NormalizeLegacyGradients(value);
	return value;
}

const VENDOR_PROP = /^-(webkit|moz|ms|o)-/i;
const VENDOR_VALUE = /-(webkit|moz|ms|o)-/i;

// Flattens a stylesheet into rulePath -> [{ prop, value }] with the
// intentional differences (vendor prefixes, cursor image-set) filtered out.
function _Flatten(_root) {
	const rules = new Map();
	const visit = (_container, _path) => {
		for (const node of _container.nodes ?? []) {
			if (node.type === "rule") {
				visit(node, [..._path, _NormalizeSelector(node.selector)]);
			} else if (node.type === "atrule") {
				if (node.nodes) visit(node, [..._path, _NormalizeSelector(`@${node.name} ${node.params}`)]);
			} else if (node.type === "decl" && _path.length) {
				if (VENDOR_PROP.test(node.prop)) continue;
				const value = _NormalizeValue(node.value);
				if (VENDOR_VALUE.test(value)) continue;
				if (node.prop === "cursor" && value.includes("image-set(")) continue;
				const key = _path.join(" >> ");
				if (!rules.has(key)) rules.set(key, []);
				rules.get(key).push({ prop: node.prop, value });
			}
		}
	};
	visit(_root, []);
	return rules;
}

// Masks atlas-dependent background positions; applied when the rule uses the
// sprite atlas or sits inside a @keyframes block (hook-patched positions).
function _MaskAtlasPositions(_rules) {
	for (const [key, decls] of _rules) {
		const usesAtlas = decls.some((_d) => _d.prop.startsWith("background-image") && _d.value.includes("sprites.png"))
			|| key.includes("@keyframes")
			|| /(^|>> )div\.(fly|glittery|flySwatter)/.test(key);
		if (!usesAtlas) continue;
		for (const decl of decls) {
			if (/^background-position(-x|-y)?$/.test(decl.prop) && /(^|\s|-)\d|^-/.test(decl.value)) {
				decl.value = "@atlas";
			}
		}
	}
}

// Rules whose differences are accepted: the legacy compiled output predates
// the last source edits (the old tool no longer ran over them), or the legacy
// output itself is broken (e.g. an unquoted data: URI cut at the semicolon).
const EXPECTED_DRIFT = new Set([
	".mce-edit-aria-container>.mce-container-body .mce-sidebar>.mce-container-body",
	".mce-scrollbar-thumb",
	".mce-window-head .mce-dragh",
	".mce-window iframe",
	".mce-colorpicker-selector1",
	".mce-colorpicker-selector2",
	".mce-iframe",
	"div.mce-tinymce-inline",
	".mce-colorpicker-h-chunk",
	"table.products>tbody>tr.italic",
	"input[type=\"search\"]::-webkit-search-cancel-button",
	// h1/h2 gained a non-transparent gradient placeholder after the last
	// legacy compile; the old output only contains the computed gradient.
	"h1",
	"h2"
]);

// The legacy µCSS placeholder values are fully transparent rgba() colors
// (e.g. "rgba(0, 0, 0, 0.0000)" or gradients with only transparent stops);
// the old tool sometimes replaced them, sometimes left them in. They are
// cascade-irrelevant next to the computed value, so both sides drop them.
function _IsTransparentPlaceholder(_value) {
	const colors = [..._value.matchAll(/rgba\(\s*\d+,\d+,\d+,(\d*\.?\d+)\)/g)];
	return colors.length > 0 && colors.every((_m) => Number(_m[1]) === 0);
}

// Groups declaration values per property; repeated identical values and
// transparent placeholders collapse (cascade-equivalent).
function _GroupByProp(_decls) {
	const result = new Map();
	for (const decl of _decls) {
		if (_IsTransparentPlaceholder(decl.value)) continue;
		if (!result.has(decl.prop)) result.set(decl.prop, []);
		const values = result.get(decl.prop);
		if (!values.includes(decl.value)) values.push(decl.value);
	}
	return result;
}

// Compares two value lists; rgba() colors match numerically with a one-step
// tolerance, because the legacy color code quantized alpha differently
// (e.g. legacy rgba(...,0.1451) vs. new rgba(...,0.149) for Alpha(c, 0.15)).
function _ValueListsEqual(_oldValues, _newValues) {
	if (_oldValues.length !== _newValues.length) return false;
	return _oldValues.every((_old, _i) => _ValuesEqual(_old, _newValues[_i]));
}

function _ValuesEqual(_old, _new) {
	if (_old === _new) return true;
	const RGBA = /rgba\(\s*(\d+),(\d+),(\d+),(\d*\.?\d+)\)/g;
	const oldColors = [..._old.matchAll(RGBA)];
	const newColors = [..._new.matchAll(RGBA)];
	if (!oldColors.length || oldColors.length !== newColors.length) return false;
	if (_old.replace(RGBA, "@c") !== _new.replace(RGBA, "@c")) return false;
	return oldColors.every((_o, _i) => {
		const n = newColors[_i];
		for (let channel = 1; channel <= 3; channel++) {
			if (Math.abs(Number(_o[channel]) - Number(n[channel])) > 1) return false;
		}
		return Math.abs(Number(_o[4]) - Number(n[4])) <= 1.5 / 255;
	});
}

// ------------------------------------------------------------------ compare

function _CompareFile(_oldFile, _newFile, _report) {
	const oldText = _ReadLegacy(_oldFile).replace(/^[ \t]*:[ \t]*[^;{}\r\n]*;[ \t]*$/gm, "");
	const newText = readFileSync(_newFile, "utf8");
	const oldRules = _Flatten(postcss.parse(oldText, { from: _oldFile }));
	const newRules = _Flatten(postcss.parse(newText, { from: _newFile }));
	_MaskAtlasPositions(oldRules);
	_MaskAtlasPositions(newRules);

	const stats = { rules: 0, equal: 0, propDiffs: 0, missing: 0, extra: 0, expected: 0 };

	// Rules referencing source images missing from the extract: the legacy
	// output contains broken sizes (width/height "-1px") and no image-set;
	// the new build uses correctly sized placeholders. Mark as expected.
	const missingImageRule = (_decls) =>
		_decls.some((_d) => (_d.prop === "width" || _d.prop === "height") && _d.value === "-1px");

	for (const [key, oldDecls] of oldRules) {
		stats.rules++;
		const expected = EXPECTED_DRIFT.has(key) || missingImageRule(oldDecls);
		const newDecls = newRules.get(key);
		if (!newDecls) {
			if (oldDecls.length === 0) continue;
			if (expected) { stats.expected++; _report.push(`EXPECTED missing in new: ${key}`); continue; }
			stats.missing++;
			_report.push(`MISSING in new: ${key}`);
			continue;
		}
		const oldByProp = _GroupByProp(oldDecls);
		const newByProp = _GroupByProp(newDecls);
		const diffs = [];
		for (const [prop, oldValues] of oldByProp) {
			const newValues = newByProp.get(prop) ?? [];
			if (!_ValueListsEqual(oldValues, newValues)) {
				diffs.push(`${key} :: ${prop}\n  old: ${oldValues.join(" | ")}\n  new: ${newValues.join(" | ") || "(none)"}`);
			}
		}
		for (const prop of newByProp.keys()) {
			if (!oldByProp.has(prop)) {
				diffs.push(`${key} :: ${prop}\n  old: (none)\n  new: ${newByProp.get(prop).join(" | ")}`);
			}
		}
		if (!diffs.length) {
			stats.equal++;
		} else if (expected) {
			stats.expected += diffs.length;
			for (const diff of diffs) _report.push(`EXPECTED DIFF ${diff}`);
		} else {
			stats.propDiffs += diffs.length;
			for (const diff of diffs) _report.push(`DIFF ${diff}`);
		}
	}

	for (const [key, newDecls] of newRules) {
		if (oldRules.has(key) || newDecls.length === 0) continue;
		if (key === "div.csspreload") continue;   // intentional new feature
		if (EXPECTED_DRIFT.has(key)) { stats.expected++; _report.push(`EXPECTED extra in new: ${key}`); continue; }
		stats.extra++;
		_report.push(`EXTRA in new: ${key}`);
	}
	return stats;
}

// --------------------------------------------------------------------- main

console.log("preparing comparison build directory ...");
await _PrepareNewSkin();

console.log("building skin with microCSS (media steps skipped) ...");
const result = await BuildSkin(manifestFile, { outputDir: newSkinDir, force: true, skipMedia: true });
console.log(`built ${result.files.length} stylesheet(s), atlas ${result.atlas ? `${result.atlas.width}x${result.atlas.height}` : "-"}`);

const report = [];
const totals = { rules: 0, equal: 0, propDiffs: 0, missing: 0, extra: 0, expected: 0 };
let failed = false;

for (const file of result.files) {
	const target = basename(file.target);
	const oldFile = join(oldSkinDir, target);
	if (!existsSync(oldFile)) {
		console.log(`SKIP ${target}: no legacy counterpart`);
		continue;
	}
	report.push(`\n===== ${target} =====`);
	const stats = _CompareFile(oldFile, file.target, report);
	for (const key of Object.keys(totals)) totals[key] += stats[key];
	const status = (stats.propDiffs || stats.missing || stats.extra) ? "DIFFS" : "OK";
	if (status === "DIFFS") failed = true;
	console.log(`${status.padEnd(6)} ${target}: ${stats.rules} rules, ${stats.equal} equal, ` +
		`${stats.propDiffs} property diffs, ${stats.missing} missing, ${stats.extra} extra, ${stats.expected} expected`);
}

const reportFile = join(newSkinDir, "compare-report.txt");
writeFileSync(reportFile, report.join("\n"), "utf8");
console.log(`\ntotal: ${totals.rules} rules, ${totals.equal} equal, ${totals.propDiffs} property diffs, ` +
	`${totals.missing} missing, ${totals.extra} extra, ${totals.expected} expected (documented legacy drift)`);
console.log(`report: ${reportFile}`);
process.exitCode = failed ? 1 : 0;
