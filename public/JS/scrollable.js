// Mouse scroll interaction
const countryScrollContainer = document.getElementById('country-scroll-container');

countryScrollContainer.addEventListener('wheel', (event) => {
  if (event.deltaY !== 0) {
    countryScrollContainer.scrollLeft += event.deltaY; // Scroll horizontally based on vertical wheel scroll
    event.preventDefault(); // Prevent default scrolling behavior
  }
});