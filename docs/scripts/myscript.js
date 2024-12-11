// Log the current page URL to help debug the path
console.log("Current page URL:", window.location.href);
console.log("Current page pathname:", window.location.pathname);

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

// Try multiple possible paths
const possiblePaths = [
    "./scripts/squirrel_coords.json",
    "../scripts/squirrel_coords.json",
    "/scripts/squirrel_coords.json",
    "scripts/squirrel_coords.json"
];

// Function to try loading data from different paths
function tryLoadData(paths) {
    if (paths.length === 0) {
        throw new Error("Could not find data file in any of the tried paths");
    }
    
    const currentPath = paths[0];
    console.log("Trying to load data from:", currentPath);
    
    return d3.json(currentPath)
        .catch(error => {
            console.log(`Failed to load from ${currentPath}:`, error);
            return tryLoadData(paths.slice(1));
        });
}

// Try loading the data
tryLoadData(possiblePaths)
    .then(function(data) {
        console.log("Data loaded successfully:", data);
        
        // Remove loading message
        d3.select("#loading-message").remove();

        // [Rest of the visualization code remains the same...]
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
        const hexbin = d3.hexbin()
            .x(d => x(d.longitude))
            .y(d => y(d.latitude))
            .radius(10)
            .extent([[0, 0], [width, height]]);

        // Process data for hexbin
        const bins = hexbin(data);

        // [Rest of your visualization code...]
        
    }).catch(function(error) {
        console.error("Final error loading the data:", error);
        
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
                Please check:<br>
                1. Current page URL: ${window.location.href}<br>
                2. Tried paths: ${possiblePaths.join(', ')}<br>
                3. Check the browser console (F12) for more details
            `);
    });