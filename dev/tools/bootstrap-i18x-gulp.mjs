#!/usr/bin/env node
// ===========================================
// bootstrap-i18x-gulp.mjs — initial i18x/gulp phrase dictionaries
// © 2026 Meinolf Amekudzi
// ===========================================

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '../..');
const gulpDir = join(rootDir, 'i18x', 'gulp');

/** @type {Record<string, string>} en-US source → de-DE translation */
const PHRASES_DE = {
	'npm: logged in as <user/><context="task log"/>': 'npm: angemeldet als <user/>',
	'Running <label/> tests\u2026<context="task log"/>': 'Führe <label/>-Tests aus\u2026',
	'<label/> tests passed.<context="task log"/>': '<label/>-Tests bestanden.',
	'BUILD_DEMOS: asset debug enabled via MICROGULP_THEME_DEBUG.<context="task log"/>': 'BUILD_DEMOS: Asset-Debug über MICROGULP_THEME_DEBUG aktiviert.',
	'Building marketing demos (glittery, flyex, buttons)\u2026<context="task log"/>': 'Erstelle Marketing-Demos (glittery, flyex, buttons)\u2026',
	'Demo <id/> assets<context="build log"/>': 'Demo <id/> Assets',
	'Demo builds complete.<context="task log"/>': 'Demo-Builds abgeschlossen.',
	'Rendering \u00B5PS examples\u2026<context="task log"/>': 'Rendere \u00B5PS-Beispiele\u2026',
	'Examples rendered into gulp-mu-ps/examples-out/.<context="task log"/>': 'Beispiele nach gulp-mu-ps/examples-out/ gerendert.',
	'Preparing npm publish bundles under build/\u2026<context="task log"/>': 'Bereite npm-Publish-Bundles unter build/ vor\u2026',
	'Publish bundles ready in build/.<context="task log"/>': 'Publish-Bundles in build/ bereit.',
	'Publishing to npm\u2026<context="task log"/>': 'Ver\u00F6ffentliche auf npm\u2026',
	'Publish finished.<context="task log"/>': 'Ver\u00F6ffentlichung abgeschlossen.',
	'Current package version: <version/><context="build log"/>': 'Aktuelle Paketversion: <version/>',
	"Starting '<task/>'...<context=\"gulp lifecycle\"/>": "Starte '<task/>'\u2026",
	"Finished '<task/>' after <duration format=\"progressDuration\"/><context=\"gulp lifecycle\"/>": "Beendet '<task/>' nach <duration format=\"progressDuration\"/>",
	"Errored '<task/>': <message/><context=\"gulp lifecycle\"/>": "Fehler bei '<task/>': <message/>",
	'Test \u00B5CSS<context="µDisplayName"/>': 'Test \u00B5CSS',
	'Runs the gulp-mu-css unit tests (compiler, sprites, BuildSkin).<context="µDescription"/>': 'Führt gulp-mu-css-Unit-Tests aus (Compiler, Sprites, BuildSkin).',
	'Quality<context="µGroup"/>': 'Qualität',
	'Test \u00B5PS<context="µDisplayName"/>': 'Test \u00B5PS',
	'Runs the gulp-mu-ps unit tests (PSD compositor against legacy reference images).<context="µDescription"/>': 'Führt gulp-mu-ps-Unit-Tests aus (PSD-Compositor gegen Legacy-Referenzbilder).',
	'Test \u00B5FT<context="µDisplayName"/>': 'Test \u00B5FT',
	'Runs the gulp-mu-ft unit tests (icon font generation from SVG glyphs).<context="µDescription"/>': 'Führt gulp-mu-ft-Unit-Tests aus (Icon-Font-Erzeugung aus SVG-Glyphen).',
	'Test \u00B5AU<context="µDisplayName"/>': 'Test \u00B5AU',
	'Runs the gulp-mu-au unit tests (sound atlas generation).<context="µDescription"/>': 'Führt gulp-mu-au-Unit-Tests aus (Sound-Atlas-Erzeugung).',
	'Run All Tests<context="µDisplayName"/>': 'Alle Tests ausführen',
	'Runs every package test suite (\u00B5CSS, \u00B5PS, \u00B5FT, \u00B5AU).<context="µDescription"/>': 'Führt alle Paket-Test-Suiten aus (\u00B5CSS, \u00B5PS, \u00B5FT, \u00B5AU).',
	'Build Demos<context="µDisplayName"/>': 'Demos bauen',
	'Builds glittery, flyex and buttons demos via BuildSkin; shows asset thumbnails in \u00B5Gulp.<context="µDescription"/>': 'Erstellt glittery-, flyex- und buttons-Demos via BuildSkin; zeigt Asset-Thumbnails in \u00B5Gulp.',
	'Output lands in demos/*/dist/. Set MICROGULP_THEME_DEBUG=1 for CLI asset previews.<context="µTooltip"/>': 'Ausgabe in demos/*/dist/. MICROGULP_THEME_DEBUG=1 für CLI-Asset-Vorschau setzen.',
	'Build/Demos<context="µGroup"/>': 'Build/Demos',
	'Render Examples<context="µDisplayName"/>': 'Beispiele rendern',
	'Renders all \u00B5PS example outputs into gulp-mu-ps/examples-out/.<context="µDescription"/>': 'Rendert alle \u00B5PS-Beispielausgaben nach gulp-mu-ps/examples-out/.',
	'Build/Examples<context="µGroup"/>': 'Build/Beispiele',
	'Render Reference<context="µDisplayName"/>': 'Referenz rendern',
	'Renders mups-reference.psd for Adobe PNG comparison.<context="µDescription"/>': 'Rendert mups-reference.psd für Adobe-PNG-Vergleich.',
	'Verify Image Ops<context="µDisplayName"/>': 'Bildoperationen prüfen',
	'Renders adjustment/transform samples from a reference photo (VERIFY_IMAGE, VERIFY_OUT).<context="µDescription"/>': 'Rendert Anpassungs-/Transformationsbeispiele aus einem Referenzfoto (VERIFY_IMAGE, VERIFY_OUT).',
	'Build Manual (EN)<context="µDisplayName"/>': 'Handbuch bauen (EN)',
	'English manual: markdown \u2192 docx \u2192 PDF.<context="µDescription"/>': 'Englisches Handbuch: Markdown \u2192 docx \u2192 PDF.',
	'Docs<context="µGroup"/>': 'Dokumentation',
	'Build Manual<context="µDisplayName"/>': 'Handbuch bauen',
	'Rebuilds the \u00B5CSS manual in German and English (markdown \u2192 docx \u2192 PDF). Run before publish.<context="µDescription"/>': 'Erstellt das \u00B5CSS-Handbuch auf Deutsch und Englisch neu (Markdown \u2192 docx \u2192 PDF). Vor Publish ausführen.',
	'Prepare Publish<context="µDisplayName"/>': 'Publish vorbereiten',
	'Copies publish-ready bundles (gulp-mu-css, gulp-mu-ps, gulp-mu-ft, gulp-mu-au) into build/.<context="µDescription"/>': 'Kopiert publish-fertige Bundles (gulp-mu-css, gulp-mu-ps, gulp-mu-ft, gulp-mu-au) nach build/.',
	'Publish<context="µGroup"/>': 'Veröffentlichen',
	'Publish to npm<context="µDisplayName"/>': 'Auf npm veröffentlichen',
	'Publishes build/ bundles to npm. Reuses your npm session; 2FA code via dashboard form when needed.<context="µDescription"/>': 'Veröffentlicht build/-Bundles auf npm. Nutzt bestehende npm-Session; 2FA-Code bei Bedarf über Dashboard-Formular.',
	'Run Prepare Publish first (or MU_BUILD=1). One-time browser login in a terminal: npm login --auth-type=web<context="µTooltip"/>': 'Zuerst Prepare Publish ausführen (oder MU_BUILD=1). Einmaliger Browser-Login im Terminal: npm login --auth-type=web',
	'Build and Publish<context="µDisplayName"/>': 'Bauen und veröffentlichen',
	'Refreshes build/ bundles then publishes to npm.<context="µDescription"/>': 'Aktualisiert build/-Bundles und veröffentlicht auf npm.',
	'Legacy Migration Test<context="µDisplayName"/>': 'Legacy-Migrations-Test',
	'Full \u00B5CSS 1 migration check (convert + compare). Requires a local project extract.<context="µDescription"/>': 'Vollständiger \u00B5CSS-1-Migrationscheck (convert + compare). Benötigt lokales Projekt-Extract.',
	'Quality/Legacy<context="µGroup"/>': 'Qualität/Legacy',
	'Version History<context="µDisplayName"/>': 'Versionshistorie',
	'Prints the formatted \u00B5CSS release history from gulp-mu-css/RELEASES.json.<context="µDescription"/>': 'Gibt die formatierte \u00B5CSS-Versionshistorie aus gulp-mu-css/RELEASES.json aus.',
	'About<context="µGroup"/>': 'Info',
	'Backup to NAS<context="µDisplayName"/>': 'NAS-Sicherung',
	'Incrementally mirrors the project to Z:\\Projects\\microCSS (robocopy). Skips node_modules, build, .cache, examples-out and .microgulp.<context="µDescription"/>': 'Spiegelt das Projekt inkrementell nach Z:\\Projects\\microCSS (robocopy). Lässt node_modules, build, .cache, examples-out und .microgulp aus.',
	'Copies and deletes only differences. Override the destination with MU_NAS_BACKUP. Gitignored trees such as oldsrcs and CLAUDE.md are included.<context="µTooltip"/>': 'Kopiert und löscht nur Differenzen. Zielpfad per MU_NAS_BACKUP überschreibbar. Gitignored-Bäume wie oldsrcs und CLAUDE.md werden mitgesichert.',
	'Mirroring project \u2192 <path/> (changes only)<context="build log"/>': 'Projektspiegel \u2192 <path/> (nur Änderungen)',
	'Skipping <dirs/><context="build log"/>': 'Übersprungen: <dirs/>',
	'NAS backup finished (robocopy <code format="int"/>).<context="build log"/>': 'NAS-Sicherung fertig (robocopy <code format="int"/>).',
	'Build/Maintenance<context="µGroup"/>': 'Build/Wartung',
};

const sources = Object.keys(PHRASES_DE);
const enUs = Object.fromEntries(sources.map((_k) => [_k, _k]));
const deDe = { ...PHRASES_DE };

mkdirSync(gulpDir, { recursive: true });
writeFileSync(join(gulpDir, 'en-US.json'), JSON.stringify(enUs, null, '\t') + '\n', 'utf8');
writeFileSync(join(gulpDir, 'de-DE.json'), JSON.stringify(deDe, null, '\t') + '\n', 'utf8');
console.log(`Wrote ${sources.length} phrase(s) to i18x/gulp/`);
console.log('Run: node ../microGulp/dev/tools/sync-i18x-gulp-formats.mjs --root', rootDir);
