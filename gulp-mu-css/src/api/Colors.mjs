// Color helper functions ported from the legacy µCSS.jsx. The "hsl" model of
// Lighten is bit-exact to the old implementation (verified against compiled
// outputs of the old toolchain); "oklch" is the perceptually uniform
// alternative for new skins (see docs/CONCEPT.md, section 9.2).
//
// Internal color representation: unsigned 32 bit integer 0xAARRGGBB.

// Standard CSS color keywords (CSS Color Module level 4 list).
const COLOR_NAMES = {
	transparent: 0x00000000,
	aliceblue: 0xFFF0F8FF, antiquewhite: 0xFFFAEBD7, aqua: 0xFF00FFFF, aquamarine: 0xFF7FFFD4,
	azure: 0xFFF0FFFF, beige: 0xFFF5F5DC, bisque: 0xFFFFE4C4, black: 0xFF000000,
	blanchedalmond: 0xFFFFEBCD, blue: 0xFF0000FF, blueviolet: 0xFF8A2BE2, brown: 0xFFA52A2A,
	burlywood: 0xFFDEB887, cadetblue: 0xFF5F9EA0, chartreuse: 0xFF7FFF00, chocolate: 0xFFD2691E,
	coral: 0xFFFF7F50, cornflowerblue: 0xFF6495ED, cornsilk: 0xFFFFF8DC, crimson: 0xFFDC143C,
	cyan: 0xFF00FFFF, darkblue: 0xFF00008B, darkcyan: 0xFF008B8B, darkgoldenrod: 0xFFB8860B,
	darkgray: 0xFFA9A9A9, darkgreen: 0xFF006400, darkgrey: 0xFFA9A9A9, darkkhaki: 0xFFBDB76B,
	darkmagenta: 0xFF8B008B, darkolivegreen: 0xFF556B2F, darkorange: 0xFFFF8C00, darkorchid: 0xFF9932CC,
	darkred: 0xFF8B0000, darksalmon: 0xFFE9967A, darkseagreen: 0xFF8FBC8F, darkslateblue: 0xFF483D8B,
	darkslategray: 0xFF2F4F4F, darkslategrey: 0xFF2F4F4F, darkturquoise: 0xFF00CED1, darkviolet: 0xFF9400D3,
	deeppink: 0xFFFF1493, deepskyblue: 0xFF00BFFF, dimgray: 0xFF696969, dimgrey: 0xFF696969,
	dodgerblue: 0xFF1E90FF, firebrick: 0xFFB22222, floralwhite: 0xFFFFFAF0, forestgreen: 0xFF228B22,
	fuchsia: 0xFFFF00FF, gainsboro: 0xFFDCDCDC, ghostwhite: 0xFFF8F8FF, gold: 0xFFFFD700,
	goldenrod: 0xFFDAA520, gray: 0xFF808080, green: 0xFF008000, greenyellow: 0xFFADFF2F,
	grey: 0xFF808080, honeydew: 0xFFF0FFF0, hotpink: 0xFFFF69B4, indianred: 0xFFCD5C5C,
	indigo: 0xFF4B0082, ivory: 0xFFFFFFF0, khaki: 0xFFF0E68C, lavender: 0xFFE6E6FA,
	lavenderblush: 0xFFFFF0F5, lawngreen: 0xFF7CFC00, lemonchiffon: 0xFFFFFACD, lightblue: 0xFFADD8E6,
	lightcoral: 0xFFF08080, lightcyan: 0xFFE0FFFF, lightgoldenrodyellow: 0xFFFAFAD2, lightgray: 0xFFD3D3D3,
	lightgreen: 0xFF90EE90, lightgrey: 0xFFD3D3D3, lightpink: 0xFFFFB6C1, lightsalmon: 0xFFFFA07A,
	lightseagreen: 0xFF20B2AA, lightskyblue: 0xFF87CEFA, lightslategray: 0xFF778899, lightslategrey: 0xFF778899,
	lightsteelblue: 0xFFB0C4DE, lightyellow: 0xFFFFFFE0, lime: 0xFF00FF00, limegreen: 0xFF32CD32,
	linen: 0xFFFAF0E6, magenta: 0xFFFF00FF, maroon: 0xFF800000, mediumaquamarine: 0xFF66CDAA,
	mediumblue: 0xFF0000CD, mediumorchid: 0xFFBA55D3, mediumpurple: 0xFF9370DB, mediumseagreen: 0xFF3CB371,
	mediumslateblue: 0xFF7B68EE, mediumspringgreen: 0xFF00FA9A, mediumturquoise: 0xFF48D1CC, mediumvioletred: 0xFFC71585,
	midnightblue: 0xFF191970, mintcream: 0xFFF5FFFA, mistyrose: 0xFFFFE4E1, moccasin: 0xFFFFE4B5,
	navajowhite: 0xFFFFDEAD, navy: 0xFF000080, oldlace: 0xFFFDF5E6, olive: 0xFF808000,
	olivedrab: 0xFF6B8E23, orange: 0xFFFFA500, orangered: 0xFFFF4500, orchid: 0xFFDA70D6,
	palegoldenrod: 0xFFEEE8AA, palegreen: 0xFF98FB98, paleturquoise: 0xFFAFEEEE, palevioletred: 0xFFDB7093,
	papayawhip: 0xFFFFEFD5, peachpuff: 0xFFFFDAB9, peru: 0xFFCD853F, pink: 0xFFFFC0CB,
	plum: 0xFFDDA0DD, powderblue: 0xFFB0E0E6, purple: 0xFF800080, rebeccapurple: 0xFF663399,
	red: 0xFFFF0000, rosybrown: 0xFFBC8F8F, royalblue: 0xFF4169E1, saddlebrown: 0xFF8B4513,
	salmon: 0xFFFA8072, sandybrown: 0xFFF4A460, seagreen: 0xFF2E8B57, seashell: 0xFFFFF5EE,
	sienna: 0xFFA0522D, silver: 0xFFC0C0C0, skyblue: 0xFF87CEEB, slateblue: 0xFF6A5ACD,
	slategray: 0xFF708090, slategrey: 0xFF708090, snow: 0xFFFFFAFA, springgreen: 0xFF00FF7F,
	steelblue: 0xFF4682B4, tan: 0xFFD2B48C, teal: 0xFF008080, thistle: 0xFFD8BFD8,
	tomato: 0xFFFF6347, turquoise: 0xFF40E0D0, violet: 0xFFEE82EE, wheat: 0xFFF5DEB3,
	white: 0xFFFFFFFF, whitesmoke: 0xFFF5F5F5, yellow: 0xFFFFFF00, yellowgreen: 0xFF9ACD32
};

function _Clamp255(_v) {
	return _v < 0 ? 0 : (_v > 255 ? 255 : _v);
}

function _ChannelValue(_v) {
	const text = _v.trim();
	if (text.includes("%")) return Math.floor((parseFloat(text) * 255) / 100);
	return parseInt(text, 10);
}

// Parses a CSS color (name, #rgb, #rrggbb, #rrggbbaa, rgb(), rgba()) into the
// internal 0xAARRGGBB representation. Numbers pass through unchanged.
export function ParseColor(_color) {
	if (typeof _color !== "string") return _color >>> 0;
	const c = _color.trim().toLowerCase();
	if (c in COLOR_NAMES) return COLOR_NAMES[c] >>> 0;

	let r = 0, g = 0, b = 0, a = 0xFF;
	if (c.startsWith("#")) {
		const hex = c.slice(1);
		if (hex.length >= 8) {
			r = parseInt(hex.slice(0, 2), 16);
			g = parseInt(hex.slice(2, 4), 16);
			b = parseInt(hex.slice(4, 6), 16);
			a = parseInt(hex.slice(6, 8), 16);
		} else if (hex.length >= 6) {
			r = parseInt(hex.slice(0, 2), 16);
			g = parseInt(hex.slice(2, 4), 16);
			b = parseInt(hex.slice(4, 6), 16);
		} else {
			r = parseInt(hex[0] + hex[0], 16);
			g = parseInt(hex[1] + hex[1], 16);
			b = parseInt(hex[2] + hex[2], 16);
		}
	} else if (c.startsWith("rgb")) {
		const inner = c.slice(c.indexOf("(") + 1, c.lastIndexOf(")"));
		const parts = inner.split(",");
		if (parts.length >= 3) {
			r = _ChannelValue(parts[0]);
			g = _ChannelValue(parts[1]);
			b = _ChannelValue(parts[2]);
			a = parts.length >= 4 ? Math.floor(parseFloat(parts[3]) * 255) : 0xFF;
		}
	} else {
		throw new Error(`ParseColor: unsupported color "${_color}"`);
	}
	return (((_Clamp255(a) & 0xFF) << 24) | ((_Clamp255(r) & 0xFF) << 16) | ((_Clamp255(g) & 0xFF) << 8) | (_Clamp255(b) & 0xFF)) >>> 0;
}

function _Hex2(_v) {
	return _v.toString(16).padStart(2, "0");
}

// Serializes the internal representation back to CSS. Opaque colors become
// #rrggbb, others rgba(r,g,b,a) with the legacy 3-decimal alpha.
export function FormatColor(_c, _alphaDecimals = 3) {
	const a = (_c >>> 24) & 0xFF;
	const r = (_c >>> 16) & 0xFF;
	const g = (_c >>> 8) & 0xFF;
	const b = _c & 0xFF;
	if (a === 0xFF) return `#${_Hex2(r)}${_Hex2(g)}${_Hex2(b)}`;
	return `rgba(${r},${g},${b},${(a / 255).toFixed(_alphaDecimals)})`;
}

// ----------------------------------------------------------- HSL (legacy)

function _RgbToHsl(_r, _g, _b) {
	const r = _r / 255, g = _g / 255, b = _b / 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	const l = (max + min) / 2;
	let h, s;
	if (max === min) {
		h = s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			default: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}
	return [h, s, l];
}

function _HslToRgb(_h, _s, _l) {
	if (_s === 0) {
		const v = Math.round(_l * 255);
		return [v, v, v];
	}
	const hue2rgb = (_p, _q, _t) => {
		let t = _t;
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return _p + (_q - _p) * 6 * t;
		if (t < 1 / 2) return _q;
		if (t < 2 / 3) return _p + (_q - _p) * (2 / 3 - t) * 6;
		return _p;
	};
	const q = _l < 0.5 ? _l * (1 + _s) : _l + _s - _l * _s;
	const p = 2 * _l - q;
	return [
		Math.round(hue2rgb(p, q, _h + 1 / 3) * 255),
		Math.round(hue2rgb(p, q, _h) * 255),
		Math.round(hue2rgb(p, q, _h - 1 / 3) * 255)
	];
}

// ----------------------------------------------------------- OKLCH model

function _SrgbToLinear(_v) {
	const c = _v / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function _LinearToSrgb(_v) {
	const c = _v <= 0.0031308 ? _v * 12.92 : 1.055 * (_v ** (1 / 2.4)) - 0.055;
	return _Clamp255(Math.round(c * 255));
}

// sRGB -> OKLab (Björn Ottosson's reference matrices).
function _RgbToOklab(_r, _g, _b) {
	const r = _SrgbToLinear(_r), g = _SrgbToLinear(_g), b = _SrgbToLinear(_b);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
	];
}

function _OklabToRgb(_L, _a, _b) {
	const l = (_L + 0.3963377774 * _a + 0.2158037573 * _b) ** 3;
	const m = (_L - 0.1055613458 * _a - 0.0638541728 * _b) ** 3;
	const s = (_L - 0.0894841775 * _a - 1.2914855480 * _b) ** 3;
	return [
		_LinearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		_LinearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		_LinearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
	];
}

// ----------------------------------------------------------- public API

// Lightens (positive step) or darkens (negative step) a color by relative
// scaling of its lightness: L' = clamp(L + L*step). The "hsl" model matches
// the legacy µCSS behavior bit-exactly; "oklch" scales the OKLab lightness
// (perceptually uniform) while keeping chroma and hue.
export function Lighten(_color, _step, _model = "hsl") {
	const c = ParseColor(_color);
	const r = (c >>> 16) & 0xFF, g = (c >>> 8) & 0xFF, b = c & 0xFF;
	let rgb;
	if (_model === "hsl") {
		const hsl = _RgbToHsl(r, g, b);
		let l = hsl[2] + hsl[2] * _step;
		if (l < 0) l = 0;
		if (l > 1) l = 1;
		rgb = _HslToRgb(hsl[0], hsl[1], l);
	} else if (_model === "oklch") {
		const lab = _RgbToOklab(r, g, b);
		let l = lab[0] + lab[0] * _step;
		if (l < 0) l = 0;
		if (l > 1) l = 1;
		rgb = _OklabToRgb(l, lab[1], lab[2]);
	} else {
		throw new Error(`Lighten: unknown color model "${_model}" (use "hsl" or "oklch")`);
	}
	return FormatColor(((c & 0xFF000000) | (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]) >>> 0);
}

// Converts an alpha specification to a byte (legacy AlphaValue). Accepts
// fractions (0..1), bytes (0..255) and the keywords transparent/opaque/
// translucent. Unlike the legacy code, 1.0 means fully opaque.
export function AlphaValue(_alpha) {
	let a = _alpha;
	if (typeof a === "string") {
		const text = a.trim().toLowerCase();
		if (text === "transparent") a = 0;
		else if (text === "opaque") a = 255;
		else if (text === "translucent") a = 128;
		else if (text.includes("%")) a = Math.floor((255 * parseFloat(text)) / 100);
		else if (text.includes(".")) a = Math.floor(parseFloat(text) * 255);
		else if (text.includes("x")) a = parseInt(text, 16);
		else a = parseInt(text, 10);
	} else if (a > 0 && a < 1) {
		a = Math.floor(a * 255);
	} else if (a === 1) {
		a = 255;
	}
	return _Clamp255(Math.floor(a));
}

// Replaces the alpha component of a color.
export function Alpha(_color, _alpha) {
	const c = ParseColor(_color);
	return FormatColor(((c & 0x00FFFFFF) | (AlphaValue(_alpha) << 24)) >>> 0);
}

// Channel-wise average of two colors (including alpha) - legacy MixColors.
export function MixColors(_color1, _color2) {
	const c1 = ParseColor(_color1);
	const c2 = ParseColor(_color2);
	const a = (((c1 >>> 24) & 0xFF) + ((c2 >>> 24) & 0xFF)) >> 1;
	const r = (((c1 >>> 16) & 0xFF) + ((c2 >>> 16) & 0xFF)) >> 1;
	const g = (((c1 >>> 8) & 0xFF) + ((c2 >>> 8) & 0xFF)) >> 1;
	const b = ((c1 & 0xFF) + (c2 & 0xFF)) >> 1;
	return FormatColor(((a << 24) | (r << 16) | (g << 8) | b) >>> 0);
}
