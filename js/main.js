import './map.js';
import './graph.js';
import './story.js';

document.getElementById('showAboutMore').addEventListener('click', function(event) {
  event.preventDefault();
  const content = document.getElementById('aboutMoreContent');
  if (content.style.display === 'none' || content.style.display === '') {
    content.style.display = 'block';
    content.style.maxHeight = 'none';
    this.textContent = 'Hide more about the data';
  } else {
    content.style.display = 'none';
    this.textContent = 'More about the data';
  }
});

if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
//  console.log("OVERFLOW");
}
