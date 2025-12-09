let data;

function setup() {
  createCanvas(1000, 600);
  
  // Create DataFrame directly with all data inline
  data = createDataFrame([
    ['Alice', 28, 'New York', 95],
    ['Bob', 34, 'San Francisco', 87],
    ['Charlie', 25, 'Chicago', 92],
    ['Diana', 31, 'Boston', 88],
    ['Eve', 29, 'Seattle', 94],
    ['Frank', 45, 'Austin', 78],
    ['Grace', 22, 'Denver', 91],
    ['Henry', 38, 'Portland', 85],
    ['Ivy', 27, 'Miami', 89],
    ['Jack', 33, 'Dallas', 93],
    ['Kate', 41, 'New York', 76],
    ['Leo', 24, 'San Francisco', 88],
    ['Mia', 36, 'Chicago', 90],
    ['Noah', 29, 'Boston', 84],
    ['Olivia', 31, 'Seattle', 92],
    ['Paul', 26, 'Austin', 86],
    ['Quinn', 39, 'Denver', 79],
    ['Rose', 23, 'Portland', 95],
    ['Sam', 44, 'Miami', 81],
    ['Tina', 30, 'Dallas', 87],
    ['Uma', 35, 'New York', 83],
    ['Victor', 28, 'San Francisco', 94],
    ['Wendy', 42, 'Chicago', 77],
    ['Xander', 25, 'Boston', 91],
    ['Yara', 37, 'Seattle', 85],
    ['Zoe', 32, 'Austin', 89],
    ['Adam', 27, 'Denver', 92],
    ['Beth', 40, 'Portland', 80],
    ['Carl', 34, 'Miami', 88],
    ['Dora', 29, 'Dallas', 93],
    ['Eli', 46, 'New York', 75],
    ['Fay', 24, 'San Francisco', 90],
    ['Glen', 38, 'Chicago', 82],
    ['Hope', 31, 'Boston', 86],
    ['Ian', 26, 'Seattle', 94],
    ['Jane', 43, 'Austin', 79],
    ['Kyle', 28, 'Denver', 91],
    ['Liz', 35, 'Portland', 84],
    ['Max', 30, 'Miami', 88],
    ['Nina', 33, 'Dallas', 92],
    ['Owen', 41, 'New York', 78],
    ['Pam', 25, 'San Francisco', 95],
    ['Ray', 37, 'Chicago', 83]
  ], ['Name', 'Age', 'City', 'Score']);
  
  // Modify Age column: divide by 2
  data.transform('Age', divideByTwo);
  
  // Rename Score column to Points
  data.rename('Score', 'Points');
  
  // Filter to show only people with Age > 13
  data = data.filter('Age', '>', 13);
  
  // Other DataFrame methods (commented examples):
  // data.select(['Name', 'Points']); // Keep only Name and Points columns
  // data.drop(['City']); // Remove City column
  // data.filter('Points', '>=', 90); // Filter by Points >= 90
  // data.group('City', (rows) => ({ avgPoints: rows.reduce((sum, r) => sum + r.Points, 0) / rows.length }));
  // data.pivot('City', 'Name', 'Points', 'sum'); // Pivot table
}

// Helper function to divide a value by 2
function divideByTwo(age) {
  return age / 2;
}

function draw() {
  background(255);
  
  // Display table - searchable and pagination auto-enabled for 43 rows
  table(data, {
    title: 'Student Records',
    tooltip: 'Click to select',
    x: 20,
    y: 80,
    width: 960,
    maxRows: 10
  });
}
