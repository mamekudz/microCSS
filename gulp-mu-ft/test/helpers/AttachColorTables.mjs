// Test helper: injects OpenType color tables into an SFNT produced by the
// icon pipeline so detection and WOFF/WOFF2 preservation can be asserted.

import { ReplaceSfntTables } from "../../src/font/ColorFont.mjs";

function _ColrV0() {
	const header = Buffer.alloc(14);
	header.writeUInt16BE(0, 0);
	header.writeUInt16BE(0, 2);
	header.writeUInt16BE(10, 4);
	header.writeUInt16BE(10, 6);
	header.writeUInt16BE(0, 8);
	return header;
}

function _ColrV1() {
	const header = Buffer.alloc(26);
	header.writeUInt16BE(1, 0);
	header.writeUInt16BE(0, 2);
	header.writeUInt32BE(0, 4);
	header.writeUInt32BE(0, 8);
	header.writeUInt16BE(0, 12);
	header.writeUInt32BE(0, 14);
	header.writeUInt32BE(0, 18);
	header.writeUInt32BE(0, 22);
	return header;
}

function _Cpal(numPalettes = 2) {
	const headerSize = 12 + 2 * numPalettes;
	const colors = Buffer.from([
		0x00, 0x00, 0xff, 0xff,
		0x00, 0xff, 0x00, 0xff
	]);
	const table = Buffer.alloc(headerSize + colors.length);
	table.writeUInt16BE(0, 0);
	table.writeUInt16BE(2, 2);
	table.writeUInt16BE(numPalettes, 4);
	table.writeUInt16BE(2, 6);
	table.writeUInt32BE(headerSize, 8);
	for (let i = 0; i < numPalettes; i++) table.writeUInt16BE(0, 12 + i * 2);
	colors.copy(table, headerSize);
	return table;
}

/**
 * @param {Buffer} _sfnt
 * @param {object} [_options]
 * @param {0|1} [_options.colrVersion=0]
 * @param {string[]} [_options.extraTables]
 * @returns {Buffer}
 */
export function AttachColorTables(_sfnt, _options = {}) {
	const colrVersion = _options.colrVersion ?? 0;
	const replacements = {
		COLR: colrVersion === 1 ? _ColrV1() : _ColrV0(),
		CPAL: _Cpal(_options.paletteCount ?? 2)
	};
	for (const tag of _options.extraTables ?? []) {
		replacements[tag] = Buffer.from(`mu-ft-color-fixture:${tag}`);
	}
	return ReplaceSfntTables(_sfnt, replacements);
}
