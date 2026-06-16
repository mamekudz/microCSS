// Smart rule merging for bundled stylesheets (docs/CONCEPT.md, D8).
//
// When many component stylesheets are pulled together with @import, the same
// selector (.card, .btn ...) is bound to appear in more than one file. Blindly
// concatenating leaves duplicate code and, worse, lets one block silently
// override another. MergeRules implements the three-stage reconciliation:
//
//   1. Deep-equal dedupe   - identical declaration sets are collapsed to one.
//   2. Partial merge       - non-conflicting properties are folded together.
//   3. Conflict (the brake) - the same property set to a different value is a
//      collision; depending on onConflict it throws (error), keeps last with a
//      warning (warn) or keeps first with a warning (keep).
//
// Escape hatch: a block written as `@µ-override <selector> { ... }` (ASCII
// alias `@mu-override`) is an explicit, authoritative override - its values win
// over earlier blocks without raising a conflict.
//
// Only plain top-level rules participate. At-rules (@media, @keyframes, ...)
// and rules nested inside them keep their intentional cascade untouched.

import postcss from "postcss";

const OVERRIDE_ATRULE = /^(?:µ|mu)-override$/i;

function _Norm(_selector) {
	return _selector.replace(/\s+/g, " ").trim();
}

function _SourceOf(_node) {
	return _node.source?.input?.file ?? "<unknown>";
}

// Rewrites `@µ-override <selector> { ... }` blocks into normal rules flagged as
// authoritative overrides. Run before interpolation so the block's values are
// processed like any other rule. Returns the number of converted blocks.
export function ConvertOverrideAtRules(_document) {
	const blocks = [];
	_document.root.walkAtRules((_atrule) => {
		if (OVERRIDE_ATRULE.test(_atrule.name)) blocks.push(_atrule);
	});
	for (const atrule of blocks) {
		const rule = postcss.rule({ selector: atrule.params.trim(), nodes: [] });
		// Keep the source provenance so namespacing and collision messages still
		// know which file the override came from.
		rule.source = atrule.source;
		(atrule.nodes ?? []).forEach((_child) => rule.append(_child.clone()));
		rule.muOverride = true;
		atrule.replaceWith(rule);
	}
	return blocks.length;
}

// Folds source's declarations into target. Returns nothing; throws on a hard
// conflict when onConflict is "error".
function _MergeInto(_target, _source, _ctx) {
	// Last value wins inside a single block, matching CSS cascade.
	const targetDecls = new Map();
	_target.each((_child) => {
		if (_child.type === "decl") targetDecls.set(_child.prop.toLowerCase(), _child);
	});

	_source.each((_child) => {
		if (_child.type !== "decl") return;
		const key = _child.prop.toLowerCase();
		const existing = targetDecls.get(key);
		if (!existing) {
			const clone = _child.clone();
			_target.append(clone);
			targetDecls.set(key, clone);
			return;
		}
		const same = existing.value.trim() === _child.value.trim() && !!existing.important === !!_child.important;
		if (same) return; // stage 1/2: identical property, nothing to do.

		// Stage 3: the same property carries a different value.
		if (_ctx.isOverride) {
			existing.value = _child.value;
			existing.important = _child.important;
			return;
		}
		const message = "microCSS: style collision for selector \"" + _ctx.selector + "\" on property \"" + _child.prop + "\" "
			+ `('${existing.value}' vs '${_child.value}')\n`
			+ `  source 1: ${_SourceOf(_target)}\n`
			+ `  source 2: ${_SourceOf(_source)}`;
		if (_ctx.onConflict === "error") {
			throw new Error(message + "\n  resolve it explicitly with @µ-override, or set merge.onConflict to \"warn\"/\"keep\".");
		}
		_ctx.warnings.push(message);
		_ctx.warn(message);
		if (_ctx.onConflict !== "keep") { // "warn" keeps the last value (cascade-like).
			existing.value = _child.value;
			existing.important = _child.important;
		}
	});
}

// Merges duplicate top-level rules in place. _options.onConflict is one of
// "error" (default), "warn" or "keep"; _options.warn receives warning strings.
// Returns { warnings, merged } with the number of folded-away duplicate rules.
export function MergeRules(_document, _options = {}) {
	const onConflict = _options.onConflict ?? "error";
	const warn = _options.warn ?? ((_message) => console.warn(_message));
	const warnings = [];
	const firstBySelector = new Map();
	let merged = 0;

	// Snapshot the current top-level rules before mutating the tree.
	const topRules = _document.root.nodes.filter((_node) => _node.type === "rule");
	for (const node of topRules) {
		const selector = _Norm(node.selector);
		const first = firstBySelector.get(selector);
		if (!first) {
			firstBySelector.set(selector, node);
			continue;
		}
		_MergeInto(first, node, { selector, isOverride: !!node.muOverride, onConflict, warn, warnings });
		node.remove();
		merged++;
	}
	return { warnings, merged };
}
