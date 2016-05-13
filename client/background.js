// var nav = new NavigationCollector();

var activeTab = 0;
var previousUrls;
var currentTabTree;
var activeWindow;
var dontAddTheseUrl = ["chrome://newtab/","http://localhost:8080/"];

var typeEnum = {
	RECOMMENDED: "recommended",
	LINK: "link",
	TYPED: "typed"
}

function node(name, parent, type) {
	this.name = name;
	this.parent = parent;
	this.type = type || typeEnum.LINK;
}


chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
	chrome.storage.sync.remove([String(activeWindow * tabId)], function(storage) {});
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	chrome.storage.sync.get({[String(activeWindow * activeInfo.tabId)]: [],'previousUrls': {}}, function (storage) {
		previousUrls = storage.previousUrls || {};
		currentTabTree = storage[String(activeWindow * activeInfo.tabId)] || [];
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

function addVisitToTree(tabId, changeInfo) {
	if (currentTabTree && previousUrls) {
		var lastUrlVisitedOnThisTab = previousUrls["p" + tabId.toString()] || "null";
		var newVisit = new node(changeInfo.url, lastUrlVisitedOnThisTab);
		var oppositeDirection = new node(lastUrlVisitedOnThisTab, changeInfo.url);

		var arrayContainsOppositeDirection = false;
		var sitePathAlreadyTraversed = false;
		currentTabTree.forEach(function (record) {
			if (JSON.stringify(record) === JSON.stringify(oppositeDirection)) {
				arrayContainsOppositeDirection = true;
			} else if (JSON.stringify(record) === JSON.stringify(newVisit)) {
				sitePathAlreadyTraversed = true;
			}
		});

		if (!arrayContainsOppositeDirection && !sitePathAlreadyTraversed) {
	  		currentTabTree.push(newVisit);
	  		//for now ajax to server and log the three most similar domains to console
	  		addSimilalURLs_(newVisit.name);
		}

	  	previousUrls["p" + tabId.toString()] = changeInfo.url;

	    chrome.storage.sync.set({[String(activeWindow * tabId)]: currentTabTree, 'previousUrls': previousUrls}, function() {
	          // Notify that we saved.
	          console.log('changes saved');
	    });
	}
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {

  if (changeInfo.url && checkShouldAddUrl(changeInfo.url)) {
  	if (!currentTabTree || !previousUrls || activeTab !== tabId) {
  		chrome.storage.sync.get({[String(activeWindow * tabId)]: [],'previousUrls': {}}, function (storage) {
    		previousUrls = storage.previousUrls || {};
    		currentTabTree = storage[String(activeWindow * tabId)] || [];
    		activeTab = tabId;
    		addVisitToTree(tabId, changeInfo);
    	});
  	} else {
  		addVisitToTree(tabId, changeInfo);
  	}
  }
});


function onMessageListener_ (message, sender, sendResponse) {
	if (message.type === 'getJSON') {
		if (!currentTabTree) {
			chrome.storage.sync.get({[activeWindow * activeTab]: []}, function (obj) {
			    currentTabTree = obj || [];
			    sendResponse({result:currentTabTree});
			});
		} else {
			console.log(JSON.stringify({'result':currentTabTree}));
			sendResponse({'result':currentTabTree});
		} 
	} else 
		sendResponse({});
}

chrome.windows.onFocusChanged.addListener(function (windowId) {
	activeWindow = windowId;
});

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