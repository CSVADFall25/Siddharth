let data;

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
      'Category': random(categories),
      'Region': random(regions),
      'Sales': Math.floor(Math.random() * 10000),
      'Quantity': Math.floor(Math.random() * 100) + 1,
      'Rating': (Math.random() * 5).toFixed(1)
    });
  }
  
  // Convert to DataFrame
  data = createDataFrame(rows);
  
  let endTime = millis();
  console.log(`Data generation complete! Time: ${((endTime - startTime) / 1000).toFixed(2)}s`);
  console.log(`Total rows: ${data.rows.length}`);
}

function draw() {
  background(255);
  
  // Display table with pagination
  table(data, {
    x: 50,
    y: 100,
    width: 1100,
    height: 550,
    maxRows: 18,
    pagination: true,
    title: 'Large Dataset Table - 200,000 Rows',
    subtitle: 'Synthetic sales data with pagination'
  });
  
  // Display export instructions
  fill(0);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text('Press "C" to export full dataset as CSV (200K rows)', 10, 10);
  text(`Total Rows: ${data.rows.length.toLocaleString()}`, 10, 30);
}

function keyPressed() {
  // Press 'C' to export data as CSV
  if (key === 'c' || key === 'C') {
    console.log('Exporting 200,000 rows to CSV...');
    toCSV(data, 'large-dataset-200k.csv');
    console.log('Export complete!');
  }
}
