java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --externs=externs\jquery.js --externs=externs\chrome.js  --js=js\soapclient.js --js=js\animatedIcon.js --js=js\xsddate.js --js=js\jira.servers.js --js=js\jira.filters.js   --js=js\jira.loader.js  --js_output_file=js\jira.js
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --externs=externs\jquery.js  --js=js\jquery.combobox.js --js_output_file=js\jquery.combobox.pack.js
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --externs=externs\jquery.js  --js=js\jquery.md5.js --js_output_file=js\jquery.md5.pack.js
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --externs=externs\jquery.js  --js=js\colorpicker.js --js_output_file=js\jquery.colorpicker.pack.js
java -jar compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS  --js=js\jquery.dataTables.utils.js --js_output_file=js\jquery.dataTables.utils.pack.js
java -jar compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS  --js=js\jira.popup.js --js_output_file=js\jira.popup.pack.js
