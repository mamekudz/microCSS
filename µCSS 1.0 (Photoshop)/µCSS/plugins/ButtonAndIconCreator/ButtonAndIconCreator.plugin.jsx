#target Photoshop
	// ButtonAndIconCreator µCSS PlugIn
	// A µCSS plugin to create buttons for different layouts automaticly.
	// © 2005-2014 Dongleware Verlags GmbH
	// Written by Meinolf Amekudzi
	//
	// These scripts are published under MIT license and are for free and commercial use.
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

function ButtonAndIconCreator(){	
	this.name="ButtonAndIconCreator";
	this.RELEASES=[
		{"main":1,"minor":1,"revision":2,"beta":false,"date":"2014-02-28 21:00",
			"info":[
				"Rename to 'ButtonAndIconCreator'"
			]
		},
		{"main":1,"minor":1,"revision":1,"beta":false,"date":"2014-01-12 18:00",
			"info":[
				"µ.cache bug fixes"
			]
		},
		{"main":1,"minor":1,"revision":0,"beta":false,"date":"2013-12-16 12:00",
			"info":[
				"µ.cache support added",
				"top-layer-sets method added"
			]
		},
		{"main":1,"minor":0,"revision":0,"date":"2013-03-29 22:00",
			"info":[
				"first stable µCSS plugin version"
			]
		}
	];
	
	this.RELEASE=this.RELEASES[0].main+"."+this.RELEASES[0].minor+"."+this.RELEASES[0].revision;

	this.Init=function(){
	};
	
	this.Exit=function(){
	};

	this._Save=function(_path,_name,_retina){
	var doc=app.activeDocument;
	var fw,saveopt=new PNGSaveOptions(),nfn;
		PNGSaveOptions.compression=9;
		PNGSaveOptions.interlaced=false;
		if(_retina){
			nfn=_path+"/"+_name+'@2x.png';
			fw=new File(nfn);
			doc.saveAs(fw,saveopt,true,Extension.LOWERCASE);
		};
		nfn=_path+"/"+_name+'.png';
		fw=new File(nfn);
		if(_retina)doc.resizeImage(doc.width/2,doc.height/2,72,ResampleMethod.BICUBICSHARPER);
		doc.saveAs(fw,saveopt,true,Extension.LOWERCASE);
	};
	
	this._Create=function(_psdPathName,_layout,_path,_retinaMode){
	var e,i,b,doc=app.activeDocument,history,name,ok=false,dp=new Folder(_path);
	var iconsLayerSet=null,layoutsLayerSets=null,layoutLayerSet=null,layoutIconLayer;
		if(!dp.exists)dp.createIfNotExists();
		µCSSLog(i18x.Trans("ButtonAndIconCreator: (<layout/>, <filename/>)...",{"layout":_layout,"filename":_path}));
		// search base layers...
		for(i=0;i<doc.layerSets.length;i++){
			doc.layerSets[i].visible=false;
			if(doc.layerSets[i].name=="icons")iconsLayerSet=doc.layerSets[i];
			if(doc.layerSets[i].name=="layouts")layoutsLayerSets=doc.layerSets[i];
		}
		if(iconsLayerSet==null){µCSSError(i18x.Trans("ButtonAndIconCreator: Icons not found!"));return;};
		if(layoutsLayerSets==null){µCSSError("ButtonAndIconCreator: Layout not found! (<layout/>)".i18xTrans({"layout":_layout}));return;};
		
		// hide all icons...
		for(i=0;i<iconsLayerSet.layers.length;i++)iconsLayerSet.layers[i].visible=false;
		// hide all layouts and find selected layout...
		for(i=0;i<layoutsLayerSets.layers.length;i++){
			layoutsLayerSets.layerSets[i].visible=false;
			if(layoutsLayerSets.layerSets[i].name==_layout)layoutLayerSet=layoutsLayerSets.layerSets[i];
		};
		if(layoutLayerSet==null){µCSSError("ButtonAndIconCreator: Layout not found!".i18xTrans({"layout":_layout}));return;};
		
		// hide all button states...
		for(b=0;b<layoutLayerSet.layerSets.length;b++)layoutLayerSet.layerSets[b].visible=false;
		
		iconsLayerSet.visible=true;
		layoutsLayerSets.visible=true;
		layoutLayerSet.visible=true;
		//create buttons...
		for(b=0;b<layoutLayerSet.layerSets.length;b++){
			for(i=0;i<iconsLayerSet.layers.length;i++){
				if(iconsLayerSet.layers[i].name!="_"){
					history=doc.activeHistoryState;
					layoutLayerSet.layerSets[b].visible=true;
					layoutIconLayer=layoutLayerSet.layerSets[b].layers.getByName("icon");
					if(layoutIconLayer){
						layoutIconLayer.visible=true;
						doc.activeLayer=layoutIconLayer;
						try{executeAction(charIDToTypeID("CpFX"),undefined,DialogModes.NO);}catch(e){};
						layoutIconLayer.visible=false;
						iconsLayerSet.layers[i].visible=true;
						doc.activeLayer=iconsLayerSet.layers[i];
						try{executeAction(charIDToTypeID("PaFX"),new ActionDescriptor(),DialogModes.NO);}catch(e){};
						name=iconsLayerSet.layers[i].name+((layoutLayerSet.layerSets[b].name=="_")?"":layoutLayerSet.layerSets[b].name);
						this._Save(_path,name,_retinaMode);
						µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout].images.push(name+'.png');
						if(_retinaMode)µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout].images.push(name+'@2x.png');
						ok=true;
					}else{
						µCSSError(i18x.Trans("ButtonAndIconCreator: Icon not found!"));
						ok=false;
					};
					doc.activeHistoryState=history;
					layoutLayerSet.layerSets[b].visible=false;
					iconsLayerSet.layers[i].visible=false;
				};
			};
		};
		return ok;
	};

	this.Create=function(_psdPathName,_layout,_savePath,_retinaMode){
	var doc,f,v,md5,ok=false,i,l,file,anychanged,cacherenew=false;
		if(typeof(_retinaMode)=="undefined")_retinaMode=false;
		f=new File(µ.compileCSSFile.outputFile.path+"/"+_psdPathName);
		if(!f.exists){
			µCSSError("ButtonAndIconCreator: PSD file not exists! (<filename/>)".i18xTrans({"filename":f.fullName}));
			return false;
		};
		md5=MD5(_savePath+_retinaMode+f.modified+this.RELEASE)
		if(!µ.cache.data.plugins.ButtonAndIconCreator)cacherenew=true;
		if(µ.cache.data.plugins.ButtonAndIconCreator)if(!µ.cache.data.plugins.ButtonAndIconCreator.release)cacherenew=true;
		if(µ.cache.data.plugins.ButtonAndIconCreator)if(µ.cache.data.plugins.ButtonAndIconCreator.release)cacherenew=µ.cache.data.plugins.ButtonAndIconCreator.release!=this.RELEASE;
		if(cacherenew){
			µ.cache.data.plugins.ButtonAndIconCreator=new Object();
			µ.cache.data.plugins.ButtonAndIconCreator.release=this.RELEASE;
			µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts=new Object();
		}else{
			anychanged=false;
			if(typeof(µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout])!="undefined"){
				if(µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout].md5==md5){
					l=µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout].images.length;
					for(i=0;i<l;i++){
						file=new File(µ.compileCSSFile.outputFile.path+"/"+_savePath+"/"+µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout].images[i]);
						if(file.exists){
							if(file.modified.getTime()<f.modified.getTime()){
								anychanged=true;
								break;
							};
						}else{
							anychanged=true;
							break;
						};
					};
				}else{
					anychanged=true;
				};
			}else{
				anychanged=true;
			};
			if(!anychanged)return true;
		};
		µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout]=new Object();
		µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout].md5=md5;
		µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout].images=new Array();
		if(f.exists){
			doc=app.open(f);
			ok=this._Create(_psdPathName,_layout,µ.compileCSSFile.outputFile.path+"/"+_savePath,_retinaMode);
			doc.close(SaveOptions.DONOTSAVECHANGES);
		};
		if(!ok)delete µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+_layout];
		return ok;
	};
	
	this._CreateByTopLayerSets=function(_psdPathName,_savePath,_retinaMode){
	var i,j,doc=app.activeDocument,history,name,dp=new Folder(_savePath);
		if(!dp.exists)dp.createIfNotExists();
		µCSSLog("ButtonCreate (by top layer sets): (<filename/>)...".i18xTrans({"filename":_savePath}));

		for(i=0;i<doc.layerSets.length;i++){
			for(j=0;j<doc.layerSets.length;j++)doc.layerSets[j].visible=(i==j);
			history=doc.activeHistoryState;
			name=doc.layerSets[i].name;
			this._Save(_savePath,name,_retinaMode);
			µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"].images.push(name+'.png');
			if(_retinaMode)µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"].images.push(name+'@2x.png');
			doc.activeHistoryState=history;
		};
		return true;
	};

	this.CreateByTopLayerSets=function(_psdPathName,_savePath,_retinaMode){
	var doc,f,v,ok=false,md5,i,l,fileanychanged,cacherenew=false;
		if(typeof(_retinaMode)=="undefined")_retinaMode=false;
		f=new File(µ.compileCSSFile.outputFile.path+"/"+_psdPathName);
		if(!f.exists){
			µCSSError("ButtonAndIconCreator: PSD file not exists! (<filename/>)".i18xTrans({"filename":f.fullName}));
			return false;
		};
		md5=MD5(_savePath+_retinaMode+f.modified+this.RELEASE)
		if(!µ.cache.data.plugins.ButtonAndIconCreator)cacherenew=true;
		if(µ.cache.data.plugins.ButtonAndIconCreator)if(!µ.cache.data.plugins.ButtonAndIconCreator.release)cacherenew=true;
		if(µ.cache.data.plugins.ButtonAndIconCreator)if(µ.cache.data.plugins.ButtonAndIconCreator.release)cacherenew=µ.cache.data.plugins.ButtonAndIconCreator.release!=this.RELEASE;
		if(cacherenew){
			µ.cache.data.plugins.ButtonAndIconCreator=new Object();
			µ.cache.data.plugins.ButtonAndIconCreator.release=this.RELEASE;
			µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts=new Object();
		}else{
			anychanged=false;
			if(typeof(µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"])!="undefined"){
				if(µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"].md5==md5){
					l=µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"].images.length;
					for(i=0;i<l;i++){
						file=new File(µ.compileCSSFile.outputFile.path+"/"+_savePath+"/"+µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"].images[i]);
						if(file.exists){
							if(file.modified.getTime()<f.modified.getTime()){
								anychanged=true;
								break;
							};
						}else{
							anychanged=true;
							break;
						};
					};
				}else{
					anychanged=true;
				};
			}else{
				anychanged=true;
			};
			if(!anychanged)return true;
		};
		µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"]=new Object();
		µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"].md5=md5;
		µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"].images=new Array();
		if(f.exists){
			doc=app.open(f);
			ok=this._CreateByTopLayerSets(_psdPathName,µ.compileCSSFile.outputFile.path+"/"+_savePath,_retinaMode);
			doc.close(SaveOptions.DONOTSAVECHANGES);
		};
		if(!ok)delete µ.cache.data.plugins.ButtonAndIconCreator.pathLayouts[_psdPathName+"*toplayerset*"];
		return ok;
	};
};

// register plugin...
µCSSPlugIns.ButtonAndIconCreator=new ButtonAndIconCreator();



