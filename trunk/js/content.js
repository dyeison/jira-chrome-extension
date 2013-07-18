var ja; 
function JAssistantContent(settings){
	this.settings = settings
}

JAssistantContent.prototype = {
	subscribe: function(jql){
		chrome.runtime.sendMessage({
			'action': 'subscribe',
			'serverId': ja.settings.serverId,
			'jql': jql});
	},
	initQuickAdd: function(){
		$(".jqlQuickLink").before(
			$("<img />").attr({
				"src": chrome.extension.getURL("images/logo-16.png"),
				"title": chrome.i18n.getMessage('optionsQuickAddLabel')
			}).css({"display":"inline-block"}).click(function(){
				ja.subscribe($(this).parent().children('a').attr('title'));
			})
		).css({"display":"inline-block"});

		$("#jqlform .help-lnk").after(
			$("<img />").attr({
				"src": chrome.extension.getURL("images/logo-16.png"),
				"title": chrome.i18n.getMessage('optionsQuickAddLabel')
			}).click(function(){
				ja.subscribe($('#jqltext').val());
			})
		);
	},
	initFileDrop: function(){
		var rx = /\/(\w+-\d+)$/;
		if(rx.test(document.location.pathname)){
			$("#secondary > div.content, #viewissuesidebar").first().prepend(
				$("<div />").attr('id', 'JA_drag_file_box')
				.text(chrome.i18n.getMessage('optionsFileAttachmentsLabel'))
				.prepend($("<div />").css({
						'background-image': 'url('+chrome.extension.getURL("images/logo-48.png")+')',
						'width': '48px',
						'height': '48px',
						'float': 'right'
					}).bind('dragover', function() {
						return false;
					})
				)
				.bind('dragenter', function(){
					$(this).addClass("dragover");
				})
				.bind('dragleave ', function(){
					$(this).removeClass("dragover");
				})
				.bind('dragover', function() {
					return false;
				})
				.bind('drop', function(e){
					$(this).addClass("dropped")	
							$(this).html("<img src='"+chrome.extension.getURL('images/ajax-loader.gif')+"'/>")
							var reader, 
								files = e.originalEvent.dataTransfer.files,
								rededFiles = 0;
							function sendRequestToBgPage(){
								chrome.runtime.sendMessage({
									'action': 'attach',
									'serverId': ja.settings.serverId,
									'key': rx.exec(document.location.pathname)[1],
									'files': files
								}, function(){
									window.location.href = window.location.href;
								});
							};
							$.each(files, function(i, file){
								console.log(file);
								reader = new FileReader();
								reader.onload = function(event){
									file.data = event.target.result;
									if(++rededFiles == files.length)
										sendRequestToBgPage();
								};
								reader.onerror = function(){
									if(++rededFiles == files.length)
										sendRequestToBgPage();
								};
								reader.readAsBinaryString(file);
							});
					return false;
				})
			);
		}
	}
}

chrome.runtime.sendMessage(null, {
	'action' : 'getContentSettings'
}, function(settings){
	ja = new JAssistantContent(settings);
	if(settings.attachments){
		ja.initFileDrop();
	}
	if(settings.quickadd){
		ja.initQuickAdd();
	}
});