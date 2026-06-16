// Renders the DSD glyph reference chart (docs/imgs/dsd_glyphs.png) from the
// canonical 3x5 pixel patterns in DsdFormat.mjs. Run after pattern changes:
//   node tools/render-dsd-glyphs.mjs

import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { DSD_SIGN_PATTERNS } from "../src/strips/DsdFormat.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, "../docs/imgs/dsd_glyphs.png");

const SCALE = 10;
const GAP = 16;
const LABEL_HEIGHT = 22;
const GLYPH_W = 3 * SCALE;
const GLYPH_H = 5 * SCALE;

const ROWS = [
	["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((_label, _i) => ({ label: _label, sign: _i })),
	[
		{ label: "Original", sign: 10 },
		{ label: "Maske", sign: 11 },
		{ label: "Schatten", sign: 12 },
		{ label: "Licht", sign: 13 },
		{ label: "Org+Maske", sign: 14 }
	]
];

function _GlyphRects(_pattern, _xOffset, _yOffset) {
	const rects = [];
	for (let bit = 0; bit < 15; bit++) {
		if (!((_pattern >> (14 - bit)) & 1)) continue;
		const x = _xOffset + (bit % 3) * SCALE;
		const y = _yOffset + Math.floor(bit / 3) * SCALE;
		rects.push(`<rect x="${x}" y="${y}" width="${SCALE}" height="${SCALE}" fill="#000"/>`);
	}
	return rects;
}

const columns = Math.max(...ROWS.map((_row) => _row.length));
const cellW = GLYPH_W + GAP * 2 + 40;
const rowH = GLYPH_H + LABEL_HEIGHT + GAP * 2;
const width = columns * cellW;
const height = ROWS.length * rowH + GAP;

const parts = [`<rect width="${width}" height="${height}" fill="#fff"/>`];
ROWS.forEach((_row, _rowIndex) => {
	_row.forEach((_entry, _colIndex) => {
		const xOffset = _colIndex * cellW + (cellW - GLYPH_W) / 2;
		const yOffset = _rowIndex * rowH + GAP;
		// Canonical (first) pattern variant of the glyph.
		parts.push(..._GlyphRects(DSD_SIGN_PATTERNS[_entry.sign][0], xOffset, yOffset));
		parts.push(`<text x="${_colIndex * cellW + cellW / 2}" y="${yOffset + GLYPH_H + LABEL_HEIGHT - 4}" ` +
			`font-family="Segoe UI, Arial, sans-serif" font-size="15" text-anchor="middle" fill="#333">${_entry.label}</text>`);
	});
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${parts.join("")}</svg>`;
mkdirSync(dirname(outFile), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outFile);
console.log(`written: ${outFile}`);
