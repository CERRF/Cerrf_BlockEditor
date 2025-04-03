// custom.js
// This file can include workshop-specific JavaScript.
// For example, you could add step animations or progressive highlights.
console.log("Custom workshop JS loaded.");

function updatePingVisualization(ip1, ip2) {
    // Update the IP address in the Ping block
    document.getElementById('ping-ip').textContent = ip1;
    
    // Update the IP address near the second PC
    document.getElementById('second-pc-ip').textContent = ip2;
}

// Example usage: Call this function when the user runs the ping command
updatePingVisualization('192.168.1.1', '192.168.1.2');
