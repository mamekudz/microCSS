// The µCSS source compiler core (*.µ.css): resolves µ(expression) interpolations in values
// and executes -µ:/-mu: directive declarations (docs/CONCEPT.md, D2).
// Sprite/cursor/media directives are added in later milestones; this core
// provides the mechanism plus the rule-bound manipulation builtins.

import { CssDocument, CssRule } from "../css/CssDocument.mjs";
import { MuContext } from "../eval/MuContext.mjs";
import { ResolveImports } from "./Imports.mjs";
import { ConvertOverrideAtRules, MergeRules } from "./MergeRules.mjs";
import { ApplyNamespaces } from "./Namespace.mjs";
import { FilterSource } from "./BuildFilter.mjs";

const DIRECTIVE_PROP = /^-(?:µ|mu)$/i;

// Finds the next µ( / mu( interpolation start in a text, returns
// { start, exprStart } or null. "mu" must stand on a word boundary so that
// e.g. "emu(" is not treated as an interpolation.
function _FindStart(_text, _from) {
	for (let i = _from; i < _text.length; i++) {
		if (_text[i] === "\u00B5" && _text[i + 1] === "(") {
			return { start: i, exprStart: i + 2 };
		}
		if (_text[i] === "m" && _text[i + 1] === "u" && _text[i + 2] === "(") {
			const before = i > 0 ? _text[i - 1] : "";
			if (!/[A-Za-z0-9_-]/.test(before)) return { start: i, exprStart: i + 3 };
		}
	}
	return null;
}

// Returns the index of the parenthesis closing the expression that starts at
// _exprStart (which is just behind the opening paren), honoring nested parens
// and quoted strings.
function _FindEnd(_text, _exprStart) {
	let depth = 1;
	let quote = null;
	for (let i = _exprStart; i < _text.length; i++) {
		const ch = _text[i];
		if (quote) {
			if (ch === "\\") i++;
			else if (ch === quote) quote = null;
		} else if (ch === "'" || ch === "\"" || ch === "`") {
			quote = ch;
		} else if (ch === "(") {
			depth++;
		} else if (ch === ")") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

// Replaces every µ(expr) / mu(expr) occurrence in _text with the evaluated
// result. _evaluate receives the raw expression source.
export function ReplaceInterpolations(_text, _evaluate) {
	let text = _text;
	let searchFrom = 0;
	for (;;) {
		const hit = _FindStart(text, searchFrom);
		if (!hit) return text;
		const end = _FindEnd(text, hit.exprStart);
		if (end < 0) throw new Error(`unbalanced parentheses in interpolation: ${text.slice(hit.start)}`);
		const expression = text.slice(hit.exprStart, end);
		let result;
		try {
			result = _evaluate(expression);
		} catch (error) {
			// Name the failing expression - a value may contain several µ().
			throw new Error(`µ(${expression}): ${error.message}`, { cause: error });
		}
		if (result === null || result === undefined) {
			throw new Error(`interpolation µ(${expression}) returned ${result}`);
		}
		const replacement = String(result);
		text = text.slice(0, hit.start) + replacement + text.slice(end + 1);
		searchFrom = hit.start + replacement.length;
	}
}

// Legacy gradient direction keywords (e.g. "linear-gradient(top, ...)") are
// invalid in modern CSS without a vendor prefix. The old Photoshop µCSS build
// emitted prefixed variants; this build normalizes the keyword to the standard
// "to <opposite>" form instead. Angles, existing "to ..." and color-first
// gradients are left untouched. Legacy = start edge/corner, modern "to" = the
// opposite (destination) edge/corner.
const _LEGACY_GRADIENT_DIR = {
	"top": "to bottom", "bottom": "to top",
	"left": "to right", "right": "to left",
	"top left": "to bottom right", "left top": "to bottom right",
	"top right": "to bottom left", "right top": "to bottom left",
	"bottom left": "to top right", "left bottom": "to top right",
	"bottom right": "to top left", "right bottom": "to top left"
};

// Rewrites legacy keyword directions in linear-gradient()/repeating-linear-
// gradient() to the modern "to ..." syntax. Only the first top-level argument
// is touched, and only when it is exactly one of the legacy direction keywords;
// angles, "to ..." and color-first gradients pass through unchanged. Handles
// nested parens (rgba() stops), multiple comma-separated layers and gradients
// inside border-image-source. radial-gradient is left untouched.
export function NormalizeLegacyGradients(_value) {
	if (!/(^|[^-\w])(?:repeating-)?linear-gradient\s*\(/i.test(_value)) return _value;
	let out = "";
	const re = /(^|[^-\w])((?:repeating-)?linear-gradient)\s*\(/gi;
	let last = 0;
	let m;
	while ((m = re.exec(_value)) !== null) {
		const openParen = m.index + m[0].length - 1;
		let depth = 1;
		let i = openParen + 1;
		for (; i < _value.length && depth > 0; i++) {
			if (_value[i] === "(") depth++;
			else if (_value[i] === ")") depth--;
		}
		const inner = _value.slice(openParen + 1, i - 1);
		let d = 0;
		let c = 0;
		for (; c < inner.length; c++) {
			if (inner[c] === "(") d++;
			else if (inner[c] === ")") d--;
			else if (inner[c] === "," && d === 0) break;
		}
		const firstArg = inner.slice(0, c).trim();
		const rest = inner.slice(c);
		const key = firstArg.toLowerCase().replace(/\s+/g, " ");
		const fixedInner = _LEGACY_GRADIENT_DIR[key] !== undefined ? _LEGACY_GRADIENT_DIR[key] + rest : inner;
		out += _value.slice(last, m.index) + m[1] + m[2] + "(" + fixedInner + ")";
		last = i;
		re.lastIndex = i;
	}
	return out + _value.slice(last);
}

// Builds the extra scope for a directive: manipulation builtins bound to the
// rule that contains the directive declaration, plus the sprite/cursor
// directives when their managers are configured.
function _DirectiveScope(_decl, _document, _options, _insertAnchors) {
	const parent = _decl.parent;
	const rule = (parent && parent.type !== "root") ? new CssRule(parent) : null;
	const scope = {
		rule,
		document: _document,
		AddProperty: (_prop, _value, _important) => rule.AddProperty(_prop, _value, _important),
		ChangeProperty: (_prop, _value, _important) => rule.ChangeProperty(_prop, _value, _important),
		RemoveProperty: (_prop) => rule.RemoveProperty(_prop),
		AddRule: (_selector) => _document.AddRule(_selector),
		// InsertRule places generated rules directly behind the rule that
		// contains the directive; consecutive calls keep their order, even
		// across multiple directives in the same rule (legacy AddBlock with
		// element index).
		InsertRule: (_selector) => {
			const anchor = _insertAnchors.get(parent) ?? rule;
			const inserted = _document.AddRule(_selector, { after: anchor });
			_insertAnchors.set(parent, inserted);
			return inserted;
		},
		Sprite: (_url, _spriteOptions) => {
			if (!_options.sprites) throw new Error("Sprite(): no sprite manager configured (options.sprites).");
			_options.sprites.Register(rule, _url, _spriteOptions);
		},
		Cursor: (_name) => {
			if (!_options.cursors) throw new Error("Cursor(): no cursor manager configured (options.cursors).");
			_options.cursors.Apply(rule, _name);
		}
	};
	return scope;
}

// Extra scope for value interpolations: Cursor(...) as value function.
function _ValueScope(_options) {
	if (!_options.cursors) return {};
	return { Cursor: (_name) => _options.cursors.Value(_name) };
}

// Compiles µCSS source text (*.µ.css) into a CssDocument:
//   1. -µ:/-mu: directive declarations are evaluated (document order) and
//      removed from the output.
//   2. µ(expr)/mu(expr) interpolations in declaration values and at-rule
//      params are replaced by their evaluated result.
//
// _options: { vars, helpers, from, context, sprites, cursors, resolveImports,
// imports, merge, buildFilter, onWarning } - pass an existing MuContext via
// context, or vars/helpers to create one. buildFilter ({ release, client,
// version, platform, variants, mode }) runs gulp-mu-build-filter on the raw
// source (and every imported file) before parsing. sprites (SpriteManager) and
// cursors
// (CursorManager) enable the Sprite()/Cursor() directives; sprite rules are
// only registered here and rewritten later by sprites.Resolve(document). When
// options.from is set, local @import targets are inlined at compile time
// (resolveImports: false disables it; imports: { onMissing, onEmptyGlob,
// onCircular } configures the diagnostic modes). When merge is truthy,
// duplicate top-level rules are reconciled afterwards (merge: true or
// { onConflict: "error"|"warn"|"keep" }).
export function CompileMcss(_source, _options = {}) {
	// 0. Build-type / variant filtering on the raw source text (before parsing),
	// so blocks removed for this build never reach the AST or @import scan.
	const source = typeof _source === "string"
		? FilterSource(_source, _options.buildFilter)
		: _source;
	const document = source instanceof CssDocument
		? source
		: CssDocument.FromString(source, { from: _options.from });
	const warn = _options.onWarning ?? ((_message) => console.warn(`microCSS: ${_message}`));

	// 0a. Inline local @import targets (build-time bundling, co-location bridge).
	// Import diagnostics are manifest-configurable via options.imports
	// ({ onMissing, onEmptyGlob, onCircular }: "error" | "warn" | "ignore");
	// imported files are build-filtered with the same config.
	if (_options.resolveImports !== false && _options.from) {
		const { warnings } = ResolveImports(document, { from: _options.from, modes: _options.imports, buildFilter: _options.buildFilter });
		warnings.forEach(warn);
	}
	// 0b. Turn @µ-override blocks into flagged rules before interpolation, so
	// their values are processed like any other declaration.
	ConvertOverrideAtRules(document);
	// 0c. Apply per-file @µ-namespace prefixes to class selectors (scoped by
	// source file, so it still works after @import inlining).
	ApplyNamespaces(document);

	const context = _options.context ?? new MuContext(_options);
	const valueScope = _ValueScope(_options);
	// Last InsertRule() result per containing rule (see _DirectiveScope).
	const insertAnchors = new Map();

	// Snapshot first: directives may append nodes, which must not be walked.
	const decls = [];
	document.root.walkDecls((_decl) => decls.push(_decl));
	const atrules = [];
	document.root.walkAtRules((_atrule) => atrules.push(_atrule));

	for (const decl of decls) {
		try {
			if (DIRECTIVE_PROP.test(decl.prop)) {
				context.Evaluate(decl.value, _DirectiveScope(decl, document, _options, insertAnchors));
				decl.remove();
			} else if (decl.value.includes("(")) {
				decl.value = ReplaceInterpolations(decl.value, (_expr) => context.Evaluate(_expr, valueScope));
			}
		} catch (error) {
			throw decl.error(`microCSS: ${error.message}`, { word: decl.prop });
		}
	}

	for (const atrule of atrules) {
		try {
			if (atrule.params && atrule.params.includes("(")) {
				atrule.params = ReplaceInterpolations(atrule.params, (_expr) => context.Evaluate(_expr, valueScope));
			}
		} catch (error) {
			throw atrule.error(`microCSS: ${error.message}`);
		}
	}

	// Normalize legacy gradient directions in all final declaration values -
	// plain declarations and AddProperty-injected ones alike (e.g. helpers).
	// Runs on the finished AST so it catches every value source.
	document.root.walkDecls((_decl) => {
		if (_decl.value.includes("gradient")) _decl.value = NormalizeLegacyGradients(_decl.value);
	});

	// Final: reconcile duplicate top-level rules (opt-in). Runs on evaluated
	// values so collision detection compares the real, interpolated output.
	if (_options.merge) {
		const mergeConfig = _options.merge === true ? {} : _options.merge;
		MergeRules(document, { onConflict: mergeConfig.onConflict, warn });
	}

	return document;
}
