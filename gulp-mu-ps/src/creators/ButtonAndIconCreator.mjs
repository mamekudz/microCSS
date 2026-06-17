// Node port of the former ButtonAndIconCreator plugin.
//
// Two draft document structures are supported, matching the two legacy methods:
//
// 1. Create (icon x state matrix) - expected structure:
//      layouts/<layout>/<state>/...   background layers plus an "icon"
//                                     placeholder layer carrying the layer
//                                     effects for icons
//      icons/<glyphName>              one pixel layer or group per icon glyph
//    For every combination of icon glyph and state set, the placeholder effects
//    are applied to the glyph, the document is rendered and saved as
//    "<glyphName><stateName>.png" (plus "@2x" when the document is a retina
//    master).
//
// 2. CreateByTopLayerSets (one image per group) - expected structure:
//      <layout>/<setName>/...        one group per output image
//    The named layout group is shown, then for each of its child groups whose
//    name matches the (optional) set pattern, only that group is made visible
//    and the document is rendered and saved as "<setName>.png" (plus "@2x").
//    No "icons" group is required; every child group is already a finished
//    composition (logos, animation frames, emoticons, ...).

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { PsDocument } from "../psd/PsDocument.mjs";
import { RenderDocument } from "../render/Compositor.mjs";
import { SaveRasterAsImage, SaveRasterAsImageHalfSize } from "../io/SaveImage.mjs";

// Saves one rendered raster as "<baseName>.<ext>" (and a half-size "@2x"
// companion in retina mode), appending the written files to _generated.
async function _SaveRasterImages(_raster, _outputDir, _baseName, _options, _generated) {
	const ext = _options.format;
	if (_options.retina) {
		const retinaFile = join(_outputDir, `${_baseName}@2x.${ext}`);
		await SaveRasterAsImage(_raster, retinaFile);
		_generated.push(retinaFile);
		const normalFile = join(_outputDir, `${_baseName}.${ext}`);
		await SaveRasterAsImageHalfSize(_raster, normalFile);
		_generated.push(normalFile);
	} else {
		const file = join(_outputDir, `${_baseName}.${ext}`);
		await SaveRasterAsImage(_raster, file);
		_generated.push(file);
	}
}

function _ShowOnly(_psDocument, _visibleNodes) {
	_psDocument.SetAllHidden(true);
	// A node is visible when itself and all ancestors are visible, so unhide the full chains.
	const parents = new Map();
	_psDocument.Walk((_node, _parent) => { parents.set(_node, _parent); });
	for (const node of _visibleNodes) {
		let current = node;
		while (current) {
			current.hidden = false;
			current = parents.get(current) ?? null;
		}
	}
}

export class ButtonAndIconCreator {
	// _options: {
	//   layout, outputDir,
	//   retina = true,
	//   format = "png"                "png" or "webp" (lossless)
	//   iconsGroupName = "icons",
	//   layoutsGroupName = "layouts",
	//   glyphFilter = null            optional (glyph) => boolean
	// }
	static async Create(_psdFileName, _options) {
		const options = {
			retina: true,
			format: "png",
			iconsGroupName: "icons",
			layoutsGroupName: "layouts",
			..._options
		};
		if (options.format !== "png" && options.format !== "webp") {
			throw new Error(`ButtonAndIconCreator: unsupported format "${options.format}".`);
		}
		const doc = PsDocument.Load(_psdFileName);
		// Snapshot the original visibility so glyph groups can re-show exactly
		// the layers that were visible inside them in the source document.
		const originallyHidden = new Map();
		doc.Walk((_node) => { originallyHidden.set(_node, !!_node.hidden); });
		const iconsGroup = doc.FindByPath([options.iconsGroupName]);
		if (!iconsGroup) throw new Error(`ButtonAndIconCreator: icons group "${options.iconsGroupName}" not found.`);
		const layoutGroup = doc.FindByPath([options.layoutsGroupName, options.layout]);
		if (!layoutGroup) throw new Error(`ButtonAndIconCreator: layout "${options.layout}" not found.`);

		mkdirSync(options.outputDir, { recursive: true });

		const stateSets = (layoutGroup.children ?? []).filter((n) => n.children);
		// Glyphs may be single pixel layers or groups (multi-layer icons).
		const glyphs = (iconsGroup.children ?? []).filter((n) => n.name !== "_");
		const generated = [];

		for (const stateSet of stateSets) {
			const placeholder = PsDocument.FindDescendant(stateSet, "icon");
			if (!placeholder) throw new Error(`ButtonAndIconCreator: no "icon" placeholder in state set "${stateSet.name}".`);
			for (const glyph of glyphs) {
				if (options.glyphFilter && !options.glyphFilter(glyph)) continue;
				// CpFX/PaFX: layer style only — PS does not transfer the placeholder blend mode.
				const savedEffects = glyph.effects;
				glyph.effects = placeholder.effects;

				// Show the state set without its placeholder, plus the current glyph.
				const visible = [];
				const collect = (_node) => {
					if (_node === placeholder) return;
					if (_node.children) { for (const c of _node.children) collect(c); return; }
					visible.push(_node);
				};
				collect(stateSet);
				if (glyph.children) {
					// Group glyph: re-show the layers that were visible in the source.
					const collectGlyph = (_node) => {
						if (_node.children) { for (const c of _node.children) collectGlyph(c); return; }
						if (!originallyHidden.get(_node)) visible.push(_node);
					};
					collectGlyph(glyph);
				} else {
					visible.push(glyph);
				}
				_ShowOnly(doc, visible);

				const raster = RenderDocument(doc);
				// State sets named "_" produce no suffix ("<glyph>.png" instead
				// of "<glyph><state>.png"), matching the legacy plugin.
				const baseName = glyph.name + ((stateSet.name === "_") ? "" : stateSet.name);
				await _SaveRasterImages(raster, options.outputDir, baseName, options, generated);

				glyph.effects = savedEffects;
			}
		}
		return generated;
	}

	// _options: {
	//   layout,                       top-level group name (legacy _srcLayout)
	//   outputDir,
	//   retina = true,
	//   format = "png",               "png" or "webp" (lossless)
	//   setPattern = null             optional RegExp or string; only child
	//                                 groups whose name matches are exported.
	//                                 Defaults to all groups except "_".
	// }
	static async CreateByTopLayerSets(_psdFileName, _options) {
		const options = {
			retina: true,
			format: "png",
			setPattern: null,
			..._options
		};
		if (options.format !== "png" && options.format !== "webp") {
			throw new Error(`ButtonAndIconCreator.CreateByTopLayerSets: unsupported format "${options.format}".`);
		}
		const doc = PsDocument.Load(_psdFileName);
		// Snapshot the source visibility so each set is rendered with the inner
		// layer visibility it had in the document (the legacy plugin only toggled
		// the top groups and the layout's direct child sets).
		const originallyHidden = new Map();
		doc.Walk((_node) => { originallyHidden.set(_node, !!_node.hidden); });

		const layoutGroup = doc.FindByPath([options.layout]);
		if (!layoutGroup) {
			throw new Error(`ButtonAndIconCreator.CreateByTopLayerSets: layout group "${options.layout}" not found in ${_psdFileName}.`);
		}

		const pattern = options.setPattern
			? (options.setPattern instanceof RegExp ? options.setPattern : new RegExp(options.setPattern))
			: null;
		const sets = (layoutGroup.children ?? [])
			.filter((_n) => _n.children && _n.name !== "_" && (!pattern || pattern.test(_n.name)));
		if (sets.length === 0) {
			throw new Error(`ButtonAndIconCreator.CreateByTopLayerSets: no matching layer sets in group "${options.layout}" of ${_psdFileName}.`);
		}

		mkdirSync(options.outputDir, { recursive: true });
		const generated = [];
		for (const set of sets) {
			// Restore the source visibility, then expose only this set's chain.
			doc.Walk((_node) => { _node.hidden = originallyHidden.get(_node); });
			// Top level: keep only the layout group (legacy iterated layer sets).
			for (const top of doc.children) {
				if (top.children) top.hidden = (top !== layoutGroup);
			}
			// Inside the layout group: keep only the current set among sibling sets.
			for (const child of layoutGroup.children ?? []) {
				if (child.children) child.hidden = (child !== set);
			}
			layoutGroup.hidden = false;
			set.hidden = false;

			const raster = RenderDocument(doc);
			await _SaveRasterImages(raster, options.outputDir, set.name, options, generated);
		}
		return generated;
	}
}
