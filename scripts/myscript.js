d3.json("path/to/hex_grid.geojson").then(data => {
  const projection = ...;   // define a suitable projection
  const pathGenerator = d3.geoPath().projection(projection);
  
  const colorScale = d3.scaleSequential(d3.interpolateMagma)
    .domain([0, d3.max(data.features, d => d.properties.Count)]);
  
  svg.selectAll("path")
    .data(data.features)
    .enter().append("path")
      .attr("d", pathGenerator)
      .attr("fill", d => colorScale(d.properties.Count))
      .attr("stroke", "#000")
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`Count: ${d.properties.Count}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });
});
