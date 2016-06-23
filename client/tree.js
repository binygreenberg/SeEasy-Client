

// ************** Generate the tree diagram	 *****************

var treeMargin = {top: 20, right: 120, bottom: 20, left: 120},
	widthTree = 960 - treeMargin.right - treeMargin.left,
	heightTree = 500 - treeMargin.top - treeMargin.bottom;
	
var iTree = 0,
	durationTree = 750,
	rootTree;

var treeTree = d3.layout.tree()
	.size([heightTree, widthTree]);

var diagonalTree = d3.svg.diagonal()
	.projection(function(d) { return [d.y, d.x]; });

var treeSvg = d3.select("body").append("svg")
	.attr("width", widthTree + treeMargin.right + treeMargin.left)
	.attr("heightTree", heightTree + treeMargin.top + treeMargin.bottom)
  .append("g")
	.attr("transform", "translate(" + treeMargin.left + "," + treeMargin.top + ")");
 
function setTreeRoot(flare){
  flare.x0 = 0;
  flare.y0 = 0;
  rootTree = flare;
  rootTree.x0 = heightTree / 2;
  rootTree.y0 = 0;
  updateTree(rootTree);
}

//d3.select(self.frameElement).style("height", "500px");

function updateTree(source) {

  // Compute the new tree layout.
  var nodes = treeTree.nodes(rootTree).reverse(),
	  links = treeTree.links(nodes);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 180; });

  // UpdateTree the nodes…
  var node = treeSvg.selectAll("g.node")
	  .data(nodes, function(d) { return d.id || (d.id = ++iTree); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
	  .attr("class", "node")
	  .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
	  .on("click", click);

  nodeEnter.append("circle")
	  .attr("r", 1e-6)
	  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

  nodeEnter.append("text")
	  .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
	  .attr("dy", ".35em")
	  .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
	  .text(function(d) { return d.name; })
	  .style("fill-opacity", 1e-6);

  // Transition nodes to their new position.
  var nodeUpdateTree = node.transition()
	  .duration(durationTree)
	  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdateTree.select("circle")
	  .attr("r", 10)
	  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

  nodeUpdateTree.select("text")
	  .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
	  .duration(durationTree)
	  .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
	  .remove();

  nodeExit.select("circle")
	  .attr("r", 1e-6);

  nodeExit.select("text")
	  .style("fill-opacity", 1e-6);

  // UpdateTree the links…
  var link = treeSvg.selectAll("path.link")
	  .data(links, function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
	  .attr("class", "link")
	  .attr("d", function(d) {
		var o = {x: source.x0, y: source.y0};
		return diagonal({source: o, target: o});
	  });

  // Transition links to their new position.
  link.transition()
	  .duration(durationTree)
	  .attr("d", diagonalTree);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
	  .duration(durationTree)
	  .attr("d", function(d) {
		var o = {x: source.x, y: source.y};
		return diagonal({source: o, target: o});
	  })
	  .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
	d.x0 = d.x;
	d.y0 = d.y;
  });
}

// Toggle children on click.
function click(d) {
  if (d.children) {
	d._children = d.children;
	d.children = null;
  } else {
	d.children = d._children;
	d._children = null;
  }
  updateTree(d);
}







	