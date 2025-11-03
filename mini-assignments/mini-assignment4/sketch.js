/*
- I modified the distributed bar chart code to visualize my personal fitness data from the Pacer app (which I exported as a CSV file and includes no identifying information). 
- I modified the chart to allow switching between different metrics: steps, calories, distance, and active time.
- I consulted ChatGPT5 to debug errors with with adding labels to the graph and data parsing.
*/ 

let table;

// data arrays
let steps = [];
let calories = [];
let distanceM = [];
let activeSec = [];
let labels = []; // "MM/DD/YY"

let tooltipGraphics;
let earliestDate, latestDate, totalDays;

let heightMode = 'steps'; // default view: 1

const TOP_PAD = 58, BOTTOM_PAD = 50, LEFT_PAD = 60, RIGHT_PAD = 45;

function preload() {
  // load CSV file with header row
  table = loadTable('pacer_steps.csv', 'csv', 'header');
}

function setup() {
  // create canvas
  createCanvas(constrain(windowWidth, 950, 2200), 480);
  tooltipGraphics = createGraphics(width, height);

  // rows 
  for (let r = 0; r < table.getRowCount(); r++) {
    const rawDate = table.getString(r, 'Date');
    const short = toShortUS(rawDate); 
    if (!short) continue;            

    if (earliestDate === undefined || compareDates(short, earliestDate) === -1) earliestDate = short;
    if (latestDate === undefined || compareDates(short, latestDate) === 1) latestDate = short;

    labels.push(short);
    steps.push(safeNum(table.getString(r, 'Steps')));
    calories.push(safeNum(table.getString(r, 'Calories')));
    distanceM.push(safeNum(table.getString(r, 'Distance (meters)')));
    activeSec.push(safeNum(table.getString(r, 'ActiveTime (seconds)')));
  }

  totalDays = max(1, computeDateDifference(earliestDate, latestDate));
}

function windowResized() {
  // adjust canvas size
  resizeCanvas(constrain(windowWidth, 950, 2200), 480);
  tooltipGraphics = createGraphics(width, height);
}

function draw() {
  background(255);
  colorMode(RGB);

  // pick metric for height
  let heightValues = steps, title = "Steps per Day", yLabel = "Steps (count)";
  if (heightMode === 'calories')   { heightValues = calories;  title = "Calories per Day";             yLabel = "Calories (kcal)"; }
  if (heightMode === 'distanceM')  { heightValues = distanceM; title = "Distance per Day (meters)";    yLabel = "Distance (m)";    }
  if (heightMode === 'activeSec')  { heightValues = activeSec; title = "Active Time per Day (seconds)"; yLabel = "Active Time (s)"; }

  drawBarChart(heightValues, calories, labels); // color by calories
  drawAxes(heightValues);
  drawYAxisLabel(yLabel);
  drawTitle(title);
  drawKey();
  drawColorLegend();
}

// Drawing

function drawTitle(txt){ 
  // title
  textAlign(CENTER,TOP); 
  textSize(20); 
  textStyle(BOLD); 
  fill(0); 
  text(txt,width/2,10); 
}

function drawKey(){
  // key
  const x=15,y=38;
  noStroke(); fill(255); rect(x-5,y-20,540,45,10); 
  fill(0); textAlign(LEFT,CENTER); textSize(14); textStyle(BOLD); text("Press 1–4 to switch view", x+15, y-2);
  textStyle(NORMAL); textSize(12); fill(40);
  text("1 = Steps   2 = Calories   3 = Distance (m)   4 = Active Time (s)", x+15, y+14);
}

function drawColorLegend(){
  // color legend for calories
  const maxCal=max(calories)||1, W=260,H=14, x0=width-W-40, y0=36;
  noStroke(); fill(255); rect(x0-10,y0-24,W+20,50,10);
  fill(0); textAlign(LEFT,TOP); textSize(12); text("Calories (kcal) scale", x0, y0-18);
  for(let i=0;i<W;i++){ const hue=map(i,0,W,0,140); colorMode(HSL); stroke(hue,80,60); line(x0+i,y0,x0+i,y0+H); }
  colorMode(RGB); noStroke(); fill(0); textSize(11);
  textAlign(LEFT,TOP); text("0",x0,y0+H+4);
  textAlign(RIGHT,TOP); text(`${round(maxCal)}`, x0+W, y0+H+4);
}

function drawYAxisLabel(label) {
  // Y-axis label
  push();
  textAlign(CENTER, CENTER);
  textSize(14);
  fill(0);
  translate(LEFT_PAD - 45, height / 2);
  rotate(-HALF_PI);
  text(label, 0, 0);
  pop();
}

function drawAxes(values){
  const yAxis = height - BOTTOM_PAD;

  // X-axis baseline
  stroke(0);
  strokeWeight(1);
  line(LEFT_PAD, yAxis, width - RIGHT_PAD, yAxis);

  // Y-axis labels
  const maxVal = max(values) || 1;
  const step = niceStep(maxVal / 5);
  textSize(11);
  textAlign(RIGHT, CENTER);
  fill(0);
  noStroke();
  for (let v = 0; v <= maxVal; v += step) {
    const y = map(v, 0, maxVal, yAxis, TOP_PAD + 10);
    text(v.toFixed(0), LEFT_PAD - 8, y);
  }

  // Month ticks and labels every 6 months
  const first = parseDate(labels[0] || earliestDate);
  const last = parseDate(latestDate);
  let y = first.year, m = first.month;
  textAlign(CENTER, TOP);
  textSize(11);
  fill(0);

  while (y < last.year || (y === last.year && m <= last.month)) {
    // Draw tick for every 6th month
    const monthIndex = (y - first.year) * 12 + (m - first.month);
    if (monthIndex % 6 === 0) {
      const d = new Date(y, m - 1, 1);
      const norm = normalizeDate(formatYMD(d), earliestDate, latestDate);
      const x = map(norm, 0, 1, LEFT_PAD, width - RIGHT_PAD);
      stroke(0);
      line(x, yAxis - 10, x, yAxis + 4);
      noStroke();
      const abbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
      text(`${abbr} ${d.getFullYear()}`, x, yAxis + 6);
    }

    m++;
    if (m > 12) { m = 1; y++; }
  }
}


function niceStep(range){
  // returns a "nice" step size for axis labels
  if(range<=0 || !isFinite(range)) return 1;
  const exp=Math.floor(Math.log10(range)), base=Math.pow(10,exp), frac=range/base;
  return (frac<=1?1:frac<=2?2:frac<=5?5:10)*base;
}

function drawBarChart(heightVals,colorByCal,labelDates){
  // clear tooltip layer
  tooltipGraphics.clear();

  const drawW=width-LEFT_PAD-RIGHT_PAD, drawH=height-TOP_PAD-BOTTOM_PAD;
  const n=max(1,heightVals.length);
  const rawBarW=drawW/n, bw=constrain(rawBarW*0.85,2,14);

  const maxH=max(heightVals)||1, maxCal=max(colorByCal)||1;
  let prevNorm=-1;

  // bars
  for(let i=0;i<heightVals.length;i++){
    const h=map(heightVals[i],0,maxH,0,drawH-20);
    const norm=normalizeDate(labelDates[i], earliestDate, latestDate);
    let x=map(norm,0,1,LEFT_PAD,width-RIGHT_PAD);
    if(norm===prevNorm) x+=10;
    prevNorm=norm;
    const y=height-BOTTOM_PAD-h;

    // color by calories
    const hue=map(colorByCal[i],0,maxCal,0,140);
    colorMode(HSL); fill(hue,80,60); noStroke();
    rect(x-bw/2,y,bw,h);
  }

  // tooltips
  colorMode(RGB);
  for(let i=0;i<heightVals.length;i++){
    const norm=normalizeDate(labelDates[i], earliestDate, latestDate);
    const x=map(norm,0,1,LEFT_PAD,width-RIGHT_PAD);
    const h=map(heightVals[i],0,maxH,0,drawH-20);
    const y=height-BOTTOM_PAD-h;
    const over = mouseX>=x-bw/2 && mouseX<=x+bw/2 && mouseY>=y && mouseY<=y+h;
    if(over){
      const lines=[
        `${labelDates[i]}`,
        `Steps: ${nf(steps[i],1,0)}`,
        `Calories: ${nf(calories[i],1,1)}`,
        `Distance: ${nf(distanceM[i],1,1)} m`,
        `Active: ${nf(activeSec[i],1,0)} s`
      ];
      drawTooltip(lines);
    }
  }

  image(tooltipGraphics,0,0);
}

function drawTooltip(lines){
  // draw tooltip box at mouse position with given lines of text
  tooltipGraphics.colorMode(RGB);
  tooltipGraphics.textAlign(LEFT,TOP);
  tooltipGraphics.textSize(12);
  const padding=8;
  let tw=0; for(let t of lines) tw=max(tw, textWidth(t));
  const boxW=tw+padding*2, lineH=16, boxH=lines.length*lineH+padding*2;
  const tipX=constrain(mouseX+12, LEFT_PAD, width-RIGHT_PAD-boxW);
  const tipY=constrain(mouseY-(boxH+12), TOP_PAD, height-BOTTOM_PAD-boxH);
  tooltipGraphics.noStroke();
  tooltipGraphics.fill(0,0,0,200);
  tooltipGraphics.rect(tipX,tipY,boxW,boxH,6);
  tooltipGraphics.fill(255);
  for(let i=0;i<lines.length;i++){
    tooltipGraphics.text(lines[i], tipX+padding, tipY+padding+i*lineH);
  }
}

function safeNum(x){
  // numeric blanks/NaN => 0
  if (x === undefined || x === null) return 0;
  const v = parseFloat(String(x).trim());
  return isNaN(v) ? 0 : v;
}

function toShortUS(raw){
  // "M/D/YYYY" -> "MM/DD/YY"; invalid -> null
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d)) return null;
  const mm = nf(d.getMonth()+1, 2);
  const dd = nf(d.getDate(), 2);
  const yy = str(d.getFullYear()).slice(2);
  return `${mm}/${dd}/${yy}`;
}

function parseDate(str){
  // "MM/DD/YY" or "MM/DD/YYYY" -> {year,month,day}
  const [mStr,dStr,yStr]=str.split('/');
  let m=int(mStr), d=int(dStr), y=int(yStr);
  if (y < 100) y = 2000 + y;
  return {year:y, month:m, day:d};
}

function compareDates(aStr,bStr){
  // -1 if a<b, 0 if a==b, 1 if a>b
  const a=parseDate(aStr), b=parseDate(bStr);
  if (a.year !== b.year)  return a.year  < b.year  ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day)    return a.day   < b.day   ? -1 : 1;
  return 0;
}

function computeDateDifference(aStr,bStr){
  // number of days between two dates (at least 1)
  const a=parseDate(aStr), b=parseDate(bStr);
  const A=new Date(a.year,a.month-1,a.day);
  const B=new Date(b.year,b.month-1,b.day);
  return max(1, Math.ceil(Math.abs(B-A)/(1000*60*60*24)));
}

function normalizeDate(dateStr,startStr,endStr){
  // normalize dateStr between startStr and endStr to [0,1]
  const t=parseDate(dateStr), s=parseDate(startStr), e=parseDate(endStr);
  const T=new Date(t.year,t.month-1,t.day);
  const S=new Date(s.year,s.month-1,s.day);
  const E=new Date(e.year,e.month-1,e.day);
  const total = E - S; if (total === 0) return 0;
  return constrain((T - S) / total, 0, 1);
}

function formatYMD(d){
  // Date -> "MM/DD/YY"
  const y=str(d.getFullYear()).slice(2);
  const m=nf(d.getMonth()+1,2);
  const day=nf(d.getDate(),2);
  return `${m}/${day}/${y}`;
}

function keyPressed(){
  // switch height mode
  if (key === '1') heightMode = 'steps';
  if (key === '2') heightMode = 'calories';
  if (key === '3') heightMode = 'distanceM';
  if (key === '4') heightMode = 'activeSec';
}