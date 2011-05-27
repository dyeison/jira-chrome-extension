var ja = {
	subscribe: function(jql){
		chrome.extension.sendRequest({
			'action': 'subscribe',
			'jql': jql});
	}
}

$(".jqlQuickLink").before(
	$("<img />").attr({
		"src": chrome.extension.getURL("images/logo-16.png"),
		"title": "Add this query to JIRA Assistant"
	}).css({"display":"inline-block"}).click(function(){
		ja.subscribe($(this).parent().children('a').attr('title'));
	})
).css({"display":"inline-block"});

$("#jqlform .help-lnk").after(
	$("<img />").attr({
		"src": chrome.extension.getURL("images/logo-16.png"),
		"title": "Add this query to JIRA Assistant"
	}).click(function(){
		ja.subscribe($('#jqltext').val());
	})
);