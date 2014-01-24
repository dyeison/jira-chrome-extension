/**
 * @preserve Copyright 2011 Andrey Vyrvich.
 * andry.virvich at google.com
 */
 
(function($)  {
   $.fn.extend({
      'adText' : function(text)  {
		var blured = {
				'font-style': 'italic',
				'color': '#aaa',
				'padding': '0 5px 0 5px'
			},
			focused = {
				'font-style': 'normal',
				'color': 'inherit !important',
				'padding': '0 5px 0 5px'
			};
		return $(this).each(function(){
			
			$(this).bind("focus", function(){
				if(this.getAttribute('adtext'))
					$(this).css(focused).removeAttr('adtext').val(null);
			}).bind("blur", function(){
				if(!this.value)
					$(this).css(blured).attr('adtext', true).val(text);
			}).css(blured).val(text).attr('adtext', true);
		});
      },
	  'rssLayout': function(feed){
		return $(this).each(function(){
			var self = $("<ul />").appendTo(this).css({
				'overflow': 'auto',
				'max-height': '400px'
			});
			$("entry", feed).each(function(i, entry){
				self.append(
					$("<li />").append(
						$("<label />").html($("title", entry).text())
					).append(
						$("<ul />").append(
							$("<li />").append(
								$("<label />").html($("summary", entry).text())
							)
						).hide()
					)
				);
			});
			self.checkboxTree({
				initializeUnchecked: "collapsed",
				initializeChecked: "collapsed"
			}).removeClass("ui-widget-content");
		}).removeClass("ui-widget-content");
	  }
   });
}(jQuery));

 
var loader = chrome.extension.getBackgroundPage().loader;
var jira = {
		isDetached: location.search == '?detached',
		init: function(){

			$.each(loader.servers[0].projects, function(i, p){
				$("#createIssueProject").append($("<option />").val(p.id).text(p.name));
			});
			$.each(loader.servers[0].issuetypes, function(i, type){
				$("#createIssueType").append($("<option />").val(i).text(type.text));
			});
			$("#createIssueProject,#createIssueType").combobox();



			$("#progressIsResolved").click(function(){
				$("#progressResolution").attr("disabled", !this.checked).toggleClass('ui-state-disabled');
			});
			$("#progressIsAssignee").click(function(){
				$("#progressUsers").attr("disabled", !this.checked).toggleClass('ui-state-disabled');
			});
			
			$("#quickSearchInput").adText(chrome.i18n.getMessage('quickSearch'));
			$.each(loader.servers, function(i, server){
				$("#serverList").append($("<option />").text(server.url.replace(/https?:\/\//, '')).val(server.url));
			});
			$("#serverList").combobox({
				'editable': false
			}).next().addClass("ui-state-default").attr("readonly", true).css({
				'border-top-left-radius': '0',
				'border-bottom-left-radius': '0',
				'border-left': '0',
				'margin-left': '-2px',
				'width': '160px',
				'overflow': 'hidden',
				'text-overflow': 'ellipsis'
			});
			jQuery.fn.dataTableExt.oSort['string-date-asc']  = function(x,y) {
				if(x == "") return (y=="")?0:1;
				if(y == "") return (x=="")?0:-1;
				var xa = x.split("-");
				var ya = y.split("-");
				return ((x < y) ? -1 : ((x > y) ?  1 : 0));
			};
			jQuery.fn.dataTableExt.oSort['string-date-desc']  = function(x,y) {
				return -1* jQuery.fn.dataTableExt.oSort['string-date-asc'](x,y);
			};	
			
			if(loader.servers.length)
			{
				$("#quicksearch").attr("action", loader.servers[0].getUrl("/secure/QuickSearch.jspa"));
				jira.initHeaderLinks();
				jira.getIssuesFromFilter();
			} 
		},
		getIssuesFromFilter: function(){
			var filters = loader.filters,
				str = '';
			$.each(filters, function(i, filter){
				if(filter.enabled)
					jira.addTab(filter);
			});
			jira.tabs();
			$.each(filters, function(i, filter){
				if(filter.enabled)
					jira.renderFilterData(filter.id);
		
			});
		},
		renderFilterData: function(id){
			var filter = loader.filters.get(id);
				server = loader.servers.get(filter.server);
			if(filter.type == 'feed'){
				jira.renderFeed(filter);
			} else {
				if(filter.show == 'calendar'){
					jira.renderCalendar(filter);
				} else {
					jira.renderTable(filter);
				}
			}
		},
		renderTable: function(filter){
			$("#table_"+filter.id).dataTable( {
				"bLengthChange": jira.isDetached,
				"bFilter": false,
				"bSort": true,
				"oLanguage": {
					"sSearch": ""
				},
				"bJQueryUI": false,
				"sScrollY": jira.isDetached?"":"391px",
				"bScrollCollapse": !jira.isDetached,
				"bPaginate": false,
				//"sPaginationType ": "full_numbers",
				"aaData": filter.issues,
				"aaSorting": [],
				"aoColumns": [
						{
							"bVisible" : filter.columns.type,
							"sTitle" : "",
							"sClass" : "icon",
							"fnRender" : function (obj) {
								return (server.issuetypes[obj.aData[obj.iDataColumn]]) ? 
									("<img title=\"" + server.issuetypes[obj.aData[obj.iDataColumn]].text + "\" src='" + server.issuetypes[obj.aData[obj.iDataColumn]].icon + "'>") : "";
							}
						}, {
							"bVisible" : filter.columns.key,
							"sTitle" : chrome.i18n.getMessage('Key'),
							"bUseRendered" : false,
							"fnRender" : function (obj) {
								return "<a target='_main' href=\"" + server.getUrl("/browse/" + obj.aData[obj.iDataColumn]) + "\">" + obj.aData[obj.iDataColumn] + "</a>";
							}
						}, {
							"bVisible" : filter.columns.summary,
							"sTitle" : chrome.i18n.getMessage('Summary'),
							"sClass" : "Summary"
						}, {
							"bVisible" : filter.columns.assignee,
							"sTitle" : chrome.i18n.getMessage('assigne'),
							"fnRender" : function (obj) {
								return "<span class='table_button'>" + 
									((obj.aData[obj.iDataColumn] && obj.aData[obj.iDataColumn].length > 10) ? (obj.aData[obj.iDataColumn].substr(0, 10) + "...") : obj.aData[obj.iDataColumn]) +
									"</span>";
							},
							"fnCreatedCell" : function (td, sData, aData) {
								$(td).click(function () {
									jira.assignee(aData[1], filter.id);
								});
							}
						}, {
							"bVisible" : filter.columns.duedate,
							"sType" : "string-date",
							"sTitle" : chrome.i18n.getMessage('duedate'),
							"fnRender" : function (obj) {
								return obj.aData[obj.iDataColumn] ? loader.getDate(obj.aData[obj.iDataColumn]) : "";
							},
							"sClass" : "Date"
						},
						//{ "sTitle": "Est.", "sClass": "Date"},
						{
							"bVisible" : filter.columns.priority,
							"sTitle" : "",
							"sClass" : "icon",
							"fnRender" : function (obj) {
								return (server.priorities[obj.aData[obj.iDataColumn]]) ? ("<img title=\"" + server.priorities[obj.aData[obj.iDataColumn]].text + "\" src='" + server.priorities[obj.aData[obj.iDataColumn]].icon + "'>") : "";
							}
						}, {
							"bVisible" : filter.columns.resolution,
							"sTitle" : chrome.i18n.getMessage('Res'),
							"sClass" : "ShortField",
							"fnRender" : function (obj) {
								if (obj.aData[obj.iDataColumn].toLowerCase().indexOf("unresolved") >= 0)
									return "<span class='table_button'>" + obj.aData[obj.iDataColumn] + "</span>";
								else
									return obj.aData[obj.iDataColumn];
							},
							"fnCreatedCell" : function (td, sData, aData) {
								$(td).click(function () {
									jira.resolve(aData[1],filter.id)
								});
							}
						}, {
							"bVisible" : filter.columns.status,
							"sTitle" : "",
							"sClass" : "icon",
							"fnRender" : function (obj) {
								return (server.statuses[obj.aData[obj.iDataColumn]]) ? ("<img title=\"" + server.statuses[obj.aData[obj.iDataColumn]].text + "\" src='" + server.statuses[obj.aData[obj.iDataColumn]].icon + "'>") : "";
							}
						}, {
							"bVisible" : filter.columns.worklog,
							"sClass" : "icon",
							"sTitle" : chrome.i18n.getMessage('Worklog'),
							"fnRender" : function (obj) {
								if (obj.aData[6].toLowerCase().indexOf("unresolved") >= 0) {
									return (server.worklog.inProgress(obj.aData[1]) ?
										"<div><span class=\"ui-icon ui-icon-circle-check\" style='display: inline-block !important;'></span><span style='padding-left:18px;'>" + server.worklog.getTimeSpent(obj.aData[obj.iDataColumn]) + "</span></div>" :"<div><span class=\"ui-icon ui-icon-clock\"></span></div>");
								} else {
									return '';
								}
							},
							"fnCreatedCell" : function (td, sData, aData, iRow, iCol) {
								$(td).click(function () {
									if(server.worklog.inProgress(aData[1]))
										jira.stopProgress(aData[1], filter.id);
									else {
										loader.servers.get(filter.server).worklog.startProgress(aData[1]);
										jira.updateCurrentTable(true);
									}
								});
							}
						}
					]
				} );		
		},
		renderFeed: function(filter){
			$("#table_"+filter.id).parent().empty().rssLayout(filter.getData());
		},
		renderCalendar: function(filter){
			var server = loader.servers.get(filter.server);
			$("#div_"+filter.id).empty().fullCalendar({
				height: 400,
				editable: true,
				disableResizing : true,
				events: $.map(filter.issues, function(issue){
					return {
						"title": issue[1],
						"start": parseXSDDateString(issue[4]),
						"issue": issue,
						"description": issue[2]
					}
				}),
				eventDrop: function(event, delta) {
					var issueId = event.title;
					var d = parseXSDDateString(event.issue[4]);
					d.setDate(d.getDate()+delta);
					server.updateDueDate(issueId, d);
					filter.update();
				},
				eventClick: function( event, jsEvent, view ) { 
					loader.addTab(server.getUrl("/browse/"+ event.title));
				},
				eventAfterRender: function(event, element, view){
					$(element).qtip({
						"content": event["description"],
					    "position": {
					    	"my": 'left center',
					    	"at": 'right center'
					    },
					    "style": {
					        classes: 'qtip-blue qtip-shadow qtip-tipped'
					    }
					});
				}
			});
		},
		addTab: function(filter){
			function transp(rgba, trnasp){
				rgba[3] = trnasp;
				return rgba;
			}
			var server = loader.servers.get(filter.server);
			$("#tabHeader").append(
				$("<LI />").attr("filterId", filter.id).append(
					$("<A />")
						.attr("href", "#div_"+filter.id)
						.attr("filterId", filter.id)
						.attr("title", filter.jql?filter.jql:'')
						.attr("type", filter.type)
						.append(
							$("<span />").addClass('tabHeaderContent').text(filter.name)
						)
						.dblclick(function(){
							if(this.getAttribute("type") == "filter")
								loader.addTab(server.getUrl("/secure/IssueNavigator.jspa?requestId=" + this.getAttribute("filterId")));
							else if(this.getAttribute("type") == 'jql')
								loader.addTab(server.getUrl("/secure/IssueNavigator!executeAdvanced.jspa?runQuery=true&jqlQuery=" + escape(this.getAttribute("title"))));
						})
				).append(
					$("<span />").addClass('tabHeaderCounter').html(
						(filter.type=='feed'?'<img src="images/rss.png">':
							(filter.show=='calendar'?'<img src="images/calendar.png">':((typeof(filter.issues) != "string")?filter.issues.length:'')))
					)
				)
				.css({
					"background-image": (filter.badge?("-webkit-linear-gradient(bottom, rgba("+transp(filter.rgb, .02)+"), rgba("+transp(filter.rgb, .6)+"))"):"")
				})
			);
			$("#tabs").append(
				$("<DIV />").attr("id", "div_"+filter.id).css({
					width: "738px"
				}).append(
					$("<TABLE />").attr({
						"id": "table_"+filter.id,
						"cellspacing":"0",
						"cellpadding":"0"
					}).addClass("display")
				)
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
				show: function(event, ui) {
					var dt = $("div.dataTables_scrollBody>table.display", ui.panel).dataTable();
					if ( dt.length > 0 ) {
						dt.fnAdjustColumnSizing();
					} else if($(ui.panel).is(".fc")){
						$(ui.panel).fullCalendar('render');
					}
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
					var i = loader.filters.index($("a", ui.item).attr("filterid"));
					var j = $("li", ui.item.parentNode).index(ui.item);
					var tmp = loader.filters[i];
					loader.filters.swap(i,j);
					loader.filters.save();
				}
			});
		},
		initHeaderLinks: function(){
				$("#HeaderLink").css({'white-space': 'no-wrap'}).append(
					$("<div />").css({
						'white-space': 'no-wrap',
						'padding': '0 2px 0 2px',
						'display': 'inline-block'
					})
						/*.append(
							$("<button />").click(function(){
								loader.addTab(jira.url('/secure/ManageFilters.jspa'));
								if(!jira.isDetached){
									window.close();
								}
							}).text(chrome.i18n.getMessage('manageFilters')).button({icons: {primary: "ui-icon-flag"},text: false})
						)*/.append(
							$("<button />").click(function(){
								loader.addTab(chrome.extension.getURL('options.html'));
								if(!jira.isDetached){
									window.close();
								}
							}).text(chrome.i18n.getMessage('options')).button({icons: {primary: "ui-icon-wrench"},text: false})
						).append(
							$("<button />").click(function(){
								jira.updateCurrentTable(true);
							}).text(chrome.i18n.getMessage('reload')).button({icons: {primary: "ui-icon-refresh"},text: false})
						).append(
							$("<button />").click(function(){
								jira.createIssue();
							}).text(chrome.i18n.getMessage('createIssue')).button({icons: {primary: "ui-icon-plusthick"},text: false})
						).append(
							$("<button />").click(function(){
								loader.addTab("https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=TRSCE62LWTWT6");
								if(!jira.isDetached){
									window.close();
								}
							}).text("Contribute").button({icons: {primary: "ui-icon-heart"},text: false})
						)
				)
				if (!jira.isDetached){
					$("#HeaderLink > div").append(
						$("<button />").click(function(){
							jira.detach();
						}).text(chrome.i18n.getMessage('detachWindow')).button({icons: {primary: "ui-icon-newwin"},text: false})
					)
				}
				
		},
		updateCurrentTable: function(bReload){
			var currentFilter = loader.filters[$("#tabs").tabs( "option", "selected" )];
			if(bReload){
				var counterNode = $("li[filterId='" + currentFilter.id + "'] > span.tabHeaderCounter").empty().append(
					$("<img />").attr("src", chrome.extension.getURL("/images/filter-loader.gif"))
				);
				currentFilter.update(function(issues){
					if(currentFilter.show == "table"){
						counterNode.empty().text(issues.length.toString());
						var dt = $("#table_"+currentFilter.id).dataTable();
						dt.fnClearTable();
						dt.fnAddData(issues);
					} else if(currentFilter.show == "calendar"){
						location.reload();
						jira.renderCalendar(currentFilter);
					}
				});
			} else {
				var dt = $("#table_"+currentFilter.id).dataTable();
				dt.fnClearTable();
				dt.fnAddData(loader.filters.get(currentFilter.id).issues);
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
				height: window.innerHeight + 20
			};
			window.open(chrome.extension.getURL('jira.html?detached'), 'jira_popup_window',
			  'left=' + detachedPos.left + ',top=' + (detachedPos.top - 22) + // Magic 22...
			  ',width=' + detachedPos.width + ',height=' + detachedPos.height +
			  'location=no,menubar=no,resizable=yes,status=no,titlebar=yes,toolbar=no');
			if(!jira.isDetached){
				window.close();
			}
		},
		stopProgress: function(issueId, filterId){
			var bResolve = false,
				filter = loader.filters.get(filterId),
				server = loader.servers.get(filter.server),
				timeSpent = server.worklog.getTimeSpent(issueId)
			$("#progressResolution, #progressUsers").empty();
			for (i in server.resolutions){
				$("#progressResolution").append(
					$("<option />").val(i).text(server.resolutions[i])
				)
			}
			for (i in server.users){
				$("#progressUsers").append(
					$("<option />").val(i).text(server.users[i].fullname).attr("title", server.users[i].email)
				)
			}
			$("#progressResolution, #progressUsers").combobox();			
			
			function stop(opt){
				server.addWorkLog(opt.issueId, opt.timeSpent, opt.log, opt.date, function(data){
					if($("faultstring:first", data).length){
						$("#alertDlg").text($("faultstring:first", data).text()).dialog({
							title: "Error",
							width: "350px",
							modal: true
						});
					} else {
						server.worklog.stopProgress(opt.issueId);
						if(opt.bResolve){
							server.resolveIssue(opt.issueId, opt.resolution);
						}
						if(opt.bAssignee){
							server.assigneIssue(opt.issueId, opt.assignee);
						}
						if(opt.comment){
							server.addComment(opt.issueId, opt.comment);
						}
						//if(!jira.isDetached){
						//	window.close();
						//} else {
							jira.updateCurrentTable(true);
							$("#stopProggresDlg").dialog('close');
						//}
					}
				});
			}
			
			$("#progressTimeSpent").val(timeSpent);
			$("#progressDate").datepicker({
				defaultDate: new Date(),
				firstDay: 1
			});

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
							date: $("#progressDate").datepicker( "getDate" ), 
							log: $("#progressLog").val(), 
							comment: $("#progressComment").val(), 
							bResolve: $("#progressIsResolved").is(":checked"), 
							resolution: $("#progressResolution").val(),
							bAssignee: $("#progressIsAssignee").is(":checked"), 
							assignee: $("#progressUsers").val()
						});
					}
				},{
					text: chrome.i18n.getMessage('cancelProgress'),
					click: function(){
						server.worklog.stopProgress(issueId);
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
		},
		assignee: function(id, fid){
			var filter = loader.filters.get(fid);
				server = loader.servers.get(filter.server);
			$("#assigneeIssue").text(id);
			$("#assigneeUsers").empty();
			for (i in server.users){
				$("#assigneeUsers").append(
					$("<option />").val(i).text(server.users[i].fullname).attr("title", server.users[i].email)
				)
			}
			$("#assigneeUsers").combobox();
			$("#assigneeDlg").dialog({
				width: "420px",
				title: chrome.i18n.getMessage('assignIssue'),
				resizable: false,
				modal: true,
				buttons: [{
					text: chrome.i18n.getMessage('save'),
					click: function(){
						server.assigneIssue(id, $("#assigneeUsers").val(), function(data){
							if($("#assigneeComment").val()){
								server.addComment(id, $("#assigneeComment").val(), function(data){
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
		resolve: function(id, fid){
			var filter = loader.filters.get(fid);
				server = loader.servers.get(filter.server);		
			$("#resolveIssue").text(id);
			$("#resolveResolution").empty();
			console.log(server.resolutions);
			for (i in server.resolutions){
				console.log(server.resolutions)
				$("#resolveResolution").append(
					$("<option />").val(i).text(server.resolutions[i])
				)
			}
			$("#resolveResolution").combobox();			
			$("#resolveDlg").dialog({
				width: "420px",
				title: chrome.i18n.getMessage('resolveIssue'),
				resizable: false,
				modal: true,
				buttons: [{
					text: chrome.i18n.getMessage('resolveIssue'),
					click: function(){
						loader.resolveIssue(id, $("#resolveResolution").val(), function(data){
							if($("#resolveComment").val()){
								loader.addComment(id, $("#resolveComment").val(), function(data){
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
						loader.addTab(loader.servers[0].url + "/secure/CreateIssue.jspa?pid="+pid+"&issuetype="+type+"&Create=Create");
						$(this).dialog('close');
						if(!jira.isDetached){
							window.close();
						}
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