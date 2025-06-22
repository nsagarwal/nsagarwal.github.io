let scroller = null;
const story = document.getElementById('story');
const image = document.getElementById('main-image');

function renderStep(index) {
  const file = `images/${String(index).padStart(2, '0')}.jpg`;

  image.style.opacity = 1;
  requestAnimationFrame(() => {
    image.style.opacity = 0;
    image.addEventListener('transitionend', function onFadeOut() {
      image.removeEventListener('transitionend', onFadeOut);
      image.src = file;
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
  image.src = "images/00.jpg";
  story.scrollTop = 0;
  setTimeout(() => {
    initScrollama();
  }, 100);
});

document.getElementById('close-story').addEventListener('click', () => {
  story.classList.add('hidden');
  destroyScrollama();
});
