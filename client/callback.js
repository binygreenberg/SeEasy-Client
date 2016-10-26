function show(functionType){
	document.getElementById('help_info').style.display = "none";
	document.getElementById("help_button").disabled = false;
	console.log('in showTree method');
	chrome.runtime.sendMessage(
	    {'type': 'getJSON'},
	    function generateList(response) {
	    var data = response.result;

	    // *********** Convert flat data into a nice tree ***************
		// create a name:node map
		console.log(data);
		var dataMap = data.reduce(function(map, node) {
			map[node.name] = node;
			return map;
		}, {});
		console.log(dataMap);
		// create the tree array
		var treeData = [];
		data.forEach(function(node) {
			// add to parent
			var parent = dataMap[node.parent];
			if (parent) {
				// create child array if it doesn't exist
				(parent.children || (parent.children = []))
					// add node to child array
					.push(node);
			} else {
				// parent is null or missing
				treeData.push(node);
			}
		});

	    rootTree = treeData[0];
	    console.log("callback function rootTree", rootTree);
	    functionType(rootTree);
	});
	chrome.runtime.sendMessage(
    {'type': 'getRecommendations'},
    function generateList(response) {
	    var data = response;

	    if (data != 'null') {
			var index = 0;
			for (var key in data) {
	       		if (data.hasOwnProperty(key)) {
	          		console.log('return value from GET' ,data[key].pk, data[key].fields.category);
	       			document.getElementsByTagName('a')[index].setAttribute("href", data[key].pk);
	       			document.getElementsByTagName('a')[index++].innerHTML = data[key].pk;
	       		}
	    	}
		} 
	});
}

function show_instructions() {
	document.getElementById("help_button").disabled = true;
	remove_element_from_body('svg');
	document.getElementById('help_info').style.display = "block";
}

function remove_element_from_body(tag) {
	var body = document.getElementsByTagName('body')[0];
	var element = document.getElementsByTagName(tag)[0];
	if(body && element) {
		body.removeChild(element);
	}
}

show(setListRoot)

// Add event listeners once the DOM has fully loaded by listening for the
document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('tree').addEventListener('click', function(){show(setTreeRoot)});
	document.getElementById('graph').addEventListener('click', function(){show(setListRoot)});
	document.getElementById('radial').addEventListener('click', function(){show(setRadialRoot)});
	document.getElementById('help_button').addEventListener('click', function(){show_instructions()});
});

