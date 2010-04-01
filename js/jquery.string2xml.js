    $.string2xml = function(text)
    {
        var xmlDoc = "";

        if (window.DOMParser)
        {
                parser = new DOMParser();
                xmlDoc = parser.parseFromString(text,"text/xml");
        }
        else // Internet Explorer
        {
                xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async="false";
                xmlDoc.loadXML(text); 
        }

        return xmlDoc;
    };
