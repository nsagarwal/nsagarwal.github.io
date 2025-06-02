let monthlyData = [];

let margin = { top: 0, right: 50, bottom: 10, left: 50 };
let container = document.getElementById("content");
let fullWidth = container.clientWidth;
let width = fullWidth - margin.left - margin.right;
let height = 700 - margin.top - margin.bottom;

let projection = geoAlbersUsaTerritories.geoAlbersUsaTerritories()
  .scale(width * 1.5)
  .translate([width / 2, height / 2.2]);

const path = d3.geoPath().projection(projection);

const svg = d3.select("#content")
  .append("svg")
  .attr("id", "map")
  .attr("width", fullWidth)
  .attr("height", height + margin.top + margin.bottom);

const map = svg.append('g')
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
  .attr('class', 'map');

d3.json("https://unpkg.com/us-atlas@3.0.0/states-10m.json").then(function (data) {
  map.selectAll('path')
    .data(topojson.feature(data, data.objects.nation).features)
    .enter().append("path")
    .attr("d", path)
    .attr('fill', '#cccccc')
    .attr("class", "outline")
    .attr("stroke", "white");
  map.append("path")
    .datum(topojson.mesh(data, data.objects.states, function (a, b) { return a !== b; }))
    .attr("class", "mesh")
    .attr("d", path)
    .attr('fill', '#cccccc')
    .attr('stroke', 'white');
  updateMap();
});

noUiSlider.create(document.getElementById("sizeSlider"), {
  start: [0, 2260],
  connect: true,
  range: { min: 0, max: 2260 },
  step: 1,
  tooltips: true,
  format: {
    to: value => Math.round(value),
    from: value => Number(value)
  }
});

const sizeSlider = document.getElementById("sizeSlider").noUiSlider;
sizeSlider.on("update", (values, handle) => {
  updateMap();
});

let mapData = {};

function loadMapData() {
  monthlyData.forEach(d => {
    d3.csv(`data/proc/map/${d.month}.csv`).then(function(data) {
      mapData[d.month] = data;
    })
  })
}

d3.csv("data/proc/monthly.csv").then(function(data_1) {
  data_1.forEach(d => {
    d.active = +d.active;
    d.total = +d.total;
  });
  d3.csv("data/proc/map/2008-10.csv").then(function(data_2) {
    monthlyData = data_1;
    document.getElementById("slider").max = monthlyData.length - 1;
    mapData["2008-10"] = data_2;
    document.getElementById("startDate").textContent = formatMonthYear("2008-10");
    updateMap(0);
    loadMapData();
    updateChart();
    updateSliderLabels();
  });
});

d3.select("#slider").on("input", function() {
  updateMap();
});

let interval = null;
const slider1 = document.getElementById("slider");
const playButton = document.getElementById("playButton");

playButton.addEventListener("click", () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
    playButton.textContent = "Play";
  } else {
    interval = setInterval(() => {
      if (+slider1.value < +slider1.max) {
        slider1.value = +slider1.value + 1;
        slider1.dispatchEvent(new Event("input"));
      } else {
        clearInterval(interval);
        interval = null;
        playButton.textContent = "Play";
      }
    }, 100);
    playButton.textContent = "Pause";
  }
});

function updateMap() {
  if (monthlyData.length === 0) return;

  const i = Number(document.getElementById("slider").value);
  if (!(monthlyData[i].month in mapData)) return;

  document.getElementById("selectedDate_1").textContent = formatMonthYear(monthlyData[i].month);
  document.getElementById("selectedDate_2").textContent = formatMonthYear(monthlyData[i].month);
  document.getElementById("activeFacilities").textContent = monthlyData[i].active;
  document.getElementById("totalFacilities").textContent = monthlyData[i].total;

  const range = sizeSlider.get();
  map.selectAll("circle").remove();

  const tooltip = d3.select("#tooltip");

  map.selectAll("circle")
    .data(mapData[monthlyData[i].month].filter(d => +d.N >= +range[0] && +d.N <= +range[1]))
    .enter()
    .append("circle")
    .attr("cx", d => {
        const coords = projection([+d.longitude, +d.latitude]);
        return coords ? coords[0] : null;
    })
    .attr("cy", d => {
        const coords = projection([+d.longitude, +d.latitude]);
        return coords ? coords[1] : null;
    })
    .attr("r", d => +d.size)
    .attr("fill", d => +d.N === 0 ? "black" : "red")
    .attr("stroke", "white")
    .attr("fill-opacity", 0.5)
    .attr("stroke-opacity", 0.5)
    .style("cursor", "default")
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(`<strong>${facilityMap[d.code].name}</strong><br>
              ${facilityMap[d.code].place}<br>
              ${formatMonthYear(monthlyData[i].month)}<br>
              ${facilityMap[d.code].type}<br>          
              Monthly average 24-hour population: ${(+d.N).toLocaleString()}`);
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    })
    .append("title")
    .text(d => d.name);
}

function formatMonthYear(ym) {
  const [year, month] = ym.split("-");
  const months = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."]
  return `${months[+month-1]}. ${year}`;
}




