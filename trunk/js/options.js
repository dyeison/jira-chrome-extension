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
	/*
	$("#username").attr("value",  localStorage.getItem('username'));
	$("#password").attr("value",  localStorage.getItem('password'));

	
	$("#attachmentEnabled").setChecked(chrome.extension.getBackgroundPage().loader.attachments);	
	$("#quickaddEnabled").setChecked(chrome.extension.getBackgroundPage().loader.quickadd);	
	*/
	$("#url").combobox({
		editable:true, 
		value:localStorage.getItem('url')?localStorage.getItem('url'):"http://jira.atlassian.com/"
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
	/*
	$.map(updateIntervalValues,function(val){
		$("#filterUpdate").append($("<OPTION  />").attr("value", val).text(val?val:chrome.i18n.getMessage( "optionsManualUpdateInterval")));
	});
	$("#filterUpdate").combobox({autocomplete:false});
	*/
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
			editFilter(new bg.JiraFilter({
				type: "jql",
				enabled: true,
				jql: request.jql,
				name: request.jql.substr(0,20)+'...'
			}));		
		}
	}
});

	function createServersTable(){

			oServers = $("#servers").dataTable( {
				"bLengthChange": false,
				"bPaginate": false,
				"bFilter": false,
				"bSort": false,
				"aaData": loader.servers?loader.servers:[],
				"aoColumns": [
						{"bVisible": false },
						{"sTitle": chrome.i18n.getMessage('optionsServerUrl')},
						{"sTitle": chrome.i18n.getMessage('optionsUsername')}
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
				"aaData": loader.filters?loader.filters:[],
				"aoColumns": [
						{	"bVisible": false },
						{	"sTitle": chrome.i18n.getMessage( "optionsFilterEnabled"), 
							"sClass":"icon",
							"sClass": "center ShortField",
							"bUseRendered":false, "fnRender": function(obj) { return (obj.aData[ obj.iDataColumn ])?"<span class=\"ui-icon ui-icon-check\"></span>":"";}},
						{"sTitle": chrome.i18n.getMessage('optionsFilterName')},
						{"sTitle": chrome.i18n.getMessage('optionsServerUrl')},
						{"sTitle": chrome.i18n.getMessage('optionsUpdateInterval'), "sClass":"icon", "fnRender": function(obj) { return obj.aData[ obj.iDataColumn ]?obj.aData[ obj.iDataColumn ]:chrome.i18n.getMessage('optionsManualUpdateInterval');}},
						{"sTitle": chrome.i18n.getMessage('optionsNotify'), "sClass":"icon", "fnRender": function(obj) { return obj.aData[ obj.iDataColumn ]?"<span class=\"ui-icon ui-icon-check\"></span>":'';}},
						{"sTitle": chrome.i18n.getMessage('optionsDesktopNotify'), "sClass":"icon", "fnRender": function(obj) { return obj.aData[ obj.iDataColumn ]?"<span class=\"ui-icon ui-icon-check\"></span>":'';}},
						{"sTitle": chrome.i18n.getMessage('optionsFilterColor'), "sClass":"icon", "fnRender": function(obj) { var c = obj.aData[ obj.iDataColumn ]; return c?"<span class='colorbox' style='background-color: "+c+"'></span>":"";}},
						{"sTitle": chrome.i18n.getMessage('optionsFilterJQL'), "sClass": "Summary"}
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
				$("#optionsFilterDelete").button({disabled:loader.filters[iSelectedFilter].type!='jql' || loader.filters[iSelectedFilter].id.toString()=="0" });
				$("#optionsFilterColumns").button({disabled:false});
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
					if(loader.filters[iSelectedFilter].type != 'filter'){
						loader.filters[iSelectedFilter].stop();
						loader.filters.splice(iSelectedFilter, 1);
						loader.filters.save();
						updateFilterTable(iSelectedFilter);
					}
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

/*
  function saveOptions(){
		chrome.extension.getBackgroundPage().loader.attachments = $("#attachmentEnabled").is(":checked");
		chrome.extension.getBackgroundPage().loader.quickadd = $("#quickaddEnabled").is(":checked");

	if(
		localStorage.getItem('username')!=$("#username").val() || 
		localStorage.getItem('password') != $("#password").val() ||
		localStorage.getItem('url') != $("#url").combobox('value')){
		
			localStorage.setItem('url', $("#url").combobox('value'));  
			loader.url = $("#url").combobox('value'); 
			loader.login($("#username").val(), $("#password").val(), function(res){
				console.log(res)
				if(typeof res == 'string'){
					$("#dlgCnnecting").html(res).dialog({
						width: 400,
						buttons: [{
							text: chrome.i18n.getMessage("close"),
							click: function(){
								$("#dlgCnnecting").dialog('close');
							}
						}]
					});
				} else {
					
					localStorage.setItem('username', $("#username").val());
					localStorage.setItem('password', $("#password").val());
					loader.update(function(){
						updateFilterTable();
						$("#tabPageFilters").show().click();
						$("#dlgCnnecting").dialog('close');
					});
				}
			});
			$("#dlgCnnecting").html('<center><img src="images/ajax-loader.gif">').dialog({
				modal: true,
				resizable: false,
				"title": chrome.i18n.getMessage("optionsDlgLoading")
			});			
	} else {
		chrome.extension.getBackgroundPage().Auth();
		alert("Settings was saved");
	}
  }
*/
  
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

	if (!filter){
		var iSelectedFilter = oFilters.fnGetSelectedPosition();
		filter = loader.filters[iSelectedFilter];
		console.log(filter);
	} else {
		window.oNewFilter = filter;
	}
	var server = loader.servers.get(filter.server);
	$(".optionsFilterType[value="+filter.type+"]").setChecked();
	$("#optionsFilterFilter").text('');
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
					filter.type = $("input[name=optionsFilterType]:checked").val();
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
	if (!server){
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