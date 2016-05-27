// var nav = new NavigationCollector();

var activeTab = 0;
var previousUrls;
var currentTabTree;
var dontAddTheseUrl = ["chrome://newtab/","http://localhost:8080/"];

var typeEnum = {
	RECOMMENDED: "recommended",
	LINK: "link",
	TYPED: "typed"
}

function node(name, parent, title, type) {
	this.name = name;
	this.parent = parent;
	this.type = type || typeEnum.LINK;
	this.title = title;
}


chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
	delete previousUrls["p" + tabId.toString()];
	chrome.storage.sync.remove([String(tabId)], function(storage) {});

});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	console.log('tab changed to tab' + String(activeInfo.tabId));
	chrome.storage.sync.get({[String(activeInfo.tabId)]: [],'previousUrls': {}}, function (storage) {
		previousUrls = storage.previousUrls || {};
		currentTabTree = storage[String(activeInfo.tabId)] || [];
		activeTab = activeInfo.tabId;
	});
});

function checkShouldAddUrl(url){
	return (dontAddTheseUrl.indexOf(url) == -1) ? true : false;
}

function handleStateChange(){
	if (xhttp.readyState == 4 && xhttp.status == 200) {
    	document.getElementById("demo").innerHTML = xhttp.responseText;
  	}
}

function addVisitToTree(tabId, changeInfo, tab) {
	if (currentTabTree && previousUrls) {
		var lastUrlVisitedOnThisTab = previousUrls["p" + tabId.toString()] || "null";
		var newVisit = new node(changeInfo.url, lastUrlVisitedOnThisTab, tab.title);

		var arrayContainsOppositeDirection = false;
		var sitePathAlreadyTraversed = false;
		currentTabTree.forEach(function (record) {
			if (record.name === newVisit.parent && record.parent === newVisit.name) {
				arrayContainsOppositeDirection = true;
			} else if (record.name === newVisit.name && record.parent === newVisit.parent) {
				sitePathAlreadyTraversed = true;
			}
		});

		if (!arrayContainsOppositeDirection && !sitePathAlreadyTraversed) {
	  		currentTabTree.push(newVisit);
	  		//for now ajax to server and log the three most similar domains to console
	  		//addSimilalURLs_(newVisit.name);
	  		//console.log('added to list: ' + JSON.stringify(currentTabTree));
		}

	  	previousUrls["p" + tabId.toString()] = changeInfo.url;
	    chrome.storage.sync.set({[String(tabId)]: currentTabTree, 'previousUrls': previousUrls}, function() {
	          // Notify that we saved.
	          console.log('changes saved' + JSON.stringify(currentTabTree));
	    });
	}
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {

  if (changeInfo.url && checkShouldAddUrl(changeInfo.url)) {
  	if (!currentTabTree || !previousUrls || activeTab !== tabId) {
  		chrome.storage.sync.get({[String(tabId)]: [],'previousUrls': {}}, function (storage) {
    		previousUrls = storage.previousUrls || {};
    		currentTabTree = storage[String(tabId)] || [];
    		activeTab = tabId;
    		addVisitToTree(tabId, changeInfo, tab);
    	});
  	} else {
		addVisitToTree(tabId, changeInfo, tab);
  	}
  }
});


function onMessageListener_ (message, sender, sendResponse) {
	if (message.type === 'getJSON') {
		if (!currentTabTree) {
			console.log('getting json for tab ' + String(activeTab));
			chrome.storage.sync.get({[String(activeTab)]: []}, function (obj) {
			    currentTabTree = obj[activeTab] || [];
			    console.log(JSON.stringify({'result':currentTabTree}));
			    sendResponse({'result':currentTabTree});
			});
		} else {
			console.log(JSON.stringify({'result':currentTabTree}));
			sendResponse({'result':currentTabTree});
		} 
	} else 
		sendResponse({});
}

chrome.runtime.onMessage.addListener(onMessageListener_);

function addSimilalURLs_(url){
	var urlDomain = extractDomain_(url)
	var xhr = new XMLHttpRequest();
	xhr.open("GET", 'http://localhost:8000/rec/api/'+urlDomain, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			var json = JSON.parse(xhr.responseText);
			for (var key in json) {
	       		if (json.hasOwnProperty(key)) {
	          		console.log(json[key].pk, json[key].fields.category);
	       		}
	    	}
		}
	}
	xhr.send();
}
function extractDomain_(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}
