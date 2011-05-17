/**
 * @preserve Copyright 2011 Andrey Vyrvich.
 * andry.virvich at google.com
 */

var jira = {
		serverUrl:null,
		resolutions: null,
		issuetypes: null,
		priorities: null,
		statuses: null,
		isDetached: location.search == '?detached',
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
					jira.addTab(filter);
			});
			jira.tabs();
			$.each(filters, function(i, filter){
				if(filter.enabled)
					jira.renderTableFromXml(filter.id);
		
			});
		},
		renderTableFromXml: function(id){
			var filter = chrome.extension.getBackgroundPage().loader.filters.get(id);
			$("#table_"+id).dataTable( {
				"bLengthChange": false,
				"bFilter": false,
				"bSort": true,
				//"bInfo": false,
				"bJQueryUI": false,
				"sPaginationType ": "full_numbers",
				"aaData": filter.issues,
				"aaSorting": [],
				"aoColumns": [
						{"bVisible": filter.columns.type, "sTitle": "", "sClass": "icon",  "fnRender": function(obj) { 
							return (jira.issuetypes[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.issuetypes[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.issuetypes[obj.aData[ obj.iDataColumn ]].icon +"'>"):"";}},
						{"bVisible": filter.columns.key, "sTitle": chrome.i18n.getMessage('Key'), "bUseRendered":false,  "fnRender": function(obj) { 
							return "<a target='_blank' href=\""+jira.url("/browse/"+ obj.aData[ obj.iDataColumn ])+"\">"+obj.aData[ obj.iDataColumn ]+"</a>" ;}},
						{"bVisible": filter.columns.summary, "sTitle": chrome.i18n.getMessage('Summary'), "sClass": "Summary"},
						{"bVisible": filter.columns.assignee, "sTitle": chrome.i18n.getMessage('assigne'),  "fnRender": function(obj) { 
								return "<a href=\"javascript:{jira.assignee('"+obj.aData[1]+"')}\">" + 
									((obj.aData[ obj.iDataColumn ] && obj.aData[ obj.iDataColumn ].length>10)?(obj.aData[ obj.iDataColumn ].substr(0, 10)+"..."):obj.aData[ obj.iDataColumn ])+
									"</a>";
							}
						},
						{"bVisible": filter.columns.duedate, "sType": "string-date","sTitle": chrome.i18n.getMessage('duedate'),  "fnRender": function(obj) {
							return obj.aData[ obj.iDataColumn ]?chrome.extension.getBackgroundPage().loader.getDate(obj.aData[ obj.iDataColumn ]):"";
						}, "sClass": "Date"},
						//{ "sTitle": "Est.", "sClass": "Date"},
						{"bVisible": filter.columns.priority, "sTitle": "", "sClass": "icon",  "fnRender": function(obj) { return (jira.priorities[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.priorities[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.priorities[obj.aData[ obj.iDataColumn ]].icon+"'>"):"";}},
						{"bVisible": filter.columns.resolution, "sTitle": chrome.i18n.getMessage('Res'), "sClass": "ShortField","fnRender": function(obj) { 
								if(obj.aData[ obj.iDataColumn ].toLowerCase().indexOf("unresolved")>=0)
									return "<a href=\"javascript:{jira.resolve('"+obj.aData[1]+"')}\">" + obj.aData[ obj.iDataColumn ] + "</a>";
								else
									return obj.aData[ obj.iDataColumn ];
							}
						},
						{"bVisible": filter.columns.status, "sTitle": "", "sClass": "icon",  "fnRender": function(obj) { return (jira.statuses[obj.aData[ obj.iDataColumn ]])?("<img title=\""+ jira.statuses[obj.aData[ obj.iDataColumn ]].text +"\" src='" + jira.statuses[obj.aData[ obj.iDataColumn ]].icon+"'>"):"";}},
						{"bVisible": filter.columns.worklog, "sClass":"icon","sTitle": chrome.i18n.getMessage('Worklog'), "fnRender":function(obj){
							if(obj.aData[ 6 ].toLowerCase().indexOf("unresolved")>=0){
								return (chrome.extension.getBackgroundPage().loader.worklog.inProgress(obj.aData[ obj.iDataColumn ])?
									"<div onclick=\"jira.stopProgress('"+obj.aData[ obj.iDataColumn ]+"');\"><span class=\"ui-icon ui-icon-circle-check\" style='display: inline-block !important;'></span><span style='padding-left:18px;'>"+chrome.extension.getBackgroundPage().loader.worklog.getTimeSpent(obj.aData[ obj.iDataColumn ])+"</span></div>":
									"<div onclick=\"chrome.extension.getBackgroundPage().loader.worklog.startProgress('"+obj.aData[ obj.iDataColumn ]+"');jira.updateCurrentTable(true);\"><span class=\"ui-icon ui-icon-clock\"></span></div>");
							} else {
								return '';
							}
						}}
					]
				} ).find("th").append("<div />");
		},
		addTab: function(filter){
			console.log(filter)
			$("#tabHeader").append(
				$("<LI />").append(
					$("<A />")//-webkit-linear-gradient(top, #fff, #eaeef3 50%, #d3d7db);}
							.attr("href", "#div_"+filter.id)
							.attr("filterId", filter.id)
							.attr("type", filter.type)
							.text(filter.name +
								((typeof(chrome.extension.getBackgroundPage().loader.filters.get(filter.id).issues) != "string")?
									("(" + chrome.extension.getBackgroundPage().loader.filters.get(filter.id).issues.length + ")"):''))
							.dblclick(function(){
								if(this.getAttribute("type") == "filter")
									chrome.extension.getBackgroundPage().loader.addTab(jira.url("/secure/IssueNavigator.jspa?requestId=" + this.getAttribute("filterId")));
							})
				).css("background-image",(filter.badge?"-webkit-linear-gradient(bottom, transparent 75%, "+filter.color+")":""))
			);
			$("#tabs").append(
				$("<DIV />").attr("id", "div_"+filter.id).append(
					$("<TABLE />").attr({
						"id": "table_"+filter.id,
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
			}).find( ".ui-tabs-nav" ).removeClass("ui-corner-all").css({
				"border-width": "0 0 1px 0",
				"padding": ".4em .4em 0 .4em",
				"margin": "-.2em -.2em 0 -.2em"
			}).sortable({ 
				axis: "x" ,  
				update: function(event, ui) {
					var i = chrome.extension.getBackgroundPage().loader.filters.index($("a", ui.item).attr("filterid"));
					var j = $("li", ui.item.parentNode).index(ui.item);
					var tmp = chrome.extension.getBackgroundPage().loader.filters[i];
					chrome.extension.getBackgroundPage().loader.filters.swap(i,j);
					chrome.extension.getBackgroundPage().loader.filters.save();
				}
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
						jira.updateCurrentTable(true);
					}).text(chrome.i18n.getMessage('reload')).button({icons: {primary: "ui-icon-refresh"},text: false})
				).append(
					$("<button />").click(function(){
						jira.createIssue();
					}).text(chrome.i18n.getMessage('createIssue')).button({icons: {primary: "ui-icon-plusthick"},text: false})
				);
				if (!jira.isDetached){
					$("#HeaderLink").append(
						$("<button />").click(function(){
							jira.detach();
						}).text(chrome.i18n.getMessage('detachWindow')).button({icons: {primary: "ui-icon-newwin"},text: false})
					)
				}
				/*.append(
					$("<button />").click(function(){
						chrome.extension.getBackgroundPage().loader.addTab("https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=QAWCRPFR2FW8S&lc=RU&item_name=JIRA%20Chrome%20extension&item_number=jira%2dchrome&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted");
						window.close();
					}).text("Contribute").button({icons: {primary: "ui-icon-heart"},text: false})
				);*/
		},
		updateCurrentTable: function(bReload){
			var currentFilter = chrome.extension.getBackgroundPage().loader.filters[$("#tabs").tabs( "option", "selected" )];
			if(bReload){
				chrome.extension.getBackgroundPage().loader.getIssuesFromFilter(
					currentFilter,
					function(issues){
						var dt = $("#table_"+currentFilter.id).dataTable();
						dt.fnClearTable();
						dt.fnAddData(issues);
					}
				);
			} else {
				var dt = $("#table_"+currentFilter.id).dataTable();
				dt.fnClearTable();
				dt.fnAddData(chrome.extension.getBackgroundPage().loader.filters.get(currentFilter.id).issues);
			}
		},
		url: function(str){
			return (jira.serverUrl + str);
		},
		detach: function() {
			var detachedPos = {
				top: 100,
				left: 100,
				width: window.innerWidth,
				height: window.innerHeight
			}
			
			window.open(chrome.extension.getURL('jira.html?detached'), 'jira_popup_window',
			  'left=' + detachedPos.left + ',top=' + (detachedPos.top - 22) + // Magic 22...
			  ',width=' + detachedPos.width + ',height=' + detachedPos.height +
			  'location=no,menubar=no,resizable=yes,status=no,titlebar=yes,toolbar=no');
			window.close();
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
						jira.updateCurrentTable(true);
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
						jira.updateCurrentTable(false);
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
							jira.updateCurrentTable(true);
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
							jira.updateCurrentTable(true);
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