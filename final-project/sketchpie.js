let df;

function setup() {
  // Set up the canvas dimensions.
  createCanvas(700, 500); 

  // --- 1. Manual Data Creation ---
  // We use columns 'category' (label) and 'count' (value).
  let rawData = [
    { category: "R&D", count: 30 },
    { category: "Sales", count: 70 },
    { category: "Marketing", count: 45 },
    { category: "Operations", count: 15 },
    { category: "Finance", count: 25 },
    { category: "Support", count: 10 }
  ];

  // Convert the raw JavaScript array into a DataFrame object.
  df = createDataFrame(rawData);
}

function draw() {
  background(255);

  // Pie Chart with COMPREHENSIVE options
  pie(df, {
    // ---------------------------
    // 1. DATA MAPPING
    // ---------------------------
    label: "category",      // Column for slice labels (e.g., categories)
    value: "count",         // Column for slice sizes (e.g., counts)

    // ---------------------------
    // 2. TEXT & METADATA (Auto Left-Aligned)
    // ---------------------------
    title: "Quarterly Departmental Budget Allocation",
    subtitle: "Displaying category, value, and percentage.",
    author: "Finance Team",
    source: "2025 Budget Report",

    // ---------------------------
    // 3. PIE GEOMETRY & STYLING
    // ---------------------------
    radius: 180,            // Fixed radius (pixels)
    lineSize: 2,            // Thickness of the white separation lines between slices.
    
    // Custom colors for slices
    palette: ["#1F77B4", "#FF7F0E", "#2CA02C", "#D62728", "#9467BD", "#8C564B"], 
    background: "#F8F8F8",  // Background color behind the chart area

    // ---------------------------
    // 4. LABEL CONTENT & POSITION
    // ---------------------------
    // labelContent: What information to show.
    // Options: 'name' | 'value' | 'percent' | 'name_value' | 'name_percent' | 'all'
    labelContent: 'name_percent', 
    
    // labelPos: Where to anchor the label text
    // Options: 'outside' | 'inside' (default) | 'none'
    labelPos: 'outside', 
    labelSize: 11,          // Font size for labels
    
    // showConnectors: Draw lines linking outside labels to their slices
    showConnectors: true,

    // ---------------------------
    // 5. LAYOUT & TYPOGRAPHY
    // ---------------------------
    width: 700,             // Chart canvas width
    height: 500,            // Chart canvas height
    margin: { top: 80, right: 40, bottom: 40, left: 40 },
    
    font: "Verdana",
    textAlign: LEFT,        // Ensures titles/subtitles start at the left margin
    titleSize: 20,
    subtitleSize: 14,
    subtitleBold: true,
    
    // ---------------------------
    // 6. ALTERNATE STYLING (Uncomment to use Donut style)
    // ---------------------------
    // style: 'donut',     
    // holeRadius: 0.6,    // Size of the inner hole (0.1 to 0.9)
  });
}