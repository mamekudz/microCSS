// Approximated layer effect rendering ("Fülloptionen"), aligned with the
// behavior of PS-like layer styles. The goal is a close visual match, not a
// bit-exact reproduction.

import { GetBlendFunction } from "./BlendModes.mjs";
import { CreateRaster, ExtractAlpha, BlurMap, OffsetMap, InteriorDistanceMap } from "./Raster.mjs";

function _AsArray(_value) {
	if (!_value) return [];
	return Array.isArray(_value) ? _value : [_value];
}

function _EffectColor(_color) {
	return [(_color?.r ?? 0) / 255, (_color?.g ?? 0) / 255, (_color?.b ?? 0) / 255];
}

function _PixelValue(_size) {
	if (typeof _size === "number") return _size;
	return _size?.value ?? 0;
}

// Percent-like values (choke, range) are reported as 0..100 by ag-psd.
function _PercentValue(_value) {
	const v = _PixelValue(_value);
	return Math.min(1, Math.max(0, v / 100));
}

// Applies the glow range and contour curve to a blurred mask. A range below 1
// compresses the falloff, making the glow denser near the edge (PS default 50%).
function _ApplyRangeContour(_mask, _range, _contour) {
	const range = Math.min(1, Math.max(0.05, _range ?? 0.5));
	const out = new Float32Array(_mask.length);
	for (let i = 0; i < _mask.length; i++) {
		if (_mask[i] <= 0) continue;
		out[i] = _SampleContour(_contour, Math.min(1, _mask[i] / range));
	}
	return out;
}

// Applies a chokes/spread contraction to a blurred mask.
function _ApplyChoke(_mask, _choke) {
	if (_choke <= 0) return _mask;
	const out = new Float32Array(_mask.length);
	const scale = 1 / Math.max(0.0001, 1 - _choke);
	for (let i = 0; i < _mask.length; i++) {
		out[i] = Math.min(1, Math.max(0, (_mask[i] - _choke) * scale + _choke));
	}
	return out;
}

// Blends a colored, masked effect onto the layer pixels (interior effects only).
function _BlendInterior(_raster, _mask, _color, _blendMode, _opacity) {
	const blend = GetBlendFunction(_blendMode);
	const d = _raster.data;
	const n = _raster.width * _raster.height;
	for (let i = 0; i < n; i++) {
		const a = d[i * 4 + 3];
		if (a <= 0) continue;
		const strength = _mask[i] * _opacity;
		if (strength <= 0) continue;
		for (let c = 0; c < 3; c++) {
			const cb = d[i * 4 + c];
			d[i * 4 + c] = cb + (blend(cb, _color[c]) - cb) * strength;
		}
	}
}

function _AlphaBounds(_alpha, _width, _height) {
	let minX = _width, minY = _height, maxX = -1, maxY = -1;
	for (let y = 0; y < _height; y++) {
		for (let x = 0; x < _width; x++) {
			if (_alpha[y * _width + x] > 0.001) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}
	}
	if (maxX < 0) return null;
	return { minX, minY, maxX, maxY };
}

function _SampleGradient(_gradient, _t, _reverse) {
	let t = Math.min(1, Math.max(0, _t));
	if (_reverse) t = 1 - t;
	const stops = _gradient.colorStops ?? [];
	if (stops.length === 0) return [0, 0, 0];
	if (t <= stops[0].location) return _EffectColor(stops[0].color);
	for (let i = 0; i < stops.length - 1; i++) {
		const a = stops[i], b = stops[i + 1];
		if (t >= a.location && t <= b.location) {
			const span = Math.max(0.0001, b.location - a.location);
			const f = (t - a.location) / span;
			const ca = _EffectColor(a.color), cb = _EffectColor(b.color);
			return [ca[0] + (cb[0] - ca[0]) * f, ca[1] + (cb[1] - ca[1]) * f, ca[2] + (cb[2] - ca[2]) * f];
		}
	}
	return _EffectColor(stops[stops.length - 1].color);
}

function _ApplySolidFill(_raster, _effect) {
	const n = _raster.width * _raster.height;
	const mask = new Float32Array(n).fill(1);
	_BlendInterior(_raster, mask, _EffectColor(_effect.color), _effect.blendMode ?? "normal", _effect.opacity ?? 1);
}

function _ApplyGradientOverlay(_raster, _effect, _alpha) {
	const { width, height } = _raster;
	const bounds = _AlphaBounds(_alpha, width, height);
	if (!bounds) return;
	const angleRad = ((_effect.angle ?? 90) * Math.PI) / 180;
	// Screen coordinates: y grows downwards, so the y component is negated.
	const dirX = Math.cos(angleRad);
	const dirY = -Math.sin(angleRad);
	// Project the alpha bounding box corners onto the gradient direction.
	const corners = [
		[bounds.minX, bounds.minY], [bounds.maxX, bounds.minY],
		[bounds.minX, bounds.maxY], [bounds.maxX, bounds.maxY]
	];
	let minP = Infinity, maxP = -Infinity;
	for (const [cx, cy] of corners) {
		const p = cx * dirX + cy * dirY;
		if (p < minP) minP = p;
		if (p > maxP) maxP = p;
	}
	const span = Math.max(0.0001, maxP - minP);
	const blend = GetBlendFunction(_effect.blendMode ?? "normal");
	const opacity = _effect.opacity ?? 1;
	const d = _raster.data;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * width + x;
			if (_alpha[i] <= 0) continue;
			const t = (x * dirX + y * dirY - minP) / span;
			const color = _SampleGradient(_effect.gradient, t, _effect.reverse);
			for (let c = 0; c < 3; c++) {
				const cb = d[i * 4 + c];
				d[i * 4 + c] = cb + (blend(cb, color[c]) - cb) * opacity;
			}
		}
	}
}

function _ApplyInnerShadow(_raster, _effect, _alpha) {
	const { width, height } = _raster;
	const size = _PixelValue(_effect.size);
	const distance = _PixelValue(_effect.distance);
	const angleRad = ((_effect.angle ?? 120) * Math.PI) / 180;
	const dx = Math.round(-Math.cos(angleRad) * distance);
	const dy = Math.round(Math.sin(angleRad) * distance);
	// Shadow of the inverted alpha, shifted into the shape.
	const inverted = new Float32Array(_alpha.length);
	for (let i = 0; i < inverted.length; i++) inverted[i] = 1 - _alpha[i];
	let mask = OffsetMap(inverted, width, height, dx, dy);
	mask = _ApplyChoke(BlurMap(mask, width, height, size), _PercentValue(_effect.choke));
	_BlendInterior(_raster, mask, _EffectColor(_effect.color), _effect.blendMode ?? "multiply", _effect.opacity ?? 1);
}

function _ApplyInnerGlow(_raster, _effect, _alpha) {
	const { width, height } = _raster;
	const size = _PixelValue(_effect.size);
	const inverted = new Float32Array(_alpha.length);
	for (let i = 0; i < inverted.length; i++) inverted[i] = 1 - _alpha[i];
	let mask = _ApplyChoke(BlurMap(inverted, width, height, size), _PercentValue(_effect.choke));
	mask = _ApplyRangeContour(mask, _effect.range, _effect.contour);
	_BlendInterior(_raster, mask, _EffectColor(_effect.color), _effect.blendMode ?? "screen", _effect.opacity ?? 1);
}

function _SampleContour(_contour, _t) {
	const curve = _contour?.curve ?? [{ x: 0, y: 0 }, { x: 255, y: 255 }];
	let pos = Math.min(1, Math.max(0, _t)) * 255;
	if (pos <= curve[0].x) return curve[0].y / 255;
	for (let i = 0; i < curve.length - 1; i++) {
		const a = curve[i], b = curve[i + 1];
		if (pos >= a.x && pos <= b.x) {
			const span = Math.max(1, b.x - a.x);
			return (a.y + ((b.y - a.y) * (pos - a.x)) / span) / 255;
		}
	}
	return curve[curve.length - 1].y / 255;
}

function _LightVector(_angle, _altitude) {
	const alt = ((_altitude ?? 30) * Math.PI) / 180;
	const ang = ((_angle ?? 120) * Math.PI) / 180;
	return {
		x: Math.cos(ang) * Math.cos(alt),
		y: -Math.sin(ang) * Math.cos(alt),
		z: Math.sin(alt)
	};
}

function _PillowStyle(_style) {
	const s = (_style ?? "inner bevel").toLowerCase();
	return s === "pillow emboss" || s === "emboss";
}

function _BuildBevelHeightMap(_alpha, _width, _height, _effect) {
	const soften = _PixelValue(_effect.soften);
	const style = (_effect.style ?? "inner bevel").toLowerCase();
	const sizePx = _PixelValue(_effect.size);
	// Pillow/emboss can use sub-pixel sizes from PSD; inner/outer bevel keeps a 1px floor.
	const size = _PillowStyle(style) ? Math.max(0.25, sizePx) : Math.max(1, sizePx);
	const depth = Math.max(0.05, _effect.strength ?? 1);
	const radius = _PillowStyle(style)
		? Math.max(0.5, size + soften)
		: Math.max(1, size + soften);
	const n = _alpha.length;
	const height = new Float32Array(n);
	if (_PillowStyle(style)) {
		const dome = BlurMap(_alpha, _width, _height, radius);
		for (let i = 0; i < n; i++) height[i] = dome[i] * depth;
	} else if (style === "outer bevel") {
		const inverted = new Float32Array(n);
		for (let i = 0; i < n; i++) inverted[i] = 1 - _alpha[i];
		const dist = InteriorDistanceMap(inverted, _width, _height, radius);
		for (let i = 0; i < n; i++) {
			if (dist[i] < 0) continue;
			height[i] = (1 - Math.min(1, dist[i] / radius)) * depth;
		}
	} else {
		const dist = InteriorDistanceMap(_alpha, _width, _height, radius);
		for (let i = 0; i < n; i++) {
			if (dist[i] < 0) continue;
			height[i] = (1 - Math.min(1, dist[i] / radius)) * depth;
		}
	}
	if ((_effect.technique ?? "smooth") !== "chisel hard") {
		const blurred = BlurMap(height, _width, _height, Math.max(0.5, soften * 0.5));
		for (let i = 0; i < n; i++) height[i] = blurred[i];
	}
	return height;
}

function _ApplyBevel(_raster, _effect, _alpha) {
	const { width, height: docHeight } = _raster;
	if (_PixelValue(_effect.size) <= 0 && (_effect.strength ?? 0) <= 0) return;
	const heightMap = _BuildBevelHeightMap(_alpha, width, docHeight, _effect);
	const light = _LightVector(_effect.angle, _effect.altitude);
	const highlightMask = new Float32Array(_alpha.length);
	const shadowMask = new Float32Array(_alpha.length);
	for (let y = 0; y < docHeight; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * width + x;
			if (_alpha[i] <= 0 || heightMap[i] <= 0) continue;
			const xm = Math.max(0, x - 1), xp = Math.min(width - 1, x + 1);
			const ym = Math.max(0, y - 1), yp = Math.min(docHeight - 1, y + 1);
			const gx = (heightMap[y * width + xp] - heightMap[y * width + xm]) * 0.5;
			const gy = (heightMap[yp * width + x] - heightMap[ym * width + x]) * 0.5;
			const len = Math.hypot(gx, gy, 1);
			const nx = -gx / len, ny = -gy / len, nz = 1 / len;
			// Shade relative to a flat surface so plateaus stay untouched and
			// only the sloped bevel band receives highlight/shadow.
			const shade = (nx * light.x + ny * light.y + (nz - 1) * light.z) * 4;
			const contour = _SampleContour(_effect.contour, heightMap[i] / Math.max(0.0001, _effect.strength ?? 1));
			if (shade > 0) highlightMask[i] = Math.min(1, shade * contour);
			else shadowMask[i] = Math.min(1, -shade * contour);
		}
	}
	const direction = _effect.direction ?? "up";
	const highlight = (direction === "up") ? highlightMask : shadowMask;
	const shadow = (direction === "up") ? shadowMask : highlightMask;
	_BlendInterior(_raster, highlight, _EffectColor(_effect.highlightColor),
		_effect.highlightBlendMode ?? "screen", _effect.highlightOpacity ?? 0.75);
	_BlendInterior(_raster, shadow, _EffectColor(_effect.shadowColor),
		_effect.shadowBlendMode ?? "multiply", _effect.shadowOpacity ?? 0.75);
}

function _BuildShadowRaster(_alpha, _width, _height, _color, _maskBuilder) {
	const mask = _maskBuilder();
	const raster = CreateRaster(_width, _height);
	const d = raster.data;
	for (let i = 0; i < mask.length; i++) {
		if (mask[i] <= 0) continue;
		d[i * 4] = _color[0];
		d[i * 4 + 1] = _color[1];
		d[i * 4 + 2] = _color[2];
		d[i * 4 + 3] = mask[i];
	}
	return raster;
}

function _StrokeColor(_effect) {
	if (_effect.fillType === "gradient" && _effect.gradient?.colorStops?.length) {
		return _EffectColor(_effect.gradient.colorStops[0].color);
	}
	return _EffectColor(_effect.color);
}

// Splits a stroke into interior and exterior masks (inside / outside / center).
function _StrokeMasks(_alpha, _width, _height, _size, _position) {
	const size = Math.max(0.5, _PixelValue(_size));
	const pos = (_position ?? "outside").toLowerCase();
	const interior = new Float32Array(_alpha.length);
	const exterior = new Float32Array(_alpha.length);
	const maxR = Math.ceil(size) + 2;
	const insideDist = InteriorDistanceMap(_alpha, _width, _height, maxR);
	const inverted = new Float32Array(_alpha.length);
	for (let i = 0; i < _alpha.length; i++) inverted[i] = _alpha[i] > 0.001 ? 0 : 1;
	const outsideDist = InteriorDistanceMap(inverted, _width, _height, maxR);
	if (pos === "inside") {
		for (let i = 0; i < _alpha.length; i++) {
			if (_alpha[i] > 0.001 && insideDist[i] < size) interior[i] = 1;
		}
	} else if (pos === "outside") {
		for (let i = 0; i < _alpha.length; i++) {
			if (_alpha[i] <= 0.001 && outsideDist[i] >= 0 && outsideDist[i] < size) exterior[i] = 1;
		}
	} else {
		const half = size / 2;
		for (let i = 0; i < _alpha.length; i++) {
			if (_alpha[i] > 0.001 && insideDist[i] < half) interior[i] = 1;
			if (_alpha[i] <= 0.001 && outsideDist[i] >= 0 && outsideDist[i] < half) exterior[i] = 1;
		}
	}
	return { interior, exterior };
}

function _ApplyStrokeInterior(_raster, _effect, _alpha) {
	if (_effect.fillType === "pattern") return;
	const { width, height } = _raster;
	const { interior } = _StrokeMasks(_alpha, width, height, _effect.size, _effect.position);
	_BlendInterior(_raster, interior, _StrokeColor(_effect), _effect.blendMode ?? "normal", _effect.opacity ?? 1);
}

function _BuildExteriorStroke(_alpha, _width, _height, _effect) {
	if (_effect.fillType === "pattern") return null;
	const { exterior } = _StrokeMasks(_alpha, _width, _height, _effect.size, _effect.position);
	return _BuildShadowRaster(_alpha, _width, _height, _StrokeColor(_effect), () => exterior);
}

function _ApplySatin(_raster, _effect, _alpha) {
	const { width, height } = _raster;
	const distance = _PixelValue(_effect.distance);
	const size = _PixelValue(_effect.size);
	const angleRad = ((_effect.angle ?? 19) * Math.PI) / 180;
	const dx1 = Math.round(-Math.cos(angleRad) * distance);
	const dy1 = Math.round(Math.sin(angleRad) * distance);
	const dx2 = Math.round(Math.cos(angleRad) * distance);
	const dy2 = Math.round(-Math.sin(angleRad) * distance);
	const offsetA = OffsetMap(_alpha, width, height, dx1, dy1);
	const offsetB = OffsetMap(_alpha, width, height, dx2, dy2);
	const n = _alpha.length;
	let mask = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		if (_alpha[i] <= 0) continue;
		mask[i] = Math.min(1, Math.abs(offsetA[i] - offsetB[i]));
	}
	mask = BlurMap(mask, width, height, Math.max(0.5, size));
	if (_effect.invert) {
		for (let i = 0; i < n; i++) {
			if (_alpha[i] > 0) mask[i] = 1 - mask[i];
		}
	}
	for (let i = 0; i < n; i++) {
		if (_alpha[i] <= 0) mask[i] = 0;
		else mask[i] = _SampleContour(_effect.contour, mask[i]);
	}
	_BlendInterior(_raster, mask, _EffectColor(_effect.color), _effect.blendMode ?? "multiply", _effect.opacity ?? 0.5);
}

// Applies all enabled interior effects directly onto the layer raster.
export function ApplyInteriorEffects(_raster, _effects) {
	if (!_effects || _effects.disabled) return;
	const alpha = ExtractAlpha(_raster);
	// Match PS layer-style order: bevel shapes the surface before overlays and inner shadows.
	for (const fx of _AsArray(_effects.bevel)) {
		if (fx.enabled) _ApplyBevel(_raster, fx, alpha);
	}
	for (const fx of _AsArray(_effects.innerShadow)) {
		if (fx.enabled) _ApplyInnerShadow(_raster, fx, alpha);
	}
	for (const fx of _AsArray(_effects.innerGlow)) {
		if (fx.enabled) _ApplyInnerGlow(_raster, fx, alpha);
	}
	for (const fx of _AsArray(_effects.satin)) {
		if (fx.enabled) _ApplySatin(_raster, fx, alpha);
	}
	for (const fx of _AsArray(_effects.solidFill)) {
		if (fx.enabled) _ApplySolidFill(_raster, fx);
	}
	for (const fx of _AsArray(_effects.gradientOverlay)) {
		if (fx.enabled) _ApplyGradientOverlay(_raster, fx, alpha);
	}
	for (const fx of _AsArray(_effects.stroke)) {
		if (fx.enabled) _ApplyStrokeInterior(_raster, fx, alpha);
	}
}

// Builds the effect rasters that are composited beneath the layer
// (drop shadow and outer glow). Returns [{ raster, blendMode, opacity }].
export function BuildExteriorEffects(_raster, _effects) {
	if (!_effects || _effects.disabled) return [];
	const { width, height } = _raster;
	const alpha = ExtractAlpha(_raster);
	const result = [];
	for (const fx of _AsArray(_effects.dropShadow)) {
		if (!fx.enabled) continue;
		const size = _PixelValue(fx.size);
		const distance = _PixelValue(fx.distance);
		const angleRad = ((fx.angle ?? 120) * Math.PI) / 180;
		const dx = Math.round(-Math.cos(angleRad) * distance);
		const dy = Math.round(Math.sin(angleRad) * distance);
		const raster = _BuildShadowRaster(alpha, width, height, _EffectColor(fx.color), () => {
			const shifted = OffsetMap(alpha, width, height, dx, dy);
			return _ApplyChoke(BlurMap(shifted, width, height, size), _PercentValue(fx.choke));
		});
		result.push({ raster, blendMode: fx.blendMode ?? "multiply", opacity: fx.opacity ?? 1 });
	}
	for (const fx of _AsArray(_effects.outerGlow)) {
		if (!fx.enabled) continue;
		const size = _PixelValue(fx.size);
		const raster = _BuildShadowRaster(alpha, width, height, _EffectColor(fx.color), () => {
			let mask = _ApplyChoke(BlurMap(alpha, width, height, size), _PercentValue(fx.choke));
			mask = _ApplyRangeContour(mask, fx.range, fx.contour);
			// The glow is only visible outside the shape.
			for (let i = 0; i < mask.length; i++) mask[i] *= (1 - alpha[i]);
			return mask;
		});
		result.push({ raster, blendMode: fx.blendMode ?? "screen", opacity: fx.opacity ?? 1 });
	}
	for (const fx of _AsArray(_effects.stroke)) {
		if (!fx.enabled) continue;
		const raster = _BuildExteriorStroke(alpha, width, height, fx);
		if (!raster) continue;
		result.push({ raster, blendMode: fx.blendMode ?? "normal", opacity: fx.opacity ?? 1 });
	}
	return result;
}
