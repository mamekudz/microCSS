// Converts a legacy µCSS skin (AiDPix layout) to the new microCSS format
// (M5 migration, CONCEPT.md section 6):
//
//   skins/std/µ.std.css   ->  skins/src/<skin>.µcss.mjs (manifest) + helpers.mjs
//   skins/src/src*.css    ->  skins/src/*.µ.css (per DependentCSSFile entry)
//
// The translation is mechanical: -µcss: directives become -µ: directives or
// plain declarations with µ() interpolations, µ.$.x becomes $.x, the «»¡
// characters become {};. Legacy µ.$.* function definitions are NOT converted
// (the AiDPix set is ported by hand in test/fixtures/aidpix-helpers.mjs, see M4).
//
// Usage: node tools/convert-mucss.mjs [projectDir] [manifestCss]
//   projectDir   project root, default "../oldsrcs/AiDPix Extract"
//   manifestCss  legacy control file, default "skins/std/µ.std.css"

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative, basename, parse } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(here, process.argv[2] ?? "../../oldsrcs/AiDPix Extract");
const manifestCss = join(projectDir, process.argv[3] ?? "skins/std/µ.std.css");
const srcDir = join(projectDir, "skins/src");

// Helper functions already ported to test/fixtures/aidpix-helpers.mjs; legacy
// names on the left, new export names on the right.
const HELPER_MAP = {
	GlitterySpriteAfterWorkDivBlock: "GlitterySprite",
	Borders: "Borders",
	TableBackgrounds: "TableBackgrounds",
	FlyEx: "FlyEx",
	FlyExUtils: "FlyExUtils"
};

// Legacy µ.Set*() methods that map to a plain CSS property. "px" values run
// through PhPxUnit in the old code (numbers get a px suffix).
const SETTER_MAP = {
	SetColor: { prop: "color" },
	SetBackgroundColor: { prop: "background-color" },
	SetZIndex: { prop: "z-index" },
	SetOpacity: { prop: "opacity" },
	SetDisplay: { prop: "display" },
	SetFontSize: { prop: "font-size" },
	SetFontWeight: { prop: "font-weight" },
	SetWhiteSpace: { prop: "white-space" },
	SetTableLayout: { prop: "table-layout" },
	SetCursor: { prop: "cursor" },
	SetWidth: { prop: "width", px: true },
	SetMinWidth: { prop: "min-width", px: true },
	SetMaxWidth: { prop: "max-width", px: true },
	SetHeight: { prop: "height", px: true },
	SetMinHeight: { prop: "min-height", px: true },
	SetMaxHeight: { prop: "max-height", px: true },
	SetTop: { prop: "top", px: true },
	SetBottom: { prop: "bottom", px: true },
	SetLeft: { prop: "left", px: true },
	SetRight: { prop: "right", px: true }
};

const warnings = [];
function _Warn(_file, _message) {
	warnings.push(`${_file}: ${_message}`);
}

// ------------------------------------------------------------ file reading

// The legacy files are a mix of UTF-8 and Latin-1; a Latin-1 file read as
// UTF-8 shows U+FFFD where the µ bytes were. Some files were additionally
// saved with literal U+FFFD replacement characters where µ used to be
// (recognizable by the EF BF BD byte sequence) - restore those to µ.
function _ReadLegacy(_file) {
	const utf8 = readFileSync(_file, "utf8");
	if (!utf8.includes("\uFFFD")) return utf8;
	const latin1 = readFileSync(_file, "latin1");
	if (latin1.includes("ï¿½")) return utf8.replace(/\uFFFD/g, "µ");
	return latin1;
}

// Removes property-less garbage declarations like ": z-index;" that the old
// tool tolerated (and copied verbatim into its output).
function _CleanBrokenDecls(_text, _file) {
	return _text.replace(/^[ \t]*:[ \t]*[^;{}\r\n]*;[ \t]*$/gm, (_line) => {
		_Warn(basename(_file), `dropped broken declaration "${_line.trim()}"`);
		return "";
	});
}

// Disabled directives ("-µcss: //...") may contain unquoted colons that break
// the CSS parser - turn them into comments on the text level.
function _DisabledToComments(_text, _file) {
	return _text.replace(/^([ \t]*)-µcss:[ \t]*\/\/(.*);[ \t]*$/gm, (_m, _indent, _body) => {
		return `${_indent}/* -µ: ${_ConvertExpression(_body, basename(_file), true).replace(/\*\//g, "* /")} (legacy disabled) */`;
	});
}

// --------------------------------------------------------- expression tools

// Splits an argument list at top-level commas (quotes and parens respected).
function _SplitArgs(_text) {
	const args = [];
	let depth = 0, quote = null, current = "";
	for (let i = 0; i < _text.length; i++) {
		const ch = _text[i];
		if (quote) {
			current += ch;
			if (ch === "\\") { current += _text[++i] ?? ""; continue; }
			if (ch === quote) quote = null;
		} else if (ch === "'" || ch === "\"") {
			quote = ch; current += ch;
		} else if (ch === "(") {
			depth++; current += ch;
		} else if (ch === ")") {
			depth--; current += ch;
		} else if (ch === "," && depth === 0) {
			args.push(current.trim()); current = "";
		} else {
			current += ch;
		}
	}
	if (current.trim() !== "") args.push(current.trim());
	return args;
}

// Translates a legacy expression to the new scope: «»¡ -> {};, µ.$.x -> $.x
// (helpers by their new name), µ.Api -> Api.
function _ConvertExpression(_expr, _file, _quiet = false) {
	let expr = _expr.replace(/«/g, "{").replace(/»/g, "}").replace(/¡/g, ";");
	// Stray whitespace around the dots occurs in the legacy sources.
	expr = expr.replace(/µ\s*\.\s*\$\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)/g, (_m, _name) => {
		return HELPER_MAP[_name] ? HELPER_MAP[_name] : `$.${_name}`;
	});
	expr = expr.replace(/µ\s*\.\s*(Lighten|Alpha|MixColors|AlphaValue|ParseColor|FormatColor|AddProperty|ChangeProperty|RemoveProperty|Cursor|Sprite)\b/g, "$1");
	if (!_quiet && /µ\./.test(expr)) _Warn(_file, `unconverted µ. reference left in: ${expr.slice(0, 100)}`);
	return expr;
}

function _StringLiteral(_text) {
	const m = _text.match(/^"((?:[^"\\]|\\.)*)"$/) ?? _text.match(/^'((?:[^'\\]|\\.)*)'$/);
	return m ? m[1] : null;
}

function _NumberLiteral(_text) {
	return /^-?\d+(\.\d+)?$/.test(_text) ? Number(_text) : null;
}

// Returns the source of a regex literal like /(.*)/i -> "(.*)", or null.
function _RegexSource(_text) {
	if (!_text) return null;
	const m = _text.trim().match(/^\/((?:[^/\\]|\\.)*)\/[a-z]*$/i);
	return m ? m[1] : null;
}

// The legacy µ.std.css only copied the pre-generated final folders into the
// skin; the raw -> final strips were produced outside µCSS (SpriteTools). For
// a copyFolder pulling in a generated "dev/media/final/.../<name>" folder, emit
// the matching sequenceStrip generation step(s) so the new pipeline rebuilds
// final from raw. A numbered PNG frame sequence becomes one folder strip;
// individually named images are treated as DSD strips (one step each). Returns
// [] for static asset folders (fonts, sounds, ...) that have no raw source.
function _RawToFinalSteps(_relFinalDir) {
	if (!_relFinalDir.startsWith("dev/media/final/")) return [];
	const name = _relFinalDir.split("/").pop();
	const rawImgsRel = `dev/media/raw/${name}/imgs`;
	if (!existsSync(join(projectDir, rawImgsRel))) return [];
	const pngs = readdirSync(join(projectDir, rawImgsRel)).filter((_f) => /\.png$/i.test(_f)).sort();
	if (pngs.length === 0) return [];
	const numbered = pngs.every((_f) => /[._-]?\d{2,}\.png$/i.test(_f));
	const prefixes = new Set(pngs.map((_f) => _f.replace(/[._-]?\d{2,}\.png$/i, "")));
	if (numbered && pngs.length >= 3 && prefixes.size === 1) {
		return [{
			comment: `raw -> final: frame sequence ${rawImgsRel}`,
			step: { sequenceStrip: rawImgsRel, outputFile: `${_relFinalDir}/${name}.png`, outputBase: "project" }
		}];
	}
	return pngs.map((_f) => ({
		comment: `raw -> final: DSD strip ${rawImgsRel}/${_f}`,
		step: { sequenceStrip: `${rawImgsRel}/${_f}`, outputFile: `${_relFinalDir}/${_f}`, outputBase: "project" }
	}));
}

// ------------------------------------------------- manifest (µ.std.css) scan

function _ParseManifest(_file) {
	const text = _ReadLegacy(_file);
	const lines = text.split(/\r?\n/);
	const result = {
		vars: [],            // { name, literal }   (literal = JS source text)
		cursors: [],         // { name, fallback, image, hotspot, forceFallback }
		files: [],           // { source, target } (already renamed to .µ.css)
		media: [],           // { comment, step }
		functions: [],       // legacy function names (ported manually)
		spritesDir: "imgs",
		preloadRule: false
	};
	let functionDepth = 0;

	const relPath = (_p) => _p.replace(/^(\.\.\/)+/, "");

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (functionDepth > 0) {
			functionDepth += (line.match(/«/g) ?? []).length - (line.match(/»/g) ?? []).length;
			continue;
		}
		const m = line.match(/^-µcss:\s*(.*?);?\s*$/);
		if (!m) continue;
		const body = m[1].trim();
		if (body.startsWith("//")) continue;          // disabled directive

		let mm;
		if ((mm = body.match(/^µ\.\$\.([A-Za-z_]\w*)\s*=\s*function/))) {
			result.functions.push(mm[1]);
			functionDepth = (line.match(/«/g) ?? []).length - (line.match(/»/g) ?? []).length;
			continue;
		}
		if (body.startsWith("µ.$.overloadOptions=")) continue;  // output options (D6: obsolete)
		if ((mm = body.match(/^µ\.\$\.([A-Za-z_]\w*)\s*=\s*(.+)$/))) {
			const [, name, value] = mm;
			if (_StringLiteral(value) !== null || _NumberLiteral(value) !== null) {
				result.vars.push({ name, literal: value });
			} else {
				_Warn(basename(_file), `var ${name} has an unsupported value: ${value.slice(0, 60)}`);
			}
			continue;
		}
		if ((mm = body.match(/^µ\.options\.sprites\.save\.relPath\s*=\s*"(.+)"$/))) {
			result.spritesDir = mm[1].replace(/^\.\//, "");
			continue;
		}
		if (body.startsWith("µ.options.createPreLoadRule=true")) { result.preloadRule = true; continue; }
		if (body.startsWith("µ.options.")) continue;  // packing tweaks etc.

		if ((mm = body.match(/^µ\.DependentCSSFile\((.*)\)$/))) {
			const args = _SplitArgs(mm[1]);
			const source = basename(_StringLiteral(args[0]) ?? "");
			const target = (_StringLiteral(args[1]) ?? "").replace(/^\.\//, "");
			result.files.push({ source: source.replace(/\.css$/i, ".µ.css"), target });
			continue;
		}
		if ((mm = body.match(/^µ\.DefCursor\((.*)\)$/))) {
			const args = _SplitArgs(mm[1]);
			result.cursors.push({
				name: _StringLiteral(args[0]),
				fallback: _StringLiteral(args[1]),
				image: _StringLiteral(args[2]) ?? "",
				hotspot: [Number(args[3] ?? 0), Number(args[4] ?? 0)],
				forceFallback: args[5] === "true"
			});
			continue;
		}
		if ((mm = body.match(/^µ\.plugins\.AppIconMaker\.Create\((.*)\)$/))) {
			const args = _SplitArgs(mm[1]);
			result.media.push({
				comment: `legacy: ${body}`,
				step: { appIcons: relPath(_StringLiteral(args[0])), outputDir: "." }
			});
			continue;
		}
		if ((mm = body.match(/^µ\.plugins\.ButtonAndIconCreator\.(Create|CreateByTopLayerSets)\((.*)\)$/))) {
			const args = _SplitArgs(mm[2]);
			const step = {
				buttonsAndIcons: relPath(_StringLiteral(args[0])),
				layout: _StringLiteral(args[1]) ?? "std",
				outputDir: _StringLiteral(args[6]) ?? "imgs"
			};
			// CreateByTopLayerSets renders one image per top child group instead
			// of the icon x state matrix.
			if (mm[1] === "CreateByTopLayerSets") step.mode = "topLayerSets";
			// args[3] is the set name filter, a regex literal like /(.*)/i. Only
			// keep it when it is not the match-all default.
			const setPattern = _RegexSource(args[3]);
			if (setPattern && setPattern !== "(.*)" && setPattern !== ".*") step.setPattern = setPattern;
			result.media.push({ comment: `legacy: ${body}`, step });
			continue;
		}
		if ((mm = body.match(/^µ\.plugins\.FileCopy\.CopyFile2Skin\((.*)\)$/))) {
			const args = _SplitArgs(mm[1]);
			result.media.push({
				step: { copy: relPath(_StringLiteral(args[0])), to: _StringLiteral(args[1]) ?? "." }
			});
			continue;
		}
		if ((mm = body.match(/^µ\.plugins\.FileCopy\.CopyFolder2Skin\((.*)\)$/))) {
			const args = _SplitArgs(mm[1]);
			const source = relPath(_StringLiteral(args[0]));
			const step = { copyFolder: source, to: _StringLiteral(args[1]) ?? basename(source) };
			if (args[3] && args[3].startsWith("/")) {
				// Legacy regex argument; strips were png-only - the new build
				// also copies the .json maps the M4 hooks read.
				const pattern = args[3].replace(/^\/(.*)\/[a-z]*$/, "$1");
				step.filter = pattern.includes("png") ? pattern.replace("(png)", "(png|json)") : pattern;
			}
			// Rebuild the generated final folder from raw before copying it.
			for (const gen of _RawToFinalSteps(source)) result.media.push(gen);
			result.media.push({ comment: `legacy: ${body}`, step });
			continue;
		}
		_Warn(basename(_file), `unhandled manifest directive: ${body.slice(0, 90)}`);
	}
	return result;
}

// ----------------------------------------------------- manifest file output

function _EmitManifest(_data, _skinName) {
	const microcssDir = resolve(here, "..");
	const importPath = relative(srcDir, join(microcssDir, "src/index.mjs")).replace(/\\/g, "/");
	const lines = [];
	lines.push(`// Skin manifest "${_skinName}" - generated from skins/std/µ.std.css by`);
	lines.push("// gulp-mu-css/tools/convert-mucss.mjs. Review before use; in a standalone");
	lines.push('// project import from the "gulp-mu-css" package instead of the relative path.');
	lines.push(`import { DefineSkin } from "${importPath}";`);
	lines.push('import * as helpers from "./helpers.mjs";');
	lines.push("");
	lines.push("export default DefineSkin({");
	lines.push("\tvars: {");
	for (const v of _data.vars) lines.push(`\t\t${v.name}: ${v.literal},`);
	lines.push("\t},");
	lines.push("");
	lines.push("\thelpers: { ...helpers },");
	lines.push("");
	lines.push("\tcursors: [");
	for (const c of _data.cursors) {
		const hotspot = (c.hotspot[0] || c.hotspot[1]) ? `, hotspot: [${c.hotspot[0]}, ${c.hotspot[1]}]` : "";
		const force = c.forceFallback ? ", forceFallback: true" : "";
		lines.push(`\t\t{ name: ${JSON.stringify(c.name)}, fallback: ${JSON.stringify(c.fallback)}, image: ${JSON.stringify(c.image)}${hotspot}${force} },`);
	}
	lines.push("\t],");
	lines.push("");
	lines.push("\tmedia: [");
	for (const m of _data.media) {
		if (m.comment) lines.push(`\t\t// ${m.comment}`);
		const parts = Object.entries(m.step).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
		lines.push(`\t\t{ ${parts.join(", ")} },`);
	}
	lines.push("\t],");
	lines.push("");
	lines.push(`\tsprites: { file: ${JSON.stringify(`${_data.spritesDir}/sprites.png`)}, retina: true, preloadRule: ${_data.preloadRule} },`);
	lines.push("");
	lines.push("\tfiles: [");
	for (const f of _data.files) {
		lines.push(`\t\t{ source: ${JSON.stringify(f.source)}, target: ${JSON.stringify(f.target)} },`);
	}
	lines.push("\t]");
	lines.push("});");
	lines.push("");
	return lines.join("\n");
}

function _EmitHelpers() {
	const microcssDir = resolve(here, "..");
	const importPath = relative(srcDir, join(microcssDir, "test/fixtures/aidpix-helpers.mjs")).replace(/\\/g, "/");
	return [
		"// AiDPix macro helpers - the legacy µ.$.* functions from µ.std.css were",
		"// ported by hand to gulp-mu-css/test/fixtures/aidpix-helpers.mjs (M4). This file",
		"// re-exports them for the skin manifest; replace the relative import when",
		"// the skin moves into its own project.",
		`export { Borders, TableBackgrounds, GlitterySprite, FlyEx, FlyExUtils } from "${importPath}";`,
		""
	].join("\n");
}

// ----------------------------------------------- source file (css -> µ.css)

function _ConvertDirective(_decl, _file, _knownVars) {
	const body = _decl.value.trim();

	// Disabled directive -> keep as a comment for reference.
	if (body.startsWith("//")) {
		_decl.replaceWith(postcss.comment({ text: `-µ: ${_ConvertExpression(body.slice(2), _file)} (legacy disabled)` }));
		return "disabled";
	}

	const call = body.match(/^µ\.((?:\$\.)?[A-Za-z_]\w*)\s*\(([\s\S]*)\)\s*$/);
	if (!call) {
		_Warn(_file, `unrecognized directive kept as comment: ${body.slice(0, 90)}`);
		_decl.replaceWith(postcss.comment({ text: `TODO(convert): ${body}` }));
		return "todo";
	}
	const [, callee, argText] = call;
	const args = _SplitArgs(argText);

	if (callee === "SetRememberBlock") {
		// Obsolete: hooks address blocks by path (CONCEPT.md, M4).
		_decl.remove();
		return "rememberBlock";
	}

	if (callee === "Cursor") {
		_decl.replaceWith(postcss.decl({ prop: "-µ", value: `Cursor(${args.map((_a) => _ConvertExpression(_a, _file)).join(", ")})` }));
		return "cursor";
	}

	if (callee === "Sprite") {
		const url = args[0];
		const optionNames = ["offsetWidth", "offsetHeight", "offsetPosX", "offsetPosY"];
		const options = [];
		for (let i = 0; i < 4; i++) {
			const value = args[i + 1];
			if (value !== undefined && value !== "0") options.push(`${optionNames[i]}: ${_ConvertExpression(value, _file)}`);
		}
		if (args[5] !== undefined && args[5] !== "0") {
			_Warn(_file, `Sprite(${url}): per-sprite padding ${args[5]} is not supported (use the global sprites.padding).`);
		}
		if (args[6] !== undefined && args[6] !== "null") {
			options.push(`afterWork: ${_ConvertExpression(args[6], _file)}`);
		}
		const value = options.length ? `Sprite(${url}, { ${options.join(", ")} })` : `Sprite(${url})`;
		_decl.replaceWith(postcss.decl({ prop: "-µ", value }));
		return "sprite";
	}

	if (callee === "AddProperty" || callee === "ChangeProperty" || callee === "RemoveProperty") {
		const value = `${callee}(${args.map((_a) => _ConvertExpression(_a, _file)).join(", ")})`;
		_decl.replaceWith(postcss.decl({ prop: "-µ", value }));
		return "property";
	}

	if (callee === "SetBackgroundImage") {
		const url = _StringLiteral(args[0]);
		if (url === null) {
			_Warn(_file, `SetBackgroundImage with non-literal argument: ${argText.slice(0, 60)}`);
			_decl.replaceWith(postcss.comment({ text: `TODO(convert): ${body}` }));
			return "todo";
		}
		_ReplaceOrInsert(_decl, "background-image", `url(${url})`);
		return "setter";
	}

	if (SETTER_MAP[callee]) {
		const { prop, px } = SETTER_MAP[callee];
		const expr = _ConvertExpression(args[0] ?? "", _file);

		// Legacy quirk: expressions referencing vars that were never defined
		// produced garbage output - drop them like the values they produced.
		const unknown = [...expr.matchAll(/\$\.([A-Za-z_]\w*)/g)].map((_m) => _m[1])
			.filter((_name) => !_knownVars.has(_name));
		if (unknown.length) {
			_Warn(_file, `${callee}: unknown var(s) ${unknown.join(", ")} - directive disabled`);
			_decl.replaceWith(postcss.comment({ text: `TODO(convert): unknown vars ${unknown.join(", ")}: ${body}` }));
			return "todo";
		}

		let value;
		const literalNumber = _NumberLiteral(expr);
		const literalString = _StringLiteral(expr);
		if (literalNumber !== null) value = px ? `${literalNumber}px` : String(literalNumber);
		else if (literalString !== null) value = literalString;
		else value = px ? `µ(PxUnit(${expr}))` : `µ(${expr})`;
		_ReplaceOrInsert(_decl, prop, value);
		return "setter";
	}

	if (callee.startsWith("$.")) {
		const name = callee.slice(2);
		const helper = HELPER_MAP[name];
		if (!helper) _Warn(_file, `call to unported helper ${name} kept as ${name}(...)`);
		const value = `${helper ?? name}(${args.map((_a) => _ConvertExpression(_a, _file)).join(", ")})`;
		_decl.replaceWith(postcss.decl({ prop: "-µ", value }));
		return "helper";
	}

	_Warn(_file, `unknown directive µ.${callee}(...) kept as comment`);
	_decl.replaceWith(postcss.comment({ text: `TODO(convert): ${body}` }));
	return "todo";
}

// Legacy ChangeProperty semantics: replace the existing declaration(s) of
// the property anywhere in the rule (the placeholder usually follows the
// directive); without a placeholder the directive itself becomes the
// declaration.
function _ReplaceOrInsert(_decl, _prop, _value) {
	const placeholders = _decl.parent.nodes.filter(
		(_node) => _node !== _decl && _node.type === "decl" && _node.prop === _prop
	);
	if (placeholders.length) {
		placeholders[0].value = _value;
		for (const extra of placeholders.slice(1)) extra.remove();
		_decl.remove();
	} else {
		_decl.replaceWith(postcss.decl({ prop: _prop, value: _value }));
	}
}

function _ConvertSource(_sourceFile, _targetFile, _knownVars) {
	const fileLabel = basename(_sourceFile);
	const text = _DisabledToComments(_CleanBrokenDecls(_ReadLegacy(_sourceFile), _sourceFile), _sourceFile);
	const root = postcss.parse(text, { from: _sourceFile });
	const stats = {};

	const decls = [];
	root.walkDecls((_decl) => {
		if (/^-µcss$/i.test(_decl.prop)) decls.push(_decl);
	});
	for (const decl of decls) {
		const kind = _ConvertDirective(decl, fileLabel, _knownVars);
		stats[kind] = (stats[kind] ?? 0) + 1;
	}

	writeFileSync(_targetFile, root.toString(), "utf8");
	return stats;
}

// --------------------------------------------------------------------- main

if (!existsSync(manifestCss)) {
	console.error(`legacy manifest not found: ${manifestCss}`);
	process.exit(1);
}

const skinName = basename(manifestCss).replace(/^µ\./, "").replace(/\.css$/i, "");
const manifest = _ParseManifest(manifestCss);
const knownVars = new Set(manifest.vars.map((_v) => _v.name));

// Folders produced by project-targeted generator steps (raw -> final): a
// copy/copyFolder reading from one of these is satisfied at build time even
// though the folder does not exist yet at conversion time.
const generatedDirs = new Set();
for (const entry of manifest.media) {
	const s = entry.step;
	if (s.outputBase !== "project") continue;
	if (s.sequenceStrip && s.outputFile) generatedDirs.add(dirname(s.outputFile).replace(/\\/g, "/"));
	if (s.outputDir && (s.buttonsAndIcons || s.appIcons)) generatedDirs.add(s.outputDir.replace(/\\/g, "/"));
}
const _IsGenerated = (_p) => {
	const p = _p.replace(/\\/g, "/");
	for (const dir of generatedDirs) {
		if (dir === p || dir.startsWith(`${p}/`) || p.startsWith(`${dir}/`)) return true;
	}
	return false;
};

// Validate media sources: a missing copy/copyFolder source that is not produced
// by an earlier generation step usually means the legacy raw -> final step was
// never archived; BuildSkin will fail on it until the folder is restored.
for (const entry of manifest.media) {
	const sourcePath = entry.step.copy ?? entry.step.copyFolder;
	if (sourcePath && !existsSync(join(projectDir, sourcePath)) && !_IsGenerated(sourcePath)) {
		_Warn(basename(manifestCss), `media source missing in project: ${sourcePath} (BuildSkin will fail on this step)`);
	}
}

writeFileSync(join(srcDir, `${skinName}.µcss.mjs`), _EmitManifest(manifest, skinName), "utf8");
writeFileSync(join(srcDir, "helpers.mjs"), _EmitHelpers(), "utf8");
console.log(`manifest: skins/src/${skinName}.µcss.mjs (${manifest.vars.length} vars, ${manifest.cursors.length} cursors, ` +
	`${manifest.media.length} media steps, ${manifest.files.length} files)`);
console.log(`helpers:  skins/src/helpers.mjs (legacy functions skipped: ${manifest.functions.join(", ") || "-"})`);

for (const entry of manifest.files) {
	const legacySource = join(srcDir, entry.source.replace(/\.µ\.css$/i, ".css"));
	const target = join(srcDir, entry.source);
	if (!existsSync(legacySource)) {
		_Warn(basename(legacySource), "source file missing - skipped");
		continue;
	}
	const stats = _ConvertSource(legacySource, target, knownVars);
	const summary = Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(", ") || "plain css";
	console.log(`converted: ${basename(legacySource)} -> ${entry.source} (${summary})`);
}

if (warnings.length) {
	console.log(`\n${warnings.length} warning(s):`);
	for (const warning of warnings) console.log(`  - ${warning}`);
}
