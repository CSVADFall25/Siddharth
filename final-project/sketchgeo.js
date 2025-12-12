let df;

function setup() {
  createCanvas(800, 600);
  
  // Example city points
  df = createDataFrame([
    { lat: 37.7749, lon: 122.4194, label: 'Beijing', value: 874961 },
    { lat: 34.0522, lon: -118.2437, label: 'Los Angeles', value: 3898747 },
    { lat: 40.7128, lon: -74.0060, label: 'New York', value: 8336817 },
    { lat: 41.8781, lon: -87.6298, label: 'Chicago', value: 2746388 },
    { lat: 29.7604, lon: -95.3698, label: 'Houston', value: 2304580 },
  ]);
}

function draw() {
  background(200);
  
  // Draw the geo chart with data - center is auto-calculated!
  geo(df, {
    lat: 'lat',
    lon: 'lon',
    label: 'label',
    value: 'value'
  });
}