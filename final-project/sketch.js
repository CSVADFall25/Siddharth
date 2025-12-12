let data;
let sampleData;

function setup() {
  createCanvas(1200, 700);
  
  // Generate synthetic data with 200,000 rows
  console.log('Generating 200,000 rows of data...');
  let startTime = millis();
  
  const rows = [];
  const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Home', 'Sports', 'Toys', 'Health'];
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  
  for (let i = 0; i < 200000; i++) {
    rows.push({
      'ID': i + 1,
      'Category': categories[Math.floor(Math.random() * categories.length)],
      'Region': regions[Math.floor(Math.random() * regions.length)],
      'Sales': Math.floor(Math.random() * 10000),
      'Quantity': Math.floor(Math.random() * 100) + 1,
      'Rating': parseFloat((Math.random() * 5).toFixed(1))
    });
  }
  
  // Convert to DataFrame
  data = createDataFrame(rows);
  
  // Sample data for scatter plot (use 5000 points for performance)
  const sampleSize = 5000;
  const step = Math.floor(rows.length / sampleSize);
  const sampledRows = [];
  
  for (let i = 0; i < rows.length; i += step) {
    if (sampledRows.length < sampleSize) {
      sampledRows.push(rows[i]);
    }
  }
  
  sampleData = createDataFrame(sampledRows);
  
  let endTime = millis();
  console.log(`Data generation complete! Time: ${((endTime - startTime) / 1000).toFixed(2)}s`);
  console.log(`Total rows: ${data.rows.length.toLocaleString()}`);
  console.log(`Sampled to ${sampledRows.length} points for scatter plot`);
}

function draw() {
  background(255);
  
  // Display scatter plot with sampled data
  scatter(sampleData, {
    x: 'Quantity',
    y: 'Sales',
    color: 'Category',
    size: 'Rating',
    title: 'Sales vs Quantity Analysis',
    subtitle: `Showing ${sampleData.rows.length.toLocaleString()} sampled points from 200K transactions`,
    xLabel: 'Quantity',
    yLabel: 'Sales ($)',
    pointSize: 6,
    minSize: 4,
    maxSize: 12
  });
  
  // Display data info
  fill(0);
  noStroke();
  textSize(10);
  textAlign(RIGHT, TOP);
  text(`Source: ${data.rows.length.toLocaleString()} rows | Press "C" to export CSV`, width - 10, 10);
}

function keyPressed() {
  // Press 'C' to export data as CSV
  if (key === 'c' || key === 'C') {
    console.log('Exporting 200,000 rows to CSV...');
    toCSV(data, 'large-dataset-200k.csv');
    console.log('Export complete!');
  }
}
