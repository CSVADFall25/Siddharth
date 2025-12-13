function setup() {
  createCanvas(600, 400);
  // Example histogram data: 100 random numbers between 0 and 100
  let data = Array.from({length: 100}, () => ({ value: Math.floor(Math.random() * 100) }));
  window.df = createDataFrame(data);
}

function draw() {
  background(255);
  hist(window.df, {
    x: 'value'
  });
}