function setup() {
  createCanvas(800, 800);
}

function draw() {
  background("#761f11");
  
  strokeWeight(10);
  stroke("#000000");
  fill("#9490ff");
  circle(400, 400, 500);
  
  strokeWeight(4);
  stroke("#000000");
  fill("#901557");
  circle(300, 300, 100);

  fill("#901557");
  circle(500, 300, 100);

  fill("black");
  circle(500, 325, 50);

  fill("black");
  circle(300, 325, 50);

  fill("white");
  circle(485, 315, 10);

  fill("white");
  circle(285, 315, 10);

  fill(150, 45, 200);
  triangle(400, 350, 350, 450, 450, 450);

  strokeWeight(10);
  stroke("#000000");
  fill("red");
  rect(300, 525, 200, 20);
}