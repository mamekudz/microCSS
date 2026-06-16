// Sprite strip generator: renders an animation sequence into one horizontal
// image (all frames side by side in uniform cells) plus the JSON mapping data
// used by the legacy game/GUI runtimes.
//
// Two source forms are supported:
//   - a list of single frame images (e.g. "O_EFX_00_smoke.0000.png" ...);
//     each frame is trimmed to its content, the union of all trimmed boxes
//     defines the cell size
//   - a single image in the DSD format (see DsdFormat.mjs) whose cells carry
//     explicit frame numbers and anchor offsets
//
// Ported from SpriteTools.js (ConvertDSDFormat2SpriteImage and
// ConvertImageSequence2Sprites with createSpritesStrip).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, basename, join, parse } from "node:path";
import sharp from "sharp";
import { EncodeByExtension } from "../io/SaveImage.mjs";
import { ScanDsdImage, DSD_SIGN_ORIGINAL, DSD_SIGN_ORIGINALANDMASK } from "./DsdFormat.mjs";

const SPRITE_DATA_LENGTH = 37;

// Legacy file naming: <prefix>_<layer>_<seriesNo>_<seriesName>.<sequenceNo>.<ext>
const SEQUENCE_NAME_PATTERN = /^([OLSBDTMN])_(ACT|EFX|EDS|IVS|GUI)_(\d{2})_(.+?)\.(\d+)\.[a-z]+$/i;
const LAYER_INFOBITS = { ACT: 1 << 4, EFX: 1 << 5, EDS: 1 << 6, IVS: 1 << 7, GUI: 1 << 8 };

function _SpriteRow(_infoBits, _xs, _w, _h, _xo, _yo) {
	const row = new Array(SPRITE_DATA_LENGTH).fill(0);
	row[0] = _infoBits;
	row[1] = _xs;
	row[3] = _w;
	row[4] = _h;
	row[5] = _xo;
	row[6] = _yo;
	return row;
}

// Trims a raw RGBA frame to the bounding box of all pixels that differ from
// the background color (pixel 0/0). Fully transparent pixels count as equal
// to a fully transparent background regardless of their RGB residue (the
// legacy canvas pipeline premultiplied alpha, which collapsed them). A frame
// without any content (or covering the full image) collapses to a 1x1 box at
// the image center, like the legacy _GetShrinkBox did.
function _TrimBox(_data, _width, _height) {
	const pixels = new Uint32Array(_data.buffer, _data.byteOffset, _width * _height);
	const background = pixels[0];
	const backgroundTransparent = (_data[3] === 0);
	let xs = _width, ys = _height, xe = -1, ye = -1;
	for (let y = 0; y < _height; y++) {
		for (let x = 0; x < _width; x++) {
			const i = y * _width + x;
			if (pixels[i] === background) continue;
			if (backgroundTransparent && _data[i * 4 + 3] === 0) continue;
			if (x < xs) xs = x;
			if (x > xe) xe = x;
			if (y < ys) ys = y;
			if (y > ye) ye = y;
		}
	}
	if (xe < 0 || (xs === 0 && ys === 0 && xe === _width - 1 && ye === _height - 1)) {
		return { xs: (_width >> 1) - 1, ys: (_height >> 1) - 1, w: 1, h: 1, xo: 0, yo: 0 };
	}
	return {
		xs, ys,
		w: xe - xs + 1,
		h: ye - ys + 1,
		// Anchor: offset of the trimmed box relative to the image center.
		xo: (_width >> 1) - xs - 1,
		yo: (_height >> 1) - ys - 1
	};
}

// Copies a rectangle between raw RGBA buffers.
function _CopyRect(_src, _srcWidth, _sxs, _sys, _w, _h, _dst, _dstWidth, _dxs, _dys) {
	for (let y = 0; y < _h; y++) {
		const srcStart = ((_sys + y) * _srcWidth + _sxs) * 4;
		const dstStart = ((_dys + y) * _dstWidth + _dxs) * 4;
		_src.copy(_dst, dstStart, srcStart, srcStart + _w * 4);
	}
}

// Copies a rectangle with nearest-neighbor 2x upscaling into the target.
function _CopyRect2x(_src, _srcWidth, _sxs, _sys, _w, _h, _dst, _dstWidth, _dxs, _dys) {
	for (let y = 0; y < _h; y++) {
		for (let x = 0; x < _w; x++) {
			const s = ((_sys + y) * _srcWidth + (_sxs + x)) * 4;
			for (const [px, py] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
				const d = ((_dys + y * 2 + py) * _dstWidth + (_dxs + x * 2 + px)) * 4;
				_dst[d] = _src[s];
				_dst[d + 1] = _src[s + 1];
				_dst[d + 2] = _src[s + 2];
				_dst[d + 3] = _src[s + 3];
			}
		}
	}
}

function _RetinaFileName(_fileName) {
	const parts = parse(_fileName);
	return join(parts.dir, `${parts.name}@2x${parts.ext}`);
}

async function _SaveStrip(_data, _width, _height, _fileName) {
	await EncodeByExtension(sharp(_data, {
		raw: { width: _width, height: _height, channels: 4 }
	}), _fileName).toFile(_fileName);
}

async function _SaveStripHalfSize(_data, _width, _height, _fileName) {
	await EncodeByExtension(sharp(_data, {
		raw: { width: _width, height: _height, channels: 4 }
	}).resize(Math.round(_width / 2), Math.round(_height / 2), { kernel: "lanczos3" }), _fileName).toFile(_fileName);
}

export class SequenceStrip {
	// _options: {
	//   images: string[]      frame files of the sequence (@2x masters), or
	//   dsdImage: string      a single DSD format image (1x) instead
	//   outputFile: string    strip file name, e.g. "imgs/smoke.png";
	//                         ".webp" produces lossless WebP
	//   retina = true         write "<name>@2x" plus the halved "<name>";
	//                         false writes only "<name>" in source resolution
	//   writeMapFile = true   write "<name>.json" with the frame mapping
	// }
	static async Create(_options) {
		const options = {
			retina: true,
			writeMapFile: true,
			..._options
		};
		if (!options.outputFile) throw new Error("SequenceStrip: no output file given.");
		if (!options.images?.length && !options.dsdImage) {
			throw new Error("SequenceStrip: neither images nor dsdImage given.");
		}
		mkdirSync(dirname(options.outputFile), { recursive: true });

		const result = options.dsdImage
			? await this._CreateFromDsd(options)
			: await this._CreateFromSequence(options);

		if (options.writeMapFile) {
			const parts = parse(options.outputFile);
			const mapFile = join(parts.dir, `${parts.name}.json`);
			writeFileSync(mapFile, JSON.stringify(result.map));
			result.files.push(mapFile);
		}
		return result;
	}

	// Sequence of single frame images: trim each frame, place the trimmed
	// content into uniform cells whose size is the union of all trimmed boxes.
	static async _CreateFromSequence(_options) {
		const frames = [];
		let seriesName = null;
		let infoBits = 0;
		let allNamed = true;
		for (const file of _options.images) {
			const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
			const match = basename(file).match(SEQUENCE_NAME_PATTERN);
			if (match) {
				seriesName = seriesName ?? match[4];
				infoBits = LAYER_INFOBITS[match[2].toUpperCase()] ?? 0;
			} else {
				allNamed = false;
			}
			frames.push({
				data,
				width: info.width,
				height: info.height,
				sequenceNo: match ? parseInt(match[5], 10) : frames.length,
				...(_TrimBox(data, info.width, info.height))
			});
		}
		if (!allNamed || seriesName === null) {
			seriesName = parse(_options.outputFile).name;
			infoBits = 0;
		}
		frames.sort((_a, _b) => _a.sequenceNo - _b.sequenceNo);

		// Union of all trimmed boxes defines the cell size (rounded up to even).
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const frame of frames) {
			if (frame.xs < minX) minX = frame.xs;
			if (frame.ys < minY) minY = frame.ys;
			if (frame.xs + frame.w > maxX) maxX = frame.xs + frame.w;
			if (frame.ys + frame.h > maxY) maxY = frame.ys + frame.h;
		}
		let cellW = maxX - minX + 1;
		let cellH = maxY - minY + 1;
		if (cellW % 2 === 1) cellW++;
		if (cellH % 2 === 1) cellH++;

		const stripWidth = cellW * frames.length;
		const strip = Buffer.alloc(stripWidth * cellH * 4);
		const rows = [];
		for (let i = 0; i < frames.length; i++) {
			const frame = frames[i];
			_CopyRect(frame.data, frame.width, frame.xs, frame.ys, frame.w, frame.h,
				strip, stripWidth, i * cellW + frame.xs - minX, frame.ys - minY);
			rows.push(_SpriteRow(infoBits, i * cellW, frame.w, frame.h, frame.xo, frame.yo));
		}

		const files = [];
		if (_options.retina) {
			const retinaFile = _RetinaFileName(_options.outputFile);
			await _SaveStrip(strip, stripWidth, cellH, retinaFile);
			await _SaveStripHalfSize(strip, stripWidth, cellH, _options.outputFile);
			files.push(retinaFile, _options.outputFile);
		} else {
			await _SaveStrip(strip, stripWidth, cellH, _options.outputFile);
			files.push(_options.outputFile);
		}

		const map = {
			info: {
				maxWidth: cellW,
				maxHeight: cellH,
				// Anchor of the source image center within a cell.
				offX: (frames[0].width >> 1) - 1 - minX,
				offY: (frames[0].height >> 1) - 1 - minY
			},
			series: { [seriesName]: 0 },
			sprites: rows
		};
		return { map, files, frameCount: frames.length, cellWidth: cellW, cellHeight: cellH };
	}

	// DSD format image: the scanner provides explicit frame numbers and
	// anchors. The 1x strip copies the source directly, the @2x variant is a
	// nearest-neighbor upscale (the DSD source is a 1x pixel-art master).
	static async _CreateFromDsd(_options) {
		const { data, info } = await sharp(_options.dsdImage).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		const frames = ScanDsdImage({ data, width: info.width, height: info.height })
			.filter((f) => f.type === DSD_SIGN_ORIGINAL || f.type === DSD_SIGN_ORIGINALANDMASK)
			.sort((_a, _b) => _a.no - _b.no);
		if (frames.length === 0) throw new Error(`SequenceStrip: no DSD frames found in "${_options.dsdImage}".`);

		// Cell size from the union of all anchored frame boxes (1px margin).
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		let maxNo = 0;
		for (const frame of frames) {
			if (frame.ox < minX) minX = frame.ox;
			if (frame.oy < minY) minY = frame.oy;
			if (frame.ox + frame.w > maxX) maxX = frame.ox + frame.w;
			if (frame.oy + frame.h > maxY) maxY = frame.oy + frame.h;
			if (frame.no > maxNo) maxNo = frame.no;
		}
		const cellW = maxX - minX + 1;
		const cellH = maxY - minY + 1;

		const stripWidth = cellW * (maxNo + 1);
		const strip = Buffer.alloc(stripWidth * cellH * 4);
		for (const frame of frames) {
			_CopyRect(data, info.width, frame.xs, frame.ys, frame.w, frame.h,
				strip, stripWidth, frame.no * cellW + frame.ox - minX, frame.oy - minY);
		}

		const scale = _options.retina ? 2 : 1;
		const files = [];
		if (_options.retina) {
			const strip2x = Buffer.alloc(stripWidth * 2 * cellH * 2 * 4);
			_CopyRect2x(strip, stripWidth, 0, 0, stripWidth, cellH, strip2x, stripWidth * 2, 0, 0);
			const retinaFile = _RetinaFileName(_options.outputFile);
			await _SaveStrip(strip2x, stripWidth * 2, cellH * 2, retinaFile);
			await _SaveStrip(strip, stripWidth, cellH, _options.outputFile);
			files.push(retinaFile, _options.outputFile);
		} else {
			await _SaveStrip(strip, stripWidth, cellH, _options.outputFile);
			files.push(_options.outputFile);
		}

		// All rows share the cell geometry; XS addresses the cell by frame number.
		const rows = frames.map((frame) =>
			_SpriteRow(0, frame.no * cellW * scale, cellW * scale, cellH * scale, minX * scale, minY * scale));
		const map = {
			info: {
				maxWidth: cellW * scale,
				maxHeight: cellH * scale,
				offX: -minX * scale,
				offY: -minY * scale
			},
			series: { standard: 0 },
			sprites: rows
		};
		return { map, files, frameCount: frames.length, cellWidth: cellW * scale, cellHeight: cellH * scale };
	}
}
