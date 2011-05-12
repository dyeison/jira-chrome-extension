/**
 * @preserve Copyright 2011 Andrey Vyrvich.
 * andry.virvich at google.com
 */

function FiltersArray(){
	this.load();
	var self = this,
		badgeItem = 0,
		timer = null;
	
	this.statrBadgeAnimation = function(){
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

	this.updateBadge = function(){
		console.log('update');
		if(this[badgeItem].badge){
			chrome.browserAction.setBadgeBackgroundColor({color: hex2rgb(this[badgeItem].color)})
			chrome.browserAction.setBadgeText({text: this[badgeItem].issues.length.toString()});
			badgeItem = badgeItem+1>=this.length?0:badgeItem+1;
		} else {
			badgeItem = badgeItem+1>=this.length?0:badgeItem+1;
		}
	}
}
FiltersArray.prototype = new Array;
FiltersArray.prototype.get = function (id){
	var res = null;
	var i = this.index(id);
	if(i>=0){
		res = this[i];
	}
	return res;
}
FiltersArray.prototype.index = function (id){
	var res = -1;
	$.each(this, function(i, el){
		if (el.id.toString() == id.toString()){
			res = i;
			return false;
		}
	});
	return res;
}

FiltersArray.prototype.save = function (){
	localStorage.setItem('filters', JSON.stringify(this));
}

FiltersArray.prototype.load = function (){
	var self = this;
	if(localStorage.getItem('filters')){
		$.each(JSON.parse(localStorage.getItem('filters')), function(i, data){
				self.push(new Filter(data));
			}
		);
	} else {
		this.push(new Filter({
			id:"0", 
			enabled: true,
			name:"Assigned to me",
			type: 'jql',
			jql: "assignee = currentUser() AND resolution = unresolved ORDER BY duedate ASC, priority DESC, created ASC"
		}));
		this.save();
	}
}
FiltersArray.prototype.swap = function (x,y) {
  var b = this[x];
  this[x] = this[y];
  this[y] = b;
  return this;
}

FiltersArray.prototype.update = function(id, callback){
	if(typeof id != undefined){
		this.get(id).update(callback);
	} else {
		$.each(this, function(i, filter){
			filter.update(callback);
		});
	}
}


function Filter(param){
	this.columns = {
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
	$.extend(this.columns, param.columns);
	function randomId(){
		var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
		var string_length = 8;
		var randomstring = '';
		for (var i=0; i<string_length; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomstring += chars.substring(rnum,rnum+1);
		}
		return randomstring;
	}

	this.id = (typeof param.id != 'undefined')?param.id:randomId();
	this.name = param.name;
	this.type = (typeof param.type != 'undefined')?param.type:'filter';
	this.enabled = (typeof param.enabled != 'undefined') && param.enabled;
	this.updateInterval = (typeof param.updateInterval != 'undefined')?parseInt(param.updateInterval):10;
	this.notify = (typeof param.notify != 'undefined')?param.notify:(param.id == "0");
	this.badge = (typeof param.badge != 'undefined')?param.badge:(param.id == "0");
	this.color = (typeof param.color != 'undefined')?param.color:'#00ff00';
	
	if(this.type=='jql'){
		this.jql  = param.jql;
	}
	if(param.id == "0"){
		this.jql = "assignee = currentUser() AND resolution = unresolved ORDER BY duedate ASC, priority DESC, created ASC";
	}
	
	var timer = null,
		self = this;
	this.update = function(callback){
		if(timer){
			clearTimeout(timer);
		}
		if(this.enabled){
			loader.getIssuesFromFilter(this, callback);
		}
		if(this.updateInterval){
			setTimeout(function(){
				self.update();
			},this.updateInterval*60000);
		}
	}
}

Filter.prototype.toArray = function(){
	return [this.id, this.enabled, this.name, this.updateInterval, this.notify, this.badge?this.color:'', this.jql?this.jql:''];
}

Filter.prototype.issues = new Array;


