function SOAPClientParameters() {
	var _pl = new Array(),
		self = this;
	self.add = function (name, value) {
		_pl[name] = value;
		return this;
	}
	self.toXml = function () {
		var xml = "";
		for (var p in _pl) {
			switch (typeof(_pl[p])) {
			case "string":
			case "number":
			case "boolean":
			case "object":
				xml += "<" + p + ">" + SOAPClientParameters._serialize(_pl[p]) + "</" + p + ">";
				break;
			default:
				break;
			}
		}
		return xml;
	}
}
SOAPClientParameters._serialize = function (o) {
	var s = "";
	switch (typeof(o)) {
	case "string":
		s += o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		break;
	case "number":
	case "boolean":
		s += o.toString();
		break;
	case "object":
		if (o.constructor.toString().indexOf("function Date()") > -1) {
			var year = o.getFullYear().toString();
			var month = (o.getMonth() + 1).toString();
			month = (month.length == 1) ? "0" + month : month;
			var date = o.getDate().toString();
			date = (date.length == 1) ? "0" + date : date;
			var hours = o.getHours().toString();
			hours = (hours.length == 1) ? "0" + hours : hours;
			var minutes = o.getMinutes().toString();
			minutes = (minutes.length == 1) ? "0" + minutes : minutes;
			var seconds = o.getSeconds().toString();
			seconds = (seconds.length == 1) ? "0" + seconds : seconds;
			var milliseconds = o.getMilliseconds().toString();
			var tzminutes = Math.abs(o.getTimezoneOffset());
			var tzhours = 0;
			while (tzminutes >= 60) {
				tzhours++;
				tzminutes -= 60;
			}
			tzminutes = (tzminutes.toString().length == 1) ? "0" + tzminutes.toString() : tzminutes.toString();
			tzhours = (tzhours.toString().length == 1) ? "0" + tzhours.toString() : tzhours.toString();
			var timezone = ((o.getTimezoneOffset() < 0) ? "+" : "-") + tzhours + ":" + tzminutes;
			s += year + "-" + month + "-" + date + "T" + hours + ":" + minutes + ":" + seconds + "." + milliseconds + timezone;
		} else if (o.constructor.toString().indexOf("function Array()") > -1) {
			for (var p in o) {
				if (!isNaN(p)) {
					(/function\s+(\w*)\s*\(/ig).exec(o[p].constructor.toString());
					var type = RegExp.$1;
					switch (type) {
					case "":
						type = typeof(o[p]);
					case "String":
						type = "string";
						break;
					case "Number":
						type = "int";
						break;
					case "Boolean":
						type = "bool";
						break;
					case "Date":
						type = "DateTime";
						break;
					}
					s += "<" + type + ">" + SOAPClientParameters._serialize(o[p]) + "</" + type + ">"
				} else
					s += "<" + p + ">" + SOAPClientParameters._serialize(o[p]) + "</" + p + ">"
			}
		} else
			for (var p in o)
				s += "<" + p + ">" + SOAPClientParameters._serialize(o[p]) + "</" + p + ">";
		break;
	default:
		break;
	}
	return s;
}
function SOAPClient() {}
SOAPClient.invoke = function (prop) {
	SOAPClient_cacheAuth[prop['url']] = {
		'u': prop['username'],
		'p': prop['password']
	};
	if (prop['async'])
		SOAPClient._loadWsdl(prop['url'], prop['method'], prop['parameters'], prop['async'], prop['callback'], prop['error'], prop);
	else
		return SOAPClient._loadWsdl(prop['url'], prop['method'], prop['parameters'], prop['async'], prop['callback'], prop['error'], prop);
}

var SOAPClient_cacheWsdl = {}, SOAPClient_cacheAuth = {};
SOAPClient._loadWsdl = function (url, method, parameters, async, callback, error, prop) {
	var wsdl = SOAPClient_cacheWsdl[url];
	if (wsdl + "" != "" && wsdl + "" != "undefined")
		return SOAPClient._sendSoapRequest(url, method, parameters, async, callback, error, wsdl, prop);
		
	var xhr = $.ajax({
		'username': SOAPClient_cacheAuth[url]['u'],
		'password': SOAPClient_cacheAuth[url]['p'],	
		'url': url + "?wsdl",
		'async': async,
		'type': "GET",
		'success': function(data, status, xhr){
			SOAPClient._onLoadWsdl(url, method, parameters, async, callback, error, xhr, prop);
		},
		'error': function(xhr, textStatus, errorThrown){
			if(error)
				error(errorThrown);
		}
	})	
	if (!async){
		return xhr;
	}
}
SOAPClient._onLoadWsdl = function (url, method, parameters, async, callback, error, req, prop) {
	var wsdl = req.responseXML;
	SOAPClient_cacheWsdl[url] = wsdl;
	return SOAPClient._sendSoapRequest(url, method, parameters, async, callback, error, wsdl, prop);
}
SOAPClient._sendSoapRequest = function (url, method, parameters, async, callback, error, wsdl, prop) {
	var ns = (wsdl.documentElement.attributes["targetNamespace"] + "" == "undefined") ? 
				wsdl.documentElement.attributes.getNamedItem("targetNamespace").nodeValue : 
				wsdl.documentElement.attributes["targetNamespace"].value,
		sr = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + "<soap:Envelope " + 
				"xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " + 
				"xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" " + 
				"xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" + 
				"<soap:Body>" + 
				"<" + method + " xmlns=\"" + ns + "\">" +
				parameters.toXml() + "</" + method + "></soap:Body></soap:Envelope>",
		soapaction = ((ns.lastIndexOf("/") != ns.length - 1) ? ns + "/" : ns) + method;
	var	xhr = $.ajax({
			'username': SOAPClient_cacheAuth[url]['u'],
			'password': SOAPClient_cacheAuth[url]['p'],
			'beforeSend': prop['beforeSend'],
			'url': url,
			'async': async,
			'type': "POST",
			'headers': {
				"SOAPAction": soapaction,
				"Content-Type": "text/xml; charset=utf-8"
			},
			'success': function(data, status, xhr){
				SOAPClient._onSendSoapRequest(method, async, callback, error, wsdl, xhr);
			},
			'error': function(xhr, textStatus, errorThrown){
				if(error)
					error(errorThrown, xhr);
			},
			'data': sr
		});
	if (!async){
		return xhr;
	}		
}
SOAPClient._onSendSoapRequest = function (method, async, callback, error, wsdl, req) {
	var o = null;
	var nd = SOAPClient._getElementsByTagName(req.responseXML, method + "Result");
	if (nd.length == 0)
		nd = SOAPClient._getElementsByTagName(req.responseXML, "return");
	if (nd.length == 0) {
		if (req.responseXML.getElementsByTagName("faultcode").length > 0) {
			if (async || callback){
				if(error){
					return error(req.responseXML.getElementsByTagName("faultstring")[0].childNodes[0].nodeValue);
				} else{
					o = new Error(500, req.responseXML.getElementsByTagName("faultstring")[0].childNodes[0].nodeValue);
				}
			} else
				throw new Error(500, req.responseXML.getElementsByTagName("faultstring")[0].childNodes[0].nodeValue);
		}
	} else
		o = SOAPClient._soapresult2object(nd[0], wsdl);
	if (callback)
		callback(o, req.responseXML);
	if (!async)
		return o;
}
SOAPClient._soapresult2object = function (node, wsdl) {
	var wsdlTypes = SOAPClient._getTypesFromWsdl(wsdl);
	return SOAPClient._node2object(node, wsdlTypes);
}
SOAPClient._node2object = function (node, wsdlTypes) {
	if (node == null)
		return null;
	if (node.nodeType == 3 || node.nodeType == 4)
		return SOAPClient._extractValue(node, wsdlTypes);
	if (node.childNodes.length == 1 && (node.childNodes[0].nodeType == 3 || node.childNodes[0].nodeType == 4))
		return SOAPClient._node2object(node.childNodes[0], wsdlTypes);
	var isarray = SOAPClient._getTypeFromWsdl(node.nodeName, wsdlTypes).toLowerCase().indexOf("arrayof") != -1;
	if (!isarray) {
		var obj = null;
		if (node.hasChildNodes())
			obj = new Object();
		for (var i = 0; i < node.childNodes.length; i++) {
			var p = SOAPClient._node2object(node.childNodes[i], wsdlTypes);
			obj[node.childNodes[i].nodeName] = p;
		}
		return obj;
	} else {
		var l = new Array();
		for (var i = 0; i < node.childNodes.length; i++)
			l[l.length] = SOAPClient._node2object(node.childNodes[i], wsdlTypes);
		return l;
	}
}
SOAPClient._extractValue = function (node, wsdlTypes) {
	var value = node.nodeValue;
	switch (SOAPClient._getTypeFromWsdl(node.parentNode.nodeName, wsdlTypes).toLowerCase()) {
	default:
	case "s:string":
		return (value != null) ? value + "" : "";
	case "s:boolean":
		return value + "" == "true";
	case "s:int":
	case "s:long":
		return (value != null) ? parseInt(value + "", 10) : 0;
	case "s:double":
		return (value != null) ? parseFloat(value + "") : 0;
	case "s:datetime":
		if (value == null)
			return null;
		else {
			value = value + "";
			value = value.substring(0, (value.lastIndexOf(".") == -1 ? value.length : value.lastIndexOf(".")));
			value = value.replace(/T/gi, " ");
			value = value.replace(/-/gi, "/");
			var d = new Date();
			d.setTime(Date.parse(value));
			return d;
		}
	}
}
SOAPClient._getTypesFromWsdl = function (wsdl) {
	var wsdlTypes = new Array();
	var ell = wsdl.getElementsByTagName("s:element");
	var useNamedItem = true;
	if (ell.length == 0) {
		ell = wsdl.getElementsByTagName("element");
		useNamedItem = false;
	}
	for (var i = 0; i < ell.length; i++) {
		if (useNamedItem) {
			if (ell[i].attributes.getNamedItem("name") != null && ell[i].attributes.getNamedItem("type") != null)
				wsdlTypes[ell[i].attributes.getNamedItem("name").nodeValue] = ell[i].attributes.getNamedItem("type").nodeValue;
		} else {
			if (ell[i].attributes["name"] != null && ell[i].attributes["type"] != null)
				wsdlTypes[ell[i].attributes["name"].value] = ell[i].attributes["type"].value;
		}
	}
	return wsdlTypes;
}
SOAPClient._getTypeFromWsdl = function (elementname, wsdlTypes) {
	var type = wsdlTypes[elementname] + "";
	return (type == "undefined") ? "" : type;
}
SOAPClient._getElementsByTagName = function (document, tagName) {
	try {
		return document.selectNodes(".//*[local-name()=\"" + tagName + "\"]");
	} catch (ex) {}
	return document.getElementsByTagName(tagName);
}
SOAPClient._toBase64 = function (input) {
	var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	var output = "";
	var chr1,
	chr2,
	chr3;
	var enc1,
	enc2,
	enc3,
	enc4;
	var i = 0;
	do {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);
		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;
		if (isNaN(chr2)) {
			enc3 = enc4 = 64;
		} else if (isNaN(chr3)) {
			enc4 = 64;
		}
		output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
			keyStr.charAt(enc3) + keyStr.charAt(enc4);
	} while (i < input.length);
	return output;
}
 