// Raster utilities for document-space compositing.
// A raster is { width, height, data: Float32Array } with non-premultiplied
// RGBA values in the range [0..1], always covering the full document area.

import { GetBlendFunction } from "./BlendModes.mjs";

export function CreateRaster(_width, _height) {
	return {
		width: _width,
		height: _height,
		data: new Float32Array(_width * _height * 4)
	};
}

export function CloneRaster(_raster) {
	return {
		width: _raster.width,
		height: _raster.height,
		data: new Float32Array(_raster.data)
	};
}

// Copies 8-bit RGBA image data of a layer into a document-sized raster at the given offset.
export function RasterFromImageData(_imageData, _left, _top, _docWidth, _docHeight) {
	const raster = CreateRaster(_docWidth, _docHeight);
	if (!_imageData) return raster;
	const src = _imageData.data;
	for (let y = 0; y < _imageData.height; y++) {
		const dy = y + _top;
		if (dy < 0 || dy >= _docHeight) continue;
		for (let x = 0; x < _imageData.width; x++) {
			const dx = x + _left;
			if (dx < 0 || dx >= _docWidth) continue;
			const si = (y * _imageData.width + x) * 4;
			const di = (dy * _docWidth + dx) * 4;
			raster.data[di] = src[si] / 255;
			raster.data[di + 1] = src[si + 1] / 255;
			raster.data[di + 2] = src[si + 2] / 255;
			raster.data[di + 3] = src[si + 3] / 255;
		}
	}
	return raster;
}

// Composites _src over _dst in place, honoring a blend mode and global opacity.
export function CompositeOver(_dst, _src, _blendMode = "normal", _opacity = 1) {
	const blend = GetBlendFunction(_blendMode);
	const d = _dst.data, s = _src.data;
	for (let i = 0; i < d.length; i += 4) {
		const as = s[i + 3] * _opacity;
		if (as <= 0) continue;
		const ab = d[i + 3];
		const ar = as + ab * (1 - as);
		if (ar <= 0) continue;
		for (let c = 0; c < 3; c++) {
			const cs = s[i + c];
			const cb = d[i + c];
			const mixed = (1 - ab) * cs + ab * blend(cb, cs);
			d[i + c] = (as * mixed + (1 - as) * ab * cb) / ar;
		}
		d[i + 3] = ar;
	}
}

export function ExtractAlpha(_raster) {
	const n = _raster.width * _raster.height;
	const alpha = new Float32Array(n);
	for (let i = 0; i < n; i++) alpha[i] = _raster.data[i * 4 + 3];
	return alpha;
}

// Approximated gaussian blur of a single-channel map via three box blur passes.
export function BlurMap(_map, _width, _height, _radius) {
	if (_radius <= 0) return Float32Array.from(_map);
	const boxRadius = Math.max(1, Math.round(_radius / 1.5));
	let src = Float32Array.from(_map);
	let dst = new Float32Array(_map.length);
	for (let pass = 0; pass < 3; pass++) {
		_BoxBlurHorizontal(src, dst, _width, _height, boxRadius);
		_BoxBlurVertical(dst, src, _width, _height, boxRadius);
	}
	return src;
}

function _BoxBlurHorizontal(_src, _dst, _width, _height, _radius) {
	const norm = 1 / (2 * _radius + 1);
	for (let y = 0; y < _height; y++) {
		const row = y * _width;
		let sum = 0;
		for (let x = -_radius; x <= _radius; x++) sum += _src[row + Math.min(_width - 1, Math.max(0, x))];
		for (let x = 0; x < _width; x++) {
			_dst[row + x] = sum * norm;
			const addX = Math.min(_width - 1, x + _radius + 1);
			const subX = Math.max(0, x - _radius);
			sum += _src[row + addX] - _src[row + subX];
		}
	}
}

function _BoxBlurVertical(_src, _dst, _width, _height, _radius) {
	const norm = 1 / (2 * _radius + 1);
	for (let x = 0; x < _width; x++) {
		let sum = 0;
		for (let y = -_radius; y <= _radius; y++) sum += _src[Math.min(_height - 1, Math.max(0, y)) * _width + x];
		for (let y = 0; y < _height; y++) {
			_dst[y * _width + x] = sum * norm;
			const addY = Math.min(_height - 1, y + _radius + 1);
			const subY = Math.max(0, y - _radius);
			sum += _src[addY * _width + x] - _src[subY * _width + x];
		}
	}
}

// Shifts a single-channel map by integer offsets, padding with zero.
export function OffsetMap(_map, _width, _height, _dx, _dy) {
	const out = new Float32Array(_map.length);
	for (let y = 0; y < _height; y++) {
		const sy = y - _dy;
		if (sy < 0 || sy >= _height) continue;
		for (let x = 0; x < _width; x++) {
			const sx = x - _dx;
			if (sx < 0 || sx >= _width) continue;
			out[y * _width + x] = _map[sy * _width + sx];
		}
	}
	return out;
}

// Approximate interior Euclidean distance to the nearest transparent pixel (in pixels).
export function InteriorDistanceMap(_alpha, _width, _height, _maxRadius) {
	const n = _width * _height;
	const dist = new Float32Array(n);
	const limit = _maxRadius + 1;
	for (let i = 0; i < n; i++) dist[i] = _alpha[i] > 0.001 ? limit : -1;
	for (let y = 0; y < _height; y++) {
		for (let x = 0; x < _width; x++) {
			const i = y * _width + x;
			if (dist[i] < 0) continue;
			let edge = false;
			for (let dy = -1; dy <= 1 && !edge; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const nx = x + dx, ny = y + dy;
					if (nx < 0 || ny < 0 || nx >= _width || ny >= _height || _alpha[ny * _width + nx] <= 0.001) {
						edge = true;
						break;
					}
				}
			}
			if (edge) dist[i] = 0;
		}
	}
	for (let pass = 0; pass < 2; pass++) {
		for (let y = 0; y < _height; y++) {
			for (let x = 0; x < _width; x++) {
				const i = y * _width + x;
				if (dist[i] < 0) continue;
				let best = dist[i];
				if (x > 0 && dist[i - 1] >= 0) best = Math.min(best, dist[i - 1] + 1);
				if (y > 0 && dist[i - _width] >= 0) best = Math.min(best, dist[i - _width] + 1);
				if (x > 0 && y > 0 && dist[i - _width - 1] >= 0) best = Math.min(best, dist[i - _width - 1] + 1.414);
				if (x < _width - 1 && y > 0 && dist[i - _width + 1] >= 0) best = Math.min(best, dist[i - _width + 1] + 1.414);
				dist[i] = best;
			}
		}
		for (let y = _height - 1; y >= 0; y--) {
			for (let x = _width - 1; x >= 0; x--) {
				const i = y * _width + x;
				if (dist[i] < 0) continue;
				let best = dist[i];
				if (x < _width - 1 && dist[i + 1] >= 0) best = Math.min(best, dist[i + 1] + 1);
				if (y < _height - 1 && dist[i + _width] >= 0) best = Math.min(best, dist[i + _width] + 1);
				if (x < _width - 1 && y < _height - 1 && dist[i + _width + 1] >= 0) best = Math.min(best, dist[i + _width + 1] + 1.414);
				if (x > 0 && y < _height - 1 && dist[i + _width - 1] >= 0) best = Math.min(best, dist[i + _width - 1] + 1.414);
				dist[i] = best;
			}
		}
	}
	for (let i = 0; i < n; i++) {
		if (dist[i] > _maxRadius) dist[i] = _maxRadius;
	}
	return dist;
}
export function RasterToBytes(_raster) {
	const out = Buffer.alloc(_raster.width * _raster.height * 4);
	for (let i = 0; i < _raster.data.length; i++) {
		out[i] = Math.round(Math.min(1, Math.max(0, _raster.data[i])) * 255);
	}
	return out;
}

// Applies a PS user layer mask to the document-sized raster of a pixel layer.
// White mask values reveal, black values conceal; areas outside the mask image
// use defaultColor (255 = reveal, 0 = conceal).
export function ApplyLayerMask(_raster, _layer) {
	const mask = _layer.mask;
	if (!mask || mask.disabled || !mask.imageData) return;
	const maskData = mask.imageData.data;
	const maskWidth = mask.imageData.width;
	const maskHeight = mask.imageData.height;
	const maskLeft = mask.left ?? 0;
	const maskTop = mask.top ?? 0;
	const layerLeft = _layer.left ?? 0;
	const layerTop = _layer.top ?? 0;
	const relative = !!mask.positionRelativeToLayer;
	const defaultMask = (mask.defaultColor ?? 0) / 255;
	const density = (mask.userMaskDensity ?? 255) / 255;
	const d = _raster.data;
	const { width, height } = _raster;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const di = (y * width + x) * 4 + 3;
			if (d[di] <= 0) continue;
			const mx = relative ? x - layerLeft : x - maskLeft;
			const my = relative ? y - layerTop : y - maskTop;
			let maskValue = defaultMask;
			if (mx >= 0 && my >= 0 && mx < maskWidth && my < maskHeight) {
				const mi = (my * maskWidth + mx) * 4;
				maskValue = maskData[mi] / 255;
			}
			// Density scales the mask toward white (fully visible).
			maskValue = maskValue * density + (1 - density);
			d[di] *= maskValue;
		}
	}
}
