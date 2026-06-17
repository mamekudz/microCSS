import { DefineSkin } from "../../gulp-mu-css/src/index.mjs";

export default DefineSkin({
	media: [
		{
			buttonsAndIcons: "dev/media/drafts/buttons.psd",
			layout: "aqua",
			outputDir: "imgs/aqua"
		},
		{
			buttonsAndIcons: "dev/media/drafts/buttons.psd",
			layout: "alu",
			outputDir: "imgs/alu"
		}
	],

	files: [{ source: "demo.µ.css", target: "demo.css" }]
});
