import { updateGraph, loadFacilityGraph } from './graph.js';
import { facilityMap, facilityList, facilityData, getMonthlyData, setMonthlyData, formatMonthYear } from './shared.js';

let countiesLoaded = false;
let countyPaths;

const facilityTypeSelect = new TomSelect('#facilityType', {
  plugins: [],
  persist: false,
  create: false,
  maxItems: null,
  placeholder: ' Select facility types...',
  hideSelected: false,
  closeAfterSelect: false,
  searchField: [],
  render: {
    item: () => {
      return '<span style="display:none">&#8203;</span>';
    }
  },
  onInitialize() {
    const self = this;
    self.control_input.addEventListener('keydown', (e) => {
        e.preventDefault();
        });

  self.control_input.addEventListener('paste', (e) => e.preventDefault());
  self.control_input.addEventListener('input', (e) => e.preventDefault());

  self.onOptionSelect = function(e, option) { e.preventDefault(); }
  self.on('dropdown_open', () => {
      if (self.dropdown._customToggleListenerAttached) return;

      self.dropdown.addEventListener('pointerdown', (evt) => {
        const option = evt.target.closest('.option');
        if (!option) return;

        evt.preventDefault();

        const value = option.getAttribute('data-value');
        self.items.includes(value) ? self.removeItem(value) : self.addItem(value);

        facilityTypeRefresh(self);
      });

      self.dropdown._customToggleListenerAttached = true;
    });
  }
});

facilityTypeSelect.on('dropdown_close', () => {
  const options = document.querySelectorAll('.ts-dropdown .option.active');
  options.forEach(option => option.classList.remove('active'));
});


function facilityTypeRefresh(select) {
  const len = select.items.length;
  if (len === 0) {
    select.settings.placeholder = " Select facility types...";            
  } else if (len === 1) {
    select.settings.placeholder = "1 facility type selected";            
  } else {
    select.settings.placeholder = len + " facility types selected";                        
  }
  select.control_input.setAttribute('placeholder', select.settings.placeholder);
  select.refreshState();
  select.refreshOptions(false);

  const but = document.getElementById('facilityTypeClear');
  but.style.visibility = len === 0 ? 'hidden' : 'visible';

  clearFiltersRefresh();
  updateMap();
}

document.getElementById('facilityTypeClear').addEventListener('click', () => {
  facilityTypeSelect.clear();
  facilityTypeRefresh(facilityTypeSelect);
});


function clearFiltersRefresh() {
  const range = sizeSlider.noUiSlider.get();
  if (range[0] != "0" || range[1] != "2,260" || facilityTypeSelect.items.length > 0) {
    document.getElementById('clear-filters').classList.remove('not-visible');
  } else {
    document.getElementById('clear-filters').classList.add('not-visible');
  }
}

document.getElementById('clear-filters').addEventListener('click', function() {
  sizeSlider.noUiSlider.set([0, 2260]);
  facilityTypeSelect.clear();
  facilityTypeRefresh(facilityTypeSelect);
});


// ------------------------------------------------------------------------------------------------
// create geography

let margin = { top: 0, right: 50, bottom: 10, left: 50 };
let fullWidth = document.getElementById("map-content").clientWidth;
let width = fullWidth - margin.left - margin.right;
let height = 550 - margin.top - margin.bottom;

let zoomLevel = 1.;
let projection = geoAlbersUsaTerritories.geoAlbersUsaTerritories()
  .scale(width * 1.5)
  .translate([width / 2, height / 2.2]);

const path = d3.geoPath().projection(projection);

const svg = d3.select("#map-content")
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

const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", (event) => {
    map.attr("transform", event.transform);
    zoomLevel = event.transform.k;
    if (!countiesLoaded && zoomLevel > 2.5) {
      loadCounties();
    }
    updateCountyVisibility();
    updateMap();
  });

  d3.select("#zoom-reset").on("click", () => {
    svg.transition()
      .duration(500)
      .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top))
      .on("end", () => {
          zoomLevel = 1;
          updateCountyVisibility();
        });
    });

function updateCountyVisibility() {
  if (countyPaths) {
    countyPaths.style("opacity", zoomLevel > 2.5 ? 1.0 : 0);
  }
}

function loadCounties() {
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json").then(topology => {
    const counties = topojson.feature(topology, topology.objects.counties).features;

    countyPaths = map.append("g")
      .attr("class", "counties")
      .selectAll("path")
      .data(counties)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 0.2 / zoomLevel)
      .attr("pointer-events", "none")

    countiesLoaded = true;
  });
}

svg.call(zoom).on("wheel.zoom", null);
const initialTransform = d3.zoomIdentity.translate(margin.left, margin.top);
svg.call(zoom.transform, initialTransform);

const zoomStep = 1.5;

d3.select("#zoom-in").on("click", () => {
  svg.transition().duration(500)
    .call(zoom.scaleBy, zoomStep);
});

d3.select("#zoom-out").on("click", () => {
  svg.transition().duration(500)
    .call(zoom.scaleBy, 1 / zoomStep);
});

// ------------------------------------------------------------------------------------------------
// size slider

const sizeSlider = document.getElementById("sizeSlider");
noUiSlider.create(sizeSlider, {
  start: [0, 2260],
  connect: true,
  range: { min: 0, max: 2260 },
  step: 1,
  tooltips: true,
  format: {
    to: value => Math.round(value).toLocaleString(),
    from: value => Number(value.replace(/,/g, ''))
  }
});
sizeSlider.noUiSlider.on("update", (values, handle) => {
  updateMap();
  clearFiltersRefresh();
});

// ------------------------------------------------------------------------------------------------
// map

let mapData = {};

function loadMapData() {
  getMonthlyData().forEach(d => {
    d3.csv(`/ice-detention-trends-v2/data/map/${d.month}.csv`).then(function(data) {
      mapData[d.month] = data;
    })
  })
}

d3.csv("/ice-detention-trends-v2/data/monthly.csv").then(function(data_1) {
  data_1.forEach(d => {
    d.active = +d.active;
    d.total = +d.total;
    d.index = +d.index;
  });
  d3.csv("/ice-detention-trends-v2/data/map/2025-02.csv").then(function(data_2) {
    setMonthlyData(data_1);
    const mapSlider = document.getElementById("mapSlider");
    mapSlider.max = data_1.length - 1;
    mapSlider.value = data_1.length - 1;
    mapData["2025-02"] = data_2;
    document.getElementById("startDate").textContent = formatMonthYear("2008-10");
    updateMap();
    loadMapData();
    updateGraph();
  });
});

// ------------------------------------------------------------------------------------------------
// map slider

d3.select("#mapSlider").on("input", function() {
  updateMap();
});

let interval = null;
const mapSlider = document.getElementById("mapSlider");
const playButton = document.getElementById("playButton");

playButton.addEventListener("click", () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
    playButton.textContent = "Play";
  } else {
    if (+mapSlider.value >= +mapSlider.max) {
      mapSlider.value = 0;
      mapSlider.dispatchEvent(new Event("input"));
    }
    interval = setInterval(() => {
      if (+mapSlider.value < +mapSlider.max) {
        mapSlider.value = +mapSlider.value + 1;
        mapSlider.dispatchEvent(new Event("input"));
      } else {
        clearInterval(interval);
        interval = null;
        playButton.textContent = "Play";
      }
    }, 100);
    playButton.textContent = "Pause";
  }
});

// ------------------------------------------------------------------------------------------------

function updateMap() {
  const monthlyData = getMonthlyData();
  if (monthlyData.length === 0) return;

  const i = Number(document.getElementById("mapSlider").value);
  if (!(monthlyData[i].month in mapData)) return;

  document.getElementById("selectedDate_1").textContent = formatMonthYear(monthlyData[i].month);
  document.getElementById("selectedDate_2").textContent = formatMonthYear(monthlyData[i].month);

  const range = sizeSlider.noUiSlider.get().map(val => Number(val.replace(/,/g, '')));
  map.selectAll("circle").remove();

  const tooltip = d3.select("#tooltip");

  const ff = Object.entries(facilityMap)
    .filter(([key, val]) => facilityTypeSelect.items.includes(val.type))
    .map(([key, val]) => key);

  let filteredData = mapData[monthlyData[i].month].filter(d => +d.N >= +range[0] && +d.N <= +range[1]);
  if (facilityTypeSelect.items.length > 0) {
    filteredData = filteredData.filter(d => ff.includes(d.code));
  }

  document.getElementById("activeFacilities").textContent = filteredData.filter(d => d.N > 0.).length.toLocaleString();
  document.getElementById("totalFacilities").textContent = filteredData.length.toLocaleString();

  filteredData.sort((a, b) => +b.size - +a.size);

  map.selectAll("circle")
    .data(filteredData)
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
    .attr("vector-effect", "non-scaling-stroke")
    .style("cursor", "default")
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(`<strong>${facilityMap[d.code].name}</strong><br>
              ${facilityMap[d.code].place}<br>
              ${formatMonthYear(monthlyData[i].month)}<br>
              ${facilityMap[d.code].type}<br>          
              Monthly average 24-hour population: ${Math.round(+d.N).toLocaleString()}`);
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    })
    .on("click", (event, d) => {
      const [x, y] = projection([+d.longitude, +d.latitude]);
      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(3)
            .translate(-x, -y)
        );
      if (facilityList.length < 5) loadFacilityGraph(d.code, facilityMap[d.code].name);
      const hideTooltip = () => {
        tooltip.style("opacity", 0);
        window.removeEventListener("pointermove", hideTooltip);
      };
      window.addEventListener("pointermove", hideTooltip);
    })
    .append("title")
    .text(d => d.name);
}




