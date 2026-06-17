// Helpers for CpFX/PaFX style transfer (layer style copied onto a glyph).

export function IsStyleTransferTestGlyph(_name) {
	return typeof _name === "string" && _name.startsWith("glyph_")
		&& _name !== "glyph_text" && _name !== "glyph_text_light";
}

// Uses fillOpacity from PSD when present; otherwise full fill (legacy ButtonAndIconCreator parity).
export function StyleTransferFillOpacity(_glyph, _placeholder) {
	if (_glyph?.fillOpacity !== undefined) return _glyph.fillOpacity;
	if (_placeholder?.fillOpacity !== undefined) return _placeholder.fillOpacity;
	return 1;
}
