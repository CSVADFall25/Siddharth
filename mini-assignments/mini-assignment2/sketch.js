/*
- I increased the range and granularity of colors. 
- I created a gradient of colors that changed saturation in correspondence, so both saturation and brightness are displayed.
- I added a complementary color scheme to show how the same saturation and brightness levels look with the complementary hue.
- I added a feature that allows the user to save the canvas as a PNG file by pressing the 's' or 'S' key.
*/ 

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

  // grid
  const cols = 20;
  const rows = 4;
  const margin = 100 / cols;
  const cellW = width / cols;
  const cellH = height / rows;

  // Compute hue based on mouse position
  let hue = map(mouseX, 0, width, 0, 360);

  for (let i = 0; i < 20; i++) {
    fill(hue, 100 - i * margin, 100); // saturation
    rect(i * cellW, 0 * cellH, cellW, cellH);
  }

  for (let i = 0; i < 20; i++) {
    fill(hue, 100, 100 - i * margin); // brightness
    rect(i * cellW, 1 * cellH, cellW, cellH);
  }

  // Compute complementary hue
  let complementaryHue = (hue + 180) % 360;
  
  for (let i = 0; i < 20; i++) {
    fill(complementaryHue, 100 - i * margin, 100); // saturation
    rect(i * cellW, 2 * cellH, cellW, cellH);
  }

  for (let i = 0; i < 20; i++) {
    fill(complementaryHue, 100, 100 - i * margin); // brightness
    rect(i * cellW, 3 * cellH, cellW, cellH);
  }
  
}

function keyPressed() {
  // Save the canvas as a PNG file when 's' key is pressed
  if (key === 's' || key === 'S') {
    saveCanvas('hsv_explorer', 'png');
  }
}
