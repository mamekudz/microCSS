import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import http from "node:http";
import { expect } from "chai";
import { OpenDrafts, ResolveAffinityExecutable } from "../src/io/OpenDrafts.mjs";
import {
	BuildPhotopeaUrl,
	CreatePhotopeaDraftServer,
	WritePhotopeaSaveBack
} from "../src/io/PhotopeaDraftServer.mjs";
import { OpenPhotopeaDrafts } from "../src/io/OpenPhotopeaDrafts.mjs";
import { WatchDrafts } from "../src/io/WatchDrafts.mjs";

describe("OpenDrafts", function () {
	it("throws when a draft file is missing", function () {
		expect(() => OpenDrafts(["/nonexistent/draft.psd"])).to.throw(/not found/);
	});

	it("throws when app is photopea (use OpenPhotopeaDrafts)", function () {
		const dir = mkdtempSync(join(tmpdir(), "mups-open-"));
		const psd = join(dir, "draft.psd");
		writeFileSync(psd, "x");
		try {
			expect(() => OpenDrafts([psd], { app: "photopea" })).to.throw(/OpenPhotopeaDrafts/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("ResolveAffinityExecutable respects MU_AFFINITY_EXE", function () {
		const dir = mkdtempSync(join(tmpdir(), "mups-open-"));
		const fakeExe = join(dir, process.platform === "win32" ? "Photo.exe" : "Affinity.app");
		writeFileSync(fakeExe, "");
		const previous = process.env.MU_AFFINITY_EXE;
		process.env.MU_AFFINITY_EXE = fakeExe;
		try {
			expect(ResolveAffinityExecutable()).to.equal(fakeExe);
		} finally {
			if (previous === undefined) delete process.env.MU_AFFINITY_EXE;
			else process.env.MU_AFFINITY_EXE = previous;
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("PhotopeaDraftServer", function () {
	it("BuildPhotopeaUrl encodes files and server config", function () {
		const url = BuildPhotopeaUrl({
			files: ["http://127.0.0.1:9/draft.psd"],
			serverUrl: "http://127.0.0.1:9/save",
			formats: ["psd:true"]
		});
		expect(url).to.match(/^https:\/\/www\.photopea\.com#/);
		const json = decodeURIComponent(url.slice(url.indexOf("#") + 1));
		const payload = JSON.parse(json);
		expect(payload.files).to.deep.equal(["http://127.0.0.1:9/draft.psd"]);
		expect(payload.server.url).to.equal("http://127.0.0.1:9/save");
	});

	it("serves a registered file with CORS and accepts save-back", async function () {
		const dir = mkdtempSync(join(tmpdir(), "mups-pp-"));
		const psd = join(dir, "draft.psd");
		writeFileSync(psd, "original");

		const saves = [];
		/** @type {Awaited<ReturnType<typeof CreatePhotopeaDraftServer>>} */
		let draftServer;
		draftServer = await CreatePhotopeaDraftServer({
			onSave: (_event) => {
				saves.push(_event);
				const path = WritePhotopeaSaveBack(_event, draftServer);
				return { message: path };
			}
		});

		const fileUrl = draftServer.registerFile(psd);
		const body = await new Promise((_resolve, _reject) => {
			http.get(fileUrl, (_res) => {
				const chunks = [];
				_res.on("data", (_c) => chunks.push(_c));
				_res.on("end", () => _resolve(Buffer.concat(chunks)));
			}).on("error", _reject);
		});
		expect(body.toString()).to.equal("original");
		expect(await new Promise((_resolve) => {
			http.get(fileUrl, (_res) => _resolve(_res.headers["access-control-allow-origin"]));
		})).to.equal("*");

		const meta = JSON.stringify({ source: fileUrl, versions: [{ format: "psd", start: 0, size: 7 }] });
		const pad = Buffer.alloc(Math.max(0, 2000 - Buffer.byteLength(meta)), 0);
		const postBody = Buffer.concat([Buffer.from(meta), pad, Buffer.from("updated")]);

		await new Promise((_resolve, _reject) => {
			const req = http.request(draftServer.saveUrl, { method: "POST" }, (_res) => {
				_res.on("data", () => {});
				_res.on("end", _resolve);
			});
			req.on("error", _reject);
			req.end(postBody);
		});

		expect(readFileSync(psd, "utf8")).to.equal("updated");
		expect(saves).to.have.length(1);
		await draftServer.close();
		rmSync(dir, { recursive: true, force: true });
	});
});

describe("OpenPhotopeaDrafts", function () {
	it("returns a Photopea URL without opening a browser when MU_PHOTOPEA_NO_BROWSER=1", async function () {
		const dir = mkdtempSync(join(tmpdir(), "mups-pp-open-"));
		const psd = join(dir, "draft.psd");
		writeFileSync(psd, "v1");
		process.env.MU_PHOTOPEA_NO_BROWSER = "1";
		try {
			const result = await OpenPhotopeaDrafts([psd], { saveBack: false });
			expect(result.url).to.match(/photopea\.com#/);
			expect(result.paths).to.deep.equal([psd]);
			await result.close();
		} finally {
			delete process.env.MU_PHOTOPEA_NO_BROWSER;
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("WatchDrafts", function () {
	this.timeout(10000);

	it("notifies after debounce when a watched file changes", async function () {
		const dir = mkdtempSync(join(tmpdir(), "mups-watch-"));
		const psd = join(dir, "draft.psd");
		writeFileSync(psd, "v1");

		const events = [];
		const handle = WatchDrafts([psd], (event) => events.push(event), { debounceMs: 200 });

		await new Promise((r) => setTimeout(r, 50));
		writeFileSync(psd, "v2");

		await new Promise((r) => setTimeout(r, 600));
		handle.close();
		rmSync(dir, { recursive: true, force: true });

		expect(events).to.have.length(1);
		expect(events[0].path).to.equal(psd);
	});
});
