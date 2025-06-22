export const DEBUG = 0;

// --------------------------------------------------------------------------------------------------------
// OBJECT MODEL
//
// nationalData stores the data from national.csv :
// - defined as a map from Date to the remaining columns in that dataframe
// - loaded once on page load

export let nationalData = new Map();

// facilityMap stores the data from facilities.csv :
// - defined as a map from detention_facility_code to the remaining columns in that dataframe
// - loaded once on page load
//
// Note: 
//
// 1. The columns 'start' and 'end' are pre-calculated indices into graphSlider which specify when data begins and ends for
// a given facility. These values are used to set the initial date window of the graph when particular facilities are selected.
//
// 2. The column 'type' is pre-calculated based on the type_detailed given in raw/monthly_freq.csv and the type mapping given
// in raw/facility_types.csv.

export let facilityMap = {};

// facilityList and facilityData are arrays that store data from facilities/[XXXXXX].csv. Specifically, they store 
// the detention_facility_code and facility-level data respectively of facilities selected in the graph. 
// When a facility is de-selected from the graph, the corresponding item in both
// arrays is removed. Thus the length of facilityList and facilityData is always between 0 and 5. Note:
//
// 1. This object model means that facility-level data is reloaded whenever a facility is de-selected and then re-selected. 
// I did this to keep memory usage constant at the expense of potential duplicate loading of data, presumably from cache 
// or disk the second time.
//
// 2. An alternative object model is to define facilityData as a map from detention_facility_code to facility-level data, in which
// items do not get removed from it when facilities are de-selected. This would avoid duplicate loading of data at the expense
// of unbounded memory usage, proportional to the total number of facilities ever selected.
//
// 3. In the current object model, facilityList and facilityData could be combined into a single map from detention_facility_code
// to facility-level data. The reason I did not implement it that way here is because the current approach can be more easily adapted to
// the object model described in note 2. Specifically, in that alternative object model, facilityList would remain an array of length
// at most 5, and facilityData would be redefined as a map of length equal to the total number of facilities ever selected.

export let facilityList = [];
export let facilityData = [];

// --------------------------------------------------------------------------------------------------------

export let monthlyData = [];
export function setMonthlyData(data) { monthlyData = data; }
export function getMonthlyData() { return monthlyData; }

export function formatMonthYear(ym) {
  const [year, month] = ym.split("-");
  const months = ["", "Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."]
  return `${months[+month]} ${year}`;
}

