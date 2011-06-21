function JiraServersArray(_loader){
	var loader = _loader,
		self = this;
	self['load'] = function (){
		if(loader.getItem('servers')){
			$.each(JSON.parse(loader.getItem('servers')), function(i, url){
					self.push(new JiraServer(url, loader));
				}
			);
		} else {
			if(loader.getItem('url')){
				self.push(new JiraServer(loader.getItem('url'), loader, loader.getItem('username'), loader.getItem('password')));
				loader.deleteItem('url');
				loader.deleteItem('username');
				loader.deleteItem('password');
				self.save();
			}
		}
	}
	self['save'] = function (){
		loader.setItem('servers', JSON.stringify($.map(self, function(server){
			return server.url;
		})));
	}	
	
}

JiraServersArray.prototype = Array();
JiraServersArray.prototype.get = function(id){
	var res = -1;
	$.each(self, function(i, el){
		if (el.id.toString() == id.toString()){
			res = el;
			return false;
		}
	});
	return res;
}
window['JiraServersArray'] = JiraServersArray;


function JiraServer(_url, _loader, username, password){
	var loader = _loader,
		server = this,
		url = _url;
	server.setItem = function(name, val){
		loader.setItem(server.id+"."+name, val);
	}
	server.getItem = function(name, val){
		return loader.getItem(server.id+"."+name);
	}
	
	if(username) server.setItem("username", username);
	if(password) server.setItem("password", password);
	server.__defineGetter__('url', function(){ return url; });
	server.__defineSetter__('url', function(_url){ 
		server.id = $['md5'](_url);
		url = _url;
		soapUrl = _url + "/rpc/soap/jirasoapservice-v2";
	});

	
	var token= null,
		username = server.getItem("username"),
		password = server.getItem("password");

	server['loggedIn'] = false;
	server['resolutions'] = {}
	server['priorities'] = {};
	server['issuetypes'] = {}
	server['statuses'] = {}
	server['users'] = {}
	server['worklog'] = new JiraWorklog(server);

	server.__defineSetter__("username", function(val){
		username = val;
		server.setItem('username', username);
	});
	server.__defineSetter__("password", function(val){
		password = val;
		server.setItem('password', password);
	});
	server.__defineSetter__("token", function(val){
		token = val;
		server.setItem('token', token);
	});

	server['login'] = function(param){
			var pl = new SOAPClientParameters(),
				options = $.extend({
						'username': username,
						'passowrd': password
					}, param);
			
			pl.add("username", options['username']);
			pl.add("password", options['password']);
				SOAPClient.invoke(soapUrl, "login", pl, true, function(r, xhr){
					if($("faultstring",xhr).text() != '')
					{
						server.loggedIn = false;
						if(options['error'])
							options['error'](server, $("faultstring",xhr).text());
					} else {
						console.log(server, $(xhr).text());
						server.loggedIn = true;
						server.token = $(xhr).text();
						server.username = options.username;
						server.password = options.password;
						//getSettings();
						if (options['success'])
							options['success'](server);
					}
				}, 	options.error);
	};
	
	server['update'] = function(callback){
		loader.filters.update();
	};
	
	server.getIssuesFromJQL = function(filter, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", token);
		pl.add("in1", filter.jql);
		pl.add("in2",100);
		SOAPClient.invoke(soapUrl, "getIssuesFromJqlSearch", pl, true, function(r, xhr){
			if($("Fault", xhr).size()>=1){
				//server.issuesFromFilter[filter.id] = "Your JIRA SOAP service does not support this request, ask your administrator to update it to version 4.0";	
			} else {
				filter.issues = server.parseXml(xhr);
				loader.filters.updateBadge();
				chrome.browserAction.setIcon({ 'path' : 'images/logo-19.png'});
				if(callback){
					callback(filter.issues);
				}
				filter.showNotifications();
			}
		});
	};
	
	server.getIssuesFromTextSearchWithLimit = function(terms, callback){
				var pl = new SOAPClientParameters();
				pl.add("in0", token);
				pl.add("in1", terms);
				pl.add("in2", 0);
				pl.add("in3", 10);
				SOAPClient.invoke(soapUrl, "getIssuesFromTextSearchWithLimit", pl, true, function(r, xhr){
						callback(xhr);
				});
	};
	
	server.getCustomFields = function(){
				var pl = new SOAPClientParameters();
				pl.add("in0", token);
				SOAPClient.invoke(soapUrl, "getCustomFields", pl, true, function(r, xhr){

				});
	};
	
	server.getWorklogs = function(issue){
				var pl = new SOAPClientParameters();
				pl.add("in0", token);
				pl.add("in1", issue);
				SOAPClient.invoke(soapUrl, "getWorklogs", pl, true, function(r, xhr){

				});
	};
	
	server.getAvailableActions = function(issue){
				var pl = new SOAPClientParameters();
				pl.add("in0", token);
				pl.add("in1", issue);
				SOAPClient.invoke(soapUrl, "getAvailableActions", pl, true, function(r, xhr){

				});
	};
	
	server['getProjects'] = function(callback){
				var pl = new SOAPClientParameters();
				pl.add("in0", token);
				SOAPClient.invoke(soapUrl, "getProjectsNoSchemes", pl, true, function(r, xhr){
						if(callback)
							callback(xhr);
				});
	};
	
	server['addWorkLog'] = function(issue, timeSpent, log, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", token);
		pl.add("in1", issue);
		pl.add("in2", {
			"startDate":loader.getXsdDateTime(new Date()),
			"comment":log,
			"timeSpent":timeSpent
		});
		SOAPClient.invoke(soapUrl, "addWorklogAndAutoAdjustRemainingEstimate", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	};
	
	server['resolveIssue'] = function(issue, resolution, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", token);
		pl.add("in1", issue);
		pl.add("in2", "5");  //-- is 'Resolve issue' action
		pl.add("in3", {
			"resolution":resolution
		});
		SOAPClient.invoke(soapUrl, "progressWorkflowAction", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	};
	
	server['getGroup'] = function(groupName, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", token);
		pl.add("in1", groupName);
		SOAPClient.invoke(soapUrl, "getGroup", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	};
	
	server['assigneIssue'] = function(issue, user, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", token);
		pl.add("in1", issue);
		pl.add("in2", {
			RemoteFieldValue: {
				id: "assignee",
				values: [user]
			}
		});
		SOAPClient.invoke(soapUrl, "updateIssue", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	};
	
	server['addComment'] = function(issue, comment, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", token);
		pl.add("in1", issue);
		pl.add("in2", {
				"body": comment
		});
		SOAPClient.invoke(soapUrl, "addComment", pl, true, function(r, xhr){
			if(callback)
				callback(xhr);
		});
	};
	
	server['addAttachmentsToIssue'] = function(issue, files, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", token);
		pl.add("in1", issue);
		pl.add("in2", $.map(files, function(f){return f.fileName}));
		pl.add("in3", $.map(files, function(f){return SOAPClient._toBase64(f.data);}));
		SOAPClient.invoke(soapUrl, "addBase64EncodedAttachmentsToIssue", pl, true, function(r, xhr){
			if(callback)
				callback();
		});
	};	
	
	server['parseXml'] = function(xhr){
			var data = [];
			$(xhr).children(":first").children(":first").children(":first").children(":first").children().each( function(){
				$("multiRef" + self.getAttribute('href') , xhr).each(function(i, val) {
						if($("key", val).text()){
							data.push([
								$("type", val).text(),
								$("key", val).text(),
								$("summary", val).text(),
								$("assignee", val).text(),
								$("duedate", val).text(),
								parseInt($("priority", val).text()),
								($("resolution", val).text() == '')?'UNRESOLVED':server.resolutions[$("resolution", val).text()],
								$("status", val).text(),
								$("key", val).text()
							]);
						}
				});
			});
			return data;
	};
	
	server['toArray'] = function(){
		return [server.loggedIn, server.url, username];
	}
	
	
	//---------------------------------------------------------
	// Private functions
	//---------------------------------------------------------
	
	
	function getSettings(){
		var pl = new SOAPClientParameters();
		pl.add("in0", token);
		SOAPClient.invoke(soapUrl, "getResolutions", pl, true, function(r, xhr){
		$(xhr).find("multiRef").each(function(i, val) {
				if($("id", val).text()){
					server.resolutions[$("id", val).text()] = $("name", val).text();
				}
			});
		});

		SOAPClient.invoke(soapUrl, "getIssueTypes", pl, true, function(r, xhr){
			$(xhr).find("multiRef").each(function(i, val) {
				if($("id", val).text()){
					server.issuetypes[$("id", val).text()] = {
						"icon": $("icon", val).text(), 
						"text": $("name", val).text()
					};
				}
			});
		});
		
		SOAPClient.invoke(soapUrl, "getPriorities", pl, true, function(r, xhr){
			$(xhr).find("multiRef").each(function(i, val) {
				if($("id", val).text()){
					server.priorities[$("id", val).text()] = {
						"icon": $("icon", val).text(), 
						"text": $("name", val).text()
					};
				}
			});
		});
		
		SOAPClient.invoke(soapUrl, "getStatuses", pl, true, function(r, xhr){
			$(xhr).find("multiRef").each(function(i, val) {
				if($("id", val).text()){
					server.statuses[$("id", val).text()] = {
						"icon": $("icon", val).text(), 
						"text": $("name", val).text()
					};
				}
			});
		});
		
		server.getProjects(function(xhr){
			server.projects = $(xhr).find("multiRef").map(function(el){
				if($("id", this).text()){
					return {
						"id": $("id", this).text(),
						"name":  $("name", this).text(),
						"key":  $("key", this).text()
					}
				}
			}).get().sort(function(a,b){return (a.name.toLowerCase()>b.name.toLowerCase())?1:(a.name.toLowerCase()<b.name.toLowerCase())?-1:0});
		});
		
		server.getGroup("jira-users", function(xhr){
			$("multiRef", xhr).each(function(i, val) {
				if($("fullname", val).text()){
					server.users[$("name", val).text()] = {
						"email": $("email", val).text(), 
						"fullname": $("fullname", val).text()
					};
				}
			});
		})
	}
}
window['JiraServer'] = JiraServer;

function JiraWorklog(_server){
	var issues = {},
		server = _server;
	self.__defineGetter__("issues", function(){
       return issues;
    });
	self.__defineSetter__("issues", function(val){
       return server.setItem('worklog', JSON.stringify(issues));
    });
	
	self.startProgress = function(issueId){
		//if(typeof issues[issueId])
		issues[issueId] = (new Date()).getTime();
		self.issues = issues;
	}
	self.getTimeSpent = function(issueId){
		var timeSpent = 0;
		if(typeof issues[issueId] != 'undefined'){
			timeSpent = (new Date()).getTime() - issues[issueId];
		}
		return timeToString(timeSpent);
	}
	self.stopProgress = function(issueId){
		//loader.addWorkLog(issueId, timeSpent, log, callback);
		delete issues[issueId];
		self.issues = issues;
	}
	self.inProgress = function(issueId){
		return typeof issues[issueId] != 'undefined';
	}
	
	function timeToString(iTime){
		// iTime  - number of millisecconds
		var m = Math.ceil(iTime/60000);
		var h = Math.floor(m/60);
		m = m%60;
		return ((h)?(h+"h "):'')+ ((m)?(m+"m"):'');
	}
	
	
	issues = server.getItem('worklog')?JSON.parse(server.getItem('worklog')):{};
}
