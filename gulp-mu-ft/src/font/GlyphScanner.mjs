// microFT - glyph scanner: collects SVG sources, derives the Unicode codepoint
// from the file name and groups glyphs by their source directory.

import fs from "node:fs";
import path from "node:path";

// The codepoint of every glyph is encoded in the file name as a "-U0x<HEX>"
// suffix, e.g. "general-control-edit-U0xE900.svg" -> name "general-control-edit",
// code U+E900. The match is case-insensitive.
const CODEPOINT_PATTERN = /^(.+)-u0x([0-9a-f]+)$/i;

/**
 * Recursively lists all *.svg files below a directory, sorted by path so the
 * build is deterministic regardless of file system order.
 *
 * @param {string} _dir source root directory
 * @returns {string[]} absolute (or root-relative) file paths
 */
export function ListSvgFiles(_dir) {
	const out = [];
	const walk = (_current) => {
		for (const entry of fs.readdirSync(_current, { withFileTypes: true })) {
			const full = path.join(_current, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg")) out.push(full);
		}
	};
	if (fs.existsSync(_dir)) walk(_dir);
	return out.sort();
}

/**
 * Reads an SVG file as text and repairs a common export defect: some editors
 * declare encoding="iso-8859-1" although the content is UTF-8, which aborts the
 * SAX parser used downstream. The XML declaration is normalized to utf-8.
 *
 * @param {string} _file path to the SVG file
 * @returns {string} the (possibly repaired) SVG markup
 */
export function ReadGlyphSvg(_file) {
	const raw = fs.readFileSync(_file, "latin1");
	const fixed = raw.replace(
		/(<\?xml[^>]*?encoding=["'])([^"']*)(["'][^>]*?\?>)/i,
		(_match, _pre, _enc, _post) => `${_pre}utf-8${_post}`
	);
	return fixed;
}

/**
 * Scans a source directory for SVG glyphs.
 *
 * @param {string} _srcDir source root directory (scanned recursively)
 * @returns {{ glyphs: Array<{name: string, code: number, hex: string, file: string, groupId: string}>, warnings: string[] }}
 *   glyphs sorted by codepoint, plus warnings for skipped files.
 */
export function ScanGlyphs(_srcDir) {
	const warnings = [];
	const seenCodes = new Map();
	const glyphs = [];

	for (const file of ListSvgFiles(_srcDir)) {
		const stem = path.basename(file, path.extname(file));
		const match = stem.match(CODEPOINT_PATTERN);
		const rel = path.relative(_srcDir, file);

		if (!match) {
			warnings.push(`skip (no -U0x<HEX> suffix): ${rel}`);
			continue;
		}

		const name = match[1];
		const code = parseInt(match[2], 16);
		const hex = code.toString(16).toLowerCase().padStart(4, "0");

		if (seenCodes.has(code)) {
			warnings.push(
				`skip (duplicate codepoint U+${hex.toUpperCase()}): ${rel} - already used by "${seenCodes.get(code)}"`
			);
			continue;
		}
		seenCodes.set(code, name);

		const groupId = path
			.relative(_srcDir, path.dirname(file))
			.split(path.sep)
			.join("/");

		glyphs.push({ name, code, hex, file, groupId });
	}

	glyphs.sort((_a, _b) => _a.code - _b.code);
	return { glyphs, warnings };
}
