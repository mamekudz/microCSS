// microFT - font builder: turns a set of glyphs into the binary font formats
// (SVG font, TTF, EOT, WOFF, WOFF2) without an Adobe or IcoMoon dependency.

import { Readable } from "node:stream";
import { SVGIcons2SVGFontStream } from "svgicons2svgfont";
import svg2ttf from "svg2ttf";
import ttf2woff from "ttf2woff";
import ttf2woff2 from "ttf2woff2";
import ttf2eot from "ttf2eot";
import { ReadGlyphSvg } from "./GlyphScanner.mjs";

// All formats the builder is able to emit.
export const SUPPORTED_FORMATS = ["svg", "ttf", "eot", "woff", "woff2"];

/**
 * Normalizes the various return shapes of the conversion libraries
 * (Buffer, Uint8Array, or { buffer }) into a Node Buffer.
 */
function _ToBuffer(_value) {
	if (Buffer.isBuffer(_value)) return _value;
	if (_value && _value.buffer instanceof ArrayBuffer) return Buffer.from(_value.buffer);
	if (_value instanceof Uint8Array) return Buffer.from(_value);
	if (_value && _value.buffer) return Buffer.from(_value.buffer);
	return Buffer.from(_value);
}

/**
 * Assembles an SVG font from the glyph SVGs.
 *
 * @param {Array} _glyphs glyphs from ScanGlyphs (need name + code + file)
 * @param {object} _options font options (fontName, fontHeight, normalize, ...)
 * @returns {Promise<string>} the SVG font markup
 */
function _BuildSvgFont(_glyphs, _options) {
	return new Promise((_resolve, _reject) => {
		const chunks = [];
		const fontStream = new SVGIcons2SVGFontStream({
			fontName: _options.fontName ?? "icons",
			fontHeight: _options.fontHeight ?? 1024,
			normalize: _options.normalize ?? true,
			centerHorizontally: _options.centerHorizontally ?? true,
			log: () => {}
		});

		fontStream.on("data", (_chunk) => chunks.push(Buffer.from(_chunk)));
		fontStream.on("end", () => _resolve(Buffer.concat(chunks).toString("utf8")));
		fontStream.on("error", _reject);

		for (const glyph of _glyphs) {
			const glyphStream = Readable.from([ReadGlyphSvg(glyph.file)]);
			glyphStream.metadata = {
				unicode: [String.fromCodePoint(glyph.code)],
				name: glyph.name
			};
			fontStream.write(glyphStream);
		}
		fontStream.end();
	});
}

/**
 * Builds the requested font formats from a set of glyphs.
 *
 * @param {Array} _glyphs glyphs from ScanGlyphs
 * @param {object} [_options]
 * @param {string} [_options.fontName="icons"]
 * @param {number} [_options.fontHeight=1024]
 * @param {boolean} [_options.normalize=true]
 * @param {boolean} [_options.centerHorizontally=true]
 * @param {string[]} [_options.formats=SUPPORTED_FORMATS]
 * @param {number} [_options.timestamp] fixed creation timestamp for reproducible TTFs
 * @returns {Promise<Record<string, Buffer>>} map of format -> file buffer
 */
export async function BuildFontFormats(_glyphs, _options = {}) {
	const formats = _options.formats ?? SUPPORTED_FORMATS;
	const wanted = new Set(formats);
	const result = {};

	const svgFont = await _BuildSvgFont(_glyphs, _options);
	if (wanted.has("svg")) result.svg = Buffer.from(svgFont, "utf8");

	// TTF is the base for every binary format below.
	const needsTtf = wanted.has("ttf") || wanted.has("eot") || wanted.has("woff") || wanted.has("woff2");
	if (needsTtf) {
		const ttfOptions = {};
		if (typeof _options.timestamp === "number") ttfOptions.ts = _options.timestamp;
		const ttf = _ToBuffer(svg2ttf(svgFont, ttfOptions));
		if (wanted.has("ttf")) result.ttf = ttf;
		if (wanted.has("eot")) result.eot = _ToBuffer(ttf2eot(ttf));
		if (wanted.has("woff")) {
			const woffOptions = typeof _options.timestamp === "number" ? { metadata: undefined } : {};
			result.woff = _ToBuffer(ttf2woff(ttf, woffOptions));
		}
		if (wanted.has("woff2")) result.woff2 = _ToBuffer(ttf2woff2(ttf));
	}

	return result;
}
