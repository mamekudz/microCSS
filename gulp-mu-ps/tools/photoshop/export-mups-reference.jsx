// Exports PNG reference images from mups-reference.psd (Adobe ground truth for µPS tests).
//
// Usage (Photoshop):
//   File > Scripts > Browse... > export-mups-reference.jsx
//
// Output: examples/reference/out/  (one PNG per case, document/master resolution)
//   bc/<layout>/…                          — ButtonAndIconCreator (aqua, alu)
//   fx/, stacks/, blend/                   — layer effects, combined stacks, blend modes
//   flat/fx/                               — direct composite without glyph transfer
//   topsets/                               — CreateByTopLayerSets-style frames
//   links/, text/                          — layer links and text layers
//   compositing/                           — rainbow opacity / alpha test chart
//
// After export, run (Node):
//   node gulp-mu-ps/tools/build-reference-overview.mjs
//
// Re-runs skip PNGs that already exist under out/ (set MuPsExportSkipExisting = false to force all).
//
// Compare with µPS using retina: false (same resolution as the PSD master).

#target photoshop

var MuPsScriptDir = new File($.fileName).parent;

var __muPsLibFile = new File(MuPsScriptDir.fsName + "/MuPsReferenceLib.jsx");
__muPsLibFile.encoding = "UTF8";
__muPsLibFile.open("r");
eval(__muPsLibFile.read());
__muPsLibFile.close();
MuPsSetAnchorFolder(MuPsScriptDir);

var MuPsExportLogLines = null;
var MuPsExportSaveCount = 0;
var MuPsExportSkipCount = 0;
/** When true, existing output PNGs are not re-rendered (resume after interrupt). */
var MuPsExportSkipExisting = true;

function MuPsExportLog(_line) {
	if (!MuPsExportLogLines) return;
	MuPsExportLogLines.push(_line);
	MuPsWriteExportLog(MuPsExportLogLines.join("\n"));
}

function MuPsExportSave(_file) {
	MuPsSavePngReference(_file);
	MuPsExportSaveCount++;
	if (MuPsExportSaveCount % 10 === 0) MuPsPurgeHistory();
	MuPsExportLog("  " + _file.fsName);
}

// Runs _renderFn only when the target PNG is missing (or skip is disabled).
function MuPsExportMaybe(_file, _renderFn) {
	if (MuPsExportSkipExisting && _file.exists) {
		MuPsExportSkipCount++;
		MuPsExportLog("  skip " + _file.fsName);
		return false;
	}
	_renderFn();
	return true;
}

function MuPsExportLayoutGroupWithGlyph(_doc, _layoutGroup, _glyph, _icons, _outFile, _applyStyleFrom) {
	var stateSet = MuPsFindChildGroupOrLayer(_layoutGroup, "normal");
	var placeholder = stateSet ? MuPsFindChildGroupOrLayer(stateSet, "icon") : null;
	if (!stateSet) return;

	var outFile = new File(_outFile.fsName + ".png");
	MuPsExportMaybe(outFile, function () {
		MuPsExportGlyphFrame(
			stateSet,
			_glyph,
			_icons,
			(_applyStyleFrom && placeholder) ? placeholder : null,
			function () {
				MuPsExportSave(outFile);
			}
		);
	});
}

function MuPsExportFlatLayout(_doc, _layoutGroup, _outFile) {
	var stateSet = MuPsFindChildGroupOrLayer(_layoutGroup, "normal");
	if (!stateSet) return;
	MuPsExportMaybe(_outFile, function () {
		MuPsExportLayoutFrame(stateSet, null, function () {
			MuPsExportSave(_outFile);
		});
	});
}

function MuPsExportButtonMatrix(_doc, _layout, _outRoot) {
	var icons = MuPsFindByPath(_doc, ["icons"]);
	var layoutGroup = MuPsFindByPath(_doc, ["layouts", _layout]);
	if (!layoutGroup || !icons) return;

	var outDir = new Folder(_outRoot.fsName + "/bc/" + _layout);
	MuPsEnsureFolder(outDir);

	for (var s = 0; s < layoutGroup.layerSets.length; s++) {
		var stateSet = layoutGroup.layerSets[s];
		if (stateSet.name === "fx" || stateSet.name === "links" || stateSet.name === "stacks" || stateSet.name === "blend") continue;
		var placeholder = MuPsFindChildGroupOrLayer(stateSet, "icon");
		if (!placeholder) continue;

		for (var i = 0; i < icons.artLayers.length; i++) {
			var glyph = icons.artLayers[i];
			if (glyph.name === "_" || glyph.name.indexOf("glyph_") === 0) continue;
			if (glyph.layerSets && glyph.layerSets.length > 0) continue;

			(function (_glyph, _stateSet) {
				var baseName = _glyph.name + ((_stateSet.name === "_") ? "" : _stateSet.name);
				var outFile = new File(outDir.fsName + "/" + baseName + ".png");
				MuPsExportMaybe(outFile, function () {
					MuPsExportGlyphFrame(_stateSet, _glyph, icons, placeholder, function () {
						MuPsExportSave(outFile);
					});
				});
			})(glyph, stateSet);
		}
	}
}

function MuPsExportGlyphLayouts(_doc, _rootGroup, _outDir, _glyph, _icons, _flatDir) {
	if (!_rootGroup) return;
	MuPsEnsureFolder(_outDir);
	for (var f = 0; f < _rootGroup.layerSets.length; f++) {
		var layout = _rootGroup.layerSets[f];
		var outBase = new File(_outDir.fsName + "/" + layout.name);
		MuPsExportLayoutGroupWithGlyph(_doc, layout, _glyph, _icons, outBase, true);
		if (_flatDir) MuPsExportFlatLayout(_doc, layout, new File(_flatDir.fsName + "/" + layout.name + ".png"));
	}
}

function MuPsExportFxLayouts(_doc, _outRoot) {
	var fxRoot = MuPsFindByPath(_doc, ["layouts", "fx"]);
	var icons = MuPsFindByPath(_doc, ["icons"]);
	var glyph = MuPsFindChildGroupOrLayer(icons, "glyph_disc");
	if (!glyph) glyph = icons.artLayers[0];
	MuPsExportGlyphLayouts(_doc, fxRoot, new Folder(_outRoot.fsName + "/fx"), glyph, icons, new Folder(_outRoot.fsName + "/flat/fx"));
}

function MuPsExportStackLayouts(_doc, _outRoot) {
	var stacksRoot = MuPsFindByPath(_doc, ["layouts", "stacks"]);
	var icons = MuPsFindByPath(_doc, ["icons"]);
	var glyph = MuPsFindChildGroupOrLayer(icons, "glyph_disc");
	if (!glyph) glyph = icons.artLayers[0];
	MuPsExportGlyphLayouts(_doc, stacksRoot, new Folder(_outRoot.fsName + "/stacks"), glyph, icons, null);
}

function MuPsExportBlendLayouts(_doc, _outRoot) {
	var blendRoot = MuPsFindByPath(_doc, ["layouts", "blend"]);
	var icons = MuPsFindByPath(_doc, ["icons"]);
	var glyph = MuPsFindChildGroupOrLayer(icons, "glyph_disc");
	if (!glyph) glyph = icons.artLayers[0];
	MuPsExportGlyphLayouts(_doc, blendRoot, new Folder(_outRoot.fsName + "/blend"), glyph, icons, null);
}

function MuPsExportTopSets(_doc, _outRoot) {
	var topsets = MuPsFindChildGroupOrLayer(_doc, "topsets");
	if (!topsets) return;
	var outDir = new Folder(_outRoot.fsName + "/topsets");
	MuPsEnsureFolder(outDir);

	for (var i = 0; i < topsets.layerSets.length; i++) {
		var set = topsets.layerSets[i];
		(function (_set) {
			var outFile = new File(outDir.fsName + "/" + _set.name + ".png");
			MuPsExportMaybe(outFile, function () {
				MuPsExportLayoutFrame(_set, topsets, function () {
					MuPsExportSave(outFile);
				});
			});
		})(set);
	}
}

function MuPsExportLinksLayout(_doc, _outRoot) {
	var stateSet = MuPsFindByPath(_doc, ["layouts", "links", "normal"]);
	if (!stateSet) return;
	var outDir = new Folder(_outRoot.fsName + "/links");
	MuPsEnsureFolder(outDir);

	var outFile = new File(outDir.fsName + "/follower.png");
	MuPsExportMaybe(outFile, function () {
		MuPsExportLayoutFrame(stateSet, null, function () {
			MuPsExportSave(outFile);
		});
	});
}

function MuPsExportTextGlyphs(_doc, _outRoot) {
	var icons = MuPsFindByPath(_doc, ["icons"]);
	var aquaIcon = MuPsFindByPath(_doc, ["layouts", "aqua", "normal", "icon"]);
	if (!icons || !aquaIcon) return;

	var outDir = new Folder(_outRoot.fsName + "/text");
	MuPsEnsureFolder(outDir);
	var names = ["glyph_text", "glyph_text_light"];

	for (var i = 0; i < names.length; i++) {
		var glyph = MuPsFindChildGroupOrLayer(icons, names[i]);
		if (!glyph) continue;
		(function (_name, _glyph) {
			var outFile = new File(outDir.fsName + "/" + _name + ".png");
			MuPsExportMaybe(outFile, function () {
				MuPsExportGlyphFrame(null, _glyph, icons, aquaIcon, function () {
					MuPsExportSave(outFile);
				});
			});
		})(names[i], glyph);
	}
}

function MuPsExportCompositingLayouts(_doc, _outRoot) {
	var root = MuPsFindByPath(_doc, ["compositing"]);
	if (!root) return;
	var outRoot = new Folder(_outRoot.fsName + "/compositing");
	MuPsEnsureFolder(outRoot);

	for (var s = 0; s < root.layerSets.length; s++) {
		var section = root.layerSets[s];
		var sectionDir = new Folder(outRoot.fsName + "/" + section.name);
		MuPsEnsureFolder(sectionDir);
		for (var l = 0; l < section.layerSets.length; l++) {
			var layout = section.layerSets[l];
			var resolved = MuPsResolveCompositingExport(section, layout);
			if (!resolved) continue;
			(function (_layout, _stateSet, _sectionDir, _fileName) {
				var outFile = new File(_sectionDir.fsName + "/" + _fileName + ".png");
				MuPsExportMaybe(outFile, function () {
					MuPsExportLayoutFrame(_stateSet, _layout, function () {
						MuPsExportSave(outFile);
					});
				});
			})(layout, resolved.stateSet, sectionDir, resolved.fileName);
		}
	}
}

function MuPsExportReference() {
	var psd = new File(MuPsDraftsFolder().fsName + "/mups-reference.psd");
	if (!psd.exists) {
		MuPsAlert("mups-reference.psd not found.\nRun build-mups-reference.jsx first.\n\nExpected:\n" + psd.fsName);
		return;
	}

	MuPsExportLogLines = [
		"export-mups-reference (single master resolution, no history rollback)",
		"skip existing: " + (MuPsExportSkipExisting ? "yes" : "no"),
		"started: " + new Date().toString(),
		""
	];
	MuPsExportSaveCount = 0;
	MuPsExportSkipCount = 0;
	var savedDialogMode = app.displayDialogs;
	var doc = null;

	try {
		app.displayDialogs = DialogModes.NO;
		doc = app.open(psd);
		MuPsPurgeHistory();
		var outRoot = MuPsReferenceOutFolder();
		MuPsEnsureFolder(outRoot);

		MuPsExportLog("bc/aqua");
		MuPsExportButtonMatrix(doc, "aqua", outRoot);
		MuPsExportLog("bc/alu");
		MuPsExportButtonMatrix(doc, "alu", outRoot);
		MuPsExportLog("fx");
		MuPsExportFxLayouts(doc, outRoot);
		MuPsExportLog("stacks");
		MuPsExportStackLayouts(doc, outRoot);
		MuPsExportLog("blend");
		MuPsExportBlendLayouts(doc, outRoot);
		MuPsExportLog("topsets");
		MuPsExportTopSets(doc, outRoot);
		MuPsExportLog("links");
		MuPsExportLinksLayout(doc, outRoot);
		MuPsExportLog("text");
		MuPsExportTextGlyphs(doc, outRoot);
		MuPsExportLog("compositing");
		MuPsExportCompositingLayouts(doc, outRoot);

		doc.close(SaveOptions.DONOTSAVECHANGES);
		doc = null;
		MuPsExportLog("status: OK (" + MuPsExportSaveCount + " written, " + MuPsExportSkipCount + " skipped)");
		MuPsExportLog("next: node gulp-mu-ps/tools/build-reference-overview.mjs");
		MuPsAlert(
			"Reference export finished:\n" +
			MuPsExportSaveCount + " PNGs written, " + MuPsExportSkipCount + " skipped (already present)\n\n" +
			outRoot.fsName + "\n\nThen run:\n  node gulp-mu-ps/tools/build-reference-overview.mjs"
		);
	} catch (err) {
		var msg = (err && err.message) ? err.message : String(err);
		if (err && err.line) msg += "\n(line " + err.line + ")";
		MuPsExportLog("status: FAILED");
		MuPsExportLog(msg);
		MuPsAlert("export-mups-reference failed:\n\n" + msg + "\n\nSee mups-reference-export.log");
		try { if (doc) doc.close(SaveOptions.DONOTSAVECHANGES); } catch (_closeErr) {}
	} finally {
		app.displayDialogs = savedDialogMode;
		MuPsExportLogLines = null;
	}
}

try {
	if (typeof MuPsFindSampleButtonsPsd !== "function") {
		throw new Error("MuPsReferenceLib.jsx did not load.");
	}
	MuPsExportReference();
} catch (err) {
	var msg = (err && err.message) ? err.message : String(err);
	if (err && err.line) msg += "\n(line " + err.line + ")";
	MuPsAlert("export-mups-reference could not start:\n\n" + msg);
}
