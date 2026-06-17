// Photoshop-like image adjustments on µPS rasters, optionally masked (selection).

import { BlendMaskedRgb, VisitMaskedPixels } from "./Mask.mjs";

function _Clamp01(_value) {
	return Math.min(1, Math.max(0, _value));
}

function _RgbToHsl(_r, _g, _b) {
	const max = Math.max(_r, _g, _b);
	const min = Math.min(_r, _g, _b);
	const l = (max + min) * 0.5;
	if (max === min) return { h: 0, s: 0, l };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h;
	if (max === _r) h = ((_g - _b) / d + (_g < _b ? 6 : 0)) / 6;
	else if (max === _g) h = ((_b - _r) / d + 2) / 6;
	else h = ((_r - _g) / d + 4) / 6;
	return { h, s, l };
}

function _HueToRgb(_p, _q, _t) {
	let t = _t;
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return _p + (_q - _p) * 6 * t;
	if (t < 1 / 2) return _q;
	if (t < 2 / 3) return _p + (_q - _p) * (2 / 3 - t) * 6;
	return _p;
}

function _HslToRgb(_h, _s, _l) {
	if (_s <= 0) return { r: _l, g: _l, b: _l };
	const q = _l < 0.5 ? _l * (1 + _s) : _l + _s - _l * _s;
	const p = 2 * _l - q;
	return {
		r: _HueToRgb(p, q, _h + 1 / 3),
		g: _HueToRgb(p, q, _h),
		b: _HueToRgb(p, q, _h - 1 / 3)
	};
}

/**
 * Exposure-style gamma (PS *Image → Adjustments → Exposure*, exposure/offset optional).
 * The `_gamma` argument is the PS slider value `gammaCorrection`; the applied exponent is
 * `1 / _gamma` (e.g. slider 0.7 → `out = in^(1/0.7)`), matching `oxyd.jsx` `GammCorrection`.
 *
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {number} _gamma Gamma correction value (PS range ~0.01..9.99, 1 = no change).
 * @param {{ mask?: import("./Mask.mjs").RectMask | import("./Mask.mjs").RectMask[] | Float32Array | Uint8Array, exposure?: number, offset?: number }} [_options]
 */
export function ApplyGamma(_raster, _gamma, _options = {}) {
	if (_gamma === 1 && !_options.exposure && !_options.offset) return;
	const exposure = _options.exposure ?? 0;
	const offset = _options.offset ?? 0;
	const gamma = Math.max(_gamma, 0.01);
	const exponent = 1 / gamma;
	const exposureScale = Math.pow(2, exposure);

	VisitMaskedPixels(_raster, _options.mask, (i, weight) => {
		const d = _raster.data;
		let r = d[i];
		let g = d[i + 1];
		let b = d[i + 2];
		r = _Clamp01(Math.pow(_Clamp01(r * exposureScale + offset), exponent));
		g = _Clamp01(Math.pow(_Clamp01(g * exposureScale + offset), exponent));
		b = _Clamp01(Math.pow(_Clamp01(b * exposureScale + offset), exponent));
		BlendMaskedRgb(d, i, weight, r, g, b);
	});
}

/**
 * Brightness/contrast (PS *Image → Adjustments → Brightness/Contrast*).
 *
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {{ brightness?: number, contrast?: number, useLegacy?: boolean }} _params
 *   brightness/contrast: -100..100 (0 = no change) in modern mode.
 * @param {{ mask?: import("./Mask.mjs").RectMask | import("./Mask.mjs").RectMask[] | Float32Array | Uint8Array }} [_options]
 */
export function ApplyBrightnessContrast(_raster, _params, _options = {}) {
	const brightness = _params.brightness ?? 0;
	const contrast = _params.contrast ?? 0;
	if (brightness === 0 && contrast === 0) return;

	if (_params.useLegacy) {
		const slope = (100 + contrast) / 100;
		const intercept = brightness / 100;
		VisitMaskedPixels(_raster, _options.mask, (i, weight) => {
			const d = _raster.data;
			const r = _Clamp01(d[i] * slope + intercept);
			const g = _Clamp01(d[i + 1] * slope + intercept);
			const b = _Clamp01(d[i + 2] * slope + intercept);
			BlendMaskedRgb(d, i, weight, r, g, b);
		});
		return;
	}

	const factor = (100 + contrast) / 100;
	const add = brightness / 100;
	VisitMaskedPixels(_raster, _options.mask, (i, weight) => {
		const d = _raster.data;
		const r = _Clamp01((d[i] - 0.5) * factor + 0.5 + add);
		const g = _Clamp01((d[i + 1] - 0.5) * factor + 0.5 + add);
		const b = _Clamp01((d[i + 2] - 0.5) * factor + 0.5 + add);
		BlendMaskedRgb(d, i, weight, r, g, b);
	});
}

/**
 * Hue/saturation/lightness (PS *Image → Adjustments → Hue/Saturation*, Master channel).
 *
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {{ hue?: number, saturation?: number, lightness?: number }} _params
 *   hue: -180..180 degrees; saturation/lightness: -100..100.
 * @param {{ mask?: import("./Mask.mjs").RectMask | import("./Mask.mjs").RectMask[] | Float32Array | Uint8Array }} [_options]
 */
export function ApplyHueSaturation(_raster, _params, _options = {}) {
	const hueShift = (_params.hue ?? 0) / 360;
	const satScale = 1 + (_params.saturation ?? 0) / 100;
	const lightAdd = (_params.lightness ?? 0) / 100;
	if (hueShift === 0 && satScale === 1 && lightAdd === 0) return;

	VisitMaskedPixels(_raster, _options.mask, (i, weight) => {
		const d = _raster.data;
		const hsl = _RgbToHsl(d[i], d[i + 1], d[i + 2]);
		hsl.h = (hsl.h + hueShift + 1) % 1;
		hsl.s = _Clamp01(hsl.s * satScale);
		hsl.l = _Clamp01(hsl.l + lightAdd);
		const rgb = _HslToRgb(hsl.h, hsl.s, hsl.l);
		BlendMaskedRgb(d, i, weight, rgb.r, rgb.g, rgb.b);
	});
}

/**
 * Runs multiple adjustments in order (simulates a stack of adjustment layers).
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {Array<{ type: "gamma", gamma: number, exposure?: number, offset?: number }
 *   | { type: "brightnessContrast", brightness?: number, contrast?: number, useLegacy?: boolean }
 *   | { type: "hueSaturation", hue?: number, saturation?: number, lightness?: number }>} _steps
 * @param {{ mask?: import("./Mask.mjs").RectMask | import("./Mask.mjs").RectMask[] | Float32Array | Uint8Array }} [_options]
 */
export function ApplyAdjustmentStack(_raster, _steps, _options = {}) {
	for (const step of _steps) {
		switch (step.type) {
			case "gamma":
				ApplyGamma(_raster, step.gamma, { ..._options, exposure: step.exposure, offset: step.offset });
				break;
			case "brightnessContrast":
				ApplyBrightnessContrast(_raster, step, _options);
				break;
			case "hueSaturation":
				ApplyHueSaturation(_raster, step, _options);
				break;
			default:
				throw new Error(`ApplyAdjustmentStack: unknown step type`);
		}
	}
}
