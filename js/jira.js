var priority = [
						"priority_blocker.gif",
						"priority_blocker.gif",
						"priority_critical.gif",
						"priority_major.gif",
						"priority_minor.gif",
						"priority_trivial.gif"];
						
var jira = {
		serverUrl:null,
		resolutinos: null,
		init: function(){
			jira.serverUrl = localStorage.getItem("url");
			jira.resolutions = chrome.extension.getBackgroundPage().loader.resolutions;
			if(jira.serverUrl)
			{
				jira.initHeaderLinks();
				if(localStorage.getItem('error')!="")
				{
					jira.error(localStorage.getItem('error'));
				 } else {
					jira.getXml("AssignedToMe", function(xhr){
						try{
							var data = [];
							$(xhr).find("multiRef").each(function(i, val) {
									if($("key", val).text())
									{
										data.push([
											$("key", val).text(),
											$("summary", val).text(),
											jira.getDate($("duedate", val).text()),
											parseInt($("priority", val).text())
										]);
									}
							});
							
							$('#AssignedToMe').dataTable( {
							"bJQueryUI": false,
							"aaData": data,
							"aoColumns": [
									{ "sTitle": "Key",  "fnRender": function(obj) { return "<a target='_blank' href=\""+jira.url("/browse/"+ obj.aData[ obj.iDataColumn ])+"\">"+obj.aData[ obj.iDataColumn ]+"</a>" ;}},
									{ "sTitle": "Summary", "sClass": "Summary", },
									{ "sTitle": "Due date"},
									{ "sTitle": "",  "fnRender": function(obj) { return "<img src='" + jira.url( "/images/icons/" + priority[obj.aData[ obj.iDataColumn ]]) +"'>" ;}}
								]
							} );	
						}catch(e){
							alert(e);
						}
					});
					try{
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

					$("#tabHeader").append($("<LI />").append($("<A />").attr("href", "#IssuesFromFilter_" + item.id).text(item.name)));
					
					$("#tabs").append(
						$("<DIV />").attr("id", "IssuesFromFilter_" + item.id).append(
							$("<TABLE />").attr("id", "TableIssuesFromFilter_" + item.id).addClass("display")
						).append($("<BR />"))
					);
			});
	
			jira.tabs();

			$.map(filters, function(item, i){
						jira.getXml("IssuesFromFilter_" + item.id, function(xhr){
						try{
							var data = [];
							$(xhr).find("multiRef").each(function(i, val) {
									if($("key", val).text())
									{
										data.push([
										//	$("duedate", val).text(),
										//	$("project", val).text(),
											$("key", val).text(),
											$("summary", val).text(),
											$("assignee", val).text(),
											jira.getDate($("duedate", val).text()),
											parseInt($("priority", val).text()),
											jira.getResolution($("resolution", val).text())
										]);
									}
							});
							
							$("#TableIssuesFromFilter_" + item.id).dataTable( {
							"bJQueryUI": false,
							"aaData": data,
							"aoColumns": [
								//	{ "sTitle": "duedate" },
								//	{ "sTitle": "project" },
									{ "sTitle": "Key",  "fnRender": function(obj) { return "<a target='_blank' href=\""+jira.url("/browse/"+ obj.aData[ obj.iDataColumn ])+"\">"+obj.aData[ obj.iDataColumn ]+"</a>" ;}},
									{ "sTitle": "Summary", "sClass": "Summary"},
									{ "sTitle": "Assignee",  "fnRender": function(obj) { if(obj.aData[ obj.iDataColumn ].length>10)return obj.aData[ obj.iDataColumn ].substr(0, 10)+"..."; else return obj.aData[ obj.iDataColumn ];}},
									{ "sTitle": "Due date", "sClass": "Date"},
									{ "sTitle": "", "sClass": "Icon",  "fnRender": function(obj) { return "<img src='" + jira.url("/images/icons/" + priority[obj.aData[ obj.iDataColumn ]]) +"'>" ;}},
									{"sTitle": "Res.", "sClass": "ShortField"}
									
								]
							} );	
						}catch(e){
							alert(e);
						}
					});					
					
			});
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
				//).append(
				//	$("<a />").addClass("HeaderLink").attr("href", "javascript:{chrome.extension.getBackgroundPage().loader.update();window.close();}").text("Update issues")
				);
		},
		url: function(str){
			return (jira.serverUrl + str);
		}
}

$(window).load(function () {
	setTimeout(jira.init, 0);
});