// var nav = new NavigationCollector();

var activeTab = 0;
var previousUrls;
var currentTabTree;
var isNewTab = false;
var openedTab = null;
var tabMap = {};
var dontAddTheseUrl = [/chrome:\/\/newtab/,/http:\/\/localhost/,/chrome:\/\/extensions/];
var lastUrl = "";

var typeEnum = {
	RECOMMENDED: "recommended",
	LINK: "link",
	TYPED: "typed",
	AUTO_SUBFRAME: "auto_subframe"
}

function node(name, parent, title, type) {
	this.name = name;
	this.parent = parent;
	this.type = type || typeEnum.LINK;
	this.title = title;
}

chrome.tabs.onCreated.addListener(function(tab) {
	isNewTab = true;
	openedTab = tab;
	chrome.storage.sync.get({'tabMap': {}}, function (storage) {
		storage.tabMap[tab.id] = tab.id;
		chrome.storage.sync.set({'tabMap': storage.tabMap}, function() {
	          // Notify that we saved.
	          console.log('changes saved');
	    });
	});		
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
	chrome.storage.sync.get({'previousUrls': {}, 'tabMap': {}}, function (storage) {
		previousUrls = storage.previousUrls || {};
		delete previousUrls["p" + tabId.toString()];
		delete storage.tabMap[tabId];
		chrome.storage.sync.set({'tabMap': storage.tabMap, 'previousUrls': previousUrls}, function() {
			console.log('tabMap is now: ' + JSON.stringify(tabMap));
		});
	});
	chrome.storage.sync.remove([String(tabId)], function(storage) {});
	if (Object.keys(previousUrls).length > 30) {
		chrome.tabs.query({}, function(allTabs) {
	    	for (var tabId in previousUrls) {
	    		var tabStillExists = false;
	    		for (i = 0; i < allTabs.length; i++) {
	    			if (tabId === ("p" + allTabs[i].id.toString())) {
	    				tabStillExists = true;
	    				break;
	    			}
	    		}
	    		if (!tabStillExists) {
	    			delete previousUrls[tabId];
	    		}
	    	}
	    	chrome.storage.sync.set({'previousUrls': previousUrls}, function() {
		          // Notify that we saved.
		          console.log('changes saved');
		    });
	    });
	}
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	console.log('tab changed to tab' + String(activeInfo.tabId));
	if (!isNewTab) {
		chrome.storage.sync.get({'tabMap': {}}, function (storage) {
			var mappedTab = storage.tabMap[activeInfo.tabId]
			chrome.storage.sync.get({[String(mappedTab)]: [],'previousUrls': {}}, function (storage) {
				previousUrls = storage.previousUrls || {};
				currentTabTree = storage[String(mappedTab)] || [];
				activeTab = mappedTab;
			});
		});
	}
});

function checkShouldAddUrl(url){
	var urlIsInList = dontAddTheseUrl.some(function(e1) {
  		return e1.test(url);
	});
	return !urlIsInList;
}

function handleStateChange(){
	if (xhttp.readyState == 4 && xhttp.status == 200) {
    	document.getElementById("demo").innerHTML = xhttp.responseText;
  	}
}

function addVisitToTree(tabId, changeInfo, tab, tabTree, lastUrlVisitedOnThisTab) {
	if (tabTree && previousUrls) {
		var newVisit = new node(changeInfo.url, lastUrlVisitedOnThisTab, (tab.title || changeInfo.url));

		var arrayContainsOppositeDirection = false;
		var sitePathAlreadyTraversed = false;
		tabTree.forEach(function (record) {
			if (record.name === newVisit.parent && record.parent === newVisit.name) {
				arrayContainsOppositeDirection = true;
			} else if (record.name === newVisit.name && record.parent === newVisit.parent) {
				sitePathAlreadyTraversed = true;
			}
		});

		if (!arrayContainsOppositeDirection && !sitePathAlreadyTraversed) {
	  		tabTree.push(newVisit);
	  		//for now ajax request to server and log the three most similar domains to console
	  		setTimeout(function(){
	  			getSimilalURLs_(newVisit.name, tabTree,lastUrlVisitedOnThisTab,tab.title);
			}, 15000);

	  		console.log('added to list: ' + JSON.stringify(currentTabTree));
		}

	  	previousUrls["p" + tabId.toString()] = changeInfo.url;
	  	chrome.storage.sync.get({'tabMap': {}}, function (storage) {
		  	var mappedTab = storage.tabMap[tabId];
		  	console.log('the real tabId is  ' + tabId.toString());
		    chrome.storage.sync.set({[String(mappedTab)]: tabTree, 'previousUrls': previousUrls}, function() {
		          // Notify that we saved.
		          console.log('changes saved for' + mappedTab.toString() + 'are : ' + JSON.stringify(tabTree));
		    });
		});

	}
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.url && checkShouldAddUrl(changeInfo.url) && !isNewTab) {
  	postVisitedURLs_(changeInfo.url);
  	lastUrl = changeInfo.url;
  	if (!currentTabTree || !previousUrls || activeTab !== tabId) {
  		chrome.storage.sync.get({'tabMap': {}}, function (storage) {
	  		var mappedTab = storage.tabMap[tabId];
			console.log("This is the tabMap in onUpdated : " + JSON.stringify(tabMap));
			console.log('this is the tabID that I am putting into the map: ' + tabId.toString())
	  		chrome.storage.sync.get({[String(mappedTab)]: [],'previousUrls': {}}, function (storage) {
	    		previousUrls = storage.previousUrls || {};
	    		currentTabTree = storage[String(mappedTab)] || [];
	    		//console.log("Had to reload the data from scratch and it is: " + JSON.stringify(currentTabTree));
	    		activeTab = tabId;
	    		var lastUrlVisitedOnThisTab = previousUrls["p" + tabId.toString()] || "null";
	    		addVisitToTree(tabId, changeInfo, tab, currentTabTree, lastUrlVisitedOnThisTab);
	    		//send the edge to server
	    		if (lastUrlVisitedOnThisTab){
	    			postEdges_(changeInfo.url,lastUrlVisitedOnThisTab);
	    		}
	    	});
	    });
  	} else {
  		console.log("Data was already loaded and it is:" + JSON.stringify(currentTabTree));
  		var lastUrlVisitedOnThisTab = previousUrls["p" + tabId.toString()] || "null";
  		if (lastUrlVisitedOnThisTab){
			postEdges_(changeInfo.url,lastUrlVisitedOnThisTab);
		}
		addVisitToTree(tabId, changeInfo, tab, currentTabTree, lastUrlVisitedOnThisTab);
  	}
  }
});

chrome.webNavigation.onCommitted.addListener(function(details) {
	if (isNewTab && openedTab && (details.transitionType === typeEnum.LINK 
		|| details.transitionType === typeEnum.AUTO_SUBFRAME)) {
		console.log("This is the tabMap in onCommitted : " + JSON.stringify(tabMap));
		console.log("In onCommitted the currentTabTree is:" + JSON.stringify(currentTabTree));
		chrome.storage.sync.get({'tabMap': {}}, function (storage) {
			var parentTabId = openedTab.openerTabId;
			while (storage.tabMap[parentTabId] !== parentTabId) {
				parentTabId = storage.tabMap[parentTabId];
			}	
			storage.tabMap[openedTab.id] = parentTabId;
			chrome.storage.sync.set({'tabMap': storage.tabMap}, function() {
		    	var lastUrlVisitedOnThisTab = previousUrls["p" + openedTab.openerTabId.toString()] || "null";
				addVisitToTree(openedTab.id, openedTab, openedTab, currentTabTree, lastUrlVisitedOnThisTab);
		    });
		});
	}
	isNewTab = false;
});

function onMessageListener_ (message, sender, sendResponse) {
	if (message.type === 'getJSON') {
		if (!currentTabTree) {
			console.log('getting json for tab ' + String(activeTab));
			chrome.storage.sync.get({'tabMap': {}}, function (storage) {
				var mappedTab = storage.tabMap[activeTab]
				chrome.storage.sync.get({[String(mappedTab)]: []}, function (obj) {
				    currentTabTree = obj[activeTab] || [];
				    console.log(JSON.stringify({'result':currentTabTree}));
				    sendResponse({'result':currentTabTree});
				});
			});
			return true;
		} else {
			console.log(JSON.stringify({'result':currentTabTree}));
			sendResponse({'result':currentTabTree});
		} 
	} else if (message.type === 'getDummyData'){
		sendResponse({});
	} else if (message.type === 'getRecommendations') {
		var urlDomain = extractDomain_(lastUrl);
		var xhr = new XMLHttpRequest();
		xhr.open("GET", 'http://seeasy.herokuapp.com/rec/website/'+urlDomain, true);
		xhr.onreadystatechange = function(tabTree,lastUrlVisitedOnThisTab,tabTitle) {
			if (xhr.readyState == 4) {
				var json = JSON.parse(xhr.responseText);
				sendResponse(json);
			}
		}
		xhr.send();
		return true;
	}
	else sendResponse({});

}

chrome.runtime.onMessage.addListener(onMessageListener_);

function getSimilalURLs_(url,tabTree,lastUrlVisitedOnThisTab,tabTitle){
	var urlDomain = extractDomain_(url)
	var xhr = new XMLHttpRequest();
	xhr.open("GET", 'http://seeasy.herokuapp.com/rec/website/'+urlDomain, true);
	xhr.onreadystatechange = function(tabTree,lastUrlVisitedOnThisTab,tabTitle) {
		if (xhr.readyState == 4) {
			var json = JSON.parse(xhr.responseText);
			if (json != 'null') {
				for (var key in json) {
		       		if (json.hasOwnProperty(key)) {
		          		console.log('return value from GET' ,json[key].pk, json[key].fields.category);
		       			// var newVisit = new node(json[key].pk, lastUrlVisitedOnThisTab, (tabTitle || json[key].pk));
	    				// tabTree.push(newVisit);
		       		}
		    	}
	    	} else {
	    		console.log('return value from GET null');
	    	}
		}
	}
	xhr.send();
}



function postVisitedURLs_(url){
	var urlDomain = extractDomain_(url)
	var xhr = new XMLHttpRequest();
	xhr.open("POST", 'http://seeasy.herokuapp.com/rec/website/' + urlDomain + '/', true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			console.log('return value from POST');
	    }
	}
	xhr.send();
}

function postEdges_(url,parentUrl){
	if (parentUrl != 'null' && parentUrl) {
		var urlDomain = extractDomain_(url)
		var parentUrlDomain = extractDomain_(parentUrl)
		var xhr = new XMLHttpRequest();
		xhr.open("POST", 'http://seeasy.herokuapp.com/rec/edges/' + parentUrlDomain + '&' + urlDomain +'/', true);
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				console.log('return value from POST Edges');
		    }
		}
		xhr.send();
	}
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



/*
		if (activeTab === openedTab.openerTabId) {
			chrome.storage.sync.get({[String(openedTab.openerTabId)]: [],'previousUrls': {}}, function (storage) {
				previousUrls = storage.previousUrls || {};
				var parentTabTree = storage[String(openedTab.openerTabId)] || [];
				var newTabTree = JSON.parse(JSON.stringify(parentTabTree));
				var lastUrlVisitedOnThisTab = previousUrls["p" + openedTab.openerTabId.toString()] || "null";
				addVisitToTree(openedTab.id, openedTab, openedTab, newTabTree, lastUrlVisitedOnThisTab);
			});
		} else {
			var newTabTree = JSON.parse(JSON.stringify(currentTabTree));
			var lastUrlVisitedOnThisTab = previousUrls["p" + openedTab.openerTabId.toString()] || "null";
			addVisitToTree(openedTab.id, openedTab, openedTab, newTabTree, lastUrlVisitedOnThisTab);
		}
		*/