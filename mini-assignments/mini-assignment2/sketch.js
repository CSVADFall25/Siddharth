// HSVExplorer - Explore Hue, Saturation, and Brightness with mouse interaction
// Move mouse horizontally to change hue
// Three vertical bars show the same hue at different brightness levels
// adapted from Rune Madsen's Color Scheme Brightness Example :https://printingcode.runemadsen.com/examples/color/scheme_brightness/index.html
let hueValue;

function setup() {
  createCanvas(1000, 800);
  colorMode(HSB, 360, 100, 100);
  noStroke();
}

function draw() {
  background(0);

  // Compute hue based on mouse position
  let hue = map(mouseX, 0, width, 0, 360);
  for (let i = 0; i < 20; i++) {
    fill(hue, 100, 100 - i * 5); // brightness
    rect(i * 50, 100, height);
  }

  for (let i = 0; i < 20; i++) {
    fill(hue, 100 - i * 5, 100); // saturation
    rect(i * 50, 0, 100, height / 2);
  }
}
