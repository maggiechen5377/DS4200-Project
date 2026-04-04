const svg = d3.select("svg");
const width = +svg.attr("width");
const height = +svg.attr("height");

const margin = { top: 50, right: 40, bottom: 140, left: 80 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select(".tooltip");
 
d3.csv("videogames.csv").then(data => {
  data.forEach(d => {
    d.Global_Sales = +d.Global_Sales;
  });

  const filtered = data.filter(d =>
    d.Platform &&
    !isNaN(d.Global_Sales)
  );

  const grouped = d3.group(filtered, d => d.Platform);

  const stats = [];

  grouped.forEach((rows, platform) => {
    const sales = rows
      .map(d => d.Global_Sales)
      .filter(d => !isNaN(d))
      .sort(d3.ascending);

    if (sales.length < 10) return;

    const q1 = d3.quantile(sales, 0.25);
    const median = d3.quantile(sales, 0.5);
    const q3 = d3.quantile(sales, 0.75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const whiskerMin = d3.min(sales.filter(v => v >= lowerBound));
    const whiskerMax = d3.max(sales.filter(v => v <= upperBound));

    const outliers = sales.filter(v => v < lowerBound || v > upperBound);

    stats.push({
      platform,
      q1,
      median,
      q3,
      iqr,
      whiskerMin,
      whiskerMax,
      outliers,
      count: sales.length
    });
  });

  stats.sort((a, b) => d3.descending(a.median, b.median));
  const finalStats = stats;

  const x = d3.scaleBand()
    .domain(finalStats.map(d => d.platform))
    .range([0, innerWidth])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(finalStats, d => Math.max(d.whiskerMax, d3.max(d.outliers, o => o) || 0))
    ])
    .nice()
    .range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  g.append("g")
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .text("Global Sales (millions)");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height - 20)
    .attr("text-anchor", "middle")
    .text("Platform");

  svg.append("text")
    .attr("class", "title")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .text("Video Game Global Sales Distribution by Platform");

  g.selectAll(".whisker-line")
    .data(finalStats)
    .enter()
    .append("line")
    .attr("class", "whisker-line")
    .attr("x1", d => x(d.platform) + x.bandwidth() / 2)
    .attr("x2", d => x(d.platform) + x.bandwidth() / 2)
    .attr("y1", d => y(d.whiskerMin))
    .attr("y2", d => y(d.whiskerMax))
    .attr("stroke", "black");

  g.selectAll(".box")
    .data(finalStats)
    .enter()
    .append("rect")
    .attr("class", "box")
    .attr("x", d => x(d.platform))
    .attr("y", d => y(d.q3))
    .attr("width", x.bandwidth())
    .attr("height", d => y(d.q1) - y(d.q3))
    .attr("fill", "#9ecae1")
    .attr("stroke", "black")
    .on("mouseover", function(event, d) {
      tooltip
        .style("opacity", 1)
        .html(`
          <strong>Platform:</strong> ${d.platform}<br>
          <strong>Games:</strong> ${d.count}<br>
          <strong>Q1:</strong> ${d.q1.toFixed(2)}<br>
          <strong>Median:</strong> ${d.median.toFixed(2)}<br>
          <strong>Q3:</strong> ${d.q3.toFixed(2)}
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
    });

  g.selectAll(".median-line")
    .data(finalStats)
    .enter()
    .append("line")
    .attr("class", "median-line")
    .attr("x1", d => x(d.platform))
    .attr("x2", d => x(d.platform) + x.bandwidth())
    .attr("y1", d => y(d.median))
    .attr("y2", d => y(d.median))
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  g.selectAll(".lower-cap")
    .data(finalStats)
    .enter()
    .append("line")
    .attr("class", "lower-cap")
    .attr("x1", d => x(d.platform) + x.bandwidth() * 0.25)
    .attr("x2", d => x(d.platform) + x.bandwidth() * 0.75)
    .attr("y1", d => y(d.whiskerMin))
    .attr("y2", d => y(d.whiskerMin))
    .attr("stroke", "black");

  g.selectAll(".upper-cap")
    .data(finalStats)
    .enter()
    .append("line")
    .attr("class", "upper-cap")
    .attr("x1", d => x(d.platform) + x.bandwidth() * 0.25)
    .attr("x2", d => x(d.platform) + x.bandwidth() * 0.75)
    .attr("y1", d => y(d.whiskerMax))
    .attr("y2", d => y(d.whiskerMax))
    .attr("stroke", "black");

  finalStats.forEach(d => {
    g.selectAll(`.outlier-${d.platform}`)
      .data(d.outliers)
      .enter()
      .append("circle")
      .attr("cx", x(d.platform) + x.bandwidth() / 2)
      .attr("cy", v => y(v))
      .attr("r", 3)
      .attr("fill", "red")
      .attr("opacity", 0.6);
  });
});