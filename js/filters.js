/**
 * @preserve Copyright 2011 Andrey Vyrvich.
 * andry.virvich at google.com
 */


function FiltersArray(){
	this.load();
}
FiltersArray.prototype = new Array;
FiltersArray.prototype.get = function (id){
	var res = null;
	var i = this.index(id);
	if(i>=0){
		res = this[id];
	}
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


function Filter(param){

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
	if(this.type=='jql'){
		this.jql  = param.jql;
	}
	if(param.id == "0"){
		this.jql = "assignee = currentUser() AND resolution = unresolved ORDER BY duedate ASC, priority DESC, created ASC";
	}
}

Filter.prototype.toArray = function(){
	return [this.id, this.enabled, this.name, this.jql?this.jql:''];
}
