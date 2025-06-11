The project is divided into the following files:

main.py processes raw data (not included in this repo) into various .csv files that are used by the webpage. Note: this file is not part of the website proper, I'm only including it here to keep things together.

index.html - the webpage is broadly divided into two sections: one for the map, and one for the graph

map.js - this handles all things related to the map

table.js - this handles all things related to the table

style.css - this file is pretty disorganized right now

The code has very little documentation so far. And could definitely use a local-refactoring -- ie, certain blocks need to be re-written more clearly, concisely, and/or efficiently. E.g.: (i) I have a mishmash of const/let usage, (ii) still want to tighten up certain functions getting called more than they need to, (iii) might change some of the {} to Maps(), (iv) I probably have a few places where cut/tweak/pasted code be replaced by functions that take arguments.

But I feel like the code is structurally where I would want it to be, and with the right abstractions.

I think what would be most helpful in terms of feedback is:

- if there is anything about the javascript overall that seems like bad practice, or could come back to cause issues later. Its not necessarily a language I've worked with a ton.
- anything related to css and styling in general. I did it in a pretty hodgepodge way, and didn't think too much about it if it looked o.k. on my end.
- similarly, I tried to keep the html layout simple -- but also didn't think too much if this is the right way to do it.
- obviously, would love feedback on anything else you find. I wanted to get the page itself working as soon as possible, but definitley want to go back in and tighten up the code now.


