var loader = {
	resolutions: [],
	priorities: [],
	issuetypes: [],
	statuses: [],
	filters: [],
	issuesFromFilter:[],
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
				pl.add("in1", "assignee = currentUser() AND resolution = unresolved ORDER BY priority DESC, created ASC");
				//pl.add("in1", "resolution is EMPTY ORDER BY priority DESC, created ASC");
				pl.add("in2",100);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromJqlSearch", pl, true, function(r, xhr){
						
						chrome.browserAction.setIcon({ 'path' : 'images/16x16.png'});
						chrome.browserAction.setBadgeText({text: $("assignee", xhr).size().toString()});
						loader.issuesFromFilter["assignedtome"] = loader.parseXml(xhr);
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

				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssueTypes", pl, true, function(r, xhr){
					$(xhr).find("multiRef").each(function(i, val) {
						if($("id", val).text()){
							loader.issuetypes[$("id", val).text()] = {
								"icon": $("icon", val).text(), 
								"text": $("name", val).text()
							};
						}
					});
				});
				
				
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getPriorities", pl, true, function(r, xhr){
					$(xhr).find("multiRef").each(function(i, val) {
						if($("id", val).text()){
							loader.priorities[$("id", val).text()] = {
								"icon": $("icon", val).text(), 
								"text": $("name", val).text()
							};
						}
					});
				});
				
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getStatuses", pl, true, function(r, xhr){
					$(xhr).find("multiRef").each(function(i, val) {
						if($("id", val).text()){
							loader.statuses[$("id", val).text()] = {
								"icon": $("icon", val).text(), 
								"text": $("name", val).text()
							};
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
				//pl.add("in2", 0);
				//pl.add("in3", 50);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromFilter", pl, true, function(r, xhr){
						loader.issuesFromFilter[filterid] = loader.parseXml(xhr);
				});
	},
	parseXml: function(xhr){
			var data = [];
			$(xhr).find("multiRef").each(function(i, val) {
					if($("key", val).text())
					{
						data.push([
							$("type", val).text(),
							$("key", val).text(),
							$("summary", val).text(),
							$("assignee", val).text(),
							loader.getDate($("duedate", val).text()),
							//$("timeoriginalestimate", val).text(), 
							parseInt($("priority", val).text()),
							loader.getResolution($("resolution", val).text()),
							$("status", val).text(),
						]);
					}
			});
			return data;
	},
	updateIssuesFromFilter: function(){
		$.map(loader.filters, function(){
		
		});
	},
	getDate: function(str){
		if(str!='' && typeof(str)!="undefined"){
			try{
				var d= parseXSDDateString(str);
				return (d.getMonth()+1) + "." +d.getDate() + "." + d.getFullYear();
			}catch(e){
				return '';
			}
		} else {
			return '';
		}
	},
	getResolution: function(id){
		if(id == ''){
			return '<span style="color:#880000; font-size:8px;">UNRESOLVED</span>';
		}else{
			return loader.resolutions[id];
		}
	},
}
