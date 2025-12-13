let rawRows;
let dropdown;
let currentMode = 'grouped'; // 'grouped' | 'stacked'

let chartData;

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Books', 'Home', 'Sports', 'Toys', 'Health'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];

function setup() {
  createCanvas(1200, 700);

  // One dropdown: each view shows ONE chart (two total chart types)
  dropdown = makeDropdown(20, 20, currentMode, (val) => {
    currentMode = val;
  });

  // Generate synthetic data (2,000 rows)
  console.log('Generating 2,000 rows of data...');
  const startTime = millis();

  rawRows = [];
  for (let i = 0; i < 2000; i++) {
    rawRows.push({
      ID: i + 1,
      Category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
      Region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
      Sales: Math.floor(Math.random() * 10000),
      Quantity: Math.floor(Math.random() * 100) + 1,
      Rating: parseFloat((Math.random() * 5).toFixed(1))
    });
  }

  const endTime = millis();
  console.log(`Data generation complete! Time: ${((endTime - startTime) / 1000).toFixed(2)}s`);
  console.log(`Total rows: ${rawRows.length.toLocaleString()}`);

  // Fixed breakdown for the single dropdown UX: X = Region, segments = Category
  chartData = buildBarDataForRegionByCategory();
}

function makeDropdown(x, y, selectedValue, onChange) {
  const dd = createSelect();
  dd.position(x, y);
  dd.option('Grouped Bars', 'grouped');
  dd.option('Segmented (Stacked) Bars', 'stacked');
  dd.selected(selectedValue);
  dd.changed(() => onChange(dd.value()));

  dd.style('padding', '8px 12px');
  dd.style('font-size', '14px');
  dd.style('font-family', 'Roboto, sans-serif');
  dd.style('border', '2px solid #395B64');
  dd.style('border-radius', '4px');
  dd.style('background-color', 'white');
  dd.style('cursor', 'pointer');
  return dd;
}

function buildBarDataForRegionByCategory() {
  const metric = 'Sales';
  // DataFrame pipeline:
  // 1) Group by Region+Category and sum Sales
  // 2) Pivot to wide format: one row per Region, one column per Category
  // 3) Fill missing categories with 0 and keep Region ordering stable
  const df = createDataFrame(rawRows);
  const grouped = df.group(['Region', 'Category'], { [metric]: 'sum' });
  const pivoted = grouped.pivot('Region', 'Category', metric, 'sum');

  const byRegion = new Map(pivoted.rows.map(r => [r.Region, r]));
  const orderedRows = REGIONS.map(region => byRegion.get(region) || ({ Region: region }));
  orderedRows.forEach(r => {
    CATEGORIES.forEach(cat => {
      if (r[cat] === undefined) r[cat] = 0;
    });
  });

  return createDataFrame(orderedRows);
}

function draw() {
  background(245);
  if (!chartData) return;

  const topOffset = 70;
  const leftPad = 20;
  const chartW = width - leftPad * 2;
  const chartH = height - topOffset - 20;

  push();
  translate(leftPad, topOffset);
  bar(chartData, {
    x: 'Region',
    y: CATEGORIES.slice(),
    orientation: 'vertical',
    mode: currentMode,
    title: currentMode === 'grouped' ? 'Grouped Bars' : 'Segmented (Stacked) Bars',
    subtitle: 'Totals by Region (segments = Category)',
    xLabel: 'Region',
    yLabel: 'Total Sales',
    labelPos: 'none',
    width: chartW,
    height: chartH,
    margin: { top: 90, right: 30, bottom: 80, left: 80 },
    showGrid: true,
    hoverEffect: true
  });
  pop();

  fill(0);
  noStroke();
  textSize(10);
  textAlign(RIGHT, TOP);
  text(`Source: ${rawRows.length.toLocaleString()} synthetic rows`, width - 10, 10);
}
