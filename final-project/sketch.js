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
}
