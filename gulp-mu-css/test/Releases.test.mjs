// Tests for the RELEASES.json version history API.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import {
	GetReleases,
	GetCurrentVersionString,
	GetCurrentFullVersionString,
	GetVersionHistoryString,
	StripI18xMarkup
} from "../src/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));

describe("Releases", () => {
	it("parses RELEASES.json with release entries, newest first", () => {
		const releases = GetReleases();
		expect(releases).to.be.an("array").that.is.not.empty;
		for (const r of releases) {
			expect(r).to.include.keys("main", "minor", "revision", "date", "beta", "info");
			expect(r.info).to.be.an("array").that.is.not.empty;
		}
		const [first, second] = releases;
		const toNumber = (_r) => _r.main * 1e6 + _r.minor * 1e3 + _r.revision;
		expect(toNumber(first)).to.be.greaterThan(toNumber(second));
	});

	it("matches the package.json version", () => {
		const r = GetReleases()[0];
		expect(`${r.main}.${r.minor}.${r.revision}`).to.equal(packageJson.version);
	});

	it("formats the current version strings", () => {
		expect(GetCurrentVersionString()).to.equal(`V${packageJson.version}`);
		expect(GetCurrentFullVersionString()).to.match(
			new RegExp(`^V${packageJson.version.replace(/\./g, "\\.")} \u00B7 \\d{4}-\\d{2}-\\d{2}`)
		);
	});

	it("strips i18x markup from info strings", () => {
		expect(StripI18xMarkup('Fixed a bug<context="release info"/>')).to.equal("Fixed a bug");
		expect(StripI18xMarkup("Plain text")).to.equal("Plain text");
	});

	it("returns a formatted version history string", () => {
		const history = GetVersionHistoryString();
		expect(history).to.include(`V${packageJson.version}`);
		expect(history).to.include("  - ");
		expect(history).to.not.include("<context=");
	});

	it("honors limit and keeps markup on request", () => {
		const one = GetVersionHistoryString({ limit: 1, stripMarkup: false });
		const headers = one.split("\n").filter((_l) => _l.startsWith("V"));
		expect(headers).to.have.lengthOf(1);
		expect(one).to.include("<context=");
	});
});
