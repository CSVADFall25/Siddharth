let data;

function preload() {
  data = tableToDataFrame('data_nan.csv', 'csv', 'header');
}

function setup() {
  createCanvas(1200, 600);
  // Sort data by Age in descending order
  data = data.sort('Age', 'descending');
}

function draw() {
  background(255);
  //table(data);
  scatter(data, { x: 'Age', y: 'Salary' });
  
  // Display export instructions
  fill(0);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text('Press "P" to export chart as PNG', 10, 10);
  text('Press "C" to export data as CSV', 10, 30);
}

function keyPressed() {
  // Press 'P' to export chart as PNG
  if (key === 'p' || key === 'P') {
    toPNG('scatter-chart.png');
    console.log('Chart exported as PNG!');
  }
  
  // Press 'C' to export data as CSV
  if (key === 'c' || key === 'C') {
    toCSV(data, 'scatter-data.csv');
    console.log('Data exported as CSV!');
  }
}
