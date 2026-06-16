// Per-file class namespacing for bundled component stylesheets
// (docs/CONCEPT.md, D8).
//
// A component file opts in with a single directive at the top:
//
//   @µ-namespace MyButton;   (ASCII alias @mu-namespace)
//   .card { ... }            ->  .MyButton-card { ... }
//   .card.is-open { ... }    ->  .MyButton-card.MyButton-is-open { ... }
//
// Only that file's own class selectors are prefixed - the scope is the source
// file the directive sits in, so it keeps working after @import inlining merges
// many files into one document. ids, element names and attributes are left
// untouched. Classes that must stay global (e.g. state classes toggled by Vue,
// or shared utilities) are wrapped in :global(...) and pass through unprefixed:
//
//   .card:global(.is-active) { ... }  ->  .MyButton-card.is-active { ... }
//
// This is collision *avoidance* (renaming), complementary to the collision
// *resolution* done by MergeRules / @µ-override.

import selectorParser from "postcss-selector-parser";

const NAMESPACE_ATRULE = /^(?:µ|mu)-namespace$/i;

function _SourceFile(_node) {
	return _node.source?.input?.file ?? null;
}

// Rewrites a single selector string: prefixes every class token with
// "<prefix>-", except classes inside :global(...), which are unwrapped and kept
// as-is.
function _PrefixSelector(_selector, _prefix) {
	const transform = (_root) => {
		const globals = new Set();
		_root.walkPseudos((_pseudo) => {
			if (_pseudo.value !== ":global" || !_pseudo.nodes || _pseudo.nodes.length === 0) return;
			const inner = [];
			_pseudo.each((_sel) => _sel.each((_node) => inner.push(_node)));
			_pseudo.walkClasses((_cls) => globals.add(_cls));
			_pseudo.replaceWith(...inner);
		});
		_root.walkClasses((_cls) => {
			if (globals.has(_cls)) return;
			_cls.value = `${_prefix}-${_cls.value}`;
		});
	};
	return selectorParser(transform).processSync(_selector);
}

// Collects the @µ-namespace prefix declared per source file and removes the
// directives. Throws when a file declares two conflicting prefixes.
function _CollectNamespaces(_document) {
	const byFile = new Map();
	const directives = [];
	_document.root.walkAtRules((_atrule) => {
		if (NAMESPACE_ATRULE.test(_atrule.name)) directives.push(_atrule);
	});
	for (const atrule of directives) {
		const prefix = atrule.params.trim().replace(/;$/, "").trim();
		if (!prefix) throw new Error(`@${atrule.name}: a namespace prefix is required (e.g. "@µ-namespace MyButton;").`);
		const file = _SourceFile(atrule) ?? "<inline>";
		const existing = byFile.get(file);
		if (existing && existing !== prefix) {
			throw new Error(`@µ-namespace: conflicting prefixes "${existing}" and "${prefix}" in ${file}.`);
		}
		byFile.set(file, prefix);
		atrule.remove();
	}
	return byFile;
}

// Applies @µ-namespace directives in place. Each plain rule is prefixed with
// the namespace of the file it originates from. Returns the number of rules
// that were rewritten.
export function ApplyNamespaces(_document) {
	const byFile = _CollectNamespaces(_document);
	if (byFile.size === 0) return 0;

	let rewritten = 0;
	_document.root.walkRules((_rule) => {
		const prefix = byFile.get(_SourceFile(_rule) ?? "<inline>");
		if (!prefix) return;
		_rule.selector = _PrefixSelector(_rule.selector, prefix);
		rewritten++;
	});
	return rewritten;
}
