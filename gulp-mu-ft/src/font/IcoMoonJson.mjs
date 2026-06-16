// microFT - IcoMoon-compatible selection JSON (the format an IcoMoon export
// produces, kept for tooling that already consumes it).

/**
 * Builds an IcoMoon "selection" object for the given glyphs.
 *
 * @param {Array} _glyphs glyphs from ScanGlyphs (need name + code)
 * @param {object} [_options]
 * @param {string} [_options.fontName="icons"]
 * @param {number} [_options.fontHeight=1024]
 * @returns {object} IcoMoon selection object (serialize with JSON.stringify)
 */
export function BuildIcoMoonJson(_glyphs, _options = {}) {
	const fontName = _options.fontName ?? "icons";
	const fontHeight = _options.fontHeight ?? 1024;

	const icons = [..._glyphs]
		.sort((_a, _b) => _a.code - _b.code)
		.map((_glyph, _index) => ({
			icon: { tags: [_glyph.name] },
			properties: { order: _index + 1, id: _index, name: _glyph.name, code: _glyph.code }
		}));

	return {
		IcoMoonType: "selection",
		icons,
		height: fontHeight,
		metadata: { name: fontName },
		preferences: { fontPref: { metadata: { fontFamily: fontName } } }
	};
}
