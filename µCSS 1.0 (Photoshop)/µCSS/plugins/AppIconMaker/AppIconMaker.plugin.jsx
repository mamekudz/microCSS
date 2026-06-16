#target Photoshop
	// AppIconMaker µCSS PlugIn
	// A µCSS plugin to create app icons.
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

function AppIconMaker(){	
	this.name="AppIconMaker";
	this.RELEASES=[
		{"main":1,"minor":0,"revision":1,"date":"2014-02-27 13:00",
			"info":[
				"layout option",
				"cache system implemented",
				"png faviocons"
			]
		},
		{"main":1,"minor":0,"revision":0,"date":"2014-01-12 19:30",
			"info":[
				"first µCSS plugin version"
			]
		}
	];
	
	this.RELEASE=this.RELEASES[0].main+"."+this.RELEASES[0].minor+"."+this.RELEASES[0].revision;

	this.Init=function(){
	};
	
	this.Exit=function(){
	};


	this._ScaleAndSave=function(_size,_dpi,_name,_path,_cachePathLayout){
	var doc=app.activeDocument;
	var history=doc.activeHistoryState;
	var fw=new File(_path+"/"+_name),saveopt=new PNGSaveOptions();
		PNGSaveOptions.compression=9;
		PNGSaveOptions.interlaced=false;
		doc.resizeImage(_size+"px",_size+"px",_dpi,ResampleMethod.BICUBICSHARPER);
		doc.saveAs(fw,saveopt,true,Extension.LOWERCASE);
		µCSSLog("AppIconMaker: saving '<pathname/>' (size=<size/>x<size/>)...".i18xTrans({"size":_size,"pathname":_path+"/"+_name}));
		µ.cache.data.plugins.AppIconMaker.pathLayouts[_cachePathLayout].images.push(_name);
		doc.activeHistoryState=history;
	};
	
	this._switchLayout=function(_layout){
	var doc=app.activeDocument,i,ok=false;
		for(i=0;i<doc.layerSets.length;i++){
			doc.layerSets[i].visible=(doc.layerSets[i].name==_layout);
			ok|=doc.layerSets[i].visible;
		};
		return ok;
	};
	
	this.Create=function(_srcPathName,_layout,_dstPath){
	var dp=new Folder(µ.compileCSSFile.outputFile.path+"/"+_dstPath),sf=new File(µ.compileCSSFile.outputFile.path+"/"+_srcPathName),md5,cacherenew=false,anychanged=false,ok=false;
		md5=MD5(_srcPathName+_dstPath+sf.modified+_layout+this.RELEASE)
		if(!µ.cache.data.plugins.AppIconMaker)cacherenew=true;
		if(µ.cache.data.plugins.AppIconMaker)if(!µ.cache.data.plugins.AppIconMaker.release)cacherenew=true;
		if(µ.cache.data.plugins.AppIconMaker)if(µ.cache.data.plugins.AppIconMaker.release)cacherenew=µ.cache.data.plugins.AppIconMaker.release!=this.RELEASE;
		if(cacherenew){
			µ.cache.data.plugins.AppIconMaker=new Object();
			µ.cache.data.plugins.AppIconMaker.release=this.RELEASE;
			µ.cache.data.plugins.AppIconMaker.pathLayouts=new Object();
		}else{
			anychanged=false;
			if(typeof(µ.cache.data.plugins.AppIconMaker.pathLayouts[_srcPathName+_layout])!="undefined"){
				if(µ.cache.data.plugins.AppIconMaker.pathLayouts[_srcPathName+_layout].md5==md5){
					l=µ.cache.data.plugins.AppIconMaker.pathLayouts[_srcPathName+_layout].images.length;
					for(i=0;i<l;i++){
						file=new File(µ.compileCSSFile.outputFile.path+"/"+_dstPath+"/"+µ.cache.data.plugins.AppIconMaker.pathLayouts[_srcPathName+_layout].images[i]);
						if(file.exists){
							if(file.modified.getTime()<sf.modified.getTime()){
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
		µ.cache.data.plugins.AppIconMaker.pathLayouts[_srcPathName+_layout]=new Object();
		µ.cache.data.plugins.AppIconMaker.pathLayouts[_srcPathName+_layout].md5=md5;
		µ.cache.data.plugins.AppIconMaker.pathLayouts[_srcPathName+_layout].images=new Array();
		if(!dp.exists)dp.createIfNotExists();
		ok=false;
		if(sf.exists){
			doc=app.open(sf);
			ok=this._switchLayout(_layout);
			if(ok){
				µCSSLog("AppIconMaker: create icons to '<path/>'...".i18xTrans({"path":_dstPath}));
				this._ScaleAndSave(152,144,"favicon152x152.png",dp,_srcPathName+_layout);
				this._ScaleAndSave(120,144,"favico152x152n.png",dp,_srcPathName+_layout);
				this._ScaleAndSave(76,72,"favicon76x76.png",dp,_srcPathName+_layout);
				this._ScaleAndSave(60,72,"favicon60x60.png",dp,_srcPathName+_layout);
				this._ScaleAndSave(32,72,"favicon64x64.png",dp,_srcPathName+_layout);
				this._ScaleAndSave(32,72,"favicon32x32.png",dp,_srcPathName+_layout);
				this._ScaleAndSave(16,72,"favicon16x16.png",dp,_srcPathName+_layout);
			}else{
				µCSSError("AppIconMaker: Layout not found (<layout/>)!".i18xTrans({"layout":_layout}));
			};
			doc.close(SaveOptions.DONOTSAVECHANGES);
		}else{
			µCSSError("AppIconMaker: Source image not found (<srcPathName/>)!".i18xTrans({"srcPathName":sf.absoluteURI}));
		};
		if(!ok){
			delete µ.cache.data.plugins.AppIconMaker.pathLayouts[_srcPathName+_layout];
		};
		return ok;
	};

};

// register plugin...
µCSSPlugIns.AppIconMaker=new AppIconMaker();



