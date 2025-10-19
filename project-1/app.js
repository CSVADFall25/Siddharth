/* App.js 
- Base application
*/

let strokes = [];
let currentStroke = null;

/* -------- Layout -------- */
const BOX = { x: 450, y: 64, w: 1100, h: 700 }; 

// Wheel + Brightness bar
const WHEEL = { cx: 190, cy: 150, r: 120 };
const BBAR  = { x: 330, y: 35, w: 18,  h: 224, r: 6 };

// Current color (HSB + Alpha)
let H = 16, S = 46, B = 100, A = 100; 

// Controls
let thickSlider, opacSlider, saveBtn, clearBtn;

// Offscreen color wheel
let gWheel;

// Tool mode
let toolMode = 'draw';
let drawBtn, eraseBtn, eraseStrokeBtn, changeColorBtn, vertexBtn, moveBtn;

// Vertex mode state
let selectedStrokeIdx = -1;
let selectedVertexIdx = -1;
let draggingVertex = false;
let vertSlider, vertSliderLabel;

// MOVE mode state
let movingStrokeIdx = -1;
let prevMouse = null;

// AI palette state
let paletteColors = [];
const PALETTE = { x: 40, y: 775, sw: 36, gap: 10, rows: 1 };

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
        let ang = degrees(Math.atan2(dy, dx));
        if (ang < 0) ang += 360;
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
    .position(40, 380)
    .style('font-size','14px').style('font-family','Arial').style('color','#111');
  thickSlider = createSlider(1, 40, 4, 1);
  thickSlider.position(40, 400).style('width','260px');

  createSpan('<b>Opacity:</b>')
    .position(40, 420)
    .style('font-size','14px').style('font-family','Arial').style('color','#111');
  opacSlider = createSlider(0, 100, 100, 1);
  opacSlider.position(40, 440).style('width','260px');
  opacSlider.input(() => { A = opacSlider.value(); });

  saveBtn = createButton('Save');
  saveBtn.position(275, 550);
  saveBtn.mousePressed(saveCropped);
  styleButton(saveBtn, '#2563EB');

  clearBtn = createButton('Clear');
  clearBtn.position(185, 550);
  clearBtn.mousePressed(() => {
    strokes = [];
    selectedStrokeIdx = -1; selectedVertexIdx = -1;
    movingStrokeIdx = -1; prevMouse = null;
  });
  styleButton(clearBtn, '#10B981');

  drawBtn = createButton('Draw');
  drawBtn.position(30, 510);
  drawBtn.mousePressed(() => setMode('draw'));
  styleButton(drawBtn, '#374151');

  eraseBtn = createButton('Erase');
  eraseBtn.position(30, 550);
  eraseBtn.mousePressed(() => setMode('erase'));
  styleButton(eraseBtn, '#F59E0B');

  eraseStrokeBtn = createButton('Delete');
  eraseStrokeBtn.position(100, 550);
  eraseStrokeBtn.mousePressed(() => setMode('eraseStroke'));
  styleButton(eraseStrokeBtn, '#EF4444');

  changeColorBtn = createButton('Change');
  changeColorBtn.position(100, 510);
  changeColorBtn.mousePressed(() => setMode('recolor'));
  styleButton(changeColorBtn, '#8B5CF6');

  vertexBtn = createButton('Vertex');
  vertexBtn.position(185, 510);
  vertexBtn.mousePressed(() => setMode('vertex'));
  styleButton(vertexBtn, '#0EA5E9');

  moveBtn = createButton('Move');
  moveBtn.position(265, 510);
  moveBtn.mousePressed(() => setMode('move'));
  styleButton(moveBtn, '#22C55E');

  // Vertex count slider 
  vertSliderLabel = createSpan('<b>Vertices:</b> (Vertex Mode Only)')
    .position(40, 460)
    .style('font-size','14px').style('font-family','Arial').style('color','#111');

  vertSlider = createSlider(2, 500, 50, 1);
  vertSlider.position(40, 480).style('width','260px');
  vertSlider.attribute('disabled', '');
  vertSlider.input(() => {
    if (toolMode !== 'vertex') return;
    const i = selectedStrokeIdx;
    if (i < 0 || i >= strokes.length) return;
    const targetN = vertSlider.value();
    strokes[i].points = resamplePoints(strokes[i].points, targetN);
  });

  if (window.AIPalette?.init) window.AIPalette.init({ x: 40, y: 680 });
  if (window.AIArt?.init) window.AIArt.init({ x: 40, y: 590 });

  window.addEventListener('ai-palette', (e) => {
    paletteColors = Array.isArray(e.detail?.colors) ? e.detail.colors : [];
  });
  window.addEventListener('ai-art', (e) => {
    try { addArtStrokes(e.detail); } catch (err) { console.error(err); }
  });

  setMode('draw');
}

function draw() {
  background('#ffffff');
  drawUIPanel();
  drawBox();

  for (const s of strokes) s.draw(this);
  if (currentStroke) currentStroke.draw(this);

  if (toolMode === 'vertex' && selectedStrokeIdx >= 0 && strokes[selectedStrokeIdx]) {
    drawVertexHandles(strokes[selectedStrokeIdx]);
  }
  if (toolMode === 'move' && movingStrokeIdx >= 0 && strokes[movingStrokeIdx]) {
    drawStrokeBounds(strokes[movingStrokeIdx]);
  }
}

/* ---------- Interaction ---------- */
function mousePressed() {
  if (inWheel(mouseX, mouseY)) { pickFromWheel(mouseX, mouseY); return; }
  if (inBBar(mouseX, mouseY)) { pickBrightness(mouseY); return; }
  const hex = swatchAt(mouseX, mouseY);
  if (hex) { setFromHex(hex); return; }

  if (!inBox(mouseX, mouseY)) return;

  // MOVE mode
  if (toolMode === 'move') {
    const idx = findStrokeAt(mouseX, mouseY);
    movingStrokeIdx = idx;
    prevMouse = (idx !== -1) ? { x: mouseX, y: mouseY } : null;
    return;
  }

  // VERTEX mode
  if (toolMode === 'vertex') {
    const idx = findStrokeAt(mouseX, mouseY);
    if (idx !== -1) {
      selectedStrokeIdx = idx;
      const s = strokes[idx];
      enableVertSliderFor(s);

      // Shift+Click: insert vertex into nearest segment (within tolerance)
      if (keyIsDown(SHIFT)) {
        const tol = vertexHitTolerance(s) + 6;
        const hit = closestSegmentProjection(s.points, mouseX, mouseY);
        if (hit && hit.dist <= tol) {
          // insert after segment start index
          const insertAt = hit.i + 1;
          s.points.splice(insertAt, 0, { x: clampToBoxX(hit.cx), y: clampToBoxY(hit.cy) });
          // update selection to new vertex and start dragging
          selectedVertexIdx = insertAt;
          draggingVertex = true;
          // refresh slider range/value
          enableVertSliderFor(s);
          return;
        }
      }

      // Otherwise: select nearest existing vertex if close
      selectedVertexIdx = getClosestVertexIndex(s.points, mouseX, mouseY, vertexHitTolerance(s));
      draggingVertex = (selectedVertexIdx !== -1);
    } else {
      selectedStrokeIdx = -1;
      selectedVertexIdx = -1;
      draggingVertex = false;
      disableVertSlider();
    }
    return;
  }

  // Recolor
  if (toolMode === 'recolor') {
    const idx = findStrokeAt(mouseX, mouseY);
    if (idx !== -1) {
      A = opacSlider.value();
      const s = strokes[idx];
      s.col = color(H, S, B, A);
      s.thickness = thickSlider.value();
      s.opacity = A;
      s.eraser = false;
    }
    return;
  }

  // Erase whole stroke
  if (toolMode === 'eraseStroke') {
    const idx = findStrokeAt(mouseX, mouseY);
    if (idx !== -1) strokes.splice(idx, 1);
    return;
  }

  // Draw / Erase brush
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
  if (inBBar(mouseX, mouseY)) { pickBrightness(mouseY); return; }

  // MOVE drag
  if (toolMode === 'move' && movingStrokeIdx >= 0) {
    const s = strokes[movingStrokeIdx];
    if (!s || !s.points.length) return;
    const dx = mouseX - prevMouse.x;
    const dy = mouseY - prevMouse.y;
    translateStrokeClamped(s, dx, dy, BOX);
    prevMouse = { x: mouseX, y: mouseY };
    return;
  }

  // Vertex drag
  if (toolMode === 'vertex' && draggingVertex && selectedStrokeIdx >= 0) {
    const s = strokes[selectedStrokeIdx];
    if (!s) return;
    if (selectedVertexIdx >= 0 && selectedVertexIdx < s.points.length) {
      s.points[selectedVertexIdx].x = clampToBoxX(mouseX);
      s.points[selectedVertexIdx].y = clampToBoxY(mouseY);
    }
    return;
  }

  // Freehand
  if (currentStroke && inBox(mouseX, mouseY)) currentStroke.add(mouseX, mouseY);
}

function mouseReleased() {
  if (toolMode === 'move') {
    movingStrokeIdx = -1;
    prevMouse = null;
    return;
  }
  if (toolMode === 'vertex') {
    draggingVertex = false;
    return;
  }
  if (currentStroke) {
    if (currentStroke.points.length >= 2) strokes.push(currentStroke);
    currentStroke = null;
  }
}

/* ---- Delete/Backspace to remove selected vertex (Vertex mode) ---- */
function keyPressed() {
  if (toolMode === 'vertex' && selectedStrokeIdx >= 0) {
    if (keyCode === DELETE || keyCode === BACKSPACE) {
      const s = strokes[selectedStrokeIdx];
      if (!s) return;
      if (selectedVertexIdx >= 0 && s.points.length > 2) {
        s.points.splice(selectedVertexIdx, 1);
        // shift selection to a valid neighbor
        selectedVertexIdx = Math.min(selectedVertexIdx, s.points.length - 1);
        enableVertSliderFor(s);
      }
      // prevent browser back nav on Backspace
      return false;
    }
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
  let ang = degrees(Math.atan2(dy, dx));
  if (ang < 0) ang += 360;
  const r = Math.min(WHEEL.r, Math.hypot(dx, dy));
  H = ang;
  S = Math.round(map(r, 0, WHEEL.r, 0, 100, true));
}
function pickBrightness(my) {
  B = Math.round(map(constrain(my, BBAR.y, BBAR.y + BBAR.h), BBAR.y + BBAR.h, BBAR.y, 0, 100));
}

/* ---------- Rendering ---------- */
function drawUIPanel() {
  noStroke();
  fill('#ffffff');
  rect(0, 0, BOX.x - 40, height);
  stroke('#111');
  strokeWeight(1);
  line(BOX.x - 40, 0, BOX.x - 40, height);

  noStroke();
  fill('#111');
  textSize(16);
  textStyle(BOLD);
  text('Tools', 40, 34);

  imageMode(CENTER);
  image(gWheel, WHEEL.cx, WHEEL.cy);

  const r = map(S, 0, 100, 0, WHEEL.r);
  const a = radians(H);
  const px = WHEEL.cx + r * cos(a);
  const py = WHEEL.cy + r * sin(a);
  push();
  translate(px, py);
  noStroke();
  fill(H, S, max(40, B), A);
  circle(0, 0, 14);
  stroke('#111');
  noFill();
  circle(0, 0, 14);
  pop();

  noFill();
  strokeWeight(1);
  for (let i = 0; i < BBAR.h; i++) {
    const t = 1 - i / (BBAR.h - 1);
    const bri = t * 100;
    stroke(H, S, bri);
    line(BBAR.x, BBAR.y + i, BBAR.x + BBAR.w, BBAR.y + i);
  }
  noFill();
  stroke('#111');
  rect(BBAR.x, BBAR.y, BBAR.w, BBAR.h, BBAR.r);

  const yPos = map(B, 0, 100, BBAR.y + BBAR.h, BBAR.y);
  fill('#ffffff');
  stroke('#111');
  rect(BBAR.x - 7, yPos - 8, BBAR.w + 14, 16, 8);

  const swY = WHEEL.cy + WHEEL.r + 28;
  noStroke();
  fill(H, S, B, A);
  rect(40, swY, 260, 28, 8);
  stroke('#111');
  noFill();
  rect(40, swY, 260, 28, 8);

  const c = color(H, S, B, A);
  const R = Math.round(red(c)), G = Math.round(green(c)), Bl = Math.round(blue(c));
  const alpha255 = Math.round(map(A, 0, 100, 0, 255));
  noStroke();
  fill('#111');
  textSize(12);
  textStyle(NORMAL);
  const y1 = swY + 46, y2 = y1 + 20;
  text(`Hue: ${Math.round(H)}°`, 40, y1);
  text(`Sat: ${Math.round(S)}%`, 100, y1);
  text(`Bri: ${Math.round(B)}%`, 165, y1);
  text(`Red: ${R}`, 40, y2);
  text(`Green: ${G}`, 100, y2);
  text(`Blue: ${Bl}`, 165, y2);
  text(`Alpha: ${alpha255}`, 220, y2);

  drawPaletteStrip();
}

function drawBox() {
  noStroke();
  fill('#ffffff');
  rect(BOX.x, BOX.y, BOX.w, BOX.h);
  stroke('#111');
  strokeWeight(1);
  noFill();
  rect(BOX.x, BOX.y, BOX.w, BOX.h);
  noStroke();
  fill('#111');
  textSize(14);
  text('Canvas', BOX.x, BOX.y - 8);
}

/* ---------- AI palette ---------- */
function drawPaletteStrip() {
  if (!paletteColors.length) return;
  noStroke();
  fill('#111');
  textSize(12);
  for (let i = 0; i < paletteColors.length; i++) {
    const x = PALETTE.x + i * (PALETTE.sw + PALETTE.gap);
    const y = PALETTE.y;
    noStroke();
    fill(0, 0, 100);
    rect(x - 1, y - 1, PALETTE.sw + 2, PALETTE.sw + 2, 8);
    fill(paletteColors[i]);
    rect(x, y, PALETTE.sw, PALETTE.sw, 6);
  }
}
function swatchAt(mx, my) {
  if (!paletteColors.length) return null;
  for (let i = 0; i < paletteColors.length; i++) {
    const x = PALETTE.x + i * (PALETTE.sw + PALETTE.gap);
    const y = PALETTE.y;
    if (mx >= x && mx <= x + PALETTE.sw && my >= y && my <= y + PALETTE.sw) return paletteColors[i];
  }
  return null;
}
function setFromHex(hex) {
  const { h, s, b } = hexToHSB(hex);
  H = h; S = s; B = b;
}
function hexToHSB(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { h: H, s: S, b: B };
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255, g = (int >> 8) & 255, b8 = int & 255;
  push(); colorMode(RGB, 255); const c = color(r, g, b8);
  colorMode(HSB, 360, 100, 100);
  const out = { h: Math.round(hue(c)), s: Math.round(saturation(c)), b: Math.round(brightness(c)) };
  pop(); return out;
}

/* ---------- Save ---------- */
function saveCropped() {
  const img = get(BOX.x, BOX.y, BOX.w, BOX.h);
  img.save('drawing_cropped', 'png');
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

/* ---------- Button Styles & Mode Helpers ---------- */
function styleButton(btn, bg) {
  btn.style('background', bg);
  btn.style('color', '#fff');
  btn.style('border', 'none');
  btn.style('padding', '8px 12px');
  btn.style('border-radius', '8px');
  btn.style('font-size', '12px');
  btn.style('cursor', 'pointer');
}
function setMode(mode) {
  toolMode = mode;
  const all = [drawBtn, eraseBtn, eraseStrokeBtn, changeColorBtn, vertexBtn, moveBtn];
  for (const b of all) b && b.style('box-shadow', 'none');
  const mapBtn = {
    draw: drawBtn, erase: eraseBtn, eraseStroke: eraseStrokeBtn, recolor: changeColorBtn,
    vertex: vertexBtn, move: moveBtn
  };
  const active = mapBtn[mode];
  if (active) active.style('box-shadow', '0 0 0 3px rgba(17,24,39,.25)');

  if (mode !== 'vertex') {
    draggingVertex = false;
    disableVertSlider();
  } else if (selectedStrokeIdx >= 0 && strokes[selectedStrokeIdx]) {
    enableVertSliderFor(strokes[selectedStrokeIdx]);
  }

  if (mode !== 'move') {
    movingStrokeIdx = -1;
    prevMouse = null;
  }
}

/* ---------- Stroke picking ---------- */
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
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return dist(px, py, cx, cy);
}

/* ---------- Vertex helpers ---------- */
function vertexHitTolerance(s) {
  return Math.max(10, s.thickness / 2 + 6);
}
function getClosestVertexIndex(points, x, y, tol) {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = dist(x, y, points[i].x, points[i].y);
    if (d < bestD && d <= tol) { bestD = d; best = i; }
  }
  return best;
}
function drawVertexHandles(s) {
  noFill(); stroke(0, 0, 20, 60); strokeWeight(1);
  beginShape(); for (const pt of s.points) vertex(pt.x, pt.y); endShape();
  for (let i = 0; i < s.points.length; i++) {
    const pt = s.points[i];
    stroke('#111'); noFill(); circle(pt.x, pt.y, 10);
    noStroke(); fill(i === selectedVertexIdx ? '#3B82F6' : '#0EA5E9'); circle(pt.x, pt.y, 6);
  }
}

// Find closest segment and projection
function closestSegmentProjection(points, x, y) {
  if (!points || points.length < 2) return null;
  let best = null;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i+1];
    const { dist: d, cx, cy, t } = segProjection(x, y, p0.x, p0.y, p1.x, p1.y);
    if (best === null || d < best.dist) best = { i, dist: d, cx, cy, t };
  }
  return best;
}
function segProjection(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx*dx + dy*dy || 1e-9;
  let t = ((px - x1)*dx + (py - y1)*dy) / len2;
  t = constrain(t, 0, 1);
  const cx = x1 + t * dx, cy = y1 + t * dy;
  const d = dist(px, py, cx, cy);
  return { dist: d, cx, cy, t };
}
function clampToBoxX(x) { return constrain(x, BOX.x, BOX.x + BOX.w); }
function clampToBoxY(y) { return constrain(y, BOX.y, BOX.y + BOX.h); }

// Resample to N points along arc length
function resamplePoints(points, N) {
  if (!Array.isArray(points) || points.length < 2) return points ? points.slice() : [];
  N = Math.max(2, Math.floor(N));
  const L = [0];
  for (let i = 1; i < points.length; i++) {
    L.push(L[i-1] + dist(points[i-1].x, points[i-1].y, points[i].x, points[i].y));
  }
  const total = L[L.length - 1];
  if (total === 0) return Array(N).fill({ ...points[0] });
  const out = [];
  for (let k = 0; k < N; k++) {
    const t = (k / (N - 1)) * total;
    let j = 1; while (j < L.length && L[j] < t) j++;
    const i = Math.max(1, j), t0 = L[i - 1], t1 = L[i], seg = t1 - t0 || 1e-9;
    const u = (t - t0) / seg, p0 = points[i - 1], p1 = points[i];
    out.push({ x: lerp(p0.x, p1.x, u), y: lerp(p0.y, p1.y, u) });
  }
  return out;
}
function enableVertSliderFor(s) {
  const n = Math.max(2, s.points.length);
  vertSlider.removeAttribute('disabled');
  vertSlider.elt.min = 2;
  vertSlider.elt.max = Math.max(2, Math.min(500, n * 2));
  vertSlider.value(n);
  vertSliderLabel.html('<b>Vertices:</b>');
}
function disableVertSlider() {
  vertSlider.attribute('disabled', '');
  vertSliderLabel.html('<b>Vertices:</b> (Vertex Mode Only)');
}

/* ---------- MOVE helpers ---------- */
function boundsOf(points) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of points) {
    minx = Math.min(minx, p.x); miny = Math.min(miny, p.y);
    maxx = Math.max(maxx, p.x); maxy = Math.max(maxy, p.y);
  }
  return { minx, miny, maxx, maxy, w: maxx - minx, h: maxy - miny };
}
function translateStrokeClamped(s, dx, dy, box) {
  if (!dx && !dy) return;
  const b = boundsOf(s.points);
  if (b.minx + dx < box.x) dx = box.x - b.minx;
  if (b.maxx + dx > box.x + box.w) dx = box.x + box.w - b.maxx;
  if (b.miny + dy < box.y) dy = box.y - b.miny;
  if (b.maxy + dy > box.y + box.h) dy = box.y + box.h - b.maxy;
  for (const p of s.points) { p.x += dx; p.y += dy; }
}
function drawStrokeBounds(s) {
  const b = boundsOf(s.points);
  noFill();
  stroke('#22C55E');
  strokeWeight(1.5);
  rect(b.minx, b.miny, b.w, b.h);
}

/* ---------- AI Art helper ---------- */
function addArtStrokes(art, opts = {}) {
  if (!art || !Array.isArray(art.strokes)) return;
  const pad = 24;
  const target = {
    x: opts.x ?? (BOX.x + pad),
    y: opts.y ?? (BOX.y + pad),
    w: opts.w ?? (BOX.w - 2 * pad),
    h: opts.h ?? (BOX.h - 2 * pad),
  };
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
