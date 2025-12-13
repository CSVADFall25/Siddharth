// Multi-Chart Dashboard with Manual Dropdown
// Switch between different charts using a dropdown

let salesData;
let revenueData;
let dropdown;
let currentChart = 'sales'; // Default chart

function setup() {
  createCanvas(1000, 600);
  
  // Create sample data for sales by product
  salesData = createDataFrame([
    { product: 'Laptops', sales: 450 },
    { product: 'Phones', sales: 890 },
    { product: 'Tablets', sales: 320 },
    { product: 'Monitors', sales: 210 },
    { product: 'Keyboards', sales: 580 }
  ], ['product', 'sales']);
  
  // Create sample data for revenue by quarter
  revenueData = createDataFrame([
    { quarter: 'Q1 2024', revenue: 125000 },
    { quarter: 'Q2 2024', revenue: 158000 },
    { quarter: 'Q3 2024', revenue: 142000 },
    { quarter: 'Q4 2024', revenue: 187000 }
  ], ['quarter', 'revenue']);
  
  // Create manual dropdown using p5.js createSelect()
  dropdown = createSelect();
  dropdown.position(20, 20);
  dropdown.option('Sales by Product', 'sales');
  dropdown.option('Revenue by Quarter', 'revenue');
  dropdown.selected('sales');
  dropdown.changed(handleDropdownChange);
  
  // Style the dropdown
  dropdown.style('padding', '8px 12px');
  dropdown.style('font-size', '14px');
  dropdown.style('font-family', 'Roboto, sans-serif');
  dropdown.style('border', '2px solid #395B64');
  dropdown.style('border-radius', '4px');
  dropdown.style('background-color', 'white');
  dropdown.style('cursor', 'pointer');
}

function draw() {
  background(245);
  
  // Draw the selected chart
  if (currentChart === 'sales') {
    drawSalesChart();
  } else if (currentChart === 'revenue') {
    drawRevenueChart();
  }
}

function handleDropdownChange() {
  currentChart = dropdown.value();
}

function drawSalesChart() {
  bar(salesData, {
    x: 'product',
    y: 'sales',
    title: 'Product Sales Dashboard',
    subtitle: 'Units sold by product category',
    orientation: 'vertical',
    width: width - 40,
    height: height - 40,
    margin: { top: 100, right: 40, bottom: 80, left: 80 },
    xLabel: 'Product Category',
    yLabel: 'Units Sold',
    labelPos: 'outside',
    palette: ['#395B64', '#A5C9CA', '#2C3333', '#E7F6F2', '#FF8B8B']
  });
}

function drawRevenueChart() {
  bar(revenueData, {
    x: 'quarter',
    y: 'revenue',
    title: 'Quarterly Revenue',
    subtitle: 'Revenue performance by quarter',
    orientation: 'vertical',
    width: width - 40,
    height: height - 40,
    margin: { top: 100, right: 40, bottom: 80, left: 100 },
    xLabel: 'Quarter',
    yLabel: 'Revenue ($)',
    labelPos: 'outside',
    palette: ['#ABC9FF', '#FFD966', '#EB4747', '#A5C9CA']
  });
}
