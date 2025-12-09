// Load data.csv file using DataFrame methods from p5.chart
let df;

function preload() {
  df = loadDataFrame('data.csv');
}

function setup() {
  createCanvas(800, 600);
  background(240);
  
  // Display the data as a table
  tableChart(df, {
    title: 'Data from data.csv',
    maxRows: 10,
    headerBackground: color(100, 150, 200),
    rowBackground: color(250),
    altRowBackground: color(255),
    textSize: 12,
    headerTextSize: 14
  });
}
