function JiraServersArray(_loader){
	var loader = _loader,
		self = this;
	self['load'] = function (){
		if(loader.getItem('servers')){
			$.each(JSON.parse(loader.getItem('servers')), function(i, url){
					var s = new JiraServer(url, loader);
					s.login();
					self.push(s);
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
	};
	self.__defineGetter__('default', function(){
		return this[0];
	})
	self['save'] = function (){
		loader.setItem('servers', JSON.stringify($.map(self, function(server){
			return server.url;
		})));
	}	
	self['load']();
}

JiraServersArray.prototype = Array();
JiraServersArray.prototype.get = function(id){
	var res = -1;
	$.each(this, function(i, el){
		if (el && el.id && el.id.toString() == id.toString()){
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
		id = $['md5'](_url),
		url = _url,
		soapUrl = _url.replace(/\/$/,'') + "/rpc/soap/jirasoapservice-v2";
	this.setItem = function(name, val){
		loader.setItem(id+"."+name, val);
	}
	this.getItem = function(name, val){
		return loader.getItem(id+"."+name);
	}
	
	if(username) server.setItem("username", username);
	if(password) server.setItem("password", password);
	this.__defineGetter__('url', function(){ return url; });
	this.__defineGetter__('username', function(){ return username; });
	this.__defineSetter__('url', function(_url){ 
		id = $['md5'](_url);
		url = _url;
		soapUrl = _url.replace(/\/$/,'') + "/rpc/soap/jirasoapservice-v2";
	});
	this.__defineSetter__("username", function(val){
		username = val;
		server.setItem('username', username||"");
	});
	this.__defineSetter__("password", function(val){
		password = val;
		server.setItem('password', password||"");
	});	
	this.__defineGetter__("id", function(){ return id; });
	
	var username = server.getItem("username"),
		password = server.getItem("password");

	server.__defineSetter__('httpAuth', function(obj){
		server.setItem("httpAuth", JSON.stringify(obj));
	});
	server.__defineGetter__('httpAuth', function(){
		return $.extend({
			'enabled': false,
			'username': '',
			'password': ''
		}, JSON.parse(server.getItem("httpAuth")));
	});
	server['loggedIn'] = false;
	server['resolutions'] = {}
	server['priorities'] = {};
	server['issuetypes'] = {}
	server['statuses'] = {}
	server['users'] = {}
	server['worklog'] = new JiraWorklog(server);
	server.token = null;

	server['login'] = function(param){
			var pl = new SOAPClientParameters(),
				options = $.extend({
						'username': username,
						'password': password,
						'httpAuth': {
							'username': server['httpAuth']['username'],
							'password': server['httpAuth']['password']
						}
					}, param);
			console.log(options);
			pl.add("username", options['username']);
			pl.add("password", options['password']);
				SOAPClient.invoke({
					'url': soapUrl, 
					'username':options['httpAuth']['username'],
					'password':options['httpAuth']['password'], 
					'beforeSend': function (xhr){ 
						if (options['httpAuth']['enabled'])
							xhr.setRequestHeader('Authorization', "Basic " + btoa(options['httpAuth']['username'] + ':' + options['httpAuth']['password'])); 
					},
					'method': "login", 
					'parameters': pl, 
					'async': true, 
					'callback': function(r, xhr){
						console.log('login callback', xhr, options);
						if($("faultstring",xhr).text() != '')
						{
							server.loggedIn = false;
							if(options['error'])
								options['error'](server, $("faultstring",xhr).text());
						} else {
							console.log(server, $(xhr).text());
							server.loggedIn = true;
							server.token = $(xhr).text();
							server['username'] = options.username;
							server['password'] = options.password;
							server['httpAuth'] = options['httpAuth'];
							
							chrome.browserAction.setPopup({
								"popup": "jira.html"
							});
							
							getSettings();
							server.update();
						
							if (options['success'])
								options['success'](server);
						}
					}, 	
					'error': options.error
				});
	};
	
	server['update'] = function(callback){
		$.each(loader.filters, function(i, filter){
			if(filter.server == server.id){
				filter.update();
			}
		});
	};
	
	this['getIssuesFromFilter'] = function(filter, callback){
		console.log(filter, callback);
		if(filter.notify){
			loader.icon.play();
		}
		if(filter.type == 'jql'){
			server.getIssuesFromJQL(filter, callback);
		} else {
			var pl = new SOAPClientParameters();
			pl.add("in0", server.token);
			pl.add("in1", filter.id);
			pl.add("in2", 0);
			pl.add("in3", 300);
			SOAPClient.invoke({
				'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
					'beforeSend': function (xhr){ 
						if (server['httpAuth']['enabled'])
							xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
					},
				'method': "getIssuesFromFilterWithLimit", 
				'parameters': pl, 
				'async': true, 
				'callback': function(r, xhr){
					filter.issues = server.parseXml(xhr);
					loader.filters.updateBadge();
					chrome.browserAction.setIcon({ 'path' : 'images/logo-19.png'});
					if(callback){
						callback(filter.issues);
					}
					filter.showNotifications();
				}
			});
		}
	};
	
	server.getIssuesFromJQL = function(filter, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		pl.add("in1", filter.jql);
		pl.add("in2", 100);
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
					'beforeSend': function (xhr){ 
						if (server['httpAuth']['enabled'])
							xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
					},
			'method': "getIssuesFromJqlSearch", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
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
			}
		});
	};
	
	server.getIssuesFromTextSearchWithLimit = function(terms, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		pl.add("in1", terms);
		pl.add("in2", 0);
		pl.add("in3", 10);
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "getIssuesFromTextSearchWithLimit", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				callback(xhr);
			}
		});
};
	
	server.getCustomFields = function(){
				var pl = new SOAPClientParameters();
				pl.add("in0", server.token);
				SOAPClient.invoke({
					'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
					'beforeSend': function (xhr){ 
						if (server['httpAuth']['enabled'])
							xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
					},
					'method': "getCustomFields", 
					'parameters': pl, 
					'async': true, 
					'callback': function(r, xhr){
					}
				});
	};
	
	server.getWorklogs = function(issue){
				var pl = new SOAPClientParameters();
				pl.add("in0", server.token);
				pl.add("in1", issue);
				SOAPClient.invoke({
					'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
					'beforeSend': function (xhr){ 
						if (server['httpAuth']['enabled'])
							xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
					},
					'method': "getWorklogs", 
					'parameters': pl, 
					'async': true, 
					'callback': function(r, xhr){
					}
				});
	};
	
	server.getAvailableActions = function(issue){
				var pl = new SOAPClientParameters();
				pl.add("in0", server.token);
				pl.add("in1", issue);
				SOAPClient.invoke({
					'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
					'beforeSend': function (xhr){ 
						if (server['httpAuth']['enabled'])
							xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
					},
					'method': "getAvailableActions", 
					'parameters': pl, 
					'async': true, 
					'callback': function(r, xhr){
					}
				});
	};
	
	server['getProjects'] = function(callback){
				var pl = new SOAPClientParameters();
				pl.add("in0", server.token);
				SOAPClient.invoke({
					'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
					'beforeSend': function (xhr){ 
						if (server['httpAuth']['enabled'])
							xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
					},
					'method': "getProjectsNoSchemes", 
					'parameters': pl, 
					'async': true, 
					'callback': function(r, xhr){
						if(callback)
							callback(xhr);
					}
				});
	};
	
	server['addWorkLog'] = function(issue, timeSpent, log, createdDate, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		pl.add("in1", issue);
		pl.add("in2", {
			"startDate":loader.getXsdDateTime(createdDate?createdDate:new Date()),
			"comment":log,
			"timeSpent":timeSpent
		});
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "addWorklogAndAutoAdjustRemainingEstimate", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				if(callback)
					callback(xhr);
			}, 
			'error': function(r, xhr){
				if(callback)
					callback(xhr);
			}
		});
	};
	
	server['resolveIssue'] = function(issue, resolution, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		pl.add("in1", issue);
		pl.add("in2", "5");  //-- is 'Resolve issue' action
		pl.add("in3", {
			"resolution":resolution
		});
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "progressWorkflowAction", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				if(callback)
					callback(xhr);
			}
		});
	};
	
	server['getGroup'] = function(groupName, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		pl.add("in1", groupName);
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "getGroup", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				if(callback)
					callback(xhr);
			}
		});
	};
	
	server['assigneIssue'] = function(issueId, user, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		pl.add("in1", issueId);
		pl.add("in2", {
			'RemoteFieldValue': {
				'id': "assignee",
				'values': [user]
			}
		});
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "updateIssue", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				if(callback)
					callback(xhr);
			}
		});
	};
	
	server['updateDueDate'] = function(issueId, d, callback){
		var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun",
					"Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		pl.add("in1", issueId);
		pl.add("in2", [{
				"id": "duedate",
				"values": (server.version>4) ? 
								[d.getDate()+"."+(d.getMonth()+1) + "." + d.getFullYear().toString().substr(2,2)] :
								[d.getDate()+"/"+ monthNames[d.getMonth()] + "/" + d.getFullYear().toString().substr(2,2)]
			}
		]);
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "updateIssue", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				if(callback)
					callback(xhr);
			}
		});
	};
	
	server['addComment'] = function(issue, comment, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		pl.add("in1", issue);
		pl.add("in2", {
				"body": comment
		});
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "addComment", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				if(callback)
					callback(xhr);
			}
		});
	};
	
	server['addAttachmentsToIssue'] = function(issue, files, callback){
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		pl.add("in1", issue);
		pl.add("in2", $.map(files, function(f){return f.name}));
		pl.add("in3", $.map(files, function(f){return SOAPClient._toBase64(f.data);}));
		SOAPClient.invoke({
			'url': soapUrl, 
			'username': server['httpAuth']['username'],
			'password': server['httpAuth']['password'], 
			'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "addBase64EncodedAttachmentsToIssue", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				if(callback)
					callback();
			}
		});
	};	
	
	server['parseXml'] = function(xhr){
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
	};
	
	server['getUrl'] = function(str){
		return (server.url + "/" + str).replace(/([^:])(\/{2,})/, '$1/');
	};
	
	server['ajax'] = function(param){
		$.ajax($.extend({
			'url': soapUrl, 
			'username':server['httpAuth']['username'],
			'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'async': false
		}, param));
	
	};
	
	
	//---------------------------------------------------------
	// Private functions
	//---------------------------------------------------------
	
	
	function getSettings(){
		var pl = new SOAPClientParameters();
		pl.add("in0", server.token);
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "getResolutions", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				$(xhr).find("multiRef").each(function(i, val) {
					if($("id", val).text()){
						server['resolutions'][$("id", val).text()] = $("name", val).text();
					}
				});
			}
		});

		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "getIssueTypes", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				$(xhr).find("multiRef").each(function(i, val) {
					if($("id", val).text()){
						server['issuetypes'][$("id", val).text()] = {
							"icon": $("icon", val).text(), 
							"text": $("name", val).text()
						};
					}
				});
			}
		});
		
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "getPriorities", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				$(xhr).find("multiRef").each(function(i, val) {
					if($("id", val).text()){
						server['priorities'][$("id", val).text()] = {
							"icon": $("icon", val).text(), 
							"text": $("name", val).text()
						};
					}
				});
			}
		});
		
		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "getStatuses", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				$(xhr).find("multiRef").each(function(i, val) {
					if($("id", val).text()){
						server['statuses'][$("id", val).text()] = {
							"icon": $("icon", val).text(), 
							"text": $("name", val).text()
						};
					}
				});
			}
		});

		// SOAPClient.invoke({
		// 	'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
		// 	'beforeSend': function (xhr){ 
		// 		if (server['httpAuth']['enabled'])
		// 			xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
		// 	},
		// 	'method': "getConfiguration", 
		// 	'parameters': pl, 
		// 	'async': true, 
		// 	'callback': function(r, xhr){
		// 		$(xhr).find("multiRef").each(function(i, val) {
		// 			console.log(val);
		// 		});
		// 	}
		// });

		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "getSavedFilters", 
			'parameters': pl, 
			'async': true, 
			'callback': function(r, xhr){
				server.savedFilters = $(xhr).find("multiRef").map(function(){
					var id = $("id", this).text();
					if(id){
						return {
							'name': $("name", this).text(),
							'id': id
						};
					} else {
						return null;
					}
				});
				console.log(server.savedFilters);
			}
		});

		SOAPClient.invoke({
			'url': soapUrl, 'username':server['httpAuth']['username'],'password':server['httpAuth']['password'], 
			'beforeSend': function (xhr){ 
				if (server['httpAuth']['enabled'])
					xhr.setRequestHeader('Authorization', "Basic " + btoa(server['httpAuth']['username'] + ':' + server['httpAuth']['password'])); 
			},
			'method': "getServerInfo", 
			'parameters': new SOAPClientParameters(), 
			'async': true, 
			'callback': function(r, xhr){
				var majVersion = $(xhr).find("version").text().split(".")[0];
				server.version = parseInt(majVersion);
			}
		});
		
		server.getProjects(function(xhr){
			server['projects'] = $(xhr).find("multiRef").map(function(el){
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
					server['users'][$("name", val).text()] = {
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
		server = _server
		self = this;
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
