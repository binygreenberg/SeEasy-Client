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

    root = treeData[0];
    console.log("callback function root", root);
    update(root);
});