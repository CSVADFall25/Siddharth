let df;

function setup() {
  createCanvas(600, 400);

  // 1. Create Data Manually
  let rawData = [
    { red: "A", value: 10 },
    { red: "B", value: 30 },
    { red: "C", value: 20 },
    { red: "D", value: 40 },
    { red: "E", value: 25 }
  ];

  // 2. Convert to DataFrame
  df = createDataFrame(rawData);
}

function draw() {
  background(255);

  // Bar Chart with all options organized
  bar(df, {
    // ---------------------------
    // 1. DATA & ORIENTATION
    // ---------------------------
    x: "red",               // Column for x-axis labels
    y: "value",             // Column for y-axis values
    orientation: "vertical",// "vertical" or "horizontal"
    mode: "stacked",        // "stacked" or "grouped"

    // ---------------------------
    // 2. TEXT & METADATA
    // ---------------------------
    title: "Bar Chart Example",
    subtitle: "Subtitle",
    author: "Author Name",
    source: "Data Source",
    
    // ---------------------------
    // 3. AXIS & VALUE LABELS
    // ---------------------------
    xLabel: "X-Axis Label", // Custom X-axis text
    yLabel: "Y-Axis Label", // Custom Y-axis text
    showLabels: true,       // Show value labels on bars?
    labelPos: "auto",       // "auto", "start", "end", "inside", "outside"

    // ---------------------------
    // 4. LAYOUT & DIMENSIONS
    // ---------------------------
    width: 600,             // Chart width
    height: 400,            // Chart height
    margin: { top: 60, right: 40, bottom: 60, left: 50 },
    labelSpace: 100,        // Extra space for long labels

    // ---------------------------
    // 5. STYLING & PALETTE
    // ---------------------------
    background: "#FFFFFF",  // Chart background color
    palette: ["#FFD966", "#395B64", "#2C3333"], // Custom colors
    showGrid: true,         // Show background grid?
    gridColor: "#cccccc",   // Grid line color

    // ---------------------------
    // 6. BAR GEOMETRY
    // ---------------------------
    barWidth: "auto",       // "auto" or pixel value
    barSpacing: 5,          // Spacing between bars

    // ---------------------------
    // 7. INTERACTION
    // ---------------------------
    hoverEffect: true,      // Lighten/change color on hover?
    hoverColor: "#ffcccb",  // specific hover color override

    // ---------------------------
    // 8. TYPOGRAPHY
    // ---------------------------
    font: "Arial",          // Font family
    textAlign: LEFT,        // Alignment: LEFT, CENTER, RIGHT
    
    titleSize: 16,
    subtitleSize: 13,
    subtitleBold: false,    // Bold subtitle?
    authorFontSize: 14,
    xLabelSize: 12,
    yLabelSize: 12,

    // ---------------------------
    // 9. DEBUG
    // ---------------------------
    debug: true,            // Log details to console
  });

  // ==========================================================
  // ALTERNATIVE OPTIONS (Uncomment to test)
  // ==========================================================
  
  /* // -- Orientation & Layout --
  // orientation: "horizontal",
  // width: 800, 
  // height: 500,
  // margin: { top: 50, right: 30, bottom: 50, left: 40 },
  
  // -- Styling --
  // background: "#e0e0e0",
  // palette: ["#395B64", "#A5C9CA", "#E7F6F2"],
  // mode: "grouped",
  
  // -- Labels --
  // showLabels: false,
  // labelPos: "start",
  // labelSpace: 120,
  
  // -- Typography --
  // textAlign: CENTER,
  // font: "Helvetica", 
  
  // -- Geometry --
  // barSpacing: 10,
  // barWidth: 20,
  // showGrid: false,
  // gridColor: "#dddddd",
  
  // -- Interaction --
  // hoverEffect: false,
  // hoverColor: "#abcdef",
  */
}