import { DefineSkin } from "../../gulp-mu-css/src/index.mjs";
import { GlitterySprite } from "../shared/effect-helpers.mjs";

export default DefineSkin({
	vars: {
		GlitteryZIndex: 12000
	},

	helpers: { GlitterySprite },

	media: [
		{
			sequenceStrip: "dev/media/raw/glittery/imgs",
			outputFile: "dev/media/final/glittery/glittery.png",
			outputBase: "project"
		},
		{
			copyFolder: "dev/media/final/glittery",
			to: "imgs/glittery",
			filter: ".*\\.(png|json)"
		}
	],

	files: [{ source: "demo.µ.css", target: "demo.css" }]
});
