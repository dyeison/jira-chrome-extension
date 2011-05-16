/**
 * @preserve Copyright 2011 Andrey Vyrvich.
 * andry.virvich at google.com
 */


var optionsPage = this,
	countedFilterId,
	oFilters = null,
	loader = chrome.extension.getBackgroundPage().loader,
	updateIntervalValues = [0, 1, 3, 5, 10, 30, 60];
	
$(document).ready(function(){
	$("#username").attr("value",  localStorage.getItem('username'));
	$("#password").attr("value",  localStorage.getItem('password'));
	/*
	if(localStorage.getItem('omniboxEnabled') =='true' )
		$("#omniboxEnabled").attr("checked", 'true');
	$("#omniboxEnabled").click(function(){
		localStorage.setItem('omniboxEnabled', this.checked);
	});
	*/
	$("#url").combobox({
		editable:true, 
		value:localStorage.getItem('url')?localStorage.getItem('url'):"http://jira.atlassian.com/"
	});//

	$.map(updateIntervalValues,function(val){
		$("#filterUpdate").append($("<OPTION  />").attr("value", val).text(val?val:chrome.i18n.getMessage( "optionsManualUpdateInterval")));
	});
	$("#filterUpdate").combobox({autocomplete:false});
	$("input[type=button]").button();
	$('#filterBadge').click(function(){		$('#optionsFilterColorRow').setVisibility(this.checked);	});
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
	updateFilterTable();

});

	function createFiltersTable(){
		if(loader.filters.length){
			oFilters = $("#filters").dataTable( {
				"bLengthChange": false,
				"bPaginate": false,
				"bFilter": false,
				"bSort": false,
				"aaData": loader.filters?loader.filters:[],
				"aoColumns": [
						{	"bVisible":false,"sTitle": chrome.i18n.getMessage( "optionsFilterCounter"), 
							"sClass": "center ShortField",
							"bUseRendered":false, "fnRender": function(obj) { return (obj.aData[ obj.iDataColumn ].toString() == loader.countedFilterId)?"<img src='images/counter.png'>":"";}},
						{	"sTitle": chrome.i18n.getMessage( "optionsFilterEnabled"), 
							"sClass":"icon",
							"sClass": "center ShortField",
							"bUseRendered":false, "fnRender": function(obj) { return (obj.aData[ obj.iDataColumn ])?"<span class=\"ui-icon ui-icon-check\"></span>":"";}},
						{"sTitle": chrome.i18n.getMessage('optionsFilterName')},
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
						loader.filters.splice(iSelectedFilter, 1);
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


  function saveOptions(){
	if(
		localStorage.getItem('username')!=$("#username").attr("value") || 
		localStorage.getItem('password') != $("#password").attr("value") ||
		localStorage.getItem('url') != $("#url").combobox('value')){
		
			localStorage.setItem('url', $("#url").combobox('value'));  
			loader.url = $("#url").combobox('value'); 
			loader.login($("#username").attr("value"), $("#password").attr("value"), function(res){
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
					
					localStorage.setItem('username', $("#username").attr("value"));
					localStorage.setItem('password', $("#password").attr("value"));
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
  
  function addFilter(){
	editFilter(new Filter({
						type: "jql",
						enabled: true
					}));
  }
  
  function editFilter(filter){
	if (!filter){
		var iSelectedFilter = oFilters.fnGetSelectedPosition();
		filter = loader.filters[iSelectedFilter];
	}
	$("#filterId").val(filter.id);
	$("#filterEnabed").setChecked(filter.enabled);	
	$("#filterName").val(filter.name);
	$("#filterJQL").val(filter.jql);
	$("#optionsFilterJQLRow").setVisibility(filter.type=='jql');
	$("#filterUpdate").val(filter.jql);
	$("#filterNotify").setChecked(filter.notify);
	$("#filterUpdate").combobox('value', filter.updateInterval);
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
						filter = new Filter({type:'jql', enabled: true});
						loader.filters.push(filter);
						var iSelectedFilter = loader.filters.length-1;
					} else {
						var iSelectedFilter = oFilters.fnGetSelectedPosition();
					}
					filter.jql = $("#filterJQL").val();
					filter.name = $("#filterName").val();
					filter.updateInterval = parseInt($("#filterUpdate").attr("value"));
					filter.enabled = $("#filterEnabed").is(":checked");
					filter.notify = $("#filterNotify").is(":checked");
					filter.badge = $("#filterBadge").is(":checked");
					filter.color = filter.badge?$('#colorSelector div').css('backgroundColor'):filter.color;
					$.each(filter.columns, function(c, v){
						filter.columns[c] = $("#filterColumns #"+c).is(":checked");
					});
					updateFilterTable(iSelectedFilter);
					loader.updateFavoritesFilters(function(){
						loader.getIssuesFromFilter(filter);
					});
					
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