// Builds the microCSS manual (docs/microCSS-de.docx / docs/microCSS-en.docx,
// language via --lang=de|en) from the markdown sources under docs/manual/ -
// the modern successor of the old
// µCSS.docx/µCSS.pdf manual (CONCEPT.md, M6). Supported markdown subset:
// #/##/### headings (auto-numbered), paragraphs, fenced code blocks, pipe
// tables, bullet lists and the inline forms `code` and **bold**.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
	AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer,
	PageBreak, Paragraph, ShadingType, Table, TableCell, TableOfContents,
	TableRow, TextRun, WidthType
} from "docx";

const here = dirname(fileURLToPath(import.meta.url));
const packageInfo = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
const manualDir = join(here, "..", "docs", "manual");

// Per-language configuration: markdown source, docx output and the title-page
// strings. Default language is German (keeps the existing docs:manual:docx
// task working with no arguments).
const LANGUAGES = {
	de: {
		source: "microCSS-Handbuch.md",
		docx: "microCSS-de.docx",
		tagline: "Ein Node-basierter CSS- und Web-Grafik-Prozessor.",
		npmLine: "npm-Paket: gulp-mu-css",
		manual: "Handbuch",
		contents: "Inhalt",
		docTitle: (_v) => `µCSS Handbuch ${_v}`,
		docDescription: "Handbuch zu µCSS 2 (npm-Paket gulp-mu-css), dem Node-basierten Nachfolger des Adobe-basierten µCSS 1."
	},
	en: {
		source: "microCSS-Manual-en.md",
		docx: "microCSS-en.docx",
		tagline: "A Node-based CSS and web-graphics processor.",
		npmLine: "npm package: gulp-mu-css",
		manual: "Manual",
		contents: "Contents",
		docTitle: (_v) => `µCSS Manual ${_v}`,
		docDescription: "Manual for µCSS 2 (npm package gulp-mu-css), the Node-based successor of the Adobe-based µCSS 1."
	}
};

const langArg = process.argv.find((_a) => _a.startsWith("--lang="));
const lang = langArg && LANGUAGES[langArg.slice(7)] ? langArg.slice(7) : "de";
const STRINGS = LANGUAGES[lang];
const sourceFile = join(manualDir, STRINGS.source);
// Optional --out=<path> overrides the output path (useful when the default
// file is locked by an open Word/preview window).
const outArg = process.argv.find((_a) => _a.startsWith("--out="));
const outputFile = outArg ? outArg.slice(6) : join(here, "..", "docs", STRINGS.docx);

// Images wider than this are scaled down proportionally (pixels at 96 dpi).
const MAX_IMAGE_WIDTH = 440;

const CODE_FONT = "Consolas";
const CODE_SHADING = { type: ShadingType.CLEAR, fill: "F2F2F2" };
const TABLE_HEADER_SHADING = { type: ShadingType.CLEAR, fill: "DDE6EE" };
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "999999" };

// ------------------------------------------------------------- inline forms

// Tokenizes `code` and **bold** (bold may contain code spans) into TextRuns.
function _InlineRuns(_text, _extra = {}) {
	const runs = [];
	const pattern = /(`[^`]*`)|(\*\*[^*]+\*\*)/g;
	let last = 0;
	let match;
	while ((match = pattern.exec(_text)) !== null) {
		if (match.index > last) runs.push(new TextRun({ text: _text.slice(last, match.index), ..._extra }));
		if (match[1]) {
			runs.push(new TextRun({
				text: match[1].slice(1, -1),
				font: CODE_FONT, size: 18, shading: CODE_SHADING, ..._extra
			}));
		} else {
			runs.push(..._InlineRuns(match[2].slice(2, -2), { ..._extra, bold: true }));
		}
		last = match.index + match[0].length;
	}
	if (last < _text.length) runs.push(new TextRun({ text: _text.slice(last), ..._extra }));
	return runs;
}

// ------------------------------------------------------------------- images

// Centered image paragraph (path relative to the manual directory), followed
// by an optional small caption built from the alt text.
async function _ImageBlocks(_relPath, _alt, _maxWidth = MAX_IMAGE_WIDTH) {
	const file = join(manualDir, _relPath);
	const data = readFileSync(file);
	const meta = await sharp(file).metadata();
	const scale = Math.min(1, _maxWidth / meta.width);
	const blocks = [new Paragraph({
		children: [new ImageRun({
			type: "png",
			data,
			transformation: { width: Math.round(meta.width * scale), height: Math.round(meta.height * scale) }
		})],
		alignment: AlignmentType.CENTER,
		spacing: { before: 120, after: _alt ? 40 : 160 }
	})];
	if (_alt) {
		blocks.push(new Paragraph({
			children: [new TextRun({ text: _alt, italics: true, size: 18, color: "595959" })],
			alignment: AlignmentType.CENTER,
			spacing: { after: 160 }
		}));
	}
	return blocks;
}

// ------------------------------------------------------------ block parsing

function _CodeParagraph(_line, _isLast) {
	return new Paragraph({
		children: [new TextRun({ text: _line.replace(/\t/g, "    ") || " ", font: CODE_FONT, size: 18 })],
		shading: CODE_SHADING,
		spacing: { before: 0, after: _isLast ? 160 : 0 }
	});
}

function _SplitTableRow(_line) {
	const guarded = _line.replace(/\\\|/g, "\u0000");
	return guarded.replace(/^\s*\|/, "").replace(/\|\s*$/, "")
		.split("|")
		.map((_cell) => _cell.replace(/\u0000/g, "|").trim());
}

function _TableFromRows(_rows) {
	const tableRows = _rows.map((_cells, _rowIndex) => new TableRow({
		tableHeader: _rowIndex === 0,
		children: _cells.map((_cell) => new TableCell({
			children: [new Paragraph({
				children: _InlineRuns(_cell, _rowIndex === 0 ? { bold: true } : {}),
				spacing: { before: 40, after: 40 }
			})],
			shading: _rowIndex === 0 ? TABLE_HEADER_SHADING : undefined,
			borders: { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER },
			margins: { left: 80, right: 80 }
		}))
	}));
	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		rows: tableRows
	});
}

// Parses the markdown into docx block elements with auto-numbered headings.
async function _ParseMarkdown(_text) {
	const blocks = [];
	const lines = _text.split(/\r?\n/);
	const counters = [0, 0, 0];
	let firstChapter = true;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Fenced code block.
		if (line.startsWith("```")) {
			const code = [];
			i++;
			while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
			code.forEach((_codeLine, _index) => blocks.push(_CodeParagraph(_codeLine, _index === code.length - 1)));
			continue;
		}

		// Heading (levels 1-3).
		const heading = line.match(/^(#{1,3})\s+(.*)$/);
		if (heading) {
			const level = heading[1].length;
			counters[level - 1]++;
			for (let reset = level; reset < counters.length; reset++) counters[reset] = 0;
			const number = counters.slice(0, level).join(".");
			const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];
			blocks.push(new Paragraph({
				text: `${number} ${heading[2]}`,
				heading: levels[level - 1],
				// Explicit outline level (0-based) on the paragraph itself: the
				// table of contents collects by outline level (field ` TOC \o "1-3" `),
				// and the docx default heading styles carry none - without this the
				// generated TOC stays empty after LibreOffice/Word updates it.
				outlineLevel: level - 1,
				pageBreakBefore: level === 1 && !firstChapter,
				spacing: { before: level === 1 ? 0 : 240, after: 120 }
			}));
			if (level === 1) firstChapter = false;
			continue;
		}

		// Table (header row followed by separator row).
		if (line.trim().startsWith("|") && lines[i + 1]?.trim().match(/^\|[\s\-:|]+\|?$/)) {
			const rows = [_SplitTableRow(line)];
			i += 2;
			while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(_SplitTableRow(lines[i++]));
			i--;
			blocks.push(_TableFromRows(rows));
			blocks.push(new Paragraph({ spacing: { after: 60 } }));
			continue;
		}

		// Image on its own line: ![caption](relative/path.png)
		const image = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
		if (image) {
			blocks.push(...await _ImageBlocks(image[2], image[1]));
			continue;
		}

		// Bullet list item (paragraph-per-item, supports inline forms).
		const bullet = line.match(/^[-*]\s+(.*)$/);
		if (bullet) {
			blocks.push(new Paragraph({
				children: _InlineRuns(bullet[1]),
				bullet: { level: 0 },
				spacing: { after: 60 }
			}));
			continue;
		}

		// Numbered list item.
		const numbered = line.match(/^(\d+)\.\s+(.*)$/);
		if (numbered) {
			blocks.push(new Paragraph({
				children: [new TextRun({ text: `${numbered[1]}. `, bold: true }), ..._InlineRuns(numbered[2])],
				indent: { left: 360 },
				spacing: { after: 60 }
			}));
			continue;
		}

		if (!line.trim()) continue;

		// Plain paragraph: merge consecutive text lines.
		const parts = [line];
		while (i + 1 < lines.length && lines[i + 1].trim()
			&& !/^(#{1,3}\s|```|\||[-*]\s|\d+\.\s)/.test(lines[i + 1])) {
			parts.push(lines[++i]);
		}
		blocks.push(new Paragraph({
			children: _InlineRuns(parts.join(" ")),
			spacing: { after: 120 },
			alignment: AlignmentType.JUSTIFIED
		}));
	}
	return blocks;
}

// ----------------------------------------------------------------- assembly

async function _TitlePage() {
	const today = new Date().toISOString().slice(0, 10);
	const center = (_children, _spacingBefore = 0) => new Paragraph({
		children: _children, alignment: AlignmentType.CENTER, spacing: { before: _spacingBefore }
	});
	// Project logo, carried over from the original µCSS manual (dev/docs).
	const logo = await _ImageBlocks("imgs/logo.png", "", 220);
	return [
		new Paragraph({ spacing: { before: 1600 } }),
		...logo,
		center([new TextRun({ text: "µCSS", bold: true, size: 96 })], 400),
		center([new TextRun({ text: STRINGS.tagline, size: 32 })], 400),
		center([new TextRun({ text: STRINGS.npmLine, size: 24, color: "595959" })], 200),
		center([new TextRun({ text: STRINGS.manual, size: 28 })], 1200),
		center([new TextRun({ text: `Version ${packageInfo.version}`, size: 24 })], 200),
		center([new TextRun({ text: today, size: 24 })], 100),
		new Paragraph({ children: [new PageBreak()] }),
		// Plain bold title (not a heading style) so the TOC does not list itself.
		new Paragraph({
			children: [new TextRun({ text: STRINGS.contents, bold: true, size: 36, color: "1F3864" })],
			spacing: { after: 160 }
		}),
		new TableOfContents(STRINGS.contents, { hyperlink: true, headingStyleRange: "1-3" }),
		new Paragraph({ children: [new PageBreak()] })
	];
}

async function _Build() {
	const markdown = readFileSync(sourceFile, "utf8");
	const doc = new Document({
		creator: "microCSS build tooling",
		title: STRINGS.docTitle(packageInfo.version),
		description: STRINGS.docDescription,
		features: { updateFields: true },
		styles: {
			default: {
				document: { run: { font: "Calibri", size: 22 } },
				heading1: { run: { size: 36, bold: true, color: "1F3864" }, paragraph: { spacing: { after: 160 } } },
				heading2: { run: { size: 28, bold: true, color: "2E5496" } },
				heading3: { run: { size: 24, bold: true, color: "2E5496" } }
			}
		},
		sections: [{
			properties: {},
			children: [...await _TitlePage(), ...await _ParseMarkdown(markdown)]
		}]
	});
	const buffer = await Packer.toBuffer(doc);
	try {
		writeFileSync(outputFile, buffer);
	} catch (error) {
		if (error.code === "EBUSY" || error.code === "EPERM") {
			throw new Error(`build-manual: "${outputFile}" is locked - close the document (Word/preview) and run again.`, { cause: error });
		}
		throw error;
	}
	console.log(`manual written: ${outputFile} (${Math.round(buffer.length / 1024)} kB)`);
}

await _Build();
