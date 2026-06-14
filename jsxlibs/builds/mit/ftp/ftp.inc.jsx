// DW FTP Lib
// ©2013-2014 Dongleware Verlags GmbH
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

function FTPFile(_ftp,_path,_name,_modified,_size){
	this.ftp=_ftp;
	this.path=_path;
	this.name=_name;
	this.fullName=_path+"/"+_name;
	this.modified=_modified;
	this.size=_size;

	this.Receive=function(){
		this.ftp.ReceiveFTPFile(this.fullName);
	};
	
	this.Delete=function(){
		this.ftp.DeleteFTPFile(this.fullName);
	};
};

function FTPFolder(_ftp,_path,_name,_modified){
	this.ftp=_ftp;
	this.path=_path;
	this.name=_name;
	this.fullName=_path+"/"+_name;
	this.modified=_modified;
	
	this.Delete=function(){
		this.ftp.DeleteFTPFolderContent(this.fullName,);
	};
};

function FTP(_host,_port,_user,_pswd){
	this.host=_host;
	this.port=_port;
	this.user=_user;
	this.pswd=_pswd;
	this.socket=null;
	this.curDir="";
	this._socket=null;
	this.feat=new Object();
	this.doLog=false;
	
	this.ERR_NONE=0;
	this.ERR_UNKNOWN_USER=1;
	this.ERR_WRONG_PWD=2;
	this.ERR_NO_SERVER_CONNECTION=3;
	this.ERR_NO_SERVER_RESPONSE=4;
	this.ERR_NO_SOCKET=5;
	this.ERR_LOCAL_FILE_NOT_EXITS=6;
	this.ERR_UNKNOWN_ERROR=7;
	this.ERR_UNSUPPORTED_SERVERTYPE=8;
	this.ERR_SOCKET_ALREADY_SET=9;
	this.ERR_SECURITY_FOLDER_CANCEL=10;
	this.ERR_INVALID_PATH=11;
	this.ERR_NOT_ALLOWED_TO_SEND=12;
	

	// ===============================
	// INTERNAL METHODS
	// ===============================

	this.log=function(_txt){
		if(this.doLog)$.writeln(_txt);
	};

	this.writeln=function(_data){
		this.log("writeln:"+_data);
		this.socket.writeln(_data);
	};
	this.write=function(_data){
		this.log("write:"+_data);
		this.socket.write(_data);
	};
	this.readln=function(){
	var data=this.socket.readln();
		this.log("readln:"+data);
		return data;
	};
	this.read=function(_no){
	var data=this.socket.read(_no);
		this.log("readln:"+data);
		return data;
	};
	this._writeln=function(_data){
		this.log("_writeln:"+_data);
		this._socket.writeln(_data);
	};
	this._write=function(_data){
		this.log("_write:"+_data);
		this._socket.write(_data);
	};
	this._readln=function(){
	var data=this._socket.readln();
		this.log("_readln:"+data);
		return data;
	};
	this._read=function(_no){
	var data=this._socket.read(_no);
		this.log("_readln:"+data);
		return data;
	};
	
	this.openpassive=function(_binary){
	var r,ip;
		if(typeof(_binary)=="undefined")_binary=false;
		if(this._socket!=null)return this.ERR_NO_SOCKET;
		this.writeln("PASV");
		r=this.readln();
		this.log("PASV="+r);
		if(parseInt(r,10)==227){
			ip=r.match(/\(([0-9,]*)\)/)[1].split(",");
			this._socket=new Socket();
			if(this._socket.open(ip[0]+"."+ip[1]+"."+ip[2]+"."+ip[3]+":"+(parseInt(ip[4],10)*256+parseInt(ip[5],10)))){
				if(_binary)this._socket.encoding="BINARY";
			}else{
				this._socket=null;
				this.log(this.Err2Str(this.ERR_NO_SOCKET,i18x.Trans("Error:")));
				return this.ERR_NO_SOCKET;
			};
		};
	};
	this.closepassive=function(){
		if(this._socket==null)return this.ERR_NO_SOCKET;
		this._socket.close();
		this._socket=null;
	};
	
	this._errorquit=function(_err){
		this.socket.close();
		this.socket=null;
		return _err;
	};
	
	this.cd=function(_dir){
	var r;
		if(this.curDir==_dir)return true;
		this.writeln("CWD "+_dir);
		return this.readln().parseInt()==250;
	};
	
	this.mkdir=function(_dir){
		this.writeln("MKD "+_dir);
		return this.readln().parseInt()==250;
	};
	
	this.rmdir=function(_dir){
		this.writeln("RMD "+_dir);
		return this.readln().parseInt()==250;
	};

	this.del=function(_filename){
		this.writeln("DELE "+_filename);
		return this.readln().parseInt()==250;
	};

	
	this.list=function(_dir){
	var r;
		if(this.openpassive()!=this.ERR_NONE){
			this.writeln("LIST "+_dir);
			
			do{r=this._readln();}while(!this._socket.eof);
			//return (r.indexOf("250 ")==0);
			this.closepassive();
		}else{
			return this.ERR_NO_SOCKET;
		};
	}
	
	this.mlsd=function(_dir){
	var d=new Object,de,t,s,i;
		if(this.openpassive()!=this.ERR_NONE){
			this.writeln("MLSD "+_dir);
			if(parseInt(this.readln(),10)==150){
				while(!this._socket.eof){
					t=this._readln().split(";");
					de=new Object();
					for(i=0;i<t.length;i++){
						s=t[i].split("=");
						switch(s[0]){
						case"type":
							de.type=s[1];
							break;
						case"modify":
							de.modified=new Date();
							with(de.modified){
								setUTCFullYear(parseInt(s[1].substr(0,4),10));
								setUTCMonth(parseInt(s[1].substr(4,2),10)-1);
								setUTCDate(parseInt(s[1].substr(6,2),10));
								setUTCHours(parseInt(s[1].substr(8,2),10));
								setUTCMinutes(parseInt(s[1].substr(10,2),10));
								setUTCSeconds(parseInt(s[1].substr(12,2),10));
							};
							break;
						case"size":
							de.size=parseInt(s[1],10);
							break;
						default:
							de.name=s[0].substr(1);
						};
					};
					de.path=_dir;
					if(de.type=="file")d[de.name]=new FTPFile(this,de.path,de.name,de.modified,de.size);
					if(de.type=="dir")d[de.name]=new FTPFolder(this,de.path,de.name,de.modified);
					this.log("File: "+de.name+","+de.modified.toString()+","+de.type+","+de.size);
				};
				this.closepassive();
				if(parseInt(this.readln(),10)==226){
					return d;
				}else{
					return this.ERR_UNKNOWN_ERROR;
				};
			}else{
				this.closepassive();
				return this.ERR_UNKNOWN_ERROR;
			};
		}else{
			return this.ERR_NO_SOCKET;
		};
	}
	
	this.get=function(_filePathName,_dirPathName){
	var r,f=new File(_filePathName);
		$.writeln(_filePathName);
		if(this.openpassive(true)!=this.ERR_NONE){
			this.writeln("RETR "+_dirPathName);
			r=parseInt(this.readln(),10);
			if(r!=125&&r!=150){
				this.closepassive();
				return this.ERR_NOT_ALLOWED_TO_SEND;
			}else{
				f.open("w");
				f.encoding="BINARY";
				while(!this._socket.eof)f.write(this._read());
				f.close();
				this.closepassive();
				return (parseInt(this.readln(),10)==226)?this.ERR_NONE:this.ERR_UNKNOWN_ERROR;
			};
		}else{
			return this.ERR_LOCAL_FILE_NOT_EXITS;
		};
	}
	
	this.put=function(_filePathName,_dirPathName){
	var w,r,f=new File(_filePathName);
		if(f.exists){
			if(this.openpassive(true)!=this.ERR_NONE){
				this.writeln("STOR "+_dirPathName.basename());
				r=parseInt(this.readln(),10);
				if(r!=125&&r!=150){
					this.closepassive();
					return this.ERR_NOT_ALLOWED_TO_SEND;
				}else{
					f.open("r");
					f.encoding="BINARY";
					this._write(f.read());
					f.close();
					this.closepassive();
					return (parseInt(this.readln(),10)==226)?this.ERR_NONE:this.ERR_UNKNOWN_ERROR;
				};
			}else{
				return this.ERR_NO_SOCKET;
			};
		}else{
			return this.ERR_LOCAL_FILE_NOT_EXITS;
		};
	}
	
	this.pwd=function(){
	var dir=false,r,ls,rs;
		this.writeln("PWD");
		r=this.readln();
		if(parseInt(r,10)==257)this.curDir=r.match(/"(.*)"/)[1];
		this.log(i18x.Trans("Current dir:")+" "+this.curDir);
		return dir;
	}

	this.feat=function(){
	var r;
		this.writeln("FEAT");
		do{
			r=this.readln();
			//if(isNaN(parseInt(r,10)))this.log("Feature: "+r.trim());
			if(isNaN(parseInt(r,10)))this.feat[r.trim()]=true;
		}while(r!="211 End");
		
		return parseInt(r,10)==211;
	}
	
	this.connect=function(){
	var r;
		this.log(i18x.Trans("FTP connection to <server/>...",{server:this.host+":"+this.port}));
		if(this.socket!=null){
			this.log(this.Err2Str(this.ERR_SOCKET_ALREADY_SET,i18x.Trans("Error:")));
			return this.ERR_SOCKET_ALREADY_SET;
		};
		this.socket=new Socket();
		if(this.socket.open(this.host+":"+this.port)){
			r=this.readln();
			if(parseInt(r,10)!=220)return this._errorquit(this.ERR_NO_SERVER_RESPONSE);
			this.writeln("USER "+this.user);
			while(parseInt(r,10)==220)r=this.readln();
			if(parseInt(r,10)!=331)return this._errorquit(this.ERR_UNKNOWN_USER);
			this.writeln("PASS "+this.pswd);
			if(parseInt(this.readln(),10)!=230)return this._errorquit(this.ERR_WRONG_PWD);
			this.feat();
			if(!this.feat.MLSD){
				this.log(this.Err2Str(ERR_UNSUPPORTED_SERVERTYPE,i18x.Trans("Error:")));
				return this.ERR_UNSUPPORTED_SERVERTYPE;
			};
			this.pwd();
			this.log(i18x.Trans("Login ok."));
			return this.ERR_NONE;
		}else{
			this.log(this.Err2Str(ERR_NO_SERVER_CONNECTION,i18x.Trans("Error:")));
			return this.ERR_NO_SERVER_CONNECTION;;
		};
	};
	
	this.disconnect=function(){
		if(this._socket!=null){
			this.log("Error: Socket not available.");
			return this.ERR_NO_SOCKET;
		};
		this.writeln("QUIT");
		this.readln();
		this.socket.close();
		this.socket=null;
		this.log(i18x.Trans("Disconnect."));
		return this.ERR_NONE;
	};
	
	// ===============================
	// EXTERNAL METHODS
	// ===============================
	this.Err2Str=function(_err,_prefix,_info){
		if(typeof(_prefix)=="undefined")_prefix="";
		if(typeof(_info)=="undefined")_info="";
		switch(_err){
		case this.ERR_NONE:return i18x.Trans("<prefix/>No error.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_UNKNOWN_USER:return i18x.Trans("<prefix/>Unkown user.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_WRONG_PWD:return i18x.Trans("<prefix/>Wrong password.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_NO_SERVER_CONNECTION:return i18x.Trans("<prefix/>No server connection.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_NO_SERVER_RESPONSE:return i18x.Trans("<prefix/>No server response.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_NO_SOCKET:return i18x.Trans("<prefix/>No socket.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_LOCAL_FILE_NOT_EXITS:return i18x.Trans("<prefix/>Local file does not exist.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_UNKNOWN_ERROR:return i18x.Trans("<prefix/>nkown error.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_UNSUPPORTED_SERVERTYPE:return i18x.Trans("<prefix/>Unsupported server type.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_SOCKET_ALREADY_SET:return i18x.Trans("<prefix/>Socket already set.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_SECURITY_FOLDER_CANCEL:return i18x.Trans("<prefix/>Invalid access to security folder.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_INVALID_PATH:return i18x.Trans("<prefix/>Invalid path.<info/>",{prefix:_prefix,info:_info});
		case this.ERR_NOT_ALLOWED_TO_SEND:return i18x.Trans("<prefix/>Not allowed to send.<info/>",{prefix:_prefix,info:_info});
		};
	};
	
	this.ToString=function(){
		return i18x.Trans("FTP connection to <ip/>:<port/>, user '<user/>'."+{ip:this.host,port:this.port,user:this.user});
	};
	
	this.Connect=function(){
		return this.connect();
	};
	
	this.Disconnect=function(){
		return this.disconnect();
	};
	
	this.GetFTPFolderContentInfo=function(_ftpFolderPathName){
		return this.mlsd(_ftpFolderPathName);
	};
	
	this.CreateFTPFolder=function(_ftpFolderPathName){
		$.writeln("CreateFTPFolder="+_ftpFolderPathName);
		if(_ftpFolderPathName=="")return this.ERR_INVALID_PATH;
		if(this.curDir!=_ftpFolderPathName.dirname())this.cd(_ftpFolderPathName.dirname());
		if(this.curDir==_ftpFolderPathName.dirname())return this.mkdir(_ftpFolderPathName);
		this.CreateFTPFolder(_ftpFolderPathName.dirname());
		return this.mkdir(_ftpFolderPathName);
	};
	
	this.DeleteFTPFolderContent=function(_ftpFolderPathName,_removeself,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
		if(typeof(_removeself)=="undefined")_removeself=false;
		if(typeof(_recursive)=="undefined")_recursive=true;
		if(typeof(_doFilePattern)=="undefined")_doNotFolderPattern=/.*/;
		if(typeof(_doNotFilePattern)=="undefined")_doNotFolderPattern=/^$/;
		if(typeof(_doFolderPattern)=="undefined")_doNotFolderPattern=/.*/;
		if(typeof(_doNotFolderPattern)=="undefined")_doNotFolderPattern=/^$/;
		var f,ftpContentInfo=this.GetFTPFolderContentInfo(_ftpFolderPathName);
			for(f in ftpContentInfo){
				if((ftpContentInfo[f] instanceof FTPFile)&&_doFilePattern.test(f)&&!_doNotFilePattern.test(f)){
					ftpContentInfo[f].Delete();
				}else if((ftpContentInfo[f] instanceof FTPFolder)&&_recursive&&_doFolderPattern.test(f)&&!_doNotFolderPattern.test(f)){
					DeleteFTPFolderContent(f,_removeself,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern);
				};
			};
			if(_removeself)this.rmdir(_ftpFolderPathName);
		return this.ERR_NONE;
	};
	
	this.DeleteFTPFile=function(_ftpFilePathName){
		return this.del(_ftpFolderPathName);
	};
	
	this.SendLocalFile=function(_localFilePathName,_ftpFilePathName){
		if(this.curDir!=_ftpFilePathName.dirname())this.cd(_ftpFilePathName.dirname());
		return this.put(_localFilePathName,_ftpFilePathName);
	};
	
	this.ReceiveFTPFile=function(_ftpFilePathName,_localFilePathName){
		if(this.curDir!=_ftpFilePathName.dirname())this.cd(_ftpFilePathName.dirname());
		return this.get(_localFilePathName,_ftpFilePathName);
	};
	
	this.SyncFTPFolder=function(_ftpFolderPathName,_localFolderPathName,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
	var f,ftpFolderContentInfo,localFolderContentInfo,localFolder=new Folder(_localFolderPathName);
		if(typeof(_recursive)=="undefined")_recursive=true;
		if(typeof(_doFilePattern)=="undefined")_doFilePattern=/.*/;
		if(typeof(_doNotFilePattern)=="undefined")_doNotFilePattern=/^$/;
		if(typeof(_doFolderPattern)=="undefined")_doFolderPattern=/.*/;
		if(typeof(_doNotFolderPattern)=="undefined")_doNotFolderPattern=/^$/;
		localFolderContentInfo=localFolder.getContentInfo(false);
		this.CreateFTPFolder(_ftpFolderPathName);
		ftpFolderContentInfo=this.GetFTPFolderContentInfo(_ftpFolderPathName);
		
		// send files...
		for(f in localFolderContentInfo){
			if(localFolderContentInfo[f] instanceof File){
				if(_doFilePattern.test(f)&&!_doNotFilePattern.test(f)){
					if(ftpFolderContentInfo[f] instanceof FTPFolder){
						// remove ftp folder because same name exists in local as file...
						ftpFolderContentInfo[f].Delete();
						delete ftpFolderContentInfo[f];
					};
					if((typeof(ftpFolderContentInfo[f])=="undefined")||(ftpFolderContentInfo[f].modified>localFolderContentInfo[f].modified)){
						this.SendLocalFile(localFolderContentInfo[f].fullName,_ftpFolderPathName+"/"+f);
					};
				};
			};
		};

		// remove files and folders which match and does not exits locally...
		for(f in ftpFolderContentInfo){
			if(ftpFolderContentInfo[f] instanceof FTPFile){
				if(_doFilePattern.test(f)&&!_doNotFilePattern.test(f)){
					if(typeof(localFolderContentInfo[f])=="undefined")ftpFolderContentInfo[f].Delete();
				};
			}else if(ftpFolderContentInfo[f] instanceof FTPFolder){
				if(_doFolderPattern.test(f)&&!_doNotFolderPattern.test(f)&&_recursive){
					if(typeof(localFolderContentInfo[f])=="undefined")DeleteFTPFolderContent(f,true);
				};
			};
		};
		
		// create sub folders / sync sub folders...
		if(_recursive){
			for(f in localFolderContentInfo){
				if(localFolderContentInfo[f] instanceof Folder){
					if(_doFolderPattern.test(f)&&!_doNotFolderPattern.test(f)){
						this.CreateFTPFolder(_ftpFolderPathName+"/"+f);
						this.SyncFTPFolder(_ftpFolderPathName+"/"+f,_localFolderPathName+"/"+f,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern);
					};
				};
			};
		};
		return this.ERR_NONE;
	};
	
	this.SyncLocalFolder=function(_localFolderPathName,_ftpFolderPathName,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern){
	var f,ftpFolderContentInfo,localFolderContentInfo,localFolder=new Folder(_localFolderPathName);
		if(_localFolderPathName.IsSecurityPath()){
			this.log(this.Err2Str(ERR_SECURITY_FOLDER_CANCEL,i18x.Trans("Error:")));
			return this.ERR_SECURITY_FOLDER_CANCEL;
		};
		if(typeof(_recursive)=="undefined")_recursive=true;
		if(typeof(_doFilePattern)=="undefined")_doFilePattern=/.*/;
		if(typeof(_doNotFilePattern)=="undefined")_doNotFilePattern=/^$/;
		if(typeof(_doFolderPattern)=="undefined")_doFolderPattern=/.*/;
		if(typeof(_doNotFolderPattern)=="undefined")_doNotFolderPattern=/^$/;
		localFolderContentInfo=localFolder.getContentInfo(false);
		ftpFolderContentInfo=this.GetFTPFolderContentInfo(_ftpFolderPathName);

		// receive files...
		for(f in ftpFolderContentInfo){
			if(ftpFolderContentInfo[f] instanceof FTPFile){
				if(_doFilePattern.test(f)&&!_doNotFilePattern.test(f)){
					if(localFolderContentInfo[f] instanceof Folder){
						// remove ftp folder because same name exists in local as file...
						localFolderContentInfo[f].removeContent(true,_recursive);
						delete localFolderContentInfo[f];
					};
					if((typeof(localFolderContentInfo[f])=="undefined")||(localFolderContentInfo[f].modified>localFolderContentInfo[f].modified)){
						this.ReceiveFTPFile(ftpFolderContentInfo[f].fullName,localFolderContentInfo[f].fullName);
					};
				};
			};
		};

		// remove files which match and not exits on server...
		for(f in localFolderContentInfo){
			if(localFolderContentInfo[f] instanceof File){
				if(_doFilePattern.test(f)&&!_doNotFilePattern.test(f)){
					if(typeof(ftpFolderContentInfo[f])=="undefined")localFolderContentInfo[f].remove();
				};
			}else if(localFolderContentInfo[f] instanceof Folder){
				if(_doFolderPattern.test(f)&&!_doNotFolderPattern.test(f)&&_recursive){
					if(typeof(ftpFolderContentInfo[f])=="undefined")localFolderContentInfo[f].removeContent(true,_recursive);
				};
			};
		};

		// create sub folders / sync sub folders...
		if(_recursive){
			for(f in ftpFolderContentInfo){
				if(ftpFolderContentInfo[f] instanceof FTPFolder){
					if(_doFolderPattern.test(f)&&!_doNotFolderPattern.test(f)){
						new Folder(_localFolderPathName+"/"+f).create();
						this.SyncLocalFolder(_localFolderPathName+"/"+f,_ftpFolderPathName+"/"+f,_recursive,_doFilePattern,_doNotFilePattern,_doFolderPattern,_doNotFolderPattern);
					};
				};
			};
		};
		return this.ERR_NONE;
	};

}
