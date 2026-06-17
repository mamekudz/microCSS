// Creates a DSD-format master image from a sequence of frame files (authoring
// counterpart to ScanDsdImage). Default anchor/pivot is top-left of trimmed content (0, 0).

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";
import { EncodeByExtension } from "../io/SaveImage.mjs";
import {
	DSD_SIGN_ORIGINAL,
	DSD_SIGN_PATTERNS,
	ScanDsdImage
} from "./DsdFormat.mjs";
import { TrimFrameBox } from "./SequenceFrames.mjs";

function _SetPixel(_data, _width, _height, _x, _y, _rgba) {
	if (_x < 0 || _y < 0 || _x >= _width || _y >= _height) return;
	const i = (_y * _width + _x) * 4;
	_data[i] = _rgba[0];
	_data[i + 1] = _rgba[1];
	_data[i + 2] = _rgba[2];
	_data[i + 3] = _rgba[3];
}

function _FillHLine(_data, _width, _height, _x0, _x1, _y, _rgba) {
	for (let x = _x0; x <= _x1; x++) _SetPixel(_data, _width, _height, x, _y, _rgba);
}

function _FillVLine(_data, _width, _height, _x, _y0, _y1, _rgba) {
	for (let y = _y0; y <= _y1; y++) _SetPixel(_data, _width, _height, _x, y, _rgba);
}

function _DrawSignGlyph(_data, _width, _height, _x, _y, _sign, _rgba) {
	const pattern = DSD_SIGN_PATTERNS[_sign][0];
	for (let bit = 0; bit < 15; bit++) {
		if (!((pattern >> (14 - bit)) & 1)) continue;
		_SetPixel(_data, _width, _height, _x + (bit % 3), _y + Math.floor(bit / 3), _rgba);
	}
}

function _DrawFrameNumber(_data, _width, _height, _x, _y, _no, _rgba) {
	const text = String(Math.max(0, _no)).padStart(3, "0").slice(-3);
	for (let i = 0; i < 3; i++) {
		_DrawSignGlyph(_data, _width, _height, _x + 4 * i, _y, text.charCodeAt(i) - 48, _rgba);
	}
}

function _CopyRect(_src, _srcWidth, _sxs, _sys, _w, _h, _dst, _dstWidth, _dxs, _dys) {
	for (let y = 0; y < _h; y++) {
		for (let x = 0; x < _w; x++) {
			const si = ((_sys + y) * _srcWidth + (_sxs + x)) * 4;
			const di = ((_dys + y) * _dstWidth + (_dxs + x)) * 4;
			_dst[di] = _src[si];
			_dst[di + 1] = _src[si + 1];
			_dst[di + 2] = _src[si + 2];
			_dst[di + 3] = _src[si + 3];
		}
	}
}

function _CellSize(_frame) {
	return { w: _frame.w + 5, h: _frame.h + 11 };
}

/** One background pixel between adjacent cells so ScanDsdImage does not merge borders. */
const DSD_CELL_GAP = 1;

/**
 * Resolves DSD anchor offsets (ox/oy) from pivotPercent (0..100 of trimmed content)
 * or explicit pivot pixels. Percent 0/0 = top-left; 50/50 = center; 100/100 = bottom-right.
 *
 * @param {{ w: number, h: number }} _trim
 * @param {{ pivot?: { x?: number, y?: number }, pivotPercent?: { x?: number, y?: number } }} _options
 */
export function ResolveDsdPivotOffsets(_trim, _options) {
	if (_options.pivotPercent != null) {
		const px = Math.max(0, Math.min(100, _options.pivotPercent.x ?? 0));
		const py = Math.max(0, Math.min(100, _options.pivotPercent.y ?? 0));
		const w = Math.max(1, _trim.w);
		const h = Math.max(1, _trim.h);
		return {
			ox: -Math.round((w - 1) * (px / 100)),
			oy: -Math.round((h - 1) * (py / 100))
		};
	}
	return {
		ox: _options.pivot?.x ?? 0,
		oy: _options.pivot?.y ?? 0
	};
}

function _DrawCell(_data, _width, _height, _x, _y, _frame, _signType, _signRgba) {
	const { w, h, ox, oy } = _frame;
	const xs = _x + 2;
	const ys = _y + 2;
	const sx = xs + w + 3;
	const sy = ys + h + 3;
	const sox = xs - ox;
	const soy = ys - oy;

	_FillHLine(_data, _width, _height, _x, sx - 1, _y, _signRgba);
	_FillVLine(_data, _width, _height, _x, _y, sy - 1, _signRgba);
	_FillVLine(_data, _width, _height, sx - 1, _y, soy - 1, _signRgba);
	_FillHLine(_data, _width, _height, _x, sox - 1, sy - 1, _signRgba);

	_CopyRect(_frame.data, _frame.width, _frame.xs, _frame.ys, w, h, _data, _width, xs, ys);
	_DrawSignGlyph(_data, _width, _height, _x, sy + 1, _signType, _signRgba);
	_DrawFrameNumber(_data, _width, _height, _x + 4, sy + 1, _frame.no, _signRgba);

	return sx;
}

/**
 * @param {string[]} _images
 * @param {{
 *   outputFile: string,
 *   signColor?: [number, number, number, number],
 *   backgroundColor?: [number, number, number, number],
 *   signType?: number,
 *   pivot?: { x?: number, y?: number },
 *   pivotPercent?: { x?: number, y?: number },
 *   frameNumbers?: number[]
 * }} _options
 */
export async function CreateDsdFromImages(_images, _options) {
	if (!_images?.length) throw new Error("CreateDsdFromImages: no images given.");
	if (!_options?.outputFile) throw new Error("CreateDsdFromImages: outputFile is required.");

	const signType = _options.signType ?? DSD_SIGN_ORIGINAL;

	const frames = [];
	for (let i = 0; i < _images.length; i++) {
		const { data, info } = await sharp(_images[i]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		const trim = TrimFrameBox(data, info.width, info.height, "topleft");
		const pivot = ResolveDsdPivotOffsets(trim, _options);
		frames.push({
			no: _options.frameNumbers?.[i] ?? i,
			data,
			width: info.width,
			height: info.height,
			xs: trim.xs,
			ys: trim.ys,
			w: trim.w,
			h: trim.h,
			ox: pivot.ox,
			oy: pivot.oy
		});
	}

	let bg = _options.backgroundColor;
	if (!bg) {
		const first = frames[0].data;
		bg = [first[0], first[1], first[2], first[3]];
	}
	const signRgba = _options.signColor ?? [0, 0, 0, 255];

	// ScanDsdImage treats pixel 0/0 as the sheet background; leave a 1px margin so the
	// first cell border never overwrites it.
	const marginX = 1;
	const marginY = 1;

	let outWidth = marginX;
	let outHeight = marginY;
	for (let i = 0; i < frames.length; i++) {
		const size = _CellSize(frames[i]);
		outWidth += size.w + (i < frames.length - 1 ? DSD_CELL_GAP : 0);
		outHeight = Math.max(outHeight, marginY + size.h);
	}

	const out = Buffer.alloc(outWidth * outHeight * 4);
	for (let i = 0; i < outWidth * outHeight; i++) {
		const o = i * 4;
		out[o] = bg[0];
		out[o + 1] = bg[1];
		out[o + 2] = bg[2];
		out[o + 3] = bg[3];
	}

	let cursorX = marginX;
	for (let i = 0; i < frames.length; i++) {
		cursorX = _DrawCell(out, outWidth, outHeight, cursorX, marginY, frames[i], signType, signRgba);
		if (i < frames.length - 1) cursorX += DSD_CELL_GAP;
	}

	mkdirSync(dirname(_options.outputFile), { recursive: true });
	await EncodeByExtension(sharp(out, {
		raw: { width: outWidth, height: outHeight, channels: 4 }
	}), _options.outputFile).toFile(_options.outputFile);

	const scanned = ScanDsdImage({ data: out, width: outWidth, height: outHeight });
	return {
		outputFile: _options.outputFile,
		width: outWidth,
		height: outHeight,
		frameCount: frames.length,
		scannedCount: scanned.length,
		frames: scanned
	};
}
