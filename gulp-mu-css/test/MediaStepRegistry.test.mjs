import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect } from "chai";
import {
	RegisterMediaStep,
	ListMediaStepTypes,
	GetMediaStepHandler
} from "../src/build/MediaStepRegistry.mjs";
import { RunMediaStep } from "../src/build/MediaSteps.mjs";

describe("MediaStepRegistry", function () {
	const type = "testEchoStep";

	afterEach(function () {
		// Registry has no unregister — use unique types per test or accept leakage in test process.
	});

	it("RegisterMediaStep rejects invalid input", function () {
		expect(() => RegisterMediaStep("", async () => ({}))).to.throw(/non-empty/);
		expect(() => RegisterMediaStep(type, null)).to.throw(/function/);
	});

	it("RunMediaStep dispatches to a registered handler", async function () {
		const uniqueType = `echoStep_${Date.now()}`;
		RegisterMediaStep(uniqueType, async (_step, _ctx) => ({
			type: uniqueType,
			skipped: false,
			outputs: [join(_ctx.outputDir, "out.txt")]
		}));

		const dir = mkdtempSync(join(tmpdir(), "mucss-media-"));
		const outDir = join(dir, "skin");
		try {
			const result = await RunMediaStep({ [uniqueType]: { value: 1 } }, {
				rootDir: dir,
				outputDir: outDir,
				imageFormat: "png",
				cache: null,
				index: 0
			});
			expect(result.type).to.equal(uniqueType);
			expect(result.skipped).to.equal(false);
			expect(ListMediaStepTypes()).to.include(uniqueType);
			expect(GetMediaStepHandler(uniqueType)).to.be.a("function");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
