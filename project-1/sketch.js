let colors = ["#808080"];
let input, button;
let isLoading = false;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Input
  input = createInput();
  input.position(20, 20);
  input.style("width", "300px");
  input.attribute("placeholder", "e.g., ocean colors");

  // Button
  button = createButton("Generate Colors");
  button.position(input.x + input.width + 10, 20);
  button.mousePressed(generateColors);
}

function draw() {
  background(255);

  // Loading spinner
  if (isLoading) {
    push();
    translate(width / 2, height / 2);
    rotate(frameCount * 0.1);
    stroke(0);
    noFill();
    circle(0, 0, 50);
    line(0, 0, 0, -25);
    pop();
  }

  // Swatches
  const swatchSize = 100;
  const gap = 12;
  const totalWidth = colors.length * swatchSize + (colors.length - 1) * gap;
  const startX = (width - totalWidth) / 2;
  const startY = height / 2 - swatchSize / 2;

  for (let i = 0; i < colors.length; i++) {
    fill(colors[i]);
    stroke(0);
    rect(startX + i * (swatchSize + gap), startY, swatchSize, swatchSize);

    // Hex label
    fill(0);
    noStroke();
    textAlign(CENTER);
    text(
      colors[i],
      startX + i * (swatchSize + gap) + swatchSize / 2,
      startY + swatchSize + 20
    );
  }
}

async function generateColors() {
  if (isLoading) return;

  const prompt = input.value().trim();
  if (!prompt) return;

  isLoading = true;

  try {
    console.log("Sending prompt:", prompt);

    const resp = await fetch("http://localhost:8787/palette", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const raw = await resp.text();
    console.log("Server response:", resp.status, raw);

    if (!resp.ok) {
      // Preserve server error for debugging
      throw new Error(`Server error: ${resp.status} - ${raw}`);
    }

    const data = JSON.parse(raw);
    console.log("Received colors:", data);

    if (!Array.isArray(data.colors) || data.colors.length === 0) {
      throw new Error("No colors returned from server");
    }

    colors = data.colors;
  } catch (err) {
    console.error("Detailed error:", err);
    alert("Error: " + err.message);
    colors = ["#FF0000"]; // red indicates error
  } finally {
    isLoading = false;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
