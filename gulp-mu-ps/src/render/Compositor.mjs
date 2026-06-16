// Renders the visible layers of a PsDocument into a single RGBA raster,
// honoring group nesting, blend modes, opacity and layer effects.

import { CreateRaster, RasterFromImageData, CompositeOver, CloneRaster, ApplyLayerMask } from "./Raster.mjs";
import { ApplyInteriorEffects, BuildExteriorEffects } from "./Effects.mjs";

function _RenderPixelLayer(_backdrop, _layer, _docWidth, _docHeight) {
	const left = _layer.left ?? 0;
	const top = _layer.top ?? 0;
	const raster = RasterFromImageData(_layer.imageData, left, top, _docWidth, _docHeight);
	ApplyLayerMask(raster, _layer);
	for (const fx of BuildExteriorEffects(raster, _layer.effects)) {
		CompositeOver(_backdrop, fx.raster, fx.blendMode, fx.opacity);
	}
	ApplyInteriorEffects(raster, _layer.effects);
	CompositeOver(_backdrop, raster, _layer.blendMode ?? "normal", _layer.opacity ?? 1);
}

function _HasEnabledEffects(_effects) {
	if (!_effects || _effects.disabled) return false;
	for (const value of Object.values(_effects)) {
		const list = Array.isArray(value) ? value : [value];
		if (list.some((fx) => fx && typeof fx === "object" && fx.enabled)) return true;
	}
	return false;
}

// A group carrying a layer style is isolated, the effects are applied to the
// merged group content (matching PS group layer styles).
function _RenderGroupWithEffects(_backdrop, _group, _docWidth, _docHeight) {
	const isolated = CreateRaster(_docWidth, _docHeight);
	_RenderChildren(isolated, _group.children, _docWidth, _docHeight);
	ApplyLayerMask(isolated, _group);
	for (const fx of BuildExteriorEffects(isolated, _group.effects)) {
		CompositeOver(_backdrop, fx.raster, fx.blendMode, fx.opacity);
	}
	ApplyInteriorEffects(isolated, _group.effects);
	const blendMode = _group.blendMode ?? "pass through";
	CompositeOver(_backdrop, isolated, (blendMode === "pass through") ? "normal" : blendMode, _group.opacity ?? 1);
}

function _RenderChildren(_backdrop, _children, _docWidth, _docHeight) {
	for (const node of _children) {
		if (node.hidden) continue;
		if (node.children) {
			if (_HasEnabledEffects(node.effects)) {
				_RenderGroupWithEffects(_backdrop, node, _docWidth, _docHeight);
				continue;
			}
			const blendMode = node.blendMode ?? "pass through";
			if (blendMode === "pass through") {
				// Pass-through groups composite their children directly onto the backdrop,
				// but a group opacity below 1 still requires isolation.
				const opacity = node.opacity ?? 1;
				if (opacity >= 1) {
					_RenderChildren(_backdrop, node.children, _docWidth, _docHeight);
				} else {
					const before = CloneRaster(_backdrop);
					_RenderChildren(_backdrop, node.children, _docWidth, _docHeight);
					_MixRasters(_backdrop, before, 1 - opacity);
				}
			} else {
				const isolated = CreateRaster(_docWidth, _docHeight);
				_RenderChildren(isolated, node.children, _docWidth, _docHeight);
				CompositeOver(_backdrop, isolated, blendMode, node.opacity ?? 1);
			}
		} else {
			_RenderPixelLayer(_backdrop, node, _docWidth, _docHeight);
		}
	}
}

function _MixRasters(_target, _other, _otherWeight) {
	const t = _target.data, o = _other.data;
	for (let i = 0; i < t.length; i++) {
		t[i] = t[i] * (1 - _otherWeight) + o[i] * _otherWeight;
	}
}

export function RenderDocument(_psDocument) {
	const backdrop = CreateRaster(_psDocument.width, _psDocument.height);
	_RenderChildren(backdrop, _psDocument.children, _psDocument.width, _psDocument.height);
	return backdrop;
}
