function JiraLoader(){
	var loader = this,
		self = this;
	self.setItem = function(name, val){
		localStorage.setItem(name, val);
	}
	self.getItem = function(name, val){
		return localStorage.getItem(name);
	}
	self.deleteItem = function(name, val){
		delete localStorage[name];
	}
	
	self['filters'] = new JiraFiltersArray(self);
	self['servers'] = new JiraServersArray(self);

	$.each(['omnibox', 'attachments', 'quickadd'], function(i, param){
		loader.__defineGetter__(param, function(){
			return server.getItem(param)?(loader.getItem(param)=="true"):true;
		});
		loader.__defineSetter__(param, function(val){
			loader.setItem(param, val.toString());
		});
	});	
	
	
	self['getDate'] = function(str){
		if(str!='' && typeof(str)!="undefined"){
			try{
				var date=parseXSDDateString(str);
					date.setUTCDate(date.getUTCDate()+1);
				  var m = date.getUTCMonth()+1; m=(m.toString().length==1)?"0"+m:m;
				  var d = date.getUTCDate(); d=(d.toString().length==1)?"0"+d:d;
				return date.getUTCFullYear()+"-"+m+ "-" +d;
			}catch(e){
				return str;
			}
		} else {
			return '';
		}
	};
	
	self['getXsdDateTime'] = function(date){
	  function pad(n) {
		 var s = n.toString();
		 return s.length < 2 ? '0'+s : s;
	  };
	  var yyyy = date.getUTCFullYear();
	  var mm1  = pad(date.getUTCMonth()+1);
	  var dd   = pad(date.getUTCDate());
	  var hh   = pad(date.getUTCHours());
	  var mm2  = pad(date.getUTCMinutes());
	  var ss   = pad(date.getUTCSeconds());
	  return yyyy +'-' +mm1 +'-' +dd +'T' +hh +':' +mm2 +':' +ss;
	};
	
}

window['loader'] = new JiraLoader();
