/**
 * Get the time Format 12-hour format
 * @returns String 
 */

function getTime() {
    
  // Create a new Date object
  const currentTime = new Date();

  // Get the current hour, minute, and second
  const hours = padZero(currentTime.getHours());
  const minutes = padZero(currentTime.getMinutes());
  const seconds = padZero(currentTime.getSeconds());

  const timeString = `${hours}:${minutes}:${seconds}`;
  
  return timeString;
  
  }

// Function to pad a number with leading zeros if needed
function padZero(num) {
  return (num < 10 ? '0' : '') + num;
}

module.exports = getTime;