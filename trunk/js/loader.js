function Worklog(){
	var issues = {};
	this.__defineGetter__("issues", function(){
       return issues;
    });
	this.__defineSetter__("issues", function(val){
       return localStorage.setItem('worklog', JSON.stringify(issues));
    });
	
	this.startProgress = function(issueId){
		//if(typeof issues[issueId])
		issues[issueId] = (new Date()).getTime();
		this.issues = issues;
	}
	this.getTimeSpent = function(issueId){
		var timeSpent = 0;
		if(typeof issues[issueId] != 'undefined'){
			timeSpent = (new Date()).getTime() - issues[issueId];
		}
		return timeToString(timeSpent);
	}
	this.stopProgress = function(issueId){
		//loader.addWorkLog(issueId, timeSpent, log, callback);
		delete issues[issueId];
		this.issues = issues;
	}
	this.inProgress = function(issueId){
		return typeof issues[issueId] != 'undefined';
	}
	
	function timeToString(iTime){
		// iTime  - number of millisecconds
		var m = Math.ceil(iTime/60000);
		var h = Math.floor(m/60);
		m = m%60;
		return ((h)?(h+"h "):'')+ ((m)?(m+"m"):'');
	}
	
	
	issues = localStorage.getItem('worklog')?JSON.parse(localStorage.getItem('worklog')):{};
}

var loader = {
	loggedIn: false,
	notifications: [],
	resolutions: {},
	priorities: {},
	issuetypes: {},
	statuses: {},
	users: {},
	filters:new FiltersArray(),
	issuesFromFilter:{},
	token: null,
	url:null,
	countedFilterId: ((typeof localStorage.getItem('countedFilterId') == 'string')?localStorage.getItem('countedFilterId'):"0"),
	omnibox: ((typeof localStorage.getItem('countedFilterId') == 'string')?(localStorage.getItem('countedFilterId') == "true"):false),
	worklog: new Worklog(),
	login: function(username, password, callback){
		
			var pl = new SOAPClientParameters();
			pl.add("username", username);
			pl.add("password", password);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "login", pl, true, function(r, xhr){
					console.log(xhr);
					if($("faultstring",xhr).text() != '')
					{
						loader.loggedIn = false;
						localStorage.setItem("error", $("faultstring",xhr).text());
						chrome.browserAction.setIcon({ 'path' : 'images/logo-19-off.png'});
						chrome.browserAction.setBadgeText({text: ''});
						callback($("faultstring",xhr).text());
					} else {
						loader.loggedIn = true;
						localStorage.setItem("error", "");
						loader.token = $(xhr).text();
						loader.getSettings();
						callback(loader);
					}
				});
	},
	update: function(callback){
		if(loader.timer)
			window.clearTimeout(loader.timer);
		loader.timer = window.setTimeout(loader.update, localStorage.getItem('updateinterval'));
		if(!loader.icon)
			loader.icon = new AnimatedIcon('images/logo-19.png');
		loader.icon.play();
		loader.updateFavoritesFilters(function(){
			loader.getSavedFilters();
			if(callback)
				callback();
		});
		//loader.getCustomFields();
	},
	updateFavoritesFilters: function(callback){

		var pl = new SOAPClientParameters();
		pl.add("in0", loader.token);
		SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getSavedFilters", pl, true, function(r, xhr){
			$(xhr).find("multiRef").each(function(i, val) {
				if($("id", val).text()){
					var id = $("id", val).text();
					if(loader.filters.index(id) < 0){
						loader.filters.push(new Filter({
							id: id,
							type: "filter",
							enabled: true,
							name: $("name", val).text()
						}));
					}
				}
			});
			loader.filters.save();
			if(callback)
				callback(loader.filters);
		});
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
				this.getProjects(function(xhr){
					loader.projects = $(xhr).find("multiRef").map(function(el){
						if($("id", this).text()){
							return {
								"id": $("id", this).text(),
								"name":  $("name", this).text(),
								"key":  $("key", this).text()
							}
						}
					}).get().sort(function(a,b){return (a.name.toLowerCase()>b.name.toLowerCase())?1:(a.name.toLowerCase()<b.name.toLowerCase())?-1:0});
				});
				
				this.getGroup("jira-users", function(xhr){
					$("multiRef", xhr).each(function(i, val) {
						if($("fullname", val).text()){
							loader.users[$("name", val).text()] = {
								"email": $("email", val).text(), 
								"fullname": $("fullname", val).text()
							};
						}
					});
				})
	},
	getSavedFilters: function(){
				$.each(loader.filters, function(i, filter){
					if(filter.enabled){
						loader.getIssuesFromFilter(filter);
					}
				});
	},
	getIssuesFromFilter: function(filter){
		if(filter.type == 'jql'){
			loader.getIssuesFromJQL(filter);
		} else {
			var pl = new SOAPClientParameters();
			pl.add("in0", loader.token);
			pl.add("in1", filter.id);
			SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromFilter", pl, true, function(r, xhr){
				if(loader.countedFilterId.toString() == filter.id){
					chrome.browserAction.setIcon({ 'path' : 'images/logo-19.png'});
					chrome.browserAction.setBadgeText({text: $("assignee", xhr).size().toString()});
				}
				loader.issuesFromFilter[filter.id] = loader.parseXml(xhr);
			});
		}
	},
	getIssuesFromJQL: function(filter){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				pl.add("in1", filter.jql);
				pl.add("in2",100);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromJqlSearch", pl, true, function(r, xhr){
					if($("Fault", xhr).size()>=1){
						loader.issuesFromFilter[filter.id] = "Your JIRA SOAP service does not support this request, ask your administrator to update it to version 4.0";	
					} else {
						if(loader.countedFilterId == filter.id){
							chrome.browserAction.setIcon({ 'path' : 'images/logo-16.png'});
							chrome.browserAction.setBadgeText({text: $("assignee", xhr).size().toString()});
						}
						loader.issuesFromFilter[filter.id] = loader.parseXml(xhr);
						if(filter.id == '0'){
							loader.showNotifications("keys", loader.issuesFromFilter[filter.id]);
							loader.saveKeys("keys", loader.issuesFromFilter[filter.id] );
						}
					}
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
	getCustomFields: function(){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getCustomFields", pl, true, function(r, xhr){

				});
	},
	getWorklogs: function(issue){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				pl.add("in1", issue);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getWorklogs", pl, true, function(r, xhr){

				});
	},
	getAvailableActions: function(issue){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				pl.add("in1", issue);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getAvailableActions", pl, true, function(r, xhr){

				});
	},
	getProjects: function(callback){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getProjectsNoSchemes", pl, true, function(r, xhr){
						if(callback)
							callback(xhr);
				});
	},	
	addWorkLog: function(issue, timeSpent, log, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", loader.token);
		pl.add("in1", issue);
		pl.add("in2", {
			"startDate":this.getXsdDateTime(new Date()),
			"comment":log,
			"timeSpent":timeSpent
		});
		SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "addWorklogAndAutoAdjustRemainingEstimate", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	},
	resolveIssue: function(issue, resolution, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", loader.token);
		pl.add("in1", issue);
		pl.add("in2", "5");  //-- is 'Resolve issue' action
		pl.add("in3", {
			"resolution":resolution
		});
		SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "progressWorkflowAction", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	},
	getGroup: function(groupName, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", loader.token);
		pl.add("in1", groupName);
		SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getGroup", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	},
	assigneIssue: function(issue, user, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", loader.token);
		pl.add("in1", issue);
		pl.add("in2", {
			RemoteFieldValue: {
				id: "assignee",
				values: [user]
			}
		});
		SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "updateIssue", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	},
	addComment: function(issue, comment, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", loader.token);
		pl.add("in1", issue);
		pl.add("in2", {
				"body": comment
		});
		SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "addComment", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	},
	parseXml: function(xhr){
			var data = [];
			$(xhr).find("multiRef").each(function(i, val) {
					if($("key", val).text()){
						//loader.getWorklogs($("key", val).text());
						data.push([
							$("type", val).text(),
							$("key", val).text(),
							$("summary", val).text(),
							$("assignee", val).text(),
							$("duedate", val).text(),
							//$("timeoriginalestimate", val).text(), 
							parseInt($("priority", val).text()),
							loader.getResolution($("resolution", val).text()),
							$("status", val).text(),
							$("key", val).text()
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
				var date= parseXSDDateString(str);
					date.setUTCDate(date.getUTCDate()+1);
				  //console.log(str+": "+d.getFullYear()+"-"+(d.getMonth()+1) + "-" +d.getDate());
				  var m = date.getUTCMonth()+1; m=(m.toString().length==1)?"0"+m:m;
				  var d = date.getUTCDate(); d=(d.toString().length==1)?"0"+d:d;
				return date.getUTCFullYear()+"-"+m+ "-" +d;
			}catch(e){
				return str;
			}
		} else {
			return '';
		}
	},
	getXsdDateTime: function(date){
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
		var newKeys = [];
		$.each(data, function(i, val){
				if($.inArray(val[1], keys)<0){
					newKeys.push(val);
				}
		});

		if(newKeys.length>0 && newKeys.length<=5){
			$.each(newKeys, function(i, val){
						var notification = webkitNotifications.createNotification(
						  'images/logo-48.png',  // icon url - can be relative
						  val[1],  // notification title
						  val[2] // notification body text
						);
						notification.onclick = function(event){
							loader.addTab(loader.url +"/browse/"+val[1]); 
							event.currentTarget.cancel(); 
						}
						notification.ondisplay = function(event){
							setTimeout((function (notif){return function(){notif.cancel();}})(event.currentTarget), 10000);
						}
						notification.onclose = function(event){
							loader.notifications = $.map(loader.notifications,function(notif){
								if (notif == event.currentTarget)
									return null;
								else 
									return notif;
							});
						}						
						notification.show();
						loader.notifications.push(notification);
			});
		}
	},
	options:function(){
		var bOptionsPageFound = false;
		chrome.tabs.getAllInWindow(null, function (tabs){
			$.each(tabs, function(i, tab){
				if(tab.url.indexOf(chrome.extension.getURL("options.html")) ==0){
					bOptionsPageFound = true;
					chrome.tabs.update(tab.id, {selected : true});						
				}
			});
			if(!bOptionsPageFound){
				chrome.tabs.create({
					url: chrome.extension.getURL("options.html"),
					selected : true
				});
			}					
		});
	}
}