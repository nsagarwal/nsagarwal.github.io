let scroller = null;
const story = document.getElementById('story');
const image = document.getElementById('main-image');

const altText = ["", "Map of ICE facilities across the U.S.", "Example of ICE facility types", 
  "Graph of the midnight population and 24-hour population of ICE facilities",
  "Graph of people detained by ICE from April 2019 to February 2025", "Graph of people detained by ICE at the Florence Staging Facility",
  "Graph of people detained by ICE at Moshannon Valley Processing Center and various New Jersey facilities", ""]

function renderStep(index) {
  const file = import.meta.env.BASE_URL + `images/${String(index).padStart(2, '0')}.png`;

  image.style.opacity = 1;
  requestAnimationFrame(() => {
    image.style.opacity = 0;
    image.addEventListener('transitionend', function onFadeOut() {
      image.removeEventListener('transitionend', onFadeOut);
      image.src = file;
      image.alt = altText[index];
      image.onload = () => {
        image.style.opacity = 1;
      };
    }, { once: true });
  });
}

function initScrollama() {
  scroller = scrollama();
  scroller
    .setup({
      step: ".step",
      offset: 0.8
    })
    .onStepEnter(response => {
      renderStep(response.index);
    });
}

function destroyScrollama() {
  if (scroller) {
    scroller.destroy();
    scroller = null;
  }
}

document.getElementById('open-story').addEventListener('click', () => {
  story.classList.remove('hidden');
  renderStep(0);
  image.src = import.meta.env.BASE_URL + "images/00.png";
  story.scrollTop = 0;
  setTimeout(() => {
    initScrollama();
  }, 100);
});

document.getElementById('close-story').addEventListener('click', () => {
  story.classList.add('hidden');
  destroyScrollama();
});
