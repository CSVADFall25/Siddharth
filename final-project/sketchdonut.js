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

  // Donut Chart with COMPREHENSIVE options
  pie(df, {
    // ---------------------------
    // 1. DATA MAPPING
    // ---------------------------
    label: "category",      // Column for slice labels (e.g., categories)
    value: "count",         // Column for slice sizes (e.g., counts)

    // ---------------------------
    // 2. TEXT & METADATA
    // ---------------------------
    title: "Quarterly Departmental Budget Allocation (Donut)",
    subtitle: "Displaying category, value, and percentage.",
    author: "Finance Team",
    source: "2025 Budget Report",

    // ---------------------------
    // 3. PIE GEOMETRY & STYLING
    // ---------------------------
    radius: 180,
    lineSize: 2,
    
    // --- DONUT ACTIVATION ---
    style: 'donut',     // Activate Donut visualization
    holeRadius: 0.6,    // Size of the inner hole (0.1 to 0.9)
    // ------------------------

    palette: ["#1F77B4", "#FF7F0E", "#2CA02C", "#D62728", "#9467BD", "#8C564B"], 
    background: "#FFFFFF", // Used for the donut hole color

    // ---------------------------
    // 4. LABEL CONTENT & POSITION
    // ---------------------------
    // labelContent options: 'name' | 'value' | 'percent' | 'name_percent' | 'all'
    labelContent: 'name_percent', 
    
    // labelPos options: 'outside' | 'inside' (default) | 'none'
    labelPos: 'outside', 
    labelSize: 11,
    
    // showConnectors: Draw lines linking outside labels to their slices
    showConnectors: true, 

    // ---------------------------
    // 5. LAYOUT & TYPOGRAPHY
    // ---------------------------
    width: 700,
    height: 500,
    margin: { top: 80, right: 40, bottom: 40, left: 40 },
    
    font: "Verdana",
    textAlign: LEFT,
    titleSize: 20,
    subtitleSize: 14,
    subtitleBold: true,
  });

  // ==========================================================
  // ALTERNATIVE CONFIGURATIONS (Uncomment and swap with main call to test)
  // ==========================================================
  
  /* // -- Standard Pie Chart with Inside Labels --
  pie(df, {
    label: "category", value: "count",
    title: "Standard Pie Chart (Inside Labels)",
    
    // Standard Pie: Remove style option
    // labelPos: 'inside',          // Anchors labels in the center of the slice
    // labelContent: 'name',
    // showConnectors: false,       // Not needed for inside labels
    
    // palette: ["#395B64", "#A5C9CA", "#E7F6F2"], 
    // margin: { top: 60, right: 30, bottom: 30, left: 30 },
  });
  */

  /* // -- Donut Chart with Only Percentages and Inside Labels --
  pie(df, {
    label: "category", value: "count",
    title: "Donut Chart (Percentage Focus)",
    
    style: 'donut',
    holeRadius: 0.5,
    
    labelPos: 'inside',
    labelContent: 'percent', // Only show percentage value
    // labelSize: 18,             // Increase size for number focus
    // showConnectors: false,
    
    // palette: ["#2C3333", "#FF8B8B", "#EB4747", "#ABC9FF", "#FFD966"],
  });
  */
}