
// Set the dimensions and margins of the diagram
var margin = { top: 100, right: 150, bottom: 500, left: 150 };
(width = 2000 - margin.left - margin.right),
    (height = 1600 - margin.top - margin.bottom);

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg = d3
    .select("body")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var i = 0,
    duration = 750,
    root;

let color_scale;
const geneName = "CD8A";

const scale0_1 = d3.scaleLinear().domain([0, 8]).range([0, 1]);

const fill = (d) => {
    if (d.target.data.data[geneName])
        return color_scale(scale0_1(d.target.data.data[geneName]));
};
var durationTime = 100;

const tip = d3
    .tip()
    .attr("class", "d3-tip")
    .html((d) => data.data.data[geneName]);
svg.call(tip);

d3.csv("data/structure_expr_no_weighted.csv").then((data) => {

    //For color scale <- get the max expression value for certain gene 
    const expr_value_array = [];

    for (i = 0; i < data.length; i++) {
        if (data[i][geneName]) {
            var expr_value = parseFloat(data[i][geneName]);

            expr_value_array.push(expr_value);
        }
    };
    expr_max = Math.max.apply(null, expr_value_array);
    console.log('expr_max');
    console.log(expr_max);

    // function for stratify the data
    var stratify = d3
        .stratify()
        .id((d) => d.id)
        .parentId((d) => d.parent);

    treeData = stratify(data);
    // Assigns parent, children, height, depth
    root = d3.hierarchy(treeData);

    root.x0 = height / 2;
    root.y0 = 0;
    console.log("root:");
    console.log(root);

    root = d3
        .tree()
        .size([innerHeight * 0.9, innerWidth * 0.9])
        .separation(function (a, b) {
            return a.parent == b.parent ? 1 : 2.5;
        })(root);

    // Recursively get the weighted avg of expression level for each node.
    weighted_avg_expr(root);
    console.log("root_after_function");
    console.log(root);


    // Collapse after the second level
    // root.children.forEach(collapse);
    update(root);
});

// Recursion ----------------
function weighted_avg_expr(d) {
    // assume all leaf nodes have size and expression set
    if (!d.children) {
        // TODO: Yuan, I suggest you do this during data loading, but not here
        d.data.data[geneName] = parseInt(d.data.data[geneName]);
        d.data.data["celltype_size"] = parseInt(d.data.data["celltype_size"]);
        return;

    } else {
        // please define all of your variables here, to avoid global variables
        var child_size, child_w_expr;
        var sum_w_expr = 0, sum_size = 0, weighted_avg_expr_result = 0;
        var i, child;
        for (i = 0; i < d.children.length; i++) {
            child = d.children[i];

            weighted_avg_expr(child);

            child_size = child.data.data["celltype_size"];

            sum_w_expr += child.data.data[geneName] * child_size;
            sum_size += child_size;
        };
        d.data.data[geneName] = sum_w_expr / sum_size;
        d.data.data["celltype_size"] = sum_size;

    };
};


// Collapse the node and all it's children
function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

function update(data) {
    // Compute the new tree layout.
    var nodes = root.descendants(),
        // the slice(1) here, skip the 1st element == remove the root
        links = root.descendants().slice(1);

    // Normalize for fixed-depth.
    nodes.forEach(function (d) {
        d.y = d.depth * 230;
    });

    // color_scale = chroma.scale("RdPu");

    color = d3
        .scaleOrdinal()
        .domain(
            root
                .descendants()
                .filter((d) => d.data.data[geneName]) // if node have a value or not
                .map((d) => d.data.id)
        )
        .range(d3.schemeCategory10);

    // ****************** Nodes section ***************************

    // Update the nodes...
    var node = svg.selectAll("g.node").data(nodes, function (d) {
        return d.id || (d.id = ++i);
    });

    // Enter any new modes at the parent's previous position.

    var nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", function (d) {
            return "translate(" + data.y0 + "," + data.x0 + ")";
        })
        .on("click", click);

    // .on("mouseover", showToolTip)
    // .on("mouseout", hideToolTip);
    // .on("mouseover", tip.show);

    // Add Circle for the nodes
    nodeEnter.append("circle").attr("class", "node").attr("r", 1e-6);
    // .style("fill", function (d) {
    //   return d._children ? "lightsteelblue" : "#fff";
    // });

    // Add labels for the nodes
    nodeEnter
        .append("text")
        .attr("dy", ".35em")
        .attr("x", function (d) {
            return d.children || d._children ? -20 : 20;
        })
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        })
        .style("font-size", "25px")
        .text(function (d) {
            return d.data.data.label;
        });

    // //add images for the nodes
    nodeEnter
        .append("image")
        .attr("class", "node-image")
        .attr("xlink:href", function (d) {
            const imagePath =
                "data/CellTypeIcon_separate/" + d.data.id + ".png";
            return imagePath;
        })
        .attr("transform", "translate (-12,-13)")
        // .attr("x", (d) => d.y - 12)
        // .attr("y", (d) => d.x - 11)
        .attr("width", "30px")
        .attr("height", "30px");

    // UPDATE
    var nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate
        .transition()
        .duration(duration)
        .attr("transform", function (d) {
            return "translate(" + d.y + "," + d.x + ")";
        });

    // Update the node attributes and style
    nodeUpdate
        .select("circle.node")
        .attr("r", 20)
        .style("fill", function (d) {
            return d._children ? "lightsteelblue" : "#fff";
        })
        .attr("cursor", "pointer");

    // Remove any exiting nodes
    var nodeExit = node
        .exit()
        .transition()
        .duration(duration)
        .attr("transform", function (d) {
            return "translate(" + data.y + "," + data.x + ")";
        })
        .remove();

    // On exit reduce the node circles size to 0
    nodeExit.select("circle").attr("r", 1e-6);

    // On exit reduce the opacity of text labels
    nodeExit.select("text").style("fill-opacity", 1e-6);

    // ****************** links section ***************************
    const tip = d3
        .tip()
        .attr("class", "d3-tip")
        .html((d) => data.data.data[geneName]);
    svg.call(tip);

    // Update the links...
    var link = svg.selectAll("path.link").data(links, function (d) {
        return d.id;
    });
    // Enter any new links at the parent's previous position.

    // Color the links
    var color_scale = chroma
        //   .scale("RdPu");
        .scale(["#f8cece", "#C70000"]);

    color = d3
        .scaleOrdinal()
        .domain(
            root
                .descendants()
                .filter((d) => d.data.data[geneName]) // if node have a value or not
                .map((d) => d.data.id)
        )
        .range(d3.schemeCategory10);
    const scale0_1 = d3.scaleLinear().domain([0, expr_max]).range([0, 1]);

    const fill = (d) => {
        if (d.data.data[geneName])
            return color_scale(scale0_1(d.data.data[geneName]));
    };

    var linkEnter = link
        .enter()
        .insert("path", "g")
        .attr("class", "link")
        .attr("d", function (d) {
            var o = { x: data.x0, y: data.y0 };
            return diagonal(o, o);
        })
        .style("stroke", fill)
        .style("stroke-width", function (d) {
            return d.data.data[geneName] * 0.5 + 2.5;
        })
        .style("stroke-opacity", 0.7);

    console.log("linkEnter");
    console.log(linkEnter);

    // .on("mouseover", function (d) {
    //   toolTipDiv.transition().duration(200).style("opacity", 1);
    //   // let pos = d3.select(this).node().getBoundingClientRect();
    //   var text = "Expression level:<br/>" + d.data.data[geneName];
    //   toolTipDiv
    //     // .html((d) => data.data.data.geneName)
    //     .html(text)
    //     // .style("left", `${pos["x"]}px`)
    //     // .style("top", d3.select(this).attr("cy") - 28 + "px");
    //     .style("left", d3.event.pageX + "px")
    //     .style("top", d3.event.pageY - 28 + "px");
    //   console.log(`${d.data.data[geneName]}`);
    // })
    // .on("mouseout", function (d) {
    //   toolTipDiv.transition().duration(200).style("opacity", 0);
    // });

    // UPDATE
    var linkUpdate = linkEnter.merge(link);

    linkUpdate.attr("stroke", fill);

    // Transition back to the parent element position
    linkUpdate
        .transition()
        .duration(duration)
        .attr("d", function (d) {
            return diagonal(d, d.parent);
        });

    console.log("linkUpdate:");
    console.log(linkUpdate);
    // Remove any exiting links
    var linkExit = link
        .exit()
        .transition()
        .duration(duration)
        .attr("d", function (d) {
            var o = { x: data.x, y: data.y };
            return diagonal(o, o);
        })
        .remove();

    // Store the old positions for transition.
    nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s, d) {
        path = `M ${s.y} ${s.x}
        C ${(s.y + d.y) / 2} ${s.x},
          ${(s.y + d.y) / 2} ${d.x},
          ${d.y} ${d.x}`;

        return path;
    }

    // Toggle children on click.
    function click(event, d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }

        update(d);
    }
}
