// Registry for custom manifest media steps (µCSS plugin extension point).

/** @type {Map<string, (_step: object, _ctx: object) => Promise<{ type: string, skipped: boolean, outputs: string[] }>>} */
const _handlers = new Map();

/**
 * Registers a custom media step type for skin manifests.
 * Manifest entry: `{ myGenerator: { source: "…", outputDir: "…", … } }` — the key must
 * match `_type`. The handler receives the full step object and the same `_ctx` as
 * built-in steps (`rootDir`, `outputDir`, `imageFormat`, `cache`, `index`).
 *
 * @param {string} _type Step key (e.g. `"tileSheetExport"`)
 * @param {(_step: object, _ctx: object) => Promise<{ type: string, skipped: boolean, outputs: string[] }>} _handler
 */
export function RegisterMediaStep(_type, _handler) {
	if (typeof _type !== "string" || !_type) {
		throw new Error("RegisterMediaStep: type must be a non-empty string");
	}
	if (typeof _handler !== "function") {
		throw new Error("RegisterMediaStep: handler must be a function");
	}
	if (_handlers.has(_type)) {
		throw new Error(`RegisterMediaStep: type "${_type}" is already registered`);
	}
	_handlers.set(_type, _handler);
}

/** @returns {string[]} Registered custom step type names. */
export function ListMediaStepTypes() {
	return [..._handlers.keys()];
}

/**
 * @param {string} _type
 * @returns {((_step: object, _ctx: object) => Promise<object>) | undefined}
 */
export function GetMediaStepHandler(_type) {
	return _handlers.get(_type);
}

/**
 * Finds a registered step key on a manifest media entry (ignores `outputBase`, `format`).
 * @param {object} _step
 * @returns {string | null}
 */
export function MatchRegisteredMediaStep(_step) {
	const reserved = new Set(["outputBase", "format"]);
	for (const key of Object.keys(_step)) {
		if (reserved.has(key)) continue;
		if (_handlers.has(key)) return key;
	}
	return null;
}
