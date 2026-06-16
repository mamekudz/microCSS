// Converts LESS sources to the new microCSS format (docs/CONCEPT.md, D10).
//
// This is a *migration aid*, not a 100% LESS compiler: it mechanically maps the
// LESS constructs that have a clean microCSS counterpart and flags everything it
// cannot translate with a TODO comment + a report entry, so the result is always
// reviewable rather than silently wrong.
//
// What it converts:
//   - @var: value;            -> manifest var (vars: { var: ... }) + usage @var -> µ($.var)
//   - nesting incl. & / &-foo -> flattened rules (via postcss-nested)
//   - lighten/darken/fade/mix -> µ(Lighten/Alpha/MixColors(...)) (approximated)
//   - @import "x.less";       -> @import "x.µ.css"; (build-time bundling, D8)
//   - // line comments        -> /* block comments */
//
// What it deliberately leaves for manual review (TODO comment + warning):
//   - mixins (definition .foo(@a){} and calls .foo();) -> port to a µCSS helper
//   - LESS arithmetic with units (width: @base * 2) -> wrap in µ(...) by hand
//   - color functions without a microCSS equivalent (saturate, spin, ...)
//
// Programmatic use (unit-tested): ConvertLess(source, { from }) -> { css, vars,
// warnings, notes }. CLI: node tools/convert-less.mjs <input.less|dir> [outDir].

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, resolve, relative, basename, extname, parse, sep } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import less from "postcss-less";
import nested from "postcss-nested";

// LESS color functions. Only the MAPPED set has a microCSS Color API counterpart;
// the others are left untouched so the developer ports them by hand.
const MAPPED_FUNCS = new Set(["lighten", "darken", "fade", "mix"]);
const LESS_FUNCS = new Set([
	"lighten", "darken", "saturate", "desaturate", "fadein", "fadeout", "fade",
	"spin", "mix", "tint", "shade", "greyscale", "grayscale", "contrast",
	"screen", "multiply", "overlay", "softlight", "hardlight", "difference",
	"exclusion", "average", "negation", "luma", "luminance"
]);

// ---------------------------------------------------------------- text tools

// Splits an argument list at top-level commas (and LESS' semicolon separator),
// respecting quotes and nested parentheses.
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
		} else if ((ch === "," || ch === ";") && depth === 0) {
			if (current.trim() !== "") args.push(current.trim());
			current = "";
		} else {
			current += ch;
		}
	}
	if (current.trim() !== "") args.push(current.trim());
	return args;
}

// Index of the ")" matching the "(" at _open, or -1. Quotes are respected.
function _MatchParen(_text, _open) {
	let depth = 0, quote = null;
	for (let i = _open; i < _text.length; i++) {
		const ch = _text[i];
		if (quote) {
			if (ch === "\\") { i++; continue; }
			if (ch === quote) quote = null;
		} else if (ch === "'" || ch === "\"") {
			quote = ch;
		} else if (ch === "(") {
			depth++;
		} else if (ch === ")") {
			if (--depth === 0) return i;
		}
	}
	return -1;
}

// LESS variable name -> microCSS scope access. Plain identifiers become $.name,
// hyphenated names fall back to bracket access $["my-var"].
function _JsRef(_name) {
	return /^[A-Za-z_]\w*$/.test(_name) ? `$.${_name}` : `$[${JSON.stringify(_name)}]`;
}

// A LESS percentage/number argument -> a microCSS fraction. "10%" -> "0.1",
// "0.2" -> "0.2".
function _Frac(_value) {
	const value = String(_value).trim();
	if (value.endsWith("%")) return String(parseFloat(value) / 100);
	return value;
}

// ----------------------------------------------------------- value translation

// Color-function argument -> microCSS expression: a @var reference becomes a
// scope access, anything else (a literal color/number) a quoted string that the
// Color API's ParseColor understands.
function _ColorArg(_arg, _ctx) {
	const arg = _arg.trim();
	const match = arg.match(/^@\{?([A-Za-z_][\w-]*)\}?$/);
	if (match) { _ctx.useVar(match[1]); return _JsRef(match[1]); }
	return JSON.stringify(arg);
}

// Maps one LESS color call to a microCSS Color API expression, or null when it
// cannot be mapped safely (nested call, unsupported mix weight) - the caller
// then leaves the whole value untouched.
function _MapColorCall(_fn, _args, _ctx, _value) {
	if (_args.some((_a) => _a.includes("("))) {
		_ctx.warn(`nested color function not converted: "${_value}"`);
		return null;
	}
	const col = (_a) => _ColorArg(_a, _ctx);
	switch (_fn) {
		case "lighten": return `Lighten(${col(_args[0])}, ${_Frac(_args[1])})`;
		case "darken": return `Lighten(${col(_args[0])}, -(${_Frac(_args[1])}))`;
		case "fade": return `Alpha(${col(_args[0])}, ${_Frac(_args[1])})`;
		case "mix": {
			if (_args[2] !== undefined && _Frac(_args[2]) !== "0.5") {
				_ctx.warn(`mix() weight ${_args[2]} not supported (MixColors averages 50/50): "${_value}"`);
				return null;
			}
			return `MixColors(${col(_args[0])}, ${col(_args[1])})`;
		}
		default: return null;
	}
}

// Replaces every mapped color-function call in a value with a µ(...) fragment.
// Returns null when one call cannot be mapped (signal: leave the value as-is).
function _ReplaceColorFuncs(_value, _ctx) {
	let out = "", i = 0, mapped = false;
	while (i < _value.length) {
		const rest = _value.slice(i);
		const match = rest.match(/^([A-Za-z][A-Za-z0-9]*)\s*\(/);
		if (match && MAPPED_FUNCS.has(match[1].toLowerCase())) {
			const open = i + match[0].length - 1;
			const close = _MatchParen(_value, open);
			if (close === -1) { out += _value[i++]; continue; }
			const expr = _MapColorCall(match[1].toLowerCase(), _SplitArgs(_value.slice(open + 1, close)), _ctx, _value);
			if (expr === null) return null;
			out += `µ(${expr})`;
			i = close + 1;
			mapped = true;
		} else {
			out += _value[i++];
		}
	}
	if (mapped) _ctx.note(`color math approximated (LESS and microCSS use different models): "${_value}"`);
	return out;
}

// Collects the LESS color function names used in a value.
function _LessFuncsIn(_value) {
	const names = new Set();
	for (const match of _value.matchAll(/\b([A-Za-z][A-Za-z0-9]*)\s*\(/g)) {
		const name = match[1].toLowerCase();
		if (LESS_FUNCS.has(name)) names.add(name);
	}
	return [...names];
}

// Translates a declaration value from LESS to microCSS. Pure CSS values pass
// through unchanged.
function _TranslateValue(_value, _ctx) {
	const hasVar = /@/.test(_value);
	const funcs = _LessFuncsIn(_value);
	if (!hasVar && funcs.length === 0) return _value;

	const unmapped = funcs.filter((_f) => !MAPPED_FUNCS.has(_f));
	if (unmapped.length) {
		_ctx.warn(`LESS function ${unmapped.join("/")}() not converted - port to the µ() color API: "${_value}"`);
		return _value;
	}
	if (hasVar && /[*/]/.test(_value)) {
		_ctx.warn(`LESS arithmetic not converted - wrap by hand, e.g. width: µ($.base * 2)px: "${_value}"`);
		return _value;
	}

	const replaced = _ReplaceColorFuncs(_value, _ctx);
	if (replaced === null) return _value;
	return replaced.replace(/@\{([A-Za-z_][\w-]*)\}|@([A-Za-z_][\w-]*)/g, (_m, _braced, _plain) => {
		const name = _braced ?? _plain;
		_ctx.useVar(name);
		return `µ(${_JsRef(name)})`;
	});
}

// ----------------------------------------------------------- node translation

// A LESS variable value -> a JS literal source string for the manifest: numbers
// stay numeric, everything else becomes a quoted string.
function _VarLiteral(_value) {
	return /^-?\d+(\.\d+)?$/.test(_value) ? _value : JSON.stringify(_value);
}

// Rewrites an @import params string: drops LESS import options, maps .less to
// .µ.css and gives extensionless targets the .µ.css extension.
function _RewriteImport(_params, _ctx) {
	let params = _params.trim();
	const options = params.match(/^\(([^)]*)\)\s*/);
	if (options) {
		_ctx.warn(`@import options "(${options[1]})" dropped`);
		params = params.slice(options[0].length).trim();
	}
	params = params.replace(/\.less(['"])/i, ".µ.css$1");
	params = params.replace(/^(['"])([^'"]+?)\1$/, (_m, _q, _path) => (/\.[\w]+$/.test(_path) ? _m : `${_q}${_path}.µ.css${_q}`));
	return params;
}

// True for a rule whose selector is a parametric mixin definition like
// ".card(@c)" or ".clearfix() when (...)".
function _IsMixinDefinition(_selector) {
	return /^\s*[.#][\w-]+\s*\(/.test(_selector);
}

// Converts a LESS document (postcss-less AST) to microCSS in place.
function _ConvertRoot(_root, _ctx) {
	// 1. At-rules: variables -> manifest, @import -> rewritten, mixin calls -> TODO.
	for (const atrule of _AtRules(_root)) {
		if (atrule.variable) {
			const name = atrule.name;
			const value = (atrule.params ?? "").trim();
			if (atrule.parent && atrule.parent.type === "rule") {
				_ctx.warn(`local variable @${name} hoisted to the global manifest (was scoped to "${atrule.parent.selector}")`);
			}
			if (/@/.test(value)) {
				_ctx.warn(`variable @${name} references another value ("${value}") - stored as a literal string; review it in the manifest`);
			}
			_ctx.addVar(name, _VarLiteral(value));
			atrule.remove();
		} else if (atrule.import) {
			atrule.params = _RewriteImport(atrule.params, _ctx);
		} else if (atrule.mixin) {
			const call = `.${atrule.name}${atrule.params ?? ""}`;
			_ctx.warn(`mixin call "${call}" kept as TODO - port to a µCSS helper (-µ:) or inline it`);
			atrule.replaceWith(postcss.comment({ text: `TODO(convert): LESS mixin call "${call}"` }));
		}
	}

	// 2. Mixin definitions (.foo(@a){...}) -> TODO comment, body dropped.
	for (const rule of _Rules(_root)) {
		if (_IsMixinDefinition(rule.selector)) {
			_ctx.warn(`mixin definition "${rule.selector}" kept as TODO - port to a µCSS helper module`);
			rule.replaceWith(postcss.comment({ text: `TODO(convert): LESS mixin definition "${rule.selector}"` }));
		}
	}

	// 3. Selector interpolation @{name} -> µ($.name).
	_root.walkRules((_rule) => {
		if (!_rule.selector.includes("@{")) return;
		_rule.selector = _rule.selector.replace(/@\{([A-Za-z_][\w-]*)\}/g, (_m, _name) => {
			_ctx.useVar(_name);
			_ctx.warn(`selector interpolation in "${_rule.selector}" converted to µ() - verify the output`);
			return `µ(${_JsRef(_name)})`;
		});
	});

	// 4. Declaration values.
	_root.walkDecls((_decl) => {
		_decl.value = _TranslateValue(_decl.value, _ctx);
	});

	// 5. Flatten nesting (& / &-suffix) into top-level rules.
	const result = postcss([nested()]).process(_root, { from: _ctx.from });
	return result.css;
}

// Snapshot helpers so removing/replacing nodes during iteration is safe.
function _AtRules(_root) {
	const list = [];
	_root.walkAtRules((_a) => list.push(_a));
	return list;
}
function _Rules(_root) {
	const list = [];
	_root.walkRules((_r) => list.push(_r));
	return list;
}

// --------------------------------------------------------------- public API

// Converts a LESS source string to microCSS. Returns { css, vars, warnings,
// notes }: vars is an array of { name, literal } (literal = JS source text for
// the manifest), warnings list things left for manual review, notes flag
// approximations (e.g. color math).
export function ConvertLess(_source, _options = {}) {
	const warnings = [];
	const notes = [];
	const vars = new Map();
	const usedVars = new Set();
	const ctx = {
		from: _options.from ?? "input.less",
		warn: (_message) => warnings.push(_message),
		note: (_message) => notes.push(_message),
		useVar: (_name) => usedVars.add(_name),
		addVar: (_name, _literal) => {
			const existing = vars.get(_name);
			if (existing !== undefined && existing !== _literal) {
				warnings.push(`variable @${_name} redefined (${existing} -> ${_literal}); last value wins`);
			}
			vars.set(_name, _literal);
		}
	};

	const root = less.parse(_source, { from: ctx.from });
	const css = _ConvertRoot(root, ctx);

	// Variables used in the source but never defined here (likely defined in an
	// imported file). Exposed separately so a multi-file CLI run can resolve them
	// against the other files before deciding whether to warn.
	const undefinedVars = [...usedVars].filter((_name) => !vars.has(_name));

	return {
		css,
		vars: [...vars].map(([name, literal]) => ({ name, literal })),
		undefinedVars,
		warnings,
		notes
	};
}

// ------------------------------------------------------------- manifest output

function _EmitManifest(_vars, _files, _skinName, _outDir) {
	const microcssDir = resolve(here, "..");
	const importPath = relative(_outDir, join(microcssDir, "src/index.mjs")).replace(/\\/g, "/");
	const lines = [];
	lines.push(`// Skin manifest "${_skinName}" - generated from LESS sources by`);
	lines.push("// gulp-mu-css/tools/convert-less.mjs. Review before use; in a standalone");
	lines.push('// project import from the "gulp-mu-css" package instead of the relative path.');
	lines.push(`import { DefineSkin } from "${importPath.startsWith(".") ? importPath : `./${importPath}`}";`);
	lines.push("");
	lines.push("export default DefineSkin({");
	lines.push("\tvars: {");
	for (const v of _vars) {
		const key = /^[A-Za-z_]\w*$/.test(v.name) ? v.name : JSON.stringify(v.name);
		lines.push(`\t\t${key}: ${v.literal},`);
	}
	lines.push("\t},");
	lines.push("");
	lines.push("\tfiles: [");
	for (const f of _files) lines.push(`\t\t{ source: ${JSON.stringify(f.source)}, target: ${JSON.stringify(f.target)} },`);
	lines.push("\t]");
	lines.push("});");
	lines.push("");
	return lines.join("\n");
}

// --------------------------------------------------------------------- CLI

const here = dirname(fileURLToPath(import.meta.url));

// Recursively lists *.less files under a directory.
function _FindLessFiles(_dir) {
	const out = [];
	for (const dirent of readdirSync(_dir, { withFileTypes: true })) {
		const full = join(_dir, dirent.name);
		if (dirent.isDirectory()) out.push(..._FindLessFiles(full));
		else if (dirent.isFile() && /\.less$/i.test(dirent.name)) out.push(full);
	}
	return out;
}

function _Main(_argv) {
	const inputArg = _argv[0];
	if (!inputArg) {
		console.error("usage: node tools/convert-less.mjs <input.less|dir> [outDir]");
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
	const files = isDir ? _FindLessFiles(input) : [input];

	const allVars = new Map();
	const manifestFiles = [];
	const converted = [];

	// Pass 1: convert every file and collect the variables defined anywhere.
	for (const file of files) {
		const result = ConvertLess(readFileSync(file, "utf8"), { from: file });
		const rel = relative(baseDir, file).split(sep).join("/");
		const targetRel = rel.replace(/\.less$/i, ".µ.css");
		const targetFile = join(outDir, targetRel);
		mkdirSync(dirname(targetFile), { recursive: true });
		writeFileSync(targetFile, result.css, "utf8");

		for (const v of result.vars) {
			if (allVars.has(v.name) && allVars.get(v.name) !== v.literal) {
				result.warnings.push(`variable @${v.name} also defined differently in another file; last value wins`);
			}
			allVars.set(v.name, v.literal);
		}
		manifestFiles.push({ source: targetRel, target: targetRel.replace(/\.µ\.css$/i, ".css") });
		converted.push({ rel, targetRel, result });
	}

	// Pass 2: report, now that undefined-variable references can be checked
	// against the full set (a var defined in an imported file is fine).
	let totalWarnings = 0, totalNotes = 0;
	for (const { rel, targetRel, result } of converted) {
		const warnings = [...result.warnings];
		for (const name of result.undefinedVars) {
			if (!allVars.has(name)) warnings.push(`variable @${name} is used but defined nowhere in the converted set - add it to the manifest`);
		}
		console.log(`converted: ${rel} -> ${targetRel} (${result.vars.length} vars, ${warnings.length} warnings, ${result.notes.length} notes)`);
		for (const w of warnings) console.log(`    ! ${w}`);
		for (const n of result.notes) console.log(`    ~ ${n}`);
		totalWarnings += warnings.length;
		totalNotes += result.notes.length;
	}

	const skinName = isDir ? basename(input) : parse(input).name;
	const manifest = _EmitManifest([...allVars].map(([name, literal]) => ({ name, literal })), manifestFiles, skinName, outDir);
	const manifestFile = join(outDir, `${skinName}.µcss.mjs`);
	writeFileSync(manifestFile, manifest, "utf8");

	console.log(`\nmanifest: ${relative(process.cwd(), manifestFile)} (${allVars.size} vars, ${manifestFiles.length} files)`);
	console.log(`done: ${files.length} file(s), ${totalWarnings} warning(s), ${totalNotes} note(s).`);
}

// Run as a CLI only when invoked directly (not when imported by tests).
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
	_Main(process.argv.slice(2));
}
