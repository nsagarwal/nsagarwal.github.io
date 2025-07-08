import { nationalData, facilityMap, facilityList, facilityData, monthlyData, formatMonthYear } from './shared.js';

let labels = [];
let availableColumns = [];
let graph;
let selectedCols = [];

// graphName and graphRange are strings used in the graph's title
let graphName = "";
let graphRange = "";

loadNationalGraph();

const graphSlider = document.getElementById("graphSlider");
noUiSlider.create(graphSlider, {
  start: [0, 200],
  connect: true,
  range: { min: 0, max: 200 },
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

export function updateSliderLabels() {
  if (monthlyData.length === 0) return;

  const [start, end] = graphSlider.noUiSlider.get().map(Number);
  const startLabel = (start < monthlyData.length) ? formatMonthYear(monthlyData[start].month) : "Jul. 2025";
  const endLabel = (end < monthlyData.length) ? formatMonthYear(monthlyData[end].month) : "Jul. 2025";

  document.getElementById('graphSlider-startLabel').textContent = startLabel;
  document.getElementById('graphSlider-endLabel').textContent = endLabel;

  graphRange = `${startLabel} - ${endLabel}`;    
  if (startLabel == endLabel) graphRange = `${startLabel}`;
  if (endLabel == "OLD - Feb. 2025") {
    graphRange += "*";
    document.getElementById("footer1").style.display = "block";
  } else {
    document.getElementById("footer1").style.display = "none";          
  }
}

function setSliders(min, max) {
  graphSlider.noUiSlider.set([min, max]);
  updateSliderLabels();
}

let suppressChange = false;

d3.csv(import.meta.env.BASE_URL + "data/facilities.csv").then(function(data) {
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
  const selectFacility = new TomSelect("#facilitySearch", {
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




export function loadFacilityGraph(code, name) {
  if (facilityList.includes(code)) return;
  facilityList.push(code);
  d3.csv(import.meta.env.BASE_URL + `data/facilities/${code}.csv`).then(function(data) {
    const fMap = new Map();
    data.forEach(row => {
      const { Date, ...rest } = row;
      fMap.set(Date, rest);
    });
    facilityData.push(fMap);
    labels = data.map(row => row.Date);
    availableColumns = Object.keys(data[0]).filter(key => key !== 'Date' && key !== 'Midnight population count' && key !== '24-hour population count');
    document.getElementById('columnsForm').innerHTML = "";

    populateColumnCheckboxes();
    const index_1 = Math.min(...facilityList.map(i => +facilityMap[i].start));
    const index_2 = Math.max(...facilityList.map(i => +facilityMap[i].end));
    setSliders(index_1, index_2);
    graphName = (facilityList.length > 1) ? "Facility Comparison" : facilityMap[facilityList[0]].name + " (" + facilityMap[facilityList[0]].place + ")";
    updateGraph();
  })
}

function loadNationalGraph() {
  nationalData.clear();

  d3.csv(import.meta.env.BASE_URL + "data/national.csv").then(function(data) {
    data.forEach(row => {
      const { Date, ...rest } = row;
      nationalData.set(Date, rest);
    });
    labels = [...nationalData.keys()];
    availableColumns = Object.keys(data[0]).filter(key => key !== 'Date' && key !== 'Midnight population count' && key !== '24-hour population count'
      && key !== 'Book-ins count' && key !== 'Book-outs count');
    document.getElementById('columnsForm').innerHTML = "";      

    populateColumnCheckboxes();
    setSliders(0, 201);
    graphName = "National"
    updateGraph();
  });
}

// ------------------------------------------------------------------------------------------------
// update graph

let lastStr = "";

export function updateGraph() {
  if (monthlyData.length === 0) return;
  if ((facilityList.length == 0) && (graphName != "National")) {
    loadNationalGraph();
    return;
  }
  if (graph) graph.destroy();

  const [d1, d2] = graphSlider.noUiSlider.get().map(Number);
  const d1_index = (d1 < monthlyData.length) ? monthlyData[d1].index : 99999;
  const d2_index = (d2 + 1 < monthlyData.length) ? monthlyData[d2+1].index : 99999;
  const d1_index_1 = (d1_index === 0) ? 29 : d1_index;

  let datasets;
  const visibleLabels = labels.slice(d1_index, d2_index);
  selectedCols = Array.from(document.querySelectorAll('input[name="col"]:checked'))
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
        graphName = (facilityList.length > 1) ? "Facility Comparison" : facilityMap[facilityList[0]].name + " (" + facilityMap[facilityList[0]].place + ")";
        document.getElementById('columnsForm').innerHTML = "";
        populateColumnCheckboxes();
        const index_1 = Math.min(...facilityList.map(i => +facilityMap[i].start));
        const index_2 = Math.max(...facilityList.map(i => +facilityMap[i].end));
        setSliders(index_1, index_2);
        updateGraph();
      }
    });
  });

  updateSliderLabels();

  function markSparseMonthStarts(labels, maxTicks = 6) {
    const monthStartIndexes = [];
    labels.forEach((label, i) => {
      if (label.slice(8, 10) === "01") {
        monthStartIndexes.push(i);
      }
    });
    const totalMonths = monthStartIndexes.length;
    if (totalMonths < 2) return new Array(labels.length).fill(1);

    const spacing = Math.ceil(totalMonths / maxTicks);
    const selectedIndexes = [];
    for (let i = 0; i < totalMonths; i += spacing) {
      selectedIndexes.push(monthStartIndexes[i]);
    }
    const a1 = monthStartIndexes[totalMonths - 1] - selectedIndexes[selectedIndexes.length - 1];
    const a2 = monthStartIndexes[totalMonths - 1] - selectedIndexes[0];
    if (a1 / a2 < 0.08) { selectedIndexes.pop(); }
    if (selectedIndexes[0] !== monthStartIndexes[0]) {
      selectedIndexes.unshift(monthStartIndexes[0]);
    }
    if (selectedIndexes[selectedIndexes.length - 1] !== monthStartIndexes[totalMonths - 1]) {
      selectedIndexes.push(monthStartIndexes[totalMonths - 1]);
    }
    const output = new Array(labels.length).fill(0);
    selectedIndexes.forEach(i => output[i] = 1);

    return output;
  }

  const markers = markSparseMonthStarts(visibleLabels);
  let dataArray, color;
  const ctx = document.getElementById('graph-element').getContext('2d');
  const baseGraph = function() {
    return {
      type: 'line',
      data: {
        labels: visibleLabels,
        datasets: datasets
      }
    }
  }
  const x_options = {
    ticks: {
      maxTicksLimit: 10,
      callback: function(value, index, ticks) {
        if (markers[index] === 1) {
          const rawDate = this.getLabelForValue(value);
          const parts = rawDate.split("-");
          const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          if (ticks.length < 33) {
            const formatted = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC'
            });
            return `${formatted}`;
          } else { 
            const newStr = `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
            if (lastStr == newStr) return null;
            lastStr = newStr;
            return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
          }
        }
        return null;
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
    tension: 0.3,
  }
  const baseToolTipOptions = {
      usePointStyle: true,
      mode: 'index',
      intersect: false,
      padding: 14,
      boxWidth: 0,
      boxHeight: 0
  }
  const baseOptions = {
    responsive: true,
    scales: {
      y: y_options,
      x: x_options
    }    
  }
  const basePlugins = function() {
    return {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: ["People Detained by ICE", graphName],
        color: '#222',
        align: 'start',
        padding: {
          bottom: 40
        },
        font: {
          size: 18
        }
      }
    };
  }

  const baseCallbacks = {
    labelPointStyle: () => ({
      pointStyle: false
    })
  }

  const segment = function(dataArray, color) {
    return {
      borderColor: ctx => {
        if (dataArray[ctx.p0DataIndex] === -1) return "rgba(0,0,0,0)";
        if (ctx.p0DataIndex + 1 < dataArray.length && dataArray[ctx.p0DataIndex + 1] === -1) return "rgba(0,0,0,0)";
        return color;
      }
    }
  }

  function formatTitle(context, label = graphName) {
    const date = new Date(context[0].label + "T00:00:00");
    const dateStr = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
    return [label, "", dateStr];
  }

  if (facilityList.length > 1) {
    if (selectedCols.length > 1) selectedCols = [ selectedCols[0] ];
    if (selectedCols.length == 0) selectedCols = ['Midnight popluation'];

    document.querySelectorAll('input[name="col"]').forEach(input => {
      input.checked = selectedCols.includes(input.value);
    });

    for (let i = 0; i < 5; i++) {
      document.getElementById(`facility-name-${i}`).style.color = getColor("facilities", i);
    }
     
    datasets = facilityData.flatMap((dataSet, setIndex) => selectedCols.map((col) => {
      color = getColor("facilities", setIndex);
      dataArray = [...dataSet.values()].slice(d1_index, d2_index + 1).map(row => parseFloat(row[col]));
      return {
        ...baseDataSetOptions,
        data: dataArray,      
        label: col,
        borderColor: color,
        segment: segment(dataArray, color)              
      }
    }));

    graph = new Chart(ctx, {
      ...baseGraph(),
      options: {
        ...baseOptions,
        plugins: {
          ...basePlugins(),
          tooltip: {
            ...baseToolTipOptions,
            callbacks: {
              ...baseCallbacks,
              title: context => formatTitle(context, context[0].dataset.label),
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

    datasets = selectedCols.map((col, i) => {
      color = getColor(col);
      dataArray = [...facilityData[0].values()].slice(d1_index, d2_index + 1).map(row => parseFloat(row[col]));
      return {
        ...baseDataSetOptions,
        data: dataArray,      
        label: col,
        borderColor: color,
        type: 'line',
        segment: segment(dataArray, color)
      }
    });


    const func = function({column, color = "#bbb", order = 1, axis = "y"}) {
      column = column + " count";
      return {
        label: column,
        type: "bar",
        data: [...facilityData[0].values()].slice(d1_index, d2_index + 1).map(row => parseInt(row[column])),
        yAxisID: "y",
        backgroundColor: color,
        borderWidth: 0,
        grouped: false,
        order: order
      }
    };

    if (selectedCols.includes("Midnight population"))
      datasets.push(func({column: "Midnight population"}));
    if (selectedCols.includes("24-hour population"))      
      datasets.push(func({column: "24-hour population", color: "#ddd", order: 2}));

    graph = new Chart(ctx, {
      ...baseGraph(),
      options: {
        ...baseOptions,
        plugins: {
          ...basePlugins(),
          tooltip: {
            ...baseToolTipOptions,
            callbacks: {
              ...baseCallbacks,
              title: context => formatTitle(context),
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
    datasets = selectedCols.map((col, i) => {
      color = getColor(col);
      dataArray = [...nationalData.values()].slice(d1_index, d2_index + 1).map(row => parseFloat(row[col]));
      return {
        ...baseDataSetOptions,
        data: dataArray,      
        label: col,
        borderColor: color,
        segment: segment(dataArray, color)
      };
    });

    if (d2 - d1 <= 12) {
      const func = function({column, color = "#bbb", order = 1, axis = "y"}) {
        column = column + " count";
        return {
          label: column,
          type: "bar",
          data: [...nationalData.values()].slice(d1_index, d2_index + 1).map(row => parseInt(row[column])),
          yAxisID: "y",
          backgroundColor: color,
          borderWidth: 0,
          grouped: false,
          order: order
        }
      };

      if (selectedCols.includes("Midnight population")) 
        datasets.push(func({column: "Midnight population"}));
      if (selectedCols.includes("24-hour population")) 
        datasets.push(func({column: "24-hour population", color: "#ddd", order: 2}));
      if (selectedCols.includes("Book-ins") && selectedCols.length == 1) 
        datasets.push(func({column: "Book-ins", axis: "y1"}));
      if (selectedCols.includes("Book-outs") && selectedCols.length == 1) 
        datasets.push(func({column: "Book-outs", axis: "y1"}));
    }

    datasets.forEach(set => {
      if (set["label"] == "Book-ins") set["yAxisID"] = "y1";
      if (set["label"] == "Book-outs") set["yAxisID"] = "y1";
    });

    graph = new Chart(ctx, {
      ...baseGraph(),
      options: {
        responsive: true,
        scales: {
          y: y_options,
          x: x_options,
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
          ...basePlugins(),
          tooltip: {
            ...baseToolTipOptions,
            callbacks: {
              ...baseCallbacks,
              title: context => formatTitle(context),
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
  const facilityColors = ["#d62728", "#9467bd", "#ff7f0e", "#1f77b4", "#2ca02c"];
  if (key == "facilities") return facilityColors[index];
  if (key == "Midnight population") return "blue";
  if (key == "24-hour population") return "red";
  if (key == "Book-ins") return "green";
  if (key == "Book-outs") return "gray";
  return "black";
}


