{
	#target Photoshop
	// µCSS
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

	// TO DO's:
	// * Image meta data cache (width,height,changedate).
	// * Bounce error at sprite creation at none transparent sprites.
	// * Sprite size calculation sometimes 1x1 pixel
	// * relative file cache data
	
	var RELEASES=[
		{"main":0,"minor":9,"revision":6,"date":"2014-02-27 22:00","beta":true,
			"info":[
				"inline css commands",
				"retina sprite remove"
			]
		},
		{"main":0,"minor":9,"revision":5,"date":"2014-01-12 22:30","beta":true,
			"info":[
				"cache located now at orginial css file path",
				"cache bugs fixed",
				"DependentCSSFile overload options option",
				"µ.SetMaxWidth and µ.SetMaxHeight implemented"
			]
		},
		{"main":0,"minor":9,"revision":4,"date":"2013-12-15 17:00","beta":true,
			"info":[
				"new options structure for sprites",
				"new sprite save options"
			]
		},
		{"main":0,"minor":9,"revision":3,"date":"2013-11-26 17:00","beta":true,
			"info":[
				"MLT support"
			]
		},
		{"main":0,"minor":9,"revision":3,"date":"2013-11-23 15:30","beta":true,
			"info":[
				"cache (sprites and images) implemented"
			]
		},
		{"main":0,"minor":9,"revision":2,"date":"2013-10-04 13:30","beta":true,
			"info":[
				"ButtonCreator plugin: new mode 'OnylTopLevelSets'"
			]
		},
		{"main":0,"minor":9,"revision":1,"date":"2013-05-30 13:30","beta":true,
			"info":[
				"sprite generation bugs fixed (bitpack algorithm)",
				"sprite padding added",
				"...developement proceed..."
			]
		},
		{"main":0,"minor":9,"revision":0,"date":"2013-03-17 18:30","beta":true,
			"info":[
				"first version (beta, experimental)"
			]
		}];
	
	var RELEASE=RELEASES[0].main+"."+RELEASES[0].minor+"."+RELEASES[0].revision;
	
	#include "../jsxlibs/builds/mit/system/system.inc.jsx"
	#include "../jsxlibs/builds/mit/json/json.inc.jsx"
	#include "../jsxlibs/builds/mit/bitpack/bitpack.inc.jsx"
	#include "../jsxlibs/builds/mit/ftp/ftp.inc.jsx"
	#include "../jsxlibs/builds/bsd-apache/md5/md5.inc.jsx"
	DODEBUG=true;
	var µµ,µ;
	
	
	// ====================
	// General Functions
	// ====================
	var LOG_REVERSE=1;
	var LOG_DATETIME=2;
	var log="";
	function µCSSLog(_txt,_logopt){
		if(_logopt&LOG_REVERSE){
			µcsslog.text+=_txt+"\n";
		}else{
			µcsslog.text=_txt+"\n"+µcsslog.text;
		};
		return;
		log+=_txt+"\n";
		µcsslog.text="";
		µcsslog.textselection=log;
	}
	
	function µCSSError(_e){
		µCSSLog(_e);
	}

	// ====================
	// µCSS Cache
	// ====================
	function CacheImage(_relPathName,_modified,_width,_height){
		this.relPathName=_relPathName;
		this.modified=typeof(_modified)=="undefined"?null:_modified;
		this.exists=this.modified!=null;
		this.width=typeof(_width)=="undefined"?-1:_width;
		this.height=typeof(_height)=="undefined"?-1:_height;
		
		this.Info=function(_relPath){
		var doc,f=new File(_relPath+"/"+this.relPathName);
			if(f.exists){
				this.exists=true;
				if(this.modified==null||(this.modified.getTime()!=f.modified.getTime())){
					this.modified=f.modified;
					doc=app.open(f);
					this.width=doc.width.value;
					this.height=doc.height.value;
					doc.close(SaveOptions.DONOTSAVECHANGES);
				};
			}else{
				this.exists=false;
				this.modified=null;
				this.width=-1;
				this.height=-1;
			};	
		};
	}
	
	function Cache(_cssFullName){
		this.isOpen=false;
		this.data=new Object();
		this.data.version=RELEASE;
		this.data.date=new Date();
		this.data.images=new Object();
		this.data.spritesmd5="";
		this.data.spritecssimages=new Array();
		this.data.plugins=new Object();
		this.file=new File(_cssFullName+".cache");

		this.Image=function(_fullName){
		var f=new File(_fullName),relPathName=f.getRelativeURI(this.file.path);
			if(!this.data.images[relPathName])this.data.images[relPathName]=new CacheImage(relPathName);
			this.data.images[relPathName].Info(this.file.path);
			return this.data.images[relPathName];
		};
		
		this.File=function(_fullName){
		var f=new File(_fullName);
			if(!f.exists)return false;
			return this.data.date.getTime()<f.modified.getTime();
		};

		this.Open=function(){
		var img,imgs,json,f;
			if(this.isOpen)return true;
			this.data.images=new Object();
			if(this.file.exists){
				json=this.file.getContents();
				this._Clear();
				if(!json){
					this.isOpen=true;
					return false;
				};
				this.data=json.parseJSONwithDate();
				if(this.data==null){
					this._Clear();
					this.isOpen=true;
					return false;
				};
				if(this.data.version!=RELEASE){this._Clear();this.isOpen=true;return false;};
				imgs=this.data.images;
				this.data.images=new Object();
				for(img in imgs){
					if(!(img instanceof Function)){
						f=new File(this.file.path+"/"+img);
						if(f.exists){
							this.data.images[img]=new CacheImage(img,imgs[img].modified,imgs[img].width,imgs[img].height);
							this.data.images[img].Info(this.file.path);
						};
					};
				};
			};
			this.isOpen=true;
			return true;
		};
		
		this._Clear=function(){
			this.data=new Object();
			this.data.date=new Date();
			this.data.version=RELEASE;
			this.data.spritesmd5="";
			this.data.spritecssimages=new Array();
			this.data.images=new Object();
			this.data.plugins=new Object();
		};
		
		this.Clear=function(){
			if(this.isOpen){
				this._Clear();
			}else{
				this.Open();
				this._Clear();
				this.Close();
			};
		};
		
		this.Close=function(){
		var img,ret,cf=new Folder(Folder.temp.absoluteURI+"/µCSS");
			if(!this.isOpen)return true;
			if(!cf.exists)cf.create();
			this.data.date=new Date();
			this.data.version=RELEASE;
			for(img in this.data.images){delete this.data.images[img].relPathName;delete this.data.images[img].exists;};
			ret=this.file.putContents(JSON.stringify(this.data));
			this.isOpen=false;
			return ret;
		};
	}
	
	
	// ====================
	// CSS Parser
	// ====================
	function CSSComment(_comment){
		this.type="csscomment";
		this.comment=_comment;
		
		this.Compile=function(_opt,_parent){
		};
		
		this.ToString=function(_opt,_level){
		var comentlines=this.comment.trim().split("\n"),i,l=comentlines.length,r="";
			if(_level==0)r+="\n";
			if(l==1){
				r+=CountChars(_level,"\t")+comentlines[0].trim()+"\n";
			}else{
				if(l>2){
					r+=CountChars(_level,"\t")+comentlines[0].trim()+"\n";
					for(i=1;i<l;i++){
						r+=CountChars(_level,"\t")+" "+comentlines[i].trim()+"\n";
					};
				}else{
					for(i=0;i<l;i++){
						r+=CountChars(_level,"\t")+" "+comentlines[i].trim()+"\n";
					};
				};
			};
			return r;
		};
	}
	
	function CSSProperty(_name,_value){
		this.type="cssproperty";
		if(typeof(_value)=="undefined"){
			var e=_name.indexOf(":");
			_value=_name.substr(e+1);
			_name=_name.substr(0,e);
		}else if(typeof(_value)=="number"){
			_value=_value+"";
		}else if(typeof(_value)=="boolean"){
			_value=_value?"true":"false";
		};
		if(typeof(_name)=="undefined")_name="";
		if(typeof(_value)=="undefined")_value="";
		this.name=_name.toLowerCase();
		this.value=_value;
		this.values=_value.split(" ");
		
		this.ChangeAnyColorValue=function(_color){
		var i,l=this.values.length;
			for(i=0;i<l;i++)if(this.values[i].indexOf("rgba")>=0||this.values[i].indexOf("#")>=0||this.values[i].indexOf("rgb")>=0||this.values[i].indexOf("hsl")>=0||typeof(colorsByNames[this.values[i].toLowerCase()])!="undefined")this.values[i]=Intern2CSSColor(CSSColor2Intern(_color));
			this.value=this.values.join(" ");
		};
		
		
		this.Compile=function(_opt,_parent){
			if(this.name=="-µcss"&&!µ.complingAborted){
				//µCSSLog("Compile "+_parent.cssrules+":"+this.value);
				try{
					µCSSTick();
					µ.parent=_parent;
					var cr={"«":"{","»":"}","¡":";","\n":" ","\r":" "};
					if(false)µCSSLog(this.value);
					//µCSSLog("Eval2= "+this.value.replace(/[«»¡]/g,function(c){return cr[c];})+";");
					eval(this.value.replace(/[«»¡]/g,function(c){return cr[c];})+";");
				}catch(e){
					µCSSLog("µCSS Compiler Error: <errordescription/> (<rules/>, file <filename/>, µcss line <lineno/>) <cssvalue/>.".i18xTrans({"errordescription":e.toString(),"rultes":_parent.cssrules,"filename":µ.compileCSSFile.inputFile.fullName,"lineno":e.line,"cssvalue":this.value}));
				};
			};
		};
	
		this.ToString=function(_opt,_level){
			if(!µ.options.output.include.µCSSProperties){
				if(this.name.substr(0,5)=="-µcss")return "";
			};
			return CountChars(_level,"\t")+this.name+":"+this.values.join(" ")+";\n";
		};
	}
	
	function CSSCmd(_csscmd){
		this.type="csscmd";
		this.csscmd=_csscmd.trim();
		this.name=this.csscmd;
		this.compiled=false;
		
		this.Compile=function(_opt,_parent,_elementNo){
			if(!µ.complingAborted){
				try{
					µCSSTick();
					µ.parent=_parent;
					µ.elementNo=_elementNo;
					var cr={"«":"{","»":"}","¡":";","\n":" ","\r":" "};
					if(false)µCSSLog(this.csscmd);
					//µCSSLog("Eval= "+this.csscmd.substr(6).replace(/[«»¡]/g,function(c){return cr[c];})+";");
					this.compiled=true;
					eval(this.csscmd.substr(6).replace(/[«»¡]/g,function(c){return cr[c];})+";");
				}catch(e){
					µCSSLog("µCSS Compiler Error: <errordescription/> (<rules/>, file <filename/>, µcss line <lineno/>) <cssvalue/>.".i18xTrans({"errordescription":e.toString(),"rultes":_parent.cssrules,"filename":µ.compileCSSFile.inputFile.fullName,"lineno":e.line,"cssvalue":this.value}));
				};
			};
		};
		
		this.ToString=function(_opt,_level){
			if(!µ.options.output.include.µCSSProperties)return "";
			return CountChars(_level,"\t")+this.csscmd+";\n";
		};
		
	};
	
	function CSSBlock(_cssrules){
		this.type="cssblock";
		this.cssrules=_cssrules.trim();
		this.name=this.cssrules;
		this.elements=new Array();
		this.compileElementNo=0;
		
		this.FindPropertyIndex=function(_name){
		var i,l=this.elements.length;
			_name=_name.toLowerCase();
			for(i=0;i<l;i++)if(this.elements[i].type=="cssproperty"&&this.elements[i].name==_name)return i;
			return -1;
		};
		
		this.FindPropertyIndices=function(_nameregex){
		var i,l=this.elements.length,ret=new Array();
			for(i=0;i<l;i++)if(this.elements[i].type=="cssproperty"&&_nameregex.test(this.elements[i].name))ret.push(i);
			return ret;
		};
		
		this.AddComment=function(_comment){
			if(_comment.trim()!="")this.elements.push(new CSSComment(_comment));
		};
		
		this.AddProperty=function(_name,_value){
			if(_name.trim()!="")this.elements.push(new CSSProperty(_name,_value));
		};
		
		this.ChangeProperty=function(_name,_value,_afterIndex){
		var i=this.FindPropertyIndex(_name),p=new CSSProperty(_name,_value);
			if(i>=0){
				this.elements[i]=p;
			}else{
				this.elements.push(p);
			};
		};
		
		this.RemoveProperty=function(_name){
		var i=this.FindPropertyIndex(_name);
			while(i>=0){
				if(i<=this.compileElementNo)this.compileElementNo--;
				this.elements.splice(i,1);
				i=this.FindPropertyIndex(_name);
			};
		};
		
		this.RemoveProperties=function(_nameOrRegEx){
		var i=this.FindPropertyIndex(_nameOrRegEx);
			while(i>=0){
				if(i<=this.compileElementNo)this.compileElementNo--;
				this.elements.splice(i,1);
				i=this.FindPropertyIndex(_nameOrRegEx);
			};
		};
	
		this.RemovePropertiesMatch=function(_nameregex,_valueregex){
		var i,p=this.FindPropertyIndices(_nameregex),l=p.length;
			for(i=l-1;i>=0;i--){
				if(_valueregex.test(this.elements[p[i]].value)){
					if(p[i]<=this.compileElementNo)this.compileElementNo--;
					this.elements.splice(p[i],1);
				};
			};
		};
	
		this.AddBlock=function(_cssrules,_no){
			if(typeof(_no)=="undefined"){
				this.elements.push(new CSSBlock(_cssrules));
				return this.elements[this.elements.length-1];
			}else{
				this.elements.splice(_no,0,new CSSBlock(_cssrules));
				return this.elements[_no];
			};
		};
		
		this.Compile=function(_opt,_parent){
			if(this.cssrules.TestRegExs(_opt.rules)){
				this.compileElementNo=0;
				while(this.compileElementNo<this.elements.length){
					µ.compileCSSBlock=this;
					this.elements[this.compileElementNo].Compile(_opt,this);
					this.compileElementNo++;
				};
			};
		};
	
		this.Optimize=function(){
			// not implemented yet...
			// collection of properties, e.g. border-color:#000;border-style:solid;border-width:1px; => border:1px #000 solid;
		};
	
		this.ToString=function(_opt,_level){
		var i,l=this.elements.length,r="";
			r+=CountChars(_level,"\t")+this.cssrules.trim()+"{\n";
			for(i=0;i<l;i++)r+=this.elements[i].ToString(_opt,_level+1);
			r+=CountChars(_level,"\t")+"}\n";
			return r;
		};
	
	}
	
	function CSS(_text){
		this.parsingOk=false;
		
		this.elements=new Array();
	
		this.FindRule=function(_rule){
		var i,l=this.elements.length;
			for(i=0;i<l;i++)if(this.elements[i].type=="cssblock")if(this.elements[i].name==_rule)return this.elements[i];
			return null;
		}
		
		this.AddComment=function(_comment){
			this.elements.push(new CSSComment(_comment));
			return this.elements[this.elements.length-1];
		};
		this.AddBlock=function(_cssrules,_no){
			if(typeof(_no)=="undefined"){
				this.elements.push(new CSSBlock(_cssrules));
				return this.elements[this.elements.length-1];
			}else{
				this.elements.splice(_no,0,new CSSBlock(_cssrules));
				return this.elements[_no];
			};
		};

		this.AddCmd=function(_csscmd){
			this.elements.push(new CSSCmd(_csscmd));
			return this.elements[this.elements.length-1];
		};
	
		this.Parse=function(_t){
		var postcommentfinder=/\*\//gm;
		var rulefinder=/(\/\*|\{|;|\})/gm;
		var levels=[this];
		var p,i=0,lno=0,t;
    	while(_t.length>0){
				p=_t.search(rulefinder);
				if(_t[p]=="/"){
					if(levels.length>0){
						p=_t.search(postcommentfinder);
						t=_t.substr(0,p+2);
						lno+=t.noOfChars("\n");
						levels[levels.length-1].AddComment(t);
						_t=_t.substr(p+2);
					}else{
						µCSSError("Parse Error at line <lineno/>: wrong comments. (<code/>)".i18xTrans({"lineno":lno,"code":t.trim()}));
						return false;
					};
				}else if(_t[p]=="{"){
					t=_t.substr(0,p);
					lno+=t.noOfChars("\n");
					if(levels.length>0){
						levels.push(levels[levels.length-1].AddBlock(t.trim()));
						_t=_t.substr(p+1);
					}else{
						µCSSError("Parse Error at line <lineno/>: wrong block declaration. (<code/>)".i18xTrans({"lineno":lno,"code":t.trim()}));
						return false;
					};
				}else if(_t[p]==";"){
					t=_t.substr(0,p);
					lno+=t.noOfChars("\n");
					if(levels.length>0){
						if(levels[levels.length-1] instanceof CSSBlock){
							levels[levels.length-1].AddProperty(t.trim());
							_t=_t.substr(p+1);
						}else{
							if(t.trim().substr(0,6)=="-µcss:"){
								levels[levels.length-1].AddCmd(t.trim());
								_t=_t.substr(p+1);
							}else{
								µCSSError("Parse Error at line <lineno/>: wrong property definition. (<code/>)".i18xTrans({"lineno":lno,"code":t.trim()}));
								return false;
							};
						};
					}else{
						µCSSError("Parse Error at line <lineno/>: wrong property definition. (<code/>)".i18xTrans({"lineno":lno,"code":t.trim()}));
						return false;
					};
				}else if(_t[p]=="}"){
					t=_t.substr(0,p);
					lno+=t.noOfChars("\n");
					if(levels.length>0){
						_t=_t.substr(p+1);
						levels.pop();
					}else{
						µCSSError("Parse Error at line <lineno/>: wrong close bracket. (<code/>)".i18xTrans({"lineno":lno,"code":t.trim()}));
						return false;
					};
				}else{
					_t="";
				};
			};
			this.parsingOk=true;
		};
		
		this.BlocksWithProperty=function(){
		};
		
		this.Compile=function(_opt){
		var i,l=this.elements.length,allcompiled=false;
			if(!this.parsingOk)return false;
			while(!allcompiled){
				n=0;
				m=0;
				l=this.elements.length;
				for(i=0;i<l;i++)if(this.elements[i] instanceof CSSCmd)if(_opt.rules.main)if(!this.elements[i].compiled)this.elements[i].Compile(_opt,this,i);
				allcompiled=true;
				l=this.elements.length;
				for(i=0;i<l;i++)if(this.elements[i] instanceof CSSCmd)if(_opt.rules.main)if(!this.elements[i].compiled)allcompiled=false;
			};
			l=this.elements.length;
			for(i=0;i<l;i++)if(!(this.elements[i] instanceof CSSCmd))this.elements[i].Compile(_opt,this);
			return true;
		};
	
		this.ToString=function(_opt){
		var i,l=this.elements.length,r="",t="/* This CSS was compiled by µCSS Photoshop Tool. */";
			for(i=0;i<l;i++){
				r+=this.elements[i].ToString(_opt,0);
			};
			r=r.str_replace("/* This CSS is compiled by µCSS Photoshop Tool. */",t);
			if(r.indexOf(t)<0)r=t+"\n\n"+r;
			return r;
		};
	
		if(typeof(_text)=="string")this.Parse(_text);
	}
	
	
	function CSSFile(_inputFile,_outputFile,_overloadOptions){
		if(typeof(_overloadOptions)=="undefined")_overloadOptions=new Object();
		if(!_inputFile.exists){
			alert("CSS file '<filename/>' does not exists!<newline/>".i18xTrans({"filename":_inputFile.fullName}));
			this.exists=false;
		}else{
			this.exists=true;
			if(typeof(_outputFile)=="undefined")_outputFile=_inputFile;
			this.inputFile=new File(_inputFile);
			this.outputFile=new File(_outputFile);
			µCSSLog("Loading CSS file '"+this.inputFile.fullName+"'...");
			this.inputContent=this.inputFile.getContents();
			this.css=new CSS(this.inputContent);
			if(!this.css.parsingOk){
				µCSSError("Parse Error in file '<filename/>'.".i18xTrans({"filename":this.inputFile.fullName}));
			};
			this.isInit=false;
			this.isReady=false;
			this.isPreLoadCSS=false;
			this.overloadOptions=_overloadOptions;
			this.overloadedOptions={};
			
			this.InitCompile=function(_opt){
				µ.compileCSSFile=this;
				this.css.Compile({"rules":{"is":/\:\:\-\µcss\-init/gm,"Init":true}});
				this.isInit=true;
			};

			this.StartCompile=function(_opt){
				µ.compileCSSFile=this;
				this.css.Compile({"rules":{"is":/\:\:\-\µcss\-start/gm,"Start":true}});
			};
	
			this.EndCompile=function(_opt){
				µ.compileCSSFile=this;
				this.css.Compile({"rules":{"is":/\:\:\-\µcss\-end/gm,"End":true}});
			};
	
			this.ExitCompile=function(_opt){
				µ.compileCSSFile=this;
				this.css.Compile({"rules":{"is":/\:\:\-\µcss\-exit/gm,"Exit":true}});
				this.isInit=false;
			};
			
			this.Compile=function(_opt){
				µ.compileCSSFile=this;
				this.StartCompile();
				this.overloadedOptions=OverwriteObjectProperties(µ.options,this.overloadOptions);
				//µCSSLog("Compile pre:"+this.outputFile.name+" # "+µ.options.output.include.µCSSProperties);
				this.css.Compile({"rules":{"isnot":/\:\:\-\µcss\-(init|exit|start|end)/gm,"main":true}});
				//µCSSLog("Compile post:"+this.outputFile.name+" # "+µ.options.output.include.µCSSProperties);
				this.overloadedOptions=OverwriteObjectProperties(µ.options,this.overloadedOptions);
				this.isReady=true;
			};
			
			this.Save=function(){
				if(!this.css.parsingOk)return;
				this.EndCompile();
				this.overloadedOptions=OverwriteObjectProperties(µ.options,this.overloadOptions);
				//µCSSLog("Save pre:"+this.outputFile.name+" # "+µ.options.output.include.µCSSProperties);
				this.outputFile.putContents(this.css.ToString());
				//µCSSLog("Save post:"+this.outputFile.name+" # "+µ.options.output.include.µCSSProperties);
				this.overloadedOptions=OverwriteObjectProperties(µ.options,this.overloadedOptions);
				this.ExitCompile();
			};
			
			if(this.css.parsingOk)this.InitCompile();
		};
	}
	
	// ====================
	// -µcss
	// ====================
	
	// --------------------
	// Image Methodes
	// --------------------
	var CSSIMAGE_SPRITE=1<<0;
	var CSSIMAGE_PRELOAD=1<<1;
	var CSSIMAGE_CURSOR=1<<2;
	var CSSIMAGE_BACKGROUNDIMAGE=1<<3;
	
	function CSSImage(_url,_type){
	var img;
		if(typeof(_onlyurl)=="undefined")_onlyurl=false;
		
		this.type=_type;
		this.done=false;
		this.url=_url;
		this.filepathname=µ.compileCSSFile.outputFile.path+"/"+this.url;
		this.exists=false;
		this.file=new File(this.filepathname);
		this.w=-1;
		this.h=-1;
		this.sizeDetected=false;

		this.done2x=false;
		this.url2x=_url.dirname()+"/"+_url.basename().withoutSuffix()+"@2x."+_url.basename().suffix();;
		this.filepathname2x=µ.compileCSSFile.outputFile.path+"/"+this.url2x;
		this.exists2x=false;
		this.file2x=new File(this.filepathname2x);
		this.sizeDetected2x=false;
		this.w2x=-1;
		this.h2x=-1;
		this.x=0;
		this.y=0;
		
		if(this.file.exists){
			this.exists=true;
			if(this.type==CSSIMAGE_SPRITE){
				img=µ.cache.Image(this.file.fullName);
				this.w=img.width;
				this.h=img.height;
			};
		};

		if(this.file2x.exists){
			this.exists2x=true;
			if(this.type==CSSIMAGE_SPRITE){
				this.w2x=this.w*2;
				this.h2x=this.h*2;
				this.sizeDetected2x=true;
			};
		};
	}
	
	function CheckCSSImagesSizes(){
	var i,l=µ.cssImages.length,file;
		for(i=0;i<l;i++){
			with(µ.cssImages[i]){
				if(!sizeDetected){
					if(exists){
						doc=app.open(file);
						w=doc.width.value;
						h=doc.height.value;
						sizeDetected=true;
						doc.close(SaveOptions.DONOTSAVECHANGES);
					};
				};
				if(!sizeDetected2x){
					if(exists2x){
						w2x=x;
						h2x=y;
						sizeDetected2x=true;
					};
				};
			};
		};
	}
	
	function FindCSSImage(_url,_type){
	var i,l=µ.cssImages.length,file;
		file=new File(µ.compileCSSFile.outputFile.path+"/"+_url);
		for(i=0;i<l;i++)if(µ.cssImages[i].file.fullName==file.fullName)return µ.cssImages[i];
		return null;
	}
	
	function GetCSSImage(_url,_type){
	var ci;
		if(typeof(_isSpriteImage)=="_type")_type=0;
		ci=FindCSSImage(_url,_type);
		if(ci==null){
			ci=new CSSImage(_url,_type);
			if(ci.exists){
				µ.cssImages.push(ci);
				if(_type&CSSIMAGE_SPRITE)µ.spriteCSSImages.push(ci);
				if(_type&CSSIMAGE_PRELOAD)µ.preLoadCSSImages.push(ci);
			};
		};
		return ci;
	}
	
	function Cursor(_name,_stdName,_url,_offsetPosX,_offsetPosY,_forceStdName){
		this.name=_name;
		this.stdName=_stdName;
		this.url=_url;
		this.offsetPosX=_offsetPosX;
		this.offsetPosY=_offsetPosY;
		this.forceStdName=_forceStdName;
		this.cssimage=new CSSImage(_url,CSSIMAGE_CURSOR);
	}
	
	function Sprite(_url,_cssFile,_cssBlock,_offsetWidth,_offsetHeight,_offsetPosX,_offsetPosY,_padding){
		if(typeof(_onlyurl)=="undefined")_onlyurl=false;
		this.cssFile=_cssFile;
		this.cssBlock=_cssBlock;
		this.offsetWidth=_offsetWidth;
		this.offsetHeight=_offsetHeight;
		this.offsetPosX=_offsetPosX;
		this.offsetPosY=_offsetPosY;
		this.padding=_padding;
		this.cssImage=GetCSSImage(_url,CSSIMAGE_SPRITE);
	}
	
	function RemoveSprites(){
	var i,l;
		l=µ.sprites.length;
		for(i=0;i<l;i++){
			µCSSTick();
			with(µ.sprites[i]){
				µCSSLog("Remove Sprite: "+cssImage.url);
				cssBlock.RemoveProperty("background-repeat");
				cssBlock.RemoveProperty("background-position");
				cssBlock.RemoveProperties("background-image");
				cssBlock.RemoveProperty("width");
				cssBlock.RemoveProperty("height");
				cssBlock.AddProperty("width",(cssImage.w+offsetWidth)+"px");
				cssBlock.AddProperty("height",(cssImage.h+offsetHeight)+"px");
				cssBlock.AddProperty("background-image","url("+cssImage.url+")");
				if(cssImage.exists2x)cssBlock.AddProperty("background-image","image-set(url("+cssImage.url+")1x,url("+cssImage.url2x+")2x)");
			};
		};
		
	}
	
	function CreateSprites(){
	var e,i,l,ci,noOfSpriteImages=0,noOfSpriteImages2x=0;
	var saveopt,dstfile=new File(µ.absPath+"/"+µ.options.sprites.save.relPath+"/"+µ.options.sprites.save.fileName+"."+µ.options.sprites.save.format),dstfile2x=new File(µ.absPath+"/"+µ.options.sprites.save.relPath+"/"+µ.options.sprites.save.fileName+"@2x."+µ.options.sprites.save.format),bounds;
	var dimension,spritedoc,spritedoc2x,bitpacks,o,orgbounds,spritesmd5="";
	var spritelog="",logfile;
		
		switch(µ.options.sprites.save.format){
			case"png":
				saveopt=new PNGSaveOptions()
				saveopt.compression=µ.options.sprites.save.compression;
				saveopt.interlaced=µ.options.sprites.save.interlaced;;
				break;
			case"jpg":
				saveopt=new JPEGSaveOptions()
				saveopt.quality=12;
				saveopt.interlaced=false;
				break;
			default:
				saveopt=new PNGSaveOptions()
				saveopt.compression=9;
				saveopt.interlaced=false;
		}
		
		l=µ.spriteCSSImages.length;
		noOfSpriteImages=0;
		noOfSpriteImages2x=0;
		for(i=0;i<l;i++){
			if(µ.spriteCSSImages[i].exists)noOfSpriteImages++;
			if(µ.spriteCSSImages[i].exists2x)noOfSpriteImages2x++;
		};
		
		if(noOfSpriteImages==0&&noOfSpriteImages2x==0)return;
		
		if((dstfile.exists&&noOfSpriteImages>0)||(dstfile2x.exists&&noOfSpriteImages2x>0)){
			spritesmd5+=noOfSpriteImages+noOfSpriteImages2x+µ.options.sprites.save.format+µ.options.sprites.save.compression+µ.options.sprites.save.relPath+µ.options.sprites.save.fileName+µ.options.sprites.padding+µ.options.sprites.log.path+µ.options.sprites.log.fileName;
			for(i=0;i<l;i++){
				if(µ.spriteCSSImages[i].exists)spritesmd5+=µ.spriteCSSImages[i].file.fullName+µ.spriteCSSImages[i].file.modified.getTime()+µ.spriteCSSImages[i].filepathname;
				if(µ.spriteCSSImages[i].exists2x)spritesmd5+=µ.spriteCSSImages[i].file2x.fullName+µ.spriteCSSImages[i].file2x.modified.getTime();
			};
			spritesmd5=MD5(spritesmd5);
		};		
		
		if(µ.cache.data.spritesmd5!=spritesmd5||spritesmd5==""||µ.cache.data.spritesmd5==""){
			
			bitpacks=new Array();
			for(i=0;i<l;i++){
				o=new Object();
				o.w=µ.spriteCSSImages[i].w+µ.options.sprites.padding*2;
				o.h=µ.spriteCSSImages[i].h+µ.options.sprites.padding*2;
				bitpacks[i]=o;
			};
			dimension=BitPack(bitpacks);
			for(i=0;i<l;i++){
				µ.spriteCSSImages[i].x=bitpacks[i].x;
				µ.spriteCSSImages[i].y=bitpacks[i].y;
			};
			
			if(noOfSpriteImages!=0)spritedoc=app.documents.add(dimension[0],dimension[1],72,"sprites",NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1);
			if(noOfSpriteImages2x!=0)spritedoc2x=app.documents.add(dimension[0]*2,dimension[1]*2,144,"sprites@2x",NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1);
		
			for(i=0;i<l;i++){
				µCSSTick();
				if(µ.spriteCSSImages[i].exists){
					µCSSLog("Create Sprite: "+File.decode(µ.spriteCSSImages[i].filepathname));
					doc=app.open(new File(µ.spriteCSSImages[i].filepathname));
					doc.changeMode(ChangeMode.RGB);
					app.activeDocument=doc;
					orgbounds=app.activeDocument.activeLayer.bounds;
					app.activeDocument.activeLayer.duplicate(spritedoc);
					app.activeDocument=spritedoc;
					bounds=app.activeDocument.activeLayer.bounds;
					//!!! Bounce ERROR at none transparent images !!!!! not fixed yet!!!!
					try{app.activeDocument.activeLayer.translate(bounds[0].value-orgbounds[0].value+bitpacks[i].x+µ.options.sprites.padding,bounds[1].value-orgbounds[1].value+bitpacks[i].y+µ.options.sprites.padding);}catch(e){};
					//µCSSLog(bounds[0].value+","+orgbounds[0].value+","+bitpacks[i].x+","+µ.options.spritePadding+"/"+bounds[1].value+","+orgbounds[1].value+","+bitpacks[i].y+","+µ.options.spritePadding);
					app.activeDocument.mergeVisibleLayers();
					doc.close(SaveOptions.DONOTSAVECHANGES);
				};
				if(µ.spriteCSSImages[i].exists2x){
					µCSSLog("Create Sprite: "+File.decode(µ.spriteCSSImages[i].filepathname2x));
					doc=app.open(new File(µ.spriteCSSImages[i].filepathname2x));
					doc.changeMode(ChangeMode.RGB);
					app.activeDocument=doc;
					orgbounds=app.activeDocument.activeLayer.bounds;
					app.activeDocument.activeLayer.duplicate(spritedoc2x);
					app.activeDocument=spritedoc2x;
					bounds=app.activeDocument.activeLayer.bounds;
					try{app.activeDocument.activeLayer.translate(bounds[0].value-orgbounds[0].value+bitpacks[i].x*2+µ.options.sprites.padding*2,bounds[1].value-orgbounds[1].value+bitpacks[i].y*2+µ.options.sprites.padding*2);}catch(e){};
					app.activeDocument.mergeVisibleLayers();
					doc.close(SaveOptions.DONOTSAVECHANGES);
				};
			};
			
			if(noOfSpriteImages!=0){
				app.activeDocument=spritedoc;
				app.activeDocument.saveAs(dstfile,saveopt,true,Extension.LOWERCASE); 
				app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
			};
			if(noOfSpriteImages2x!=0){
				app.activeDocument=spritedoc2x;
				app.activeDocument.saveAs(dstfile2x,saveopt,true,Extension.LOWERCASE); 
				app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
			};
		}else{
			l=µ.sprites.length;
			for(i=0;i<l;i++){
				with(µ.sprites[i]){
					cssImage.x=µ.cache.data.spritecssimages[i][0];
					cssImage.y=µ.cache.data.spritecssimages[i][1];
					cssImage.w=µ.cache.data.spritecssimages[i][2];
					cssImage.h=µ.cache.data.spritecssimages[i][3];
				};
			};
		};
		
		µ.cache.data.spritecssimages=new Array();
		l=µ.sprites.length;
		for(i=0;i<l;i++){
			µCSSTick();
			with(µ.sprites[i]){
				µ.cache.data.spritecssimages.push([cssImage.x,cssImage.y,cssImage.w,cssImage.h]);
				spritelog+=cssImage.url+"\n";
				if(cssImage.exists2x)spritelog+=cssImage.url2x+"\n";
				cssBlock.RemoveProperty("width");
				cssBlock.RemoveProperty("height");
				cssBlock.RemoveProperty("background-repeat");
				cssBlock.RemoveProperty("background-position");
				cssBlock.RemoveProperties("background-image");
				cssBlock.AddProperty("background-image","url("+SimplyfyURI(µ.options.sprites.save.relPath+"/"+µ.options.sprites.save.fileName+"."+µ.options.sprites.save.format)+")");
				if(cssImage.exists2x)cssBlock.AddProperty("background-image","image-set(url("+SimplyfyURI(µ.options.sprites.save.relPath+"/"+µ.options.sprites.save.fileName+"."+µ.options.sprites.save.format)+")1x,url("+SimplyfyURI(µ.options.sprites.save.relPath+"/"+µ.options.sprites.save.fileName+"@2x."+µ.options.sprites.save.format)+")2x)");
				cssBlock.AddProperty("background-repeat","no-repeat");
				cssBlock.AddProperty("background-position",-(cssImage.x+offsetPosX+µ.options.sprites.padding)+"px "+-(cssImage.y+offsetPosY+µ.options.sprites.padding)+"px");
				cssBlock.AddProperty("width",(cssImage.w+offsetWidth)+"px");
				cssBlock.AddProperty("height",(cssImage.h+offsetHeight)+"px");
			};
		};
		if(µ.options.sprites.log.creation){
			logfile=new File(µ.compileCSSFile.outputFile.path+"/"+µ.options.sprites.log.relPath+"/"+µ.options.sprites.log.fileName+".log");
			logfile.putContents(spritelog.trim());
		};
		µ.cache.data.spritesmd5=spritesmd5;
	}
	
	
	function CreatePreLoadRule(){
	var i,l,preloadrule,f;
		l=µ.preLoadCSSImages.length;
		preloadrule=µ.cssFiles[0].css.FindRule("-µcss-preload");
		if(preloadrule==null)preloadrule=µ.cssFiles[0].css.AddBlock("-µcss-preload");
		preloadrule.RemovePropertiesMatch(/.*/,/.*/);
		for(i=0;i<l;i++){
			µCSSTick();
			if(µ.preLoadCSSImages[i].exists2x&&µ.preLoadCSSImages[i].exists){
				preloadrule.AddProperty("background-image","url("+µ.preLoadCSSImages[i].url+") -99999px -99999px");
				preloadrule.AddProperty("background-image","image-set(url("+µ.preLoadCSSImages[i].url+")1x,url("+µ.preLoadCSSImages[i].url2x+")2x)");
			}else if(µ.preLoadCSSImages[i].exists){
				preloadrule.AddProperty("background-image","url("+µ.preLoadCSSImages[i].url+") -99999px -99999px");
			};
		};
		µCSSTick();
		if(µ.noOfSpriteDefs>0){
			f=new File(µ.topInputFile.fullName.dirname()+"/"+µ.options.spritePath+"/sprites.png");
			if(f.exists)preloadrule.AddProperty("background-image","url("+µ.options.spritePath+"/sprites.png) -99999px -99999px");
			f=new File(µ.topInputFile.fullName.dirname()+"/"+µ.options.spritePath+"/sprites@2x.png");
			if(f.exists)preloadrule.AddProperty("background-image","url("+µ.options.spritePath+"/sprites@2x.png) -99999px -99999px");
		};
		preloadrule.AddProperty("display","none");
	}
	
	// --------------------
	// Photoshop Functions
	// --------------------
	
	function SetLayerToVisible(_doc,_layerPathname,_curLayerPathname){
		if(typeof(_curLayerPathname)=="undefined")_curLayerPathname="";
		for(i=0;i<doc.layerSets.length;i++){
			doc.layerSets[i].visible=((_curLayerPathname=="")?_curLayerPathname+"/":"")+doc.layerSets[i].name==_pointsInfo[j][1];
		};
	}
		
	// --------------------
	// Color Functions
	// --------------------
	var colorsByNames={"aliceblue":0xfff0f8ff,"antiquewhite":0xfffaebd7,"aqua":0xff00ffff,"aquamarine":0xff7fffd4,"azure":0xfff0ffff,"beige":0xfff5f5dc,"bisque":0xffffe4c4,"black":0xff000000,"blanchedalmond":0xffffebcd,"blue":0xff0000ff,"blueviolet":0xff8a2be2,"brown":0xffa52a2a,"burlywood":0xffdeb887,"cadetblue":0xff5f9ea0,"chartreuse":0xff7fff00,"chocolate":0xffd2691e,"coral":0xffff7f50,"cornflowerblue":0xff6495ed,"cornsilk":0xfffff8dc,"crimson":0xffdc143c,"cyan":0xff00ffff,"darkblue":0xff00008b,"darkcyan":0xff008b8b,"darkgoldenrod":0xffb8860b,"darkgray":0xffa9a9a9,"darkgreen":0xff006400,"darkgrey":0xffa9a9a9,"darkkhaki":0xffbdb76b,"darkmagenta":0xff8b008b,"darkolivegreen":0xff556b2f,"darkorange":0xffff8c00,"darkorchid":0xff9932cc,"darkred":0xff8b0000,"darksalmon":0xffe9967a,"darkseagreen":0xff8fbc8f,"darkslateblue":0xff483d8b,"darkslategray":0xff2f4f4f,"darkslategrey":0xff2f4f4f,"darkturquoise":0xff00ced1,"darkviolet":0xff9400d3,"deeppink":0xffff1493,"deepskyblue":0xff00bfff,"dimgray":0xff696969,"dimgrey":0xff696969,"dodgerblue":0xff1e90ff,"firebrick":0xffb22222,"floralwhite":0xfffffaf0,"forestgreen":0xff228b22,"fuchsia":0xffff00ff,"gainsboro":0xffdcdcdc,"ghostwhite":0xfff8f8ff,"gold":0xffffd700,"goldenrod":0xffdaa520,"gray":0xff808080,"green":0xff008000,"greenyellow":0xffadff2f,"grey":0xff808080,"honeydew":0xfff0fff0,"hotpink":0xffff69b4,"indianred":0xffcd5c5c,"indigo":0xff4b0082,"ivory":0xfffffff0,"khaki":0xfff0e68c,"lavender":0xffe6e6fa,"lavenderblush":0xfffff0f5,"lawngreen":0xff7cfc00,"lemonchiffon":0xfffffacd,"lightblue":0xffadd8e6,"lightcoral":0xfff08080,"lightcyan":0xffe0ffff,"lightgoldenrodyellow":0xfffafad2,"lightgray":0xffd3d3d3,"lightgreen":0xff90ee90,"lightgrey":0xffd3d3d3,"lightpink":0xffffb6c1,"lightsalmon":0xffffa07a,"lightseagreen":0xff20b2aa,"lightskyblue":0xff87cefa,"lightslategray":0xff778899,"lightslategrey":0xff778899,"lightsteelblue":0xffb0c4de,"lightyellow":0xffffffe0,"lime":0xff00ff00,"limegreen":0xff32cd32,"linen":0xfffaf0e6,"magenta":0xffff00ff,"maroon":0xff800000,"mediumaquamarine":0xff66cdaa,"mediumblue":0xff0000cd,"mediumorchid":0xffba55d3,"mediumpurple":0xff9370db,"mediumseagreen":0xff3cb371,"mediumslateblue":0xff7b68ee,"mediumspringgreen":0xff00fa9a,"mediumturquoise":0xff48d1cc,"mediumvioletred":0xffc71585,"midnightblue":0xff191970,"mintcream":0xfff5fffa,"mistyrose":0xffffe4e1,"moccasin":0xffffe4b5,"navajowhite":0xffffdead,"navy":0xff000080,"oldlace":0xfffdf5e6,"olive":0xff808000,"olivedrab":0xff6b8e23,"orange":0xffffa500,"orangered":0xffff4500,"orchid":0xffda70d6,"palegoldenrod":0xffeee8aa,"palegreen":0xff98fb98,"paleturquoise":0xffafeeee,"palevioletred":0xffdb7093,"papayawhip":0xffffefd5,"peachpuff":0xffffdab9,"peru":0xffcd853f,"pink":0xffffc0cb,"plum":0xffdda0dd,"powderblue":0xffb0e0e6,"purple":0xff800080,"red":0xffff0000,"rosybrown":0xffbc8f8f,"royalblue":0xff4169e1,"saddlebrown":0xff8b4513,"salmon":0xfffa8072,"sandybrown":0xfff4a460,"seagreen":0xff2e8b57,"seashell":0xfffff5ee,"sienna":0xffa0522d,"silver":0xffc0c0c0,"skyblue":0xff87ceeb,"slateblue":0xff6a5acd,"slategray":0xff708090,"slategrey":0xff708090,"snow":0xfffffafa,"springgreen":0xff00ff7f,"steelblue":0xff4682b4,"tan":0xffd2b48c,"teal":0xff008080,"thistle":0xffd8bfd8,"tomato":0xffff6347,"turquoise":0xff40e0d0,"violet":0xffee82ee,"wheat":0xfff5deb3,"white":0xffffffff,"whitesmoke":0xfff5f5f5,"yellow":0xffffff00,"yellowgreen":0xff90a0c0};
	var colorNames={0xfff0f8ff:"aliceblue",0xfffaebd7:"antiquewhite",0xff00ffff:"aqua",0xff7fffd4:"aquamarine",0xfff0ffff:"azure",0xfff5f5dc:"beige",0xffffe4c4:"bisque",0xff000000:"black",0xffffebcd:"blanchedalmond",0xff0000ff:"blue",0xff8a2be2:"blueviolet",0xffa52a2a:"brown",0xffdeb887:"burlywood",0xff5f9ea0:"cadetblue",0xff7fff00:"chartreuse",0xffd2691e:"chocolate",0xffff7f50:"coral",0xff6495ed:"cornflowerblue",0xfffff8dc:"cornsilk",0xffdc143c:"crimson",0xff00ffff:"cyan",0xff00008b:"darkblue",0xff008b8b:"darkcyan",0xffb8860b:"darkgoldenrod",0xffa9a9a9:"darkgray",0xff006400:"darkgreen",0xffa9a9a9:"darkgrey",0xffbdb76b:"darkkhaki",0xff8b008b:"darkmagenta",0xff556b2f:"darkolivegreen",0xffff8c00:"darkorange",0xff9932cc:"darkorchid",0xff8b0000:"darkred",0xffe9967a:"darksalmon",0xff8fbc8f:"darkseagreen",0xff483d8b:"darkslateblue",0xff2f4f4f:"darkslategray",0xff2f4f4f:"darkslategrey",0xff00ced1:"darkturquoise",0xff9400d3:"darkviolet",0xffff1493:"deeppink",0xff00bfff:"deepskyblue",0xff696969:"dimgray",0xff696969:"dimgrey",0xff1e90ff:"dodgerblue",0xffb22222:"firebrick",0xfffffaf0:"floralwhite",0xff228b22:"forestgreen",0xffff00ff:"fuchsia",0xffdcdcdc:"gainsboro",0xfff8f8ff:"ghostwhite",0xffffd700:"gold",0xffdaa520:"goldenrod",0xff808080:"gray",0xff008000:"green",0xffadff2f:"greenyellow",0xff808080:"grey",0xfff0fff0:"honeydew",0xffff69b4:"hotpink",0xffcd5c5c:"indianred",0xff4b0082:"indigo",0xfffffff0:"ivory",0xfff0e68c:"khaki",0xffe6e6fa:"lavender",0xfffff0f5:"lavenderblush",0xff7cfc00:"lawngreen",0xfffffacd:"lemonchiffon",0xffadd8e6:"lightblue",0xfff08080:"lightcoral",0xffe0ffff:"lightcyan",0xfffafad2:"lightgoldenrodyellow",0xffd3d3d3:"lightgray",0xff90ee90:"lightgreen",0xffd3d3d3:"lightgrey",0xffffb6c1:"lightpink",0xffffa07a:"lightsalmon",0xff20b2aa:"lightseagreen",0xff87cefa:"lightskyblue",0xff778899:"lightslategray",0xff778899:"lightslategrey",0xffb0c4de:"lightsteelblue",0xffffffe0:"lightyellow",0xff00ff00:"lime",0xff32cd32:"limegreen",0xfffaf0e6:"linen",0xffff00ff:"magenta",0xff800000:"maroon",0xff66cdaa:"mediumaquamarine",0xff0000cd:"mediumblue",0xffba55d3:"mediumorchid",0xff9370db:"mediumpurple",0xff3cb371:"mediumseagreen",0xff7b68ee:"mediumslateblue",0xff00fa9a:"mediumspringgreen",0xff48d1cc:"mediumturquoise",0xffc71585:"mediumvioletred",0xff191970:"midnightblue",0xfff5fffa:"mintcream",0xffffe4e1:"mistyrose",0xffffe4b5:"moccasin",0xffffdead:"navajowhite",0xff000080:"navy",0xfffdf5e6:"oldlace",0xff808000:"olive",0xff6b8e23:"olivedrab",0xffffa500:"orange",0xffff4500:"orangered",0xffda70d6:"orchid",0xffeee8aa:"palegoldenrod",0xff98fb98:"palegreen",0xffafeeee:"paleturquoise",0xffdb7093:"palevioletred",0xffffefd5:"papayawhip",0xffffdab9:"peachpuff",0xffcd853f:"peru",0xffffc0cb:"pink",0xffdda0dd:"plum",0xffb0e0e6:"powderblue",0xff800080:"purple",0xffff0000:"red",0xffbc8f8f:"rosybrown",0xff4169e1:"royalblue",0xff8b4513:"saddlebrown",0xfffa8072:"salmon",0xfff4a460:"sandybrown",0xff2e8b57:"seagreen",0xfffff5ee:"seashell",0xffa0522d:"sienna",0xffc0c0c0:"silver",0xff87ceeb:"skyblue",0xff6a5acd:"slateblue",0xff708090:"slategray",0xff708090:"slategrey",0xfffffafa:"snow",0xff00ff7f:"springgreen",0xff4682b4:"steelblue",0xffd2b48c:"tan",0xff008080:"teal",0xffd8bfd8:"thistle",0xffff6347:"tomato",0xff40e0d0:"turquoise",0xffee82ee:"violet",0xfff5deb3:"wheat",0xffffffff:"white",0xfff5f5f5:"whitesmoke",0xffffff00:"yellow",0xff90a0c0:"yellowgreen"};
	
	function _HUE2RGB(_m1,_m2,_h){
		if(_h<0)_h=_h+1;
		if(_h>1)_h=_h-1;
		if(_h*6<1)return _m1+(_m2-_m1)*_h*6;
		if(_h*2<1)return _m2;
		if(_h*3<2)return _m1+(_m2-_m1)*(2/3-_h)*6;
	 	return _m1;
	}
	function _HSL2RGB(_h,_s,_l){
	var m1,m2;
		if(_l<0.5){
			m2=_l*(_s+1);
		}else{
			m2=_l+_s-_l*_s;
		};
		m1=_l*2-m2;
		return (Math.floor(_HUE2RGB(m1,m2,_h+_l/3)*255)<<16)|(Math.floor(_HUE2RGB(m1,m2,_h)*255)<<8)|(Math.floor(_HUE2RGB(m1,m2,_h-_l/3)*255));
	}
	
	function parseColorValue(_v){
		if(_v.indexOf("%")>=0){
			return Math.floor(parseFloat(_v)*255/100);
		}else{
			return parseInt(_v,10);
		};
		
	}
	
	function CSSColor2Intern(_c){
	var v,r=0,g=0,b=0,a=0,h=0,s=0,l=0;
		if(typeof(_c)=="string"){
			_c=_c.toLowerCase();
			if(typeof(colorNames[_c])!="undefined")return colorsByNames[_c];
			if(_c.substr(0,1)=="#"){
				if(_c.length>7){
					r=parseInt(_c.substr(1,2),16);
					g=parseInt(_c.substr(3,2),16);
					b=parseInt(_c.substr(5,2),16);
					a=parseInt(_c.substr(7,2),16);
				}else if(_c.length>4){
					r=parseInt(_c.substr(1,2),16);
					g=parseInt(_c.substr(3,2),16);
					b=parseInt(_c.substr(5,2),16);
					a=0xFF;
				}else{
					_c="#"+_c.substr(1,1)+_c.substr(1,1)+_c.substr(2,1)+_c.substr(2,1)+_c.substr(3,1)+_c.substr(3,1);
					r=parseInt(_c.substr(1,2),16);
					g=parseInt(_c.substr(3,2),16);
					b=parseInt(_c.substr(5,2),16);
					a=0xFF;
				};
			}else{
				if(_c.substr(0,4)=="rgba"){
					v=_c.BracketsContent().split(",");
					if(v.length==4){
						r=parseColorValue(v[0]);
						g=parseColorValue(v[1]);
						b=parseColorValue(v[2]);
						a=Math.floor(parseFloat(v[3])*255);
					};
				}else if(_c.substr(0,3)=="rgb"){
					v=_c.BracketsContent().split(",");
					if(v.length==3){
						r=parseColorValue(v[0]);
						g=parseColorValue(v[1]);
						b=parseColorValue(v[2]);
						a=0xFF;
					};
				}else if(_c.substr(0,4)=="hsla"){
					h=parseColorValue(v[0])%360;
					s=parseColorValue(v[1]);
					l=parseColorValue(v[2]);
					if(s<0)s=0;
					if(l<0)l=0;
					if(s>255)s=255;
					if(l>255)l=255;
					return _HSL2RGB(360/h,255/s,255/l)|(0xFF<<24);
				}else if(_c.substr(0,3)=="hsl"){
					h=parseColorValue(v[0])%360;
					s=parseColorValue(v[1]);
					l=parseColorValue(v[2]);
					a=Math.floor(parseFloat(v[3])*255);
					if(s<0)s=0;
					if(l<0)l=0;
					if(s>255)s=255;
					if(l>255)l=255;
					if(a<0)a=0;
					if(a>255)a=255;
					return _HSL2RGB(360/h,255/s,255/l)|(a<<24);
				};
			};
			if(a<0)a=0;
			if(r<0)r=0;
			if(g<0)g=0;
			if(b<0)b=0;
			if(a>255)a=255;
			if(r>255)r=255;
			if(g>255)g=255;
			if(b>255)b=255;
			return ((a&0xFF)<<24)|((r&0xFF)<<16)|((g&0xFF)<<8)|(b&0xFF);
		}else{
			return _c;
		};
	}
	
	function Intern2CSSColor(_c,_fn){
	var a=_c>>24&0xFF;
	var r=_c>>16&0xFF;
	var g=_c>>8&0xFF;
	var b=_c&0xFF;
		if(a==0xFF){
			if(µ.options.colorOutputByName&&typeof(colorNames[_c])!="undefined"){
				return colorNames[_c]; 
			}else{
				return "#"+r.toString(16).preNull(2)+g.toString(16).preNull(2)+b.toString(16).preNull(2);
			};
		}else{
			if(typeof(_fn)=="boolean"){
				// MS filter format...
				return "#"+a.toString(16).preNull(2)+r.toString(16).preNull(2)+g.toString(16).preNull(2)+b.toString(16).preNull(2);
			}else{
				if(typeof(_fn)=="undefined"){
					return "rgba("+r+","+g+","+b+","+((a+0.0)/255.0).toFixed(3)+")";
				}else{
					return "rgba("+r+","+g+","+b+","+((a+0.0)/255.0).toFixed(_fn)+")";
				};
			};
		};
	}
	
	function AlphaValue(_a){
	var isfloat=false;
		if(typeof(_a)=="string"){
			_a=_a.toLowerCase();
			if(_a=="transparent"){
				_a=0;
			}else if(_a=="opaque"){
				_a=255;
			}else if(_a=="translucent"){
				_a=128;
			}else if(_a.indexOf(".")>=0){
				_a=Math.floor(parseFloat(_alpha)*255);
			}else if(_a.indexOf("x")>=0){
				_a=parseInt(_alpha,16);
			}else if(_a.indexOf("%")>=0){
				_a=Math.floor(255*parseInt(_alpha,10)/100);
			}else{
				_a=parseInt(_alpha,10);
			};
			if(_a<0)_a=0;
			if(_a>255)_a=255;
		}else{
			if(_a===0x80000000){
				_a=128;
			}else if(_a===0xFF000000){
				_a=255;
			}else if(_a===1.0){
				_a=1.0;
			}else{
				if(_a>0&&_a<1.0){
					_a=Math.floor(_a*255);
				};
			};
			if(_a<0)_a=0;
			if(_a>255)_a=255;
		};
		return _a;
	}
	
	function GrayColor(_g,_a){
		return Intern2CSSColor((AlphaValue(_a)&0xFF)<<24|(_g&0xFF)<<16|(_g&0xFF)<<8|(_g&0xFF));
	}
	
	
	// ====================
	// µ
	// ====================
	
	function µOBJ_Options(){
		this.colorOutputByName=false;
		this.sprites=new Object();
		this.sprites.creation=true;
		this.sprites.save=new Object();
		this.sprites.save.relPath=".";
		this.sprites.save.fileName="sprites";
		this.sprites.save.format="png";
		this.sprites.save.compression=9;
		this.sprites.save.interlaced=true;
		this.sprites.save.quality=12;
		this.sprites.padding=0;
		this.sprites.log=new Object();
		this.sprites.log.creation=false;
		this.sprites.log.relPath=".";
		this.sprites.log.fileName="sprites";
		this.createPreLoadRule=false;
		this.output=new Object();
		this.output.include=new Object();
		this.output.include.comments=true;
		this.output.include.µCSSProperties=true;
		this.output.include.tabulators=true;
		this.output.include.lineFeeds=true;
		this.output.include.lastSimicolon=true;
	};
	
	function µOBJ_RunInfo(){
	};
	
	function µObj(_inputCSSFile){
		this.$=new Object();
		this.parent;
		this.elementNo;
		this.cache=new Cache(_inputCSSFile.fullName);
		this.cache.Open();
		this.plugins=µCSSPlugIns;
		this.preLoadCSSImages=new Array();
		this.cssImages=new Array();
		this.noOfSpriteDefs=0;
		this.cursors=new Object();
		this.sprites=new Array();
		this.spriteCSSImages=new Array();
		this.topInputFile=_inputCSSFile;
		this.compileCSSFile=null;
		this.absPath=this.topInputFile.fullName.dirname()
		this.cssFiles=new Array();
		this.complingAborted=false;
		
		this.options=new µOBJ_Options();
		this.runInfo=new µOBJ_RunInfo();
			
		// --------------------
		// CONSTANTS & ENUMERATIONS
		// --------------------
		this.TOP=1<<0;
		this.RIGHT=1<<1;;
		this.BOTTOM=1<<2;
		this.LEFT=1<<3;
		this.ALLBORDERS=this.TOP|this.LEFT|this.RIGHT|this.BOTTOM;
		
		this.BLACK=0xff000000;
		this.SILVER=0xffc0c0c0;
		this.GRAY=0xff808080;
		this.WHITE=0xffffffff;
		this.MAROON=0xff800000;
		this.RED=0xffff0000;
		this.PURPLE=0xff800080;
		this.FUCHSIA=0xffff00ff;
		this.GREEN=0xff008000;
		this.LIME=0xff00ff00;
		this.OLIVE=0xff808000;
		this.YELLOW=0xffffff00;
		this.NAVY=0xff000080;
		this.BLUE=0xff0000ff;
		this.TEAL=0xff008080;
		this.ACQUA=0xff00ffff;
		this.TRANSPARENT=0x00000000;
		this.TRANSLUCENT=0x80000000;
		this.OPAQUE=0xFF000000;
	
	
		// --------------------
		// System Utils
		// --------------------
		this.Log=function(_txt,_logopt){
			µCSSLog(_txt,_logopt);
		};
		
		this.ShowURL=function(_url){
			if(_url.substr(4)!="http")_url="file:///"+this.topInputFile.fsName.str_replace("\\","/").dirname()+"/"+_url;
			ShowInBrowser(_url);
		};
		
		this.OpenFile=function(_filePathName){
		var f=new File(this.absPath+"/"+_filePathName);
			if(f.exists)f.execute();
		};
		
		// --------------------
		// System Tools
		// --------------------
		this.DependentCSSFile=function(_inputFilePath,_outputFilePath,_overloadOptions){
		var inputFile,outputFile;
			if(typeof(_outputFilePath)=="undefined")_outputFilePath=_inputFilePath;
			if(typeof(_overloadOptions)=="undefined")_overloadOptions=new Object();
			_inputFilePath=this.absPath+"/"+_inputFilePath;
			_outputFilePath=this.absPath+"/"+_outputFilePath;
			inputFile=new File(_inputFilePath),outputFile=new File(_outputFilePath);
			µ.cssFiles.push(new CSSFile(inputFile,outputFile,_overloadOptions));
		};
		
		this.LoadLib=function(_liburl){
		var libFile=new File(_liburl+".jsx"),code,e;
			if(libFile.exists){
				µCSSLog("Loading library '<liburl/>'...".i18xTrans({liburl:_liburl+".jsx"}),LOG_REVERSE);
				code=libFile.getContents();
				try{
					eval(code);
				}catch(e){
					µCSSLog("Loading error: <errorno/> (line <lineno/>)".i18xTrans({"errorno":e,"lineno":e.line}),LOG_REVERSE);
				};
			}else{
				µCSSLog("Libary loading faild! ('<liburl/>')".i18xTrans({liburl:_liburl+".jsx"}),LOG_REVERSE);
			};
		}
	
		this.AbortComplinig=function(){
			µCSSLog("Compiling aborted!");
			this.complingAborted=true;
		}
		
		this.GetPrefrence=function(_key,_defvalue){
			return GetSetting("µCSS_"+µ.topInputFile.name.withoutSuffix().str_replace("/","_"),_key,_defvalue);
		}
		this.SetPrefrence=function(_key,_value){
			SetSetting("µCSS_"+µ.topInputFile.name.withoutSuffix().str_replace("/","_"),_key,_value);
		}
		
		// ------------------------
		// CSS Rule Operations
		// ------------------------
		this.RemovePreProperties=function(){
		}
		this.RemovePostProperties=function(){
		}
		this.RemovePostRules=function(){
		}

		// ------------------------
		// CSS Block Operations
		// ------------------------
		this.RemovePreProperties=function(){
		}
		this.RemovePostProperties=function(){
		}
		this.RemovePostRules=function(){
		}
		
		// --------------------
		// CSS Property Operations
		// --------------------
		this.AddProperty=function(_name,_value){
			µ.parent.AddProperty(_name,_value);
		}
		this.ChangeProperty=function(_name,_value,_afterIndex){
			µ.parent.ChangeProperty(_name,_value,_afterIndex);
		}
		this.RemoveProperty=function(_name){
			µ.parent.RemoveProperty(_name);
		}
		
		// ---------------------------------
		// Cursoris, Images & WebSprites
		// ---------------------------------
		this.DefCursor=function(_name,_stdName,_url,_offsetPosX,_offsetPosY,_forceStdName){
			if(typeof(_url)=="undefined")_url="";
			if(typeof(_offsetPosX)=="undefined")_offsetPosX=0;
			if(typeof(_offsetPosY)=="undefined")_offsetPosY=0;
			if(typeof(_forceStdName)=="undefined")_forceStdName=false;
			µ.cursors[_name]=new Cursor(_name,_stdName,_url,_offsetPosX,_offsetPosY,_forceStdName);
		}
		
		this.Cursor=function(_name){
			if(typeof(µ.cursors[_name])=="undefined"){
				µ.parent.ChangeProperty("cursor",_name);
			}else{
				if(µ.cursors[_name].url==""){
					µ.parent.ChangeProperty("cursor",_name);
				}else{
					µ.parent.RemoveProperties("cursor");
					µ.parent.AddProperty("cursor","url("+µ.cursors[_name].url+")"+((µ.cursors[_name].offsetPosX==0&&µ.cursors[_name].offsetPosY==0)?"":" "+µ.cursors[_name].offsetPosX+" "+µ.cursors[_name].offsetPosY)+","+µ.cursors[_name].stdName);
					µ.parent.AddProperty("cursor","image-set(url("+µ.cursors[_name].cssimage.url+")1x,url("+µ.cursors[_name].cssimage.url2x+")2x)"+((µ.cursors[_name].offsetPosX==0&&µ.cursors[_name].offsetPosY==0)?"":" "+µ.cursors[_name].offsetPosX+" "+µ.cursors[_name].offsetPosY)+","+µ.cursors[_name].stdName);
					if(µ.cursors[_name].forceStdName)µ.parent.AddProperty("cursor",µ.cursors[_name].stdName);
				};
			};
		}
		
		this.Sprite=function(_url,_offsetWidth,_offsetHeight,_offsetPosX,_offsetPosY,_padding){
		var f;
			µ.noOfSpriteDefs++;
			if(typeof(_offsetWidth)=="undefined")_offsetWidth=0;
			if(typeof(_offsetHeight)=="undefined")_offsetHeight=0;
			if(typeof(_offsetPosX)=="undefined")_offsetPosX=0;
			if(typeof(_offsetPosY)=="undefined")_offsetPosY=0;
			if(typeof(_padding)=="undefined")_padding=0;
			µ.sprites.push(new Sprite(_url,µ.compileCSSFile,µ.compileCSSBlock,_offsetWidth,_offsetHeight,_offsetPosX,_offsetPosY,_padding));
		}
		
		this.PreLoadImage=function(_url){
			if(µ.options.createPreLoadRule)GetCSSImage(_url,CSSIMAGE_PRELOAD);
		}
	
		// --------------------
		// Set Properties Methodes
		// --------------------
		this.SetProperty=function(_name,_value){
			µ.parent.ChangeProperty(_name,_str);
		};
		this.SetColor=function(_color){
			µ.parent.ChangeProperty("color",Intern2CSSColor(CSSColor2Intern(_color),4));
		};
		this.SetZIndex=function(_index){
			µ.parent.ChangeProperty("z-index",_index);
		};
		this.SetOpacity=function(_opacity){
			µ.parent.ChangeProperty("opacity",_opacity);
		};
		
		this.SetWidth=function(_width){
			µ.parent.ChangeProperty("width",_width);
		};
		this.SetMinWidth=function(_minWidth){
			µ.parent.ChangeProperty("min-width",_minWidth);
		};
		this.SetMaxWidth=function(_maxWidth){
			µ.parent.ChangeProperty("max-width",_maxWidth);
		};
		this.SetHeight=function(_height){
			µ.parent.ChangeProperty("height",_height);
		};
		this.SetMinHeight=function(_minHeight){
			µ.parent.ChangeProperty("min-height",_minHeight);
		};
		this.SetMaxHeight=function(_maxHeight){
			µ.parent.ChangeProperty("max-height",_maxHeight);
		};
		this.SetTop=function(_top){
			µ.parent.ChangeProperty("top",_top);
		};
		this.SetBottom=function(_bottom){
			µ.parent.ChangeProperty("bottom",_bottom);
		};
		this.SetLeft=function(_left){
			µ.parent.ChangeProperty("left",_left);
		};
		this.SetRight=function(_right){
			µ.parent.ChangeProperty("right",_right);
		};
		this.SetTRBL=function(_top,_right,_bottom,_left){
		};
		
		this.SetPadding=function(_top,_right,_bottom,_left){
			µ.parent.ChangeProperty("padding",_top);
		};
		this.SetPaddings=function(_edgeSet){
			µ.parent.ChangeProperty("padding",_edgeSet.join("px ")+"px");
		};
		this.SetMargin=function(_top,_right,_bottom,_left){
		};
		this.SetMargins=function(_value,_edgeSet){
		};
	
		this.SetBackgroundColor=function(_color){
			µ.parent.ChangeProperty("background-color",Intern2CSSColor(CSSColor2Intern(_color),4));
		};
		
		this.SetBackgroundGradient=function(_gradientDefinition){
		var p=_gradientDefinition[0]+"\\-gradient\\((.*)",t="",i;
			µ.parent.RemovePropertiesMatch(/^filter$/,new RegExp("progid\\:DXImageTransform\\.Microsoft\\.gradient"));
			µ.parent.RemovePropertiesMatch(/^background$/,new RegExp(p));
			µ.parent.RemovePropertiesMatch(/^background$/,new RegExp("^\\-o\\-"+p));
			µ.parent.RemovePropertiesMatch(/^background$/,new RegExp("^\\-ms\\-"+p));
			µ.parent.RemovePropertiesMatch(/^background$/,new RegExp("^\\-moz\\-"+p));
			µ.parent.RemovePropertiesMatch(/^background$/,new RegExp("^\\-webkit\\-"+p));
			t=_gradientDefinition[0]+"-gradient(";
			z=new Array(_gradientDefinition[1]);
			for(i=2;i<_gradientDefinition.length;i++)z.push(Intern2CSSColor(CSSColor2Intern(_gradientDefinition[i][0]))+" "+_gradientDefinition[i][1]);
			t+=z.join(",")+")";
			µ.parent.AddProperty("filter","progid:DXImageTransform.Microsoft.gradient(startColorstr='"+Intern2CSSColor(CSSColor2Intern(_gradientDefinition[2][0]),true)+"',endColorstr='"+Intern2CSSColor(CSSColor2Intern(_gradientDefinition[_gradientDefinition.length-1][0]),true)+"',GradientType="+((_gradientDefinition[0]=="linear")?"0":"1")+")");
			µ.parent.AddProperty("background",t);
			µ.parent.AddProperty("background","-o-"+t);
			µ.parent.AddProperty("background","-ms-"+t);
			µ.parent.AddProperty("background","-moz-"+t);
			µ.parent.AddProperty("background","-webkit-"+t);
		};
		this.SetBackgroundImage=function(_imageurl,_posX,_posY,_repeat){
			µ.parent.RemovePropertiesMatch(/^background\-image$/,/.*/);
			if(_imageurl.withoutSuffix().right(3)=="@2x"){
				µ.parent.AddProperty("background-image","url("+_imageurl.withoutSuffix().lefts(3)+"."+_imageurl.suffix()+")");
				µ.parent.AddProperty("background-image","image-set(url("+_imageurl.withoutSuffix().lefts(3)+"."+_imageurl.suffix()+")1x,url("+_imageurl+")2x)");
			}else{
				µ.parent.AddProperty("background-image","url("+_imageurl+")");
			};
		};
		this.SetBackgroundPosition=function(_posX,_posY){
		};
		this.SetBackgroundRepeat=function(_posX,_posY){
		};
		
		this.SetBorder=function(_color,_style,_edgeSet){
			
		};
		this.SetBorderColor=function(_color,_directions){
		var i,p=this.parent.FindPropertyIndices(/(.*)(border)(.*)/),l=p.length;
			for(i=0;i<l;i++){
				if(true){
					µ.parent.elements[p[i]].ChangeAnyColorValue(_color);
				};
			};
			if(l==0){
				/// !!!
				µ.parent.AddProperty("border-color",Intern2CSSColor(CSSColor2Intern(_color),4));
			};
		};
		this.SetBorderImage=function(_image,_top,_right,_bottom,_left,_fill,_modeX,_modeY){
		};
		this.SetBorderStyle=function(_style){
		};
		this.SetBorderRadius=function(_radius){
		};
		
		this.SetDisplay=function(_mode){
			µ.parent.ChangeProperty("display",_mode);
		};
		this.SetPosition=function(_mode){
		};
		this.SetOverflow=function(_mode){
		};
		this.SetOverflowX=function(_mode){
		};
		this.SetOverflowY=function(_mode){
		};
		this.SetBoxShadow=function(_width,_height,_blur,_color){
		};
		
		this.SetFontSize=function(_size){
			µ.parent.ChangeProperty("font-size",_size);
		};
		this.SetFontWeight=function(_weight){
			µ.parent.ChangeProperty("font-weight",_weight);
		};
		this.SetLineHeight=function(_height){
		};
		this.SetWhiteSpace=function(_mode){
			µ.parent.ChangeProperty("white-space",_mode);
		};
		
		this.SetTextDecoration=function(_decoration){
		};
		this.SetTextShadow=function(_width,_height,_blur,_color){
			µ.parent.ChangeProperty("text-shadow",_width);
		};
		this.SetTextAlign=function(_textalign){
		};
		this.SetVerticalAlign=function(_verticalalign){
		};
	
		this.SetCursor=function(_cursor){
			µ.parent.ChangeProperty("cursor",_cursor);
		};
		this.SetUserSelect=function(_userSelect){
		};
		
		this.SetTableLayout=function(_layout){
			µ.parent.ChangeProperty("table-layout",_layout);
		};
		this.SetBorderCollapse=function(_collapse){
		};
		
		this.SetIEFilter=function(_filter){
		};
		
		this.SetTransform2D=function(_perspective,_translate3D,_rotateX,_rotateY,_rotateZ){
		};
		this.SetTransform3D=function(_perspective,_translate3D,_rotateX,_rotateY,_rotateZ){
		};
	
		// --------------------
		// Block Operations
		// --------------------
		this.AddBlock=function(_cssrules,_no){
			return µ.parent.AddBlock(_cssrules,_no);
		};

		// --------------------
		// Color Calculations
		// --------------------
		this.Colorize=function(_c1,_c2){
			_c1=CSSColor2Intern(_c1);
			if(_c2==null){
				_c2=0x00808080;
			}else{
				_c2=CSSColor2Intern(_c2);
			};
		
			var a1=_c1>>24&0xFF;
			var r1=_c1>>16&0xFF;
			var g1=_c1>>8&0xFF;
			var b1=_c1&0xFF;
		
			var a2=_c2>>24&0xFF;
			var r2=_c2>>16&0xFF;
			var g2=_c2>>8&0xFF;
			var b2=_c2&0xFF;
		
			if(r1<128){r=((r1*2)*r2)>>8;}else{r=255-(((255-(((r1-128)*2)))*(255-r2))>>8);};
			if(g1<128){g=((g1*2)*g2)>>8;}else{g=255-(((255-(((g1-128)*2)))*(255-g2))>>8);};
			if(b1<128){b=((b1*2)*b2)>>8;}else{b=255-(((255-(((b1-128)*2)))*(255-b2))>>8);};
			
			return Intern2CSSColor((a1&0xFF)<<24|r<<16|g<<8|b);
		};
		
		
		this.DeColorize=function(_c1,_c2){
			_c1=CSSColor2Intern(_c1);
			if(_c2==null){
				_c2=0x00000000;
			}else{
				_c2=CSSColor2Intern(_c2);
			};
			
			var a1=_c1>>24&0xFF;
			var r1=_c1>>16&0xFF;
			var g1=_c1>>8&0xFF;
			var b1=_c1&0xFF;
		
			var a2=_c2>>24&0xFF;
			var r2=_c2>>16&0xFF;
			var g2=_c2>>8&0xFF;
			var b2=_c2&0xFF;
		
			var c=(r1+g1+b1)/3;
			var r=((r1-c)*r2/255)+c;
			var g=((g1-c)*g2/255)+c;
			var b=((b1-c)*b2/255)+c;
			
			return Intern2CSSColor((a1&0xFF)<<24|r<<16|g<<8|b);
		};
	
		this.Alpha=function(_color,_alpha){
			return Intern2CSSColor((0xFFFFFF&CSSColor2Intern(_color))|AlphaValue(_alpha)<<24);
		}
		
		
		this.Lighten=function(_c1,_c2){
		_c1=CSSColor2Intern(_c1);
		if(typeof(_c2)=="undefined")_c2==0x00000000;
		_c2=CSSColor2Intern(_c2);
		var a1=_c1>>24&0xFF;
		var r1=_c1>>16&0xFF;
		var g1=_c1>>8&0xFF;
		var b1=_c1&0xFF;
		var a2=_c2>>24&0xFF;
		var r2=_c2>>16&0xFF;
		var g2=_c2>>8&0xFF;
		var b2=_c2&0xFF;
		var r=255-(((255-r1)*r2)/256);
		var g=255-(((255-g1)*g2)/256);
		var b=255-(((255-b1)*b2)/256);
			return Intern2CSSColor(((a1&0xFF)<<24)|(r<<16)|(g<<8)|b);
		};
		
		this.HSL=function(_h,_s,_l,_a){
			if(typeof(_a)=="undefined")_a=0xFF;
			return Intern2CSSColor(_HSL2RGB(_h,_s,_l)|((_a&0xFF)<<24));
		};
	
		this.ColorOfImagePoint=function(_filepathname,_x,_y,_layername){
			return Intern2CSSColor(0);
		};
	
		this.SetColorsOfImagePoints=function(_filepathname,_pointsInfo){
		var doc=app.open(new File(µ.compileCSSFile.outputFile.path+"/"+_filepathname)),i,j;	
		var pixelLoc,colorSampler;
			if(doc){
				doc.colorSamplers.removeAll();
				pixelLoc=[UnitValue(0),UnitValue(0)]; 
				colorSampler=doc.colorSamplers.add(pixelLoc);
				//µCSSLog("colorSampler!!");
				for(j=0;j<_pointsInfo.length;j++){
					//µCSSLog("colorSampler="+_pointsInfo[j][2]+","+_pointsInfo[j][3]);
					//for(i=0;i<doc.artLayers.length;i++)doc.artLayers[i].visible=doc.artLayers[i].name==_pointsInfo[j][1];
					for(i=0;i<doc.artLayers.length;i++)µCSSLog("name="+doc.artLayers[i].name+","+_pointsInfo[j][1]);
					pixelLoc[0]=_pointsInfo[j][2]; 
					pixelLoc[1]=_pointsInfo[j][3]; 
					colorSampler.move(pixelLoc);
					µCSSLog("colorSampler??");
					µCSSLog("colorSampler="+colorSampler);
					try{
						//µCSSLog("colorSampler="+colorSampler.color.nearestWebColor.hexValue);
						eval(_pointsInfo[j][0]+'="#'+colorSampler.color.nearestWebColor.hexValue+'";');
					}catch(e){
						µCSSError("JavaScript error (line <lineno/>, <code/>).".i18xTrans({"lineno":lno,"code":t.trim()}));
					};
				};
				doc.close(SaveOptions.DONOTSAVECHANGES);
			}else{
				µCSSError("");
			};
		return Intern2CSSColor(0);
		};
	
		// ------------------------
		// File System Operations
		// ------------------------
		this.DeleteFile=function(){
		};
		this.CopyFile=function(){
		};
		this.CreateFolder=function(){
		};
		this.DeleteFolder=function(_removeself,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
		};
		this.CopyFolder=function(_dstFolderPathName,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
		};
	
		// --------------------
		// FTP Operations
		// --------------------
		this.CreateFTPFolder=function(){
		};
		this.DeleteFTPFolder=function(){
		};
		this.DeleteFTPFolderContent=function(){
		};
		this.DeleteFTPFile=function(){
		};
		this.SendLocalFile=function(_localFilePathName,_ftpFilePathName){
		};
		this.ReceiveFTPFile=function(_localFilePathName,_ftpFilePathName){
		};
		this.SyncFTPFolder=function(_host,_port,_user,_pswd,_ftpFolderPathName,_localFolderPathName,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
		var ftp=new FTP(_host,_port,_user,_pswd);
			if(ftp.connect()==ftp.ERR_NONE){
				ftp.SyncFTPFolder(_ftpFolderPathName,_localFolderPathName,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern);
				ftp.Disconnect();
			};
		};
		this.SyncLocalFolder=function(_host,_port,_user,_pswd,_localFolderPathName,_ftpFolderPathName,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
			if(ftp.connect()==ftp.ERR_NONE){
				ftp.SyncLocalFolder(_localFolderPathName,_ftpFolderPathName,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern);
				ftp.Disconnect();
			};
		};

		// --------------------
		// Internal Methodes
		// --------------------
		this._Compile=function(){
		var allready=false,f;
			if(this.complingAborted)return;
			while(!allready){
				//for(var f in this.cssFiles)if(typeof(this.cssFiles[f])!="function")if(!this.cssFiles[f].isReady)µCSSLog("compiling "+this.cssFiles[f].inputFile.fullName);
				for(f in this.cssFiles)if(typeof(this.cssFiles[f])!="function")if(!this.cssFiles[f].isReady)this.cssFiles[f].Compile();
				allready=true;
				for(f in this.cssFiles)if(typeof(this.cssFiles[f])!="function")if(!this.cssFiles[f].isReady)allready=false;
			};
		};
		
		this._Save=function(){
		var allexists=true;
			if(this.complingAborted)return;
			for(var f in this.cssFiles)if(typeof(this.cssFiles[f])!="function")µCSSLog("Saving CSS file '"+this.cssFiles[f].outputFile.fullName+"'...");
			for(var f in this.cssFiles)if(typeof(this.cssFiles[f])!="function")if(!this.cssFiles[f].exists)allexists=false;
			if(allexists)for(var f in this.cssFiles)if(typeof(this.cssFiles[f])!="function")this.cssFiles[f].Save();
			if(!allexists)µCSSLog("Nothing is saved because there are sources missing!".i18xTrans());
		};
		
		this.InitPlugIns=function(){
		};
		
	};
	
	function µCSS(_inputCSSFile,_outputCSSFile){
		µCSSLog("Compiling '"+_inputCSSFile.fullName+"'...");
		if(typeof(_outputCSSFile)=="undefined")_outputCSSFile=_inputCSSFile;
		µ=new µObj(_inputCSSFile);
		µ.InitPlugIns();
		µ.cssFiles.push(new CSSFile(_inputCSSFile,_outputCSSFile));
		µ._Compile();
		if(µ.options.sprites.creation&&!µ.complingAborted)CreateSprites();
		if(!µ.options.sprites.creation)RemoveSprites();
		if(µ.options.createPreLoadRule&&!µ.complingAborted)CreatePreLoadRule();
		if(!µ.complingAborted)µ._Save();
		if(!µ.complingAborted)µ.cache.Close();
	}
		
	
	
	// ====================
	// µCSS GUI
	// ====================
	function ShowAbout(){
	var h="";
		h+="\n";
		h+="======================================\n";
		h+="µCSS · Version "+RELEASES[0].main+"."+RELEASES[0].minor+"."+RELEASES[0].revision+(RELEASES[0].beta?"β":"")+" · "+RELEASES[0].date+"\n";
		h+="Written by Meinolf Amekudzi\n";
		h+="© 2005-2014 Dongleware Verlags GmbH (µCSS, SystemJSXInc and fptJSXInc, MIT License), http://www.dongleware.com\n";
		h+="© 2011 Jake Gordon and contributors (BitPack JS Library), https://github.com/jsmarkus/node-bin-packing\n";
		h+="© 2013 Douglas Crockford (JSON JS Library), https://github.com/douglascrockford/JSON-js\n";
		h+="© 1998-2009 Paul Johnston & Contributors (MD5, BSD License), http://pajhome.org.uk/site/legal.html\n";
		h+="These scripts are published under MIT license and are for free and commercial use. Neither Dongleware nor the author can’t be held liable for any damages by using these scripts may cause. The use of this software is on your own risk. Save your works before using these scripts. For licenses of included third parties libraries please take a look inside scripts.\n";
		h+="======================================\n";
		h+="\n";
		µCSSLog(h);
	};

	function ShowReleaseHistory(){
	var r,i,h="=======\nRELEASES\n=======\n\n";
		for(r in RELEASES){
			if(!(RELEASES[r] instanceof Function)){
				h+=RELEASES[r].main+"."+RELEASES[r].minor+"."+RELEASES[r].revision+" · "+RELEASES[r].date+"\n";
				h+="=============================\n";
				for(i in RELEASES[r].info){
					if(!(RELEASES[r].info[i] instanceof Function)){
						h+='* '+RELEASES[r].info[i]+"\n";
					};
				};
				h+="\n\n";
			};
		};
		µCSSLog(h);
	};
	
	var µCSSPlugIns=new Object();
	function LoadPlugIns(){
	var pluginFolder=new Folder($.fileName.dirname()+"/plugins"),pluginFolders,pf,code,e,pluginFile,s="",pi;
		if(pluginFolder.exists){
			pluginFolders=pluginFolder.getFiles("*");
			for(pf in pluginFolders){
				if(pluginFolders[pf] instanceof Folder){
					pluginFile=new File(pluginFolders[pf].fullName+"/"+pluginFolders[pf].name+".plugin.jsx");
					if(pluginFile.exists){
						s="";
						code=pluginFile.getContents();
						try{
							eval(code);
							eval("pi=new "+pluginFolders[pf].name);
							i18x.Load(pluginFolders[pf].fullName);
							s+="Loading plugin '<pluginname/>' V<versioninfo/>...".i18xTrans({"pluginname":pluginFolders[pf].name,"versioninfo":pi.RELEASES[0].main+"."+pi.RELEASES[0].minor+"."+pi.RELEASES[0].revision+((pi.RELEASES[0].beta)?"β":"")+" · "+pi.RELEASES[0].date});
						}catch(e){
							s+="Loading plugin '<pluginname/>'...".i18xTrans({"pluginname":pluginFolders[pf].name});
							s+="Loading error: <error/> (line <lineno/>).".i18xTrans({"error":e,"lineno":e.line});
						};
						µCSSLog(s,LOG_REVERSE);
					};
				};
			};
		};
	};

	function SaveSettings(){
	var s=$.fileName.basename().withoutSuffix()+"_general",fs=[],i,f;
		for(i=0;i<µcssFileNameList.items.length;i++){
			f=new Object();
			f.fullName=µcssFileNameList.items[i].text;
			f.checked=µcssFileNameList.items[i].checked;
			fs.push(f);
		};
		SetSetting(s,"µcssFileNameList",fs)
	};
	
	function LoadSettings(){
	var s=$.fileName.basename().withoutSuffix()+"_general",fs,i,f;
		fs=GetSetting(s,"µcssFileNameList");
		if(typeof(fs)!="undefined"){
			for(i=0;i<fs.length;i++){
				if(typeof(fs[i])!="function"){
					µcssFileNameList.add("item",fs[i].fullName);
					n=µcssFileNameList.find(fs[i].fullName);
					if(n)n.checked=fs[i].checked;
				};
			};
		};
	};

	function µCompile(){
	var i,f;
		µµ=new Object();
		DisableDialog();
		µµ.$=new Object();
		µµ.topCSSFiles=new Array();
		for(i=0;i<µcssFileNameList.items.length;i++){
			if(µcssFileNameList.items[i].checked){
				f=new File(µcssFileNameList.items[i].text)
				if(f.exists){
					µµ.topCSSFiles.push(f);
				}else{
					µCSSLog("File '<filename/>' does not exist.".i18xTrans({"filename":f.fullName}));
				};
			};
		};
		if(µµ.topCSSFiles)for(var f in µµ.topCSSFiles)if(µµ.topCSSFiles[f] instanceof File)µCSS(µµ.topCSSFiles[f]);
		EnableDialog();
		µCSSLog("Ready!");
	};
	
	function DisableDialog(){
		µcssFileNameList.enabled=false;
		µcssAddCSSFileButton.enabled=false;
		µcssRemoveCSSFileButton.enabled=false;
		µcssCacheClearButton.enabled=false;
		µcssCheckCSSFileButton.enabled=false;
		µcssCompileButton.enabled=false;
	};
	function EnableDialog(){
		µcssFileNameList.enabled=true;
		µcssAddCSSFileButton.enabled=true;
		µcssRemoveCSSFileButton.enabled=true;
		µcssCacheClearButton.enabled=true;
		µcssCheckCSSFileButton.enabled=true;
		µcssCompileButton.enabled=true;
	};
	
	var i;
	var iconbase=$.fileName.dirname()+"/imgs/buts/";
	var logobase=$.fileName.dirname()+"/imgs/";
	var compileButtonImages=[];
	
	function InitCompileButtonImages(){
		for(i=0;i<5;i++)compileButtonImages[i]=ScriptUI.newImage(new File(iconbase+"but_compile_"+i+".png"));
	};
	var curCompileButtonImageNo=0;
	var lastµCSSTick=0;
	function µCSSTick(){
		lastµCSSTick=$.hiresTimer;
		curCompileButtonImageNo++;
		if(curCompileButtonImageNo>4)curCompileButtonImageNo=0;
		µcssCompileButton.image=compileButtonImages[curCompileButtonImageNo];
	};
	
	i18x.Load($.fileName.dirname());

	var µcssw=new Window("dialog","µCSS · V"+RELEASES[0].main+"."+RELEASES[0].minor+"."+RELEASES[0].revision+" · "+RELEASES[0].date,undefined,{resizeable:true});
	µcssw.preferredSize=[800,300];
	µcssw.graphics.backgroundColor=µcssw.graphics.newBrush(µcssw.graphics.BrushType.SOLID_COLOR,[0.2,0.2,0.2]);
	µcssw.graphics.disabledBackgroundColor=µcssw.graphics.newBrush(µcssw.graphics.BrushType.SOLID_COLOR,[0.4,0.4,0.4]);
	µcssw.orientation="column";
	
	var µcsswtopgrp=µcssw.add("group");
	µcsswtopgrp.orientation="row"
	µcsswtopgrp.alignment=["fill","fill"];

		var logo=µcsswtopgrp.add("image",undefined,File(logobase+"logo.png"));
		var dwlogo=µcsswtopgrp.add("image",undefined,File(logobase+"dw_logo.png"));
		logo.alignment=["left","fill"];
		dwlogo.alignment=["right","fill"];

	/*
		var µcssInfo=µcsswtopgrp.add('StaticText',undefined,'µCSS Log');
		µcssInfo.graphics.foregroundColor=µcssInfo.graphics.newPen(µcssInfo.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssInfo.alignment="left";
		var µcssVersionInfo=µcsswtopgrp.add('StaticText',undefined,'V 1.0.0');
		µcssVersionInfo.graphics.foregroundColor=µcssVersionInfo.graphics.newPen(µcssVersionInfo.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssVersionInfo.alignment="right";
	*/
	

	var µcsslog=µcssw.add('edittext',undefined,'',{multiline:true});
	µcsslog.alignment=["fill","fill"];
	
	var µcsswFileListGrp=µcssw.add("group");
	µcsswFileListGrp.orientation="row"
	µcsswFileListGrp.alignment=["fill","fill"];
		var µcssFileNameList=µcsswFileListGrp.add("listbox",undefined,[],{multiselect: true});
		µcssFileNameList.graphics.foregroundColor=µcssFileNameList.graphics.newPen(µcssFileNameList.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssFileNameList.preferredSize.height=200;
		µcssFileNameList.alignment=["fill","fill"];
		InitCompileButtonImages();
		
	var µcsswbottomgrp=µcssw.add("group");
	µcsswbottomgrp.orientation="row"
	µcsswbottomgrp.alignment=["fill","fill"];
	µcsswbottomgrp.preferredSize.height=40;
	
		var µcssHelpButton=µcsswbottomgrp.add("iconbutton",undefined,new File(iconbase+"but_help.png"));
		µcssHelpButton.graphics.foregroundColor=µcssHelpButton.graphics.newPen(µcssHelpButton.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssHelpButton.size=[40,30];
		µcssHelpButton.alignment=["left",'bottom'];
		µcssHelpButton.helpTip="...open µCSS manual...".i18xTrans();
		µcssHelpButton.onClick=function(){
		var f=new File($.fileName.dirname()+"/µCSS.pdf");
			if(f.exists)f.execute();
		};
	
		var µcssInfoButton=µcsswbottomgrp.add("iconbutton",undefined,new File(iconbase+"but_info.png"));
		µcssInfoButton.graphics.foregroundColor=µcssInfoButton.graphics.newPen(µcssInfoButton.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssInfoButton.size=[40,30];
		µcssInfoButton.alignment=["left",'bottom'];
		µcssInfoButton.onClick=function(){ShowReleaseHistory();};
		µcssInfoButton.helpTip="...show revision information...".i18xTrans();
		

		var µcssEditButton=µcsswbottomgrp.add("iconbutton",undefined,new File(iconbase+"but_edit.png"));
		µcssEditButton.graphics.foregroundColor=µcssEditButton.graphics.newPen(µcssEditButton.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssEditButton.size=[40,30];
		µcssEditButton.alignment=["left",'bottom'];
		µcssEditButton.helpTip="...edit selected CSS files..".i18xTrans();
		µcssEditButton.onClick=function(){
		var f,ok=false;
			if(µcssFileNameList.selection){
				for(var i=0;i<µcssFileNameList.selection.length;i++){
					ok=true;
					f=new File(µcssFileNameList.selection[i]);
					if(f.exists)f.execute();
				};
			};
			if(!ok)alert("No files selected. Please select at least one file in list to use this function. Note: There is a different between marking and selecting files.".i18xTrans());
		};

		var µcssCacheClearButton=µcsswbottomgrp.add("iconbutton",undefined,new File(iconbase+"but_cacheclear.png"));
		µcssCacheClearButton.graphics.foregroundColor=µcssEditButton.graphics.newPen(µcssEditButton.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssCacheClearButton.size=[40,30];
		µcssCacheClearButton.alignment=["left",'bottom'];
		µcssCacheClearButton.helpTip="...clear caches of selected CSS files to force new image generation, new sprite generation etc....".i18xTrans();
		µcssCacheClearButton.onClick=function(){
		var c,ok=false;
			if(µcssFileNameList.selection){
				for(var i=0;i<µcssFileNameList.selection.length;i++){
					ok=true;
					c=new Cache(µcssFileNameList.selection[i].toString());
					c.Clear();
					µCSSLog("...cache of <css/> cleared...".i18xTrans({"css":µcssFileNameList.selection[i].toString()}));
				};
			};
			if(!ok)alert("No files selected. Please select at least one file in list to use this function. Note: There is a different between marking and selecting files.".i18xTrans());
		};

		var µcssAddCSSFileButton=µcsswbottomgrp.add("iconbutton",undefined,new File(iconbase+"but_addfiles.png"));
		µcssAddCSSFileButton.graphics.foregroundColor=µcssAddCSSFileButton.graphics.newPen(µcssAddCSSFileButton.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssAddCSSFileButton.size=[40,30];
		µcssAddCSSFileButton.alignment=["left",'bottom'];
		µcssAddCSSFileButton.helpTip="...add new CSS files to collection...".i18xTrans();
		µcssAddCSSFileButton.onClick=function(){
		var f,i,addFiles=File.openDialog("µCSS: Choose css file(s)","CSS:*.css",true);
			if(addFiles){
				for(f in addFiles){
					if(addFiles[f] instanceof File){
						if(!µcssFileNameList.find(addFiles[f].fullName)){
							µcssFileNameList.add("item",addFiles[f].fullName);
							i=µcssFileNameList.find(addFiles[f].fullName);
							if(i)i.checked=true;
						};
					};
				};
				SaveSettings();
			};
		};
		
		var µcssRemoveCSSFileButton=µcsswbottomgrp.add("iconbutton",undefined,new File(iconbase+"but_removefiles.png"));
		µcssRemoveCSSFileButton.graphics.foregroundColor=µcssRemoveCSSFileButton.graphics.newPen(µcssRemoveCSSFileButton.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssRemoveCSSFileButton.size=[40,30];
		µcssRemoveCSSFileButton.alignment=["left",'bottom'];
		µcssRemoveCSSFileButton.helpTip="...remove selected CSS files from collection...".i18xTrans();
		µcssRemoveCSSFileButton.onClick=function(){
			if(µcssFileNameList.selection)for(var i=µcssFileNameList.selection.length-1;i>=0;i--)µcssFileNameList.remove(µcssFileNameList.selection[i]);
			SaveSettings();
		};

		var µcssCheckCSSFileButton=µcsswbottomgrp.add("iconbutton",undefined,new File(iconbase+"but_check.png"));
		µcssCheckCSSFileButton.graphics.foregroundColor=µcssCheckCSSFileButton.graphics.newPen(µcssCheckCSSFileButton.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssCheckCSSFileButton.size=[40,30];
		µcssCheckCSSFileButton.alignment=["left",'bottom'];
		µcssCheckCSSFileButton.helpTip="...mark all selected CSS files for ompiling...".i18xTrans();
		µcssCheckCSSFileButton.onClick=function(){
			for(var i=0;i<µcssFileNameList.selection.length;i++)µcssFileNameList.selection[i].checked=!µcssFileNameList.selection[i].checked;
			SaveSettings();
		};

		var µcssCompileButton=µcsswbottomgrp.add("iconbutton",undefined,new File(iconbase+"but_compile.png"));
		µcssCompileButton.graphics.foregroundColor=µcssCompileButton.graphics.newPen(µcssCompileButton.graphics.PenType.SOLID_COLOR,[1,1,1],1);
		µcssCompileButton.size=[60,40];
		µcssCompileButton.alignment=["right",'bottom'];
		µcssCompileButton.helpTip="...compile marked CSS files...".i18xTrans();
		µcssCompileButton.onClick=function(){µCompile();}
		
	
	µcssw.onResizing=function(){this.layout.resize();};
	µcssw.onShow=function(){
		µcssw.layout.layout();
		µcssw.minimumSize=µcssw.preferredSize;
	};
	ShowAbout();
	LoadPlugIns();
	LoadSettings();
	µcssw.show();
	
	/*
	var dd;
	var ftp=new FTP("192.168.0.1",21,"testuser","testpwd");
	if(ftp.connect()==ftp.ERR_NONE){
		ftp.doLog.true;
		//ftp.ReceiveFTPFile($.fileName.dirname()+"/test.jpg","/test/DSC00192.JPG");
		ftp.SyncFTPFolder("/imgs",$.fileName.dirname()+"/imgs");
		$.writeln(ftp.GetFTPFolderList("/test"));
		ftp.Disconnect();
	};
	*/
		
}

