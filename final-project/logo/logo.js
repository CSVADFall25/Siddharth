// 1500 x 1000 p5.js canvas featuring p5.chart.js logo design
function setup() {
  createCanvas(1500, 1000);
  noLoop();
}

function draw() {
    background(255);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(100);
    text('p5.chart.js', width / 2, height / 2 - 50);
    // use the p5.chart.js library to draw a simple chart element as part of the logo
    let logoData = [
        { label: 'A', value: 30 },
        { label: 'B', value: 70 }
    ];
    pie(logoData, {
        x: 'label',
        y: 'value',
        xPos: width / 2,
        yPos: height / 2 + 150,
        diameter: 300,
        title: 'Logo Chart',
        subtitle: 'p5.chart.js',
        showLegend: false
    });
}