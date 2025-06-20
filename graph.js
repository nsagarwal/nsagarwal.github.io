let DEBUG = 0;

let graph;
let labels = [];
let availableColumns = [];
let nationalData = new Map();
let facilityData = [];
let facilityMap = {};
let facilityList = [];
let monthlyData = [];
let graphName = "";
let dateRange = "";

loadNationalGraph();

const graphSlider = document.getElementById("graphSlider");
noUiSlider.create(graphSlider, {
  start: [0, 196],
  connect: true,
  range: { min: 0, max: 196 },
  step: 1,
  tooltips: false,
  format: {
    to: value => Math.round(value),
    from: value => Number(value)
  }
});

graphSlider.noUiSlider.on("slide", (values, handle) => {
  updateGraph();
  updateSliderLabels();
});

let suppressChange = false;

d3.csv("data/proc/facilities.csv").then(function(data) {
  const select = document.getElementById("facilitySearch");

  data.forEach(row => {
    facilityMap[row.detention_facility_code] = {
      name: row.name,
      place: row.place,
      type: row.type,
      start: +row.start,
      end: +row.end
    }
    const option = document.createElement("option");
    option.value = row.detention_facility_code;
    option.textContent = `${row.name} (${row.state})`;
    select.appendChild(option);    
  });

  select.value = "";
  selectFacility = new TomSelect("#facilitySearch", {
    allowEmptyOption: true,
    placeholder: "Search facilities...",
    maxOptions: 1357,
    maxItems: 1
  });

  selectFacility.on('change', (value) => {
    if (suppressChange) return;
    const label = selectFacility.getItem(value)?.textContent;
    loadFacilityGraph(value, label);
    suppressChange = true;
    selectFacility.clear();
    selectFacility.control_input.blur();
    suppressChange = false;
  });
});

function populateColumnCheckboxes() {
  if (DEBUG) console.log("populateColumnCheckboxes called");
  const form = document.getElementById('columnsForm');
  availableColumns.forEach(col => {
    const label = document.createElement('label');
    let bgColor = getColor(col) || "#ccc";
    if (facilityList.length > 1) bgColor = "#444";

    label.className = "custom-checkbox";
    label.style.setProperty('--check-color', bgColor);

    const checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.name = "col";
    checkbox.value = col;
    checkbox.checked = true;
    if (col === "Book-ins" || col === "Book-outs") {
      checkbox.checked = false;
    }

    const span = document.createElement('span');
    span.className = "checkmark";

    label.appendChild(checkbox);
    label.appendChild(span);
    label.appendChild(document.createTextNode(` ${col}`));

    form.appendChild(label);
    form.appendChild(document.createElement('br'));
  });

  if (!form.dataset.listenerAttached) {
    form.addEventListener('click', (event) => {
      const checkbox = event.target;
      if (checkbox.name === 'col') {
        if (facilityList.length > 1) {
          selectedCols = [ checkbox.value ];                         
            document.querySelectorAll('input[name="col"]').forEach(input => {
              input.checked = selectedCols.includes(input.value);
            });
        }
        updateGraph();
      }
    });
    form.dataset.listenerAttached = "true";
  }
}

function setupSliders(min, max) {
  graphSlider.noUiSlider.set([min, max]);
  updateSliderLabels();
}

function updateSliderLabels() {
  if (monthlyData.length === 0) return;
  const [start, end] = graphSlider.noUiSlider.get().map(Number);
  document.getElementById('graphSlider-startLabel').textContent = (start < monthlyData.length) ? 
    formatMonthYear(monthlyData[start].month) : "Mar. 2025";
  document.getElementById('graphSlider-endLabel').textContent = (end < monthlyData.length) ?
    formatMonthYear(monthlyData[end].month) : "Mar. 2025";

  let dateRange1 = document.getElementById('graphSlider-startLabel').textContent;
  let dateRange2 = document.getElementById('graphSlider-endLabel').textContent;
  if (dateRange1 == dateRange2) {
    dateRange = `${dateRange1}`;
    if (dateRange1 == "Feb. 2025") {
      dateRange = `${dateRange1}*`;
      document.getElementById("footer1").style.display = "block";
    } else {      
      document.getElementById("footer1").style.display = "none";
    }
  } else {
    dateRange = `${dateRange1} - ${dateRange2}`;    
    if (dateRange2 == "Feb. 2025") {
      dateRange = `${dateRange1} - ${dateRange2}*`;
      document.getElementById("footer1").style.display = "block";
    } else {
      document.getElementById("footer1").style.display = "none";      
    }
  }
}

function loadFacilityGraph(code, name) {
  if (DEBUG) console.log("loadFacilityGraph called", code, name);
  facilityList.push(code);
  d3.csv(`data/proc/facilities/${code}.csv`).then(function(data) {
    const facilityDataCountsMap = new Map();
    data.forEach(row => {
      const { Date, ...rest } = row;
      facilityDataCountsMap.set(Date, rest);
    });
    facilityData.push(facilityDataCountsMap);
    labels = data.map(row => row.Date);
    availableColumns = Object.keys(data[0]).filter(key => key !== 'Date' && key !== 'Midnight population count' && key !== '24-hour population count');
    document.getElementById('columnsForm').innerHTML = "";

    populateColumnCheckboxes();
    const index_1 = Math.min(...facilityList.map(i => +facilityMap[i].start));
    const index_2 = Math.max(...facilityList.map(i => +facilityMap[i].end));
    setupSliders(index_1, index_2);
    updateGraph();
  })
}

function loadNationalGraph() {
  if (DEBUG) console.log("loadNationalGraph called");
  nationalData.clear();

  d3.csv("data/proc/national.csv").then(function(data) {
    data.forEach(row => {
      const { Date, ...rest } = row;
      nationalData.set(Date, rest);
    });
    labels = [...nationalData.keys()];
    availableColumns = Object.keys(data[0]).filter(key => key !== 'Date' && key !== 'Midnight population count' && key !== '24-hour population count'
      && key !== 'Book-ins count' && key !== 'Book-outs count');
    document.getElementById('columnsForm').innerHTML = "";      

    populateColumnCheckboxes();

    index_1 = 0;
    index_2 = 197;

    setupSliders(index_1, index_2);
    graphName = "National"
    updateGraph();
  });
}

// ------------------------------------------------------------------------------------------------
// update graph

function updateGraph() {
  if (DEBUG) console.log("updateGraph called", monthlyData.length, facilityList.length, graphName);

  if (monthlyData.length === 0) return;
  if ((facilityList.length == 0) && (graphName != "National")) {
    loadNationalGraph();
    return;
  }
  if (graph) graph.destroy();

  const [d1, d2] = graphSlider.noUiSlider.get().map(Number);
  d1_index = (d1 < monthlyData.length) ? monthlyData[d1].index : 99999;
  d2_index = (d2 + 1 < monthlyData.length) ? monthlyData[d2+1].index : 99999;
  const d1_index_1 = (d1_index === 0) ? 29 : d1_index;

  const visibleLabels = labels.slice(d1_index, d2_index + 1);
  let selectedCols = Array.from(document.querySelectorAll('input[name="col"]:checked'))
                             .map(input => input.value);

  const facility_div = Array.from({ length: 5 }, (_, i) => document.getElementById(`facility-group-${i}`));
  const facility_span = Array.from({ length: 5 }, (_, i) => document.getElementById(`facility-name-${i}`));
  const facility_button = Array.from({ length: 5 }, (_, i) => document.getElementById(`facility-button-${i}`));

  const facilitySelect = document.getElementById('facilitySearch').tomselect;
  if (facilityList.length >= 5) {
    facilitySelect.disable();
    facilitySelect.control_input.placeholder = "5 facilities max";
    facilitySelect.control_input.dispatchEvent(new Event('input')); 
  } else {
    facilitySelect.enable();    
    facilitySelect.control_input.placeholder = "Search facilities...";
    facilitySelect.control_input.dispatchEvent(new Event('input')); 
  }

  facility_div.forEach(div => div.style.display = "none");
  facilityList.forEach((code, i) => {
    name = facilityMap[code].name;
    facility_div[i].style.display = "flex";
    facility_span[i].textContent = name;
    facility_button[i].replaceWith(facility_button[i].cloneNode(true));
    facility_button[i] = document.getElementById(`facility-button-${i}`);
    facility_button[i].addEventListener('click', () => {
      facilityList.splice(i, 1);
      facilityData.splice(i, 1);
      if (facilityList.length == 0) {
          loadNationalGraph();
      } else {
        document.getElementById('columnsForm').innerHTML = "";
        populateColumnCheckboxes();
        const index_1 = Math.min(...facilityList.map(i => +facilityMap[i].start));
        const index_2 = Math.max(...facilityList.map(i => +facilityMap[i].end));
        setupSliders(index_1, index_2);
        updateGraph();
      }
    });
  });

  updateSliderLabels();

  const ctx = document.getElementById('graph-element').getContext('2d');
  const x_options = {
    ticks: {
      maxTicksLimit: 10,
      callback: function(value, index, ticks) {
        const rawDate = this.getLabelForValue(value);
        const parts = rawDate.split("-");
        const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (date.getUTCDate() !== 1) return null;
        return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
      }
    }
  }
  const y_options = {
    beginAtZero: true,
    min: 0,
    position: 'left',
    title: {
      display: true,
      text: 'Population'
    }          
  }
  const baseDataSetOptions = {
    borderWidth: 2,
    pointRadius: 0,
    fill: false,
    yAxisID: "y",
    tension: 0.3
  }
  const baseToolTipOptions = {
      usePointStyle: true,
      mode: 'index',
      intersect: false,
      padding: 14,
      boxWidth: 0,
      boxHeight: 0
  }

  if (facilityList.length > 1) {
    graphName = "various";
    if (selectedCols.length > 1) selectedCols = [ selectedCols[0] ];
    if (selectedCols.length == 0) selectedCols = ['Midnight popluation'];

    document.querySelectorAll('input[name="col"]').forEach(input => {
      input.checked = selectedCols.includes(input.value);
    });

    for (let i = 0; i < 5; i++) {
      document.getElementById(`facility-name-${i}`).style.color = getColor("facilities", i);
    }
     
    const datasets = facilityData.flatMap((dataSet, setIndex) => selectedCols.map((col) => {
      const color = getColor("facilities", setIndex);
      const dataArray = [...dataSet.values()].slice(d1_index, d2_index + 1).map(row => parseFloat(row[col]));
      return {
        ...baseDataSetOptions,
        data: dataArray,      
        label: col,
        borderColor: color,
        segment: {
          borderColor: ctx => {
            if (dataArray[ctx.p0DataIndex] === -1) return "rgba(0,0,0,0)";
            if (ctx.p0DataIndex + 1 < dataArray.length && dataArray[ctx.p0DataIndex + 1] === -1) return "rgba(0,0,0,0)";
            return color;
          }
        }              
      }
    }));

    graph = new Chart(ctx, {
      type: 'line',
      data: {
        labels: visibleLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        scales: {
          y: y_options,
          x: x_options
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: ["People detained by ICE, 30 Day Rolling Average - " + graphName, dateRange],
            font: {
              size: 18
            }
          },
          tooltip: {
            ...baseToolTipOptions,
            callbacks: {
              labelPointStyle: () => ({
                pointStyle: false
              }),
              title: function (context) {
                const date = new Date(context[0].label + "T00:00:00");
                dateStr = date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit"
                });
                return [dateStr, context[0].dataset.label, ""];
              },
              label: function(context) {
                return `${facilityMap[facilityList[context.datasetIndex]].name}: ${(+facilityData[context.datasetIndex].get(context.label)[context.dataset.label + " count"]).toLocaleString()}`;
              }
            }
          }   
        }
      }
    });


  } else if (facilityList.length == 1) {
    for (let i = 0; i < 5; i++) {
      document.getElementById(`facility-name-${i}`).style.color = getColor("default");
    }

    graphName = facilityMap[facilityList[0]].name;
    const datasets = selectedCols.map((col, i) => {
      const color = getColor(col);
      const dataArray = [...facilityData[0].values()].slice(d1_index, d2_index + 1).map(row => parseFloat(row[col]));
      return {
        ...baseDataSetOptions,
        data: dataArray,      
        label: col,
        borderColor: color,
        type: 'line',
        segment: {
          borderColor: ctx => {
            if (dataArray[ctx.p0DataIndex] === -1) return "rgba(0,0,0,0)";
            if (ctx.p0DataIndex + 1 < dataArray.length && dataArray[ctx.p0DataIndex + 1] === -1) return "rgba(0,0,0,0)";
            return color;
          }
        }      
      }
    });

    if (selectedCols.includes("Midnight population")) {
      datasets.push({
        label: "Midnight population count",
        type: "bar",
        data: [...facilityData[0].values()].slice(d1_index, d2_index + 1).map(row => parseInt(row["Midnight population count"])),
        yAxisID: "y",
        backgroundColor: "#bbb",
        borderWidth: 0,
        grouped: false,
        order: 1
      });
    }
    if (selectedCols.includes("24-hour population")) {
      datasets.push({
        label: "24-hour population count",
        type: "bar",
        data: [...facilityData[0].values()].slice(d1_index, d2_index + 1).map(row => parseInt(row["24-hour population count"])),
        yAxisID: "y",
        backgroundColor: "#ddd",
        borderWidth: 0,
        grouped: false,
        order: 2
     });
    }

    graph = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: visibleLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        scales: {
          y: y_options,
          x: x_options
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: ["People detained by ICE, 30 Day Rolling Average - " + graphName, dateRange],
            font: {
              size: 18
            }
          },
          tooltip: {
            ...baseToolTipOptions,
            callbacks: {
              labelPointStyle: () => ({
                pointStyle: false
              }),
              title: function (context) {
                const date = new Date(context[0].label + "T00:00:00");
                dateStr = date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit"
                });
                return [dateStr, graphName, ""];
              },
              label: function(context) {
                if (context.dataset.label === "Midnight population count") return null;
                if (context.dataset.label === "24-hour population count") return null;
                return `${context.dataset.label}: ${(+facilityData[0].get(context.label)[context.dataset.label + " count"]).toLocaleString()}`;
              }
            }          
          }        
        }
      }
    });

  } else {
    graphName = "National";
    const datasets = selectedCols.map((col, i) => {
      const color = getColor(col);
      const dataArray = [...nationalData.values()].slice(d1_index, d2_index + 1).map(row => parseFloat(row[col]));
      return {
        ...baseDataSetOptions,
        data: dataArray,      
        label: col,
        borderColor: color,
        segment: {
          borderColor: ctx => {
            if (dataArray[ctx.p0DataIndex] === -1) return "rgba(0,0,0,0)";
            if (ctx.p0DataIndex + 1 < dataArray.length && dataArray[ctx.p0DataIndex + 1] === -1) return "rgba(0,0,0,0)";
            return color;
          }
        }      
      };
    });

    if (d2 - d1 <= 12) {
      if (selectedCols.includes("Midnight population")) {
        datasets.push({
          label: "Midnight population count",
          type: "bar",
          data: [...nationalData.values()].slice(d1_index, d2_index + 1).map(row => parseInt(row["Midnight population count"])),
          yAxisID: "y",
          backgroundColor: "#bbb",
          borderWidth: 0,
          grouped: false,
          order: 1        
        });
      }
      if (selectedCols.includes("24-hour population")) {
        datasets.push({
          label: "24-hour population count",
          type: "bar",
          data: [...nationalData.values()].slice(d1_index, d2_index + 1).map(row => parseInt(row["24-hour population count"])),
          yAxisID: "y",
          backgroundColor: "#ddd",
          borderWidth: 0,
          grouped: false,
          order: 2
       });
      }
      if (selectedCols.includes("Book-ins") && selectedCols.length == 1) {
        datasets.push({
          label: "Book-ins count",
          type: "bar",
          data: [...nationalData.values()].slice(d1_index, d2_index + 1).map(row => parseInt(row["Book-ins count"])),
          yAxisID: "y1",
          backgroundColor: "#bbb",
          borderWidth: 0,
          grouped: false
        });
      }
      if (selectedCols.includes("Book-outs") && selectedCols.length == 1) {
        datasets.push({
          label: "Book-outs count",
          type: "bar",
          data: [...nationalData.values()].slice(d1_index, d2_index + 1).map(row => parseInt(row["Book-outs count"])),
          yAxisID: "y1",
          backgroundColor: "#bbb",
          borderWidth: 0,
          grouped: false
        });
      }
    }

    datasets.forEach(set => {
      if (set["label"] == "Book-ins") set["yAxisID"] = "y1";
      if (set["label"] == "Book-outs") set["yAxisID"] = "y1";
    });

    graph = new Chart(ctx, {
      type: 'line',
      data: {
        labels: visibleLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        scales: {
          x: x_options,
          y: y_options,
          y1 : {
            beginAtZero: true,
            min: 0,
            position: 'right',
            title: {
              display: true,
              text: 'Book-ins/outs'
            },
            grid: {
              display: false
            }                      
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: ["People detained by ICE, 30 Day Rolling Average - " + graphName, dateRange],
            font: {
              size: 18
            }
          },
          tooltip: {
            ...baseToolTipOptions,
            callbacks: {
              labelPointStyle: () => ({
                pointStyle: false
              }),
              title: function (context) {
                const date = new Date(context[0].label  + "T00:00:00");
                dateStr = date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit"
                });
                return [dateStr, graphName, ""];
              },
              label: function(context) {
                if (context.dataset.label === "Midnight population count") return null;
                if (context.dataset.label === "24-hour population count") return null;
                if (context.dataset.label === "Book-ins count") return null;
                if (context.dataset.label === "Book-outs count") return null;
                return `${context.dataset.label}: ${(+nationalData.get(context.label)[context.dataset.label + " count"]).toLocaleString()}`;
              }
            }          
          }        
        }
      }
    });

    if (!selectedCols.includes("Book-ins") && !selectedCols.includes("Book-outs")) {
      graph.options.scales.y1.display = false;
      graph.update();
    }
    if (!selectedCols.includes("Midnight population") && !selectedCols.includes("24-hour population")) {
      graph.options.scales.y.display = false;
      graph.update();
    }
  }
}

function getColor(key, index = 0) {
  if (DEBUG) console.log("getColor called", key, index, facilityColors[index]);

  const facilityColors = ["#d62728", "#9467bd", "#ff7f0e", "#1f77b4", "#2ca02c"];
  if (key == "facilities") return facilityColors[index];
  if (key == "Midnight population") return "blue";
  if (key == "24-hour population") return "red";
  if (key == "Book-ins") return "green";
  if (key == "Book-outs") return "gray";
  return "black";
}


