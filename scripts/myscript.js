// Set the dimensions and margins
const margin = {top: 40, right: 40, bottom: 40, left: 40};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

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

        // Create scales
        const xExtent = d3.extent(data, d => d.longitude);
        const yExtent = d3.extent(data, d => d.latitude);

        const x = d3.scaleLinear()
            .domain(xExtent)
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain(yExtent)
            .range([height, 0]);

        // Create hexbin generator
        const hexbin = d3.hexbin()  // Using d3.hexbin() directly
            .x(d => x(d.longitude))
            .y(d => y(d.latitude))
            .radius(10)
            .extent([[0, 0], [width, height]]);

        // Process data for hexbin
        const bins = hexbin(data);
        console.log("Bins created:", bins.length);

        // Color scale
        const color = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, d3.max(bins, d => d.length)]);

        // Draw hexagons
        svg.selectAll("path")
            .data(bins)
            .enter().append("path")
            .attr("d", hexbin.hexagon())
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .attr("fill", d => color(d.length))
            .style("stroke", "#fff")
            .style("stroke-width", "0.5px")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .style("opacity", 0.8);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`Count: ${d.length} squirrels`)
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
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("Squirrel Locations in Central Park");

    }).catch(function(error) {
        console.error("Error:", error);
        
        // Remove loading message and show error
        d3.select("#loading-message").remove();
        
        // Add error message to the page
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