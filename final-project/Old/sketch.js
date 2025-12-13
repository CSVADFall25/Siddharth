let data;

function preload() {
  data = tableToDataFrame('la-fatal-traffic-accidents-2019-2021.csv', 'csv', 'header');
}

function setup() {
  createCanvas(1200, 600);
  data = data
    .addColumn('_date_reported', row => row['Date Reported'])
    .convertDate('_date_reported', { format: 'MM/DD/YYYY', onInvalid: 'null' })
    .addColumn('Year', row => (row._date_reported ? row._date_reported.getFullYear() : null))
    .group('Year', { Count: 'count' })
    .sort('Year', 'ascending');
}

function draw() {
  background(255);
  bar(data, {
    x: 'Year',
    y: 'Count',
    orientation: 'vertical',
    labelPos: 'outside',
    title: 'LA Fatal Traffic Accidents by Year',
    xLabel: 'Year',
    yLabel: 'Fatal Accidents (count)'
  });
}
