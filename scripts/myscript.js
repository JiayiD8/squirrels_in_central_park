// Set the dimensions and margins
const margin = {top: 60, right: 40, bottom: 40, left: 40};  // Increased top margin for controls
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create color selection controls
const controls = d3.select("#plot")
    .insert("div", "svg")
    .style("margin-bottom", "10px");

controls.append("span")
    .text("Filter by fur color: ")
    .style("margin-right", "10px");

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

// Add loading indicator
d3.select("#plot")
    .append("div")
    .attr("id", "loading-message")
    .style("color", "black")
    .style("padding", "20px")
    .text("Loading data...");

// Load data from GitHub
d3.json("https://raw.githubusercontent.com/JiayiD8/squirrels_in_central_park/refs/heads/main/scripts/squirrel_coords.json")
    .then(function(data) {
        console.log("Data loaded successfully");
        
        // Remove loading message
        d3.select("#loading-message").remove();

        // Get unique fur colors
        const furColors = [...new Set(data.map(d => d.furColor))];
        
        // Add color selection buttons
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

        // Create scales
        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.longitude))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain(d3.extent(data, d => d.latitude))
            .range([height, 0]);

        // Create hexbin generator
        const hexbin = d3.hexbin()
            .x(d => x(d.longitude))
            .y(d => y(d.latitude))
            .radius(10)
            .extent([[0, 0], [width, height]]);

        // Function to update the visualization
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
            const hexagons = svg.selectAll("path")
                .data(bins);

            // Remove old hexagons
            hexagons.exit().remove();

            // Add new hexagons
            hexagons.enter()
                .append("path")
                .merge(hexagons)
                .attr("d", hexbin.hexagon())
                .attr("transform", d => `translate(${d.x},${d.y})`)
                .attr("fill", d => color(d.length))
                .style("stroke", "#fff")
                .style("stroke-width", "0.5px")
                .on("mouseover", function(event, d) {
                    // Group squirrels by fur color in this hexbin
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

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickFormat(d => d.toFixed(4)))
            .style("font-size", "12px");

        svg.append("g")
            .call(d3.axisLeft(y)
                .tickFormat(d => d.toFixed(4)))
            .style("font-size", "12px");

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("Squirrel Locations by Fur Color in Central Park");

        // Initial visualization
        updateVisualization();

        // Add event listeners to checkboxes
        controls.selectAll("input")
            .on("change", updateVisualization);

    }).catch(function(error) {
        console.error("Error:", error);
        d3.select("#loading-message").remove();
        d3.select("#plot")
            .append("div")
            .style("color", "red")
            .style("padding", "20px")
            .html(`
                Error loading the data:<br>
                ${error.message}<br><br>
                Please check the console (F12) for more details
            `);
    });