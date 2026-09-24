// microFT - font builder: turns a set of glyphs into the binary font formats
// (SVG font, TTF, EOT, WOFF, WOFF2) without an Adobe or IcoMoon dependency.
//
// Color fonts: BuildFontFormats (SVG→TTF) always emits a monochrome outline
// font — svg2ttf has no COLR/CPAL/SVG/CBDT/sbix path. Existing color fonts
// go through ConvertFontFormats, which wraps SFNT tables via ttf2woff/ttf2woff2
// and refuses EOT/SVG (those formats would silently drop color tables).

import { Readable } from "node:stream";
import { SVGIcons2SVGFontStream } from "svgicons2svgfont";
import svg2ttf from "svg2ttf";
import ttf2woff from "ttf2woff";
import ttf2woff2 from "ttf2woff2";
import ttf2eot from "ttf2eot";
import { ReadGlyphSvg } from "./GlyphScanner.mjs";
import {
	InspectFont,
	DecodeToSfnt,
	ColorTablesPreserved,
	MissingColorTables
} from "./ColorFont.mjs";

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

const COLOR_UNSAFE_FORMATS = new Set(["eot", "svg"]);
const COLOR_DEFAULT_FORMATS = ["ttf", "woff", "woff2"];

function _VerifyColorOutput(_format, _buffer, _sourceInspection, _warnings) {
	if (!_sourceInspection?.isColorFont) return _buffer;
	const after = InspectFont(_buffer);
	if (ColorTablesPreserved(_sourceInspection, after)) return _buffer;
	const missing = MissingColorTables(_sourceInspection, after).join(", ");
	_warnings.push(
		`${_format} conversion would drop color tables (${missing}); keeping the original font instead of a monochrome result.`
	);
	return null;
}

/**
 * Converts an existing font (TTF/OTF/WOFF/WOFF2) to the requested webfont
 * formats without stripping OpenType color tables. Formats that cannot carry
 * color (EOT, legacy SVG fonts) are skipped with a warning.
 *
 * @param {Buffer} _buffer source font bytes
 * @param {object} [_options]
 * @param {string[]} [_options.formats]
 * @returns {{ buffers: Record<string, Buffer>, inspection: object, warnings: string[], skippedFormats: string[] }}
 */
export function ConvertFontFormats(_buffer, _options = {}) {
	const warnings = [];
	const { sfnt, inspection, warnings: decodeWarnings } = DecodeToSfnt(_buffer);
	warnings.push(...decodeWarnings);

	const requested = _options.formats ?? (inspection.isColorFont ? COLOR_DEFAULT_FORMATS : SUPPORTED_FORMATS);
	const wanted = [...new Set(requested)];
	const buffers = {};
	const skippedFormats = [];

	if (inspection.wrapper === "ttc" || inspection.wrapper === "unknown") {
		return { buffers, inspection, warnings, skippedFormats: wanted };
	}

	if (!sfnt) {
		// WOFF2 input: only a WOFF2 copy is lossless without a decompressor.
		for (const ext of wanted) {
			if (ext === "woff2" && inspection.wrapper === "woff2") {
				buffers.woff2 = Buffer.from(_buffer);
			} else {
				skippedFormats.push(ext);
			}
		}
		return { buffers, inspection, warnings, skippedFormats };
	}

	const sourceSfnt = Buffer.from(sfnt);
	const sourceInspection = InspectFont(sourceSfnt);

	for (const ext of wanted) {
		if (sourceInspection.isColorFont && COLOR_UNSAFE_FORMATS.has(ext)) {
			warnings.push(
				`${ext.toUpperCase()} cannot carry OpenType color tables; skipping ${ext} so the color font is not reduced to a monochrome fallback.`
			);
			skippedFormats.push(ext);
			continue;
		}

		let output = null;
		if (ext === "ttf") {
			output = Buffer.from(sourceSfnt);
		} else if (ext === "woff") {
			output = _ToBuffer(ttf2woff(Buffer.from(sourceSfnt), {}));
		} else if (ext === "woff2") {
			output = _ToBuffer(ttf2woff2(Buffer.from(sourceSfnt)));
		} else if (ext === "eot") {
			output = _ToBuffer(ttf2eot(Buffer.from(sourceSfnt)));
		} else if (ext === "svg") {
			warnings.push("SVG font output is only produced from the icon-SVG pipeline, not from an existing font file.");
			skippedFormats.push(ext);
			continue;
		} else {
			warnings.push(`Unsupported font format '${ext}' was ignored.`);
			skippedFormats.push(ext);
			continue;
		}

		const verified = _VerifyColorOutput(ext, output, sourceInspection, warnings);
		if (verified) buffers[ext] = verified;
		else skippedFormats.push(ext);
	}

	if (sourceInspection.isColorFont && Object.keys(buffers).length === 0) {
		buffers.ttf = Buffer.from(sourceSfnt);
		warnings.push("No requested webfont format could be produced safely; wrote the original SFNT as TTF.");
	}

	return { buffers, inspection: sourceInspection, warnings, skippedFormats };
}
