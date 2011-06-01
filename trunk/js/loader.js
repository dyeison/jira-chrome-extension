/**
 * @preserve Copyright 2011 Andrey Vyrvich.
 * andry.virvich at google.com
 */


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
	token: null,
	url:null,
	countedFilterId: ((typeof localStorage.getItem('countedFilterId') == 'string')?localStorage.getItem('countedFilterId'):"0"),
	omnibox: ((typeof localStorage.getItem('countedFilterId') == 'string')?(localStorage.getItem('countedFilterId') == "true"):false),
	worklog: new Worklog(),
	icon: new AnimatedIcon('images/logo-19.png'),
	login: function(username, password, callback){
			chrome.tabs.onUpdated.removeListener(loader.onTabUpdated);
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
						chrome.tabs.onUpdated.addListener(loader.onTabUpdated);
						chrome.extension.onRequest.addListener(function(request, sender){
							if(request.action == 'subscribe'){
								loader.options(escape(JSON.stringify(request)));
							}
						});
					}
				});
	},
	onTabUpdated: function(tabId, changeInfo, tab){	
		console.log(changeInfo,loader);
		if(changeInfo.status == 'complete' && tab.url.indexOf(loader.url)>=0){
			chrome.tabs.executeScript(tabId, {
				file: 'js/jquery-1.5.1.min.js'
				}, function(){
					chrome.tabs.executeScript(tabId, {
						file: 'js/content.subscribe.js'
					});
			});
		}
	},
	update: function(callback){
		loader.updateFavoritesFilters(function(){
			loader.getSavedFilters();
			if(callback)
				callback();
			loader.filters.statrBadgeAnimation();				
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
		loader.filters.update();
	},
	getIssuesFromFilter: function(filter, callback){
		if(filter.notify){
			loader.icon.play();
		}
		if(filter.type == 'jql'){
			loader.getIssuesFromJQL(filter, callback);
		} else {
			var pl = new SOAPClientParameters();
			pl.add("in0", loader.token);
			pl.add("in1", filter.id);
			SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromFilter", pl, true, function(r, xhr){
				filter.issues = loader.parseXml(xhr);
				loader.filters.updateBadge();
				chrome.browserAction.setIcon({ 'path' : 'images/logo-19.png'});
				if(callback){
					callback(filter.issues);
				}
				filter.showNotifications();
			});
		}
	},
	getIssuesFromJQL: function(filter, callback){
				var pl = new SOAPClientParameters();
				pl.add("in0", loader.token);
				pl.add("in1", filter.jql);
				pl.add("in2",100);
				SOAPClient.invoke(loader.url + "/rpc/soap/jirasoapservice-v2", "getIssuesFromJqlSearch", pl, true, function(r, xhr){
					if($("Fault", xhr).size()>=1){
						//loader.issuesFromFilter[filter.id] = "Your JIRA SOAP service does not support this request, ask your administrator to update it to version 4.0";	
					} else {
						filter.issues = loader.parseXml(xhr);
						loader.filters.updateBadge();
						chrome.browserAction.setIcon({ 'path' : 'images/logo-19.png'});
						if(callback){
							callback(filter.issues);
						}
						filter.showNotifications();
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
	addWorkLog: function(issue, timeSpent, log, createdDate, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", loader.token);
		pl.add("in1", issue);
		pl.add("in2", {
			"startDate": loader.getXsdDateTime(createdDate?createdDate:new Date()),
			"comment": log,
			"timeSpent": timeSpent
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
			$(xhr).children(":first").children(":first").children(":first").children(":first").children().each( function(){
				$("multiRef" + this.getAttribute('href') , xhr).each(function(i, val) {
						if($("key", val).text()){
							data.push([
								$("type", val).text(),
								$("key", val).text(),
								$("summary", val).text(),
								$("assignee", val).text(),
								$("duedate", val).text(),
								parseInt($("priority", val).text()),
								loader.getResolution($("resolution", val).text()),
								$("status", val).text(),
								$("key", val).text()
							]);
						}
				});
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
	options:function(param){
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
}