// Resolves a skin-relative image URL to an existing file under baseDir.
// Used by SpriteManager and DataUri().

import { existsSync } from "node:fs";
import { join } from "node:path";

export const RASTER_EXTENSIONS = ["png", "webp"];

// "imgs/sprites.png" -> "imgs/sprites@2x.png" (before the extension).
export function RetinaUrl(_url) {
	const dot = _url.lastIndexOf(".");
	return dot < 0 ? `${_url}@2x` : `${_url.slice(0, dot)}@2x${_url.slice(dot)}`;
}

// Literal path first, then the same stem with each extension in order.
export function ResolveImageFile(_baseDir, _url, _extensions = RASTER_EXTENSIONS) {
	const literal = join(_baseDir, _url);
	if (existsSync(literal)) return literal;
	const dot = _url.lastIndexOf(".");
	const stem = dot < 0 ? _url : _url.slice(0, dot);
	for (const ext of _extensions) {
		const candidate = join(_baseDir, `${stem}.${ext}`);
		if (existsSync(candidate)) return candidate;
	}
	return null;
}
