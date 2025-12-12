let data;

function preload() {
  // Generate a dataframe with 30,000 rows
  let rows = [];
  for (let i = 0; i < 30000; i++) {
    rows.push({
      ID: i + 1,
      Name: 'Person_' + (i + 1),
      Age: Math.floor(Math.random() * 60) + 18, // Age between 18-77
      Salary: Math.floor(Math.random() * 150000) + 30000, // Salary between 30k-180k
      Department: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'][Math.floor(Math.random() * 5)]
    });
  }
  data = createDataFrame(rows);
}

function setup() {
  createCanvas(1200, 600);
  // Sort data by Salary in descending order
  data = data.sort('Salary', 'descending');
}

function draw() {
  background(255);
  table(data);
  
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
