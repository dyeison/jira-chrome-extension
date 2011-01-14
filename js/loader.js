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
				if(!loader.icon)
					loader.icon = new AnimatedIcon('images/16x16.png');
				loader.icon.play();

				loader.countedFilterId = localStorage.getItem('countedFilterId');
				if(loader.countedFilterId == null)
					loader.countedFilterId = 0;

				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				pl.add("in1", "assignee = currentUser() AND resolution = unresolved ORDER BY priority DESC, created ASC");
				//pl.add("in1", "resolution is EMPTY ORDER BY priority DESC, created ASC");
				pl.add("in2",100);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromJqlSearch", pl, true, function(r, xhr){
					try{
						if($("Fault", xhr).size()>=1){
							loader.issuesFromFilter["assignedtome"] = "Your JIRA SOAP service does not support this request, ask your administrator to update it to version 4.0";	
						} else {
							if(loader.countedFilterId == 0){
								chrome.browserAction.setIcon({ 'path' : 'images/16x16.png'});
								chrome.browserAction.setBadgeText({text: $("assignee", xhr).size().toString()});
							}
							loader.issuesFromFilter["assignedtome"] = loader.parseXml(xhr);
							loader.showNotifications("keys", loader.issuesFromFilter["assignedtome"]);
							loader.saveKeys("keys", loader.issuesFromFilter["assignedtome"] );
							
						}
					}catch(e){
						alert("Load assign to me issues failed: " + e);
					}
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
							if(loader.countedFilterId.toString() == filterid){
								chrome.browserAction.setIcon({ 'path' : 'images/16x16.png'});
								chrome.browserAction.setBadgeText({text: $("assignee", xhr).size().toString()});
							}
						loader.issuesFromFilter[filterid] = loader.parseXml(xhr);
				});
	},
	getIssuesFromTextSearchWithLimit: function(terms, callback){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				pl.add("in1", terms);
				pl.add("in2", 0);
				pl.add("in3", 10);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromTextSearchWithLimit", pl, true, function(r, xhr){
						callback(xhr);
				});
	},
	parseXml: function(xhr){
			var data = [];
			$(xhr).find("multiRef").each(function(i, val) {
					if($("key", val).text()){
						data.push([
							$("type", val).text(),
							$("key", val).text(),
							$("summary", val).text(),
							$("assignee", val).text(),
							$("duedate", val).text(),
							//$("timeoriginalestimate", val).text(), 
							parseInt($("priority", val).text()),
							loader.getResolution($("resolution", val).text()),
							$("status", val).text()
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
				return d.getFullYear()+"-"+(d.getMonth()+1) + "-" +d.getDate()
			}catch(e){
				return str;
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
	saveKeys: function(id, data){
		var keys = $.map(data, function(n, i){
			return n[1];
		});
		localStorage.setItem(id, keys.toString());
	},
	addTab: function(url){
		chrome.tabs.create({
			url: url,
			selected: true
		});
	},
	redirect: function(url){
		chrome.tabs.getSelected(null, function(Tab){
			chrome.tabs.update(Tab.id,{
				url: url
			});
		})
	},	
	showNotifications: function(id, data){
		var keys = localStorage.getItem(id)?localStorage.getItem(id).split(","):[];

		$.each(data, function(i, val){
				if($.inArray(val[1], keys)<0){
					// Create a simple text notification:
					var notification = webkitNotifications.createNotification(
					  'images/48x48.png',  // icon url - can be relative
					  val[1],  // notification title
					  val[2] // notification body text
					);
					// Then show the notification.
					//notification.ondisplay = function() { setTimeout(notification.cancel(), 5000); }
					notification.onclick = function(){ loader.addTab(loader.url +"/browse/"+val[1]); }
					notification.show();
				}
		});
	}
}
