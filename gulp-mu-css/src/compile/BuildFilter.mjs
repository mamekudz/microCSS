// Build-type / variant source filtering via gulp-mu-build-filter
// (docs/CONCEPT.md, D9).
//
// gulp-mu-build-filter activates or removes blocks of source code guarded by
// inline comment commands, e.g.
//
//   /*-- @<BUILD_ONLY_AT_RELEASES:Production ----
//      .debug-overlay { display: none; }
//   ---- @>BUILD_ONLY_AT_RELEASES --*/
//
// The commands live inside ordinary /* ... */ comments, so the source stays
// valid CSS. µCSS runs the filter on the raw text of every source file (the
// host stylesheet and every @import-ed file) before parsing, driven by the
// current release / client / version / platform / variants from the manifest
// or the BuildSkin() call.
//
// The dependency is a CommonJS module that augments Array.prototype on load, so
// it is required lazily (synchronously, via createRequire) only when a filter
// configuration is actually present.

import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
let _buildFilter = null;

function _Load() {
	if (!_buildFilter) _buildFilter = _require("gulp-mu-build-filter");
	return _buildFilter;
}

// Recognized filter parameters; copied through to gulp-mu-build-filter. Any
// other manifest keys are ignored so the config object can carry extras.
const FILTER_KEYS = ["release", "client", "version", "platform", "variants", "mode"];

// True when the config selects at least one filter parameter worth running for.
function _HasConfig(_config) {
	return !!_config && FILTER_KEYS.some((_key) => _config[_key] !== undefined);
}

// Applies the build filter to a source string. Returns the text unchanged when
// no (meaningful) configuration is given.
export function FilterSource(_text, _config) {
	if (!_HasConfig(_config)) return _text;
	const options = { text: _text };
	for (const key of FILTER_KEYS) {
		if (_config[key] !== undefined) options[key] = _config[key];
	}
	const result = _Load()(options);
	return typeof result === "string" ? result : _text;
}
