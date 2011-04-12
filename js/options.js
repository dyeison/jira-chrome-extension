var countedFilterId;
var oFilters = null;
var loader = chrome.extension.getBackgroundPage().loader;
$(document).ready(function(){
	$("#username").attr("value",  localStorage.getItem('username'));
	$("#password").attr("value",  localStorage.getItem('password'));
	$("#url").combobox({
		editable:true, 
		value:localStorage.getItem('url')?localStorage.getItem('url'):"http://jira.atlassian.com/"
	});//

	var vals = [1, 3, 5, 10, 30, 60];
	var curval = parseInt(localStorage.getItem('updateinterval'))/(1000*60);
	$.map(vals,function(val){
		$("#updateinterval").append($("<OPTION  />").attr("value", val).text(val));
	});
	$("#updateinterval").val(curval).combobox();
	$("input[type=button]").button();
	
	updateFiltesTable();

});

	function updateFiltesTable(){
	
		if(loader.filters.length){
			countedFilterId =  localStorage.getItem('countedFilterId');
			if(countedFilterId == null)
				countedFilterId = 0;
				console.log(loader.filters)
			oFilters = $("#filters").dataTable( {
				"bLengthChange": false,
				"bPaginate": false,
				"bFilter": false,
				"bSort": false,
				"aaData": loader.filters,
				"aoColumns": [
						{	"sTitle": chrome.i18n.getMessage( "optionsFilterCounter"), 
							"sClass": "center ShortField",
							"bUseRendered":false, "fnRender": function(obj) { return (obj.aData[ obj.iDataColumn ].toString() == countedFilterId)?"<img src='images/counter.png'>":"";}},
						{	"sTitle": chrome.i18n.getMessage( "optionsFilterEnabled"), 
							"sClass": "center ShortField",
							"bUseRendered":false, "fnRender": function(obj) { return (obj.aData[ obj.iDataColumn ])?"<img src='images/bullet_tick.png'>":"";}},
						{"sTitle": chrome.i18n.getMessage('optionsFilterName')}
					]
			})
			$("#filters tbody tr").live('click', function () {
				oFilters.fnSelect(this);
				toggleSelectedFilter();
				
			} );
		}	
	
	}

	function toggleSelectedFilter(){
		var iSelectedFilter = oFilters.fnGetSelectedPosition();
		$("#optionsFilterDisable").button({disabled:
			loader.filters[iSelectedFilter].id.toString()=="0" || loader.filters[iSelectedFilter].id.toString()==countedFilterId
		});
		$("#optionsFilterShowCounter").button({disabled:loader.filters[iSelectedFilter].id.toString()==countedFilterId});
	}
	
	function updateFilterTable(iSelectedFilter){
		oFilters.fnClearTable();
		oFilters.fnAddData(loader.filters);
		if(typeof iSelectedFilter == 'number')
			oFilters.fnSelectRow(iSelectedFilter);
		toggleSelectedFilter();	
	}
	
	function disableFilter(){
		var iSelectedFilter = oFilters.fnGetSelectedPosition();
		loader.filters[iSelectedFilter].enabled = !loader.filters[iSelectedFilter].enabled;
		updateFilterTable(iSelectedFilter);
	}
	
	function setCounterForFilter(){
		var iSelectedFilter = oFilters.fnGetSelectedPosition();
		countedFilterId = loader.filters[iSelectedFilter].id.toString();
		localStorage.setItem('countedFilterId', countedFilterId);
		updateFilterTable(iSelectedFilter);
	}

  function saveOptions(){


	
	localStorage.setItem('countedFilterId', countedFilterId);
	localStorage.setItem('updateinterval', parseInt($("#updateinterval").attr("value"))*60000);
	
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
					loader.update();
					window.setInterval(loader.update, localStorage.getItem('updateinterval'));
					
					loader.updateFavoritesFilters(function(){
						$("#tabPageFilters").show().click();
						$("#dlgCnnecting").dialog('close');
					});
				}
			});
			$("#dlgCnnecting").html('<center><img src="images/ajax-loader.gif">').dialog({
				modal: true,
				"title": chrome.i18n.getMessage("optionsDlgLoading")
			});			
	} else {
		chrome.extension.getBackgroundPage().Auth();
		alert("Settings was saved");
	}
  }
  
  function addFilter(){
	$("#dlgAddFilter").dialog({
		modal:true,
		width: 420,
		title: chrome.i18n.getMessage("optionsFilterAdd"),
		buttons: [{
				text: chrome.i18n.getMessage("optionsFilterAdd"),
				click: function(){
					var newFilter = new Filter({
						name: $("#filterName").attr("value"),
						type: "jql",
						enabled: true,
						jql: $("#filterJQL").attr("value")
					});
					loader.filters.push(newFilter);
					loader.getIssuesFromFilter(newFilter);
					loader.updateFavoritesFilters(function(){
						updateFilterTable(loader.filters.length-1);
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
  