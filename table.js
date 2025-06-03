let DEBUG = 0;

let chart;
let labels = [];
let facilityData = [];
let nationalData = [];
let availableColumns = [];
let facilities = [];
let facilityMap = {};
let facilityList = [];
let chartName = "";

loadNationalChart();

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
  updateChart();
  updateSliderLabels();
});

// load dMap
let dMap = {};
d3.csv("data/proc/dmap.csv").then(function(data) {
  data.forEach(row => {
    dMap[row.date] = row.index;
  })
});

let suppressChange = false;

d3.csv("data/proc/facilities.csv").then(function(data) {
  const select = document.getElementById("facilitySearch");

  data.forEach(row => {
    facilityMap[row.detention_facility_code] = {
      name: row.name,
      place: row.place,
      type: row.type_detailed,
      start: +row.start,
      end: +row.end
    }
    facilities.push({
      code: row.detention_facility_code,
      name: row.name
    });
    const option = document.createElement("option");
    option.value = row.detention_facility_code;
    option.textContent = `${row.name} (${row.state})`;
    select.appendChild(option);    
  });

  select.value = "";
  tselect = new TomSelect("#facilitySearch", {
    allowEmptyOption: true,
    placeholder: "Search facilities...",
    maxOptions: 1000,
    maxItems: 1
  });

  tselect.on('change', (value) => {
    if (suppressChange) return;
    const label = tselect.getItem(value)?.textContent;
    loadFacilityChart(value, label);
    suppressChange = true;
    tselect.clear();
    tselect.control_input.blur();
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
    label.innerHTML = `
      <label class="custom-checkbox" style="--check-color: ${bgColor}">
      <input type="checkbox" name="col" value="${col}" checked>
      <span class="checkmark"></span>
      ${col}
      </label>
    `;
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
        updateChart();
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
  document.getElementById('graphSlider-startLabel').textContent = formatMonthYear(monthlyData[start].month);
  document.getElementById('graphSlider-endLabel').textContent = formatMonthYear(monthlyData[end].month);
}

function loadFacilityChart(code, name) {
  if (DEBUG) console.log("loadFacilityChart called", code, name);
  facilityList.push(code);
  d3.csv(`data/proc/facilities/${code}.csv`).then(function(data) {
    facilityData.push(data);
    labels = data.map(row => row.Date);
    availableColumns = Object.keys(data[0]).filter(key => key !== 'Date');
    document.getElementById('columnsForm').innerHTML = "";
    populateColumnCheckboxes();
    const index_1 = Math.min(...facilityList.map(i => +facilityMap[i].start));
    const index_2 = Math.max(...facilityList.map(i => +facilityMap[i].end));
    setupSliders(index_1, index_2);
    updateChart();
  })
}

function loadNationalChart() {
  if (DEBUG) console.log("loadNationalChart called");
  d3.csv("data/proc/national.csv").then(function(data) {
    nationalData = data;
    labels = data.map(row => row.Date);
    availableColumns = Object.keys(data[0]).filter(key => key !== 'Date');
    document.getElementById('columnsForm').innerHTML = "";      

    populateColumnCheckboxes();

    index_1 = 0;
    index_2 = 196;

    setupSliders(index_1, index_2);
    chartName = "National"
    updateChart();
  });
}

// ------------------------------------------------------------------------------------------------
// update chart

function updateChart() {
  if (DEBUG) console.log("updateChart called", monthlyData.length, facilityList.length, chartName);

  if (monthlyData.length === 0) return;

  if ((facilityList.length == 0) && (chartName != "National")) {
    loadNationalChart();
    return;
  }
  if (chart) chart.destroy();

  const [d1, d2] = graphSlider.noUiSlider.get().map(Number);
  d1_index = +dMap[monthlyData[d1].month];
  d2_index = +dMap[monthlyData[d2].month];
  const visibleLabels = labels.slice(d1_index, d2_index + 1);
  let selectedCols = Array.from(document.querySelectorAll('input[name="col"]:checked'))
                             .map(input => input.value);


  const fDiv = Array.from({ length: 5 }, (_, i) => document.getElementById(`facility-group-${i}`));
  const fSpan = Array.from({ length: 5 }, (_, i) => document.getElementById(`facility-name-${i}`));
  const fButton = Array.from({ length: 5 }, (_, i) => document.getElementById(`facility-button-${i}`));

  const tselect = document.getElementById('facilitySearch').tomselect;
  if (facilityList.length >= 5) {
    tselect.disable();
    tselect.control_input.placeholder = "5 facilities max";
    tselect.control_input.dispatchEvent(new Event('input')); 
  } else {
    tselect.enable();    
    tselect.control_input.placeholder = "Search facilities...";
    tselect.control_input.dispatchEvent(new Event('input')); 
  }

  fDiv.forEach(div => div.style.display = "none");
  facilityList.forEach((code, i) => {
    name = facilityMap[code].name;
    fDiv[i].style.display = "flex";
    fSpan[i].textContent = name;
    fButton[i].replaceWith(fButton[i].cloneNode(true));
    fButton[i] = document.getElementById(`facility-button-${i}`);
    fButton[i].addEventListener('click', () => {
      facilityList.splice(i, 1);
      facilityData.splice(i, 1);
      if (facilityList.length == 0) {
          loadNationalChart();
      } else {
        document.getElementById('columnsForm').innerHTML = "";
        populateColumnCheckboxes();
        const index_1 = Math.min(...facilityList.map(i => +facilityMap[i].start));
        const index_2 = Math.max(...facilityList.map(i => +facilityMap[i].end));
        setupSliders(index_1, index_2);
        updateChart();
      }
    });
  });

  if (facilityList.length > 1) {
    chartName = "various";
    if (selectedCols.length > 1) {
      selectedCols = [ selectedCols[0] ];
    }
    if (selectedCols.length == 0) {
      selectedCols = ['Midnight popluation'];
    }

    document.querySelectorAll('input[name="col"]').forEach(input => {
      input.checked = selectedCols.includes(input.value);
    });

   for (let i = 0; i < 5; i++) {
      const span = document.getElementById(`facility-name-${i}`);
      span.style.color = getColor("facilities", i);
    }
     
    const datasets = facilityData.flatMap((dataSet, setIndex) =>
      selectedCols.map((col) => ({
        label: col,
        data: dataSet.slice(d1_index, d2_index).map(row => parseFloat(row[col])),
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        yAxisID: "y",
        tension: 0.3,
        borderColor: getColor("facilities", setIndex)
      }))
    );

    const ctx = document.getElementById('graph-element').getContext('2d');

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: visibleLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            position: 'left',
            title: {
              display: true,
              text: 'Population'
            }          
          },
          x: {
            ticks: {
              maxTicksLimit: 10,
              callback: function(value, index, ticks) {
                const rawDate = this.getLabelForValue(value);
                const date = new Date(rawDate);
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: "People detained by ICE, 30 Day Rolling Average - " + chartName,
            font: {
              size: 18
            }
          },
          tooltip: {
            usePointStyle: true,
            mode: 'index',
            intersect: false,
            padding: 14,
            boxWidth: 0,
            boxHeight: 0,
            callbacks: {
              labelPointStyle: () => ({
                pointStyle: false
              }),
              title: function (context) {
                const date = new Date(context[0].label);
                dateStr = date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit"
                });
                return [dateStr, context[0].dataset.label, ""];
              },
              label: function(context) {
                return `${facilityMap[facilityList[context.datasetIndex]].name}: ${context.formattedValue}`;
              }
            }
          }   
        }
      }
    });


  } else if (facilityList.length == 1) {
   for (let i = 0; i < 5; i++) {
      const span = document.getElementById(`facility-name-${i}`);
      span.style.color = getColor("default");
    }

    chartName = facilityMap[facilityList[0]].name;
    const datasets = selectedCols.map((col, i) => ({
      label: col,
      data: facilityData[0].slice(d1_index, d2_index).map(row => parseFloat(row[col])),
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      yAxisID: "y",
      tension: 0.3,
      borderColor: getColor(col)
    }));

    const ctx = document.getElementById('graph-element').getContext('2d');

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: visibleLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            position: 'left',
            title: {
              display: true,
              text: 'Population'
            }          
          },
          x: {
            ticks: {
              maxTicksLimit: 10,
              callback: function(value, index, ticks) {
                const rawDate = this.getLabelForValue(value);
                const date = new Date(rawDate);
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: "People detained by ICE, 30 Day Rolling Average - " + chartName,
            font: {
              size: 18
            }
          },
          tooltip: {
            usePointStyle: true,
            mode: 'index',
            intersect: false,
            padding: 14,
            boxWidth: 0,
            boxHeight: 0,
            callbacks: {
              labelPointStyle: () => ({
                pointStyle: false
              }),
              title: function (context) {
                const date = new Date(context[0].label);
                dateStr = date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit"
                });
                return [dateStr, chartName, ""];
              },
              label: function(context) {
                return `${context.dataset.label}: ${context.formattedValue}`;
              }
            }          
          }        
        }
      }
    });

  } else {
    chartName = "National";

    const datasets = selectedCols.map((col, i) => ({
      label: col,
      data: nationalData.slice(d1_index, d2_index).map(row => parseFloat(row[col])),
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      yAxisID: "y",
      tension: 0.3,
      borderColor: getColor(col)
    }));

    datasets.forEach(set => {
      if (set["label"] == "Book-ins") set["yAxisID"] = "y1";
      if (set["label"] == "Book-outs") set["yAxisID"] = "y1";
    });

    const ctx = document.getElementById('graph-element').getContext('2d');

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: visibleLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            position: 'left',
            title: {
              display: true,
              text: 'Population'
            }          
          },
          y1 : {
            beginAtZero: true,
            position: 'right',
            title: {
              display: true,
              text: 'Book-ins/outs'
            }          
          },
          x: {
            ticks: {
              maxTicksLimit: 10,
              callback: function(value, index, ticks) {
                const rawDate = this.getLabelForValue(value);
                const date = new Date(rawDate);
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: "People detained by ICE, 30 Day Rolling Average - " + chartName,
            font: {
              size: 18
            }
          },
          tooltip: {
            usePointStyle: true,
            mode: 'index',
            intersect: false,
            padding: 14,
            boxWidth: 0,
            boxHeight: 0,
            callbacks: {
              labelPointStyle: () => ({
                pointStyle: false
              }),
              title: function (context) {
                const date = new Date(context[0].label);
                dateStr = date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit"
                });
                return [dateStr, chartName, ""];
              },
              label: function(context) {
                return `${context.dataset.label}: ${context.formattedValue}`;
              }
            }          
          }        
        }
      }
    });
  }
}

function getColor(key, index = 0) {
  const facilityColors = ["#d62728", "#9467bd", "#ff7f0e", "#1f77b4", "#2ca02c"];
  if (DEBUG) console.log("getColor called", key, index, facilityColors[index]);
  if (key == "facilities") return facilityColors[index];
  if (key == "Midnight population") return "blue";
  if (key == "24-hour population") return "red";
  if (key == "Book-ins") return "green";
  if (key == "Book-outs") return "gray";
  return "black";
}


