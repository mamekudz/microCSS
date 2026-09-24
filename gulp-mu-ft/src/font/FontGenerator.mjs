// microFT - top-level font generator. Orchestrates scanning, building the font
// formats, and writing the CSS, IcoMoon JSON and HTML overview, guarded by an
// incremental content cache.

import fs from "node:fs";
import path from "node:path";
import { ScanGlyphs } from "./GlyphScanner.mjs";
import { BuildFontFormats, ConvertFontFormats, SUPPORTED_FORMATS } from "./FontBuilder.mjs";
import { BuildFontCss, BuildWebfontCss } from "./CssWriter.mjs";
import { BuildIcoMoonJson } from "./IcoMoonJson.mjs";
import { BuildOverviewHtml, BuildColorFontHtml } from "./HtmlWriter.mjs";
import { InspectFont } from "./ColorFont.mjs";
import { ComputeSourceSignature, ComputeFileSignature, ReadCache, WriteCache, OutputsExist } from "../build/BuildCache.mjs";

const FONT_FILE_EXTENSIONS = new Set([".ttf", ".otf", ".woff", ".woff2"]);

function _IsFontFile(_src) {
	if (!_src || !fs.existsSync(_src) || !fs.statSync(_src).isFile()) return false;
	return FONT_FILE_EXTENSIONS.has(path.extname(_src).toLowerCase());
}

// Fixed default creation timestamp (2020-01-01 UTC, seconds) for reproducible
// binary fonts; override via options.timestamp if a real timestamp is wanted.
const DEFAULT_TIMESTAMP = 1577836800;

export class FontGenerator {
	/**
	 * Generates an icon font with all auxiliary artifacts.
	 *
	 * @param {object} _options
	 * @param {string} _options.fontName             font family name (required)
	 * @param {string} _options.src                  SVG glyph directory (recursive) or a single TTF/OTF/WOFF/WOFF2 file
	 * @param {string} _options.outputDir            target directory (required, created if needed)
	 * @param {string[]} [_options.formats]          font formats to emit (icon default: svg, ttf, eot, woff, woff2)
	 * @param {number} [_options.fontHeight=1024]
	 * @param {boolean} [_options.normalize=true]
	 * @param {boolean} [_options.centerHorizontally=true]
	 * @param {string} [_options.classPrefix="icon"] prefix of the generated CSS classes
	 * @param {string} [_options.fontUrlBase=""]     path prefix in front of the font urls in CSS/HTML
	 * @param {string|false} [_options.css]          CSS file name, or false to skip (default: <fontName>.css)
	 * @param {string|false} [_options.json]         IcoMoon JSON file name, or false to skip (default: <fontName>.json)
	 * @param {object|false} [_options.html]         HTML overview options, or false to skip (default: enabled)
	 * @param {object} [_options.groups={}]          groupId -> { label, description, order }
	 * @param {object} [_options.glyphs={}]          glyphName -> { description }
	 * @param {number} [_options.timestamp]          fixed creation timestamp (seconds) for reproducible fonts
	 * @param {string|false} [_options.cacheFile]    cache file path, or false to disable caching (default: <outputDir>/.build-cache.json)
	 * @param {boolean} [_options.force=false]       force a rebuild even if the cache is up to date
	 * @param {function|false} [_options.log]        logger (default: console.log); false silences output
	 * @returns {Promise<{skipped: boolean, glyphs: Array, warnings: string[], files: string[], sourceKind: string, colorFont: object|null}>}
	 */
	static async Create(_options = {}) {
		const fontName = _options.fontName;
		const srcDir = _options.src;
		const outputDir = _options.outputDir;
		if (!fontName) throw new Error("FontGenerator.Create: 'fontName' is required.");
		if (!srcDir) throw new Error("FontGenerator.Create: 'src' is required.");
		if (!outputDir) throw new Error("FontGenerator.Create: 'outputDir' is required.");

		if (_IsFontFile(srcDir)) {
			return FontGenerator._CreateFromFontFile(_options);
		}

		const formats = _options.formats ?? SUPPORTED_FORMATS;
		const fontHeight = _options.fontHeight ?? 1024;
		const normalize = _options.normalize ?? true;
		const centerHorizontally = _options.centerHorizontally ?? true;
		const classPrefix = _options.classPrefix ?? "icon";
		const fontUrlBase = _options.fontUrlBase ?? "";
		const timestamp = typeof _options.timestamp === "number" ? _options.timestamp : DEFAULT_TIMESTAMP;
		const groupMeta = _options.groups ?? {};
		const glyphMeta = _options.glyphs ?? {};
		const log = _options.log === false ? () => {} : (_options.log ?? console.log);

		const cssFile = _options.css === false ? null : (_options.css ?? `${fontName}.css`);
		const jsonFile = _options.json === false ? null : (_options.json ?? `${fontName}.json`);
		const htmlEnabled = _options.html !== false;
		const htmlConfig = (_options.html && typeof _options.html === "object") ? _options.html : {};
		const htmlFile = htmlEnabled ? (htmlConfig.file ?? `${fontName}.html`) : null;

		const cacheFile = _options.cacheFile === false
			? null
			: (_options.cacheFile ?? path.join(outputDir, ".build-cache.json"));

		// Every artifact a full build is expected to produce.
		const expectedOutputs = [
			...formats.map((_ext) => path.join(outputDir, `${fontName}.${_ext}`)),
			...(cssFile ? [path.join(outputDir, cssFile)] : []),
			...(jsonFile ? [path.join(outputDir, jsonFile)] : []),
			...(htmlFile ? [path.join(outputDir, htmlFile)] : [])
		];

		const fingerprint = {
			fontName, formats, fontHeight, normalize, centerHorizontally, classPrefix,
			fontUrlBase, timestamp, cssFile, jsonFile, htmlFile, htmlConfig, groupMeta, glyphMeta
		};
		const signature = ComputeSourceSignature(srcDir, fingerprint);

		if (!_options.force && cacheFile) {
			const cache = ReadCache(cacheFile);
			if (cache && cache.hash === signature.hash && OutputsExist(expectedOutputs)) {
				log(`gulp-mu-ft: '${fontName}' is up to date (${signature.count} SVGs) - skipping rebuild.`);
				const { glyphs, warnings } = ScanGlyphs(srcDir);
				return { skipped: true, glyphs, warnings, files: expectedOutputs, sourceKind: "svg", colorFont: null };
			}
		}

		const { glyphs, warnings } = ScanGlyphs(srcDir);
		for (const warning of warnings) log(`gulp-mu-ft: ${warning}`);
		if (glyphs.length === 0) throw new Error(`FontGenerator.Create: no valid SVG glyphs found in '${srcDir}'.`);

		fs.mkdirSync(outputDir, { recursive: true });

		const fontBuffers = await BuildFontFormats(glyphs, {
			fontName, fontHeight, normalize, centerHorizontally, formats, timestamp
		});

		const written = [];
		for (const ext of formats) {
			const target = path.join(outputDir, `${fontName}.${ext}`);
			fs.writeFileSync(target, fontBuffers[ext]);
			written.push(target);
		}

		const cacheBust = signature.hash.slice(0, 8);

		if (cssFile) {
			const css = BuildFontCss(glyphs, { fontName, classPrefix, formats, fontUrlBase, cacheBust });
			const target = path.join(outputDir, cssFile);
			fs.writeFileSync(target, css, "utf8");
			written.push(target);
		}

		if (jsonFile) {
			const json = BuildIcoMoonJson(glyphs, { fontName, fontHeight });
			const target = path.join(outputDir, jsonFile);
			fs.writeFileSync(target, JSON.stringify(json), "utf8");
			written.push(target);
		}

		if (htmlFile) {
			const html = BuildOverviewHtml(glyphs, {
				fontName, classPrefix, fontUrlBase, cacheBust,
				glyphFontSize: htmlConfig.glyphFontSize,
				groups: groupMeta, glyphMeta, html: htmlConfig
			});
			const target = path.join(outputDir, htmlFile);
			fs.writeFileSync(target, html, "utf8");
			written.push(target);
		}

		if (cacheFile) WriteCache(cacheFile, signature);

		log(`gulp-mu-ft: built '${fontName}' (${glyphs.length} glyphs, formats: ${formats.join(", ")}).`);
		const generatedTtf = fontBuffers.ttf ?? null;
		const colorFont = generatedTtf ? InspectFont(generatedTtf) : null;
		return { skipped: false, glyphs, warnings, files: written, sourceKind: "svg", colorFont };
	}

	/**
	 * Packages an existing font file as webfonts, preserving OpenType color tables.
	 * @param {object} _options same shape as Create
	 */
	static _CreateFromFontFile(_options) {
		const fontName = _options.fontName;
		const srcFile = _options.src;
		const outputDir = _options.outputDir;
		const log = _options.log === false ? () => {} : (_options.log ?? console.log);
		const fontUrlBase = _options.fontUrlBase ?? "";
		const sample = typeof _options.sample === "string" ? _options.sample : undefined;

		const sourceBuffer = fs.readFileSync(srcFile);
		const preview = InspectFont(sourceBuffer);
		const formats = _options.formats ?? (preview.isColorFont ? ["ttf", "woff", "woff2"] : SUPPORTED_FORMATS);

		const cssFile = _options.css === false ? null : (_options.css ?? `${fontName}.css`);
		const jsonFile = _options.json === false || _options.json == null ? null : _options.json;
		const htmlEnabled = _options.html !== false;
		const htmlConfig = (_options.html && typeof _options.html === "object") ? _options.html : {};
		const htmlFile = htmlEnabled ? (htmlConfig.file ?? `${fontName}.html`) : null;

		const cacheFile = _options.cacheFile === false
			? null
			: (_options.cacheFile ?? path.join(outputDir, ".build-cache.json"));

		const fingerprint = {
			fontName, formats, fontUrlBase, cssFile, jsonFile, htmlFile, htmlConfig, sample, sourceKind: "font"
		};
		const signature = ComputeFileSignature(srcFile, fingerprint);
		const converted = ConvertFontFormats(sourceBuffer, { formats });
		const emittedFormats = Object.keys(converted.buffers);
		const expectedOutputs = [
			...emittedFormats.map((_ext) => path.join(outputDir, `${fontName}.${_ext}`)),
			...(cssFile ? [path.join(outputDir, cssFile)] : []),
			...(jsonFile ? [path.join(outputDir, jsonFile)] : []),
			...(htmlFile ? [path.join(outputDir, htmlFile)] : [])
		];

		if (!_options.force && cacheFile) {
			const cache = ReadCache(cacheFile);
			if (cache && cache.hash === signature.hash && OutputsExist(expectedOutputs)) {
				log(`gulp-mu-ft: '${fontName}' is up to date (font file) - skipping rebuild.`);
				return {
					skipped: true,
					glyphs: [],
					warnings: converted.warnings,
					files: expectedOutputs,
					sourceKind: "font",
					colorFont: converted.inspection
				};
			}
		}

		fs.mkdirSync(outputDir, { recursive: true });
		const written = [];
		const warnings = [...converted.warnings];
		for (const warning of warnings) log(`gulp-mu-ft: ${warning}`);

		for (const ext of emittedFormats) {
			const target = path.join(outputDir, `${fontName}.${ext}`);
			fs.writeFileSync(target, converted.buffers[ext]);
			written.push(target);
		}

		const cacheBust = signature.hash.slice(0, 8);
		const colorFont = converted.inspection;

		if (cssFile) {
			const css = BuildWebfontCss({
				fontName,
				formats: emittedFormats,
				fontUrlBase,
				cacheBust,
				colorFont
			});
			const target = path.join(outputDir, cssFile);
			fs.writeFileSync(target, css, "utf8");
			written.push(target);
		}

		if (jsonFile) {
			const target = path.join(outputDir, jsonFile);
			fs.writeFileSync(target, JSON.stringify({
				fontName,
				sourceKind: "font",
				colorFont: {
					isColorFont: colorFont.isColorFont,
					colorFontFormats: colorFont.colorFontFormats,
					colrVersion: colorFont.colrVersion,
					paletteCount: colorFont.paletteCount
				}
			}, null, 2), "utf8");
			written.push(target);
		}

		if (htmlFile) {
			const html = BuildColorFontHtml({
				fontName, fontUrlBase, cacheBust, sample, colorFont, formats: emittedFormats
			});
			const target = path.join(outputDir, htmlFile);
			fs.writeFileSync(target, html, "utf8");
			written.push(target);
		}

		if (cacheFile) WriteCache(cacheFile, signature);
		log(`gulp-mu-ft: packaged '${fontName}' from font file (formats: ${emittedFormats.join(", ") || "none"}).`);
		return { skipped: false, glyphs: [], warnings, files: written, sourceKind: "font", colorFont };
	}
}
