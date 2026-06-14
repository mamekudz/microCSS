# µCSS

**Ein Adobe® Photoshop® CSS-Prozessor.**

µCSS ist ein ExtendScript-Werkzeug (`.jsx`) für Adobe Photoshop, das aus
CSS-Dateien mit eingebetteten `-µcss`-Anweisungen automatisch Web-Grafiken
erzeugt und das CSS dabei aufbereitet. Aus Photoshop-Ebenen und -Dokumenten
werden u. a. Sprites, Retina-Grafiken (`@2x`) und Buttons generiert, während
die zugehörigen CSS-Regeln (Positionen, Maße, `image-set`, Gradienten …)
direkt in die CSS-Datei geschrieben werden.

> Status: `0.9.6` (Beta, experimentell) — © 2005–2014 Dongleware Verlags GmbH,
> geschrieben von Meinolf Amekudzi. Veröffentlicht unter der MIT-Lizenz.

## Funktionen

- **Sprite-Generierung** inkl. Bitpacking-Algorithmus und Padding
- **Retina-Support** (`@2x`, `image-set(...)`)
- **Bild-Cache** (Sprites & Bilder) für schnellere Re-Builds
- **CSS-by-Template** Layouts
- **Color-Maps** und benannte CSS-Eigenschaften
- **Cursors**, **Image-Preload**, **Gradienten** (inkl. IE-`filter`-Fallback)
- **Plugin-System** (siehe `µCSS/plugins/`)
- **FTP-Sync** zum Hochladen erzeugter Assets

## Verzeichnisstruktur

```
µCSS/                     Repository-Wurzel
├── µCSS/                 Lauffähiger Photoshop-Skriptordner
│   ├── µCSS.jsx          Hauptskript (in Photoshop ausführen)
│   ├── µCSS.pdf          Handbuch (wird über den Info-Button geöffnet)
│   ├── i18x/             Lokalisierung (z. B. de.json)
│   ├── imgs/             UI-Icons des Dialogs
│   ├── plugins/          µCSS-Plugins
│   │   ├── AppIconMaker/
│   │   └── ButtonAndIconCreator/
│   └── examples/         Beispiel-CSS/HTML + Bilder
├── jsxlibs/              Git-Submodul → mamekudz/JSXLIBS
│   └── builds/{mit,bsd-apache,gpl,lgpl-mpl}/…
└── dev/                  Entwicklungsmaterial (Doku-Quellen, Drafts, Tests)
```

Wichtig: `µCSS.jsx` bindet die Bibliotheken relativ über
`#include "../jsxlibs/builds/…"` ein. Der Ordner `jsxlibs/` muss daher als
**Schwesterordner** von `µCSS/` liegen — genau diese Anordnung bildet das
Repository ab und entspricht dem auslieferbaren Paket.

Die Bibliotheken werden nicht dupliziert, sondern als **Git-Submodul** aus dem
separaten Repository [mamekudz/JSXLIBS](https://github.com/mamekudz/JSXLIBS)
eingebunden.

## Installation & Verwendung

1. Repository inklusive Submodul klonen, damit `µCSS/` und `jsxlibs/`
   nebeneinander liegen:

   ```bash
   git clone --recurse-submodules https://github.com/mamekudz/microCSS.git
   # oder nach einem normalen Klon:
   git submodule update --init --recursive
   ```
2. In Photoshop **Datei → Skripten → Durchsuchen…** wählen und
   `µCSS/µCSS.jsx` ausführen (alternativ in den Photoshop-`Scripts`-Ordner
   legen).
3. Im Dialog die zu kompilierende(n) CSS-Datei(en) hinzufügen und kompilieren.

### Beispiel: Sprite-Anweisung im CSS

```css
/* µCSS erzeugt aus den referenzierten Photoshop-Bildern ein Sprite */
::-µcss-init{
	-µcss:µ.options.sprites.save.relPath="./imgs";
}
div.loginbutton{
	display:inline-block;
	-µcss:µ.Sprite("imgs/aqua/but_login_normal.png");
	background-image:url(imgs/sprites.png);
	background-image:image-set(url(imgs/sprites.png)1x,url(imgs/sprites@2x.png)2x);
	background-repeat:no-repeat;
	background-position:-110px -55px;
	width:55px;
	height:55px;
}
```

Weitere Beispiele (Color-Maps, Templates, Cursors, Image-Preload, Plugins …)
liegen unter `µCSS/examples/`.

## Lizenz

MIT-Lizenz — siehe [LICENSE](LICENSE). Die als Submodul eingebundenen
Bibliotheken unter `jsxlibs/builds/` stehen unter den im jeweiligen Unterordner
genannten Lizenzen (MIT, BSD/Apache, GPL, LGPL/MPL).
