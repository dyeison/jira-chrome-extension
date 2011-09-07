function JiraFiltersArray(_loader){
	var self = this,
		badgeItem = 0,
		timer = null,
		loader = _loader;
	self.statrBadgeAnimation = function(){
		console.log('start');
		if(timer){
			badgeItem = 0;
			window.clearInterval(timer);
		}
		window.setTimeout(function(){
			self.updateBadge();
		}, 1000);
		timer = window.setInterval(function(){
				self.updateBadge();
			}, 10000);
	}
	self.updateBadge = function(){
		if(self[badgeItem] && self[badgeItem].badge){
			chrome.browserAction.setBadgeBackgroundColor({color: self[badgeItem].rgb})
			chrome.browserAction.setBadgeText({text: self[badgeItem].issues.length.toString()});
			badgeItem = badgeItem+1>=self.length?0:badgeItem+1;
		} else {
			badgeItem = badgeItem+1>=self.length?0:badgeItem+1;
		}
	};
	self.save = function (){
		loader.setItem('filters', JSON.stringify(self));
	}

	self.load = function (){
		if(loader.getItem('filters')){
			$.each(JSON.parse(loader.getItem('filters')), function(i, data){
					self.push(new JiraFilter(data, loader));
				}
			);
		} /*else {
			self.push(new JiraFilter({
				id:"0", 
				enabled: true,
				name:"Assigned to me",
				type: 'jql',
				jql: "assignee = currentUser() AND resolution = unresolved ORDER BY duedate ASC, priority DESC, created ASC"
			}, loader));
			self.save();
		}*/
	}
	self.load();
	self.statrBadgeAnimation();
}
JiraFiltersArray.prototype = new Array;
JiraFiltersArray.prototype.get = function (id){
	var res = null;
	var i = this.index(id);
	if(i>=0){
		res = this[i];
	}
	return res;
}
JiraFiltersArray.prototype.index = function (id){
	var res = -1
	$.each(this, function(i, el){
		if (el.id.toString() == id.toString()){
			res = i;
			return false;
		}
	});
	return res;
}

JiraFiltersArray.prototype.swap = function (x,y) {
  var b = this[x];
  this[x] = this[y];
  this[y] = b;
  return this;
}

JiraFiltersArray.prototype.update = function(id, callback){
	if(typeof id != 'undefined'){
		this.get(id).update(callback);
	} else {
		$.each(this, function(i, filter){
			filter.update(callback);
		});
	}
}
window['JiraFiltersArray'] = JiraFiltersArray;

function JiraFilter(param, loader){
	var server = (param.server)?((typeof param.server == 'string')?loader.servers.get(param.server):param.server):loader.servers[0],
		timer = null,
		data = null,
		self = this;
	self.columns = {
		type: true,
		key: true,
		summary: true,
		assignee: true,
		duedate: true,
		priority: true,
		resolution: true,
		status: true,
		key: true,
		worklog: true
	}
	$.extend(self.columns, param.columns);
	self.__defineGetter__("rgb", function(){return hex2rgb(self.color);});
	self.__defineGetter__("url", function(){return server.url;});
	self.getData = function(){return data;}
	function randomId(){
		var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz",
			string_length = 8,
			randomstring = '';
		for (var i=0; i<string_length; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomstring += chars.substring(rnum,rnum+1);
		}
		return randomstring;
	}
	self.id = (typeof param.id != 'undefined')?param.id:randomId();
	self.name = param.name;
	self.type = (typeof param.type != 'undefined')?param.type:'filter';
	self.enabled = (typeof param.enabled != 'undefined') && param.enabled;
	self.updateInterval = (typeof param.updateInterval != 'undefined')?parseInt(param.updateInterval):10;
	self.notify = (typeof param.notify != 'undefined')?param.notify:(param.id == "0");
	self.desktopNotify = (typeof param.desktopNotify != 'undefined')?param.desktopNotify:(param.id == "0");
	self.badge = (typeof param.badge != 'undefined')?param.badge:(param.id == "0");
	self.color = (typeof param.color != 'undefined')?param.color:'#00ff00';
	self.server = server['id'];
	console.log('server', server);
	self.__defineGetter__('keys', function(){ console.log('server', server);var sKeys = server.getItem(".keys"); return (sKeys)?sKeys.split(","):[];});
	self.__defineSetter__('keys', function(keys){ server.setItem(".keys", keys.toString()); });
	if(self.type=='jql'){
		self.jql  = param.jql;
	} else if(self.type=='feed'){
		self.feed  = param.feed;
	}
	if(param.id == "0"){
		self.type = 'jql';
		self.jql = "assignee = currentUser() AND resolution = unresolved ORDER BY duedate ASC, priority DESC, created ASC";
	}
		
	self['update'] = function(callback){
		if(timer){
			clearTimeout(timer);
		}
		if(self.enabled){
			if(self.type == 'feed'){
				server.ajax({
					'url': self.feed,
					'success': function(_data){
						data = _data;
					}
				});
			} else {
				server.getIssuesFromFilter(self, callback);
			}
		} 
		if(self.updateInterval){
			timer = setTimeout(function(){
				self.update();
			}, self.updateInterval*60000);
		}
	};
	
	self.stop = function(){
		if (timer){
			clearTimeout(timer);
		}
	};

	self['toArray'] = function(){
		return [self.id, self.enabled, self.name, self.url, self.updateInterval, self.notify, self.desktopNotify, self.badge?self.color:'', self.jql?self.jql:''];
	};
	
	self.showNotifications = function(){
		if(self.desktopNotify){
			var keys = [];
			$.each(self.issues, function(i, val){
					keys.push(val[1]);
					if(self.keys.length && $.inArray(val[1], self.keys)<0){
							var notification = webkitNotifications.createNotification(
							  'images/logo-48.png', // icon url - can be relative
							  self.name + ":  " + self.issues[i][1],  	// notification title
							  self.issues[i][2] 	// notification body text
							);
							notification.onclick = function(event){
								server.addTab(server.url +"/browse/"+val[1]); 
								event.currentTarget.cancel(); 
							}
							notification.ondisplay = function(event){
								setTimeout((function (notif){return function(){notif.cancel();}})(event.currentTarget), 10000);
							}
							notification.onclose = function(event){
								server.notifications = $.map(server.notifications,function(notif){
									if (notif == event.currentTarget)
										return null;
									else 
										return notif;
								});
							}						
							notification.show();
							server.notifications.push(notification);
					}
			});
			self.keys = keys;
		}
	};
	
	function hex2rgb(hex) {
		var rx=/rgb\((\d+), (\d+), (\d+)\)/;
		if(rx.test(hex)){
			var res = rx.exec(hex);
			return [parseInt(res[1]), parseInt(res[2]), parseInt(res[3]), 255];
		} else {
			var hex = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);
			return [hex >> 16, (hex & 0x00FF00) >> 8,  (hex & 0x0000FF), 255];
		}
	}	
}

JiraFilter.prototype.issues = new Array;
window['JiraFilter'] = JiraFilter;

