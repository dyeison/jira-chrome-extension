var loader = {
	resolutions: [],
	filters: [],
	token: null,
	url:null,
	login: function(username, password, callback){
			var pl = new SOAPClientParameters();
			pl.add("username", username);
			pl.add("password", password);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "login", pl, true, function(r, xhr){
					if($("faultstring",xhr).text() != '')
					{
						localStorage.setItem("error", $("faultstring",xhr).text());
						chrome.browserAction.setIcon({ 'path' : 'images/16x16off.png'});
						chrome.browserAction.setBadgeText({text: ''});
					} else {
						localStorage.setItem("error", "");
						loader.token = $(xhr).text();
						loader.getSettings();
						callback(loader);
					}
				});
	},
	update: function(){
	
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				pl.add("in1", "assignee = currentUser() AND resolution is EMPTY ORDER BY priority DESC, created ASC");
				//pl.add("in1", "resolution is EMPTY ORDER BY priority DESC, created ASC");
				pl.add("in2",100);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromJqlSearch", pl, true, function(r, xhr){
						
						chrome.browserAction.setIcon({ 'path' : 'images/16x16.png'});
						chrome.browserAction.setBadgeText({text: $("assignee", xhr).size().toString()});
						localStorage.setItem("AssignedToMe", $(xhr).xml(1));
				});
				loader.getSavedFilters();
	},
	getSettings: function(){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getResolutions", pl, true, function(r, xhr){
					$(xhr).find("multiRef").each(function(i, val) {
						if($("id", val).text()){
							loader.resolutions[$("id", val).text()] = $("name", val).text();
						}
					});
				});
	},
	getSavedFilters: function(){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getSavedFilters", pl, true, function(r, xhr){
					loader.filters.length = 0;
					$(xhr).find("multiRef").each(function(i, val) {
						if($("id", val).text()){
							
							loader.filters.push({
								id: $("id", val).text(),
								name: $("name", val).text()
							});
							loader.getIssuesFromFilter($("id", val).text());
						}
					});
				});
	},
	getIssuesFromFilter: function(filterid){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				pl.add("in1", filterid);
				//pl.add("in1", "resolution is EMPTY ORDER BY priority DESC, created ASC");
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromFilter", pl, true, function(r, xhr){
						//alert($(xhr).xml());
						localStorage.setItem("IssuesFromFilter_" + filterid , $(xhr).xml(1));
				});
	},
	updateIssuesFromFilter: function(){
		$.map(loader.filters, function(){
		
		});
	}
}
