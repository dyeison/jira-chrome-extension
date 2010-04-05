var jira = {
		serverUrl:null,
		resolutinos: null,
		issuetypes: null,
		priorities: null,
		statuses: null,
		init: function(){
			jira.serverUrl = localStorage.getItem("url");
			jira.resolutions = chrome.extension.getBackgroundPage().loader.resolutions;
			jira.issuetypes = chrome.extension.getBackgroundPage().loader.issuetypes;
			jira.priorities = chrome.extension.getBackgroundPage().loader.priorities;
			jira.statuses = chrome.extension.getBackgroundPage().loader.statuses;
			
			if(jira.serverUrl)
			{
				jira.initHeaderLinks();
				if(localStorage.getItem('error')!="")
				{
					jira.error(localStorage.getItem('error'));
				 } else {
					try{
						jira.getXml("AssignedToMe", function(xhr){
							jira.addTab("assignedtome", "Assigned to me");
							jira.renderTableFromXml("assignedtome", xhr);
						});
						jira.getIssuesFromFilter();
					}catch(e){
						alert(e);
					}
				}
			} else {
				jira.error('Configure first!');
			}
		},
		getIssuesFromFilter: function(){
			var filters = chrome.extension.getBackgroundPage().loader.filters;
			$.map(filters, function(item, i){
					jira.addTab("IssuesFromFilter_" + item.id, item.name);
			});
			jira.tabs();
			$.map(filters, function(item, i){
				jira.getXml("IssuesFromFilter_" + item.id, function(xhr){
					jira.renderTableFromXml("IssuesFromFilter_" + item.id, xhr);
				});					
			});
		},
		renderTableFromXml: function(id, xhr){
			try{
				var data = [];
				$(xhr).find("multiRef").each(function(i, val) {
						if($("key", val).text())
						{
							data.push([
								$("type", val).text(),
								$("key", val).text(),
								$("summary", val).text(),
								$("assignee", val).text(),
								jira.getDate($("duedate", val).text()),
								parseInt($("priority", val).text()),
								jira.getResolution($("resolution", val).text()),
								$("status", val).text(),
							]);
						}
				});
				$("#table_"+id).dataTable( {
				"bJQueryUI": false,
				"aaData": data,
				"aaSorting": [[ 5, "asc" ]],
				"aoColumns": [
						{ "sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { return (jira.issuetypes[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.issuetypes[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.issuetypes[obj.aData[ obj.iDataColumn ]].icon +"'>"):"";}},
						{ "sTitle": "Key",  "fnRender": function(obj) { return "<a target='_blank' href=\""+jira.url("/browse/"+ obj.aData[ obj.iDataColumn ])+"\">"+obj.aData[ obj.iDataColumn ]+"</a>" ;}},
						{ "sTitle": "Summary", "sClass": "Summary"},
						{ "sTitle": "Assignee",  "fnRender": function(obj) { if(obj.aData[ obj.iDataColumn ].length>10)return obj.aData[ obj.iDataColumn ].substr(0, 10)+"..."; else return obj.aData[ obj.iDataColumn ];}},
						{ "sTitle": "Due date", "sClass": "Date"},
						{ "sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { return (jira.priorities[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.priorities[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.priorities[obj.aData[ obj.iDataColumn ]].icon+"'>"):"";}},
						{"sTitle": "Res.", "sClass": "ShortField"},
						{ "sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { return (jira.statuses[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.statuses[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.statuses[obj.aData[ obj.iDataColumn ]].icon+"'>"):"";}},
					]
				} );	
			}catch(e){
				alert(e);
			}
		},
		addTab: function(id, name){
			$("#tabHeader").append($("<LI />").append($("<A />").attr("href", "#"+id).text(name)));
			$("#tabs").append(
				$("<DIV />").attr("id", id).append(
					$("<TABLE />").attr("id", "table_"+id).addClass("display")
				).append($("<BR />"))
			);
		},
		getXml: function(name, callback){
				var sXml = localStorage.getItem(name);
				var data = (new DOMParser()).parseFromString(sXml, "text/xml");
				callback(data);
		},
		getDate: function(str){
			if(str!='' && typeof(str)!="undefined"){
				try{
					var d= parseXSDDateString(str);
					return (d.getMonth()+1) + "." +d.getDate() + "." + d.getFullYear();
				}catch(e){
					return '';
				}
			} else {
				return '';
			}
		},
		getResolution: function(id){
			if(id == ''){
				return '<span style="color:#880000; font-size:8px;">UNRESOLVED</span>';
			}else{
				return jira.resolutions[id];
			}
		},
		error: function(err){
			$("body").append($("<DIV />").addClass("error").text(err)).
				append($("<HR />")).
				append($("<INPUT />").attr("type","button").attr("value", "Options").click(function(){
						var url = chrome.extension.getURL('options.html');
						chrome.tabs.create({ url: url, selected: true });
				})
			);
			$("#tabs").hide();
		}, 
		tabs: function(){
						$('#tabs').tabs({
						select: function(event, ui) {
							localStorage.setItem('lastOpenedTab', ui.index);
						},
						selected: (localStorage.getItem('lastOpenedTab')?localStorage.getItem('lastOpenedTab'):0)
					});
		},
		initHeaderLinks: function(){
				$("#HeaderLink").append(
					$("<a />").addClass("HeaderLink").attr("href", jira.url('/secure/ManageFilters.jspa')).attr("target", "_blank").text("Manage Filters")
				).append(
					$("<a />").addClass("HeaderLink").attr("href", chrome.extension.getURL('options.html')).attr("target", "_blank").text("Options")
				).append(
					$("<a />").addClass("HeaderLink").attr("href", "javascript:{chrome.extension.getBackgroundPage().loader.update();window.close();}").text("Update issues")
				);
		},
		url: function(str){
			return (jira.serverUrl + str);
		}
}

$(window).load(function () {
	setTimeout(jira.init, 0);
});