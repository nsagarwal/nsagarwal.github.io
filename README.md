The project is divided into the following files:

py/main.py processes raw data (not included in this repo) into various .csv files that are used by the webpage. Note: this file is not part of the website proper, I'm only including it here to keep things together.

index.html - the webpage is broadly divided into three sections: (i) map, (ii) graph, (iii) end notes

js/main.js - imports other scripts

js/shares.js - contains the object model

js/map.js - handles all things related to the map

js/graph.js - handles all things related to the graph

js/story.js - handles all things related to the data story

styles/style.css
styles/story.css

## How to update dashboard

1. Run py/process_data.py to process the merged dataset into a format suitable for the dashboard.
	- place the merged dataset files in './py/raw/'
	- create directories '.py/public/data/' and '.py/public/data/facilities/' to store output files
		- UPDATE : these directories should now be created automatically by the script
	- move output files directory './py/public' to './public'

2. There are three places in the code where values are hard-coded and need to be updated with a new dataset (TODO: this can be fixed):

(i) in js/graph.js
// TODO : the number of months in the dataset. This is hard coded here but should be read in from data programatically.
let MonthlyDataLength = 205;

(ii) in js/map.js
// TODO : the last month is hard coded here but should be read in from the data
  d3.csv(import.meta.env.BASE_URL + "data/map/2025-10.csv").then(function(data_2) {

(iii) in js/map.js
// TODO : the last month is hard coded here but should be read in from the data
    mapData["2025-10"] = data_2;

3. Install vite:
npm install --save-dev vite

This will create './node_modules' and './package-lock.json'.

4. Check base location in './vite.config.js' to make sure it is the same as the live directory

5. Create './public/data', './public/fonts', './public/images'

6. To test site:
npm run dev
http://localhost:5173/ice-detention-trends/

7. To build site:
npm run build

8. To test build:
npm run preview
http://localhost:4173/ice-detention-trends/
