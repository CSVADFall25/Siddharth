/* App.js
- Base application
*/

let strokes = [];
let currentStroke = null;

/* -------- Layout -------- */
const BOX = { x: 450, y: 64, w: 1100, h: 700 }; // drawing area

// Wheel + Brightness bar
const WHEEL = { cx: 190, cy: 220, r: 120 };
const BBAR  = { x: 330, y: 110, w: 18,  h: 224, r: 6 };

// Current color (HSB + Alpha)
let H = 16, S = 46, B = 100, A = 100; // A is 0..100

// Controls
let thickSlider, opacSlider, saveBtn, clearBtn;

// Offscreen color wheel
let gWheel;

// Tool mode
let toolMode = 'draw';
let drawBtn, eraseBtn, eraseStrokeBtn, changeColorBtn; 

// AI palette state
let paletteColors = []; // array of hex strings
const PALETTE = { x: 40, y: 775, sw: 36, gap: 10, rows: 1 }; // clickable swatches

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  textFont('Arial');

  // Precompute H/S wheel
  gWheel = createGraphics(WHEEL.r * 2 + 2, WHEEL.r * 2 + 2);
  gWheel.colorMode(HSB, 360, 100, 100, 100);
  gWheel.noStroke();
  gWheel.noSmooth();
  const C = gWheel.width / 2;
  gWheel.loadPixels();
  for (let y = 0; y < gWheel.height; y++) {
    for (let x = 0; x < gWheel.width; x++) {
      const dx = x - C, dy = y - C;
      const r = Math.hypot(dx, dy);
      if (r <= WHEEL.r) {
        let ang = degrees(Math.atan2(dy, dx)); if (ang < 0) ang += 360;
        const sat = map(r, 0, WHEEL.r, 0, 100, true);
        gWheel.set(x, y, gWheel.color(ang, sat, 100));
      } else {
        gWheel.set(x, y, gWheel.color(0, 0, 100, 0));
      }
    }
  }
  gWheel.updatePixels();

  // Controls
  createSpan('<b>Thickness:</b>')
    .position(40, 480)
    .style('font-size','14px').style('font-family','Arial').style('color','#111');
  thickSlider = createSlider(1, 40, 4, 1);
  thickSlider.position(40, 500).style('width','260px');

  createSpan('<b>Opacity:</b>')
    .position(40, 530)
    .style('font-size','14px').style('font-family','Arial').style('color','#111');
  opacSlider = createSlider(0, 100, 100, 1);
  opacSlider.position(40, 550).style('width','260px');
  opacSlider.input(() => { A = opacSlider.value(); });

  saveBtn = createButton('Save');
  saveBtn.position(40, 600);
  saveBtn.mousePressed(saveCropped);
  styleButton(saveBtn, '#2563EB');

  clearBtn = createButton('Clear');
  clearBtn.position(150, 600);
  clearBtn.mousePressed(() => { strokes = []; });
  styleButton(clearBtn, '#10B981');

  drawBtn = createButton('Draw');
  drawBtn.position(40, 640);
  drawBtn.mousePressed(() => toolMode = 'draw');
  styleButton(drawBtn, '#374151');

  eraseBtn = createButton('Erase');
  eraseBtn.position(110, 640);
  eraseBtn.mousePressed(() => toolMode = 'erase');
  styleButton(eraseBtn, '#F59E0B');

  eraseStrokeBtn = createButton('Erase Stroke');
  eraseStrokeBtn.position(180, 640);
  eraseStrokeBtn.mousePressed(() => toolMode = 'eraseStroke');
  styleButton(eraseStrokeBtn, '#EF4444');

  // Change button
  changeColorBtn = createButton('Change');
  changeColorBtn.position(290, 640);
  changeColorBtn.mousePressed(() => toolMode = 'recolor');
  styleButton(changeColorBtn, '#8B5CF6'); // purple

  // Hook up the AI palette panel 
  if (window.AIPalette?.init) {
    window.AIPalette.init({ x: 40, y: 680 });
  }

  // Hook up the AI Art panel 
  if (window.AIArt?.init) {
    window.AIArt.init({ x: 40, y: 770 });
  }

  // Listen for palette events
  window.addEventListener('ai-palette', (e) => {
    paletteColors = Array.isArray(e.detail?.colors) ? e.detail.colors : [];
  });

  // Listen for AI Art results and insert as Stroke objects
  window.addEventListener('ai-art', (e) => {
    try {
      const payload = e.detail;
      addArtStrokes(payload); 
    } catch (err) {
      console.error('AI Art insert error:', err);
    }
  });
}

function draw() {
  background('#ffffff');
  drawUIPanel();
  drawBox();
  for (const s of strokes) s.draw(this);
  if (currentStroke) currentStroke.draw(this);
}

/* ---------- Interaction ---------- */
function mousePressed() {
  if (inWheel(mouseX, mouseY)) { pickFromWheel(mouseX, mouseY); return; }
  if (inBBar(mouseX, mouseY))  { pickBrightness(mouseY);        return; }

  // Click on AI palette swatches
  const hex = swatchAt(mouseX, mouseY);
  if (hex) { setFromHex(hex); return; }

  if (!inBox(mouseX, mouseY)) return;

  // Recolor tool — click a stroke to apply current color/thickness/opacity
  if (toolMode === 'recolor') {
    const idx = findStrokeAt(mouseX, mouseY);
    if (idx !== -1) {
      A = opacSlider.value();
      const s = strokes[idx];
      s.col = color(H, S, B, A);           // change color 
      s.thickness = thickSlider.value();   // change thickness
      s.opacity = A;                       // keep metadata in sync
      s.eraser = false;                    // ensure it's not an eraser stroke
    }
    return; // done for recolor tool
  }

  if (toolMode === 'eraseStroke') {
    const idx = findStrokeAt(mouseX, mouseY);
    if (idx !== -1) strokes.splice(idx, 1);
    return;
  }

  A = opacSlider.value();

  if (toolMode === 'erase') {
    currentStroke = new Stroke(color(0, 0, 100, 0), thickSlider.value(), 100, true);
  } else {
    currentStroke = new Stroke(color(H, S, B, A), thickSlider.value(), A, false);
  }
  currentStroke.add(mouseX, mouseY);
}

function mouseDragged() {
  if (inWheel(mouseX, mouseY)) { pickFromWheel(mouseX, mouseY); return; }
  if (inBBar(mouseX, mouseY))  { pickBrightness(mouseY);        return; }
  if (currentStroke && inBox(mouseX, mouseY)) currentStroke.add(mouseX, mouseY);
}

function mouseReleased() {
  if (currentStroke) {
    if (currentStroke.points.length >= 2) strokes.push(currentStroke);
    currentStroke = null;
  }
}

/* ---------- Hit tests and pickers ---------- */
function inBox(x, y) {
  return x >= BOX.x && x <= BOX.x + BOX.w && y >= BOX.y && y <= BOX.y + BOX.h;
}
function inWheel(x, y) {
  const dx = x - WHEEL.cx, dy = y - WHEEL.cy;
  return (dx*dx + dy*dy) <= (WHEEL.r * WHEEL.r);
}
function inBBar(x, y) {
  return x >= BBAR.x && x <= BBAR.x + BBAR.w && y >= BBAR.y && y <= BBAR.y + BBAR.h;
}
function pickFromWheel(mx, my) {
  const dx = mx - WHEEL.cx, dy = my - WHEEL.cy;
  let ang = degrees(Math.atan2(dy, dx)); if (ang < 0) ang += 360;
  const r = Math.min(WHEEL.r, Math.hypot(dx, dy));
  H = ang;
  S = Math.round(map(r, 0, WHEEL.r, 0, 100, true));
}
function pickBrightness(my) {
  B = Math.round(map(constrain(my, BBAR.y, BBAR.y + BBAR.h), BBAR.y + BBAR.h, BBAR.y, 0, 100));
}

/* ---------- Rendering  ---------- */
function drawUIPanel() {
  // Panel background + divider
  noStroke(); fill('#ffffff'); rect(0, 0, BOX.x - 40, height);
  stroke('#111'); strokeWeight(1); line(BOX.x - 40, 0, BOX.x - 40, height);

  // Title
  noStroke(); fill('#111'); textSize(16); textStyle(BOLD); text('Tools', 40, 34);

  // Wheel
  imageMode(CENTER); image(gWheel, WHEEL.cx, WHEEL.cy);

  // Pointer (circle)
  const r = map(S, 0, 100, 0, WHEEL.r);
  const a = radians(H);
  const px = WHEEL.cx + r * cos(a);
  const py = WHEEL.cy + r * sin(a);
  push();
  translate(px, py);
  noStroke();
  fill(H, S, max(40, B), A);
  circle(0, 0, 14);
  stroke('#111'); noFill(); circle(0, 0, 14);
  pop();

  // Brightness bar (gradient)
  noFill(); strokeWeight(1);
  for (let i = 0; i < BBAR.h; i++) {
    const t = 1 - i / (BBAR.h - 1);
    const bri = t * 100;
    stroke(H, S, bri);
    line(BBAR.x, BBAR.y + i, BBAR.x + BBAR.w, BBAR.y + i);
  }

  // Bar border
  noFill(); stroke('#111'); rect(BBAR.x, BBAR.y, BBAR.w, BBAR.h, BBAR.r);

  // Brightness handle
  const yPos = map(B, 0, 100, BBAR.y + BBAR.h, BBAR.y);
  fill('#ffffff'); stroke('#111'); rect(BBAR.x - 7, yPos - 8, BBAR.w + 14, 16, 8);

  // Preview bar
  const swY = WHEEL.cy + WHEEL.r + 28;
  noStroke(); fill(H, S, B, A); rect(40, swY, 260, 28, 8);
  stroke('#111'); noFill(); rect(40, swY, 260, 28, 8);

  // Readouts
  const c = color(H, S, B, A);
  const R = Math.round(red(c)), G = Math.round(green(c)), Bl = Math.round(blue(c));
  const alpha255 = Math.round(map(A, 0, 100, 0, 255));
  noStroke(); fill('#111'); textSize(12); textStyle(NORMAL);
  const y1 = swY + 46, y2 = y1 + 20;
  text(`Hue: ${Math.round(H)}°`, 40, y1);
  text(`Sat: ${Math.round(S)}%`, 100, y1);
  text(`Bri: ${Math.round(B)}%`, 165, y1);
  text(`Red: ${R}`, 40, y2);
  text(`Green: ${G}`, 100, y2);
  text(`Blue: ${Bl}`, 165, y2);
  text(`Alpha: ${alpha255}`, 220, y2);

  // AI Palette swatches
  drawPaletteStrip();
}

function drawBox() {
  noStroke(); fill('#ffffff'); rect(BOX.x, BOX.y, BOX.w, BOX.h);
  stroke('#111'); strokeWeight(1); noFill(); rect(BOX.x, BOX.y, BOX.w, BOX.h);
  noStroke(); fill('#111'); textSize(14); text('Canvas', BOX.x, BOX.y - 8);
}

/* ---------- AI palette ---------- */
function drawPaletteStrip() {
  if (!paletteColors.length) return;
  noStroke(); fill('#111'); textSize(12);

  for (let i = 0; i < paletteColors.length; i++) {
    const x = PALETTE.x + i * (PALETTE.sw + PALETTE.gap);
    const y = PALETTE.y;
    noStroke();
    fill(0, 0, 100); rect(x - 1, y - 1, PALETTE.sw + 2, PALETTE.sw + 2, 8); // border bg
    fill(paletteColors[i]); rect(x, y, PALETTE.sw, PALETTE.sw, 6);
  }
}

function swatchAt(mx, my) {
  if (!paletteColors.length) return null;
  for (let i = 0; i < paletteColors.length; i++) {
    const x = PALETTE.x + i * (PALETTE.sw + PALETTE.gap);
    const y = PALETTE.y;
    if (mx >= x && mx <= x + PALETTE.sw && my >= y && my <= y + PALETTE.sw) {
      return paletteColors[i];
    }
  }
  return null;
}

// Convert hex to H,S,B in current colorMode ranges (360,100,100)
function setFromHex(hex) {
  const { h, s, b } = hexToHSB(hex);
  H = h; S = s; B = b;
}

function hexToHSB(hex) {
  // parse #RRGGBB
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { h: H, s: S, b: B };

  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b8 = int & 255;

  // Convert to HSB 
  push();
  colorMode(RGB, 255);
  const c = color(r, g, b8);
  colorMode(HSB, 360, 100, 100);
  const out = {
    h: Math.round(hue(c)),
    s: Math.round(saturation(c)),
    b: Math.round(brightness(c))
  };
  pop();
  return out;
}

/* ---------- Save ---------- */
function saveCropped() {
  const img = get(BOX.x, BOX.y, BOX.w, BOX.h);
  img.save('drawing_cropped', 'png');
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

/* ---------- Button Styles ---------- */
function styleButton(btn, bg) {
  btn.style('background', bg);
  btn.style('color', '#fff');
  btn.style('border', 'none');
  btn.style('padding', '8px 12px');
  btn.style('border-radius', '8px');
  btn.style('font-size', '12px');
  btn.style('cursor', 'pointer');
}

/* ---------- Stroke picking for Erase Stroke ---------- */
function findStrokeAt(x, y) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (strokeHit(strokes[i], x, y)) return i;
  }
  return -1;
}
function strokeHit(s, px, py) {
  const pts = s.points;
  if (pts.length < 2) return false;
  const tol = Math.max(8, s.thickness / 2 + 4);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (pointSegDist(px, py, a.x, a.y, b.x, b.y) <= tol) return true;
  }
  return false;
}
function pointSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx*dx + dy*dy;
  if (len2 === 0) return dist(px, py, x1, y1);
  let t = ((px - x1)*dx + (py - y1)*dy) / len2;
  t = constrain(t, 0, 1);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return dist(px, py, cx, cy);
}

/* ---------- AI Art helper ---------- */
function addArtStrokes(art, opts = {}) {
  // Expect shape: { strokes: [{ points:[{x,y}], color:"#RRGGBB", thickness, opacity, eraser if there }] }
  if (!art || !Array.isArray(art.strokes)) return;

  // Fit inside BOX with padding
  const pad = 24;
  const target = {
    x: opts.x ?? (BOX.x + pad),
    y: opts.y ?? (BOX.y + pad),
    w: opts.w ?? (BOX.w - 2 * pad),
    h: opts.h ?? (BOX.h - 2 * pad),
  };

  // Bounds of incoming art
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const s of art.strokes) {
    for (const p of (s.points || [])) {
      minx = Math.min(minx, p.x); miny = Math.min(miny, p.y);
      maxx = Math.max(maxx, p.x); maxy = Math.max(maxy, p.y);
    }
  }
  if (!isFinite(minx) || !isFinite(miny) || !isFinite(maxx) || !isFinite(maxy)) return;

  const aw = Math.max(1, maxx - minx), ah = Math.max(1, maxy - miny);
  const sx = target.w / aw, sy = target.h / ah;
  const scale = Math.min(sx, sy);
  const ox = target.x + (target.w - aw * scale) / 2;
  const oy = target.y + (target.h - ah * scale) / 2;

  // Build Stroke instances
  for (const as of art.strokes) {
    const hex = as.color || '#000000';
    const { h, s, b } = hexToHSB(hex);
    const alpha = typeof as.opacity === 'number' ? as.opacity : 100;
    const thick = Math.max(1, Math.min(80, as.thickness || 4));
    const st = new Stroke(color(h, s, b, alpha), thick, alpha, !!as.eraser);

    for (const p of (as.points || [])) {
      const tx = ox + (p.x - minx) * scale;
      const ty = oy + (p.y - miny) * scale;
      st.add(tx, ty);
    }
    if (st.points.length >= 2) strokes.push(st);
  }
}
