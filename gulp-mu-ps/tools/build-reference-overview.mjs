// Builds a labelled contact sheet from exported reference PNGs (examples/reference/out/).
// Usage: node tools/build-reference-overview.mjs

import { existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outRoot = join(here, "../examples/reference/out");
const overviewDir = join(outRoot, "overview");

const SECTIONS = [
	{ dir: "bc/aqua", title: "ButtonAndIconCreator — aqua" },
	{ dir: "bc/alu", title: "ButtonAndIconCreator — alu" },
	{ dir: "fx", title: "Layer effects (isolated variants)" },
	{ dir: "stacks", title: "Combined stacks (buttons.psd ground truth)" },
	{ dir: "blend", title: "Blend modes" },
	{ dir: "topsets", title: "CreateByTopLayerSets" },
	{ dir: "links", title: "Layer links" },
	{ dir: "text", title: "Text + style transfer" },
	{ dir: "compositing/chart", title: "Compositing — color chart" },
	{ dir: "compositing/fillOpacity", title: "Compositing — fill opacity" },
	{ dir: "compositing/layerOpacity", title: "Compositing — layer opacity" },
	{ dir: "compositing/layerAlpha", title: "Compositing — pixel alpha" }
];

const CELL = 120;
const PAD = 12;
const LABEL_H = 28;
const SECTION_GAP = 36;
const COLS = 8;

function _ListPngs(_dir) {
	if (!existsSync(_dir)) return [];
	const files = readdirSync(_dir).filter((f) => f.endsWith(".png"));
	const plain = new Set(files.filter((f) => !f.includes("@2x")));
	return files
		.filter((f) => {
			if (f.includes("@2x")) {
				return !plain.has(f.replace("@2x.png", ".png"));
			}
			return true;
		})
		.sort();
}

function _EscapeSvg(_text) {
	return _text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function _SectionLabelSvg(_title, _width) {
	return Buffer.from(
		`<svg width="${_width}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">` +
		`<text x="0" y="20" fill="#e8eef8" font-family="system-ui,sans-serif" font-size="16" font-weight="600">${_EscapeSvg(_title)}</text>` +
		`</svg>`
	);
}

function _CellLabelSvg(_name, _width) {
	const short = _name.replace(/\.png$/, "");
	return Buffer.from(
		`<svg width="${_width}" height="18" xmlns="http://www.w3.org/2000/svg">` +
		`<text x="0" y="13" fill="#9aa8bc" font-family="ui-monospace,monospace" font-size="10">${_EscapeSvg(short)}</text>` +
		`</svg>`
	);
}

async function _LoadCell(_file) {
	const img = sharp(_file);
	const meta = await img.metadata();
	const scale = Math.min(1, (CELL - 8) / Math.max(meta.width, meta.height));
	const w = Math.max(1, Math.round(meta.width * scale));
	const h = Math.max(1, Math.round(meta.height * scale));
	const buffer = await img.resize(w, h, { kernel: sharp.kernel.nearest }).png().toBuffer();
	return { buffer, w, h, name: _file.split(/[/\\]/).pop() };
}

async function BuildReferenceOverview() {
	const rows = [];
	for (const section of SECTIONS) {
		const dir = join(outRoot, section.dir);
		const files = _ListPngs(dir).map((f) => join(dir, f));
		if (files.length === 0) continue;
		rows.push({ ...section, files });
	}
	if (rows.length === 0) {
		console.error("No reference PNGs found. Run export-mups-reference.jsx in Photoshop first.");
		process.exit(1);
	}

	const contentWidth = COLS * (CELL + PAD) + PAD;
	let y = PAD;
	const composites = [];

	for (const section of rows) {
		composites.push({ input: _SectionLabelSvg(section.title, contentWidth), top: y, left: PAD });
		y += LABEL_H + 8;

		const cells = [];
		for (const file of section.files) cells.push(await _LoadCell(file));

		for (let i = 0; i < cells.length; i++) {
			const col = i % COLS;
			const row = Math.floor(i / COLS);
			const x = PAD + col * (CELL + PAD);
			const cellY = y + row * (CELL + 22 + PAD);
			const cell = cells[i];
			composites.push({
				input: cell.buffer,
				top: cellY + Math.floor((CELL - cell.h) / 2),
				left: x + Math.floor((CELL - cell.w) / 2)
			});
			composites.push({ input: _CellLabelSvg(cell.name, CELL), top: cellY + CELL + 2, left: x });
		}

		const sectionRows = Math.ceil(cells.length / COLS);
		y += sectionRows * (CELL + 22 + PAD) + SECTION_GAP;
	}

	const height = y + PAD;
	mkdirSync(overviewDir, { recursive: true });
	const outFile = join(overviewDir, "mups-reference-sheet.png");
	await sharp({
		create: {
			width: contentWidth + PAD,
			height,
			channels: 4,
			background: { r: 11, g: 15, b: 24, alpha: 255 }
		}
	})
		.composite(composites)
		.png()
		.toFile(outFile);

	console.log(`Wrote ${outFile} (${contentWidth + PAD}x${height}px, ${composites.length} layers)`);
}

await BuildReferenceOverview();
