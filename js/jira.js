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
			jira.users = chrome.extension.getBackgroundPage().loader.users;
			
			for (i in jira.resolutions){
				$("#progressResolution, #resolveResolution").append(
					$("<option />").val(i).text(jira.resolutions[i])
				)
			}
			$("#progressResolution, #resolveResolution").combobox();
			for (i in jira.users){
				$("#progressUsers, #assigneeUsers").append(
					$("<option />").val(i).text(jira.users[i].fullname).attr("title", jira.users[i].email)
				)
			}
			$.each(chrome.extension.getBackgroundPage().loader.projects, function(i, p){
				$("#createIssueProject").append($("<option />").val(p.id).text(p.name));
			});
			$.each(chrome.extension.getBackgroundPage().loader.issuetypes, function(i, type){
				$("#createIssueType").append($("<option />").val(i).text(type.text));
			});
			$("select").combobox();
			
			$("#progressIsResolved").click(function(){
				$("#progressResolution").attr("disabled", !this.checked).toggleClass('ui-state-disabled');
			});
			$("#progressIsAssignee").click(function(){
				$("#progressUsers").attr("disabled", !this.checked).toggleClass('ui-state-disabled');
			});
			
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
					jira.getIssuesFromFilter();
				}
			} else {
				$("#quicksearch").hide();
				jira.error(chrome.i18n.getMessage("configError"));
			}
		},
		getIssuesFromFilter: function(){
			var filters = chrome.extension.getBackgroundPage().loader.filters;
			//filters = filters.sort(function(a,b){return (a.id-b.id)});
			var str = '';
			$.each(filters, function(i, filter){
				if(filter.enabled)
					jira.addTab(filter.id, filter.name);
			});
			jira.tabs();
			$.each(filters, function(i, filter){
				if(filter.enabled)
					jira.renderTableFromXml(filter.id);
		
			});
		},
		renderTableFromXml: function(id){
		
				$("#table_"+id).dataTable( {
				"bLengthChange": false,
				"bFilter": false,
				"bSort": true,
				//"bInfo": false,
				"bJQueryUI": false,
				"sPaginationType ": "full_numbers",
				"aaData": chrome.extension.getBackgroundPage().loader.issuesFromFilter[id],
				"aaSorting": [[4, "asc"],[ 5, "asc" ]],
				"aoColumns": [
						{"sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { 
							return (jira.issuetypes[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.issuetypes[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.issuetypes[obj.aData[ obj.iDataColumn ]].icon +"'>"):"";}},
						{"sTitle": chrome.i18n.getMessage('Key'), "bUseRendered":false,  "fnRender": function(obj) { 
							return "<a target='_blank' href=\""+jira.url("/browse/"+ obj.aData[ obj.iDataColumn ])+"\">"+obj.aData[ obj.iDataColumn ]+"</a>" ;}},
						{"sTitle": chrome.i18n.getMessage('Summary'), "sClass": "Summary"},
						{"sTitle": chrome.i18n.getMessage('assigne'),  "fnRender": function(obj) { 
								return "<a href=\"javascript:{jira.assignee('"+obj.aData[1]+"')}\">" + 
									((obj.aData[ obj.iDataColumn ] && obj.aData[ obj.iDataColumn ].length>10)?(obj.aData[ obj.iDataColumn ].substr(0, 10)+"..."):obj.aData[ obj.iDataColumn ])+
									"</a>";
							}
						},
						{"sType": "string-date","sTitle": chrome.i18n.getMessage('duedate'),  "fnRender": function(obj) {
							return obj.aData[ obj.iDataColumn ]?chrome.extension.getBackgroundPage().loader.getDate(obj.aData[ obj.iDataColumn ]):"";
						}, "sClass": "Date"},
						//{ "sTitle": "Est.", "sClass": "Date"},
						{"sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { return (jira.priorities[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.priorities[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.priorities[obj.aData[ obj.iDataColumn ]].icon+"'>"):"";}},
						{"sTitle": chrome.i18n.getMessage('Res'), "sClass": "ShortField","fnRender": function(obj) { 
								if(obj.aData[ obj.iDataColumn ].toLowerCase().indexOf("unresolved")>=0)
									return "<a href=\"javascript:{jira.resolve('"+obj.aData[1]+"')}\">" + obj.aData[ obj.iDataColumn ] + "</a>";
								else
									return obj.aData[ obj.iDataColumn ];
							}
						},
						{"sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { return (jira.statuses[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.statuses[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.statuses[obj.aData[ obj.iDataColumn ]].icon+"'>"):"";}},
						{"sTitle": chrome.i18n.getMessage('Worklog'), "fnRender":function(obj){
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
					$("<TABLE />").attr({
						"id": "table_"+id,
						"cellspacing":"0",
						"cellpadding":"0"
					}).addClass("display")
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
					}).text(chrome.i18n.getMessage('manageFilters')).button({icons: {primary: "ui-icon-flag"},text: false})
				).append(
					$("<button />").click(function(){
						chrome.extension.getBackgroundPage().loader.addTab(chrome.extension.getURL('options.html'));
						window.close();
					}).text(chrome.i18n.getMessage('options')).button({icons: {primary: "ui-icon-wrench"},text: false})
				).append(
					$("<button />").click(function(){
						chrome.extension.getBackgroundPage().loader.update();
						window.close();
					}).text(chrome.i18n.getMessage('reload')).button({icons: {primary: "ui-icon-refresh"},text: false})
				).append(
					$("<button />").click(function(){
						jira.createIssue();
					}).text(chrome.i18n.getMessage('createIssue')).button({icons: {primary: "ui-icon-plusthick"},text: false})
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
			
			function stop(opt){
				chrome.extension.getBackgroundPage().loader.addWorkLog(opt.issueId, opt.timeSpent, opt.log, function(data){
					console.log(data);
					if($("faultstring:first", data).length){
						$("#alertDlg").text($("faultstring:first", data).text()).dialog({
							title: "Error",
							width: "350px",
							modal: true
						});
					} else {
						chrome.extension.getBackgroundPage().loader.worklog.stopProgress(opt.issueId);
						if(opt.bResolve){
							chrome.extension.getBackgroundPage().loader.resolveIssue(opt.issueId, opt.resolution);
						}
						if(opt.bAssignee){
							chrome.extension.getBackgroundPage().loader.assigneIssue(opt.issueId, opt.assignee);
						}
						window.close();
					}
				});
			}
			
			$("#progressTimeSpent").val(timeSpent);

			$("#stopProggresDlg").dialog({
				width: "500px",
				title: chrome.i18n.getMessage('Worklog'),
				resizable: false,
				modal: true,
				buttons: [{
					text: chrome.i18n.getMessage('logWork'),
					click: function(){
					
						stop({
							issueId: issueId, 
							timeSpent: $("#progressTimeSpent").val(), 
							log: $("#progressLog").val(), 
							bResolve: $("#progressIsResolved").is(":checked"), 
							resolution: $("#progressResolution").val(),
							bAssignee: $("#progressIsAssignee").is(":checked"), 
							assignee: $("#progressUsers").val()
						});
					}
				},{
					text: chrome.i18n.getMessage('cancelProgress'),
					click: function(){
						chrome.extension.getBackgroundPage().loader.worklog.stopProgress(issueId);
						$("#stopProggresDlg").dialog('close');
					}
				},{					
					text: chrome.i18n.getMessage('cancel'),
					click: function(){
						$("#stopProggresDlg").dialog('close');
					}
				}]
				
			});
			$("#progressLog").get(0).focus();
			//chrome.extension.getBackgroundPage().loader.worklog.stopProgress('"+obj.aData[ obj.iDataColumn ]+"');
			//window.close();
		},
		assignee: function(id){
			$("#assigneeIssue").text(id);
			$("#assigneeDlg").dialog({
				width: "420px",
				title: chrome.i18n.getMessage('assignIssue'),
				resizable: false,
				modal: true,
				buttons: [{
					text: chrome.i18n.getMessage('save'),
					click: function(){
						chrome.extension.getBackgroundPage().loader.assigneIssue(id, $("#assigneeUsers").val(), function(data){
							if($("#assigneeComment").val()){
								chrome.extension.getBackgroundPage().loader.addComment(id, $("#assigneeComment").val(), function(data){
									$("#assigneeDlg").dialog('close');
								});
							} else {
								$("#assigneeDlg").dialog('close');
							}
						});
					}
				},{
					text: chrome.i18n.getMessage('cancel'),
					click: function(){
						$("#assigneeDlg").dialog('close');
					}
				}]
				
			});		
		},
		resolve: function(id){
			$("#resolveIssue").text(id);
			$("#resolveDlg").dialog({
				width: "420px",
				title: chrome.i18n.getMessage('resolveIssue'),
				resizable: false,
				modal: true,
				buttons: [{
					text: chrome.i18n.getMessage('resolveIssue'),
					click: function(){
						chrome.extension.getBackgroundPage().loader.resolveIssue(id, $("#resolveResolution").val(), function(data){
							if($("#resolveComment").val()){
								chrome.extension.getBackgroundPage().loader.addComment(id, $("#resolveComment").val(), function(data){
									$("#resolveDlg").dialog('close');
								});
							} else {
								$("#resolveDlg").dialog('close');
							}
						});
					}
				},{
					text: chrome.i18n.getMessage('cancel'),
					click: function(){
						$("#resolveDlg").dialog('close');
					}
				}]
				
			});		
		},
		createIssue: function(){
			$("#createIssueDlg").dialog({
				width: "420px",
				title: chrome.i18n.getMessage('createIssue'),
				resizable: false,
				modal: true,
				buttons: [{
					text: chrome.i18n.getMessage('create'),
					click: function(){
						var pid = $("#createIssueProject").val();
						var type = $("#createIssueType").val();
						chrome.extension.getBackgroundPage().loader.addTab(jira.url("/secure/CreateIssue.jspa?pid="+pid+"&issuetype="+type+"&Create=Create"));
						$(this).dialog('close');
						window.close();
					}
				},{
					text: chrome.i18n.getMessage('cancel'),
					click: function(){
						$(this).dialog('close');
					}
				}]
			});	
		}
}

$(document).ready(function () {
	jira.init();
});