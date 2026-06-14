// DW System Lib
// ©2011-2013 Dongleware Verlags GmbH
//
// This script is published under MIT licence and is for free and commercial use.
// Neither Dongleware nor the author can’t be held liable for any damages by using this script may cause.
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

var LIBSINFO=new Object();
LIBSINFO["system"]={
	"NAME":"system",
	"RELEASES":[
		{"main":1,"minor":0,"revision":0,"date":"2013-12-22 23:00",
			"info":[
				"first registered version"
			]
		}

	]
};


var DWLIB_SYSTEM=true;
var IS_WINDOWS=$.os.indexOf("Windows")>=0;
var MINFLOAT=5e-324;
var MAXFLOAT=1.7976931348623157e+308;
var LIBSCRIPTFOLDER=$.fileName.substr(0,$.fileName.lastIndexOf('/'));
var DODEBUG=false;
var SETTINGSBASE="GENERAL";


// =============================================
// STRING PROTOTYPES & FUNCTIONS
// =============================================
String.prototype.suffix=function(){
var s=""+this.valueOf();
var i;
var _ret=s;
	i=s.lastIndexOf(".");
	if(i>-1)_ret=s.substr(i+1);
	return _ret.toLowerCase();
}
String.prototype.withoutSuffix=function(){
var s=""+this.valueOf();
var i;
var _ret=s;
	i=s.lastIndexOf(".");
	if(i>-1)_ret=s.substr(0,i);
	return _ret;
}
String.prototype.basename=function(){
var s=""+this.valueOf();
var i;
var _ret=s;
	i=s.lastIndexOf("/");
	if(i>-1)_ret=s.substr(i+1);
	return _ret;
}
String.prototype.dirname=function(){
var s=""+this.valueOf();
var i;
var _ret=s;
	i=s.lastIndexOf("/");
	if(i>-1)_ret=s.substr(0,i);
	return _ret;
}
String.prototype.base64=function(){
var keyStr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var ret="";
var chr1,chr2,chr3,enc1,enc2,enc3,enc4;
var i=0;
	input=this.valueOf();
	while(i<input.length){
		chr1=input.charCodeAt(i++);
		chr2=input.charCodeAt(i++);
		chr3=input.charCodeAt(i++);
		enc1=chr1>>2;
		enc2=((chr1&3)<<4)|(chr2>>4);
		enc3=((chr2&15)<<2)|(chr3>>6);
		enc4=chr3&63;
		if(isNaN(chr2)){
			enc3=enc4=64;
		}else if(isNaN(chr3)){
			enc4=64;
		}
		ret+=keyStr.charAt(enc1)+keyStr.charAt(enc2)+keyStr.charAt(enc3)+keyStr.charAt(enc4);
	}
	return ret;
}
String.prototype.toadobeshit=function(){
var s=""+this.valueOf();
var i;
var _ret=s;
	//Search to '17041963' in 'C:\Program Files (x86)\Common Files\Adobe\Startup Scripts CS5.5\Adobe Photoshop\photoshop.jsx':
	return escape(s.split('"').join('17041963'));
}
String.prototype.right=function(_n){
	return this.substring(this.length,this.length-_n);
}
String.prototype.lefts=function(_n){
	return this.substr(0,this.length-_n);
}
String.prototype.trim=function(){
  // Use a regular expression to replace leading and trailing 
  // spaces with the empty string
  return this.replace(/(^\s*)|(\s*$)/g,"");
}
String.prototype.parseInt=function(_base){
	return parseInt(this.valueOf(),(!_base)?10:_base);
}

String.prototype.ltrim=function(){
  return this.replace(/(^\s*)/g,"");
};
String.prototype.rtrim=function(){
  return this.replace(/(\s*$)/g,"");
}
String.prototype.preNull=function(_n){
var t=this.valueOf();
	while(t.length<_n)t="0"+t;
	return t;
}
String.prototype.preZero=function(_n){
var t=this.valueOf();
	while(t.length<_n)t="0"+t;
	return t;
}
String.prototype.charCount=function(_n,_c){
var t=this.valueOf();
	while(t.length<_n)t="0"+t;
	return t;
}
String.prototype.noOfChars=function(_c){
var t=this.valueOf(),lt,r=0;
	lt=t.length;
	for(i=0;i<lt;i++)if(t.charAt(i)==_c)r++;
	return r;
}
String.prototype.change=function(_c,_str){
var t=this.valueOf(),ret="",i,c;
	lt=t.length;
	for(i=0;i<lt;i++){
		c=t.charAt(i);
		if(c==_c){
			ret+=_str;
		}else{
			ret+=c;
		};
	};
	return ret;
}
String.prototype.strreplace=function(_strpat,_rplstr){
var reg;
	if(_rplstr==null)_rplstr='';
	_strpat=_strpat.change('.','\.');
	_strpat=_strpat.change('*','\*');
	_strpat=_strpat.change('?','\?');
	reg=new RegExp(_strpat,"ig");
	return this.replace(reg,_rplstr);
}
String.prototype.rightCharCut=function(_c,_n){
var ret='',i,n=0,m,s=this.valueOf(),l=s.length;
	n=s.noOfChars(_c);
	if(n>=_n){
		_n=n-_n+1;
		m=0;
		for(i=0;i<l;i++){
			if(s.charAt(i)==_c)m++;
			if(m==_n)return ret;
			ret+=s.charAt(i);
		};
	};
	return s;
}
String.prototype.leftCharCut=function(_c,_n){
var ret='',i,n=0,m,s=this.valueOf(),l=s.length;
	n=s.noOfChars(_c);
	if(n>=_n){
		m=0;
		for(i=0;i<l;i++){
			if(s.charAt(i)==_c)m++;
			if(m==_n)return ret;
			ret+=s.charAt(i);
		};
	};
	return s;
}
String.prototype.cutAtLastCharOf=function(_c){
var i,s=this.valueOf();
	if(_c==null)_c="_";
	i=s.lastIndexOf(_c);
	if(i>=0)s=s.substr(0,i);
	return s;
}
String.prototype.cutLastAtCharOf=function(_c){
var i,s=this.valueOf();
	if(_c==null)_c="_";
	i=s.lastIndexOf(_c);
	if(i>=0)s=s.substr(i+1);
	return s;
}
String.prototype.lastChar=function(){
var s=this.valueOf();
	return s.substr(s.length-1,1);
}
String.prototype.pfxchg=function(_newprefix){
var s=this.valueOf();
	if(_newprefix=="")return s;
	return _newprefix+s.substr(s.indexOf("_"));
}
String.prototype.str_replace=function(_s,_r){
	return this.valueOf().split(_s).join(_r);
}
String.prototype.strtr=function(_s,_r){
var i,s=this.valueOf();
	for(i=0;i<s.length;i++)s=s.split(_s[i]).join(_r[i]);
	return s;
}
String.prototype.BracketsContent=function(){
var s=this.valueOf(),b,e;
	b=this.indexOf("(");
	e=this.indexOf(")");
	if(b<0||e<0){
		return"";
	}else if(b>=0&&e>=0&&e>b){
		return s.substr(b+1,e-b);
	}else{
		return "";
	};
}
String.prototype.between=function(_cl,_cr){
var s=this.valueOf(),b,e;
	if(typeof(_cr)=="undefined")_cr=_cl;
	b=this.indexOf(_cl);
	e=this.lastIndexOf(_cr);
	if(b<0||e<0){
		return"";
	}else if(b>=0&&e>=0&&e>b){
		return s.substr(b+1,e-b);
	}else{
		return "";
	};
}

String.prototype.TestRegExs=function(_regexs){
var s=this.valueOf(),ret=false;
	if(typeof(_regexs.is)!="undefined"){
		ret=ret||_regexs.is.test(s);
	};
	if(typeof(_regexs.isnot)!="undefined"){
		ret=ret||!_regexs.isnot.test(s);
	};
	return ret;
}

String.prototype.IsSecurityPath=function(){
	var securityPaths=[];
	securityPaths[securityPaths.length]=/^\/[a-z]\/?$/;
	securityPaths[securityPaths.length]=/^\/$/,/^\/\~\/Desktop\/?$/;
	securityPaths[securityPaths.length]=/^\/System\/?$/;
	securityPaths[securityPaths.length]=/^\/Documents\/?$/;
	securityPaths[securityPaths.length]=/^\/\Library\/?$/;
	securityPaths[securityPaths.length]=/^\/Library\/Appliacation\sSupport\/?$/;
	securityPaths[securityPaths.length]=/^\/c\/Windows\/?$/;
	securityPaths[securityPaths.length]=/^\/c\/Document\sand\sSettings\/?$/;
	//var securityPaths=[/^\/[a-z]\/?$/,/^\/$/,/^\/\~\/Desktop\/?$/,/^\/System\/?$/,/^\/Documents\/?$/,/^\/\Library\/?$/,/^\/Library\/Appliacation\sSupport\/?$/,/\/\c\/Windows\/?$/,/^\/c\/Document\sand\sSettings\/?$/];
	var i,l=securityPaths.length;
	for(i=0;i<l;i++)if(securityPaths[i].test(this.valueOf()))return true;
	return false;
}
String.prototype.i18xKey=function(){
	return this.replace(/(\t|\n+)/g,"").replace(/(\s+)/g," ");
}
String.prototype.i18xTrans=function(_placeholders,_lid){
	return i18x.Trans(this.valueOf(),_placeholders,_lid);
}
String.prototype.i18xRegister=function(_lid){
	return i18x.Register(this.valueOf(),_lid);
}
String.prototype.parseJSON=function(){
var e;
	try{
		return eval("("+this.valueOf()+")");
	}catch(e){
		return null;
	};
}

function SimplyfyURI(_uri){
	if(_uri.substr(0,2)=="./")_uri=_uri.substr(2);
	return _uri;
}
function CountChars(_n,_c){
var i,r="";
	for(i=0;i<_n;i++)r+=_c;
	return r;
}
function PreNull(_s,_n){
var t=_s+"";
	return t.preNull(_n);
}
function PreZero(_s,_n){
var t=_s+"";
	return t.preNull(_n);
}
// =============================================
// BOOLEAN PROTOTYPES
// =============================================
Boolean.prototype.htmlEntities=function(){
	return ""+this.valueOf();
}

Boolean.prototype.setSetting=function(_section,_key){
	SetSetting(_section,_key,this.valueOf()?'true':'false');
}

// =============================================
// NUMBER PROTOTYPES
// =============================================
Number.prototype.scaleAndCut=function(_scalefactor){
	return Math.round(this.valueOf()*_scalefactor*10)/10;
}
Number.prototype.toInversAndCut=function(){
	return Math.round(this.valueOf()*10)/1000;
}
Number.prototype.toRadiansAndCut=function(){
	return Math.round(this.valueOf()*Math.PI/180*1000)/1000;
}
Number.prototype.sign==function(){
var v=this.valueOf();
	if(v<0)return -1;
	if(v>0)return 1;
	return 0;
}
Number.prototype.preZero=function(_n){
	return this.toString().preZero(_n);
};
Number.prototype.clamp=function(_min,_max){
var ret=this;
	if(this<_min)ret=_min;
	if(this>_max)ret=_max;
	return ret;
}
Number.prototype.htmlEntities=function(){
	return ""+this.valueOf();
}
Number.prototype.toRomanString=function(){
var i=3,n=Math.abs(this.valueOf()),ret="";
	if(!+n)return false;
	var	digits=String(+n).split(""),key=["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM","","X","XX","XXX","XL","L","LX","LXX","LXXX","XC","","I","II","III","IV","V","VI","VII","VIII","IX"];
	while(i--)ret=(key[+digits.pop()+(i*10)]||"")+ret;
	return Array(+digits.join("")+1).join("M")+ret;
}

Number.prototype.format=function(_format,_lid){
	if(!_lid)_lid=i18x.lid;
	try{return i18x.i18xFormats[_lid][_format].Exec(this.valueOf());}catch(e){return "i18x format error :"+this.toString();};
}


// =============================================
// MATH FUNCTIONS
// =============================================
function sign(_v){
	if(v<0)return -1;
	if(v>0)return 1;
	return 0;
}
function IntRnd(_min,_max){
	return Math.floor((Math.random()*(_max-_min+1)+_min));
}


// =============================================
// FOLDER PROTOTYPES & FUNCTIONS
// =============================================
function ContentInfo(){
}

Folder.prototype.getContentInfo=function(_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
var reg,files,ret=new ContentInfo(),i,j,f;
	if(typeof(_recursive)=="undefined")_recursive=true;
	if(typeof(_doFilePattern)=="undefined")_doFilePattern=/.*/;
	if(typeof(_doNotFilePattern)=="undefined")_doNotFilePattern=/^$/;
	if(typeof(_doFolderPattern)=="undefined")_doFolderPattern=/.*/;
	if(typeof(_doNotFolderPattern)=="undefined")_doNotFolderPattern=/^$/;
	reg=new RegExp(_regexpstr,"ig");
	files=this.getFiles('*');
	for(i in files){
		if(files[i] instanceof File){
			if(_doFilePattern.test(f)&&!_doNotFilePattern.test(f))ret[files[i].name]=files[i];
		}else if((files[i] instanceof Folder)){
			if(_doFolderPattern.test(f)&&!_doNotFolderPattern.test(f)){
				if(_recursive){
					ret[files[i].name]=files[i].getContentInfo(_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern);
				}else{
					ret[files[i].name]=files[i];
				};
			};
		};
	};
	return ret;
}

Folder.prototype.removeContent=function(_removeself,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
if(this.IsSecurityPath())return false;
if(typeof(_removeself)=="undefined")_removeself=true;
if(typeof(_recursive)=="undefined")_recursive=true;
if(typeof(_doFilePattern)=="undefined")_doFilePattern=/.*/;
if(typeof(_doNotFilePattern)=="undefined")_doNotFilePattern=/^$/;
if(typeof(_doFolderPattern)=="undefined")_doFolderPattern=/.*/;
if(typeof(_doNotFolderPattern)=="undefined")_doNotFolderPattern=/^$/;
var f,files=this.getFiles('*');
	for(f in files){
		if(files[f] instanceof File){
			if(_doFilePattern.test(f)&&!_doNotFilePattern.test(f))files[f].remove();
			//if(_doFilePattern.test(f)&&!_doNotFilePattern.test(f))dbg("removefile:"+files[f].name);
		}else if(files[f] instanceof Folder){
			if(_recursive&&_doFilePattern.test(f)&&!_doNotFilePattern.test(f))files[f].removeContent(_removeself,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern);
		}
	}
	//iif(_removeself)dbg("removefolder:"+this.name);
	if(_removeself)this.remove();
	return true;
}

Folder.prototype.copy=function(_dstFolderPathName,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
return; // not implemented yet
if(this.IsSecurityPath())return false;
if(typeof(_removeself)=="undefined")_removeself=true;
if(typeof(_recursive)=="undefined")_recursive=true;
if(typeof(_doFilePattern)=="undefined")_doFilePattern=/.*/;
if(typeof(_doNotFilePattern)=="undefined")_doNotFilePattern=/^$/;
if(typeof(_doFolderPattern)=="undefined")_doFolderPattern=/.*/;
if(typeof(_doNotFolderPattern)=="undefined")_doNotFolderPattern=/^$/;
var f,files=this.getFiles('*');
	for(f in files){
		if(files[f] instanceof File){
			if(_doFilePattern.test(f)&&!_doNotFilePattern.test(f))files[f].remove();
		}else if(files[f] instanceof Folder){
			if(_recursive&&_doFilePattern.test(f)&&!_doNotFilePattern.test(f))files[f].removeContent2(_removeself,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern);
		}
	}
	if(_removeself)_folder.remove();
}

Folder.prototype.createIfNotExists=function(){
	if(this.exists)return;
	var f=new Folder(this.path).createIfNotExists();
	this.create();
}


Folder.prototype.IsSecurityPath=function(){
	return this.fullName.IsSecurityPath();
}

function GetTmpFolder(_subfoldername){
	if(typeof(_subfoldername)=="undefined"){
		return new Folder($.fileName.substr(0,$.fileName.lastIndexOf('/'))+"/../tmp");
	}else{
		return new Folder($.fileName.substr(0,$.fileName.lastIndexOf('/'))+"/../tmp/"+_subfoldername);
	};
}

function GetTmpFile(_tmppathfilename){
	return new File($.fileName.substr(0,$.fileName.lastIndexOf('/'))+"/../tmp/"+_tmppathfilename);
}

// =============================================
// FILE PROTOTYPES & FUNCTIONS
// =============================================
File.prototype.nameWithoutSuffix=function(){
var s=""+this.name,i,_ret=s;j=s.lastIndexOf("/");
	i=s.lastIndexOf(".");
	if((i>-1)&&(i>j))_ret=s.substring(0,i);
	return _ret;
}
File.prototype.suffix=function(){
var s=""+this.name;
var i;
var _ret=s;
	i=s.lastIndexOf(".");
	if(i>-1)_ret=s.substr(i+1);
	return _ret.toLowerCase();
}
File.prototype.putContents=function(_contents){
var ok;
	ok=this.open("w");
	if(ok)ok=this.write(_contents);
	if(ok)ok=this.close();
	return ok;
}
File.prototype.getContents=function(){
var contents=false,ok;
	contents=this.open('r');
	if(contents)contents=this.read();
	if(contents!==false)ok=this.close();
	if(ok){
		return contents;
	}else{
		return false;
	}
}

// =============================================
// ARRAY PROTOTYPES
// =============================================
Array.prototype.clear=function(){
	this.length=0;
}
Array.prototype.in_array=function(_n){
var i,l=this.length;
	for(i=0;i<l;i++)if(this[i]==_n)return true;
	return false;
}
Array.prototype.index_in_array=function(_n){
var i,l=this.length;
	for(i=0;i<l;i++)if(this[i]==_n)return i;
	return -1;
}
Array.prototype.addJSON=function(_json){
	for(i in _json)this[i]=_json[i];
}
Array.prototype.removeElement=function(_e){
var i,l=this.length;
	for(i=0;i<l;i++)if(_e==this[i])this.splice(i,1);
}
Array.prototype.kjoin=function(_e){
var i,n="";
	for(i in this)if(!(this[i] instanceof Function))n+=i+":"+this[i]+_e;
	return n;
}
Array.prototype.copy=function(){
var i,ret=new Array();
	for(i in this)if(!(this[i] instanceof Function))ret[i]=this[i];
	return ret;
}

// =============================================
// OBJECT
// =============================================
/*
Object.prototype.addJSON=function(_json){
	for(i in _json)this[i]=_json[i];
}
*/
function Object_addJSON(_o,_json){
var i;
	for(i in _json)_o[i]=_json[i];
}

function OverwriteObjectProperties(_obj,_props){
var p,ret={};
	for(p in _props){
		ret[p]=_obj[p];
		if(typeof(_props[p])=="object"){
			ret[p]=OverwriteObjectProperties(_obj[p],_props[p]);
		}else{
			_obj[p]=_props[p];
		};
	};
	return ret;
}

// =============================================
// I18X
// =============================================
// =============================================
// I18X EXPRESSION OBJECT
// =============================================
function i18xExpression(_exp){
	this.source=_exp;
	this.execSource="";
	this.Exec=function(x){return x;};
	
	this.Parse=function(_exp){
	var func="this.Exec=function(x){var e;try{return ";
		// quick and dirty...
		if(_exp)func+=_exp.strtrs({"round":"Math.round","abs":"Math.abs","ceil":"Math.ceil","floor":"Math.floor","sign":"Math.sign","frac":"Math.frac"});
		func+="}catch(e){return e.toString();}};";
		this.execSource=func;
		eval(this.execSource);
	};
	
	this.Parse(_exp);
};

// =============================================
// I18X FORMAT OBJECT
// =============================================
function i18xFormat(_xml){
	this.name="unnamed";
	this.source=_xml;
	this.execSource="";
	this.Exec=function(_x){return _x;};
	
	
	this.Parse=function(_xml){
	var err,level=0,l,i,j,k,m,e,u,s,n,txt,splits,parts,tag,attrs,attr,doinsertvalue,noOfInlineExpressions=0;inlineExpressions={},noOfEnumereations=0,enumerations={};
	var isClosingTag,isClosedTag,definition,defstart,defattrs,deflevel=0,lastdefattrs,tagexpressionname;
	var thisreturncodeconds,statementscodes=[],returncodes=[[]],returncodeconds=[[]],vardefcodes={},vardefenums={},funcsdefcodes={},expressions={},formats={};
	var chrid,i_abs=false,i_max=0,f_max=0,I_max=0,F_max=0,E_max=0,i_full=false,f_full=false,I_full=false,F_full=false,E_full=false,r_max=0,r_full,dochrrpl,chrrpls;

		function FillArrayStr(_noOf,_chr){
		var n,ret=[];
			for(n=0;n<_noOf;n++)ret.push('"'+_chr+'"');
			return ret.join(",");
		};

		function DefTagCodes(_vardefcodeName,_code,_vardefcode,_codeadd){
		var expr;
			if(typeof(_codeadd)=="undefined")_codeadd=true;
			switch(_vardefcodeName){
				case"localdate":
					vardefcodes.localdate="d=new Date(x*1000)";
					vardefcodes[_code]=_vardefcode+"="+_code;
					_code=_vardefcode;
					break;
				case"value":
					vardefcodes.value=_vardefcode;
					break;
			};
			for(attr in attrs){
				x=attrs[attr];
				switch(attr){
					case"digits":
						break;
					case"enumeration":
						if(!enumerations[attrs[attr]]){
							noOfEnumereations++;
							enumerations[attrs[attr]]={};
							enumerations[attrs[attr]].name="e"+noOfEnumereations;
							enumerations[attrs[attr]].defs=[];
							m=attrs[attr].split("|");
							k=m.length;
							for(j=0;j<k;j++)enumerations[attrs[attr]].defs.push('"'+m[j]+'"');
						};
						vardefcodes[enumerations[attrs[attr]].name]=enumerations[attrs[attr]].name+"=["+enumerations[attrs[attr]].defs.join(",")+"]";
						_code=enumerations[attrs[attr]].name+"["+_code+"]";
						break;
					case"expression":
						if(attrs[attr].substr(0,1)=="="){
							if(!inlineExpressions[attrs[attr]]){
								expr=new i18xExpression(attrs[attr].substr(1));
								noOfInlineExpressions++;
								inlineExpressions[attrs[attr]]={};
								inlineExpressions[attrs[attr]].no=noOfInlineExpressions;
								inlineExpressions[attrs[attr]].name="_x_"+noOfInlineExpressions;
								expressions[inlineExpressions[attrs[attr]].name]=expr;
							};
							tagexpressionname=inlineExpressions[attrs[attr]].name;
							_code=inlineExpressions[attrs[attr]].name+"("+_code+")";
						}else{
							if(expressions["_local_"+attrs[attr]]==null){
								tagexpressionname=attrs[attr];
								_code=attrs[attr]+"("+_code+")";
							}else{
								tagexpressionname="_local_"+attrs[attr];
								_code="_local_"+attrs[attr]+"("+_code+")";
							};
						};
						break;
					case"format":
						if(formats["_local_"+attrs[attr]]==null){
							_code=attrs[attr]+"("+_code+")";
						}else{
							_code="_local_"+attrs[attr]+"("+_code+")";
						};
						break;
				};
			};
			if(_code!=""&&_codeadd)returncodes[level].push(_code);
		};
		
		try{
			vardefcodes.absvalue="";
			vardefcodes.value="";
			vardefcodes.valueary="";
			vardefcodes.integer="";
			vardefcodes.integervalue="";
			vardefcodes.fraction="";
			vardefcodes.fractionvalue="";
			vardefcodes.scvalueif="";
			vardefcodes.scvaluee="";
			vardefcodes.scinteger="";
			vardefcodes.scfraction="";
			vardefcodes.scexponent="";
			vardefcodes.romanvalue="";
			vardefcodes.roman="";
			_xml=_xml.i18xKey();
			//console.log(_xml);
			if(_xml.indexOf("<")==-1)return _xml;
			n=("<i18x>"+_xml+"</i18x>").split("<");
			l=n.length;
			for(i=0;i<l;i++){
				e=n[i].indexOf(">");
				if(e==-1){
					if(n[i]!="")returncodes[level].push(n[i].chrrpl({'"':'/'}));
				}else{
					txt=n[i].substr(e+1);
					isClosingTag=n[i].charAt(0)=="/";
					isClosedTag=n[i].charAt(e-1)=="/";
					s=0;u=e;
					if(isClosedTag)u-=1;
					if(isClosingTag){s=1;u-=1;};
					
					// calculate tag and attributes...
					parts=n[i].substr(s,u).split('" ');
					splits=parts[0].split(" ");
					tag=splits[0];
					tagexpressionname="";
					if(splits[1]){splits.shift();parts[0]=splits.join(" ");k=parts.length-1;parts[k]=parts[k].substr(0,parts[k].length-1);if(parts[k]=="")parts.pop();}else{parts=[];};
					k=parts.length;
					attrs=new Object;
					j=0;
					while(j<k){
						if(parts[j].indexOf('="')>=0){
							attr=parts[j].split('="');
							attrs[attr[0]]=attr[1];
							j++;
						}else{
							attrs[parts[j].substr(0,parts[j].length)]=parts[j+1];
							j+=2;
						};
					};
					k=attrs.length;
					//console.log("tag=");console.log(tag);console.log("attrs=");console.log(attrs);
					// ...now tag is set and attrs contains an object with key/value pairs of attributes of tag. 
					
					if(isClosingTag){
						// ...is closing tag (</tag>).
						level--;
						returncodes[level]=(returncodeconds[level+1]=="")?returncodes[level].concat(returncodes[level+1].join("+")):returncodes[level].concat("(("+returncodeconds[level+1]+")?"+returncodes[level+1].join("+")+":'')");
						if(returncodes[level][0]=="")returncodes[level]=[];
						//console.log("isClosingTag="+returncodes[level]+" - "+returncodes[level].length+"#"+level);
					}else if(isClosedTag){
						// ...is closed tag (<tag/>).
						//console.log("isClosedTag="+returncodes[level]+"#"+level);
						doinsertvalue=true;
					}else{
						// ...is an open tag (<tag>).
						level++;
						returncodes[level]=[];
						returncodeconds[level]="";
						//console.log("isOpenTag="+returncodes[level]+"#"+level);
					};
					
					// process tag...
					if(tag=="definition"){
						// handle special tag "defintion" and nested tags of this...
						if(!isClosingTag&&!isClosedTag){
							deflevel++;
							if(deflevel==2){
								defstart=i;
								definition="";
							};
						};
						if(isClosingTag){
							deflevel--;
							if(deflevel==1){
								definition=[];
								for(j=defstart;j<i;j++)definition.push(n[j]);
								defstart=n[i].indexOf(">");
								definition="<"+definition.join("<")+"<"+n[i].substr(0,defstart+1);
							};
						};
						if(isClosedTag){
							if(deflevel==1){
								defstart=n[i].indexOf(">");
								definition="<"+n[i].substr(0,defstart+1);
							};
						};
						if(((!isClosingTag&&!isClosedTag)&&deflevel==1)||(isClosedTag&&deflevel==0)){
							defattrs=attrs;
							if(!defattrs.base)defattrs.base=10;
							if(!defattrs.ifillchr)defattrs.ifillchr="";
							if(!defattrs.ffillchr)defattrs.ffillchr="";
							if(!defattrs.ifillchr)defattrs.Ifillchr="";
							if(!defattrs.ffillchr)defattrs.Ffillchr="";
							if(!defattrs.ffillchr)defattrs.Efillchr="";
							if(!defattrs.rfillchr)defattrs.rfillchr="";
							if(!defattrs.digits)defattrs.digits="";
							if(!defattrs.expression)defattrs.expression="";
							if(defattrs.expression!=""){
								if(defattrs.expression.substr(0,1)=="="){
									if(!inlineExpressions[defattrs.expression]){
										noOfInlineExpressions++;
										inlineExpressions[defattrs.expression]={};
										inlineExpressions[defattrs.expression].no=noOfInlineExpressions;
										inlineExpressions[defattrs.expression].name="_x_"+noOfInlineExpressions;
										expressions[inlineExpressions[defattrs.expression].name]=new i18xExpression(defattrs.expression.substr(1));
									};
								};
							};
						};
						if(((!isClosingTag&&!isClosedTag)&&deflevel==2)||(isClosedTag&&deflevel==1))lastdefattrs=attrs;
						if(isClosingTag||isClosedTag){
							if(deflevel>0){
								//console.log("definition="+definition+" name="+lastdefattrs.name);
								switch(lastdefattrs.type){
									case"format":
										formats["_local_"+lastdefattrs.name]=new i18xFormat(definition);
										break;
									case"expression":
										expressions["_local_"+lastdefattrs.name]=new i18xExpression(lastdefattrs.expression.substr(1));
										break;
									case"directions":
										break;
								};
							}else{
								this.name=defattrs['name'];
							};
						};
						doinsertvalue=false;
					};
					if(deflevel<=1){
						switch(tag){
							case"i18x":
								break;
							case"x":
								DefTagCodes("","x","",isClosedTag);
								break;
							case"xa":
								i_abs=true;
								DefTagCodes("","xa","",isClosedTag);
								break;
							case"weekday":
								DefTagCodes("localdate","d.getDay()","weekday",isClosedTag);
								break;
							case"day":
								DefTagCodes("localdate","d.getDate()","day",isClosedTag);
								break;
							case"month":
								DefTagCodes("localdate","d.getMonth()","month",isClosedTag);
								break;
							case"year":
								DefTagCodes("localdate","d.getFullYear()","year",isClosedTag);
								break;
							case"weekofyear":
								DefTagCodes("localdate","d.getWeekofYear()","weekofyear",isClosedTag);
								break;
							case"dayofyear":
								DefTagCodes("localdate","d.getDayofYear()","dayofyear",isClosedTag);
								break;
							case"hour":
								DefTagCodes("localdate","d.getHours()","hour",isClosedTag);
								break;
							case"minute":
								DefTagCodes("localdate","d.getMinutes()","minute",isClosedTag);
								break;
							case"second":
								DefTagCodes("localdate","d.getSeconds()","second",isClosedTag);
								break;
							case"millisecond":
								DefTagCodes("localdate","(d.getTime()-Math.floor(d.getTime()*1000))");
								break;
							case"summertimeoffset":
								break;
							case"timezoneoffset":
								DefTagCodes("localdate","d.getTimezoneOffset()");
								break;
							case"timezone":
								break;
							
							case"lt":
								returncodes[level].push('"'+"<".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"gt":
								returncodes[level].push('"'+">".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"br":
								returncodes[level].push('"'+"<br/>".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"newline":
								returncodes[level].push('"'+"\\n".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"slashnewline":
								returncodes[level].push('"'+"\\\\n".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"quote":
								returncodes[level].push('"'+'\\"'.repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"singlequote":
								returncodes[level].push('"'+"'".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"space":
								returncodes[level].push('"'+" ".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"amp":
								returncodes[level].push('"'+"&".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"nbsp":
								returncodes[level].push('"'+"&nbsp;".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							case"tab":
								returncodes[level].push('"'+"\\t".repeat(attrs.repeat==null?1:attrs.repeat)+'"');
								break;
							default:
								// handle numbering tags...
								switch(tag.charAt(0)){
									case"i":
										if(tag.length==1){
											i_full=true;
											DefTagCodes("","sif[0]","");
										}else{
											chrid=tag.substr(1).parseInt(10);
											//console.log(chrid);
											i_max=Math.max(i_max,chrid+1);
											if(chrid>=0)DefTagCodes("","i["+chrid+"]");
										};
										break;
									case"f":
										if(tag.length==1){
											f_full=true;
											DefTagCodes("","sif[1]");
										}else{
											chrid=tag.substr(1).parseInt(10);
											//console.log(chrid);
											f_max=Math.max(f_max,chrid+1);
											if(chrid>=0)DefTagCodes("","f["+chrid+"]");
										};
										break;
									case"E":
										if(tag.length==1){
											E_full=true;
											DefTagCodes("","see[1]","");
										}else{
											chrid=tag.substr(1).parseInt(10);
											//console.log(chrid);
											E_max=Math.max(E_max,chrid+1);
											if(chrid>=0)DefTagCodes("","E["+chrid+"]");
										};
										break;
									case"I":
										if(tag.length==1){
											I_full=true;
											DefTagCodes("","seif[0]","");
										}else{
											chrid=tag.substr(1).parseInt(10);
											//console.log(chrid);
											I_max=Math.max(I_max,chrid+1);
											if(chrid>=0)DefTagCodes("","I["+chrid+"]");
										};
										break;
									case"F":
										if(tag.length==1){
											F_full=true;
											DefTagCodes("","seif[1]");
										}else{
											chrid=tag.substr(1).parseInt(10);
											//console.log(chrid);
											F_max=Math.max(F_max,chrid+1);
											if(chrid>=0)DefTagCodes("","F["+chrid+"]");
										};
										break;
									case"r":
										if(tag.length==1){
											r_full=true;
											DefTagCodes("","sr");
										}else{
											chrid=tag.substr(1).parseInt(10);
											//console.log(chrid);
											r_max=Math.max(r_max,chrid+1);
											if(chrid>=0)DefTagCodes("","r["+chrid+"]");
										};
										break;
								};
								break;
						};
						for(attr in attrs){
							x=attrs[attr];
							switch(attr){
								case"digits":
									break;
								case"if":
									z=x.split("|");
									thisreturncodeconds=[];
									for(a=0;a<z.length;a++){
										y=parseInt(z[a],10);
										switch(z[a].charAt(z[a].length-1)){
											case'+':
												thisreturncodeconds.push(((tagexpressionname!="")?tagexpressionname+"("+tag+")":tag)+">"+y);
												break;
											case'-':
												thisreturncodeconds.push(((tagexpressionname!="")?tagexpressionname+"("+tag+")":tag)+"<"+y);
												break;
											case'=':
												thisreturncodeconds.push(((tagexpressionname!="")?tagexpressionname+"("+tag+")":tag)+"=="+y);
												break;
											case'~':
												thisreturncodeconds.push(((tagexpressionname!="")?tagexpressionname+"("+tag+")":tag)+"!="+y);
												break;
											default:
												thisreturncodeconds.push(((tagexpressionname!="")?tagexpressionname+"("+tag+")":tag)+"=="+y);
												break;
										};
										returncodeconds[level]=thisreturncodeconds.join("||");
									};
									break;
							};
						};
						//returncodes[level]+=value+func;
						//console.log("level function: "+returncodes[level]+" / "+txt+" / "+deflevel);
						if(txt!="")returncodes[level].push('"'+txt.chrrpl({'"':'/'})+'"');
						//console.log(returncodes[level]);
					};
				};
			};
			this.execSource="this.Exec=function(x){";
			dochrrpl=defattrs.digits!="";
			chrrpls=[];
			m=defattrs.digits.split("|");
			l=m.length;
			for(i=0;i<l;i++){
				n=m[i].split("=");
				chrrpls.push('"'+n[0]+'":"'+n[1]+'"');
			};
			chrrpls="{"+chrrpls.join(",")+"}";
			if(i_abs||i_max>0||f_max>0||f_full||i_full){
				vardefcodes.absvalue='xa=Math.abs(x)';
				vardefcodes.value='sif=xa.toString('+defattrs.base+')'+(dochrrpl?'.chrrpl('+chrrpls+')':'')+'.split(".").concat("")';
			};
			if(i_max>0)vardefcodes.integer="i=sif[0].split('').reverse().concat(["+FillArrayStr(i_max,defattrs.ifillchr)+"])";
			if(f_max>0)vardefcodes.fraction="f=sif[1].split('').concat(["+FillArrayStr(f_max,defattrs.ffillchr)+"])";
			if(I_max>0||F_max>0||E_max>0||F_full||I_full||E_full){
				vardefcodes.scvalueif='see=x.toExponential()'+(dochrrpl?'.chrrpl('+chrrpls+')':'')+'.split("e").concat("")';
				vardefcodes.scvaluee='seif=see[0]'+(dochrrpl?'.chrrpl('+chrrpls+')':'')+'.split(".").concat("")';
			};
			if(I_max>0)vardefcodes.scinteger="I=seif[0].split('').reverse().concat(["+FillArrayStr(I_max,defattrs.Ifillchr)+"])";
			if(F_max>0)vardefcodes.scfraction="F=seif[1].split('').concat(["+FillArrayStr(F_max,defattrs.Ffillchr)+"])";
			if(E_max>0)vardefcodes.scexponent="E=see[1].split('').reverse().concat(["+FillArrayStr(E_max,defattrs.Efillchr)+"])";
			if(r_max>0||r_full)vardefcodes.romanvalue='sr=x.toRomanString()'+(dochrrpl?'.chrrpl('+chrrpls+')':'');
			if(r_max>0)vardefcodes.roman="r=sr.split('').reverse().concat(["+FillArrayStr(r_max,defattrs.rfillchr)+"])";
			//statementscodes.push('console.log(x)');
			if(defattrs.expression!=""){
				if(defattrs.expression.substr(0,1)=="="){
					this.execSource+="x="+inlineExpressions[defattrs.expression].name+"(x);";
				}else{
					this.execSource+="x="+defattrs.expression+"(x);";
				};
			};
			this.execSource+=Obj_join("var ",vardefcodes,",",";");
			this.execSource+=statementscodes.join(";")+((statementscodes.length>0)?";":"");
			for(i in formats)this.execSource+=formats[i].execSource.str_replace("this.Exec=function","function "+i);
			for(i in expressions)this.execSource+=expressions[i].execSource.str_replace("this.Exec=function","function "+i);
			this.execSource+="try{return "+returncodes[level].join("+")+";}catch(err){return err.toString()};};";
			console.log("calculated function: "+this.name+"="+this.execSource);
			eval(this.execSource);
		}catch(err){
			this.Exec=function(_x){return "Error in i18x format definition ('"+this.name+"', "+err.toString()+").";};
			//console.log("i18x Error: "+_xml+"\n"+err);
		};
	};
	
	this.Parse(_xml);
};



// =============================================
// I18X MAIN OBJECT
// =============================================
var i18x=new i18x();
function i18x(){
	this.stdlid;
	this.lid;
	this.i18xs;
	this.i18xExpressions;
	this.i18xFormats;
	this.lastHorDir;
	this.lastVerDir;
	this.TRANSLATE=0,NO_TRANSLATE=1,TRANSLATE_WITH_PLACEHOLDERS=2,TRANSLATE_WITH_VALUES=3,NO_TRANSLATE_WITH_PLACEHOLDERS=4,NO_TRANSLATE_WITH_VALUES=5;

	this.CreateLid=function(_lid){
		this.lastHorDir="ltr";
		this.lastVerDir="ttb";
		this.i18xs[_lid]=new Object();
		this.i18xExpressions[_lid]=new Object();
		this.i18xFormats[_lid]=new Object();
	};
	
	this.Reset=function(){
		this.stdlid="en-US";
		this.lid=this.stdlid;
		this.i18xs=new Object();
		this.i18xExpressions=new Object();
		this.i18xFormats=new Object();
		this.CreateLid(this.lid);
	};

	this.BestLid=function(_wantedlid,_availablelids){
	var bestlids={"pt-PT":["es-ES","en-US"]};
	};
	
	this.UserLid=function(){
	var lid=-1;
		bl=GetParameter("lid","auto");
		if(bl=="auto")bl=GetCookie("lid","auto");
		if(bl=="auto"){
			if(IS_IE){
				bl=navigator.browserLanguage;
			}else{
				bl=navigator.language;
			};
		};
		for(l in LIDS)if(l==bl)lid=l;
		if(lid==-1)for(l in LIDS)if(bl.indexOf(l)>=0)lid=l;
		if(lid==-1)for(l in LIDS)if(l.indexOf(bl)>=0)lid=l;
		if(lid==-1)lid=Object.keys(LIDS)[0];
		return lid;
	};

	this.SetLid=function(_lid){
		this.lid=_lid;
	};
	
	this._LoadParse=function(_lid,_doClean){
	};
	
	this.LoadParse=function(_lid,_doClean){
	var txt,txts=this.i18xs[_lid],n={},t,r;
	//var a=new Date(),b;
		if(typeof(_doClean)=="undefined")_doClean=true;
		for(txt in txts){
			//console.log(_lid+"="+txt);
			t=txt.i18xKey();
			r=txts[txt].i18xKey()
			n[t]=_doClean?r:txts[txt];
			if(t.indexOf("<definition")>=0)this.Register(r,_lid);
		};
		this.i18xs[_lid]=n;
		//b=new Date();
		//console.log("i18x cleaning time: "+(b.getTime()-a.getTime()));
	};

	this._LoadLid=function(_lid,_doClean){
	var l,bl,Dated;
	var jsonajax=new XMLHttpRequest();
		if(typeof(_doClean)=="undefined")_doClean=true;

		this.CreateLid(_lid);
		
		d=new Date();
		jsonajax.open("GET","./i18x/"+_lid+".json?"+d.getTime(),false);
		jsonajax.i18x=this;
		jsonajax.lid=_lid;
		//jsonajax.callback=_callback;
		jsonajax.setRequestHeader("Content-Type","application/json");
		jsonajax.setRequestHeader("pragma","no-cache");
		jsonajax.setRequestHeader("Cache-Control","no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform");
		jsonajax.setRequestHeader("pragma","no-cache");
		jsonajax.setRequestHeader("Expires",0);
		jsonajax.onreadystatechange=function(){
		var cjsonajax,d;
			if(this.readyState==4){
				this.i18x.CreateLid(this.lid);
				this.i18x.SetLid(this.lid);
				if(this.status==200){
					this.i18x.i18xs[this.lid]=eval('('+this.responseText+')');
					if(CLIDS[this.lid]){
						cjsonajax=new XMLHttpRequest();
						d=new Date();
						cjsonajax.open("GET",CLIDS[this.lid]+"/"+CLIENT+"/"+this.lid+".json?"+d.getTime(),false);
						cjsonajax.i18x=this.i18x;
						cjsonajax.lid=this.lid;
						cjsonajax.setRequestHeader("Content-Type","application/json");
						cjsonajax.setRequestHeader("pragma","no-cache");
						cjsonajax.setRequestHeader("Cache-Control","no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform");
						cjsonajax.setRequestHeader("pragma","no-cache");
						cjsonajax.setRequestHeader("Expires",0);
						cjsonajax.onreadystatechange=function(){
							if(this.readyState==4){
								if(this.status==200){
									Object_addJSON(this.i18x.i18xs[this.lid],eval('('+this.responseText+')'));
								};
							};
							this.i18x.LoadParse(this.lid,_doClean);
						};
						cjsonajax.send(null);
					}else{
						this.i18x.LoadParse(this.lid,_doClean);
					};
				};
			};
		};
		jsonajax.send(null);
		return _lid;
	};

	this.LoadLid=function(_lid){
		this._LoadLid(_lid)
	};

	this.Load=function(_folder,_lid){
	// ADOBE EXTENDED SCRIPT
	var lid=(app.locale)?app.locale:app.isoLanguage,blid,f,folder=$.fileName.dirname();
		if(typeof(_lid)!="undefined")lid=_lid;
		if(typeof(_folder)!="undefined")folder=_folder;
		blid=lid.substring(0,2);
		f=new File(_folder+"/i18x/"+lid+".json");
		this.lid=lid;
		if(!f.exists){
			f=new File(_folder+"/i18x/"+blid+".json");
			this.lid=blid;
			if(!f.exists){
				//...
			};
		};
		
		if(f.exists){
			if(typeof(this.i18xs[this.lid])=="undefined")this.i18xs[this.lid]=new Object();
			Object_addJSON(this.i18xs[this.lid],eval("({"+f.getContents()+"})"));
		};
	};
	

	
	this.Register=function(_text,_lid,_nativetext){
		if(typeof(_lid)=="undefined")_lid=this.stdlid;
		if(!this.i18xs[_lid])this.CreateLid(_lid);
		if(_text.indexOf("<definition")>=0)this.Trans(_text,{},_lid);
		if(typeof(_nativetext)!="undefined")this.i18xs[_lid][_nativetext.i18xKey()]=_text.i18xKey();
		return _text.i18xKey();
	};

	this.Trans=function(_text,_placeholders,_lid,_type){
	var ret="",n,l,e,s,u,j,k,a,b,x,y,z,level=0,splits,parts,tag,doinsertvalue,value,attrs,attr,txts=[""],visibles=[true];
	var expr,frmt,txt,err,isClosingTag,isClosedTag,definition,defstart,deflevel=0,defattrs;
		if(typeof(_lid)=="undefined")_lid=this.lid;
		_text=_text.i18xKey();
		//console.log(_text);
		if(typeof(this.i18xs[_lid])=="object")if(typeof(this.i18xs[_lid][_text])=="string")_text=this.i18xs[_lid][_text];
		if(_placeholders==null)_placeholders={};
		if(_text){
			if(_text.indexOf("<")==-1)return _text;
			n=("<i18x>"+_text+"</i18x>").split("<");
			l=n.length;
			for(i=0;i<l;i++){
				doinsertvalue=false;
				e=n[i].indexOf(">");
				if(e==-1){
					// text node...
					//console.log("e==-1"+n[i]);
					txts[level]+=n[i];
				}else{
					// tag node...
					txt=n[i].substr(e+1);
					isClosingTag=n[i].charAt(0)=="/";
					isClosedTag=n[i].charAt(e-1)=="/";
					s=0;u=e;
					if(isClosedTag)u-=1;
					if(isClosingTag){s=1;u-=1;};
					
					// calculate tag and attributes...
					parts=n[i].substr(s,u).split('" ');
					splits=parts[0].split(" ");
					tag=splits[0];
					if(splits[1]){splits.shift();parts[0]=splits.join(" ");k=parts.length-1;parts[k]=parts[k].substr(0,parts[k].length-1);if(parts[k]=="")parts.pop();}else{parts=[];};
					k=parts.length;
					attrs=new Object;
					j=0;
					while(j<k){
						if(parts[j].indexOf('="')>=0){
							attr=parts[j].split('="');
							attrs[attr[0]]=attr[1];
							j++;
						}else{
							attrs[parts[j].substr(0,parts[j].length)]=parts[j+1];
							j+=2;
						};
					};
					k=attrs.length;
					//console.log("tag=");console.log(tag);console.log("attrs=");console.log(attrs);
					// ...now tag is set and attrs contains an object with key/value pairs of attributes of tag. 
							
					switch(typeof(_placeholders[tag])){
						case"undefined":
							value="";
							break;
						case"object":
							if(_placeholders[tag] instanceof Date)value=_placeholders[tag].getTime()/1000;
							break;
						default:
							value=_placeholders[tag];
					};
					if(isClosingTag){
						// ...is closing tag (</tag>).
						level--;
						txts[level]+=visibles[level+1]?txts[level+1]:"";
					}else if(isClosedTag){
						// ...is closed tag (<tag/>).
						doinsertvalue=true;
					}else{
						// ...is an open tag (<tag>).
						level++;
						txts[level]="";
						visibles[level]=true;
					};
					
					// process tag...
					switch(tag){
						case"i18x":
							break;
						case"definition":
							// collect only top level "definition"-tags (deflevel)...
							if(!isClosingTag&&!isClosedTag){
								visibles[level]=false;
								deflevel++;
								if(deflevel==1){
									defstart=i;
									definition="";
								};
							};
							if(isClosingTag){
								deflevel--;
								if(deflevel==0){
									definition=[];
									for(j=defstart;j<i;j++)definition.push(n[j]);
									defstart=n[i].indexOf(">");
									definition="<"+definition.join("<")+"<"+n[i].substr(0,defstart+1);
								};
							};
							if(isClosedTag){
								if(deflevel==0){
									defstart=n[i].indexOf(">");
									definition="<"+n[i].substr(0,defstart+1);
								};
							};
							if(((!isClosingTag&&!isClosedTag)&&deflevel==1)||(isClosedTag&&deflevel==0)){
								defattrs=attrs;
								if(!defattrs.base)defattrs.base=10;
								if(!defattrs.ifillchr)defattrs.ifillchr="";
								if(!defattrs.ffillchr)defattrs.ffillchr="";
								if(!defattrs.rfillchr)defattrs.rfillchr="";
								if(!defattrs.Ifillchr)defattrs.Ifillchr="";
								if(!defattrs.Ffillchr)defattrs.Ffillchr="";
								if(!defattrs.Efillchr)defattrs.Efillchr="";
								if(!defattrs.hordir)defattrs.hordir="ltr";
								if(!defattrs.verdir)defattrs.verdir="ttb";
							};
							if(isClosingTag||isClosedTag){
								if(deflevel==0){
									//console.log("definition text="+definition+" type="+defattrs['type']);
									switch(defattrs['type']){
										case"format":
											frmt=new i18xFormat(definition);
											if(this.i18xFormats[_lid]){
												if(!this.i18xFormats[_lid][frmt.name])this.i18xFormats[_lid][frmt.name]=frmt;
											}else{
												value="i18x Format Definition Error (Language not available).";
											};
											break;
										case"expression":
											expr=new i18xExpression(defattrs['expression'].substr(1));
											if(this.i18xExpressions[_lid]){
												if(!this.i18xExpressions[_lid][defattrs['name']])this.i18xExpressions[_lid][defattrs['name']]=expr;
											}else{
												value="i18x Expression Definition Error (Language not available).";
											};
											break;
										case"directions":
											this.lastHorDir=defattrs.hordir;
											this.lastVerDir=defattrs.verdir;
											break;
									};
								};
							};
							doinsertvalue=false;
							break;
						case"info":
							break;
						case"lid":
							break;
						case"app":
							// not implemented yet!
							break;
						case"lt":
							value="<";
							break;
						case"gt":
							value=">";
							break;
						case"br":
							value="<br/>";
							break;
						case"newline":
							value="\n";
							break;
						case"slashnewline":
							value="\\n";
							break;
						case"quote":
							value='"';
							break;
						case"singlequote":
							value="'";
							break;
						case"space":
							value=" ";
							break;
						case"amp":
							value="&";
							break;
						case"nbsp":
							value="&nbsp;";
							break;
						case"tab":
							value="\t";
							break;
					};
					// process attributes...
					// prefered attr orders: value,expression,if,format
					for(attr in attrs){
						//console.log("attr:"+attr+"="+attrs[attr]);
						x=attrs[attr];
						switch(attr){
							case"sense":
								break;
							case"value":
								value=x;
								break;
							case"repeat":
								value=value.repeat(x==null?1:x);
								break;
							case"default":
								if(_placeholders[tag]==null)value=x;
								break;
							case"format":
								try{
									value=this.i18xFormats[_lid][x].Exec(value);
								}catch(err){
									value="i18x format error:"+err.toString()+" ("+_lid+","+x+")\n";
								};
								break;
							case"enumeration":
								value=x.split("|")[value];
								break;
							case"charreplace":
								break;
							case"expression":
								try{
									if(x.substr(0,1)=="="){
										expr=new i18xExpression(x.substr(1,x.length-1));
										value=expr.Exec(value);
									}else{
										value=this.i18xExpressions[_lid][x].Exec(value);
										//console.log("expression eval="+x+"="+value);
									};
								}catch(err){
									value="i18x expression error:"+err.toString()+" ("+_lid+","+x+")\n";
								};
								break;
							case"if":
								v=parseInt(value);
								z=x.split("|");
								b=false;
								for(a=0;a<z.length;a++){
									y=parseInt(z[a],10);
									switch(z[a].charAt(z[a].length-1)){
										case'+':
											b|=v>y;
											break;
										case'-':
											b|=v<y;
											break;
										case'=':
											b|=v==y;
											break;
										case'~':
											b|=v!=y;
											break;
										default:
											b|=v==y;
											break;
									};
								};
								visibles[level]=b;
								break;
						};
					};
					//console.log("tag="+tag);
					//console.log("txt="+txt);
					//console.log("value="+value);
					//console.log("deflevel="+deflevel);
					txts[level]+=(doinsertvalue?value:"")+txt;
					//console.log("level="+level+":"+txts[level]);
					
				};
			};
		};
		return txts[level];
	};
	
	this.ParseText=function(_text){
	var t=new Array(),r,i,l,s;
		s=/i18x\.Trans\s*\(\"([^\"]*)\"\s*(,|\))/g;
		while(r=s.exec(_text))t.push(r[1]);
		s=/i18x\.Trans\s*\(\'([^\']*)\'\s*(,|\))/g;
		while(r=s.exec(_text))t.push(r[1]);
		s=/i18x\.Register\s*\(\"([^\"]*)\"\s*(,|\))/g;
		while(r=s.exec(_text))t.push(r[1]);
		s=/i18x\.Register\s*\(\'([^\']*)\'\s*(,|\))/g;
		while(r=s.exec(_text))t.push(r[1]);
		s=/\"([^\"]*)\"\.i18xRegister/g;
		while(r=s.exec(_text))t.push(r[1]);
		s=/\'([^\']*)\'\.i18xRegister/g;
		while(r=s.exec(_text))t.push(r[1]);
		s=/\"([^\"]*)\"\.i18xTrans/g;
		while(r=s.exec(_text))t.push(r[1]);
		s=/\'([^\']*)\'\.i18xTrans/g;
		while(r=s.exec(_text))t.push(r[1]);
		l=t.length;
		for(i=0;i<l;i++)t[i]=t[i].replace(/\\\r\n/g,"\n").replace(/\\\r/g,"\n").replace(/\\\n/g,"\n");
		for(i=0;i<l;i++)t[i]=t[i].leftAlign().trim();
		//for(i=0;i<l;i++)console.log(t[i].i18xKey());
		return t;
	};

	this.ParseFile=function(_url,_lid){
	var txt,txtajax=new XMLHttpRequest(),phrases,lx,ls,ret=new Object(),cp,d=new Date(),u=_url.split("?");
		this._LoadLid(this.stdlid,false);
		this._LoadLid(_lid,false);
		if(u.length==1)u[1]="";
		u[1]+="preventcache="+d.getTime();
		u=u.join("?");
		txtajax.open("GET",u,false);
		console.log(_url);
		txtajax.i18x=this;
		txtajax.setRequestHeader("Content-Type","text/plain");
		txtajax.setRequestHeader("pragma","no-cache");
		txtajax.setRequestHeader("Cache-Control","no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform");
		txtajax.setRequestHeader("pragma","no-cache");
		txtajax.setRequestHeader("Expires",0);
		txtajax.onreadystatechange=function(){
			if(this.readyState==4){
				if(this.status==200||this.status==0){
					txt=this.responseText;
				};
			};
		};
		txtajax.send(null);
		phrases=this.ParseText(txt);
		lx=this.i18xs[_lid];
		ls=this.i18xs[this.stdlid];
		lp=phrases.length;
		for(i=0;i<lp;i++){
			cp=phrases[i].i18xKey();
			//console.log(cp);
			if(lx[cp]!=null){
				ret[phrases[i]]=lx[cp];
			}else{
				if(_lid!=this.stdlid)ret[phrases[i]]='<info state="untranslated"/>'+"\n"+((ls[cp]==null)?phrases[i]:ls[cp]);
			};
		};
		return ret;
	};
	
	this.ParseFiles=function(_urls,_lids){
	var u,lu=_urls.length,l,ll=_lids.length,ret={};
		for(l=0;l<ll;l++){
			this._LoadLid(_lids[l]);
			ret[_lids[l]]={};
			for(u=0;u<l;u++){
				ret[_lids[l]][_urls[i]]=this.ParseFile(_urls[u],_lids[l]);
			};
		};
		return ret;
	};
	
	this.SetValues=function(_text,_placeholders){
	};
	this.ResetValues=function(_text){
	};
	
	//this.Load();
	this.Reset();
}

// =============================================
// DATE PROTOTYPES
// =============================================
Date.prototype.format=function(_format,_lid){
var e;
	if(!_lid)_lid=i18x.lid;
	try{return i18x.i18xFormats[_lid][_format].Exec(this.getTime()/1000);}catch(e){return "i18x format error :"+this.toString();};
}
Date.prototype.setTimestamp=function(_unixtimestamp){
	return this.setTime(_unixtimestamp*1000);
};
Date.prototype.getTimestamp=function(){
	return Math.floor(Date.UTC(this.getFullYear(),this.getMonth(),this.getDate(),this.getHours(),this.getMinutes(),this.getSeconds())/1000);
};

function NOW(){
	return Math.round(new Date().getTime()/1000);
}

// ==========================================================
// MODULES
// ==========================================================
function GetModuleScript(_mod){
var fn="";fn1=LIBSCRIPTFOLDER+'/../jsxlibs/'+_mod+'.jsxinc';
var ret,f=null,f1=new File(fn1),f2=new File(fn1+'bin');
	if(typeof("DWLIB_"+_mod)=='boolean')return"";
	if(f1.exists)f=f1;
	if(f2.exists)f=f2;
	if(f!=null){
		f.open('r');
		ret=f.read();
		f.close();
		return ret;
	}else{
		return "";
	}
}


// ==========================================================
// APP SETTINGS
// ==========================================================
function GetSetting(_section,_key,_defvalue){
var ret=_defvalue;
	if(app.name=="Adobe Photoshop"){
		var f=new File(Folder.userData+"/"+_section+".dat");
		var data=f.getContents();
		if(data===false)return ret;
		var settings=JSON.parse(data);
		if(!settings[_key])return ret;
		return settings[_key];
	}else{
		if(app.settings.haveSetting(_section,_key))ret=app.settings.getSetting(_section,_key);
	}
	return ret;
}
function SetSetting(_section,_key,_value){
	if(app.name=="Adobe Photoshop"){
		var f=new File(Folder.userData+"/"+_section+".dat");
		var settings,data=f.getContents();
		if(data===false){
			settings=new Object();
		}else{
			settings=JSON.parse(data);
		}
		settings[_key]=_value;
		f.putContents(JSON.stringify(settings));
	}else{
		app.settings.saveSetting(_section,_key,_value);
	}
}

function GetBooleanSetting(_section,_key,_defvalue){
	return GetSetting(_section,_key,_defvalue?'true':'false')=='true';
}

// ==========================================================
// GUI PROTOTYPES
// ==========================================================
DropDownList.prototype.replace=function(_rplary){
var i;
	for(i=this.items.length-1;i>=0;i--)this.remove(this.items[i]);
	for(i=0;i<_rplary.length;i++)this.add("item",_rplary[i],i);
}

// =============================================
// AFTER EFFECTS GENERALS
// =============================================
function GetCurrentAfterEffetsRenderTemplates(){
var testcomp=app.project.items.addComp("template_check_comp",640,400,1.0,1,25);
var testri=app.project.renderQueue.items.add(testcomp);
var r,o,t,z;
var curRenderTemplates=new Array();
	for(r=1;r<=app.project.renderQueue.numItems;r++){
		for(o=1;o<=app.project.renderQueue.item(r).numOutputModules;o++){
			for(t=1;t<=app.project.renderQueue.item(r).outputModule(o).templates.length;t++){
				z=app.project.renderQueue.item(r).outputModule(o).templates[t];
				if(typeof(z)!="undefined"){
					if(z.trim()!=""){
						if(z.substr(0,1)!="_"){
							if(!curRenderTemplates.in_array(z))curRenderTemplates[curRenderTemplates.length]=app.project.renderQueue.item(r).outputModule(o).templates[t];
						}
					}
				}
			}
		}
	}
	testcomp.remove();
	return curRenderTemplates;
}


// =============================================
// EXTENDED SCRIPT DEBUGGING
// =============================================
function GetAllProperties(f){
	var props = f.reflect.properties;
	var array = [];
	for (var i = 0; i < props.length; i++)
	try {array.push (props[i].name + ": " + f[props[i].name])} catch (e){};
	array.sort ();
	return f.reflect.name+"\nProperties:\n"+array.join (" -- ");
}
function GetAllMethodes(m){
	var props = m.reflect.methods.sort();
	for (var i = 0; i < props.length; i++)
	return "\nMethods:\n"+props[i].name;
}

function _dbgtype(_o){
var o=typeof(_o);
	if(o=="object"){
		if(_o instanceof Array)return "array";
	};
	return o;
}

function dbgobj(_o,_name){
var h="",i,l,o,j;
	switch(_dbgtype(_o)){
		case"object":
			for(i in _o){
				switch(_dbgtype(_o[i])){
					case"object":
						h+=i+"="+dbgobj(_o[i],i)+">\n";
						break;
					case"array":
						l=_o[i].length;
						for(j=0;j<l;j++){
							if(_o[i][j]==null){
								h+="<"+i+"/>\n";
							}else{
								h+=i+"="+dbgobj(_o[i][j],i)+"\n";
							};
						};
						break;
					default:
						if(_o[i]==""){
							h+=i+"=\n";
						}else{
							h+=i+"="+_o[i]+"\n";
						};
						break;
				};
			};
			break;
		case"array":
			l=_o.length;
			for(i=0;i<l;i++){
				switch(_dbgtype(_o[i][1])){
					case"object":
						if(_o[i][1]==null){
							h+=_o[i][0]+"=\n";
						}else{
							h+=_o[i][0]+"="+_o[i][1]+"\n";
						};
						break;
					default:
						if(_o[i][1]==""){
							h+=_o[i][0]+"=\n";
						}else{
							h+=_o[i][0]+"="+_o[i][1]+"=\n";
						};
						break;
				};
			};
			break;
		default:
			if(_o==""){
				h+=_name+"=\n";
			}else{
				h+=_name+"="+_o+"\n";
			};
			break;
	};
	return h;
}

function dbg(_txt){
	if(DODEBUG)$.writeln(_txt);	
	//if(BridgeTalk.appName=="aftereffects")writeLn(_txt);	
}
function info(_txt){
	if(BridgeTalk.appName=="aftereffects")writeLn(_txt);	
}

// =============================================
// PROGRESS BAR
// =============================================
var lastProBarWin=null;

function DWProgressBar(_title,_text,_maxvalue,_shit){
	this.shit=_shit;
	this.maxvalue=_maxvalue;
	this.title=_title;
	this.text=_text;
	this.isCancelled=false;
	this.win=null;
}
function CloseLastProBarWindow(){
	if(lastProBarWin!=null)lastProBarWin.close();
	lastProBarWin=null;
}
DWProgressBar.prototype.setMaxValue=function(_maxvalue){
	if(!this.shit)return;
	this.maxvalue=_maxvalue;
	if(this.win!=null)this.win.progBar.maxvalue=_maxvalue;
}
DWProgressBar.prototype.start=function(){
	info(this.title);
	info(this.text);
	if(!this.shit)return;
	var win=new Window("palette",this.title,[150,150,600,300]); 
	lastProBarWin=win;
	win.probar=this;
	win.onClose=function(){
		this.probar.isCancelled=true;
	};
	win.progBarLabel=win.add("statictext",[20,20,320,35],this.text);
	win.progBar=win.add("progressbar",[20,35,410,60],0,this.maxvalue);
	win.cancelButton=win.add("button",[310,110,410,140],"Cancel");
	win.cancelButton.probar=this;
	win.cancelButton.onClick=function(){
		this.probar.isCancelled=true;
	};
	win.show();
	this.win=win;
}
DWProgressBar.prototype.done=function(_text){
	info(_text);
	if(!this.shit)return;
	this.win.progBarLabel.text=_text;
	if(this.win.progBar.value<this.win.progBar.maxvalue)this.win.progBar.value++;
	this.win.update();
	//alert(this.win.progBar.value+"*"+this.win.progBar.minvalue+"*"+this.win.progBar.maxvalue);
	
	if(this.shit){
		var tt=new Window("window","",[1,1,1,1],{borderless:true});
		tt.opacity=0.0;
		tt.show();
		tt.close();
	};
}
DWProgressBar.prototype.stop=function(){
	info(i18x.Trans("Ready!"));
	if(!this.shit)return;
	this.win.close();
	lastProBarWin=null;
}


// =============================================
// PROJECT ITEMS (AFTER EFFECTS)
// =============================================
function RemoveFromProjectByName(_name){
	for(var i=1;i<=app.project.numItems;i++){
		if(app.project.item(i).name==_name){
			app.project.item(i).remove();
			break;
		}
	}
}
function RemoveCompFromProject(_comp){
	for(var i=1;i<=app.project.numItems;i++){
		if(app.project.item(i)==_comp){
			app.project.item(i).remove();
			break;
		}
	}
}

function TopFolderNameExistsInProject(_name){
	for(var i=1;i<=app.project.numItems;i++)if(app.project.item(i) instanceof FolderItem)if(app.project.item(i).parentFolder==app.project.rootFolder)if(app.project.item(i).name==_name)return true;
	return false;
}
function GetTopFolderNameInProjectByName(_name){
	for(var i=1;i<=app.project.numItems;i++)if(app.project.item(i) instanceof FolderItem)if(app.project.item(i).parentFolder==app.project.rootFolder)if(app.project.item(i).name==_name)return app.project.item(i);
	return null;
}
function GetCompositionByName(_name){
	for(var i=1;i<=app.project.numItems;i++)if(app.project.item(i) instanceof CompItem)if(app.project.item(i).name==_name)return app.project.item(i);
	return null;
}

// =============================================
// GEOMETRIC FUNCTIONS
// =============================================
function PointInPolygon(_x,_y,_p){
var i,polySides=_p.length,j=polySides-1,oddNodes=false;
	for(i=0;i<polySides;i++){
		if((_p[i][1]<_y && _p[j][1]>=_y) ||  (_p[j][1]<_y && _p[i][1]>=_y)){
			if(_p[i][0]+(_y-_p[i][1])/(_p[j][1]-_p[i][1])*(_p[j][0]-_p[i][0])<_x){
				oddNodes=!oddNodes;
			}
		}
		j=i;
	}
	return oddNodes;
}

function PolygonInPolygon(_p1,_p2){
var i;
	for(i=0;i<4;i++)if(!PointInPolygon(_p1[i][0],_p1[i][1],_p2))return false;
	return true;
}

function PolygonEqualPolygon(_p1,_p2){
var i;
	for(i=0;i<4;i++)if(_p1[i][0]!=_p2[i][0]||_p1[i][1]!=_p2[i][1])return false;
	return true;
}

function Polygon2Str(_p){
	return "lefttop:"+_p[0][0]+","+_p[0][1]+" righttop:"+_p[1][0]+","+_p[1][1]+" leftbottom:"+_p[2][0]+","+_p[2][1]+" rightbottom:"+_p[3][0]+","+_p[3][1];
}

// =============================================
// RENDER QUEUE ITEMS (AFTER EFFECTS)
// =============================================
function RemoveFromRenderQueue(_renderQueueItem){
	for(var i=1;i<=app.project.renderQueue.numItems;i++){
		if(app.project.renderQueue.item(i)==_renderQueueItem){
			app.project.renderQueue.item(i).remove();
			break;
		}
	}
}

// =============================================
// EXECUTION UTILS
// =============================================
function ExecOnWindows(_bathcmds){
	if(IS_WINDOWS){
		//alert("cmd.exe /c "+_bathcmds.str_replace('"','\\"'));
		system.callSystem(_bathcmds);
	}else{
		alert("Sorry, this function is only available at Windows.");
	}
}
function WindowStart(_bathcmds){
	ExecOnWindows("cmd.exe /c "+_bathcmds.str_replace('"','\\"'));
}

function ExecutePhotoshop(_script,_js,_modules){
		ps=new File(LIBSCRIPTFOLDER+"/"+_script+".jsx"),
		runid=_script+Date.UTC(),runidfile=new File(Folder.temp.absoluteURI+"/"+runid),
		m,mods="",
		scriptfile=new File(Folder.temp.absoluteURI+"/"+runid+".jsx");
	// create a script including pic data which have to be resized and saved to resource folder...
	_js="var runidfile=new File(\""+Folder.temp.absoluteURI+"/"+runid+"\");\n"+_js;
	
	for(m in _modules)if(typeof(_modules[m])=="string")mods+=GetModuleScript(_modules[m]);
	
	
	runidfile.open("w");
	runidfile.write("running");
	runidfile.close();

	ps.open("r");
	_js=mods+ps.read().str_replace("// $$$ filling up by calling script... $$$",_js);
	ps.close();
	
	scriptfile.open("w");
	scriptfile.write(_js);
	scriptfile.close();
	
	photoshop.executeScript("$.evalFile(new File('"+scriptfile.absoluteURI+"'),60*60*1000);");
	while(runidfile.exists){$.sleep(1000)};
	scriptfile.remove();
}

function ShowInBrowser(_url){
var f;
	f=new File(Folder.temp+"/browser.url");
	f.putContents('[InternetShortcut]\nURL='+_url);
	f.execute();
}



//alert("Load".i18xTrans());
//f=new File("/e/Projects/adobe_scripts/µCSS/µCSS.jsx");
//alert(i18x.ParseText(f.getContents()).join("\n")); 

