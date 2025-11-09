
  // Function to animate the number
  function animateCounter() {
    const countElement = document.getElementById('count'); // The span where the number is displayed
    let startValue = 0; // Starting number
    const endValue = 1000; // Ending number (1000+)
    const duration = 1500; // Duration in milliseconds (3 seconds)
    const increment = Math.ceil(endValue / (duration / 100)); // Increment per interval

    // The interval function
    const interval = setInterval(function() {
      startValue += increment;
      if (startValue >= endValue) {
        clearInterval(interval); // Stop the interval when the end value is reached
        countElement.textContent = endValue + "+"; // Add "+" sign after 1000
      } else {
        countElement.textContent = startValue; // Update the number
      }
    }, 100); // Interval duration (100ms)
  }

  // Call the function to start the animation
  window.onload = animateCounter;

