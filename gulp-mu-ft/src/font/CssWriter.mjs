// microFT - CSS writer: emits the @font-face declaration plus one ready-to-use
// class per glyph (the "automatic class definition" from the concept).

const FORMAT_HINTS = {
	eot: "embedded-opentype",
	woff2: "woff2",
	woff: "woff",
	ttf: "truetype",
	svg: "svg"
};

/**
 * Builds the CSS source for an icon font.
 *
 * @param {Array} _glyphs glyphs from ScanGlyphs (need name + code)
 * @param {object} [_options]
 * @param {string} [_options.fontName="icons"]
 * @param {string} [_options.classPrefix="icon"] prefix for the per-glyph classes
 * @param {string[]} [_options.formats=["eot","woff2","woff","ttf","svg"]]
 * @param {string} [_options.fontUrlBase=""] path prefix in front of the font files
 * @param {number} [_options.cacheBust] query string appended to the font urls
 * @returns {string} the CSS source
 */
export function BuildFontCss(_glyphs, _options = {}) {
	const fontName = _options.fontName ?? "icons";
	const prefix = _options.classPrefix ?? "icon";
	const formats = _options.formats ?? ["eot", "woff2", "woff", "ttf", "svg"];
	const base = _options.fontUrlBase ?? "";
	const bust = _options.cacheBust != null ? `?${_options.cacheBust}` : "";
	const sorted = [..._glyphs].sort((_a, _b) => _a.code - _b.code);

	const url = (_ext, _hash = "") => `url('${base}${fontName}.${_ext}${bust}${_hash}') format('${FORMAT_HINTS[_ext]}')`;

	let css = "";
	css += `@font-face {\n`;
	css += `\tfont-family: '${fontName}';\n`;
	if (formats.includes("eot")) {
		css += `\tsrc: url('${base}${fontName}.eot${bust}');\n`;
	}
	const srcParts = formats.map((_ext) => (_ext === "eot" ? url("eot", "#iefix") : url(_ext)));
	css += `\tsrc: ${srcParts.join(",\n\t\t")};\n`;
	css += `\tfont-weight: normal;\n\tfont-style: normal;\n\tfont-display: block;\n}\n\n`;

	css += `[class^="${prefix}-"], [class*=" ${prefix}-"] {\n`;
	css += `\tfont-family: '${fontName}' !important;\n`;
	css += `\tspeak: never;\n\tfont-style: normal;\n\tfont-weight: normal;\n`;
	css += `\tfont-variant: normal;\n\ttext-transform: none;\n\tline-height: 1;\n`;
	css += `\t-webkit-font-smoothing: antialiased;\n\t-moz-osx-font-smoothing: grayscale;\n}\n\n`;

	for (const glyph of sorted) {
		const hex = glyph.code.toString(16).toLowerCase();
		css += `.${prefix}-${glyph.name}:before {\n\tcontent: "\\${hex}";\n}\n`;
	}

	return css;
}
