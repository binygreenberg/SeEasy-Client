// var nav = new NavigationCollector();

var activeTab = 0;
var previousUrls;
var currentTabTree;
var activeWindow;
var dontAddTheseUrl = ["chrome://newtab/","http://localhost:8080/"];

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

function addVisitToTree(tabId, changeInfo) {
	if (currentTabTree && previousUrls) {
		var lastUrlVisitedOnThisTab = previousUrls["p" + tabId.toString()] || "null";

		var newVisit = {"name" : changeInfo.url, "parent": lastUrlVisitedOnThisTab};
		var oppositeDirection = {"name" : lastUrlVisitedOnThisTab, "parent": changeInfo.url};

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


