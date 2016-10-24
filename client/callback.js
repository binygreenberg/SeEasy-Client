function show(functionType){
	remove_element_from_body('p');
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

	var body = document.getElementsByTagName('body')[0];
	var paragraph = document.createElement("p");
	var node = document.createTextNode("Welcome to Seeasy! Our application is designed to do\
	 2 main things that will make your browsing experience that much more enjoyable. Firstly\
	 , we show you your browsing history in a user friendly way. There are 3 different ways \
	 you can view your browsing history, each using a different type of graph, but the idea \
	 in all of them is essentially the same. To switch between the different graphs there ar\
	 e 3 buttons at the top of the page. Choose whichever one is most pleasing to your eye! \
	 Now that you have chosen one, we'll explain how to read the graph. Red nodes represent \
	 sites that you have been to that led you to other sites. Blue nodes represent sites tha\
	 t didn't lead to other sites, either because you are on that site right now, or because\
	 it led to a dead end. Finally, the Purple nodes bring us to the second purpose of our a\
	 pp: helping you find more interesting sites to browse to! The purple nodes represent si\
	 tes that you have not been to y\
	 et but, based on what other vistors to their parent nodes site have done, we believe th\
	 at the site in the purple node may interest you. If you are interested in checking out \
	 that site or any of the other sites in the graph simply click on the node and the site \
	 will open in a new tab! Note: if you open new tab from a link in the tab that you are c\
	 urrently browsing on, the 2 tabs will share the same graph and both add to it! Finally,\
	 we have a box at the bottom of the page that recommends 3 sites for you to browse to, b\
	 ased on sites that we have found a lot of users like to browse to after being on sites \
	 like the site you are currently on. So that's it! Happy Browsing!");
	paragraph.appendChild(node);
	paragraph.style.margin = "20px";
	body.appendChild(paragraph);
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

