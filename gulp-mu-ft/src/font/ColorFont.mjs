// microFT - OpenType color-font inspection and SFNT/WOFF container helpers.
//
// Color-relevant sites in this module:
//   FontBuilder.BuildFontFormats  — SVG→TTF icon path is monochrome (no COLR).
//   FontBuilder.ConvertFontFormats — existing TTF/OTF/WOFF → WOFF/WOFF2, tables kept.
//   FontGenerator.Create          — SVG directory (icons) or a single font file.
//   ttf2woff / ttf2woff2          — wrap every SFNT table; they do not strip COLR.
//   ttf2eot / SVG fonts           — cannot carry color tables; skipped with a warning.
//   Subsetting                    — not implemented; color fonts are never subsetted.
//
// Detection is centralized here so callers do not re-parse table directories.

import zlib from "node:zlib";

// Four-byte tags. "SVG " includes the trailing space from the OpenType spec.
export const COLOR_TABLE_TAGS = Object.freeze(["COLR", "CPAL", "SVG ", "CBDT", "CBLC", "sbix"]);

const WOFF2_KNOWN_TAGS = Object.freeze([
	"cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post",
	"cvt ", "fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT",
	"EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea",
	"vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH",
	"CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar",
	"bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
	"gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop",
	"trak", "Zapf", "Silf", "Gloc", "Glat", "Feat", "Sill"
]);

const SFNT_FLAVORS = new Set([0x00010000, 0x4f54544f, 0x74727565]);

function _ReadTag(_buffer, _offset) {
	return _buffer.toString("ascii", _offset, _offset + 4);
}

function _Pad4(_length) {
	return (_length + 3) & ~3;
}

function _Checksum(_buffer) {
	const padded = Buffer.alloc(_Pad4(_buffer.length));
	_buffer.copy(padded);
	let sum = 0;
	for (let i = 0; i < padded.length; i += 4) {
		sum = (sum + padded.readUInt32BE(i)) >>> 0;
	}
	return sum;
}

function _EmptyInspection(_wrapper) {
	return {
		wrapper: _wrapper,
		flavor: 0,
		tables: [],
		colorTables: [],
		isColorFont: false,
		colorFontFormats: [],
		colrVersion: null,
		paletteCount: null
	};
}

function _ColorFormatsFromTables(_tables, _colrVersion) {
	const tags = new Set(_tables);
	const formats = [];
	if (tags.has("COLR")) {
		if (_colrVersion === 1) formats.push("COLRv1");
		else if (_colrVersion === 0) formats.push("COLRv0");
		else formats.push("COLR");
	}
	if (tags.has("SVG ")) formats.push("SVG");
	if (tags.has("CBDT") || tags.has("CBLC")) formats.push("CBDT");
	if (tags.has("sbix")) formats.push("sbix");
	return formats;
}

function _ReadColrVersion(_colrTable) {
	if (!_colrTable || _colrTable.length < 2) return null;
	return _colrTable.readUInt16BE(0);
}

function _ReadPaletteCount(_cpalTable) {
	if (!_cpalTable || _cpalTable.length < 6) return null;
	return _cpalTable.readUInt16BE(4);
}

function _InspectFromTableMap(_wrapper, _flavor, _tableMap) {
	const tables = Object.keys(_tableMap).sort();
	const colorTables = tables.filter((_tag) => COLOR_TABLE_TAGS.includes(_tag));
	const colrVersion = _ReadColrVersion(_tableMap["COLR"]);
	const paletteCount = _ReadPaletteCount(_tableMap["CPAL"]);
	return {
		wrapper: _wrapper,
		flavor: _flavor,
		tables,
		colorTables,
		isColorFont: colorTables.some((_tag) => _tag === "COLR" || _tag === "SVG " || _tag === "CBDT" || _tag === "sbix"),
		colorFontFormats: _ColorFormatsFromTables(tables, colrVersion),
		colrVersion,
		paletteCount
	};
}

/**
 * Reads the SFNT table directory. Tags keep their four-byte form ("SVG ").
 *
 * @param {Buffer} _buffer TTF/OTF (TrueType or CFF)
 * @returns {{ flavor: number, tables: Record<string, Buffer> }}
 */
export function ReadSfntTables(_buffer) {
	if (!_buffer || _buffer.length < 12) {
		throw new Error("ReadSfntTables: buffer is too short for an SFNT header.");
	}
	const flavor = _buffer.readUInt32BE(0);
	const numTables = _buffer.readUInt16BE(4);
	const tables = {};
	for (let i = 0; i < numTables; i++) {
		const record = 12 + i * 16;
		if (record + 16 > _buffer.length) {
			throw new Error("ReadSfntTables: table directory is truncated.");
		}
		const tag = _ReadTag(_buffer, record);
		const offset = _buffer.readUInt32BE(record + 8);
		const length = _buffer.readUInt32BE(record + 12);
		if (offset + length > _buffer.length) {
			throw new Error(`ReadSfntTables: table '${tag}' is truncated.`);
		}
		tables[tag] = Buffer.from(_buffer.subarray(offset, offset + length));
	}
	return { flavor, tables };
}

/**
 * Builds an SFNT font from a table map. Checksums match what ttf2woff expects.
 *
 * @param {Record<string, Buffer>} _tables
 * @param {number} [_flavor=0x00010000]
 * @returns {Buffer}
 */
export function WriteSfnt(_tables, _flavor = 0x00010000) {
	const tags = Object.keys(_tables).sort();
	const numTables = tags.length;
	if (numTables === 0) throw new Error("WriteSfnt: no tables.");
	const maxPow = 2 ** Math.floor(Math.log2(numTables));
	const headerSize = 12 + numTables * 16;
	const records = [];
	let offset = headerSize;
	for (const tag of tags) {
		const raw = Buffer.from(_tables[tag]);
		const data = tag === "head" && raw.length >= 12 ? Buffer.from(raw) : raw;
		if (tag === "head" && data.length >= 12) data.writeUInt32BE(0, 8);
		records.push({ tag, data, checkSum: _Checksum(data), offset, length: data.length });
		offset += _Pad4(data.length);
	}

	const out = Buffer.alloc(offset);
	out.writeUInt32BE(_flavor >>> 0, 0);
	out.writeUInt16BE(numTables, 4);
	out.writeUInt16BE(maxPow * 16, 6);
	out.writeUInt16BE(Math.floor(Math.log2(numTables)), 8);
	out.writeUInt16BE(numTables * 16 - maxPow * 16, 10);

	let cursor = 12;
	for (const record of records) {
		out.write(record.tag.padEnd(4, " ").slice(0, 4), cursor, 4, "ascii");
		out.writeUInt32BE(record.checkSum, cursor + 4);
		out.writeUInt32BE(record.offset, cursor + 8);
		out.writeUInt32BE(record.length, cursor + 12);
		record.data.copy(out, record.offset);
		cursor += 16;
	}

	const head = records.find((_record) => _record.tag === "head");
	if (head && head.data.length >= 12) {
		const adjustment = (0xb1b0afba - _Checksum(out)) >>> 0;
		out.writeUInt32BE(adjustment, head.offset + 8);
	}
	return out;
}

/**
 * Replaces or inserts SFNT tables and rewrites the directory.
 *
 * @param {Buffer} _sfnt
 * @param {Record<string, Buffer>} _replacements
 * @returns {Buffer}
 */
export function ReplaceSfntTables(_sfnt, _replacements) {
	const { flavor, tables } = ReadSfntTables(_sfnt);
	for (const [tag, data] of Object.entries(_replacements)) {
		tables[tag.padEnd(4, " ").slice(0, 4)] = Buffer.from(data);
	}
	return WriteSfnt(tables, flavor);
}

function _ReadWoffTables(_buffer) {
	const numTables = _buffer.readUInt16BE(12);
	const flavor = _buffer.readUInt32BE(4);
	const tables = {};
	for (let i = 0; i < numTables; i++) {
		const record = 44 + i * 20;
		const tag = _ReadTag(_buffer, record);
		const offset = _buffer.readUInt32BE(record + 4);
		const compLength = _buffer.readUInt32BE(record + 8);
		const origLength = _buffer.readUInt32BE(record + 12);
		const packed = _buffer.subarray(offset, offset + compLength);
		const raw = compLength < origLength ? zlib.inflateSync(packed) : Buffer.from(packed);
		tables[tag] = raw.subarray(0, origLength);
	}
	return { flavor, tables };
}

function _ReadBase128(_buffer, _offset) {
	let accum = 0;
	let offset = _offset;
	for (let i = 0; i < 5; i++) {
		if (offset >= _buffer.length) throw new Error("InspectFont: truncated WOFF2 Base128.");
		const byte = _buffer[offset++];
		if (accum & 0xfe000000) throw new Error("InspectFont: WOFF2 Base128 overflow.");
		accum = (accum << 7) | (byte & 0x7f);
		if ((byte & 0x80) === 0) return { value: accum >>> 0, offset };
	}
	throw new Error("InspectFont: invalid WOFF2 Base128.");
}

function _Woff2TableTransformed(_tag, _transformVersion) {
	if (_tag === "glyf" || _tag === "loca") return _transformVersion === 0;
	return _transformVersion !== 0;
}

/**
 * Reads table tags from a WOFF2 directory without decompressing the collection.
 *
 * @param {Buffer} _buffer
 * @returns {{ flavor: number, tags: string[] }}
 */
export function ReadWoff2TableTags(_buffer) {
	if (!_buffer || _buffer.length < 48) {
		throw new Error("ReadWoff2TableTags: buffer is too short for a WOFF2 header.");
	}
	const flavor = _buffer.readUInt32BE(4);
	const numTables = _buffer.readUInt16BE(12);
	const tags = [];
	let offset = 48;
	for (let i = 0; i < numTables; i++) {
		const flags = _buffer[offset++];
		const tableId = flags & 0x3f;
		const transformVersion = flags >> 6;
		let tag;
		if (tableId === 63) {
			tag = _ReadTag(_buffer, offset);
			offset += 4;
		} else {
			tag = WOFF2_KNOWN_TAGS[tableId];
			if (!tag) throw new Error(`ReadWoff2TableTags: unknown WOFF2 table id ${tableId}.`);
		}
		tags.push(tag);
		const orig = _ReadBase128(_buffer, offset);
		offset = orig.offset;
		if (_Woff2TableTransformed(tag, transformVersion)) {
			const transformed = _ReadBase128(_buffer, offset);
			offset = transformed.offset;
		}
	}
	return { flavor, tags };
}

function _Signature(_buffer) {
	if (!_buffer || _buffer.length < 4) return "";
	return _buffer.toString("ascii", 0, 4);
}

/**
 * Identifies the container and lists OpenType color tables.
 *
 * @param {Buffer} _buffer
 * @returns {{ wrapper: string, flavor: number, tables: string[], colorTables: string[], isColorFont: boolean, colorFontFormats: string[], colrVersion: number|null, paletteCount: number|null }}
 */
export function InspectFont(_buffer) {
	if (!_buffer || _buffer.length < 4) return _EmptyInspection("unknown");
	const signature = _Signature(_buffer);
	if (signature === "wOFF") {
		const { flavor, tables } = _ReadWoffTables(_buffer);
		return _InspectFromTableMap("woff", flavor, tables);
	}
	if (signature === "wOF2") {
		const { flavor, tags } = ReadWoff2TableTags(_buffer);
		const tableMap = Object.fromEntries(tags.map((_tag) => [_tag, Buffer.alloc(0)]));
		const inspection = _InspectFromTableMap("woff2", flavor, tableMap);
		// COLR version and CPAL counts need the decompressed table; WOFF2 exposes tags only.
		inspection.colrVersion = null;
		inspection.paletteCount = null;
		if (tags.includes("COLR")) {
			inspection.colorFontFormats = _ColorFormatsFromTables(tags, null);
		}
		return inspection;
	}
	if (signature === "ttcf") {
		const inspection = _EmptyInspection("ttc");
		inspection.tables = ["ttcf"];
		return inspection;
	}
	const flavor = _buffer.readUInt32BE(0);
	if (!SFNT_FLAVORS.has(flavor)) return _EmptyInspection("unknown");
	const { tables } = ReadSfntTables(_buffer);
	return _InspectFromTableMap("sfnt", flavor, tables);
}

/**
 * @param {Buffer} _buffer
 * @returns {boolean}
 */
export function DetectColorFont(_buffer) {
	return InspectFont(_buffer).isColorFont === true;
}

/**
 * Decodes WOFF to SFNT. WOFF2 is not decoded (no extra decompressor dependency).
 *
 * @param {Buffer} _buffer
 * @returns {{ sfnt: Buffer|null, inspection: object, warnings: string[] }}
 */
export function DecodeToSfnt(_buffer) {
	const warnings = [];
	const inspection = InspectFont(_buffer);
	if (inspection.wrapper === "sfnt") {
		return { sfnt: Buffer.from(_buffer), inspection, warnings };
	}
	if (inspection.wrapper === "woff") {
		const { flavor, tables } = _ReadWoffTables(_buffer);
		return { sfnt: WriteSfnt(tables, flavor), inspection, warnings };
	}
	if (inspection.wrapper === "woff2") {
		warnings.push(
			"WOFF2 input cannot be decoded to SFNT without a WOFF2 decompressor; " +
			"keeping the original WOFF2 when that format is requested and skipping TTF/WOFF/EOT/SVG."
		);
		return { sfnt: null, inspection, warnings };
	}
	if (inspection.wrapper === "ttc") {
		warnings.push("TrueType collections (TTC/OTC) are not supported; supply a single-font TTF/OTF/WOFF/WOFF2 file.");
		return { sfnt: null, inspection, warnings };
	}
	warnings.push("Unrecognized font container; the file was not converted.");
	return { sfnt: null, inspection, warnings };
}

/**
 * Reports color tables that were present in `_before` but missing in `_after`.
 *
 * @param {object} _before InspectFont result
 * @param {object} _after InspectFont result
 * @returns {string[]}
 */
export function MissingColorTables(_before, _after) {
	const after = new Set(_after?.colorTables ?? []);
	return (_before?.colorTables ?? []).filter((_tag) => !after.has(_tag));
}

export function ColorTablesPreserved(_before, _after) {
	return MissingColorTables(_before, _after).length === 0;
}
