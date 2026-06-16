// Per-channel blend functions, modeled after the standard separable blend modes
// used by PS-like applications and the W3C compositing specification.
// All values are normalized floats in the range [0..1].
// _b = backdrop channel, _s = source channel.

function _Normal(_b, _s) { return _s; }
function _Multiply(_b, _s) { return _b * _s; }
function _Screen(_b, _s) { return _b + _s - _b * _s; }
function _Overlay(_b, _s) { return _HardLight(_s, _b); }
function _Darken(_b, _s) { return Math.min(_b, _s); }
function _Lighten(_b, _s) { return Math.max(_b, _s); }

function _ColorBurn(_b, _s) {
	if (_b >= 1) return 1;
	if (_s <= 0) return 0;
	return 1 - Math.min(1, (1 - _b) / _s);
}

function _ColorDodge(_b, _s) {
	if (_b <= 0) return 0;
	if (_s >= 1) return 1;
	return Math.min(1, _b / (1 - _s));
}

function _LinearBurn(_b, _s) { return Math.max(0, _b + _s - 1); }
function _LinearDodge(_b, _s) { return Math.min(1, _b + _s); }

function _HardLight(_b, _s) {
	if (_s <= 0.5) return _Multiply(_b, 2 * _s);
	return _Screen(_b, 2 * _s - 1);
}

function _SoftLight(_b, _s) {
	if (_s <= 0.5) return _b - (1 - 2 * _s) * _b * (1 - _b);
	const d = (_b <= 0.25) ? ((16 * _b - 12) * _b + 4) * _b : Math.sqrt(_b);
	return _b + (2 * _s - 1) * (d - _b);
}

function _Difference(_b, _s) { return Math.abs(_b - _s); }
function _Exclusion(_b, _s) { return _b + _s - 2 * _b * _s; }

// Keys match the blend mode names reported by ag-psd.
const BLEND_FUNCTIONS = {
	"normal": _Normal,
	"multiply": _Multiply,
	"screen": _Screen,
	"overlay": _Overlay,
	"darken": _Darken,
	"lighten": _Lighten,
	"color burn": _ColorBurn,
	"color dodge": _ColorDodge,
	"linear burn": _LinearBurn,
	"linear dodge": _LinearDodge,
	"hard light": _HardLight,
	"soft light": _SoftLight,
	"difference": _Difference,
	"exclusion": _Exclusion
};

export function GetBlendFunction(_name) {
	return BLEND_FUNCTIONS[_name] ?? _Normal;
}
