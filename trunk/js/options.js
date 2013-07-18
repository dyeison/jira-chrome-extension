/**
 * @preserve Copyright 2011 Andrey Vyrvich.
 * andry.virvich at google.com
 */


var optionsPage = this,
	countedFilterId,
	oFilters = null,
	oServers = null,
	bg = chrome.extension.getBackgroundPage(),
	loader = bg.loader;
	
$(document).ready(function(){

	$("#optionsServerAdd").click(addServer);
	$("#optionsServerEdit").click(editServer);
	$("#optionsServerDelete").click(deleteServer);
	$("#optionsFilterAdd").click(addFilter);
	$("#optionsFilterEdit").click(editFilter);
	$("#optionsFilterDisable").click(disableFilter);
	$("#optionsFilterDelete").click(deleteFilter);
	$("#url").combobox({
		editable:true, 
		value:localStorage.getItem('url')?localStorage.getItem('url'):"https://jira.atlassian.com/"
	});

	$("input[name=optionsFilterType]").change(function(){
		$(".filterType").hide();
		if(this.value == 'filter'){
			$("#optionsFilterFilterRow").show();
		} else if (this.value == 'jql'){
			$("#optionsFilterJQLRow").show();
		} else {
			$("#optionsFilterFeedRow").show();
		}
	});

	$("#httpauth").bind("change", function(){
		$(".httpAuthRow").setVisibility(this.checked);
	});
	$("#filterUpdate").slider({
			value:10,
			max: 60,
			slide: function( event, ui ) {
				$( "#filterUpdateAmount" ).text( ui.value?(ui.value + ", min"):chrome.i18n.getMessage("optionsManualUpdateInterval") );
			}
		});
	$("input[type=button]").button();
	$('#filterBadge').click(function(){	$('#optionsFilterColorRow').setVisibility(this.checked);});
	
	
	$('#colorSelector').ColorPicker({
		color: '#00ff00',
		onShow: function (colpkr) {
			$(colpkr).fadeIn(500);
			return false;
		},
		onHide: function (colpkr) {
			$(colpkr).fadeOut(500);
			return false;
		},
		onChange: function (hsb, hex, rgb) {
			$('#colorSelector div').css('backgroundColor', '#' + hex);
		}
	});
	
	updateServersTable();
	updateFilterTable();
	
	if(location.search){
		var request = JSON.parse(unescape(location.search.replace(/^\?/,'')));
		if(request.action == 'subscribe'){
			var server = loader.servers.get(request['serverId']);
			editFilter(new bg.JiraFilter({
				type: "jql",
				enabled: true,
				jql: request['jql'],
				server: server,
				name: request['jql'].substr(0,20)+'...'
			}));		
		}
	}
	

	$(".navbar-item").click(function(){
		$(".navbar-item").removeClass("navbar-item-selected");
		var tab = $(this);
		$(".tabPage").hide();
		tab.addClass("navbar-item-selected");
		$(document.getElementById(tab.attr("pagename"))).show();
	});
	$("#pageFilters  button").button();
	$("#pageMain  button").button();
	if(loader.servers.length){
		$("#tabPageFilters").click();
		toggleSelectedServer();
	}
});

	function createServersTable(){
		console.log(loader.servers?loader.servers:[])
			oServers = $("#servers").dataTable( {
				"bLengthChange": false,
				"bPaginate": false,
				"bFilter": false,
				"bSort": false,
				"aaData": $.map(loader.servers||[], function(server){return server}),
				"aoColumns": [
					{"bVisible": false, "mDataProp": "loggedIn"},
					{"sTitle": chrome.i18n.getMessage('optionsServerUrl'), "mDataProp": "url"},
					{"sTitle": chrome.i18n.getMessage('optionsUsername'), "mDataProp": "username"}
				]
			});
			$("#servers tbody tr").live('click', function () {
				oServers.fnSelect(this);
				toggleSelectedServer();
			} );

	
	}
	
	function createFiltersTable(){
		if(loader.filters.length){
			oFilters = $("#filters").dataTable( {
				"bLengthChange": false,
				"bPaginate": false,
				"bFilter": false,
				"bSort": false,
				"aaData": $.map(loader.filters||[], function(filter){return filter}),
				"aoColumns": [
						{
							"bVisible" : false,
							"mDataProp": "id"
						}, {
							"sTitle" : chrome.i18n.getMessage("optionsFilterEnabled"),
							"sClass" : "icon",
							"sClass" : "center ShortField",
							"bUseRendered" : false,
							"fnRender" : function (obj) {
								return (obj.aData[obj.iDataColumn]) ? "<span class=\"ui-icon ui-icon-check\"></span>" : "";
							},
							"mDataProp": "enabled"
						}, {
							"sTitle" : chrome.i18n.getMessage('optionsFilterName'),
							"mDataProp": "name"
						}, {
							"sTitle" : chrome.i18n.getMessage('optionsServerUrl'),
							"mDataProp": "url"
						}, {
							"sTitle" : chrome.i18n.getMessage('optionsUpdateInterval'),
							"sClass" : "updateInterval",
							"fnRender" : function (obj) {
								return obj.aData[obj.iDataColumn] ? obj.aData[obj.iDataColumn] : chrome.i18n.getMessage('optionsManualUpdateInterval');
							},
							"mDataProp": "updateInterval"
						}, {
							"sTitle" : chrome.i18n.getMessage('optionsNotify'),
							"sClass" : "icon",
							"fnRender" : function (obj) {
								return obj.aData[obj.iDataColumn] ? "<span class=\"ui-icon ui-icon-check\"></span>" : '';
							},
							"mDataProp": "notify"
						}, {
							"sTitle" : chrome.i18n.getMessage('optionsDesktopNotify'),
							"sClass" : "icon",
							"fnRender" : function (obj) {
								return obj.aData[obj.iDataColumn] ? "<span class=\"ui-icon ui-icon-check\"></span>" : '';
							},
							"mDataProp": "desktopNotify"
						}, {
							"sTitle" : chrome.i18n.getMessage('optionsFilterColor'),
							"sClass" : "icon",
							"fnRender" : function (obj) {
								var c = obj.aData[obj.iDataColumn];
								return c ? "<span class='colorbox' style='background-color: " + c + "'></span>" : "";
							},
							"mDataProp": "color"
						}, {
							"sTitle" : chrome.i18n.getMessage('optionsFilterJQL'),
							"sClass" : "Summary",
							"mDataProp": "jql"
						}
					]
			});
			$("#filters tbody tr").live('click', function () {
				oFilters.fnSelect(this);
				toggleSelectedFilter();
				
			} );
		}	
	
	}

	function toggleSelectedFilter(){
		var iSelectedFilter = oFilters.fnGetSelectedPosition();
		if(iSelectedFilter>=0){
			if(loader.filters[iSelectedFilter]){
				$("#optionsFilterDisable").button({disabled:false});
				$("#optionsFilterEdit").button({disabled:false});//loader.filters[iSelectedFilter].type!='jql'});
				//$("#optionsFilterDelete").button({disabled:loader.filters[iSelectedFilter].type!='jql' || loader.filters[iSelectedFilter].id.toString()=="0" });
				$("#optionsFilterDelete").button({disabled:false });
				$("#optionsFilterColumns").button({disabled:false});
				$("#optionsFilterShowType").button({disabled:loader.filters[iSelectedFilter].type=='feed'});
			}
		}
	}	
	
	function toggleSelectedServer(){
		$("#optionsServerDelete").button({disabled:false});
		$("#optionsServerEdit").button({disabled:false});
		$("#optionsFilterAdd").button({disabled:false});
	}
	
	function updateFilterTable(iSelectedFilter){
		if(!oFilters){
			createFiltersTable();
		} else {
			oFilters.fnClearTable();
			oFilters.fnAddData(loader.filters);
			if(typeof iSelectedFilter == 'number')
				oFilters.fnSelectRow(iSelectedFilter);
			toggleSelectedFilter();
		}
	}
	function updateServersTable(iSelectedServer){
		if(!oServers){
			createServersTable();
		} else {
			if(typeof iSelectedServer != 'number')
				iSelectedServer = oServers.fnGetSelectedPosition();
			oServers.fnClearTable();
			oServers.fnAddData(loader.servers);
			oServers.fnSelectRow(iSelectedServer);
			toggleSelectedServer();
		}
	}
	
	function disableFilter(){
		var iSelectedFilter = oFilters.fnGetSelectedPosition();
		loader.filters[iSelectedFilter].enabled = !loader.filters[iSelectedFilter].enabled;
		updateFilterTable(iSelectedFilter);
	}
	
	function deleteFilter(){
		
		$("#dlgAlert").dialog({
			title: chrome.i18n.getMessage("optionsDlgDeleteFilter"),
			buttons:[{
				text: chrome.i18n.getMessage("yes"),
				click: function(){
					var iSelectedFilter = oFilters.fnGetSelectedPosition();
					//if(loader.filters[iSelectedFilter].type != 'filter'){
						loader.filters[iSelectedFilter].stop();
						loader.filters.splice(iSelectedFilter, 1);
						loader.filters.save();
						updateFilterTable(iSelectedFilter);
					//}
					$("#dlgAlert").dialog('close');
				}
			},{
				text: chrome.i18n.getMessage("no"),
				click: function(){
					$("#dlgAlert").dialog('close');
				}			
			}]
		});
	}
  
  function addFilter(){
	var iSelectedServer = oServers.fnGetSelectedPosition(),
		server = loader.servers[iSelectedServer];
		console.log(loader)
		editFilter(new bg.JiraFilter({
						type: "jql",
						enabled: true,
						server: server
					}, loader));
  }
  
  function editFilter(filter){

	if (!filter || filter.originalEvent){
		var iSelectedFilter = oFilters.fnGetSelectedPosition();
		filter = loader.filters[iSelectedFilter];
		console.log(filter);
	} else {
		window.oNewFilter = filter;
	}
	var server = loader.servers.get(filter.server);
	$(".optionsFilterType[value="+filter.type+"]").setChecked();
	$(".optionsFilterShowType[value="+filter.show+"]").setChecked();
	$("#optionsFilterServer").empty();
	$.each(loader.servers, function(i, s){
		var opt = null;
		$("#optionsFilterServer").append(
			opt = $("<option />").text(s.url.replace(/https?:\/\//, '')).val(s.id)
		);
		if (server === s){
			opt.attr("selected", true);
		}
	});
	$("#optionsFilterServer").combobox({'editable': false});
	
	$("#optionsFilterFilter").empty();
	for (i in server.savedFilters){
		$("#optionsFilterFilter").append(
			$("<option />").val(server.savedFilters[i].id).text(server.savedFilters[i].name)
		)
	}
	$("#optionsFilterFilter").combobox({'editable': false});
		
	$("#filterId").val(filter.id);
	$("#filterServerId").val(filter.id);
	$("#filterEnabed").setChecked(filter.enabled);	
	$("#filterName").val(filter.name);
	$("#filterJQL").val(filter.jql);
	$("#optionsFilterJQLRow").setVisibility(filter.type=='jql');
	$("#filterNotify").setChecked(filter.notify);
	$("#filterDesktopNotify").setChecked(filter.desktopNotify);
	$("#filterUpdate").slider( "value" , filter.updateInterval);
	$("#filterUpdateAmount" ).text( filter.updateInterval?(filter.updateInterval + ", min"):chrome.i18n.getMessage("optionsManualUpdateInterval") );
	$("input[name=optionsFilterShowType][value=\""+filter.show+"\"]").attr("checked", true);
	$("#filterBadge").setChecked(filter.badge);
	$('#optionsFilterColorRow').setVisibility(filter.badge);

	$('#colorSelector').ColorPickerSetColor(filter.color);
	$('#colorSelector div').css('backgroundColor',filter.color);
	
	$("#filterColumns").empty().attr("filterid", filter.id);
	$.each(filter.columns, function(column, isVisible){
		$("#filterColumns").append(
			$("<span />").css({"width":"120px","display":"inline-block"}).append(
				$("<input />").attr("type", "checkbox").attr("id", column)
			).append(
				$("<span />").text(column)
			)
		);
		if(isVisible){
			$("#filterColumns #"+column).attr("checked", true);
		}
	});
	$("#dlgAddFilter").dialog({
		modal:true,
		width: 420,
		resizable: false,
		title: chrome.i18n.getMessage("optionsFilterAdd"),
		buttons: [{
				text: chrome.i18n.getMessage("optionsFilterSave"),
				click: function(){
					var filter = loader.filters.get($("#filterId").val());
					if(!filter){
						filter = window.oNewFilter; //new bg.JiraFilter({type:'jql', enabled: true});
						loader.filters.push(filter);
						var iSelectedFilter = loader.filters.length-1;
					} else {
						var iSelectedFilter = oFilters.fnGetSelectedPosition();
					}
					filter.server = $("#optionsFilterServer").val();
					filter.type = $("input[name=optionsFilterType]:checked").val();
					filter.show = $("input[name=optionsFilterShowType]:checked").val();
					if(filter.type == 'filter'){
						filter.id = $("#optionsFilterFilter").val();
						if(!$("#filterName").val()){
							$("#filterName").val($("#optionsFilterFilter").combobox('label'))
						}
					}
					filter.jql = $("#filterJQL").val();
					filter.feed = $("#optionsFilterFeed").val();
					filter.name = $("#filterName").val();
					filter.updateInterval = parseInt($("#filterUpdate").slider( "value"));
					filter.enabled = $("#filterEnabed").is(":checked");
					filter.notify = $("#filterNotify").is(":checked");
					filter.desktopNotify = $("#filterDesktopNotify").is(":checked");
					filter.badge = $("#filterBadge").is(":checked");
					filter.color = filter.badge?$('#colorSelector div').css('backgroundColor'):filter.color;
					$.each(filter.columns, function(c, v){
						filter.columns[c] = $("#filterColumns #"+c).is(":checked");
					});
					loader.filters.save();
					updateFilterTable(iSelectedFilter);
					filter.update();
					
					$("#dlgAddFilter").dialog('close');
				}
		},{
				text: chrome.i18n.getMessage("cancel"),
				click: function(){
					$("#dlgAddFilter").dialog('close');
				}
		}]
	})
  }
  function addServer(){
	editServer(new bg.JiraServer('',loader));
  }
  
  function editServer(server){
	var bNew = true,
		iSelectedServer;
	if (!server || server.eventPhase){
		bNew = false;
		var iSelectedServer = oServers.fnGetSelectedPosition();
		server = loader.servers[iSelectedServer];
	}
	
	$("#username").val(server.username);
	$("#password").val(server.password);
	$("#httpauth").setChecked(server.httpAuth.enabled);
	$("#httpauthUsername").val(server.httpAuth.username);
	$("#httpauthPassword").val(server.httpAuth.password);

	$("#dlgAddServer").dialog({
		modal:true,
		width: 420,
		resizable: false,
		title: chrome.i18n.getMessage("optionsServerAdd"),
		buttons: [{
				text: chrome.i18n.getMessage("optionsServerSave"),
				click: function(){
					server.url = $("#url").combobox('value');
					var param = {
						username: $("#username").val(),
						password: $("#password").val(),
						httpAuth: {
							enabled : $("#httpauth").is(":checked"),
							username : $("#httpauthUsername").val(),
							password : $("#httpauthPassword").val()
						},
						success: function(server){
							if(bNew){
								iSelectedServer = loader.servers.push(server);
							}
							loader.servers.save();
							updateServersTable(iSelectedServer);
							$("#dlgAddServer").dialog('close');
						},
						error: function(e){
							alert(e);
						}
					};
					server.login(param);	
				}
		},{
				text: chrome.i18n.getMessage("cancel"),
				click: function(){
					$("#dlgAddServer").dialog('close');
				}
		}]
	});
  }
  
  function deleteServer(){
		var iSelectedServer = oServers.fnGetSelectedPosition();
		loader.servers.splice(iSelectedServer, 1);
		updateServersTable();
  }
  
(function($)  {
   $.fn.extend({
      setChecked : function(state)  {
		if (state)
			return this.filter(":radio, :checkbox").attr("checked", true);
		else 
			return this.filter(":radio, :checkbox").removeAttr("checked");
      },
      setVisibility : function(state)  {
		if (state)
			return this.show();
		else 
			return this.hide();
      }
   });
}(jQuery));