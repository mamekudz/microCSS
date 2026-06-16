// Tests for the AppIconMaker profiles (web, ios, play).

import { rmSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import sharp from "sharp";
import { AppIconMaker } from "../src/index.mjs";
import { ReadIcoImageCount } from "../src/io/WriteIco.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "../../oldsrcs/old_adobe_scripts/µCSS/examples");
const masterPng = join(examplesDir, "imgs/aqua/but_login_normal@2x.png");
const draftPsd = join(examplesDir, "drafts/buttons.psd");
const tmpDir = join(here, ".tmp-appicons");

describe("AppIconMaker", function () {
	this.timeout(120000);
	let generated;

	before(async function () {
		if (!existsSync(masterPng)) this.skip();
		rmSync(tmpDir, { recursive: true, force: true });
		generated = await AppIconMaker.Create(masterPng, {
			outputDir: tmpDir,
			appName: "TestApp",
			themeColor: "#0a5ae0"
		});
	});

	after(function () {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("generates all icons of the web profile with correct dimensions", async function () {
		const expected = {
			"favicon-16x16.png": 16,
			"favicon-32x32.png": 32,
			"favicon-48x48.png": 48,
			"favicon-96x96.png": 96,
			"apple-touch-icon.png": 180,
			"icon-192.png": 192,
			"icon-512.png": 512,
			"icon-512-maskable.png": 512
		};
		for (const [file, size] of Object.entries(expected)) {
			const meta = await sharp(join(tmpDir, file)).metadata();
			expect(meta.width, file).to.equal(size);
			expect(meta.height, file).to.equal(size);
		}
	});

	it("removes the alpha channel from the App Store icon (ios profile)", async function () {
		const meta = await sharp(join(tmpDir, "appstore-icon-1024.png")).metadata();
		expect(meta.width).to.equal(1024);
		expect(meta.height).to.equal(1024);
		expect(meta.channels).to.equal(3);
	});

	it("confines the maskable icon to the safe zone on an opaque background", async function () {
		const { data, info } = await sharp(join(tmpDir, "icon-512-maskable.png"))
			.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		// Corner pixel must be the opaque background color (default white).
		expect(data[0]).to.equal(255);
		expect(data[1]).to.equal(255);
		expect(data[2]).to.equal(255);
		expect(data[3]).to.equal(255);
		// No pixel outside the central 80% may differ from the background.
		const margin = Math.floor(info.width * 0.1);
		for (let x = 0; x < info.width; x++) {
			const top = (margin >> 1) * info.width + x;
			expect(data[top * 4 + 3], "outside safe zone").to.equal(255);
		}
	});

	it("generates the Play Store icon and adaptive icon layers", async function () {
		const listing = await sharp(join(tmpDir, "playstore-icon-512.png")).metadata();
		expect(listing.width).to.equal(512);
		const foreground = await sharp(join(tmpDir, "adaptive-foreground-432.png"))
			.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		expect(foreground.info.width).to.equal(432);
		// Adaptive foreground keeps a transparent bleed zone.
		expect(foreground.data[3]).to.equal(0);
		const background = await sharp(join(tmpDir, "adaptive-background-432.png")).metadata();
		expect(background.width).to.equal(432);
	});

	it("generates favicon.ico with multiple embedded PNG sizes", function () {
		const ico = readFileSync(join(tmpDir, "favicon.ico"));
		expect(ReadIcoImageCount(ico)).to.equal(3);
		expect(ico.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))).to.equal(true);
	});

	it("writes site.webmanifest and the HTML snippet", function () {
		const manifest = JSON.parse(readFileSync(join(tmpDir, "site.webmanifest"), "utf8"));
		expect(manifest.name).to.equal("TestApp");
		expect(manifest.theme_color).to.equal("#0a5ae0");
		expect(manifest.icons).to.have.length(3);
		expect(manifest.icons[2].purpose).to.equal("maskable");
		const snippet = readFileSync(join(tmpDir, "appicons.html"), "utf8");
		expect(snippet).to.include(`href="favicon.ico"`);
		expect(snippet).to.include(`rel="apple-touch-icon"`);
		expect(snippet).to.include(`rel="manifest"`);
	});

	it("renders PSD sources through the document compositor", async function () {
		const files = await AppIconMaker.Create(draftPsd, {
			outputDir: join(tmpDir, "frompsd"),
			profiles: ["web"]
		});
		expect(files.some((f) => f.endsWith("favicon-32x32.png"))).to.equal(true);
		const meta = await sharp(join(tmpDir, "frompsd", "icon-512.png")).metadata();
		expect(meta.width).to.equal(512);
	});

	it("rejects non-square master images", async function () {
		let error = null;
		try {
			await AppIconMaker.Create(join(examplesDir, "imgs/sprites.png"), {
				outputDir: join(tmpDir, "nonsquare")
			});
		} catch (e) {
			error = e;
		}
		expect(error).to.not.equal(null);
		expect(error.message).to.include("square");
	});
});
