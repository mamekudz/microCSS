// microFT - top-level font generator. Orchestrates scanning, building the font
// formats, and writing the CSS, IcoMoon JSON and HTML overview, guarded by an
// incremental content cache.

import fs from "node:fs";
import path from "node:path";
import { ScanGlyphs } from "./GlyphScanner.mjs";
import { BuildFontFormats, SUPPORTED_FORMATS } from "./FontBuilder.mjs";
import { BuildFontCss } from "./CssWriter.mjs";
import { BuildIcoMoonJson } from "./IcoMoonJson.mjs";
import { BuildOverviewHtml } from "./HtmlWriter.mjs";
import { ComputeSourceSignature, ReadCache, WriteCache, OutputsExist } from "../build/BuildCache.mjs";

// Fixed default creation timestamp (2020-01-01 UTC, seconds) for reproducible
// binary fonts; override via options.timestamp if a real timestamp is wanted.
const DEFAULT_TIMESTAMP = 1577836800;

export class FontGenerator {
	/**
	 * Generates an icon font with all auxiliary artifacts.
	 *
	 * @param {object} _options
	 * @param {string} _options.fontName             font family name (required)
	 * @param {string} _options.src                  source directory of SVG glyphs (required, scanned recursively)
	 * @param {string} _options.outputDir            target directory (required, created if needed)
	 * @param {string[]} [_options.formats]          font formats to emit (default: svg, ttf, eot, woff, woff2)
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
	 * @returns {Promise<{skipped: boolean, glyphs: Array, warnings: string[], files: string[]}>}
	 */
	static async Create(_options = {}) {
		const fontName = _options.fontName;
		const srcDir = _options.src;
		const outputDir = _options.outputDir;
		if (!fontName) throw new Error("FontGenerator.Create: 'fontName' is required.");
		if (!srcDir) throw new Error("FontGenerator.Create: 'src' is required.");
		if (!outputDir) throw new Error("FontGenerator.Create: 'outputDir' is required.");

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
				return { skipped: true, glyphs, warnings, files: expectedOutputs };
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
		return { skipped: false, glyphs, warnings, files: written };
	}
}
