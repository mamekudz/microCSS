// Build-time @import inlining for *.µ.css (docs/CONCEPT.md, D8).
//
// Reuses the standard CSS @import at-rule so editors stay happy, but resolves
// it at compile time: local targets (and glob patterns) are read from disk and
// their nodes are spliced in place of the @import, producing a single bundle.
// This is the co-location bridge for Vue & friends - component styles live next
// to the .vue file as e.g. MyButton.π.css and are pulled in with one wildcard
// import in the central stylesheet.
//
// Rules:
//   - Targets relative to the importing file's directory.
//   - Glob support via * (one path segment), ** (any depth) and ? (one char).
//   - Each resolved file is inlined once (dedupe by absolute path); this also
//     makes the resolution cycle-safe (an already-active file is skipped with
//     a warning).
//   - Remote/conditional imports pass through unchanged (kept as native
//     @import): url(...), http(s):// or // targets, data: URLs and any import
//     carrying a media query / cascade layer after the string.
//   - A missing single file is an error; a glob that matches nothing is a
//     warning (a component directory may legitimately be empty during dev).

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { CssDocument } from "../css/CssDocument.mjs";
import { FilterSource } from "./BuildFilter.mjs";

// Glob metacharacters that trigger directory scanning.
function _HasMagic(_pattern) {
	return /[*?]/.test(_pattern);
}

// Extracts the first import target from an @import params string:
// '"path"', "'path'" or 'url("path")'. Returns { value, url, rest } where rest
// is whatever trails the target (media query / layer) or "" when nothing does.
function _ParseImportTarget(_params) {
	const params = _params.trim();
	let match = params.match(/^url\(\s*(['"]?)([^'")]+)\1\s*\)(.*)$/i);
	if (match) return { value: match[2].trim(), url: true, rest: match[3].trim() };
	match = params.match(/^(['"])(.*?)\1(.*)$/);
	if (match) return { value: match[2].trim(), url: false, rest: match[3].trim() };
	return null;
}

// A target is left as a native @import (not inlined) when it is remote or
// carries conditions (media query / cascade layer) that only make sense at
// runtime.
function _IsPassthrough(_target) {
	if (_target.url) return true;
	if (_target.rest) return true;
	return /^(https?:)?\/\//i.test(_target.value) || /^data:/i.test(_target.value);
}

// Converts a relative glob (forward-slash form) into an anchored RegExp that is
// tested against paths relative to the search root.
function _GlobToRegExp(_glob) {
	let out = "";
	for (let i = 0; i < _glob.length; i++) {
		const ch = _glob[i];
		if (ch === "*") {
			if (_glob[i + 1] === "*") {
				// "**/" -> any number of directories (including none); a bare
				// "**" -> anything across segment boundaries.
				if (_glob[i + 2] === "/") { out += "(?:[^/]+/)*"; i += 2; }
				else { out += ".*"; i += 1; }
			} else {
				out += "[^/]*";
			}
		} else if (ch === "?") {
			out += "[^/]";
		} else if ("\\^$.|+()[]{}".includes(ch)) {
			out += `\\${ch}`;
		} else {
			out += ch;
		}
	}
	return new RegExp(`^${out}$`);
}

// Resolves a glob pattern (relative to _baseDir) to a sorted list of absolute
// file paths. The static leading segments narrow the directory that is walked.
function _GlobFiles(_baseDir, _pattern) {
	const segments = _pattern.split(/[\\/]/);
	const staticSegments = [];
	while (segments.length && !_HasMagic(segments[0])) staticSegments.push(segments.shift());
	const searchRoot = join(_baseDir, ...staticSegments);
	if (!existsSync(searchRoot) || !statSync(searchRoot).isDirectory()) return [];

	const regExp = _GlobToRegExp(segments.join("/"));
	const matches = [];
	const walk = (_dir) => {
		for (const dirent of readdirSync(_dir, { withFileTypes: true })) {
			const full = join(_dir, dirent.name);
			if (dirent.isDirectory()) walk(full);
			else if (dirent.isFile()) {
				const rel = full.slice(searchRoot.length + 1).split(sep).join("/");
				if (regExp.test(rel)) matches.push(resolve(full));
			}
		}
	};
	walk(searchRoot);
	matches.sort();
	return matches;
}

// Resolves a single (non-glob) target to an absolute path, or null if it does
// not exist (the caller decides how to report a miss).
function _ResolveSingle(_baseDir, _target) {
	const candidate = isAbsolute(_target) ? _target : join(_baseDir, _target);
	if (existsSync(candidate) && statSync(candidate).isFile()) return resolve(candidate);
	return null;
}

// Applies a diagnostic policy to a situation: "error" throws, "warn" records a
// warning, "ignore" stays silent.
function _Report(_mode, _message, _warnings) {
	if (_mode === "error") throw new Error(_message);
	if (_mode === "ignore") return;
	_warnings.push(_message);
}

// Default diagnostic modes for the import resolver. onMissing applies to a
// named single file that does not exist, onEmptyGlob to a wildcard import that
// matches nothing, onCircular to a target already on the resolution stack.
const DEFAULT_IMPORT_MODES = { onMissing: "error", onEmptyGlob: "warn", onCircular: "warn" };

// Inlines every local @import in _document (recursively). _options.from is the
// absolute path of the importing file and is required to resolve relative
// targets; without it the document is returned unchanged. The diagnostic modes
// (onMissing / onEmptyGlob / onCircular, each "error" | "warn" | "ignore") are
// taken from _options and threaded through the recursion. _options.buildFilter
// (when set) runs gulp-mu-build-filter on each imported file's text on read.
// Returns { resolved, warnings } where resolved lists every inlined file in order.
export function ResolveImports(_document, _options = {}) {
	const fromAbs = _options.from ? resolve(_options.from) : null;
	if (!fromAbs) return { resolved: [], warnings: [] };

	const modes = { ...DEFAULT_IMPORT_MODES, ..._options.modes };
	const buildFilter = _options.buildFilter ?? null;
	const visited = _options.visited ?? new Set([fromAbs]);
	const stack = _options.stack ?? [fromAbs];
	const warnings = _options.warnings ?? [];
	const resolved = _options.resolved ?? [];
	const baseDir = dirname(fromAbs);

	const imports = [];
	_document.root.walkAtRules("import", (_atrule) => imports.push(_atrule));

	for (const atrule of imports) {
		const target = _ParseImportTarget(atrule.params);
		if (!target || _IsPassthrough(target)) continue;

		const isGlob = _HasMagic(target.value);
		let files;
		if (isGlob) {
			files = _GlobFiles(baseDir, target.value);
			if (files.length === 0) {
				_Report(modes.onEmptyGlob, `@import "${target.value}" in ${fromAbs} matched no files.`, warnings);
				atrule.remove();
				continue;
			}
		} else {
			const single = _ResolveSingle(baseDir, target.value);
			if (!single) {
				_Report(modes.onMissing, `@import "${target.value}" not found (resolved under ${baseDir}) in ${fromAbs}.`, warnings);
				atrule.remove();
				continue;
			}
			files = [single];
		}

		const collected = [];
		for (const file of files) {
			if (stack.includes(file)) {
				_Report(modes.onCircular, `circular @import skipped: "${target.value}" -> ${file} (from ${fromAbs}).`, warnings);
				continue;
			}
			if (visited.has(file)) continue;
			visited.add(file);
			resolved.push(file);
			const childText = FilterSource(readFileSync(file, "utf8"), buildFilter);
			const childDocument = CssDocument.FromString(childText, { from: file });
			ResolveImports(childDocument, { from: file, modes, buildFilter, visited, stack: [...stack, file], warnings, resolved });
			collected.push(...childDocument.root.nodes);
		}

		if (collected.length) atrule.replaceWith(...collected);
		else atrule.remove();
	}

	return { resolved, warnings };
}
