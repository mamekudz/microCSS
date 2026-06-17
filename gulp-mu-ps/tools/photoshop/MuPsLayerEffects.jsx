// Layer effect helpers for µPS reference drafts (Action Manager / setd).
// Loaded via $.evalFile (no #target here).

function MuPsSetLayerEffects(_effectDesc) {
	var doc = app.activeDocument;
	var desc = new ActionDescriptor();
	var ref = new ActionReference();
	ref.putProperty(MuPsCharID("Prpr"), MuPsCharID("Lefx"));
	ref.putEnumerated(MuPsCharID("Lyr "), MuPsCharID("Ordn"), MuPsCharID("Trgt"));
	desc.putReference(MuPsCharID("null"), ref);
	var wrapper = new ActionDescriptor();
	wrapper.putUnitDouble(MuPsCharID("Scl "), MuPsCharID("#Prc"), 100);
	for (var key in _effectDesc) {
		if (_effectDesc.hasOwnProperty(key)) wrapper.putObject(MuPsCharID(key), MuPsCharID(key), _effectDesc[key]);
	}
	desc.putObject(MuPsCharID("T   "), MuPsCharID("Lefx"), wrapper);
	executeAction(MuPsCharID("setd"), desc, DialogModes.NO);
}

function MuPsRgbDesc(_r, _g, _b) {
	var d = new ActionDescriptor();
	d.putDouble(MuPsCharID("Rd  "), _r);
	d.putDouble(MuPsCharID("Grn "), _g);
	d.putDouble(MuPsCharID("Bl  "), _b);
	return d;
}

function MuPsLinearContour() {
	var d = new ActionDescriptor();
	d.putString(MuPsCharID("Nm  "), "Linear");
	var curve = new ActionDescriptor();
	curve.putString(MuPsCharID("Nm  "), "Linear");
	d.putObject(MuPsCharID("TrnS"), MuPsCharID("ShpC"), curve);
	return d;
}

function MuPsApplySolidFill(_layer, _rgb, _opacity, _blend) {
	app.activeDocument.activeLayer = _layer;
	var fx = new ActionDescriptor();
	fx.putBoolean(MuPsCharID("enab"), true);
	fx.putEnumerated(MuPsCharID("Md  "), MuPsCharID("BlnM"), MuPsCharID(_blend || "Nrml"));
	fx.putUnitDouble(MuPsCharID("Opct"), MuPsCharID("#Prc"), (_opacity || 1) * 100);
	fx.putObject(MuPsCharID("Clr "), MuPsCharID("RGBC"), MuPsRgbDesc(_rgb[0], _rgb[1], _rgb[2]));
	MuPsSetLayerEffects({ SoFi: fx });
}

function MuPsApplyDropShadow(_layer, _opts) {
	app.activeDocument.activeLayer = _layer;
	var fx = new ActionDescriptor();
	fx.putBoolean(MuPsCharID("enab"), true);
	fx.putEnumerated(MuPsCharID("Md  "), MuPsCharID("BlnM"), MuPsCharID(_opts.blend || "Mltp"));
	fx.putUnitDouble(MuPsCharID("Opct"), MuPsCharID("#Prc"), (_opts.opacity || 0.75) * 100);
	fx.putBoolean(MuPsCharID("uglg"), false);
	fx.putUnitDouble(MuPsCharID("lagl"), MuPsCharID("#Ang"), _opts.angle || 120);
	fx.putUnitDouble(MuPsCharID("Dstn"), MuPsCharID("#Pxl"), _opts.distance || 4);
	fx.putUnitDouble(MuPsCharID("Ckmt"), MuPsCharID("#Pxl"), _opts.spread || 0);
	fx.putUnitDouble(MuPsCharID("blur"), MuPsCharID("#Pxl"), _opts.size || 8);
	fx.putObject(MuPsCharID("Clr "), MuPsCharID("RGBC"), MuPsRgbDesc(0, 0, 0));
	fx.putObject(MuPsCharID("TrnS"), MuPsCharID("ShpC"), MuPsLinearContour());
	MuPsSetLayerEffects({ DrSh: fx });
}

function MuPsApplyInnerShadow(_layer, _opts) {
	app.activeDocument.activeLayer = _layer;
	var fx = new ActionDescriptor();
	fx.putBoolean(MuPsCharID("enab"), true);
	fx.putEnumerated(MuPsCharID("Md  "), MuPsCharID("BlnM"), MuPsCharID(_opts.blend || "Mltp"));
	fx.putUnitDouble(MuPsCharID("Opct"), MuPsCharID("#Prc"), (_opts.opacity || 0.5) * 100);
	fx.putBoolean(MuPsCharID("uglg"), false);
	fx.putUnitDouble(MuPsCharID("lagl"), MuPsCharID("#Ang"), _opts.angle || 90);
	fx.putUnitDouble(MuPsCharID("Dstn"), MuPsCharID("#Pxl"), _opts.distance || 2);
	fx.putUnitDouble(MuPsCharID("Ckmt"), MuPsCharID("#Pxl"), _opts.spread || 14);
	fx.putUnitDouble(MuPsCharID("blur"), MuPsCharID("#Pxl"), _opts.size || 7);
	fx.putObject(MuPsCharID("Clr "), MuPsCharID("RGBC"), MuPsRgbDesc(0, 0, 0));
	fx.putObject(MuPsCharID("TrnS"), MuPsCharID("ShpC"), MuPsLinearContour());
	MuPsSetLayerEffects({ IrSh: fx });
}

function MuPsApplyInnerGlow(_layer, _opts) {
	app.activeDocument.activeLayer = _layer;
	var fx = new ActionDescriptor();
	fx.putBoolean(MuPsCharID("enab"), true);
	fx.putEnumerated(MuPsCharID("Md  "), MuPsCharID("BlnM"), MuPsCharID(_opts.blend || "Scrn"));
	fx.putUnitDouble(MuPsCharID("Opct"), MuPsCharID("#Prc"), (_opts.opacity || 0.8) * 100);
	fx.putEnumerated(MuPsCharID("GlwT"), MuPsCharID("BETE"), MuPsCharID("SfBL"));
	fx.putUnitDouble(MuPsCharID("Ckmt"), MuPsCharID("#Pxl"), _opts.spread || 0);
	fx.putUnitDouble(MuPsCharID("blur"), MuPsCharID("#Pxl"), _opts.size || 8);
	fx.putUnitDouble(MuPsCharID("Nose"), MuPsCharID("#Prc"), 0);
	fx.putObject(MuPsCharID("Clr "), MuPsCharID("RGBC"), MuPsRgbDesc(_opts.rgb[0], _opts.rgb[1], _opts.rgb[2]));
	fx.putUnitDouble(MuPsCharID("Inpr"), MuPsCharID("#Prc"), (_opts.range || 0.5) * 100);
	fx.putObject(MuPsCharID("TrnS"), MuPsCharID("ShpC"), MuPsLinearContour());
	MuPsSetLayerEffects({ IrGl: fx });
}

function MuPsApplyOuterGlow(_layer, _opts) {
	app.activeDocument.activeLayer = _layer;
	var fx = new ActionDescriptor();
	fx.putBoolean(MuPsCharID("enab"), true);
	fx.putEnumerated(MuPsCharID("Md  "), MuPsCharID("BlnM"), MuPsCharID(_opts.blend || "Scrn"));
	fx.putUnitDouble(MuPsCharID("Opct"), MuPsCharID("#Prc"), (_opts.opacity || 0.9) * 100);
	fx.putEnumerated(MuPsCharID("GlwT"), MuPsCharID("BETE"), MuPsCharID("SfBL"));
	fx.putUnitDouble(MuPsCharID("Ckmt"), MuPsCharID("#Pxl"), _opts.spread || 0);
	fx.putUnitDouble(MuPsCharID("blur"), MuPsCharID("#Pxl"), _opts.size || 10);
	fx.putObject(MuPsCharID("Clr "), MuPsCharID("RGBC"), MuPsRgbDesc(_opts.rgb[0], _opts.rgb[1], _opts.rgb[2]));
	fx.putUnitDouble(MuPsCharID("Inpr"), MuPsCharID("#Prc"), (_opts.range || 0.5) * 100);
	fx.putObject(MuPsCharID("TrnS"), MuPsCharID("ShpC"), MuPsLinearContour());
	MuPsSetLayerEffects({ OrGl: fx });
}

function MuPsApplyGradientOverlay(_layer, _opts) {
	app.activeDocument.activeLayer = _layer;
	var fx = new ActionDescriptor();
	fx.putBoolean(MuPsCharID("enab"), true);
	fx.putEnumerated(MuPsCharID("Md  "), MuPsCharID("BlnM"), MuPsCharID(_opts.blend || "Ovrl"));
	fx.putUnitDouble(MuPsCharID("Opct"), MuPsCharID("#Prc"), (_opts.opacity || 1) * 100);
	fx.putUnitDouble(MuPsCharID("Angl"), MuPsCharID("#Ang"), _opts.angle || 90);
	fx.putBoolean(MuPsCharID("Rvrs"), !!_opts.reverse);
	fx.putEnumerated(MuPsCharID("Type"), MuPsCharID("GrdT"), MuPsCharID("Lnr "));
	var grad = new ActionDescriptor();
	grad.putString(MuPsCharID("Nm  "), "MuPS test");
	grad.putEnumerated(MuPsCharID("GrdF"), MuPsCharID("GrdF"), MuPsCharID("CstS"));
	var colors = new ActionList();
	var stopA = new ActionDescriptor();
	stopA.putEnumerated(MuPsCharID("Type"), MuPsCharID("Clry"), MuPsCharID("UsrS"));
	stopA.putInteger(MuPsCharID("Lctn"), 0);
	stopA.putInteger(MuPsCharID("Mdpn"), 50);
	stopA.putObject(MuPsCharID("Clr "), MuPsCharID("RGBC"), MuPsRgbDesc(_opts.from[0], _opts.from[1], _opts.from[2]));
	colors.putObject(MuPsCharID("Clrt"), stopA);
	var stopB = new ActionDescriptor();
	stopB.putEnumerated(MuPsCharID("Type"), MuPsCharID("Clry"), MuPsCharID("UsrS"));
	stopB.putInteger(MuPsCharID("Lctn"), 4096);
	stopB.putInteger(MuPsCharID("Mdpn"), 50);
	stopB.putObject(MuPsCharID("Clr "), MuPsCharID("RGBC"), MuPsRgbDesc(_opts.to[0], _opts.to[1], _opts.to[2]));
	colors.putObject(MuPsCharID("Clrt"), stopB);
	grad.putList(MuPsCharID("Clrs"), colors);
	var trans = new ActionList();
	var tA = new ActionDescriptor();
	tA.putInteger(MuPsCharID("Lctn"), 0);
	tA.putInteger(MuPsCharID("Mdpn"), 50);
	tA.putUnitDouble(MuPsCharID("Opct"), MuPsCharID("#Prc"), 100);
	trans.putObject(MuPsCharID("TrnS"), tA);
	var tB = new ActionDescriptor();
	tB.putInteger(MuPsCharID("Lctn"), 4096);
	tB.putInteger(MuPsCharID("Mdpn"), 50);
	tB.putUnitDouble(MuPsCharID("Opct"), MuPsCharID("#Prc"), 100);
	trans.putObject(MuPsCharID("TrnS"), tB);
	grad.putList(MuPsCharID("Trns"), trans);
	fx.putObject(MuPsCharID("Grad"), MuPsCharID("Grdn"), grad);
	MuPsSetLayerEffects({ GrFl: fx });
}

function MuPsApplyBevel(_layer, _opts) {
	app.activeDocument.activeLayer = _layer;
	var fx = new ActionDescriptor();
	fx.putBoolean(MuPsCharID("enab"), true);
	fx.putEnumerated(MuPsCharID("Styl"), MuPsCharID("BESl"), MuPsCharID(_opts.style || "InrB"));
	fx.putEnumerated(MuPsCharID("Hght"), MuPsCharID("BESh"), MuPsCharID(_opts.technique || "SfBL"));
	fx.putUnitDouble(MuPsCharID("Sftn"), MuPsCharID("#Pxl"), _opts.soften || 0);
	fx.putUnitDouble(MuPsCharID("blur"), MuPsCharID("#Pxl"), _opts.size || 5);
	fx.putUnitDouble(MuPsCharID("Scl "), MuPsCharID("#Prc"), _opts.strength || 100);
	fx.putUnitDouble(MuPsCharID("Angl"), MuPsCharID("#Ang"), _opts.angle || 120);
	fx.putUnitDouble(MuPsCharID("Lald"), MuPsCharID("#Ang"), _opts.altitude || 30);
	fx.putEnumerated(MuPsCharID("hglM"), MuPsCharID("BlnM"), MuPsCharID(_opts.highlightMode || "Scrn"));
	fx.putUnitDouble(MuPsCharID("hglO"), MuPsCharID("#Prc"), (_opts.highlightOpacity || 0.75) * 100);
	fx.putObject(MuPsCharID("hglC"), MuPsCharID("RGBC"), MuPsRgbDesc(255, 255, 255));
	fx.putEnumerated(MuPsCharID("sdwM"), MuPsCharID("BlnM"), MuPsCharID(_opts.shadowMode || "Mltp"));
	fx.putUnitDouble(MuPsCharID("sdwO"), MuPsCharID("#Prc"), (_opts.shadowOpacity || 0.75) * 100);
	fx.putObject(MuPsCharID("sdwC"), MuPsCharID("RGBC"), MuPsRgbDesc(0, 0, 0));
	MuPsSetLayerEffects({ ebbl: fx });
}

// Named presets for isolated effect tests and µPS tuning (visual match, not bit-exact).
function MuPsApplyEffectProfile(_layer, _profile) {
	switch (_profile) {
		case "solidFill":
			MuPsApplySolidFill(_layer, [0, 103, 231], 1, "Nrml");
			break;
		case "solidFill_multiply":
			MuPsApplySolidFill(_layer, [40, 90, 180], 0.65, "Mltp");
			break;
		case "dropShadow":
			MuPsApplyDropShadow(_layer, { opacity: 0.55, distance: 4, size: 10, angle: 120 });
			break;
		case "dropShadow_soft":
			MuPsApplyDropShadow(_layer, { opacity: 0.4, distance: 6, size: 18, angle: 120 });
			break;
		case "dropShadow_hard":
			MuPsApplyDropShadow(_layer, { opacity: 0.7, distance: 2, size: 3, spread: 35, angle: 135 });
			break;
		case "innerShadow":
			MuPsApplyInnerShadow(_layer, { opacity: 0.21, distance: 2, spread: 14, size: 7, angle: 90, blend: "CBrn" });
			break;
		case "innerShadow_aqua":
			MuPsApplyInnerShadow(_layer, { opacity: 0.21, distance: 2, spread: 14, size: 7, angle: 90, blend: "CBrn" });
			break;
		case "innerShadow_multiply":
			MuPsApplyInnerShadow(_layer, { opacity: 0.45, distance: 3, spread: 0, size: 12, angle: 120, blend: "Mltp" });
			break;
		case "innerShadow_wide":
			MuPsApplyInnerShadow(_layer, { opacity: 0.35, distance: 0, spread: 0, size: 16, angle: 90, blend: "Mltp" });
			break;
		case "innerGlow":
			MuPsApplyInnerGlow(_layer, { rgb: [255, 255, 255], opacity: 0.71, size: 7, range: 0.52 });
			break;
		case "innerGlow_tight":
			MuPsApplyInnerGlow(_layer, { rgb: [255, 255, 255], opacity: 0.85, size: 4, range: 0.2 });
			break;
		case "innerGlow_warm":
			MuPsApplyInnerGlow(_layer, { rgb: [255, 180, 80], opacity: 0.75, size: 10, range: 0.55, blend: "Scrn" });
			break;
		case "outerGlow":
			MuPsApplyOuterGlow(_layer, { rgb: [255, 220, 80], opacity: 0.85, size: 12 });
			break;
		case "outerGlow_soft":
			MuPsApplyOuterGlow(_layer, { rgb: [255, 200, 60], opacity: 0.6, size: 22, range: 0.65 });
			break;
		case "outerGlow_white":
			MuPsApplyOuterGlow(_layer, { rgb: [255, 255, 255], opacity: 0.9, size: 14, range: 0.5 });
			break;
		case "gradientOverlay":
			MuPsApplyGradientOverlay(_layer, { from: [0, 80, 200], to: [0, 180, 255], angle: 90, opacity: 0.9 });
			break;
		case "gradientOverlay_diag":
			MuPsApplyGradientOverlay(_layer, { from: [20, 40, 120], to: [0, 200, 255], angle: 45, opacity: 0.95 });
			break;
		case "gradientOverlay_reverse":
			MuPsApplyGradientOverlay(_layer, { from: [0, 180, 255], to: [0, 80, 200], angle: 90, opacity: 0.9, reverse: true });
			break;
		case "bevelInner":
			MuPsApplyBevel(_layer, { style: "InrB", size: 4, strength: 100, technique: "SfBL" });
			break;
		case "bevelInner_chisel":
			MuPsApplyBevel(_layer, { style: "InrB", size: 5, strength: 120, technique: "PrBl", highlightOpacity: 0.9, shadowOpacity: 0.85 });
			break;
		case "bevelPillow":
			MuPsApplyBevel(_layer, { style: "PlEb", size: 6, strength: 80, soften: 2, technique: "SfBL" });
			break;
		case "bevelOuter":
			MuPsApplyBevel(_layer, { style: "OrBl", size: 5, strength: 100, technique: "SfBL" });
			break;
		case "bevelEmboss":
			MuPsApplyBevel(_layer, { style: "Embs", size: 4, strength: 90, technique: "SfBL" });
			break;
		default:
			throw new Error("Unknown effect profile: " + _profile);
	}
}
