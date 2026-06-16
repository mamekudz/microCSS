# µCSS 2 (gulp-mu-css) — Konzept

Stand: Juni 2026 · Status: Entwurf zur Diskussion

µCSS 2 ersetzt den Adobe-basierten Workflow von µCSS 1 (2013, Photoshop-Script):
Aus erweiterten Quell-Stylesheets (`skins/src`) und den Medienquellen (`dev/media`)
entstehen per Gulp die fertigen Skin-Dateien (`skins/std`) — Standard-CSS plus alle
benötigten Bilder, Sprites, Cursor, Fonts und Sounds. Die Bilderzeugung übernimmt
µPS. Anzeigenamen sind µCSS und µPS; die technischen Namen (npm-Pakete,
Verzeichnisse) lauten wegen der µ-Problematik in npm/git `gulp-mu-css` und `gulp-mu-ps`.

---

## 1. Analyse des Bestands (AiDPix Extract)

Quelle: `oldsrcs/AiDPix Extract` — die µCSS-relevanten Verzeichnisse des AiDPix-Projekts.

**Struktur:**

```
dev/media/raw      Entwürfe (PSD, Einzelbilder, DSD-Quellen)
dev/media/final    finale Medien (PSD-Master, PNGs, Fonts, Sounds)
skins/src          Quell-CSS: src.css (~204 KB) + 5 kleinere (tinymce, mail, ff)
skins/std          Ziel: std.css usw. + imgs/ + fonts/ + snds/ + µ.std.css (Steuerdatei)
```

**Tatsächlich genutzte µ-API in den Quell-CSS** (alle 6 Dateien):

| Funktion | Anzahl | Zweck |
| :--- | ---: | :--- |
| `µ.Lighten(color, step)` | 143 | Farbe aufhellen/abdunkeln (Wertfunktion) |
| `µ.Cursor("name")` | 139 | Cursor aus Sprite-Atlas mit Hotspot + Fallback |
| `µ.Alpha(color, a)` | 107 | Farbe mit Alpha (Wertfunktion) |
| `µ.AddProperty(name, value)` | 106 | berechnete Property hinzufügen |
| `µ.Sprite("pfad.png")` | 101 | Bild durch Sprite-Atlas-Position ersetzen |
| `µ.SetBackgroundColor(c)` / `µ.SetColor(c)` | 112 | Platzhalter-Property ersetzen |
| `µ.SetZIndex` / `SetWidth` / `SetHeight` / `SetMaxHeight` | 16 | dito für einzelne Properties |
| `µ.SetRememberBlock("name")` | 4 | Block für spätere Manipulation merken |
| `µ.$.Borders(...)` / `µ.$.TableBackgrounds(...)` | 12 | benutzerdefinierte Makros |
| `µ.MixColors(...)` | 1 | Farben mischen |
| `µ.SetBackgroundImage(...)` | 2 | Hintergrundbild setzen |

**Zentrale Beobachtungen:**

1. Die Sonderzeichen `«` `»` `¡` (Ersatz für `{` `}` `;`) kommen **ausschließlich** in
   der Steuerdatei `µ.std.css` vor — bei mehrzeiligen Funktionsdefinitionen
   (`GlitterySpriteAfterWorkDivBlock`, `FlyEx`, `Borders`, …). In den eigentlichen
   Quell-CSS stehen nur **einzeilige Ausdrücke**, die ohne Ersatzzeichen auskommen.
2. Die `µ.std.css` ist kein Stylesheet, sondern ein **Build-Manifest**: Output-Optionen,
   abhängige CSS-Dateien, microPS-Plugin-Aufrufe (ButtonAndIconCreator, AppIconMaker,
   FileCopy), Variablen (`µ.$.*`), Cursor-Definitionen (`µ.DefCursor`), Hilfsfunktionen.
3. `SetBackgroundColor`/`SetColor` existieren nur, weil das alte Tool eine
   Platzhalter-Property (`background-color: rgba(0,0,0,0)`) ersetzen musste —
   mit Werte-Interpolation entfällt dieses Muster komplett.

---

## 2. Grundentscheidungen

### D1 — PostCSS als Parser-Fundament

Die geforderte **JSON-Repräsentation der Quell-CSS** liefert PostCSS praktisch
geschenkt: Es parst CSS in einen wohldefinierten, traversier- und manipulierbaren
AST (Root → Rule → Declaration), inklusive Source-Maps und Fehlerpositionen.

Entscheidend: Die neue µ-Syntax (siehe D2) ist **syntaktisch valides CSS** —
PostCSS parst `.µ.css`-Dateien ohne Custom-Syntax. µCSS wird damit im Kern
eine PostCSS-Pipeline mit eigener Evaluations-Schicht. Zusätzlich öffnet das
das PostCSS-Ökosystem: cssnano ersetzt die alten Output-Optionen (`comments`,
`tabulators`, `lineFeeds`, …); Autoprefixer ließe sich bei Bedarf einhängen,
ist aber nicht vorgesehen (siehe D6).

Um die API-Konventionen des Projekts zu wahren und JSON-Serialisierung zu
garantieren, kapselt eine schlanke Klasse `CssDocument` den PostCSS-AST
(CamelCase-Methoden: `FindRules`, `AddRule`, `AddProperty`, `ChangeProperty`,
`RemoveProperty`, `ToJson`, `ToCss`). Wer mehr braucht, greift über
`document.root` direkt auf PostCSS zu.

### D2 — Das `.µ.css`-Format: CSS plus zwei Erweiterungspunkte

Quell-Dateien heißen künftig `*.µ.css` — der Name davor ist frei (z. B.
`src.µ.css` statt `src.css`; die Zuordnung zum Ziel regelt das Manifest, D3).
Das Doppelsuffix ist bewusst gewählt: Weil die Dateien auf `.css` enden,
greift in Editoren (Cursor/VS Code, WebStorm, …) automatisch das normale
CSS-Syntax-Highlighting — ein eigener Suffix wie `.mcss` würde dagegen eine
eigene Sprachzuordnung pro Arbeitsplatz erfordern. Technisch ist die Endung
für den Compiler irrelevant (das Manifest referenziert die Quellen explizit);
wer das µ-Zeichen in Dateinamen vermeiden will, kann daher genauso
`*.mu.css` verwenden. Inhaltlich ist `.µ.css` Standard-CSS mit genau zwei
Erweiterungen:

**(a) Werte-Interpolation `µ(expr)`** — überall, wo ein CSS-Wert steht:

```css
::selection {
	background-color: µ($.selectBaseBrgdOnDarkColor);
	color: µ($.selectBaseTextColor);
}
td.subheadline {
	border-bottom: 1px dashed µ(Lighten($.selectBaseBrgdColor, $.lightenSelectStep2));
}
```

`µ(...)` ist eine syntaktisch valide (unbekannte) CSS-Funktion; der Inhalt wird
als JavaScript-**Ausdruck** im µ-Kontext ausgewertet und durch das Ergebnis
ersetzt. Das ersetzt `AddProperty`, `SetBackgroundColor`, `SetColor`, `SetZIndex`
usw. vollständig — die Property steht wieder dort, wo sie hingehört, und
Editoren/Linter sehen valides CSS.

**(b) Direktiven `-µ: Expr(...)`** — für Operationen, die den Block oder das
Dokument verändern (mehrere Properties erzeugen, Regeln hinzufügen):

```css
div.panel.modal div.companylogo {
	-µ: Sprite("imgs/logos/dosing_logo.png");
	margin-left: auto;
}
*.cursor_zoom {
	-µ: Cursor("zoom");
}
div.content.glittery {
	-µ: Sprite("imgs/general/gui/glittery/glittery.png", { afterWork: GlitterySprite });
}
```

Auch Direktiven sind einzelne JS-Ausdrücke (Aufrufe in den µ-Kontext); das
`µ.`-Präfix entfällt, da der Kontext implizit ist. ASCII-Alternative: `-mu:`
wird als Alias akzeptiert (Tastatur-Freundlichkeit).

**Kein Inline-JS mit Sonderzeichen mehr:** Mehrzeilige Logik (Schleifen,
Funktionsdefinitionen) gehört nicht ins Stylesheet, sondern in die
Skin-Konfiguration (D3) — echte `.mjs`-Dateien mit Highlighting, Linting und
Debugger. Damit entfallen `«»¡` ersatzlos. Sollte sich später echter Bedarf an
Inline-Blöcken zeigen, ist ein `@µ { … }`-At-Rule-Block mit eigenem Pre-Pass
(Klammerzählung) nachrüstbar — bewusst nicht Teil des ersten Wurfs.

### D3 — Build-Manifest als `.mjs` statt `::-µcss-init`

Alles, was heute in `µ.std.css` steht, wandert in eine JavaScript-Konfiguration
pro Skin (Thema). Gulp lädt sie und führt den Build aus. Vorteil: normales
JavaScript (ES6+), importierbar, testbar — und genau die gewünschte
„Definition per Gulp".

**Namenskonvention:**

- **Manifest = Skin-Name**: Pro CSS-Thema liegt im Quellverzeichnis eine
  entsprechend benannte Manifest-Datei `<skinname>.µcss.mjs`, z. B.
  `skins/src/std.µcss.mjs`. Das Doppelsuffix `.µcss.mjs` (ASCII-Alternative
  `.mucss.mjs`) macht auf einen Blick klar, dass es sich um ein
  µCSS-Skin-Manifest handelt und nicht um ein gewöhnliches Modul oder
  Gulpfile. Der Skin-Name ergibt sich aus dem Dateinamen vor dem Suffix
  (`std.µcss.mjs` → Skin `std`) — kein `name`-Feld nötig.
- **`.µ.css`-Quellen sind frei benennbar** (z. B. `src.µ.css`); das Manifest
  verweist auf sie. Mehrere Skins können sich dieselben `.µ.css`-Quellen teilen
  und nur Variablen/Medien austauschen.
- **Zielverzeichnis = Skin-Name**: Der Build legt neben dem Quellverzeichnis
  ein Verzeichnis mit dem Skin-Namen an (`skins/std/`) und schreibt dorthin
  die kompilierten CSS, alle Bilder/Fonts/Sounds **und den Build-Cache**
  (Atlas-Bilder, Quell-Hashes) — Standard: `<outputDir>/.cache/`. Damit ist
  alles, was zu einem Skin gehört, an einem Ort; `outputDir` bleibt
  überschreibbar.

```js
// skins/src/std.µcss.mjs — Skin "std", Ziel: skins/std/
import { DefineSkin } from "gulp-mu-css";
import { GlitterySprite, FlyEx, FlyExUtils, Borders, TableBackgrounds } from "./helpers.mjs";

export default DefineSkin({
	/* Variablen — ersetzt µ.$.* */
	vars: {
		baseBrgdColor: "#202020",
		selectBaseBrgdColor: "#007570",
		lightenStep2: 0.7,
		PanelZIndex: 9000,
		icon_pencil: "\\e91c"
		/* ... */
	},

	/* Makros & Hooks — ersetzt µ.$.Funktionen */
	helpers: { GlitterySprite, FlyEx, FlyExUtils, Borders, TableBackgrounds },

	/* Cursor-Definitionen — ersetzt µ.DefCursor */
	cursors: [
		{ name: "wait", fallback: "wait", image: "imgs/general/gui/cursors/wait.png", hotspot: [12, 12] },
		{ name: "zoom", fallback: "zoom-in", image: "imgs/general/gui/cursors/zoom.png", hotspot: [10, 8] }
		/* ... */
	],

	/* Medienerzeugung — ersetzt µ.plugins.* (Aufrufe gehen an microPS).
	   Zielpfade sind relativ zum Skin-Verzeichnis; mit outputBase: "project"
	   schreibt ein Step stattdessen in den Projektbaum — so lassen sich
	   raw->final-Zwischenschritte (Sequenz-Strips etc.) im Manifest abbilden,
	   die ein nachfolgender copy/copyFolder-Step in den Skin übernimmt.
	   Alternativ kann raw->final als eigener Gulp-Task vor BuildSkin laufen. */
	media: [
		{ buttonsAndIcons: "dev/media/final/general/gui/panelbuttons.psd", layout: "std", outputDir: "imgs/general/gui/panelbuttons" },
		{ buttonsAndIcons: "dev/media/final/general/gui/cursors.psd", layout: "std", outputDir: "imgs/general/gui/cursors" },
		/* mode "topLayerSets": ein Bild pro Top-Untergruppe (Legacy CreateByTopLayerSets),
		   ohne icons-Gruppe - fuer Logos, Animationsframes, Emoticons. */
		{ buttonsAndIcons: "dev/media/final/general/activityindicator.psd", layout: "std", mode: "topLayerSets", outputDir: "imgs/general" },
		{ appIcons: "dev/media/final/favicon.psd", layout: "std", profiles: ["web"] },
		{ sequenceStrip: "dev/media/raw/glittery/imgs", outputFile: "imgs/general/gui/glittery/glittery.png" },
		{ sequenceStrip: "dev/media/raw/flyex/frames", outputFile: "dev/media/final/general/gui/flyex/flyex.png", outputBase: "project" },
		{ copyFolder: "dev/media/final/general/gui/flyex", to: "imgs/general/gui/flyex" },
		{ copy: "dev/media/final/general/gui/teaserbgrd.png", to: "imgs/general/gui" },
		{ copyFolder: "dev/media/final/fonts", to: "fonts" },
		{ copyFolder: "dev/media/final/sounds", to: "snds" }
		/* ... */
	],

	/* Bildformat global: "png" (Default) oder "webp" — gilt für bilderzeugende
	   media-Steps und (sofern sprites.format fehlt) den Atlas; pro Step per
	   format-Feld übersteuerbar. appIcons ignoriert imageFormat (feste
	   Plattform-Formate). copy/copyFolder lassen Bestandsbilder unangetastet. */
	imageFormat: "png",

	/* Sprite-Atlas — ersetzt µ.options.sprites.*
	   sprites.format entkoppelt das Atlas-Format von imageFormat: der Atlas
	   allein lässt sich so auf webp stellen, ohne Generator-Steps anzufassen.
	   Sprite()-Quellbildpfade werden formatunabhängig aufgelöst (png/webp), der
	   Build bricht nur, wenn keine Variante existiert. */
	sprites: { file: "imgs/sprites.png", format: "webp", retina: true, preloadRule: true },

	/* Zu kompilierende Stylesheets — ersetzt µ.DependentCSSFile.
	   Quellnamen sind frei; das Ziel landet im Skin-Verzeichnis. */
	files: [
		{ source: "src.µ.css", target: "std.css" },
		{ source: "src_tinymce.µ.css", target: "std_tinymce.css" },
		{ source: "src_mail_spl.µ.css", target: "std_mail_spl.css" }
		/* ... */
	],

	/* Output — ersetzt µ.$.overloadOptions */
	output: { minify: true, comments: false }
});
```

Die Hooks (`afterWork` u. ä.) erhalten einen Kontext mit voller AST- und
Atlas-Information — umgesetzt als `{ rule, document, url, baseDir,
sprite: { x, y, width, height }, atlas }` — damit lassen sich
Glittery-/FlyEx-Generatoren 1:1 (aber lesbar) nachbauen. Helper, die als
`function` deklariert sind, laufen mit `this` = Auswertungs-Scope
(`this.AddProperty`, `this.InsertRule`, `this.rule`, `this.document`,
`this.$`) — der Ersatz für die alten µ-Globals; die Bindung bleibt auch
erhalten, wenn ein Helper als `afterWork`-Wert übergeben wird. Die portierten
AiDPix-Makros liegen als Referenz/Test-Fixture unter `test/fixtures/aidpix-helpers.mjs` (M4).

### D4 — LESS: nicht einbauen, aber nicht blockieren

Empfehlung: **kein LESS-Support in µCSS.** Begründung:

- Die historischen LESS-Argumente (Variablen, Nesting, Mixins) sind heute
  abgedeckt: **natives CSS-Nesting** (Browser-Support seit 2023, kann unverändert
  durchgereicht werden), **Custom Properties** zur Laufzeit, `µ()`/`vars` zur
  Build-Zeit, `helpers` als Mixin-Ersatz mit echtem JavaScript.
- LESS erlaubt kein eingebettetes JavaScript (erklärtes Kernfeature von µCSS)
  und würde µ-Direktiven beim eigenen Parsen gefährden (`//`-Kommentar-Kollision,
  Escaping).
- Zwei Erweiterungssprachen im selben File wären konzeptionell unsauber.

Wer LESS will, schaltet es **vor**: `*.less → lessc → *.µ.css-Input` als eigener
Gulp-Step — µCSS verarbeitet das Ergebnis, solange die µ-Konstrukte
escaped durchgereicht werden. Das wird dokumentiert, aber nicht aktiv gepflegt.

### D5 — Kompatibilität der Ausgabe

Die Zieldateien behalten Namen und Format (`std.css`, `std_tinymce.css`, …,
`imgs/sprites.png`), damit AiDPix ohne App-Änderung umgestellt werden kann.
Der Goldstandard-Test: Der neue Build muss gegen die eingecheckten alten
Ausgaben in `skins/std` funktional äquivalentes CSS liefern (Property-weiser
Vergleich, nicht byteweise — Formatierung darf abweichen; entfallene
Vendor-Prefix-Zeilen werden beim Vergleich ignoriert, siehe D6).

### D6 — Keine Vendor-Prefixes mehr

Die alte Prefix-Generierung (`vendorPrefixSetup`: `-webkit-`/`-moz-`/`-ms-`
für Gradients, `image-set` usw.) entfällt ersatzlos — sie zielte auf die
IE10/Safari-6-Ära, und der Versions-Cut des Projekts verlangt ohnehin den
Rückbau solcher Workarounds. Alles, was die AiDPix-Stylesheets nutzen, ist
seit Jahren unprefixed verfügbar (Gradients seit ~2013, `image-set()` seit
2023 in Chrome 113/Firefox 88/Safari 16 flächendeckend).

- `µ.Sprite`/`µ.Cursor` erzeugen nur noch `url(...)` als Fallback plus die
  unprefixte `image-set(...)`-Form.
- **Gradient-Richtungs-Normalisierung (D6-Folge, ab 2.2.0):** Die alten
  Prefix-Gradients nutzten Keyword-Richtungen (`linear-gradient(top, …)`), die
  in der unprefixten Standard-Syntax **ungültig** sind (moderne Browser ignorieren
  die Deklaration → Hintergrund verschwindet). `CompileMcss` hebt sie am Ende
  über alle Deklarationen auf die `to …`-Form an: `top→to bottom`, `bottom→to top`,
  `left→to right`, `right→to left` (Ecken entsprechend; Legacy = Start-Ecke,
  modern `to` = Ziel-Ecke). Gilt für `linear-gradient`/`repeating-linear-gradient`,
  auch in kommaseparierten Layern und `border-image-source`. Winkel
  (`-75deg`, `0.25turn`), bereits `to …`, Farb-Stop als erstes Argument und
  `radial-gradient` bleiben unangetastet. Der Helper `NormalizeLegacyGradients`
  ist aus `compile/Compiler.mjs` importierbar (Modul-intern, nicht über
  `index.mjs`), damit auch der AiDPix-Vergleich beide Seiten gleich normalisiert.
- **Abgrenzung:** Vendor-spezifische Selektoren und Properties **ohne
  Standard-Pendant** (`::-webkit-scrollbar`, `::-webkit-calendar-picker-indicator`,
  `::-moz-range-thumb`, `-webkit-user-drag`, …) sind keine Prefix-Duplikate,
  stehen im Quelltext und werden unverändert durchgereicht.
- Sollte je ein Prefix nötig werden, lässt sich Autoprefixer (browserslist-
  gesteuert) als PostCSS-Plugin in den Emit-Schritt einhängen — bewusst
  keine eigene Option im Manifest.

### D7 — Inkrementeller Build: nur Notwendiges neu generieren

Jeder `BuildSkin`-Lauf erzeugt nur das neu, was sich tatsächlich geändert hat.
Primärer Mechanismus sind **Datei-Modifikations-Zeitstempel** (`mtimeMs` + Größe),
keine Inhalts-Hashes — das ist bei großen PSD-Quellen um Größenordnungen
schneller und für den Entwicklungs-Workflow (Speichern → Build) zuverlässig.

**Cache-Ablage:** `<outputDir>/.cache/build.json` (pro Skin, siehe D3) — eine
JSON-Datei mit Fingerprints und Ergebnisdaten der letzten erfolgreichen
Läufe. Sie ersetzt die alten `*.css.cache`-Dateien und das Sprite-MD5-Log.

**Was wann übersprungen wird:**

1. **`media`-Steps** (PSD-Rendering, AppIcons, SequenceStrips): Ein Step wird
   übersprungen, wenn (a) sein Manifest-Eintrag unverändert ist (die
   Step-Konfiguration ist Teil des Fingerprints), (b) alle Quelldateien
   unveränderte `mtime`/Größe haben und (c) alle beim letzten Lauf erzeugten
   Ausgabedateien noch existieren. PSD-Rendering ist der teuerste Posten des
   Builds — hier zahlt der Cache am meisten.
2. **`copy`/`copyFolder`-Steps**: klassischer Make-Vergleich Quelle gegen
   Ziel (`mtime` neuer → kopieren), kein Cache-Eintrag nötig.
3. **Sprite-Atlas**: Neu gepackt und encodiert wird nur, wenn sich die
   **Bildmenge** (URLs in Registrierungs-Reihenfolge) oder ein Quellbild
   (`mtime`/Größe, inkl. `@2x`) geändert hat. Andernfalls werden die
   gespeicherten Positionen aus dem Cache wiederverwendet und nur die
   CSS-Regeln damit umgeschrieben — wie der alte `spritecssimages`-Cache,
   aber ohne dessen „CACHE ERROR“-Fragilität: Passt der Fingerprint nicht,
   wird schlicht neu gepackt.
4. **`.µ.css`-Kompilierung**: Eine Zieldatei wird neu geschrieben, wenn sich
   Quelle, Manifest (Variablen/Helpers/Optionen) oder das Atlas-Ergebnis
   geändert hat. Da Helpers beliebigen Code importieren können, gehen die
   `mtime`s aller Manifest-nahen `.mjs`-Dateien (Manifest + dessen lokale
   Imports) in den Fingerprint ein. Die reine CSS-Kompilierung ist billig —
   im Zweifel wird kompiliert; entscheidend ist, dass PSD-Rendering und
   Atlas-Packen nicht unnötig laufen.

**Invalidierung als Ganzes:** Der Cache trägt die Versionsnummern von
`gulp-mu-css`/`gulp-mu-ps` und das Format des Cache-Schemas; bei Abweichung wird er
verworfen (Vollbuild). `BuildSkin(manifest, { force: true })` erzwingt einen
Vollbuild explizit; Löschen von `<outputDir>/.cache/` ebenso.

**Grenzen von Zeitstempeln** (bewusst akzeptiert): Branch-Wechsel oder
Datei-Restores können `mtime` ändern, ohne dass sich Inhalte ändern — dann
wird höchstens unnötig neu gebaut, nie veraltet ausgeliefert. Der umgekehrte
Fall (Inhalt ändert sich ohne `mtime`) kommt in der Praxis nicht vor; wer es
paranoid braucht, kann später einen optionalen Hash-Modus ergänzen.

### D8 — Build-Time-`@import` (Bundling) + intelligenter Regel-Merge

**Motiv (Co-Location für Vue & Co.):** Komponenten-Frameworks wollen den Stil
einer Komponente *neben* deren Markup halten. Vue erzwingt dafür normalerweise
`<style scoped>`, was pro Komponente eigene `data-v-…`-Attribute und am Ende
megabyte­große, in den DevTools kaum noch testbare CSS erzeugt. µCSS dreht das
um: Die Komponenten-Styles liegen als eigene Datei neben der `.vue`-Datei
(beliebige Endung, z. B. `MyButton.π.css`, damit Vite/Vue sie nicht anfasst) und
werden vom µCSS-Compiler zu **einer** schlanken, statischen CSS gebündelt.

**Syntax — bewusst das Standard-`@import`:** Statt einer neuen Direktive wird
das vorhandene CSS-`@import` *zur Build-Zeit aufgelöst* (D2: gültiges CSS, Editor
bleibt zufrieden). Lokale Ziele werden eingelesen und an Ort und Stelle inline
ersetzt; entfernte/bedingte Importe bleiben unangetastet:

```css
/* main.µ.css */
@import "components/**/*.π.css";   /* Glob: alle Komponenten-Styles einsammeln */
@import "base/reset.µ.css";         /* Einzeldatei */
@import "https://fonts.example/x.css";   /* bleibt nativ (remote) */
@import "print.css" print;                /* bleibt nativ (Media-Query) */
body { margin: 0; }
```

- **Auflösung** relativ zum Verzeichnis der importierenden Datei.
- **Glob:** `*` (ein Segment), `**` (beliebige Tiefe), `?` (ein Zeichen);
  Treffer werden für deterministische Reihenfolge sortiert.
- **Iterativ/rekursiv:** Importierte Dateien dürfen selbst importieren. Jede
  Datei wird **genau einmal** inlined (Dedupe über absoluten Pfad) — das macht
  die Auflösung zugleich **zyklensicher** (eine bereits aktive Datei wird mit
  Warnung übersprungen).
- **Passthrough** (bleibt natives `@import`): `url(...)`, `http(s)://`- oder
  `//`-Ziele, `data:`-URLs sowie jeder Import mit Media-Query/Layer hinter dem
  String.
- **Fehler/Warnung (manifest-konfigurierbar):** Über `imports` im Manifest
  (pro Datei via `files[].imports`) lassen sich die drei Diagnose-Modi je auf
  `"error" | "warn" | "ignore"` stellen: `onMissing` (fehlende Einzeldatei,
  Default `"error"`), `onEmptyGlob` (Glob ohne Treffer, Default `"warn"` — ein
  Komponentenverzeichnis darf während der Entwicklung leer sein) und
  `onCircular` (Ziel bereits in Auflösung, Default `"warn"`). Beispiel:
  `imports: { onEmptyGlob: "error" }`.
- **Inkrementell:** Imports werden zur Compile-Zeit aufgelöst; die CSS-Kompilierung
  ist billig und läuft je Build, daher werden Änderungen an Komponenten-Styles
  stets neu eingelesen.

Implementierung: `src/compile/Imports.mjs` (`ResolveImports`), aufgerufen als
Schritt 0 in `CompileMcss` (vor Direktiven/Interpolation) — Sprite-/`µ(...)`-
Konstrukte in Komponenten-Styles funktionieren dadurch wie im Hauptdokument.

**Intelligenter Merge — Geminis dreistufige Abgleichlogik (opt-in):** Wenn viele
Komponenten zusammenfließen, taucht derselbe Selektor (`​.card`, `.btn` …)
zwangsläufig mehrfach auf. Blindes Aneinanderhängen ließe doppelten Code stehen
oder eine Definition eine andere still überschreiben. `MergeRules`
(`src/compile/MergeRules.mjs`) fasst **Top-Level-Regeln gleichen Selektors**
zusammen:

1. **Deep-Equal-Dedupe** — identische Deklarationssätze werden zu einem
   zusammengeführt (lautlos, reine Optimierung).
2. **Partial Merge** — nicht-kollidierende Properties werden ergänzt
   (`.btn{padding}` + `.btn{display}` → ein Block).
3. **Kollisions-Bremse** — dieselbe Property mit *anderem* Wert ist ein
   Konflikt. `merge.onConflict` steuert die Reaktion: `"error"` (Default,
   stoppt den Build mit Selektor, Property, beiden Werten und beiden
   Quelldateien), `"warn"` (Konsole + „last wins“ wie die Kaskade) oder
   `"keep"` (Konsole + „first wins“).

**Bewusster Ausweg `@µ-override`** (ASCII: `@mu-override`): Ein Block, der
absichtlich eine bestehende Klasse überschreibt, wird explizit als solcher
deklariert und gewinnt ohne Konflikt:

```css
@µ-override .btn { background: green; }   /* überschreibt frühere .btn-Werte */
```

**Namespace-Modus `@µ-namespace` (ASCII: `@mu-namespace`) — Kollisions-*
*vermeidung* statt -auflösung:** Während Merge/`@µ-override` Kollisionen
*nachträglich* behandeln, vermeidet der Namespace-Modus sie, indem er die
**lokalen Klassen einer Datei** umbenennt. Eine Komponentendatei meldet sich mit
einer Direktive an; präfixiert werden nur die Klassen-Tokens dieser Datei
(ids, Element- und Attribut-Selektoren bleiben unangetastet):

```css
@µ-namespace MyButton;
.card { … }            /* -> .MyButton-card */
.card.is-open { … }    /* -> .MyButton-card.MyButton-is-open */
```

Der Scope ist die **Quelldatei** der Direktive — das funktioniert daher auch
nach dem `@import`-Inlining, wenn viele Dateien in einem Dokument liegen. Klassen,
die bewusst **global** bleiben sollen (von Vue/JS gesetzte State-Klassen wie
`.is-active`, geteilte Utilities), werden mit `:global(...)` ausgenommen:

```css
.card:global(.is-active) { … }   /* -> .MyButton-card.is-active */
```

Robustes Selektor-Parsing über `postcss-selector-parser`
(`src/compile/Namespace.mjs`, `ApplyNamespaces`); ausgeführt nach dem
Import-Inlining und vor dem Merge, sodass präfixierte Selektoren als distinct
gelten. Der Modus ist rein opt-in (greift nur bei vorhandener Direktive) und
damit für Bestandsskins folgenlos.

**Rückwärtskompatibilität:** Imports greifen nur, wenn `@import` vorkommt —
bestehende Stylesheets ohne Importe ändern sich nicht. Der Merge ist
**opt-in** (`merge` im Manifest, pro Datei via `files[].merge` übersteuerbar)
und bleibt damit für Bestandsskins (z. B. AiDPix, das absichtlich Selektoren
wiederholt und sich auf die Quell-Reihenfolge/Kaskade verlässt) ohne Wirkung.
At-Rules (`@media`, `@keyframes` …) und in ihnen verschachtelte Regeln werden
nie zusammengeführt — ihre Kaskade ist gewollt.

### D9 — Build-Typ-/Varianten-Filter (`gulp-mu-build-filter`)

Aus einem Quellbaum sollen verschiedene Builds entstehen können (z. B.
`Production` vs. `Test`, Mandanten, Versionen, Plattformen, Varianten), ohne
externen Präprozessor. Dafür unterstützt µCSS das Paket **`gulp-mu-build-filter`**:
Es aktiviert oder entfernt Quelltext-Blöcke anhand von **Kommando-Kommentaren**.
Da die Marker in normalen `/* … */`-Kommentaren stehen, bleibt die Quelle
gültiges CSS:

```css
.base { color: black; }
/*-- @<BUILD_ONLY_AT_RELEASES:Production ----
.debug-overlay { outline: 1px solid red; }
---- @>BUILD_ONLY_AT_RELEASES --*/
/*-- @<BUILD_NEVER_AT_RELEASES:Production --*/
.dev-banner { display: block; }
/*-- @>BUILD_NEVER_AT_RELEASES --*/
```

Kommandos (jeweils `ONLY`/`NEVER`): `…AT_RELEASES`, `…AT_CLIENTS`,
`…AT_VERSIONS` (mit `+`/`-`-Suffix, z. B. `2.3+`), `…AT_PLATFORMS`,
`…AT_ANY_VARIANTS`/`…AT_ALL_VARIANTS`. Listen sind kommasepariert, `*` matcht
alles.

**Integration:** Der Filter läuft als **Schritt 0 auf dem Rohtext** jeder
Quelldatei (Hauptdatei *und* jede `@import`-Datei) **vor** dem Parsen — so
gelangen entfernte Blöcke nie in den AST oder den Import-Scan. Die Parameter
(`release`, `client`, `version`, `platform`, `variants`, `mode`) kommen aus dem
Manifest (`buildFilter`) und/oder der `BuildSkin()`-Option `buildFilter`
(letztere gewinnt — Build-Typ/Variante kommen so pro Lauf aus CLI/Env);
`files[].buildFilter` übersteuert pro Datei. Greift nur, wenn konfiguriert →
ohne `buildFilter` keine Wirkung.

Implementierung: `src/compile/BuildFilter.mjs` (`FilterSource`). Das CommonJS-
Paket erweitert beim Laden `Array.prototype`, daher wird es **lazy** und
synchron via `createRequire` geladen — nur wenn tatsächlich gefiltert wird.

### D10 — LESS-Konverter (Migrationshilfe, kein Laufzeit-LESS)

D4 bleibt gültig: µCSS **interpretiert kein LESS zur Laufzeit**. Für die bessere
Akzeptanz bei bestehenden Projekten gibt es aber eine **einmalige
Migrationshilfe** `tools/convert-less.mjs`, die LESS-Quellen mechanisch nach
`.µ.css` übersetzt. Sie ist bewusst **kein vollständiger LESS-Compiler**, sondern
bildet die Konstrukte mit sauberem µCSS-Pendant ab und **markiert alles andere als
`TODO`-Kommentar + Report-Eintrag** — das Ergebnis ist immer reviewbar statt still
falsch.

**Abgebildet:**

- `@var: wert;` → Manifest-`vars` (Zahlen bleiben numerisch, sonst String) +
  Nutzung `@var` → `µ($.var)` (Bindestrich-Namen: `µ($["my-var"])`).
- Verschachtelung inkl. `&` / `&-suffix` → flache Regeln (via `postcss-nested`).
- Farbfunktionen `lighten`/`darken`/`fade`/`mix` (50/50) → `µ(Lighten/Alpha/MixColors(...))`.
  Da LESS- und µCSS-Farbmodelle differieren, ist das eine **Näherung** (Report-Note).
- `@import "x.less";` → `@import "x.µ.css";` (greift dann das D8-Bundling);
  LESS-Importoptionen wie `(reference)` werden verworfen + gewarnt.
- `//`-Zeilenkommentare → `/* … */`.

**Bewusst manuell (TODO + Warnung):** Mixins (Definition `.foo(@a){}` und Aufruf
`.foo();`) → in einen µCSS-`helper` portieren; **Unit-Arithmetik** (`@base * 2px`)
→ von Hand in `µ(...)` fassen; Farbfunktionen ohne µCSS-Pendant (`saturate`,
`spin`, `fadein`/`fadeout`, gewichtetes `mix`, …).

**Schnittstelle:** Programmierbar (unit-getestet) `ConvertLess(source, { from })`
→ `{ css, vars, warnings, notes }`. CLI/Gulp:
`node tools/convert-less.mjs <input.less|dir> [outDir]` bzw. Gulp-Task
`convert:less` (`LESS_IN`/`LESS_OUT`). Der CLI-Lauf schreibt zusätzlich ein
**Manifest-Skelett** `<name>.µcss.mjs` mit den gesammelten Variablen und einer
`files`-Liste. Implementierung: `tools/convert-less.mjs`; Dev-Dependencies
`postcss-less` (Parser) und `postcss-nested` (Flattening) — beide nur im
Quellbaum, **nicht im npm-Paket** (`tools/` ist nicht in `files`).

**Vue-Konverter (Migrationshilfe, Co-Location):** Analog dazu wandelt
`tools/convert-vue.mjs` Vue-SFCs in die D8-Co-Location-Struktur um:

- `<style>` / `<style scoped>` → Geschwisterdatei `ComponentName.π.css` (Vite/Vue
  ignorieren diese Endung).
- Automatisches `@µ-namespace ComponentName;` (PascalCase aus dem Dateinamen).
- Vue-Scoped-Selektoren `[data-v-…]` entfernen; `:deep()` / `::v-deep` entpacken
  (Review-Hinweis).
- `lang="less"` → vorher durch den LESS-Konverter; `scss`/`sass`/`stylus` und
  `<style module>` → Warnung + manuelle Nacharbeit.
- Die `.vue`-Datei verliert den `<style>`-Block (HTML-Kommentar verweist auf die
  Sidecar-Datei); CLI erzeugt zusätzlich `main.µ.css` mit
  `@import "**/*.π.css";` und ein Manifest-Skelett inkl. `merge.onConflict:
  "error"`.

Schnittstelle: `ConvertVue(source, { from, componentName })` → `{ vue, css,
sidecarName, namespace, vars, warnings, notes }`. CLI/Gulp:
`node tools/convert-vue.mjs <input.vue|dir> [outDir]` bzw. Gulp-Task
`convert:vue` (`VUE_IN`/`VUE_OUT`). Unit-Tests: `test/ConvertVue.test.mjs`.

---

## 3. Architektur

```
gulp-mu-css/
  src/
    index.mjs              Public API: DefineSkin, BuildSkin, CompileMcss, CssDocument
    css/
      CssDocument.mjs      JSON-fähiger AST-Wrapper über PostCSS (FindRules, AddRule, ...)
      ValueInterpolator.mjs  µ(...)-Vorkommen in Werten finden und ersetzen
    eval/
      MuContext.mjs        Auswertungskontext: $ (vars), helpers, API-Funktionen
      Expression.mjs       JS-Ausdrücke kompilieren/ausführen (new Function, gecacht)
    api/
      Colors.mjs           Lighten (HSL-Default, optionaler model-Parameter), Alpha, MixColors
      Sprites.mjs          SpriteManager: sammeln, Atlas via microPS, Regel-Umschreibung
      Cursors.mjs          CursorManager: url()- + image-set-Cursor mit Fallback aus Definition
      Preload.mjs          PreloadRegistry: div.csspreload-Regel (createPreLoadRule)
    build/
      SkinBuilder.mjs      Manifest ausführen: media-Steps -> mcss kompilieren -> schreiben
      MediaSteps.mjs       buttonsAndIcons/appIcons/sequenceStrip/copy -> microPS-Aufrufe
      BuildCache.mjs       mtime-basierte Invalidierung in <outputDir>/.cache/build.json (D7, ersetzt *.css.cache)
  test/
    fixtures/
      aidpix-helpers.mjs   Referenz-Makros (M4, AiDPix-spezifisch, nicht im npm-Paket): Borders, TableBackgrounds, Glittery, FlyEx(Utils)
  docs/
```

**Kompilierungs-Ablauf einer `.µ.css`-Datei:**

1. **Parse**: PostCSS liest die Datei → AST (`CssDocument`).
2. **Evaluate**: Direktiven (`-µ:`/`-mu:`) und Interpolationen (`µ(...)`) werden in
   Dokumentreihenfolge ausgewertet. Sprite-/Cursor-Aufrufe registrieren zunächst nur
   ihre Bildreferenzen.
3. **Atlas**: Alle registrierten Bilder gehen an `gulp-mu-ps.SpriteAtlas` (inkl. @2x);
   danach schreibt die Sprite-/Cursor-Schicht die betroffenen Regeln um
   (`background-image`/`image-set`/`background-position`/`width`/`height` bzw.
   `cursor: image-set(...) x y, fallback`) und erzeugt optional die Preload-Regel.
4. **Hooks**: `afterWork`-Callbacks laufen mit Atlas-Ergebnis und AST-Zugriff.
5. **Emit**: cssnano nach `output`-Optionen (keine Vendor-Prefixes, siehe D6) → Zieldatei + Source-Map.

**Build eines Skins (`BuildSkin`):** erst `media`-Steps (microPS, mit
Cache-Prüfung über mtime-Fingerprints, D7), dann alle `files`-Einträge
kompilieren, dann Report.

**Abhängigkeit:** µCSS hängt von µPS ab (Atlas, Bildererzeugung) — nicht
umgekehrt. Beide bleiben separat veröffentlichbar.

---

## 4. JSON-Repräsentation und Manipulation per Gulp

`CssDocument` ist die geforderte manipulierbare Repräsentation:

```js
import { CssDocument } from "gulp-mu-css";

const doc = await CssDocument.FromFile("skins/src/src.µ.css");
doc.FindRules(/^div\.panel/).forEach((_rule) => _rule.AddProperty("outline", "none"));
doc.FindRule("@keyframes glittery", "from").ChangeProperty("background-position-x", "-128px");
doc.ToJson();   // -> { rules: [{ selector, declarations: [{ prop, value }], ... }] }
await doc.ToFile("out/std.css");
```

- `ToJson()`/`FromJson()` liefern einen schlanken, stabilen JSON-Baum
  (Selektoren, Properties, At-Rules, Kommentare) — geeignet für eigene
  Gulp-Transformationen oder Diff-Tests.
- Für Spezialfälle bleibt der rohe PostCSS-AST über `doc.root` zugänglich
  (volles Ökosystem: postcss-nested, postcss-sorting, Stylelint …).

---

## 5. Gulp-Integration

```js
// gulpfile.mjs (AiDPix bzw. Projektstamm)
import { BuildSkin } from "gulp-mu-css";

export async function SkinStd() {
	await BuildSkin("skins/src/std.µcss.mjs");
}
export function SkinWatch() {
	gulp.watch(["skins/src/**/*.µ.css", "skins/src/*.mjs", "dev/media/final/**"], SkinStd);
}
```

- Ein Task pro Skin; `BuildSkin` ist idempotent und cache-gestützt (D7): nur
  geänderte PSDs werden neu gerendert, der Atlas nur bei Bildänderungen neu
  gepackt, Copy-Steps laufen als Make-artiger mtime-Vergleich.
- Tests als Gulp-Tasks im Projektstamm (Konvention dieses Repos): Unit-Tests der
  Module plus der End-to-End-Vergleich gegen die alten AiDPix-Ausgaben.

---

## 6. Migration des AiDPix-Bestands

Ein Konverter-Werkzeug `tools/convert-mucss.mjs` übersetzt die alte Syntax
mechanisch (das Gros ist regelbasiert ersetzbar):

| Alt | Neu |
| :--- | :--- |
| `-µcss: µ.Cursor("wait");` + `cursor: wait;` | `cursor: µ(Cursor("wait"));` |
| `-µcss: µ.SetBackgroundColor(µ.$.x);` + Platzhalter | `background-color: µ($.x);` |
| `-µcss: µ.AddProperty("border", "1px solid "+µ.Lighten(...));` | `border: 1px solid µ(Lighten(...));` |
| `-µcss: µ.Sprite("p.png");` | `-µ: Sprite("p.png");` |
| `-µcss: µ.SetRememberBlock("n");` | entfällt — Hooks adressieren per Pfad: `doc.FindRule("@keyframes glittery", "from")` |
| `-µcss: //µ.X(...)` (deaktiviert) | `/* -µ: X(...) */` |
| `µ.$.name=wert` (µ.std.css) | `vars`-Eintrag im Manifest |
| `µ.DefCursor(...)` | `cursors`-Eintrag im Manifest |
| `µ.plugins.*` / FileCopy | `media`-Einträge im Manifest |
| `µ.$.Fn=function(...)«…»` | exportierte Funktion in `helpers.mjs` (manuell nachformatieren) |

Die `«»¡`-Funktionskörper werden zu normalem JavaScript zurückübersetzt
(`«`→`{`, `»`→`}`, `¡`→`;`) und landen als Startpunkt in `helpers.mjs`;
manuelle Nacharbeit ist hier eingeplant (5 Funktionen im Bestand).

---

## 7. Meilensteine

1. **M1 — Kern** ✅ *(umgesetzt)*: PostCSS-Pipeline, `CssDocument`, `MuContext`, `µ()`-Interpolation,
   `-µ:`-Direktiven, Farb-API (`Lighten`/`Alpha`/`MixColors` aus `µCSS.jsx` portieren —
   Semantik siehe Abschnitt 9.2 —, bitgenau gegen alte Ausgaben getestet).
2. **M2 — Sprites & Cursor** ✅ *(umgesetzt)*: Sprite-/Cursor-Direktiven inkl. Atlas (microPS),
   Retina/image-set, Preload-Regel; Test gegen `µ.Sprite`-Beispiel aus dem Handbuch.
3. **M3 — Manifest & Gulp** ✅ *(umgesetzt)*: `DefineSkin`/`BuildSkin`, media-Steps (microPS-Bridge),
   inkrementeller Build-Cache nach D7 (mtime-Fingerprints, Atlas-Positions-Cache),
   Watch (über `gulp.watch` im Projekt-Gulpfile, `BuildSkin` ist re-entrant).
4. **M4 — Hooks & Makros** ✅ *(umgesetzt)*: `this`-gebundene Helper (Ersatz der µ-Globals),
   `InsertRule` (positionstreues Einfügen, ersetzt `AddBlock(n, µ.elementNo)`),
   `afterWork`-Kontext mit `url`/`baseDir`, Pfad-Adressierung statt RememberBlocks;
   Borders/TableBackgrounds/Glittery/FlyEx(Utils) als Referenz-Implementierung
   in `test/fixtures/aidpix-helpers.mjs`, getestet in `test/Macros.test.mjs`.
5. **M5 — Migration AiDPix** ✅ *(umgesetzt)*: `tools/convert-mucss.mjs` übersetzt
   `µ.std.css` → Manifest (`std.µcss.mjs` + `helpers.mjs`) und alle `src*.css` →
   `*.µ.css` (Direktiven, Setter→Platzhalter-Merge, `«»¡`, Encoding-Reparatur);
   `tools/compare-aidpix.mjs` baut den Skin (`skins/std-new`) und vergleicht
   strukturell gegen die alte Ausgabe: **2 951 Regeln, 0 unerwartete
   Differenzen**, 53 dokumentierte Legacy-Drift-Fälle (fehlende Quellbilder im
   Extract, nach dem letzten µCSS-Lauf editierte Quellen, Alpha-Quantisierung
   ±1/255). Gulp-Tasks im Projektstamm: `aidpix:convert`, `aidpix:compare`,
   `test:aidpix`.
6. **M6 — Dokumentation** ✅ *(umgesetzt)*: Deutsches Handbuch nach dem Vorbild des
   alten `µCSS.pdf`/`µCSS.old.docx` (Kapitelstruktur: Einführung, Installation,
   Anwendungsfälle, Grundideen, Build-Ablauf, Manifest-/Kontext-Referenz,
   Farben, Node-API, Fehlerdiagnostik, Migration, Rechtliches). Quelle ist
   `docs/manual/microCSS-Handbuch.md`; `tools/build-manual.mjs` generiert
   daraus `docs/microCSS-de.docx` (npm-Paket `docx`, automatische
   Kapitelnummerierung, Inhaltsverzeichnis als Word-Feld, Code-Blöcke und
   Tabellen). Gulp-Task im Projektstamm: `docs:manual`.

---

## 8. Offene Fragen

1. **`@µ { … }`-Inline-JS-Blöcke**: bewusst zurückgestellt; erst einführen, wenn der
   Manifest-Ansatz in der Praxis nicht reicht.

## 9. Entschiedene Fragen (vormals offen)

1. **Dateinamen**: Pro Skin/Thema ein Manifest `<skinname>.µcss.mjs` im
   Quellverzeichnis (z. B. `std.µcss.mjs`); `.µ.css`-Quellen frei benennbar;
   Zielverzeichnis `<skinname>/` wird automatisch angelegt und enthält CSS,
   Medien und Build-Cache (siehe D3). Mehrere Skins = mehrere Manifeste im
   selben Quellverzeichnis, die sich `.µ.css`-Quellen und Helpers teilen können;
   AiDPix nutzt aktuell nur `std`.
2. **`Lighten`-Semantik**: Aus `µCSS.jsx` geklärt — die aktive Implementierung
   arbeitet in **HSL** mit relativer Lightness-Skalierung:
   `L' = clamp(L + L·p, 0, 1)` (RGB→HSL, skalieren, zurück; Alpha bleibt
   erhalten). Das erklärt Steps bis 7.0: Große Faktoren clampen gegen Weiß.
   Negative Steps dunkeln ab. Die neue API erhält einen **optionalen
   Farbmodell-Parameter**: `Lighten(color, step, model = "hsl")` —
   `"hsl"` ist der bitkompatible Legacy-Default, `"oklch"` als wahrnehmungs-
   gleichmäßige Alternative für neue Skins. Gleicher Parameter perspektivisch
   für `MixColors`/`Darken`-Verwandte.
3. **WebP**: **Globaler Schalter im Manifest**: `imageFormat: "png" | "webp"`
   (Default `"png"`). Gilt für alle bilderzeugenden `media`-Steps (microPS
   unterstützt beides über die Dateiendung) und — sofern `sprites.format`
   fehlt — den Sprite-Atlas; einzelne Steps können das Format per eigenem
   `format`-Feld übersteuern. `appIcons` ignoriert `imageFormat` (feste
   Plattform-Formate). Direkt referenzierte Bestandsbilder (`url(...)` in den
   Quellen, `copy`-/`copyFolder`-Steps) bleiben unangetastet.
   - **`sprites.format` (additiv, ab 2.1.0)** entkoppelt das **Atlas-Format**
     vom globalen `imageFormat`: `atlasFormat = sprites.format ?? imageFormat`.
     Ein Skin lässt sich damit allein durch `sprites.format = "webp"` auf einen
     WebP-Atlas umstellen, ohne `format`-Overrides an den Generator-Steps.
   - **Formatunabhängige `Sprite()`-Auflösung (ab 2.1.0)**: Quellbildpfade
     werden mit literaler Endung zuerst, dann über die unterstützten
     Raster-Endungen (`png`, `webp`) aufgelöst; die `@2x`-Variante folgt der
     Endung des aufgelösten 1x-Bilds. Divergieren Generator-Output und
     CSS-Referenz in der Endung, bricht der Build nicht — nur wenn **keine**
     Variante existiert.
   - **`copyFolder`-Filter**: Schließt der `filter` die aktive
     `imageFormat`-Endung aus, warnt der Build (statt frisch erzeugte Dateien
     stillschweigend zu verwerfen).
