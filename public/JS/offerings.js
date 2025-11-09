 // Function to add animation class when elements come into view
 document.addEventListener("DOMContentLoaded", function () {
    const elements = document.querySelectorAll('.animate-up-element');

    // IntersectionObserver to trigger animation on scroll
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-up'); // Add animation class
                observer.unobserve(entry.target); // Stop observing after animation
            }
        });
    }, {
        threshold: 0.5 // Trigger when 50% of the element is in view
    });

    // Observe each element with the class 'animate-up-element'
    elements.forEach(element => observer.observe(element));
});