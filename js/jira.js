var jira = {
		serverUrl:null,
		resolutions: null,
		issuetypes: null,
		priorities: null,
		statuses: null,
		init: function(){
			
			jira.serverUrl = localStorage.getItem("url");
			jira.resolutions = chrome.extension.getBackgroundPage().loader.resolutions;
			jira.issuetypes = chrome.extension.getBackgroundPage().loader.issuetypes;
			jira.priorities = chrome.extension.getBackgroundPage().loader.priorities;
			jira.statuses = chrome.extension.getBackgroundPage().loader.statuses;
			
			for (i in jira.resolutions){
				console.log(jira.resolutions[i])
				$("#progressResolution").append(
					$("<option />").val(i).text(jira.resolutions[i])
				)
			}
			$("#progressIsResolved").click(function(){
				$("#progressResolution").attr("disabled", !this.checked);
			})
			
			$("span#title").click(function(){
				chrome.extension.getBackgroundPage().loader.addTab(jira.url(""));
			}).css("cursor", "pointer");
			
			jQuery.fn.dataTableExt.oSort['string-date-asc']  = function(x,y) {
				if(x == "") return (y=="")?0:1;
				if(y == "") return (x=="")?0:-1;
				var xa = x.split("-");
				var ya = y.split("-");
				//return (new Date(xa[0],xa[1],xa[2]) > new Date(ya[0],ya[1],ya[2]))
				return ((x < y) ? -1 : ((x > y) ?  1 : 0));
			};
			jQuery.fn.dataTableExt.oSort['string-date-desc']  = function(x,y) {
				return -1* jQuery.fn.dataTableExt.oSort['string-date-asc'](x,y);
			};	
			
			if(jira.serverUrl)
			{
				$("#quicksearch").attr("action", jira.url("/secure/QuickSearch.jspa"));
				jira.initHeaderLinks();
				if(localStorage.getItem('error')!="")
				{
					jira.error(localStorage.getItem('error'));
				 } else {
						jira.addTab("assignedtome", "Assigned to me");
						if(typeof(chrome.extension.getBackgroundPage().loader.issuesFromFilter["assignedtome"]) == "string")
							$("#table_assignedtome").append(
								$("<tr />").append($("<td />").text(chrome.extension.getBackgroundPage().loader.issuesFromFilter["assignedtome"]))
							);
						else
							jira.renderTableFromXml("assignedtome");
						jira.getIssuesFromFilter();
				}
			} else {
				$("#quicksearch").hide();
				jira.error('Configure first!');
			}
		},
		getIssuesFromFilter: function(){
			var filters = chrome.extension.getBackgroundPage().loader.filters;
			filters = filters.sort(function(a,b){return (a.id-b.id)});
			var str = '';
			$.map(filters, function(item, i){
					jira.addTab(item.id, item.name);
			});
			jira.tabs();
			$.map(filters, function(item, i){
					jira.renderTableFromXml(item.id);
		
			});
		},
		renderTableFromXml: function(id){
		
				$("#table_"+id).dataTable( {
				"bJQueryUI": false,
				"aaData": chrome.extension.getBackgroundPage().loader.issuesFromFilter[id],
				"aaSorting": [[4, "asc"],[ 5, "asc" ]],
				"aoColumns": [
						{ "sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { 
							return (jira.issuetypes[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.issuetypes[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.issuetypes[obj.aData[ obj.iDataColumn ]].icon +"'>"):"";}},
						{ "sTitle": "Key",  "fnRender": function(obj) { 
							return "<a target='_blank' href=\""+jira.url("/browse/"+ obj.aData[ obj.iDataColumn ])+"\">"+obj.aData[ obj.iDataColumn ]+"</a>" ;}},
						{ "sTitle": "Summary", "sClass": "Summary"},
						{ "sTitle": "Assignee",  "fnRender": function(obj) { 
							if(obj.aData[ obj.iDataColumn ] && obj.aData[ obj.iDataColumn ].length>10)return obj.aData[ obj.iDataColumn ].substr(0, 10)+"..."; else return obj.aData[ obj.iDataColumn ];}},
						{ "sType": "string-date","sTitle": "Due date",  "fnRender": function(obj) {
							return obj.aData[ obj.iDataColumn ]?chrome.extension.getBackgroundPage().loader.getDate(obj.aData[ obj.iDataColumn ]):"";
						}, "sClass": "Date"},
						//{ "sTitle": "Est.", "sClass": "Date"},
						{ "sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { return (jira.priorities[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.priorities[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.priorities[obj.aData[ obj.iDataColumn ]].icon+"'>"):"";}},
						{"sTitle": "Res.", "sClass": "ShortField"},
						{ "sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { return (jira.statuses[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.statuses[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.statuses[obj.aData[ obj.iDataColumn ]].icon+"'>"):"";}},
						{ "sTitle": "Worklog", "fnRender":function(obj){
							return (chrome.extension.getBackgroundPage().loader.worklog.inProgress(obj.aData[ obj.iDataColumn ])?
								"<a href='#' onclick=\"jira.stopProgress('"+obj.aData[ obj.iDataColumn ]+"');\"><img src='images/stop.png' />"+chrome.extension.getBackgroundPage().loader.worklog.getTimeSpent(obj.aData[ obj.iDataColumn ])+"</a>":
								"<a href='#' onclick=\"chrome.extension.getBackgroundPage().loader.worklog.startProgress('"+obj.aData[ obj.iDataColumn ]+"');window.close();\"><img src='images/start.png' /></a>");
								
						}}
					]
				} );	
		},
		addTab: function(id, name){
			$("#tabHeader").append(
				$("<LI />").append(
					$("<A />").attr("href", "#div_"+id).text(name +
							((typeof(chrome.extension.getBackgroundPage().loader.issuesFromFilter[id]) != "string")?
									("(" + chrome.extension.getBackgroundPage().loader.issuesFromFilter[id].length + ")"):''))
				)
			);
			$("#tabs").append(
				$("<DIV />").attr("id", "div_"+id).append(
					$("<TABLE />").attr("id", "table_"+id).addClass("display")
				).append($("<BR />"))
			);
		},
		getXml: function(name, callback){
				var sXml = localStorage.getItem(name);
				var data = (new DOMParser()).parseFromString(sXml, "text/xml");
				callback(data);
		},
		error: function(err){
			$("#HeaderLink").hide();
			$("body").append($("<HR />")).append($("<P />").addClass("error").text(err)).
				append($("<HR />")).
				append($("<INPUT />").attr("type","button").attr("value", "Options").click(function(){
						var url = chrome.extension.getURL('options.html');
						chrome.tabs.create({ url: url, selected: true });
				}).button()
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
					$("<button />").click(function(){
						chrome.extension.getBackgroundPage().loader.addTab(jira.url('/secure/ManageFilters.jspa'));
						window.close();
					}).text("Manage Filters").button({icons: {primary: "ui-icon-flag"},text: false})
				).append(
					$("<button />").click(function(){
						chrome.extension.getBackgroundPage().loader.addTab(chrome.extension.getURL('options.html'));
						window.close();
					}).text("Options").button({icons: {primary: "ui-icon-wrench"},text: false})
				).append(
					$("<button />").click(function(){
						chrome.extension.getBackgroundPage().loader.update();
						window.close();
					}).text("Reload issues").button({icons: {primary: "ui-icon-refresh"},text: false})
				);/*.append(
					$("<button />").click(function(){
						chrome.extension.getBackgroundPage().loader.addTab("https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=QAWCRPFR2FW8S&lc=RU&item_name=JIRA%20Chrome%20extension&item_number=jira%2dchrome&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted");
						window.close();
					}).text("Contribute").button({icons: {primary: "ui-icon-heart"},text: false})
				);*/
		},
		url: function(str){
			return (jira.serverUrl + str);
		},
		stopProgress: function(issueId){
			var timeSpent = chrome.extension.getBackgroundPage().loader.worklog.getTimeSpent(issueId);
			var bResolve = false;
			function stop(id, spent, log, resolve, resolution){
				chrome.extension.getBackgroundPage().loader.addWorkLog(id, spent, log, function(data){
					console.log(data);
					if($("faultstring:first", data).length){
						$("#alertDlg").text($("faultstring:first", data).text()).dialog({
							title: "Error",
							width: "350px",
							modal: true
						});
					} else {
						chrome.extension.getBackgroundPage().loader.worklog.stopProgress(id);
						if(resolve){
							chrome.extension.getBackgroundPage().loader.resolveIssue(id, resolution);
						}
						window.close();
					}
				});
			}
			$("#progressTimeSpent").val(timeSpent);

			$("#stopProggresDlg").dialog({
				width: "420px",
				title: "Work Log",
				resizable: false,
				modal: true,
				buttons: {
					"Save": function(){
					
						stop(issueId, 
							$("#progressTimeSpent").val(), 
							$("#progressLog").val(), 
							$("#progressIsResolved").is(":checked"), 
							$("#progressResolution").val());
					},
					// "Save & Resolve": function(){
						// stop(issueId, $("#progressTimeSpent").val(), $("#progressLog").val(), true);
					// },					
					"Cancel": function(){
						$("#stopProggresDlg").dialog('close');
					}
				}
				
			});
			$("#progressLog").get(0).focus();
			//chrome.extension.getBackgroundPage().loader.worklog.stopProgress('"+obj.aData[ obj.iDataColumn ]+"');
			//window.close();
		}
}

$(document).ready(function () {
	jira.init();
});