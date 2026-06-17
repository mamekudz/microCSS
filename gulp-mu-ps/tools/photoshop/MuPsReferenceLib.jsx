// Shared helpers for the µPS reference PSD toolchain (ExtendScript / Photoshop).
// Loaded via $.evalFile from build-mups-reference.jsx / export-mups-reference.jsx
// (no #target here — that breaks some evalFile loads).

var MuPsAnchorFolder = null;

function MuPsSetAnchorFolder(_folder) {
	MuPsAnchorFolder = _folder;
}

function MuPsCharID(_id) { return charIDToTypeID(_id); }
function MuPsStringID(_id) { return stringIDToTypeID(_id); }

function MuPsScriptFolder() {
	if (MuPsAnchorFolder) return MuPsAnchorFolder;
	return new File($.fileName).parent;
}

function MuPsDraftsFolder() {
	return new Folder(MuPsScriptFolder().fsName + "/../../examples/drafts");
}

function MuPsReferenceOutFolder() {
	return new Folder(MuPsScriptFolder().fsName + "/../../examples/reference/out");
}

function MuPsFindSampleButtonsPsd() {
	var candidates = [
		new File(MuPsDraftsFolder().fsName + "/buttons.psd"),
		new File(MuPsScriptFolder().fsName + "/../../../µCSS 1.0 (Photoshop)/µCSS/examples/drafts/buttons.psd"),
		new File(MuPsScriptFolder().fsName + "/../../../oldsrcs/old_adobe_scripts/µCSS/examples/drafts/buttons.psd")
	];
	for (var i = 0; i < candidates.length; i++) {
		if (candidates[i].exists) return candidates[i];
	}
	return null;
}

function MuPsEnsureFolder(_folder) {
	if (!_folder.exists) _folder.create();
}

function MuPsAlert(_message) {
	var savedMode = app.displayDialogs;
	app.displayDialogs = DialogModes.ALL;
	alert(_message);
	app.displayDialogs = savedMode;
}

function MuPsWriteBuildLog(_fileName, _text) {
	try {
		var logFile = new File(MuPsDraftsFolder().fsName + "/" + _fileName);
		logFile.encoding = "UTF8";
		logFile.open("w");
		logFile.write(_text);
		logFile.close();
	} catch (_logErr) {}
}

function MuPsCopyLayerEffects(_sourceLayer, _targetLayer) {
	var doc = app.activeDocument;
	var saved = doc.activeLayer;
	doc.activeLayer = _sourceLayer;
	executeAction(MuPsCharID("CpFX"), undefined, DialogModes.NO);
	doc.activeLayer = _targetLayer;
	executeAction(MuPsCharID("PaFX"), new ActionDescriptor(), DialogModes.NO);
	doc.activeLayer = saved;
}

function MuPsFindByPath(_root, _names) {
	var node = _root;
	for (var i = 0; i < _names.length; i++) {
		node = MuPsFindChildGroupOrLayer(node, _names[i]);
		if (!node) return null;
	}
	return node;
}

function MuPsFindChildGroupOrLayer(_parent, _name) {
	var sets = _parent.layerSets;
	for (var i = 0; i < sets.length; i++) {
		if (sets[i].name === _name) return sets[i];
	}
	var layers = _parent.artLayers;
	for (var j = 0; j < layers.length; j++) {
		if (layers[j].name === _name) return layers[j];
	}
	return null;
}

function MuPsAddGroup(_parent, _name) {
	var group = _parent.layerSets.add();
	group.name = _name;
	return group;
}

function MuPsHideAllDoc(_doc) {
	function hide(_node) {
		_node.visible = false;
		if (!_node.layers) return;
		for (var i = 0; i < _node.layers.length; i++) hide(_node.layers[i]);
	}
	for (var j = 0; j < _doc.layers.length; j++) hide(_doc.layers[j]);
}

function MuPsShowChain(_node) {
	while (_node) {
		_node.visible = true;
		_node = _node.parent;
	}
}

function MuPsShowDescendants(_node) {
	if (!_node || _node.typename !== "LayerSet") return;
	var layers = _node.layers;
	for (var i = 0; i < layers.length; i++) {
		try { layers[i].visible = true; } catch (_visErr) {}
		if (layers[i].typename === "LayerSet") MuPsShowDescendants(layers[i]);
	}
}

function MuPsCaptureVisibility(_doc) {
	var snap = [];
	function walk(_node) {
		try { snap.push({ node: _node, visible: _node.visible }); } catch (_visErr) {}
		if (_node.typename === "LayerSet") {
			for (var i = 0; i < _node.layers.length; i++) walk(_node.layers[i]);
		}
	}
	for (var j = 0; j < _doc.layers.length; j++) walk(_doc.layers[j]);
	return snap;
}

function MuPsRestoreVisibility(_snap) {
	for (var i = 0; i < _snap.length; i++) {
		try { _snap[i].node.visible = _snap[i].visible; } catch (_visErr) {}
	}
}

function MuPsShowOnlyNodes(_showNodes) {
	var doc = app.activeDocument;
	var snap = MuPsCaptureVisibility(doc);
	for (var i = 0; i < snap.length; i++) {
		try { snap[i].node.visible = false; } catch (_visErr) {}
	}
	for (var j = 0; j < _showNodes.length; j++) {
		if (_showNodes[j]) MuPsShowChain(_showNodes[j]);
	}
	return snap;
}

function MuPsCreateExportGlyph(_glyph, _iconsParent, _styleSource) {
	var copy = _glyph.duplicate();
	copy.move(_iconsParent, ElementPlacement.PLACEATEND);
	copy.name = "_mups_export";
	if (_styleSource) {
		MuPsCopyLayerEffects(_styleSource, copy);
		try { copy.blendMode = _styleSource.blendMode; } catch (_blendErr) {}
	}
	return copy;
}

// Renders a layout state (bgrd + layers) without the icon placeholder — glyph carries style + blend mode.
function MuPsExportGlyphFrame(_stateSet, _glyph, _icons, _placeholder, _saveFn) {
	var exportGlyph = null;
	if (_glyph && _placeholder) {
		exportGlyph = MuPsCreateExportGlyph(_glyph, _icons, _placeholder);
	}
	var snap = MuPsCaptureVisibility(app.activeDocument);
	for (var i = 0; i < snap.length; i++) {
		try { snap[i].node.visible = false; } catch (_visErr) {}
	}
	try {
		if (_stateSet) {
			MuPsShowChain(_stateSet);
			MuPsShowDescendants(_stateSet);
			if (_placeholder) {
				try { _placeholder.visible = false; } catch (_hideErr) {}
			}
		}
		var drawGlyph = exportGlyph || _glyph;
		if (drawGlyph) MuPsShowChain(drawGlyph);
		if (_icons) MuPsShowChain(_icons);
		_saveFn();
	} finally {
		MuPsRestoreVisibility(snap);
		if (exportGlyph) MuPsRemoveLayer(exportGlyph);
	}
}

// Renders a layout state with all child layers (flat composite, topsets frame, links, …).
function MuPsExportLayoutFrame(_rootSet, _parentChain, _saveFn) {
	var snap = MuPsCaptureVisibility(app.activeDocument);
	for (var i = 0; i < snap.length; i++) {
		try { snap[i].node.visible = false; } catch (_visErr) {}
	}
	try {
		if (_parentChain) MuPsShowChain(_parentChain);
		MuPsShowChain(_rootSet);
		MuPsShowDescendants(_rootSet);
		_saveFn();
	} finally {
		MuPsRestoreVisibility(snap);
	}
}

function MuPsRemoveLayer(_layer) {
	try { _layer.remove(); } catch (_rmErr) {}
}

function MuPsPurgeHistory() {
	try {
		var ref = new ActionReference();
		ref.putEnumerated(MuPsCharID("Prg "), MuPsCharID("Prg "), MuPsCharID("His "));
		executeAction(MuPsCharID("Prge"), ref, DialogModes.NO);
	} catch (_purgeErr) {}
}

function MuPsSavePng(_file, _retina) {
	var doc = app.activeDocument;
	if (_file.parent && !_file.parent.exists) _file.parent.create();

	var pngOpts = new PNGSaveOptions();
	pngOpts.compression = 6;
	pngOpts.interlaced = false;

	var exportDoc = doc;
	var tmpDoc = null;
	if (!_retina) {
		tmpDoc = doc.duplicate("mups-export-half", true);
		tmpDoc.resizeImage(doc.width / 2, doc.height / 2, doc.resolution, ResampleMethod.BICUBICSHARPER);
		exportDoc = tmpDoc;
	}

	try {
		try {
			exportDoc.saveAs(_file, pngOpts, true, Extension.LOWERCASE);
		} catch (_saveCopyErr) {
			exportDoc.saveAs(_file, pngOpts, false, Extension.LOWERCASE);
		}
	} catch (_saveErr) {
		var webOpts = new ExportOptionsSaveForWeb();
		webOpts.format = SaveDocumentType.PNG;
		webOpts.PNG8 = false;
		webOpts.transparency = true;
		exportDoc.exportDocument(_file, ExportType.SAVEFORWEB, webOpts);
	} finally {
		if (tmpDoc) tmpDoc.close(SaveOptions.DONOTSAVECHANGES);
	}
}

// Saves at document resolution (single master PNG for reference tests).
function MuPsSavePngReference(_file) {
	MuPsSavePng(_file, true);
}

function MuPsWriteExportLog(_text) {
	MuPsWriteBuildLog("mups-reference-export.log", _text);
}

function MuPsFillRect(_doc, _layer, _left, _top, _width, _height, _color, _opacityPct) {
	_doc.activeLayer = _layer;
	_doc.selection.select([
		[_left, _top],
		[_left + _width, _top],
		[_left + _width, _top + _height],
		[_left, _top + _height]
	], SelectionType.REPLACE, 0, false);
	var op = (_opacityPct === undefined || _opacityPct === null) ? 100 : _opacityPct;
	_doc.selection.fill(_color, ColorBlendMode.NORMAL, op, false);
	_doc.selection.deselect();
}

function MuPsHsvToRgb(_h, _s, _v) {
	var c = _v * _s;
	var hp = (_h % 360) / 60;
	var x = c * (1 - Math.abs((hp % 2) - 1));
	var rp = 0, gp = 0, bp = 0;
	if (hp >= 0 && hp < 1) { rp = c; gp = x; }
	else if (hp < 2) { rp = x; gp = c; }
	else if (hp < 3) { gp = c; bp = x; }
	else if (hp < 4) { gp = x; bp = c; }
	else if (hp < 5) { rp = x; bp = c; }
	else { rp = c; bp = x; }
	var m = _v - c;
	return [
		Math.round((rp + m) * 255),
		Math.round((gp + m) * 255),
		Math.round((bp + m) * 255)
	];
}

// Horizontal HSV rainbow (diagnostic — reveals per-channel / blend / opacity bugs).
function MuPsFillRainbowRect(_doc, _layer, _left, _top, _width, _height, _opacityPct) {
	var steps = Math.max(32, Math.min(128, _width));
	_doc.activeLayer = _layer;
	for (var i = 0; i < steps; i++) {
		var hue = (i / steps) * 360;
		var rgb = MuPsHsvToRgb(hue, 1, 1);
		var x0 = _left + Math.floor((i * _width) / steps);
		var x1 = _left + Math.floor(((i + 1) * _width) / steps);
		var w = Math.max(1, x1 - x0);
		var color = new SolidColor();
		color.rgb.red = rgb[0];
		color.rgb.green = rgb[1];
		color.rgb.blue = rgb[2];
		MuPsFillRect(_doc, _layer, x0, _top, w, _height, color, _opacityPct);
	}
}

function MuPsCreateRainbowLayer(_parent, _name, _left, _top, _width, _height, _opacityPct) {
	var doc = app.activeDocument;
	var layer = _parent.artLayers.add();
	layer.name = _name;
	MuPsFillRainbowRect(doc, layer, _left, _top, _width, _height, _opacityPct);
	return layer;
}

function MuPsCreateShapeLayer(_parent, _name, _left, _top, _width, _height, _rgb) {
	var doc = app.activeDocument;
	var layer = _parent.artLayers.add();
	layer.name = _name;
	var color = new SolidColor();
	color.rgb.red = _rgb[0];
	color.rgb.green = _rgb[1];
	color.rgb.blue = _rgb[2];
	MuPsFillRect(doc, layer, _left, _top, _width, _height, color);
	return layer;
}

// Layer fill opacity (0..100). Does not affect layer styles — see compositing/ chart in reference PSD.
function MuPsSetFillOpacity(_layer, _percent) {
	try {
		_layer.fillOpacity = _percent;
	} catch (_fillErr) {}
}

function MuPsCreateTextLayer(_parent, _name, _text, _left, _top, _size, _font) {
	var layer = _parent.artLayers.add();
	layer.name = _name;
	layer.kind = LayerKind.TEXT;
	var item = layer.textItem;
	item.contents = _text;
	item.size = _size;
	try { item.position = [_left, _top]; } catch (_posErr) {}
	try { if (_font) item.font = _font; } catch (_fontErr) {}
	try {
		var fill = new SolidColor();
		fill.rgb.red = 40;
		fill.rgb.green = 40;
		fill.rgb.blue = 40;
		item.color = fill;
	} catch (_colorErr) {}
	return layer;
}

function MuPsDuplicateTree(_sourceNode, _targetParent, _rename) {
	var doc = app.activeDocument;
	if (_sourceNode.typename === "LayerSet") {
		var newGroup = _targetParent.layerSets.add();
		newGroup.name = _rename || _sourceNode.name;
		newGroup.visible = _sourceNode.visible;
		newGroup.opacity = _sourceNode.opacity;
		var childSets = _sourceNode.layerSets;
		for (var s = 0; s < childSets.length; s++) {
			MuPsDuplicateTree(childSets[s], newGroup, childSets[s].name);
		}
		var childLayers = _sourceNode.artLayers;
		for (var l = childLayers.length - 1; l >= 0; l--) {
			var layerCopy = childLayers[l].duplicate();
			layerCopy.move(newGroup, ElementPlacement.INSIDE);
		}
		return newGroup;
	}
	var artCopy = _sourceNode.duplicate();
	artCopy.move(_targetParent, ElementPlacement.INSIDE);
	artCopy.name = _rename || _sourceNode.name;
	return artCopy;
}

function MuPsCreateStateSetFromTemplate(_layoutGroup, _stateName, _templateState, _iconEffectsLayer) {
	var state = MuPsAddGroup(_layoutGroup, _stateName);
	var templateBgrd = MuPsFindChildGroupOrLayer(_templateState, "bgrd");
	if (templateBgrd) {
		try {
			MuPsDuplicateTree(templateBgrd, state, "bgrd");
		} catch (_bgrdErr) {
			// Icon-only fallback if PS rejects group duplication on this version.
		}
	}
	var icon = MuPsCreateShapeLayer(state, "icon", 17, 28, 76, 54, [180, 180, 180]);
	if (_iconEffectsLayer) MuPsCopyLayerEffects(_iconEffectsLayer, icon);
	icon.blendMode = BlendMode.MULTIPLY;
	return state;
}

function MuPsLinkLayers(_a, _b) {
	try {
		app.activeDocument.activeLayer = _a;
		_a.link(_b);
	} catch (_linkErr) {
		// PS layer link is optional — CpFX/PaFX style transfer is the main reference path.
	}
}

function MuPsFindLayerWithEffects(_group) {
	var layers = _group.artLayers;
	for (var i = 0; i < layers.length; i++) {
		try {
			if (layers[i].layerEffects && layers[i].layerEffects.count > 0) return layers[i];
		} catch (_err) {}
	}
	for (var j = 0; j < _group.layerSets.length; j++) {
		var found = MuPsFindLayerWithEffects(_group.layerSets[j]);
		if (found) return found;
	}
	return null;
}

function MuPsBuildFxLayout(_layoutsRoot, _templateState, _name, _profile, _copyEffectsFrom) {
	var fxRoot = MuPsFindChildGroupOrLayer(_layoutsRoot, "fx");
	if (!fxRoot) fxRoot = MuPsAddGroup(_layoutsRoot, "fx");
	var layout = MuPsAddGroup(fxRoot, _name);
	var state = MuPsCreateStateSetFromTemplate(layout, "normal", _templateState, null);
	var icon = MuPsFindChildGroupOrLayer(state, "icon");
	if (_copyEffectsFrom) MuPsCopyLayerEffects(_copyEffectsFrom, icon);
	else MuPsApplyEffectProfileSafe(icon, _profile);
	return layout;
}

function MuPsBuildFxLayoutOptional(_layoutsRoot, _templateState, _name, _profile, _copyEffectsFrom) {
	try {
		MuPsBuildFxLayout(_layoutsRoot, _templateState, _name, _profile, _copyEffectsFrom);
		return true;
	} catch (_fxErr) {
		return false;
	}
}

function MuPsApplyEffectProfileSafe(_layer, _profile) {
	try {
		MuPsApplyEffectProfile(_layer, _profile);
	} catch (_fxErr) {
		throw new Error("effect " + _profile + ": " + _fxErr.message);
	}
}

function MuPsBuildNamedLayout(_parent, _name, _templateState, _configureIcon) {
	var layout = MuPsAddGroup(_parent, _name);
	var state = MuPsCreateStateSetFromTemplate(layout, "normal", _templateState, null);
	var icon = MuPsFindChildGroupOrLayer(state, "icon");
	if (_configureIcon) _configureIcon(icon, state);
	return layout;
}

function MuPsBuildStackLayouts(_layoutsRoot, _templateState, _entries) {
	var stacksRoot = MuPsFindChildGroupOrLayer(_layoutsRoot, "stacks");
	if (!stacksRoot) stacksRoot = MuPsAddGroup(_layoutsRoot, "stacks");
	for (var i = 0; i < _entries.length; i++) {
		(function (_name, _source) {
			MuPsBuildNamedLayout(stacksRoot, _name, _templateState, function (_icon) {
				MuPsCopyLayerEffects(_source, _icon);
				_icon.blendMode = BlendMode.MULTIPLY;
			});
		})(_entries[i][0], _entries[i][1]);
	}
}

function MuPsBuildBlendLayouts(_layoutsRoot, _templateState, _aquaIcon, _modes) {
	var blendRoot = MuPsFindChildGroupOrLayer(_layoutsRoot, "blend");
	if (!blendRoot) blendRoot = MuPsAddGroup(_layoutsRoot, "blend");
	for (var i = 0; i < _modes.length; i++) {
		(function (_name, _mode) {
			MuPsBuildNamedLayout(blendRoot, _name, _templateState, function (_icon) {
				MuPsCopyLayerEffects(_aquaIcon, _icon);
				try { _icon.blendMode = _mode; } catch (_blendErr) { _icon.blendMode = BlendMode.NORMAL; }
			});
		})(_modes[i][0], _modes[i][1]);
	}
}

// Diagnostic chart: test-card patches + rainbow discs for opacity / alpha / fillOpacity.
function MuPsResolveCompositingExport(_section, _layout) {
	var stateSet = MuPsFindChildGroupOrLayer(_layout, "normal");
	var fileName = _layout.name;
	if (_section.name === "chart") {
		if (_layout.name === "chart" && stateSet) {
			fileName = "chart";
		} else if (_layout.name === "normal" && _layout.layerSets.length === 0) {
			// Legacy PSD: compositing/chart/normal held art layers directly.
			stateSet = _layout;
			fileName = "chart";
		}
	}
	if (!stateSet) return null;
	return { stateSet: stateSet, fileName: fileName };
}

function MuPsBuildCompositingChart(_doc) {
	var root = MuPsFindChildGroupOrLayer(_doc, "compositing");
	if (!root) root = MuPsAddGroup(_doc, "compositing");

	var chartSection = MuPsAddGroup(root, "chart");
	var chartLayout = MuPsAddGroup(chartSection, "chart");
	var chartState = MuPsAddGroup(chartLayout, "normal");
	MuPsCreateShapeLayer(chartState, "patch_lt", 0, 0, 55, 55, [220, 220, 225]);
	MuPsCreateShapeLayer(chartState, "patch_rt", 55, 0, 55, 55, [255, 128, 128]);
	MuPsCreateShapeLayer(chartState, "patch_lb", 0, 55, 55, 55, [128, 176, 255]);
	MuPsCreateShapeLayer(chartState, "patch_rb", 55, 55, 55, 55, [255, 255, 255]);
	MuPsCreateRainbowLayer(chartState, "rainbow_bar", 5, 102, 100, 6, 100);

	var fillRoot = MuPsAddGroup(root, "fillOpacity");
	var fillCases = [
		["fill100_bevel", 100],
		["fill50_bevel", 50],
		["fill0_bevel", 0]
	];
	for (var f = 0; f < fillCases.length; f++) {
		(function (_name, _fillPct) {
			var layout = MuPsAddGroup(fillRoot, _name);
			var state = MuPsAddGroup(layout, "normal");
			MuPsCreateShapeLayer(state, "field", 0, 0, 110, 110, [128, 128, 128]);
			var disc = MuPsCreateRainbowLayer(state, "disc", 35, 35, 40, 40, 100);
			MuPsApplyEffectProfileSafe(disc, "bevelInner");
			MuPsSetFillOpacity(disc, _fillPct);
		})(fillCases[f][0], fillCases[f][1]);
	}

	var opRoot = MuPsAddGroup(root, "layerOpacity");
	var opCases = [
		["opacity100", 100],
		["opacity50", 50]
	];
	for (var o = 0; o < opCases.length; o++) {
		(function (_name, _opPct) {
			var layout = MuPsAddGroup(opRoot, _name);
			var state = MuPsAddGroup(layout, "normal");
			MuPsCreateShapeLayer(state, "field", 0, 0, 110, 110, [128, 128, 128]);
			var disc = MuPsCreateRainbowLayer(state, "disc", 35, 35, 40, 40, 100);
			try { disc.opacity = _opPct; } catch (_opErr) {}
		})(opCases[o][0], opCases[o][1]);
	}

	// Per-pixel alpha in layer pixels (stored in PNG/PSD), distinct from layer/fill opacity.
	var alphaRoot = MuPsAddGroup(root, "layerAlpha");
	var alphaCases = [
		["pixelAlpha_opaque", 100],
		["pixelAlpha_uniform50", 50]
	];
	for (var a = 0; a < alphaCases.length; a++) {
		(function (_name, _pixelAlphaPct) {
			var layout = MuPsAddGroup(alphaRoot, _name);
			var state = MuPsAddGroup(layout, "normal");
			MuPsCreateShapeLayer(state, "field", 0, 0, 110, 110, [128, 128, 128]);
			MuPsCreateRainbowLayer(state, "disc", 35, 35, 40, 40, _pixelAlphaPct);
		})(alphaCases[a][0], alphaCases[a][1]);
	}
}

function MuPsBuildTopSetsDemo(_doc, _templateState) {
	var topsets = MuPsFindChildGroupOrLayer(_doc, "topsets");
	if (!topsets) topsets = MuPsAddGroup(_doc, "topsets");
	var colors = [
		[160, 160, 160],
		[120, 170, 220],
		[200, 140, 90]
	];
	for (var i = 0; i < 3; i++) {
		var frameName = "frame_0" + (i + 1);
		var frame = MuPsAddGroup(topsets, frameName);
		var templateBgrd = MuPsFindChildGroupOrLayer(_templateState, "bgrd");
		if (templateBgrd) {
			try { MuPsDuplicateTree(templateBgrd, frame, "bgrd"); } catch (_bgrdErr) {}
		}
		var left = 17 + i * 6;
		var top = 28 + i * 4;
		MuPsCreateShapeLayer(frame, "marker", left, top, 76 - i * 8, 54 - i * 6, colors[i]);
	}
}
