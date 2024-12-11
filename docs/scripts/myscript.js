// Code writing facilated by GPT
const margin = {top: 60, right: 60, bottom: 40, left: 60};
const baseWidth = 1000 - margin.left - margin.right;
const baseHeight = 600 - margin.top - margin.bottom;

const container = d3.select("#plot")
    .append("div")
    .attr("id", "visualization-container");

container.append("div")

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("padding", "10px")
    .style("background", "white")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("opacity", 0);

// Load data from GitHub
d3.json("https://raw.githubusercontent.com/JiayiD8/squirrels_in_central_park/refs/heads/main/scripts/squirrel_coords.json")
    .then(function(data) {
        console.log("Data loaded successfully");

        d3.select("#loading-message").remove();

        // Calculate aspect ratio from data
        const xExtent = d3.extent(data, d => d.longitude);
        const yExtent = d3.extent(data, d => d.latitude);
        const dataAspectRatio = Math.abs((xExtent[1] - xExtent[0]) / (yExtent[1] - yExtent[0]));
        
        // Adjust width or height to maintain aspect ratio
        let width = baseWidth;
        let height = baseHeight;
        
        if (baseWidth / baseHeight > dataAspectRatio) {
            width = baseHeight * dataAspectRatio;
        } else {
            height = baseWidth / dataAspectRatio;
        }

        // Create SVG with adjusted dimensions
        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-size", "24px") 
            .style("font-weight", "bold") 
            .text("Squirrel Locations by Fur Color in Central Park");

        // Create controls div after the SVG
        const controls = container.append("div")
            .style("margin-top", "20px") 
            .style("text-align", "center"); 

        // Add fur color text
        controls.append("span")
            .text("Filter by fur color: ")
            .style("margin-right", "10px");

        // Get unique fur colors
        const furColors = [...new Set(data.map(d => d.furColor))];
        
        // Add all buttons below the graph
        // Add fur color selection buttons
        furColors.forEach(color => {
            controls.append("label")
                .style("margin-right", "15px")
                .style("cursor", "pointer")
                .html(`
                    <input type="checkbox" value="${color}" checked>
                    ${color}
                `);
        });

        // Add "Select All" button
        controls.append("button")
            .text("Select All")
            .style("margin-left", "15px")
            .on("click", function() {
                controls.selectAll("input").property("checked", true);
                updateVisualization();
            });

        // Add "Clear All" button
        controls.append("button")
            .text("Clear All")
            .style("margin-left", "10px")
            .on("click", function() {
                controls.selectAll("input").property("checked", false);
                updateVisualization();
            });
        
        // Add paddings for hexagons
        const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
        const yPadding = (yExtent[1] - yExtent[0]) * 0.05;

        const x = d3.scaleLinear()
            .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([height, 0]);
        
        // Function to outline each hexagon so that the distribution can 
        // be seen more clearly on graph
        function createOutlineLayer(svg, hexbin, allData) {
            // Create a permanent layer for the outline that will sit below the active hexagons
            const outlineLayer = svg.append("g")
                .attr("class", "outline-layer")
                .style("pointer-events", "none"); // Make sure not to interact with cursor
                
            // Get all hexagons
            const allBins = hexbin(allData);
            
            // Draw hexagon outlines
            outlineLayer.selectAll("path")
                .data(allBins)
                .enter()
                .append("path")
                .attr("d", hexbin.hexagon())
                .attr("transform", d => `translate(${d.x},${d.y})`)
                .style("fill", "none")  
                .style("stroke", "#ddd") 
                .style("stroke-width", "1px"); 
        }
        
        // Create the hexbin generator
        const hexbin = d3.hexbin()
            .x(d => x(d.longitude))
            .y(d => y(d.latitude))
            .radius(8)
            .extent([[0, 0], [width, height]]);

        // Create the outline layer before the main visualization
        createOutlineLayer(svg, hexbin, data);

        // Modify the updateVisualization function to work with the outline
        function updateVisualization() {
            // Get selected colors
            const selectedColors = Array.from(controls.selectAll("input:checked").nodes())
                .map(node => node.value);

            // Filter data based on selected colors
            const filteredData = data.filter(d => selectedColors.includes(d.furColor));

            // Process data for hexbin
            const bins = hexbin(filteredData);

            // Color scale
            const color = d3.scaleSequential(d3.interpolateBlues)
                .domain([0, d3.max(bins, d => d.length)]);

            // Update hexagons
            const hexagons = svg.selectAll("path.active-hexagon") 
                .data(bins);

            // Remove old hexagons
            hexagons.exit().remove();

            // Add new hexagons
            hexagons.enter()
                .append("path")
                .attr("class", "active-hexagon") // Add class for selection
                .merge(hexagons)
                .attr("d", hexbin.hexagon())
                .attr("transform", d => `translate(${d.x},${d.y})`)
                .attr("fill", d => color(d.length))
                .style("stroke", "#fff")
                .style("stroke-width", "0.5px")
                .on("mouseover", function(event, d) {
                    const colorCounts = d3.rollup(d, v => v.length, v => v.furColor);
                    let tooltipText = `Total: ${d.length} squirrels<br>`;
                    for (let [furColor, count] of colorCounts) {
                        tooltipText += `${furColor}: ${count}<br>`;
                    }
                    d3.select(this)
                        .style("opacity", 0.8);
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(tooltipText)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function(d) {
                    d3.select(this)
                        .style("opacity", 1);
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        }

        // Functions to change x and y axis ticks from numerical value to NESW 
        const formatLongitude = d => {
            const direction = d < 0 ? "W" : "E";
            return `${Math.abs(d).toFixed(2)}°${direction}`;
        };

        const formatLatitude = d => {
            const direction = d < 0 ? "S" : "N";
            return `${Math.abs(d).toFixed(2)}°${direction}`;
        };

        // Using Functions above to update the ticks
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickFormat(formatLongitude))
            .style("font-size", "12px");

        svg.append("g")
            .call(d3.axisLeft(y)
                .tickFormat(formatLatitude))
            .style("font-size", "12px");

        updateVisualization();

        // Event listeners for checkboxes
        controls.selectAll("input")
            .on("change", updateVisualization);
    });