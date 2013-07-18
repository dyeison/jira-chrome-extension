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
	
	self['servers'] = new JiraServersArray(self);
	self['filters'] = new JiraFiltersArray(self);
	self['icon'] = new AnimatedIcon("/images/logo-19.png");
	$.each(['omnibox', 'attachments', 'quickadd'], function(i, param){
		loader.__defineGetter__(param, function(){
			return loader.getItem(param)?(loader.getItem(param)=="true"):true;
		});
		loader.__defineSetter__(param, function(val){
			loader.setItem(param, val.toString());
		});
	});	
	
	
	chrome.omnibox.onInputChanged.addListener(  function(text, suggest) {
		if(self['omnibox']){
			self.servers.default.getIssuesFromTextSearchWithLimit(text, function(xhr){
				var data = [];
				$(xhr).find("multiRef").each(function(i, val) {
					if($("key", val).text()){
						data.push({
							content: $("key", val).text(),
							description: $("key", val).text() +": "+$("summary", val).text()
						})
					}
				});
				suggest(data);
			});
		}
	  });
	chrome.omnibox.onInputEntered.addListener(function(text) {
		loader.addTab(loader.servers.default.url +"secure/QuickSearch.jspa?searchString="+ text);
	});	  
	
	
	
	chrome.runtime.onMessage.addListener(	function (request, sender, callback) {
		if(sender.tab){
			if(request['action'] == 'getContentSettings'){
				var url = sender.tab.url;
				$.each(self['servers'], function(i, server){
					if(url.indexOf(server.url) == 0){
						callback({
							'attachments': self['attachments'], 
							'quickadd': self['quickadd'],
							'serverId': server.id
						});
					}
				});
				return true;
			} else if(request['action'] == 'attach'){
				self.servers.get(request['serverId']).addAttachmentsToIssue(request['key'], request['files'], callback);
				return true;
			} else if(request['action'] == 'subscribe'){
				self['options'](escape(JSON.stringify(request)));
				return false;
			}
		}
	});
	
	self['getDate'] = function(str){
		if(str!='' && typeof(str)!="undefined"){
			try{
				var date=parseXSDDateString(str);
				var m = date.getMonth()+1; m=(m.toString().length==1)?"0"+m:m;
				var d = date.getDate(); d=(d.toString().length==1)?"0"+d:d;
				return date.getFullYear()+"-"+m+ "-" +d;
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
	  return yyyy +'-' +mm1 +'-' +dd +'T' +hh +':' +mm2 +':' +ss + 'Z';
	};
	
	self['addTab'] = function(url){
		chrome.tabs.create({
			'url': url,
			'selected': true
		});
	};
	
	self['options'] = function(param){
		var bOptionsPageFound = false;
		chrome.tabs.getAllInWindow(null, function (tabs){
			$.each(tabs, function(i, tab){
				if(tab.url.indexOf(chrome.extension.getURL("options.html")) ==0){
					bOptionsPageFound = true;
					chrome.tabs.update(tab.id, {
						url: chrome.extension.getURL("options.html")+(param?'?'+param:''),
						selected : true
					});						
				}
			});
			if(!bOptionsPageFound){
				chrome.tabs.create({
					url: chrome.extension.getURL("options.html")+(param?'?'+param:''),
					selected : true
				});
			}					
		});
	}
	
	if (!self.servers.length){
		chrome.browserAction.onClicked.addListener(function(tab) {
			self.options();
		});
	} else {
		chrome.browserAction.setPopup({
			"popup": "jira.html"
		});	
	}
}

window['loader'] = new JiraLoader();
