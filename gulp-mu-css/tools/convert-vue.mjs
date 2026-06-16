// Converts Vue SFC <style> blocks to co-located µCSS sidecar files (docs/CONCEPT.md, D8/D10).
//
// Migration aid for the Vue co-location workflow: extract each component's styles into
// a sibling *.π.css file (Vite/Vue ignore that extension), inject @µ-namespace, strip
// Vue scoped attribute selectors, and remove the <style> block from the .vue file.
//
// What it converts:
//   - <style> / <style scoped> (plain CSS) -> sidecar with @µ-namespace ComponentName
//   - lang="less"                           -> piped through ConvertLess first
//   - [data-v-…] scoped selectors           -> removed (namespace replaces scoping)
//   - :deep() / ::v-deep                    -> unwrapped inner selector (review note)
//
// What it deliberately leaves for manual review (TODO + warning):
//   - lang="scss" / "sass" / "stylus"       -> not converted
//   - <style module>                        -> CSS modules not supported
//   - :slotted() / v-bind() in CSS          -> left untouched + warned
//
// Programmatic use: ConvertVue(source, { from, componentName }) -> { vue, css, sidecarName,
// namespace, vars, warnings, notes }. CLI: node tools/convert-vue.mjs <input.vue|dir> [outDir].

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, resolve, relative, basename, parse, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvertLess } from "./convert-less.mjs";

export const SIDECAR_SUFFIX = ".\u03c0.css";

const STYLE_RE = /<style(\s[^>]*)?>([\s\S]*?)<\/style>/gi;

// Derives a PascalCase namespace from a file base name (MyButton, my-button -> MyButton).
export function ComponentNameFromFile(_base) {
	return _base
		.split(/[-_.]+/)
		.filter(Boolean)
		.map((_part) => _part.charAt(0).toUpperCase() + _part.slice(1))
		.join("");
}

function _ParseStyleAttrs(_attrText) {
	const attrs = {};
	if (!_attrText) return attrs;
	for (const match of _attrText.matchAll(/([:@A-Za-z_-]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g)) {
		const key = match[1].toLowerCase();
		const value = match[2] ?? match[3] ?? match[4] ?? "";
		attrs[key] = value === "" && key !== "scoped" ? true : value;
	}
	return attrs;
}

// Strips Vue scoped attribute selectors injected by vue-loader / Vite.
function _StripScopedAttrs(_css) {
	return _css.replace(/\s*\[data-v-[a-f0-9]+\]/gi, "");
}

// Unwraps Vue deep combinators so selectors work without scoped rewriting.
function _UnwrapDeepSelectors(_css, _ctx) {
	let css = _css;
	const rules = [
		[/:deep\(([^)]+)\)/g, "$1"],
		[/::v-deep\s+([^{,>+~]+)/g, "$1"],
		[/::v-deep\(([^)]+)\)/g, "$1"],
		[/\/deep\/\s+([^{,>+~]+)/g, "$1"],
		[/>>>\s+([^{,>+~]+)/g, "$1"]
	];
	for (const [re, repl] of rules) {
		if (new RegExp(re.source, re.flags.replace("g", "")).test(_css)) {
			_ctx.note("Vue :deep/::v-deep selector unwrapped — verify collisions against @µ-namespace");
		}
		css = css.replace(re, repl);
	}
	return css;
}

function _WarnUnsupportedCss(_css, _ctx) {
	if (/:slotted\s*\(/i.test(_css)) {
		_ctx.warn("Vue :slotted() not converted — port manually or use :global(...)");
	}
	if (/v-bind\s*\(/i.test(_css)) {
		_ctx.warn("Vue v-bind() in CSS not converted — replace with static values or µ(...)");
	}
}

function _ConvertStyleBlock(_css, _attrs, _ctx) {
	const lang = String(_attrs.lang ?? "css").toLowerCase();
	if (_attrs.module !== undefined) {
		_ctx.warn("<style module> (CSS modules) not supported — extract styles manually");
		return null;
	}
	if (lang === "scss" || lang === "sass" || lang === "stylus") {
		_ctx.warn(`lang="${lang}" not supported — convert to plain CSS/LESS first or port by hand`);
		return null;
	}

	let css = _css.trim();
	if (!css) {
		_ctx.warn("empty <style> block skipped");
		return null;
	}

	let vars = [];
	if (lang === "less") {
		const lessResult = ConvertLess(css, { from: _ctx.from });
		css = lessResult.css;
		vars = lessResult.vars;
		for (const w of lessResult.warnings) _ctx.warn(`LESS: ${w}`);
		for (const n of lessResult.notes) _ctx.note(`LESS: ${n}`);
	}

	css = _StripScopedAttrs(css);
	css = _UnwrapDeepSelectors(css, _ctx);
	_WarnUnsupportedCss(css, _ctx);
	return { css, vars };
}

// Converts one Vue SFC string. sidecarName is the file name only (e.g. MyButton.π.css).
export function ConvertVue(_source, _options = {}) {
	const warnings = [];
	const notes = [];
	const ctx = {
		from: _options.from ?? "Component.vue",
		warn: (_message) => warnings.push(_message),
		note: (_message) => notes.push(_message)
	};

	const fileBase = parse(_options.from ?? "Component.vue").name;
	const namespace = _options.componentName ?? ComponentNameFromFile(fileBase);
	const sidecarName = `${fileBase}${SIDECAR_SUFFIX}`;

	const styleBlocks = [];
	let vue = _source;
	let match;
	STYLE_RE.lastIndex = 0;
	while ((match = STYLE_RE.exec(_source)) !== null) {
		styleBlocks.push({ attrs: _ParseStyleAttrs(match[1]), css: match[2], full: match[0] });
	}

	if (styleBlocks.length === 0) {
		ctx.warn("no <style> block found");
		return {
			vue: _source,
			css: "",
			sidecarName,
			namespace,
			vars: [],
			warnings,
			notes
		};
	}

	const cssParts = [];
	const allVars = new Map();
	for (const block of styleBlocks) {
		const converted = _ConvertStyleBlock(block.css, block.attrs, ctx);
		if (converted) {
			cssParts.push(converted.css);
			for (const v of converted.vars) allVars.set(v.name, v.literal);
		}
	}

	for (const block of styleBlocks) {
		vue = vue.replace(block.full, `\n<!-- styles co-located in ${sidecarName} (convert-vue) -->\n`);
	}

	const cssBody = cssParts.join("\n\n").trim();
	const css = cssBody
		? `@µ-namespace ${namespace};\n\n${cssBody}\n`
		: "";

	return {
		vue,
		css,
		sidecarName,
		namespace,
		vars: [...allVars].map(([name, literal]) => ({ name, literal })),
		warnings,
		notes
	};
}

// --------------------------------------------------------------------- manifest

const here = dirname(fileURLToPath(import.meta.url));

function _EmitManifest(_vars, _skinName, _outDir, _importGlob) {
	const microcssDir = resolve(here, "..");
	const importPath = relative(_outDir, join(microcssDir, "src/index.mjs")).replace(/\\/g, "/");
	const mainSource = "main.\u00b5.css";
	const lines = [];
	lines.push(`// Skin manifest "${_skinName}" - generated from Vue SFCs by`);
	lines.push("// gulp-mu-css/tools/convert-vue.mjs. Review before use; in a standalone");
	lines.push('// project import from the "gulp-mu-css" package instead of the relative path.');
	lines.push(`import { DefineSkin } from "${importPath.startsWith(".") ? importPath : `./${importPath}`}";`);
	lines.push("");
	lines.push("export default DefineSkin({");
	if (_vars.length > 0) {
		lines.push("\tvars: {");
		for (const v of _vars) {
			const key = /^[A-Za-z_]\w*$/.test(v.name) ? v.name : JSON.stringify(v.name);
			lines.push(`\t\t${key}: ${v.literal},`);
		}
		lines.push("\t},");
		lines.push("");
	}
	lines.push("\tmerge: { onConflict: \"error\" },");
	lines.push("");
	lines.push("\tfiles: [");
	lines.push(`\t\t{ source: ${JSON.stringify(mainSource)}, target: ${JSON.stringify(`${_skinName}.css`)} },`);
	lines.push("\t]");
	lines.push("});");
	lines.push("");
	return { manifest: lines.join("\n"), mainSource, mainCss: `@import ${JSON.stringify(_importGlob)};\n` };
}

function _FindVueFiles(_dir) {
	const out = [];
	for (const dirent of readdirSync(_dir, { withFileTypes: true })) {
		const full = join(_dir, dirent.name);
		if (dirent.isDirectory()) out.push(..._FindVueFiles(full));
		else if (dirent.isFile() && /\.vue$/i.test(dirent.name)) out.push(full);
	}
	return out;
}

function _Main(_argv) {
	const inputArg = _argv[0];
	if (!inputArg) {
		console.error("usage: node tools/convert-vue.mjs <input.vue|dir> [outDir]");
		process.exit(1);
	}
	const input = resolve(inputArg);
	if (!existsSync(input)) {
		console.error(`input not found: ${input}`);
		process.exit(1);
	}
	const isDir = statSync(input).isDirectory();
	const baseDir = isDir ? input : dirname(input);
	const outDir = _argv[1] ? resolve(_argv[1]) : baseDir;
	const files = isDir ? _FindVueFiles(input) : [input];

	const allVars = new Map();
	const converted = [];

	for (const file of files) {
		const result = ConvertVue(readFileSync(file, "utf8"), { from: basename(file) });
		const rel = relative(baseDir, file).split(sep).join("/");
		const relDir = dirname(rel);
		const targetVue = join(outDir, rel);
		const targetSidecar = join(outDir, relDir, result.sidecarName);

		mkdirSync(dirname(targetVue), { recursive: true });
		writeFileSync(targetVue, result.vue, "utf8");
		if (result.css) writeFileSync(targetSidecar, result.css, "utf8");

		for (const v of result.vars) {
			if (allVars.has(v.name) && allVars.get(v.name) !== v.literal) {
				result.warnings.push(`variable @${v.name} also defined differently in another component; last value wins`);
			}
			allVars.set(v.name, v.literal);
		}
		converted.push({ rel, result });
	}

	let totalWarnings = 0, totalNotes = 0;
	for (const { rel, result } of converted) {
		console.log(`converted: ${rel} -> ${result.sidecarName} (@µ-namespace ${result.namespace}; ${result.warnings.length} warnings, ${result.notes.length} notes)`);
		for (const w of result.warnings) console.log(`    ! ${w}`);
		for (const n of result.notes) console.log(`    ~ ${n}`);
		totalWarnings += result.warnings.length;
		totalNotes += result.notes.length;
	}

	const skinName = isDir ? basename(input) : parse(input).name;
	const importGlob = isDir ? `**/*${SIDECAR_SUFFIX}` : `*${SIDECAR_SUFFIX}`;
	const { manifest, mainSource, mainCss } = _EmitManifest(
		[...allVars].map(([name, literal]) => ({ name, literal })),
		skinName,
		outDir,
		importGlob
	);
	writeFileSync(join(outDir, mainSource), mainCss, "utf8");
	const manifestFile = join(outDir, `${skinName}.\u00b5css.mjs`);
	writeFileSync(manifestFile, manifest, "utf8");

	console.log(`\nmanifest: ${relative(process.cwd(), manifestFile)}`);
	console.log(`entry: ${relative(process.cwd(), join(outDir, mainSource))} imports ${importGlob}`);
	console.log(`done: ${files.length} file(s), ${totalWarnings} warning(s), ${totalNotes} note(s).`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
	_Main(process.argv.slice(2));
}
