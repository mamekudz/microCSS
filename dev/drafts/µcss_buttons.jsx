
// Photoshop Script to export Buttons
// 2011-12 Dongleware Verlags GmbH
#target Photoshop

String.prototype.suffix=function(){
var s=""+this.valueOf();
var i;
var _ret=s;
	i=s.lastIndexOf(".");
	if(i>-1)_ret=s.substr(i+1);
	return _ret.toLowerCase();
};

String.prototype.withoutSuffix=function(){
var s=""+this.valueOf();
var i;
var _ret=s;
	i=s.lastIndexOf(".");
	if(i>-1)_ret=s.substr(0,i);
	return _ret;
};


function SaveDoc(_path,_name,_suffix){
var doc=app.activeDocument;
var fw,saveopt=new PNGSaveOptions();
	if(btnSizes[_name]!=60)doc.resizeImage(btnSizes[_name]+"px",btnSizes[_name]+"px",72,ResampleMethod.BICUBICSHARPER);
	fw=new File(_path+"/"+_name+_suffix+'.png');
	doc.saveAs(fw,saveopt,true,Extension.LOWERCASE); 
};

// BUTTONS

function SaveButtons(_style,_suffix){
var doc=app.activeDocument,path="E:/Projects/adobe_scripts/µCSS/imgs/buts";
var i,j,history,butLayers=new Array(),normalStateLayer;
	for(i=0;i<doc.artLayers.length;i++){
		doc.artLayers[i].visible=false;
		if(doc.artLayers[i].name.substr(0,4)=='but_')butLayers[butLayers.length]=i;
		if(doc.artLayers[i].name==('style_'+_style))normalStateLayer=i;
	}
	history=doc.activeHistoryState;
	//alert(history);
	for(i=0;i<butLayers.length;i++){
		doc.activeLayer=doc.artLayers[normalStateLayer];
		executeAction(charIDToTypeID("CpFX"),undefined,DialogModes.NO);
		doc.artLayers[normalStateLayer].visible=false;
		doc.activeLayer=doc.artLayers[butLayers[i]];
		doc.artLayers[butLayers[i]].visible=true;
		executeAction(charIDToTypeID("PaFX"),new ActionDescriptor(),DialogModes.NO);
		SaveDoc(path,doc.artLayers[butLayers[i]].name,_suffix);
		doc.activeHistoryState=history;
		doc.artLayers[butLayers[i]].visible=false;
	}
}
function SaveIcons(){
var doc=app.activeDocument,path="E:/Projects/adobe_scripts/µCSS/imgs/icons";
var i,j,history,iconLayers=new Array();
	for(i=0;i<doc.artLayers.length;i++){
		doc.artLayers[i].visible=false;
		if(doc.artLayers[i].name.substr(0,4)=='ico_')iconLayers[iconLayers.length]=i;
	}
	history=doc.activeHistoryState;
	//alert(history);
	for(i=0;i<iconLayers.length;i++){
		doc.activeLayer=doc.artLayers[iconLayers[i]];
		doc.artLayers[iconLayers[i]].visible=true;
		SaveDoc(path,doc.artLayers[iconLayers[i]].name);
		doc.activeHistoryState=history;
		doc.artLayers[iconLayers[i]].visible=false;
	}
}

function ButtonsCreate(){
var mf=new File("E:/Projects/adobe_scripts/µCSS/dev/drafts/µcss_buttons.psd");
var mydoc=app.open(mf);
var doc=app.activeDocument;
	//SaveButtons('dark','_d');
	SaveButtons('light','');
	//SaveIcons();
	doc.close(SaveOptions.DONOTSAVECHANGES);
};

var miniSize=10,midiSize=20,maxiSize=30;
var btnSizes=
{
	"but_help":midiSize,
	"but_info":midiSize,
	"but_edit":midiSize,
	"but_cacheclear":midiSize,
	"but_check":midiSize,
	"but_addfiles":midiSize,
	"but_removefiles":midiSize,
	"but_compile":maxiSize,
	"but_compile_4":maxiSize,
	"but_compile_3":maxiSize,
	"but_compile_2":maxiSize,
	"but_compile_1":maxiSize,
	"but_compile_0":maxiSize,
}

ButtonsCreate();