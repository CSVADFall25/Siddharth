let df;

function setup() {
  createCanvas(800, 600);

  // 1. Create Data Manually (Expanded Dataset)
  let rawData = [
    { id: 1,  speed: 10, efficiency: 80,  risk: 5,   dept: "R&D" },
    { id: 2,  speed: 25, efficiency: 60,  risk: 10,  dept: "Sales" },
    { id: 3,  speed: 45, efficiency: 90,  risk: 25,  dept: "R&D" },
    { id: 4,  speed: 60, efficiency: 40,  risk: 8,   dept: "HR" },
    { id: 5,  speed: 70, efficiency: 75,  risk: 15,  dept: "Sales" },
    { id: 6,  speed: 85, efficiency: 55,  risk: 30,  dept: "HR" },
    { id: 7,  speed: 90, efficiency: 85,  risk: 12,  dept: "R&D" },
    { id: 8,  speed: 15, efficiency: 30,  risk: 4,   dept: "Ops" },
    { id: 9,  speed: 35, efficiency: 70,  risk: 18,  dept: "Ops" },
    { id: 10, speed: 55, efficiency: 65,  risk: 22,  dept: "Sales" },
    { id: 11, speed: 80, efficiency: 95,  risk: 40,  dept: "R&D" },
    { id: 12, speed: 95, efficiency: 20,  risk: 6,   dept: "HR" },
    { id: 13, speed: 5,  efficiency: 50,  risk: 2,   dept: "Ops" },
    { id: 14, speed: 40, efficiency: 85,  risk: 20,  dept: "R&D" },
    { id: 15, speed: 65, efficiency: 60,  risk: 14,  dept: "Sales" }
  ];

  // 2. Convert to DataFrame
  df = createDataFrame(rawData);
}

function draw() {
  background(255);

  // Scatter Plot with COMPREHENSIVE options
  scatter(df, {
    // ---------------------------
    // 1. DATA MAPPING
    // ---------------------------
    x: "speed",             // X-Axis Column (Numerical)
    y: "efficiency",        // Y-Axis Column (Numerical)
    
    // -- Variable Mapping (Bubble Chart Logic) --
    size: "risk",           // Column to determine dot size (Optional)
    color: "dept",          // Column to determine dot color (Optional - Categorical or Numeric)

    // ---------------------------
    // 2. TEXT & METADATA
    // ---------------------------
    title: "Project Analysis",
    subtitle: "Speed vs. Efficiency (Size = Risk)",
    author: "Strategy Dept",
    source: "Internal Audit",
    
    xLabel: "Speed (m/s)",  // Custom Label
    yLabel: "Efficiency (%)", // Custom Label

    // ---------------------------
    // 3. GEOMETRY & STYLING
    // ---------------------------
    // -- Size Scaling (if 'size' column is used) --
    minSize: 10,            // Minimum dot size (pixels)
    maxSize: 40,            // Maximum dot size (pixels)
    pointSize: 10,          // Fallback size if no 'size' column is provided

    // -- Styling --
    pointStyle: "hollow",   // "filled" or "hollow" (ring style)
    // Extended palette to cover 4 departments (R&D, Sales, HR, Ops)
    palette: ["#E76F51", "#2A9D8F", "#E9C46A", "#264653"], 
    background: "#FFFFFF",  // Chart background color

    // -- Connecting Lines (Optional) --
    connect: false,         // Draw line connecting points in order?
    lineColor: "#cccccc",   // Color of connecting line
    lineSize: 1,            // Width of connecting line

    // ---------------------------
    // 4. INTERACTION & LABELS
    // ---------------------------
    showValues: "click",    // true (static), false (hidden), "click" (on interaction)
    labelPos: "auto",       // "top", "bottom", "auto"

    // ---------------------------
    // 5. LAYOUT & DIMENSIONS
    // ---------------------------
    width: 800,
    height: 600,
    margin: { top: 70, right: 50, bottom: 70, left: 70 },
    
    // -- Axis Bounds (Optional Override) --
    // minX: 0, maxX: 100, 
    // minY: 0, maxY: 100,

    // ---------------------------
    // 6. TYPOGRAPHY
    // ---------------------------
    font: "Helvetica",
    textAlign: LEFT,
    titleSize: 24,
    subtitleSize: 14,
    subtitleBold: false,

    // ---------------------------
    // 7. DEBUG
    // ---------------------------
    debug: false,
  });
}