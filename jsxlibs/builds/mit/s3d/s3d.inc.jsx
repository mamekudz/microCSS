// DW S3D Lib
// © 2005-2014 Dongleware Verlags GmbH
//
// These scripts are published under MIT licence and are for free and commercial use.
// Neither Dongleware nor the author can’t be held liable for any damages by using these scripts may cause.
// The use of this software is on your own risk. Save your works before using these scripts.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var DWLIB_s3d=true;
var miniBtnMargin=[2,2,2,2],midiBtnMargin=[3,3,3,3],maxiBtnMargin=[4,4,4,4];
var shtt=GetBooleanSetting("S3DSetup","showtooltips",true);
var LIB3DSCRIPTFOLDER=$.fileName.substr(0,$.fileName.lastIndexOf('/'));
var PanelWindow;

var S3DRELEASES=[
	{"main":2,"minor":2,"revision":4,"date":"2013-11-26 21:00","beta":true,
		"info":[
			"MLT support added"
		]
	},
	{"main":2,"minor":2,"revision":3,"date":"2013-11-07 00:40","beta":true,
		"info":[
			"project panel: optional prefix exchange of output filename implemented"
		]
	},
	{"main":2,"minor":2,"revision":2,"date":"2013-11-05 00:00",
		"info":[
			"project panel: import in/outPoint bug fixed",
			"project panel: import template setting bug fixed",
			"project panel: progress bar improved",
			"color panel: update bug fixed"
		]
	},
	{"main":2,"minor":2,"revision":1,"date":"2013-11-01 00:00",
		"info":[
			"geometric panel: new geometric S3D justage evolution algorithm",
			"project panel: export filter"
		]
	},
	{"main":2,"minor":1,"revision":0,"date":"2013-10-27 00:00",
		"info":[
			"geometric panel: shift key for basic justage only",
			"geometric panel: crop bug fixed",
			"S3D Color panel (needed Re:Match PlugIn)"
		]
	},
	{"main":2,"minor":0,"revision":0,"date":"2012-11-01 00:00",
		"info":[
			"new redesign",
			"autopano supported",
			"panel support",
			"new project structure"
		]
	},
	{"main":1,"minor":0,"revision":0,"date":"2005-09-15 00:00",
		"info":[
			"first version"
		]
	}
];

// =============================================
// STRING PROTOTYPES
// =============================================

String.prototype.pureS3DName=function(){
var s=this.valueOf();
	return s.withoutSuffix().cutAtLastCharOf('_');
}
String.prototype.S3DSuffix=function(){
var s=this.valueOf();
	return s.withoutSuffix().cutLastAtCharOf('_');
}
String.prototype.S3DSuffixNoLR=function(){
var s=this.valueOf(),s=s.withoutSuffix().cutLastAtCharOf('_');
	return s.substr(0,s.length-1);
}
String.prototype.isLeftName=function(){
var s=this.valueOf();
	return s.withoutSuffix().lastChar()=='l';
}
String.prototype.isRightName=function(){
var s=this.valueOf();
	return s.withoutSuffix().lastChar()=='r';
}
String.prototype.eyeSuffix=function(){
var s=this.valueOf();
	return s.withoutSuffix().lastChar();
}

// =============================================
// GUI PROTOTYPES
// =============================================
DropDownList.prototype.replace=function(_rplary){
var i;
	for(i=this.items.length-1;i>=0;i--)this.remove(this.items[i]);
	for(i=0;i<_rplary.length;i++)this.add("item",_rplary[i],i);
}


// =============================================
// AE PROPERTIES PROTOTYPES
// =============================================
Property.prototype.getParentLayer=function(){
var o=this.parentProperty;
	while(o!=null)if(o instanceof AVLayer){return o}else{o=o.parentProperty};
	return null;
}

Property.prototype.previousKeyTime=function(){
var i,k=this.numKeys,parentLayer=this.getParentLayer(),minTime,myTime;
	if(parentLayer!=null&&k>0){
		curTime=parentLayer.containingComp.time;
		minTime=parentLayer.containingComp.workAreaStart;
		for(i=1;i<=k;i++){
			myTime=this.keyTime(i);
			if(myTime>minTime&&myTime<curTime)minTime=myTime;
		};
		return minTime;
	}else{
		return 0;
	}
}
Property.prototype.nextKeyTime=function(){
var i,k=this.numKeys,parentLayer=this.getParentLayer(),maxTime,myTime;
	if(parentLayer!=null&&k>0){
		curTime=parentLayer.containingComp.time;
		maxTime=parentLayer.containingComp.workAreaStart+parentLayer.containingComp.workAreaDuration;
		for(i=1;i<=k;i++){
			myTime=this.keyTime(i);
			if(myTime<maxTime&&myTime>curTime)maxTime=myTime;
		};
		return minTime;
	}else{
		return 0;
	}
}

Project.prototype.comp=function(_name){
	for(var i=1;i<=this.numItems;i++)if(this.item(i).name==_name)return this.item(i);
}

CompItem.prototype.layerWithoutSuffix=function(_name){
	for(var i=1;i<=this.numLayers;i++)if(this.layer(i).name.withoutSuffix()==_name)return this.layer(i);
}

function GetActivStereoSubProject(){
	if(typeof(app.project.selection[0])!="undefined"){
		return app.project.selection[0].name.pureS3DName();
	}else{
		if(app.project.activeItem!=null){
			return app.project.activeItem.name.pureS3DName();
		}else{
			return "";
		}
	}
}

function GetActivStereoSubProject2(){
	if(app.project.activeItem!=null){
		return app.project.activeItem.name.pureS3DName();
	}else{
		return "";
	}
}

function GetStereoPairArray(_i){
var fo=new File(varfolder+'\\o_'+_i+'.oto'),ret=new Array();
		fo.open("r");
		//bf.write(_bathcmds);
		fo.close();
}

// ============================
// DIALOGS
// ============================
function StereoFootagesSelect(_title,_startButtonText,_settingsBase,_settingsId){
var w,z,i,foots,ret;
	w=new Window("dialog",_title,[0,0,100,200],{resizeable:true});
	w.alignChildren="center";
	
	w.curFootages=new Array();
	for(i=1;i<=app.project.numItems;i++){
		if(app.project.item(i) instanceof FolderItem)if(app.project.item(i).parentFolder==app.project.rootFolder){
			z=app.project.item(i).name;
			if(z!="Render Copies"){
				w.curFootages[w.curFootages.length]=z;
			}
		}
	}
	
	w.footagesgrp=w.add("group");
	with(w.footagesgrp){
		add("statictext",undefined,i18x.Trans("Stereoscopic Footages"));
		w.footages=w.add("listbox",undefined,w.curFootages,{multiselect:true});
		z=GetSetting(_settingsBase,_settingsId,"");
		var oldfoots=z.split("|");
		var foots=new Array();
		for(i=0;i<oldfoots.length;i++){
			if(w.curFootages.in_array(oldfoots[i]))foots[foots.length]=i;
		}
		w.footages.selection=foots;
		w.footages.maximumSize.height=200;
	}
	
	w.buttongrp=w.add("group");
	with(w.buttongrp){
		alignChildren="right";
		btnok=add("button",undefined,_startButtonText,{name:"ok"});
		defaultElement=btnok;
		btncancel=add("button",undefined,i18x.Trans("Cancel"));
		cancelElement=btncancel;
	}

	w.layout.layout(true);
	w.layout.resize();
	w.onResizing=function(){this.layout.resize();}
	w.center();
	ret=w.show();
	if(ret==2){
		return false;
	}else if(ret==1){
		foots=new Array();
		if(w.footages.selection!=null)for(i=0;i<w.footages.selection.length;i++)foots.push(w.footages.selection[i].text);
		SetSetting(_settingsBase,_settingsId,foots.join("|"));
		return foots;
	}else{
		return false;
	};
}

// ============================
// FW
// ============================
var FWONLY=0,FWNONE=1,FWBLEND=2;

function SwitchFW(_fwmode,_comp){
var name=_comp.name.pureS3DName(),i,lname;
	for(i=1;i<=_comp.numLayers;i++){
		lname=_comp.layer(i).name.S3DSuffixNoLR();
		switch(lname){
			case 'cfw':
				switch(_fwmode){
					case FWONLY:
						_comp.layer(i).enabled=true;
						break;
					case FWNONE:
						_comp.layer(i).enabled=false;
						break;
					case FWBLEND:
						_comp.layer(i).enabled=false;
						break;
				}
				break;
			case '':
				switch(_fwmode){
					case FWONLY:
						_comp.layer(i).enabled=false;
						break;
					case FWNONE:
						_comp.layer(i).enabled=true;
						_comp.layer(i).trackMatteType=TrackMatteType.NO_TRACK_MATTE;
						break;
					case FWBLEND:
						_comp.layer(i).enabled=true;
						_comp.layer(i).trackMatteType=TrackMatteType.ALPHA;
						break;
				}
				break;
		}
	}
}

// ============================
// 3DGlasses
// ============================
var GLASSES_ANAGLYPH=9,GLASSES_SIDEBYSIDE=1,GLASSES_OVERUNDER=2,GLASSES_INTERLEAVE=3,GLASSES_DIFFERENCE=4;

function Switch3DGlasses(_glassmode){
var threedee,sf,acjl,acj;
	if(app.project==null)return;
	if(app.project.activeItem==null)return;
	sf=app.project.activeItem.name.pureS3DName();
	if(sf!=""){
		acj=app.project.comp(sf+"_cjustage");
		if(acj!=null){
			acjl=acj.layer(sf+"_cl");
			if(acjl!=null){
				threedee=acjl.effect("Stereo Display");
				if(threedee!=null){
					threedee.property(7).setValue(_glassmode);
				};
			};
		};
	};
}

function AddSwitch3DGlassesButtons(_w,_iconFolder,_colorbase){
var AEDESKTOPCOLORBASE=_w.graphics.backgroundColor.color[0]>0.5?'_d':'_l';
	_w.viewgrp=_w.add("group");
	with(_w.viewgrp){
		btnanaglyph=add("iconbutton",undefined,File(_iconFolder+"btn_view_anaglyph"+_colorbase+".png"));
		btnanaglyph.titleLayout.margins=midiBtnMargin;
		if(shtt)btnanaglyph.helpTip=i18x.Trans("...set preview to anaglyph...");
		btnanaglyph.onClick=function(){Switch3DGlasses(GLASSES_ANAGLYPH);};
		
		btnsidebyside=add("iconbutton",undefined,File(_iconFolder+"btn_view_sidebyside"+_colorbase+".png"));
		btnsidebyside.titleLayout.margins=midiBtnMargin;
		if(shtt)btnsidebyside.helpTip=i18x.Trans("...set preview to side by side...");
		btnsidebyside.onClick=function(){Switch3DGlasses(GLASSES_SIDEBYSIDE);};
		
		btnoverunder=add("iconbutton",undefined,File(_iconFolder+"btn_view_overunder"+_colorbase+".png"));
		btnoverunder.titleLayout.margins=midiBtnMargin;
		if(shtt)btnoverunder.helpTip=i18x.Trans("...set preview to over/under...");
		btnoverunder.onClick=function(){Switch3DGlasses(GLASSES_OVERUNDER);};
		
		btninterleave=add("iconbutton",undefined,File(_iconFolder+"btn_view_interleave"+_colorbase+".png"));
		btninterleave.titleLayout.margins=midiBtnMargin;
		if(shtt)btninterleave.helpTip=i18x.Trans("...set preview to interleave...");
		btninterleave.onClick=function(){Switch3DGlasses(GLASSES_INTERLEAVE);};

		btndifference=add("iconbutton",undefined,File(_iconFolder+"btn_view_difference"+_colorbase+".png"));
		btndifference.titleLayout.margins=midiBtnMargin;
		if(shtt)btndifference.helpTip=i18x.Trans("...set preview to difference...");
		btndifference.onClick=function(){Switch3DGlasses(GLASSES_DIFFERENCE);};
	}
}

// ============================
// GUI UTIL
// ============================

function S3DPanelFooter(_w,_onClick){
var iconFolder=SCRIPTFOLDER+"/S3D%20Resources/icons/",docFolder=SCRIPTFOLDER+"/S3D%20Resources/";
	_w.footer=_w.add("group");
	with(_w.footer){
		s3dlogo=add("image",undefined,File(iconFolder+"s3d_logo.png"));
		s3dlogo.alignment="center";
		s3dlogo.onClick=_onClick;
		vtxt=add("statictext",undefined,"V"+S3DRELEASES[0].main+"."+S3DRELEASES[0].minor+"."+S3DRELEASES[0].revision+((S3DRELEASES[0].beta)?"β":"")+" • ©2005-2013");
		vtxt.graphics.foregroundColor=vtxt.graphics.newPen(vtxt.graphics.PenType.SOLID_COLOR,[0.5,0.5,0.5],1);
		vtxt.graphics.font.size=8;
	}
	
	_w.footerdw=_w.add("group");
	with(_w.footerdw){
		dwlogo=add("image",undefined,File(iconFolder+"dw_logo.png"));
		dwlogo.alignment="center";
		if(IS_WINDOWS){
			dwlogo.helpTip=i18x.Trans("...click to view dongleware ae scripts web page...");
			dwlogo.onClick=function(){WindowStart("Start http://www.dongleware.com/dw_ae_s3d_scripts.php");};
			///btnhelp=add("iconbutton",undefined,File(iconFolder+"btn_help.png"));
			//btnhelp.titleLayout.margins=miniBtnMargin;
			//btnhelp.onClick=function(){ExecOnWindows('Start "file:///'+docFolder+'Dongleware%20AE%20S3D%20Scripts%20V2.0%20english.pdf"');};
		}
	}
}
function CheckAEScriptingDiskEnable(){
	if(!app.preferences.getPrefAsLong("Main Pref Section","Pref_SCRIPTING_FILE_NETWORK_SECURITY"))alert(i18x.Trans("Set scripting Prefs to enable to write to disk."));
};

i18x.Load($.fileName.dirname());