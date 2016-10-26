// var nav = new NavigationCollector();

var activeTab = 0;
var previousUrls;
var currentTabTree;
var isNewTab = false;
var openedTab = null;
var tabMap = {};
var dontAddTheseUrl = [/chrome:\/\/newtab/,/http:\/\/localhost/,/chrome:\/\/extensions/];
var lastUrl = "";
var newTabActivated = false;
var urlChanged = false;

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
	console.log("the tab was created");
	chrome.storage.sync.get({'tabMap': {}}, function (storage) {
		storage.tabMap[tab.id] = tab.id;
		chrome.storage.sync.set({'tabMap': storage.tabMap}, function() {
	          // Notify that we saved.
	          console.log('tab map saved');
	    });
	});		
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	console.log('tab changed to tab' + String(activeInfo.tabId));
	if (!isNewTab) {
		chrome.storage.sync.get({'tabMap': {}}, function (storage) {
			console.log("getting the mapped tab");
			var mappedTab = storage.tabMap[activeInfo.tabId];
			if (mappedTab) {
				chrome.storage.sync.get({[String(mappedTab)]: [],'previousUrls': {}}, function (storage) {
					previousUrls = storage.previousUrls || {};
					currentTabTree = storage[String(mappedTab)] || [];
					activeTab = mappedTab;
					lastUrl = previousUrls["p" + activeTab.toString()];
				});
			} else {
				console.log("onActivated called at wrong time, tabMap comes back emtpy");
				currentTabTree = [];
				storage.tabMap[activeInfo.tabId] = activeInfo.tabId;
				chrome.storage.sync.set({[String(activeInfo.tabId)]: currentTabTree, 'tabMap': storage.tabMap}, function() {
			          console.log('onActivated; no tabMap result; new tabTree and TabMap and saved');
			    });
				chrome.storage.sync.get({'previousUrls': {}}, function (storage) {
					previousUrls = storage.previousUrls || {};
					previousUrls["p" + activeInfo.tabId.toString()] = "null";
					chrome.storage.sync.set({'previousUrls': previousUrls}, function() {});
				});
				activeTab = activeInfo.tabId;
				lastUrl = "null";
			}
		});
	} else {
		newTabActivated = true;
	}
});

chrome.webNavigation.onCommitted.addListener(function(details) {
	console.log("omCommited is called");
	if (isNewTab && openedTab) {
		if (details.transitionType === typeEnum.LINK || details.transitionType === typeEnum.AUTO_SUBFRAME) {
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
		} else {
			currentTabTree = [];
			chrome.storage.sync.get({'previousUrls': {}}, function (storage) {
				previousUrls = storage.previousUrls || {};
				previousUrls["p" + openedTab.id.toString()] = "null";
				chrome.storage.sync.set({'previousUrls': previousUrls}, function() {
					console.log('tabMap is now: ' + JSON.stringify(tabMap));
				});
			});
			if (newTabActivated) {
				activeTab = openedTab.id;
				lastUrl = "null";
			}
		}
		newTabActivated = false; 
		isNewTab = false;
	}
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
	chrome.storage.sync.get({'previousUrls': {}, 'tabMap': {}}, function (storage) {
		previousUrls = storage.previousUrls || {};
		var tabTreeIndex = storage.tabMap[tabId];
		delete previousUrls["p" + tabId.toString()];
		delete storage.tabMap[tabId];

		let mapHasAnotherRefernce = false;
		for (entry in storage.tabMap) {
			if (storage.tabMap[entry] == tabId){
				mapHasAnotherRefernce = true;
			}
		}
		if (!mapHasAnotherRefernce) {
			chrome.storage.sync.remove([String(tabTreeIndex)], function(storage) {});
		}

		chrome.storage.sync.set({'tabMap': storage.tabMap, 'previousUrls': previousUrls}, function() {
			console.log('tabMap is now: ' + JSON.stringify(tabMap));
		});
	});
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
		var falsePath = false;
		tabTree.forEach(function (record) {
			if (record.name === newVisit.parent && record.parent === newVisit.name) {
				arrayContainsOppositeDirection = true;
			} else if (record.name === newVisit.name && record.parent === newVisit.parent) {
				sitePathAlreadyTraversed = true;
			} else if (newVisit.name === newVisit.parent) {
				falsePath = true;
			}
		});

		if (!arrayContainsOppositeDirection && !sitePathAlreadyTraversed && !falsePath) {
	  		tabTree.push(newVisit);
	  		//for now ajax request to server and log the three most similar domains to console
	  		//setTimeout(function(){
	  			getSimilalURLs_(newVisit.name, tabTree,lastUrlVisitedOnThisTab,tab.title);
			//}, 15000);

	  		console.log('added to list: ' + JSON.stringify(currentTabTree));
		}
		getEdges_(tabTree, changeInfo.url);
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
  if (changeInfo.url) {
  	urlChanged = true;
  } else if (urlChanged && tab.status === 'complete' && tab.active && checkShouldAddUrl(tab.url) && !isNewTab) {
  	urlChanged = false;
  	postVisitedURLs_(tab.url);
  	lastUrl = tab.url;
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
	    		addVisitToTree(tabId, tab, tab, currentTabTree, lastUrlVisitedOnThisTab);
	    		//send the edge to server
	    		if (lastUrlVisitedOnThisTab){
	    			postEdges_(lastUrl,lastUrlVisitedOnThisTab);
	    		}
	    	});
	    });
  	} else {
  		console.log("Data was already loaded and it is:" + JSON.stringify(currentTabTree));
  		var lastUrlVisitedOnThisTab = previousUrls["p" + tabId.toString()] || "null";
  		if (lastUrlVisitedOnThisTab){
			postEdges_(lastUrl,lastUrlVisitedOnThisTab);
		}
		addVisitToTree(tabId, tab, tab, currentTabTree, lastUrlVisitedOnThisTab);
  	}
  }
});

function onMessageListener_ (message, sender, sendResponse) {
	if (message.type === 'getJSON') {
		if (!currentTabTree || currentTabTree.length === 0) { 
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
		chrome.storage.sync.get({'tabMap': {},'previousUrls': {}}, function (storage) {
			var mappedTo = storage.tabMap[activeTab];
			lastUrl = storage.previousUrls["p" + mappedTo];
			if (lastUrl) {
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
			}
		});
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
		var xhr = new XMLHttpRequest();
		xhr.open("POST", 'http://seeasy.herokuapp.com/rec/edges/' + parentUrl + '{' + url +'/', true);
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				console.log('return value from POST Edges');
		    }
		}
		xhr.send();
	}
}

function slicePrefixAndSufix(url) {
	if (url.slice(- 1) === '/') {
		url = url.slice(0, -1);
	}
	if (url.slice(0, 7) == 'http://') {
		url = url.slice(7, url.length);
	} else if (url.slice(0, 8) == 'https://') {
		url = url.slice(8, url.length);
	}
	return url;
}

function getEdges_(tabTree, parentUrl) {
	var xhr = new XMLHttpRequest();
	parentUrlStripped = slicePrefixAndSufix(parentUrl);
	parentUrlStripped = extractDomain_(parentUrlStripped);
	var targetUrl = 'http://seeasy.herokuapp.com/rec/edges/' + parentUrlStripped + '{notRelevant/';
	xhr.open("GET", targetUrl, true);
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			console.log('return value from GET Edges');
			var response = JSON.parse(xhr.responseText);
			if (response.length > 0) {
				var projectedUrl = response[0].fields.son;
				var projectedVisit = new node(projectedUrl, parentUrl, projectedUrl, "future");
				//tabTree.push(projectedVisit);
				addEdgeIfRelevant(tabTree, projectedVisit);
			}
	    }
	}
	xhr.send();
}

function addEdgeIfRelevant(tabTree, newVisit) {
	var arrayContainsOppositeDirection = false;
	var sitePathAlreadyTraversed = false;
	var falsePath = false;
	tabTree.forEach(function (record) {
		if (record.name === newVisit.parent && record.parent === newVisit.name) {
			arrayContainsOppositeDirection = true;
		} else if (record.name === newVisit.name && record.parent === newVisit.parent) {
			sitePathAlreadyTraversed = true;
		} else if (newVisit.name === newVisit.parent) {
			falsePath = true;
		}
	});

	if (!arrayContainsOppositeDirection && !sitePathAlreadyTraversed && !falsePath) {
  		tabTree.push(newVisit);
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