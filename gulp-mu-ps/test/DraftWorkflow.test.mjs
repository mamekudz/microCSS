import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect } from "chai";
import { OpenDrafts, ResolveAffinityExecutable } from "../src/io/OpenDrafts.mjs";
import { WatchDrafts } from "../src/io/WatchDrafts.mjs";

describe("OpenDrafts", function () {
	it("throws when a draft file is missing", function () {
		expect(() => OpenDrafts(["/nonexistent/draft.psd"])).to.throw(/not found/);
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
