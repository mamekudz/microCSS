# Color / emoji webfont example

µFT packages an existing OpenType color font (COLR/CPAL, SVG-in-OT, CBDT, sbix) as WOFF/WOFF2 and writes a standard `@font-face`. It does **not** animate emoji.

```js
import { FontGenerator } from "gulp-mu-ft";

await FontGenerator.Create({
	fontName: "ChatEmoji",
	src: "vendor/NotoColorEmoji-Regular.ttf",
	outputDir: "fonts"
});
```

Then in the page:

```html
<p style="font-family: ChatEmoji, sans-serif;">Hello 😀 🎉</p>
```

`build.mjs` in this folder runs the same pipeline against a small COLR fixture (for CI). For production chat/OXYD text, point `src` at a real emoji font (Noto Color Emoji COLR, Twemoji Mozilla, …).

```
node examples/color-font/build.mjs
```
