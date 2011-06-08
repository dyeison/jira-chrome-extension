var ja = {
	subscribe: function(jql){
		chrome.extension.sendRequest({
			'action': 'subscribe',
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
			$("#secondary > div.content").prepend(
				$("<div />").attr('id', 'JA_drag_file_box').css({
					'color': '#666',
					'border-radius': '15px',
					'border': '4px solid #bbcee9',
					'padding': '20px',
					'background': '-webkit-linear-gradient(bottom, #fff, #eaeef3 50%, #d3d7db)',
					'-webkit-box-shadow':' inset 0px 0px 5px #888',
					'text-align': 'center',
					'min-height': '48px'
				})
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
					$(this).css({
						'border-color': '#8aa7cf',
						'color': '#000',
						'background': '#c1dbff'
					})
				})
				.bind('dragleave ', function(){
					$(this).css({
						'color': '#666',
						'border-color': '#bbcee9',
						'background': '-webkit-linear-gradient(bottom, #fff, #eaeef3 50%, #d3d7db)'
					});
				})
				.bind('dragover', function() {
					return false;
				})
				.bind('drop', function(e){
					$(this).css({
						'color': '#666',
						'border-color': '#bbcee9',
						'background': '-webkit-linear-gradient(bottom, #fff, #eaeef3 50%, #d3d7db)'
					});			
							$(this).html("<img src='"+chrome.extension.getURL('images/ajax-loader.gif')+"'/>")
							var reader, 
								files = e.originalEvent.dataTransfer.files,
								rededFiles = 0;
							function sendRequestToBgPage(){
								chrome.extension.sendRequest({
									'action': 'attach',
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

