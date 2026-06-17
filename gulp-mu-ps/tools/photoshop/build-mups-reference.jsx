// Builds examples/drafts/mups-reference.psd from the legacy buttons.psd template.
//
// Usage (Photoshop):
//   File > Scripts > Browse... > build-mups-reference.jsx
//
// Requires buttons.psd in examples/drafts/

#target photoshop

var MuPsScriptDir = new File($.fileName).parent;

var __muPsLibFile = new File(MuPsScriptDir.fsName + "/MuPsReferenceLib.jsx");
__muPsLibFile.encoding = "UTF8";
__muPsLibFile.open("r");
eval(__muPsLibFile.read());
__muPsLibFile.close();

var __muPsFxFile = new File(MuPsScriptDir.fsName + "/MuPsLayerEffects.jsx");
__muPsFxFile.encoding = "UTF8";
__muPsFxFile.open("r");
eval(__muPsFxFile.read());
__muPsFxFile.close();

MuPsSetAnchorFolder(MuPsScriptDir);

function MuPsBuildLinksLayout(_layoutsRoot, _templateState, _aquaIcon) {
	var linksRoot = MuPsAddGroup(_layoutsRoot, "links");
	var state = MuPsCreateStateSetFromTemplate(linksRoot, "normal", _templateState, _aquaIcon);
	var icon = MuPsFindChildGroupOrLayer(state, "icon");
	var follower = MuPsCreateShapeLayer(state, "follower", 17, 28, 76, 54, [200, 200, 200]);
	MuPsCopyLayerEffects(icon, follower);
	follower.blendMode = BlendMode.MULTIPLY;
	MuPsLinkLayers(icon, follower);
	icon.name = "icon_master";
	return linksRoot;
}

function MuPsAddReferenceIcons(_iconsGroup) {
	try { MuPsCreateTextLayer(_iconsGroup, "glyph_text", "MuPS", 24, 36, 22, "Arial-BoldMT"); } catch (_t1) {}
	try { MuPsCreateTextLayer(_iconsGroup, "glyph_text_light", "abc", 30, 40, 18, "ArialMT"); } catch (_t2) {}
	var group = MuPsAddGroup(_iconsGroup, "glyph_group");
	MuPsCreateShapeLayer(group, "part_a", 20, 30, 34, 34, [60, 60, 60]);
	MuPsCreateShapeLayer(group, "part_b", 44, 44, 28, 28, [120, 120, 120]);
	if (!MuPsFindChildGroupOrLayer(_iconsGroup, "glyph_disc")) {
		MuPsCreateShapeLayer(_iconsGroup, "glyph_disc", 30, 30, 50, 50, [90, 90, 90]);
	}
}

function MuPsBuildReference() {
	var sampleFile = MuPsFindSampleButtonsPsd();
	var outFolder = MuPsDraftsFolder();
	var outFile = new File(outFolder.fsName + "/mups-reference.psd");
	var logLines = ["build-mups-reference", "started: " + new Date().toString(), ""];

	if (!sampleFile) {
		MuPsWriteBuildLog("mups-reference-build.log", "FAILED: buttons.psd not found\n" + outFolder.fsName);
		MuPsAlert("buttons.psd not found.\n\nExpected:\n" + outFolder.fsName + "\\buttons.psd");
		return;
	}

	var sampleDoc = null;
	var doc = null;
	var savedDialogMode = app.displayDialogs;

	try {
		app.displayDialogs = DialogModes.NO;
		logLines.push("source: " + sampleFile.fsName);
		sampleDoc = app.open(sampleFile);
		doc = sampleDoc.duplicate("mups-reference");
		try { doc.info.author = "gulp-mu-ps reference builder"; } catch (metaErr) {}

		var layouts = MuPsFindByPath(doc, ["layouts"]);
		var aquaNormal = MuPsFindByPath(doc, ["layouts", "aqua", "normal"]);
		var aluNormal = MuPsFindByPath(doc, ["layouts", "alu", "normal"]);
		if (!layouts || !aquaNormal) {
			throw new Error("buttons.psd has no layouts/aqua/normal group.");
		}

		var aquaIcon = MuPsFindChildGroupOrLayer(aquaNormal, "icon");
		var aluIcon = aluNormal ? MuPsFindChildGroupOrLayer(aluNormal, "icon") : null;
		var aquaBgrd = MuPsFindChildGroupOrLayer(aquaNormal, "bgrd");
		var aquaBgrdFx = aquaBgrd ? MuPsFindLayerWithEffects(aquaBgrd) : null;
		if (!aquaIcon) throw new Error("layouts/aqua/normal/icon not found.");

		var profiles = [
			"solidFill", "solidFill_multiply",
			"dropShadow", "dropShadow_soft", "dropShadow_hard",
			"innerShadow", "innerShadow_aqua", "innerShadow_multiply", "innerShadow_wide",
			"innerGlow", "innerGlow_tight", "innerGlow_warm",
			"outerGlow", "outerGlow_soft", "outerGlow_white",
			"gradientOverlay", "gradientOverlay_diag", "gradientOverlay_reverse",
			"strokeOutside", "strokeInside", "strokeCenter", "strokeMultiply",
			"satin", "satin_warm", "satin_invert"
		];
		for (var i = 0; i < profiles.length; i++) {
			logLines.push("fx: " + profiles[i]);
			MuPsBuildFxLayout(layouts, aquaNormal, profiles[i], profiles[i], null);
		}

		logLines.push("fx: bevelInner (copy from aqua icon)");
		MuPsBuildFxLayout(layouts, aquaNormal, "bevelInner", "bevelInner", aquaIcon);
		var bevelVariants = ["bevelInner_chisel", "bevelPillow", "bevelOuter", "bevelEmboss"];
		for (var bv = 0; bv < bevelVariants.length; bv++) {
			logLines.push("fx: " + bevelVariants[bv]);
			if (!MuPsBuildFxLayoutOptional(layouts, aquaNormal, bevelVariants[bv], bevelVariants[bv], null)) {
				logLines.push("skipped: " + bevelVariants[bv]);
			}
		}

		logLines.push("stacks");
		var stackEntries = [["stack_aquaIcon", aquaIcon]];
		if (aquaBgrdFx) stackEntries.push(["stack_aquaBgrd", aquaBgrdFx]);
		if (aluIcon) stackEntries.push(["stack_aluIcon", aluIcon]);
		MuPsBuildStackLayouts(layouts, aquaNormal, stackEntries);

		logLines.push("blend");
		MuPsBuildBlendLayouts(layouts, aquaNormal, aquaIcon, [
			["blend_normal", BlendMode.NORMAL],
			["blend_multiply", BlendMode.MULTIPLY],
			["blend_screen", BlendMode.SCREEN],
			["blend_overlay", BlendMode.OVERLAY],
			["blend_darken", BlendMode.DARKEN],
			["blend_lighten", BlendMode.LIGHTEN],
			["blend_colorBurn", BlendMode.COLORBURN]
		]);

		logLines.push("links");
		MuPsBuildLinksLayout(layouts, aquaNormal, aquaIcon);
		logLines.push("icons");
		var iconsGroup = MuPsFindByPath(doc, ["icons"]);
		if (!iconsGroup) throw new Error("icons group not found.");
		MuPsAddReferenceIcons(iconsGroup);
		logLines.push("topsets");
		MuPsBuildTopSetsDemo(doc, aquaNormal);
		logLines.push("compositing");
		MuPsBuildCompositingChart(doc);

		MuPsEnsureFolder(outFolder);
		logLines.push("target: " + outFile.fsName);
		doc.saveAs(outFile, new PhotoshopSaveOptions(), true, Extension.LOWERCASE);
		if (!outFile.exists) {
			throw new Error("saveAs finished but file missing:\n" + outFile.fsName);
		}

		sampleDoc.close(SaveOptions.DONOTSAVECHANGES);
		sampleDoc = null;
		doc.close(SaveOptions.DONOTSAVECHANGES);
		doc = null;

		logLines.push("status: OK");
		MuPsWriteBuildLog("mups-reference-build.log", logLines.join("\n"));
		MuPsAlert("Saved:\n" + outFile.fsName);
	} catch (err) {
		var msg = (err && err.message) ? err.message : String(err);
		if (err && err.line) msg += "\n(line " + err.line + ")";
		msg += "\n\nOutput target:\n" + outFile.fsName;
		msg += "\n\nIf document mups-reference is still open: File > Save As there.";
		logLines.push("status: FAILED");
		logLines.push(msg);
		MuPsWriteBuildLog("mups-reference-build.log", logLines.join("\n"));
		MuPsAlert("build-mups-reference failed:\n\n" + msg);
		try { if (sampleDoc) sampleDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (e1) {}
	} finally {
		app.displayDialogs = savedDialogMode;
	}
}

try {
	if (typeof MuPsFindSampleButtonsPsd !== "function") {
		throw new Error("MuPsReferenceLib.jsx did not load.");
	}
	if (typeof MuPsApplyEffectProfile !== "function") {
		throw new Error("MuPsLayerEffects.jsx did not load.");
	}
	MuPsBuildReference();
} catch (err) {
	var msg = (err && err.message) ? err.message : String(err);
	if (err && err.line) msg += "\n(line " + err.line + ")";
	MuPsAlert("build-mups-reference could not start:\n\n" + msg);
}
