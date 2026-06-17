// Renders mups-reference.psd into the same folder layout as examples/reference/out/
// (Adobe PNG ground truth for visual regression / Effects tuning).

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { PsDocument } from "../psd/PsDocument.mjs";
import { RenderDocument } from "../render/Compositor.mjs";
import { StyleTransferFillOpacity } from "../render/StyleTransfer.mjs";
import { SaveRasterAsImage } from "../io/SaveImage.mjs";
import { ButtonAndIconCreator } from "./ButtonAndIconCreator.mjs";

function _ShowOnly(_psDocument, _visibleNodes) {
	_psDocument.SetAllHidden(true);
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

function _CollectVisibleLeaves(_root, _skipNode) {
	const visible = [];
	const collect = (_node) => {
		if (_node === _skipNode) return;
		if (_node.children?.length) {
			for (const child of _node.children) collect(child);
			return;
		}
		visible.push(_node);
	};
	collect(_root);
	return visible;
}

function _AddGlyphLeaves(_glyph, _originallyHidden, _visible) {
	if (_glyph.children?.length) {
		const collect = (_node) => {
			if (_node.children?.length) {
				for (const child of _node.children) collect(child);
				return;
			}
			if (!_originallyHidden.get(_node)) _visible.push(_node);
		};
		collect(_glyph);
	} else {
		_visible.push(_glyph);
	}
}

async function _SavePng(_raster, _file, _retina) {
	if (_retina) throw new Error("ReferenceRenderer: use retina: false (single master resolution).");
	await SaveRasterAsImage(_raster, _file);
}

async function _RenderFlatState(_doc, _stateSet, _outputFile, _retina) {
	const visible = _CollectVisibleLeaves(_stateSet, null);
	_ShowOnly(_doc, visible);
	await _SavePng(RenderDocument(_doc), _outputFile, _retina);
}

function _ResolveCompositingExport(_section, _layout) {
	let stateSet = _layout.children?.find((c) => c.name === "normal");
	let fileName = _layout.name;
	if (_section.name === "chart") {
		if (_layout.name === "chart" && stateSet) {
			fileName = "chart";
		} else if (_layout.name === "normal" && !stateSet) {
			stateSet = _layout;
			fileName = "chart";
		}
	}
	if (!stateSet) return null;
	return { stateSet, fileName };
}

async function _RenderGlyphOnState(_doc, _stateSet, _glyph, _placeholder, _outputFile, _originallyHidden, _retina, _copyBlendMode) {
	const savedEffects = _glyph.effects;
	const savedBlendMode = _glyph.blendMode;
	const savedFillOpacity = _glyph.fillOpacity;
	_glyph.effects = _placeholder.effects;
	// Adobe CpFX/PaFX omits blend mode unless explicitly requested (blend/ layouts).
	if (_copyBlendMode) _glyph.blendMode = _placeholder.blendMode;
	_glyph.fillOpacity = StyleTransferFillOpacity(_glyph, _placeholder);

	const visible = _CollectVisibleLeaves(_stateSet, _placeholder);
	_AddGlyphLeaves(_glyph, _originallyHidden, visible);
	_ShowOnly(_doc, visible);
	await _SavePng(RenderDocument(_doc), _outputFile, _retina);

	_glyph.effects = savedEffects;
	_glyph.blendMode = savedBlendMode;
	_glyph.fillOpacity = savedFillOpacity;
}

async function _RenderStyledGlyph(_doc, _glyph, _styleSource, _outputFile, _retina) {
	const savedEffects = _glyph.effects;
	_glyph.effects = _styleSource.effects;
	_ShowOnly(_doc, [_glyph]);
	await _SavePng(RenderDocument(_doc), _outputFile, _retina);
	_glyph.effects = savedEffects;
}

async function _RenderLayoutGroupSection(_doc, _groupPath, _outDir, _glyphName, _originallyHidden, _options) {
	const root = _doc.FindByPath(_groupPath);
	if (!root) return [];
	mkdirSync(_outDir, { recursive: true });
	if (_options.flatOutDir) mkdirSync(_options.flatOutDir, { recursive: true });

	const glyph = _doc.FindByPath(["icons", _glyphName]);
	const generated = [];

	for (const layout of root.children ?? []) {
		if (!layout.children?.length) continue;
		const stateSet = layout.children.find((c) => c.name === "normal");
		if (!stateSet) continue;
		const placeholder = PsDocument.FindDescendant(stateSet, "icon");

		if (glyph && placeholder) {
			const outFile = join(_outDir, `${layout.name}.png`);
			await _RenderGlyphOnState(
				_doc, stateSet, glyph, placeholder, outFile, _originallyHidden, _options.retina, _options.copyBlendMode
			);
			generated.push(outFile);
		}
		if (_options.flatOutDir) {
			const flatFile = join(_options.flatOutDir, `${layout.name}.png`);
			await _RenderFlatState(_doc, stateSet, flatFile, _options.retina);
			generated.push(flatFile);
		}
	}
	return generated;
}

export class ReferenceRenderer {
	// _options: { retina = false }
	static async RenderAll(_psdFileName, _outputRoot, _options = {}) {
		const options = { retina: false, ..._options };
		if (options.retina) {
			throw new Error("ReferenceRenderer.RenderAll: reference PNGs are single-resolution; pass retina: false.");
		}

		const generated = [];
		const doc = PsDocument.Load(_psdFileName);
		const originallyHidden = new Map();
		doc.Walk((_node) => { originallyHidden.set(_node, !!_node.hidden); });

		for (const layout of ["aqua", "alu"]) {
			const files = await ButtonAndIconCreator.Create(_psdFileName, {
				layout,
				outputDir: join(_outputRoot, "bc", layout),
				retina: false,
				glyphFilter: (g) => g.name.startsWith("but_")
			});
			generated.push(...files);
		}

		generated.push(...await _RenderLayoutGroupSection(
			doc, ["layouts", "fx"], join(_outputRoot, "fx"), "glyph_disc", originallyHidden,
			{ retina: options.retina, copyBlendMode: false, flatOutDir: join(_outputRoot, "flat", "fx") }
		));

		generated.push(...await _RenderLayoutGroupSection(
			doc, ["layouts", "stacks"], join(_outputRoot, "stacks"), "glyph_disc", originallyHidden,
			{ retina: options.retina, copyBlendMode: false }
		));

		generated.push(...await _RenderLayoutGroupSection(
			doc, ["layouts", "blend"], join(_outputRoot, "blend"), "glyph_disc", originallyHidden,
			{ retina: options.retina, copyBlendMode: false }
		));

		const topsetFiles = await ButtonAndIconCreator.CreateByTopLayerSets(_psdFileName, {
			layout: "topsets",
			outputDir: join(_outputRoot, "topsets"),
			retina: false
		});
		generated.push(...topsetFiles);

		const linksState = doc.FindByPath(["layouts", "links", "normal"]);
		if (linksState) {
			const linksFile = join(_outputRoot, "links", "follower.png");
			mkdirSync(join(_outputRoot, "links"), { recursive: true });
			await _RenderFlatState(doc, linksState, linksFile, options.retina);
			generated.push(linksFile);
		}

		const styleIcon = doc.FindByPath(["layouts", "aqua", "normal", "icon"]);
		mkdirSync(join(_outputRoot, "text"), { recursive: true });
		for (const name of ["glyph_text", "glyph_text_light"]) {
			const glyph = doc.FindByPath(["icons", name]);
			if (!glyph || !styleIcon) continue;
			const textFile = join(_outputRoot, "text", `${name}.png`);
			await _RenderStyledGlyph(doc, glyph, styleIcon, textFile, options.retina);
			generated.push(textFile);
		}

		const compositingRoot = doc.FindByPath(["compositing"]);
		if (compositingRoot) {
			for (const section of compositingRoot.children ?? []) {
				if (!section.children?.length) continue;
				const sectionDir = join(_outputRoot, "compositing", section.name);
				mkdirSync(sectionDir, { recursive: true });
				for (const layout of section.children) {
					const resolved = _ResolveCompositingExport(section, layout);
					if (!resolved) continue;
					const outFile = join(sectionDir, `${resolved.fileName}.png`);
					await _RenderFlatState(doc, resolved.stateSet, outFile, options.retina);
					generated.push(outFile);
				}
			}
		}

		return generated;
	}
}
