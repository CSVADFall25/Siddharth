let df;

function setup() {
  createCanvas(800, 600);

  // 1. Create Data Manually
  // We use an array of objects where keys match the 'x' and 'y' options
  let rawData = [
    { Date: "2020", ValueA: 15, ValueB: 45, ValueC: 20 },
    { Date: "2021", ValueA: 25, ValueB: 35, ValueC: 30 },
    { Date: "2022", ValueA: 40, ValueB: 25, ValueC: 45 },
    { Date: "2023", ValueA: 35, ValueB: 50, ValueC: 40 },
    { Date: "2024", ValueA: 55, ValueB: 65, ValueC: 50 },
    { Date: "2025", ValueA: 60, ValueB: 55, ValueC: 70 }
  ];

  // 2. Convert to DataFrame
  // (createDataFrame is part of the library you provided earlier)
  df = createDataFrame(rawData);
}

function draw() {
  background(255);

  // Line Chart with COMPREHENSIVE options
  linePlot(df, {
    // ---------------------------
    // 1. DATA MAPPING
    // ---------------------------
    x: "Date",              // Column name for X-axis
    y: ["ValueA", "ValueB"], // Column name(s) for Y-axis. Pass an array ["A", "B"] for multi-line.

    // ---------------------------
    // 2. TEXT & METADATA
    // ---------------------------
    title: "Comprehensive Line Plot of The World Today and More More More Yay", // Chart Title
    subtitle: "Analysis of Trends over Time", // Subtitle
    author: "Data Science Team",      // Footer: Author
    source: "Sensor Array #4",        // Footer: Source
    xLabel: "Timeline (Years)",       // X-axis Label (defaults to column name if omitted)
    yLabel: "Amplitude (dB)",         // Y-axis Label (defaults to column name if omitted)

    // ---------------------------
    // 3. GEOMETRY & STYLING
    // ---------------------------
    pointSize: 25,          // Diameter of the dots in pixels
    lineSize: 10,            // Thickness of the connecting lines
    dots: true,             // Draw dots at data points? (true or false)
    pointStyle: "hollow",   // Dot style: "filled" (solid) or "hollow" (ring with background color center)
    palette: ["#FF5733", "#33C1FF", "#FFC300"], // Color palette array (hex codes)

    // ---------------------------
    // 4. INTERACTION & LABELS
    // ---------------------------
    // showValues options: 
    //   true    -> Always show values above/below dots
    //   false   -> Never show values (clean chart)
    //   "click" -> Only show value when user clicks/holds on a dot
    showValues: true,    
    
    // labelPos options:
    //   "top"    -> Always above dot
    //   "bottom" -> Always below dot
    //   "auto"   -> Smart positioning (flips if near top edge, alternates for multi-line)
    labelPos: "top",       

    // ---------------------------
    // 5. LAYOUT & TYPOGRAPHY
    // ---------------------------
    width: 800,             // Total chart width
    height: 600,            // Total chart height
    margin: { top: 70, right: 50, bottom: 70, left: 70 }, // Margins
    background: "#FFFFFF",  // Background color behind the grid/lines
    
    font: "Helvetica",      // Font family
    textAlign: LEFT,        // Title alignment: LEFT, CENTER, RIGHT
    titleSize: 24,          // Title font size
    subtitleSize: 14,       // Subtitle font size
    subtitleBold: false,    // Bold subtitle?

    // ---------------------------
    // 6. DEBUG
    // ---------------------------
    debug: false,           // Log details to console
  });

  // ==========================================================
  // ALTERNATIVE CONFIGURATIONS (Uncomment to test)
  // ==========================================================
  
  /*
  // -- Minimalist Sparkline Style --
  linePlot(df, {
     x: "Date", y: "ValueA",
     margin: { top: 10, right: 10, bottom: 10, left: 10 },
     dots: false,         // No dots
     showValues: false,   // No text
     lineSize: 1,         // Thin line
     xLabel: "", yLabel: "", // No axis labels
     title: "", subtitle: "" // No Text
  });
  */

  /*
  // -- "Busy" Scientific Style --
  linePlot(df, {
     x: "Date", y: ["ValueA", "ValueB", "ValueC"],
     pointStyle: "filled",
     pointSize: 5,
     showValues: true,     // Show all numbers
     labelPos: "auto",
     background: "#f0f0f0",
     palette: ["#000", "#555", "#aaa"] // Grayscale
  });
  */
}