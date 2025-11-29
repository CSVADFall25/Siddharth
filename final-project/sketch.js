let chart;

function setup() {
  createCanvas(400, 400);

  // Create a chart region (use "this" to ensure correct binding)
  chart = this.createChart(40, 40, 320, 240, {
    background: 250,
    axisColor: 0,
    barColor: 80,
    padding: 24
  });

  const values = [4, 7, 3, 10, 6, 8];

  background(255);
  chart.bar(values);
}

function draw() {
  // No animation yet
}
