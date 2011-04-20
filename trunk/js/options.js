var optionsPage = this;
var countedFilterId;
var oFilters = null;
var loader = chrome.extension.getBackgroundPage().loader;
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

	var vals = [1, 3, 5, 10, 30, 60];
	var curval = parseInt(localStorage.getItem('updateinterval'))/(1000*60);
	$.map(vals,function(val){
		$("#updateinterval").append($("<OPTION  />").attr("value", val).text(val));
	});
	$("#updateinterval").val(curval).combobox({autocomplete:false});
	$("input[type=button]").button();
	
	updateFilterTable();

});

	function createFiltersTable(){
		console.log(loader.filters.length)
		if(loader.filters.length){
			oFilters = $("#filters").dataTable( {
				"bLengthChange": false,
				"bPaginate": false,
				"bFilter": false,
				"bSort": false,
				"aaData": loader.filters,
				"aoColumns": [
						{	"sTitle": chrome.i18n.getMessage( "optionsFilterCounter"), 
							"sClass": "center ShortField",
							"bUseRendered":false, "fnRender": function(obj) { return (obj.aData[ obj.iDataColumn ].toString() == loader.countedFilterId)?"<img src='images/counter.png'>":"";}},
						{	"sTitle": chrome.i18n.getMessage( "optionsFilterEnabled"), 
							"sClass": "center ShortField",
							"bUseRendered":false, "fnRender": function(obj) { return (obj.aData[ obj.iDataColumn ])?"<img src='images/bullet_tick.png'>":"";}},
						{"sTitle": chrome.i18n.getMessage('optionsFilterName')},
						{"sTitle": chrome.i18n.getMessage('optionsFilterJQL')}
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
			loader.filters[iSelectedFilter].id.toString()=="0" || loader.filters[iSelectedFilter].id.toString()==loader.countedFilterId
		});
		$("#optionsFilterShowCounter").button({disabled:loader.filters[iSelectedFilter].id.toString()==loader.countedFilterId});
		$("#optionsFilterEdit").button({disabled:loader.filters[iSelectedFilter].type!='jql'});
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
	
	function setCounterForFilter(){
		var iSelectedFilter = oFilters.fnGetSelectedPosition();
		loader.countedFilterId = loader.filters[iSelectedFilter].id.toString();
		localStorage.setItem('countedFilterId', loader.countedFilterId);
		updateFilterTable(iSelectedFilter);
		loader.getIssuesFromFilter(loader.filters[iSelectedFilter]);
	}

  function saveOptions(){
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
	$("#filterName").val(filter.name);
	$("#filterJQL").val(filter.jql);
	
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
					updateFilterTable(iSelectedFilter);		
					loader.getIssuesFromFilter(filter);
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
  