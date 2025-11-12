/* app.js
   Black-background UI: title, handle, right dashboard, left 3D word map + neighbors, and bottom chart.
*/

let instagramLogo;
const instagramLink = "https://www.instagram.com/siddharthchattoraj/";
let isHovering = false;

// fonts
let uiFont;
const EMOJI_FONT_STACK = "'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji','EmojiOne Color','Twemoji','Segoe UI Symbol',sans-serif";

// tables
let msgTable;
let uniT, biT, triT, emoT;
let uniH, biH, triH, emoH;

// chart state
let labels = [];
let keys = [];
let counts = [];
let totalCount = 0;
let selectedKey = null;
let barRects = [];
let tooltipG;

let dayFirstDate = null;
let dayLastDate = null;
let dayMonthFirstIdx = new Map();

// modes
const MODES = ["day","month","year","hour"];
let timeMode = "year";
let modeTabs = [];
let overallButtonRect = null;

// layout pads
const MARGIN = 20;
const LEFT_PAD = 40, RIGHT_PAD = 45;
const TOP_PAD = 12, BOTTOM_PAD = 50;

// dashboard rect
let dashBounds = { x: 0, y: 0, w: 0, h: 0 };
let dashArrows = [];

// word-map globals (kept for interop with your word-map file)
let w2vTable = null;
let w2vData = [];
let w2vBaseData = [];
let w2vProj = [];
let w2vByDate = null;
let w2vByMonth = null;
let w2vByYear = null;
let w2vByHour = null;
let w2vBounds = { x: 0, y: 0, w: 0, h: 0 };
let w2vCenter = { x: 0, y: 0 };
// clickable label hitboxes for word2vec (filled each frame by word2vec.js)
let w2vLabelBoxes = [];

// camera + interaction
let w2vYaw = 0.35, w2vPitch = -0.2, w2vZoom = 5.3;
let w2vDragging = false, w2vLastX = 0, w2vLastY = 0;
let w2vHovered = null, w2vSelected = null;

// search + extents
let w2vQuery = '';
let w2vSearchEl = null;
let w2vExtents = { minX:0, maxX:0, minY:0, maxY:0, minZ:0, maxZ:0, scale:1 };

// scope
let w2vScope = "global"; // 'global' | 'scoped'
let w2vScopeButtons = [];

// neighbors UI state
let w2vK = 10;

// guard the metric so it’s not redeclared if defined elsewhere
(function () {
  if (typeof window.w2vMetric === 'undefined') window.w2vMetric = 'cosine'; 
  if (typeof window.w2vMetricEl === 'undefined') window.w2vMetricEl = null;
  if (typeof window.w2vNeighborsMetricCached === 'undefined') window.w2vNeighborsMetricCached = null;
})();
let w2vNeighbors = [];
let w2vNeighborAnchor = null;
let w2vNeighborsDirty = true;
let w2vNeighborsSliderEl = null;
let w2vMetricRadiosEl = null;
let w2vNoData = false;
let w2vNeighborSort = 'distance'; // or 'size'

// fixed month series start (if needed elsewhere)
const MONTH_SERIES_START = { year: 2017, month: 11 };

// assets
function preload() {
  instagramLogo = loadImage('fonts/instagram_logo.png');
  uiFont = loadFont('fonts/Instagram Sans.ttf');

  msgTable = loadTable('data/cleaned_messages.csv', 'csv', 'header');

  uniT = loadTable('data/unigram_counts.csv', 'csv', 'header');
  biT  = loadTable('data/bigram_counts.csv',  'csv', 'header');
  triT = loadTable('data/trigram_counts.csv', 'csv', 'header');
  emoT = loadTable('data/emoji_counts.csv',   'csv', 'header');

  uniH = loadTable('data/unigram_counts_hour.csv', 'csv', 'header');
  biH  = loadTable('data/bigram_counts_hour.csv',  'csv', 'header');
  triH = loadTable('data/trigram_counts_hour.csv', 'csv', 'header');
  emoH = loadTable('data/emoji_counts_hour.csv',   'csv', 'header');

  // 3D word map tables
  w2vTable  = loadTable('data/word2vec_3d.csv',            'csv', 'header');
  w2vByDate = safeLoadTable('data/word2vec_3d_by_date.csv');
  w2vByMonth= safeLoadTable('data/word2vec_3d_by_month.csv');
  w2vByYear = safeLoadTable('data/word2vec_3d_by_year.csv');
  w2vByHour = safeLoadTable('data/word2vec_3d_by_hour.csv');
}

function safeLoadTable(path) {
  try { return loadTable(path, 'csv', 'header'); }
  catch(e) { return null; }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  textFont(uiFont);

  tooltipG = createGraphics(width, height);
  tooltipG.textFont(uiFont);

  if (w2vTable) w2vBaseData = normalizeWord2VecTable(w2vTable);
  updateWord2VecData();

  // precompute first/last day for daily domain
  const allDays = [];
  for (let r = 0; r < msgTable.getRowCount(); r++) {
    const dt = msgTable.getString(r, 'datetime');
    const short = toShortUS(dt);
    if (short) allDays.push(short);
  }
  if (allDays.length) {
    allDays.sort(compareDates);
    dayFirstDate = allDays[0];
    dayLastDate  = allDays[allDays.length - 1];
  }

  if (typeof recomputeBars === 'function') recomputeBars();
  updateWord2VecData();
}

function draw() {
  background(0);

  // title gradient
  const lightenColor = (hex, percent) => {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    r = Math.round(r + (255 - r) * percent);
    g = Math.round(g + (255 - g) * percent);
    b = Math.round(b + (255 - b) * percent);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const titleGradient = drawingContext.createLinearGradient(0, 0, width, 0);
  titleGradient.addColorStop(0.00, '#F58529');
  titleGradient.addColorStop(0.25, '#FEDA77');
  titleGradient.addColorStop(0.50, '#DD2A7B');
  titleGradient.addColorStop(0.75, '#8134AF');
  titleGradient.addColorStop(1.00, '#515BD4');
  drawingContext.fillStyle = titleGradient;

  const titleText = "Siddharth Chattoraj’s Sent Instagram DMs";
  const titleSize = width * 0.05;
  drawingContext.font = `${titleSize}px Billabong, cursive`;
  drawingContext.textAlign = "center";
  drawingContext.textBaseline = "middle";
  drawingContext.fillText(titleText, width / 2, height * 0.075);

  // handle + logo
  const handleText = "@siddharthchattoraj";
  const handleSize = width * 0.0125;
  drawingContext.font = `${handleSize}px 'Instagram Sans', sans-serif`;
  drawingContext.textAlign = "right";
  drawingContext.textBaseline = "top";

  const handleTextWidth = drawingContext.measureText(handleText).width;
  const handleY = MARGIN;
  const logoHeight = handleSize * 1.5;
  const logoAspectRatio = instagramLogo ? (instagramLogo.width / instagramLogo.height) : 1;
  const logoWidth = logoHeight * logoAspectRatio;
  const totalWidth = handleTextWidth + logoWidth + 20;

  const isHoveringNow =
    mouseX >= width - MARGIN * 2 - totalWidth &&
    mouseX <= width &&
    mouseY >= handleY &&
    mouseY <= handleY + logoHeight;

  const handleGradient = drawingContext.createLinearGradient(
    width - MARGIN * 2 - handleTextWidth, 0, width - MARGIN * 2, 0
  );
  if (isHoveringNow) {
    handleGradient.addColorStop(0.00, lightenColor('#F58529', 0.4));
    handleGradient.addColorStop(0.25, lightenColor('#FEDA77', 0.4));
    handleGradient.addColorStop(0.50, lightenColor('#DD2A7B', 0.4));
    handleGradient.addColorStop(0.75, lightenColor('#8134AF', 0.4));
    handleGradient.addColorStop(1.00, lightenColor('#515BD4', 0.4));
  } else {
    handleGradient.addColorStop(0.00, '#F58529');
    handleGradient.addColorStop(0.25, '#FEDA77');
    handleGradient.addColorStop(0.50, '#DD2A7B');
    handleGradient.addColorStop(0.75, '#8134AF');
    handleGradient.addColorStop(1.00, '#515BD4');
  }
  drawingContext.fillStyle = handleGradient;
  drawingContext.fillText(handleText, width - MARGIN * 2, handleY);

  if (instagramLogo) {
    imageMode(CORNER);
    if (isHoveringNow) drawingContext.filter = 'brightness(1.15)';
    image(instagramLogo, width - MARGIN * 2 + 3, handleY - 6, logoWidth, logoHeight);
    drawingContext.filter = 'none';
  }
  isHovering = isHoveringNow;
  cursor(isHovering ? 'pointer' : 'default');

  // mode tabs
  drawModeTabs();

  // dashboard layout
  if (typeof layoutDashboardBounds === 'function') layoutDashboardBounds();

  // 3D word map (left mid): uses your existing word-map file functions
  layoutWord2VecBounds();
  drawWord2VecPanel();
  ensureW2VSearchInput();
  if (typeof drawDashboard === 'function') drawDashboard();

  // bottom chart
  if (typeof drawChartXOnly === 'function') drawChartXOnly();
}

// clicks / input
function mousePressed() {
  if (isHovering) { window.open(instagramLink, "_blank"); return; }

  // clear selection button
  if (overallButtonRect &&
      mouseX >= overallButtonRect.x && mouseX <= overallButtonRect.x + overallButtonRect.w &&
      mouseY >= overallButtonRect.y && mouseY <= overallButtonRect.y + overallButtonRect.h) {
    selectedKey = null;
    w2vScope = 'global';
    w2vSelected = null;
    w2vNeighborAnchor = null;
    w2vNeighbors = [];
    w2vHovered = null;
    updateWord2VecData();
    return;
  }

  // mode switching
  for (const t of modeTabs) {
    if (mouseX >= t.x && mouseX <= t.x + t.w && mouseY >= t.y && mouseY <= t.y + t.h) {
      if (timeMode !== t.mode) {
        timeMode = t.mode;
        selectedKey = null;
        w2vScope = 'global';
        if (typeof recomputeBars === 'function') recomputeBars();
        updateWord2VecData();
      }
      return;
    }
  }

  // dashboard arrows
  for (const a of dashArrows) {
    if (mouseX >= a.x && mouseX <= a.x + a.w && mouseY >= a.y && mouseY <= a.y + a.h) {
      if (typeof nudgeSelection === 'function') nudgeSelection(a.dir);
      w2vScope = (selectedKey !== null) ? 'scoped' : 'global';
      updateWord2VecData();
      return;
    }
  }

  // chart click selects nearest key
  if (barRects && barRects.length) {
    const chartTop = height * 0.68;
    const chartBottom = height - BOTTOM_PAD;
    if (mouseY >= chartTop && mouseY <= chartBottom) {
      let nearest = null, best = Infinity;
      for (let br of barRects) {
        const cx = br.x + br.w / 2;
        const d = Math.abs(mouseX - cx);
        if (d < best) { best = d; nearest = br; }
      }
      if (nearest) {
        selectedKey = (selectedKey === nearest.key) ? null : nearest.key;
        w2vScope = (selectedKey !== null) ? 'scoped' : 'global';
        updateWord2VecData();
        return;
      }
    }
  }

  // word-map click
  if (pointInRect(mouseX, mouseY, w2vBounds)) {
    // First, allow clicking on label backgrounds to act like clicking the point
    if (Array.isArray(w2vLabelBoxes) && w2vLabelBoxes.length) {
      for (let i = w2vLabelBoxes.length - 1; i >= 0; i--) {
        const b = w2vLabelBoxes[i];
        if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
          if (b.word) {
            w2vSelected = b.word;
            w2vNeighborAnchor = w2vSelected;
            w2vNeighborSort = 'distance';
            w2vNeighborsDirty = true;
            // begin drag after selection just like normal clicks
            w2vDragging = true;
            w2vLastX = mouseX;
            w2vLastY = mouseY;
            return;
          }
        }
      }
    }

    if (w2vHovered && w2vHovered.word) {
      w2vSelected = w2vHovered.word;
      w2vNeighborAnchor = w2vSelected;
      w2vNeighborSort = 'distance';
      w2vNeighborsDirty = true;
    } else {
      w2vSelected = null;
      w2vNeighborAnchor = null;
      w2vNeighbors = [];
    }
    w2vDragging = true;
    w2vLastX = mouseX;
    w2vLastY = mouseY;
    return;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  tooltipG = createGraphics(width, height);
  tooltipG.textFont(uiFont);
  ensureW2VSearchInput(true);
}

function mouseReleased() { w2vDragging = false; }

function mouseDragged() {
  if (w2vDragging && pointInRect(mouseX, mouseY, w2vBounds)) {
    const dx = mouseX - w2vLastX;
    const dy = mouseY - w2vLastY;
    w2vYaw += dx * 0.005;
    w2vPitch = constrain(w2vPitch + dy * 0.005, -1.2, 1.2);
    w2vLastX = mouseX;
    w2vLastY = mouseY;
  }
}

function mouseWheel(event) {
  if (pointInRect(mouseX, mouseY, w2vBounds)) {
    const delta = (event && event.delta) ? event.delta : 0;
    const factor = Math.pow(1.05, delta > 0 ? 1 : -1);
    // allow deeper zoom-in by raising the upper bound
    w2vZoom = constrain(w2vZoom * factor, 0.5, 60.0);
    return false;
  }
}

// Keyboard: allow Enter/Return to select hovered or search match (word2vec)
function keyPressed() {
  const ae = (typeof document !== 'undefined') ? document.activeElement : null;
  const isInputFocused = !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));

  if (keyCode === ENTER) {
    if (isInputFocused) return;

    if (w2vHovered && w2vHovered.word) {
      // select the hovered word
      w2vSelected = w2vHovered.word;
      w2vNeighborAnchor = w2vSelected;
      w2vNeighborSort = 'distance';
      w2vNeighborsDirty = true;
    } else {
      // fallback to current search query
      const q = (w2vQuery || '').trim().toLowerCase();
      if (q.length && Array.isArray(w2vData) && w2vData.length) {
        const exact = w2vData.find(p => (p.word || '').toLowerCase() === q);
        const first = exact || w2vData.find(p => (p.word || '').toLowerCase().includes(q));
        if (first) {
          w2vSelected = first.word;
          w2vNeighborAnchor = first.word;
          // when search-driven, match the behavior in the search input handler
          w2vNeighborSort = 'size';
          w2vNeighborsDirty = true;
        }
      }
    }
  }

  if (key === 'Escape') {
    if (isInputFocused) { try { ae.blur(); } catch (e) {} return; }
    // clear selection on escape
    w2vSelected = null;
    w2vNeighborAnchor = null;
    w2vNeighbors = [];
    w2vHovered = null;
  }
}

// mode tabs
function drawModeTabs() {
  modeTabs = [];
  const names = ["Day", "Month", "Year", "Hour"];
  const modes = ["day","month","year","hour"];
  const spacing = 8;
  const paddingX = 10, radius = 10;

  let x = 8, y = TOP_PAD + 8;

  textFont(uiFont || 'sans-serif');
  textSize(12);
  textAlign(LEFT, CENTER);
  let anyHover = false;

  for (let i = 0; i < names.length; i++) {
    const txt = names[i];
    const w = textWidth(txt) + paddingX * 2;
    const h = 26;

    const isActive = (timeMode === modes[i]);
    const isHover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
    if (isHover) anyHover = true;

    const alpha = isActive ? 220 : (isHover ? 120 : 60);
    noStroke();
    fill(81, 91, 212, alpha);
    rect(x, y, w, h, radius);

    if (isActive) {
      stroke(255, 140);
      noFill();
      rect(x + 0.5, y + 0.5, w - 1, h - 1, radius);
      noStroke();
    }

    fill(255);
    text(txt, x + paddingX, y + h / 2);

    modeTabs.push({ mode: modes[i], x, y, w, h });

    x += w + spacing;
  }

  const overallTxt = 'Overall';
  const overallW = textWidth(overallTxt) + paddingX * 2;
  const overallH = 26;
  const oy = y;
  const overallHover = mouseX >= x && mouseX <= x + overallW && mouseY >= oy && mouseY <= oy + overallH;
  if (overallHover) anyHover = true;
  const overallAlpha = overallHover ? 140 : 80;
  noStroke();
  fill(81, 91, 212, overallAlpha);
  rect(x, oy, overallW, overallH, radius);
  fill(255);
  text(overallTxt, x + paddingX, oy + overallH / 2);
  overallButtonRect = { x, y: oy, w: overallW, h: overallH };

  if (anyHover) cursor('pointer');
}

// date + misc helpers
function toShortUS(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d)) return null;
  const mm = nf(d.getMonth()+1, 2);
  const dd = nf(d.getDate(), 2);
  const yy = String(d.getFullYear()).slice(2);
  return `${mm}/${dd}/${yy}`;
}
function toMonthKey(raw) {
  const d = new Date(raw);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = d.getMonth()+1;
  return monthKey(y, m);
}
function toYearKey(raw) {
  const d = new Date(raw);
  if (isNaN(d)) return null;
  return String(d.getFullYear());
}
function dateFromShortUS(str) {
  const {year, month, day} = parseShortUS(str);
  return new Date(year, month - 1, day);
}
function formatShortUSFromDate(d) {
  const mm = nf(d.getMonth() + 1, 2);
  const dd = nf(d.getDate(), 2);
  const yy = String(d.getFullYear()).slice(2);
  return `${mm}/${dd}/${yy}`;
}
function addDays(d, days) { const nd = new Date(d); nd.setDate(nd.getDate() + (days || 1)); return nd; }
function parseShortUS(str) {
  const [mStr,dStr,yStr] = (str||'').split('/');
  let m = parseInt(mStr), d = parseInt(dStr), y = parseInt(yStr);
  if (y < 100) y = 2000 + y;
  return {year: y, month: m, day: d};
}
function compareDates(aStr, bStr) {
  const a = parseShortUS(aStr), b = parseShortUS(bStr);
  if (a.year !== b.year)  return a.year  < b.year  ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day)    return a.day   < b.day   ? -1 : 1;
  return 0;
}
function monthKey(y, m) { const mm = (m<10? '0':'') + m; return `${y}-${mm}`; }
function splitMonthKey(mk) { const y = int(mk.slice(0,4)); const m = int(mk.slice(5,7)); return {year: y, month: m}; }
function monthAbbr(m) { return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1] || 'Mon'; }
function containsEmoji(str) {
  if (!str) return false;
  try { return /\p{Extended_Pictographic}/u.test(str); }
  catch(e) { return /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}]/u.test(str); }
}
const URL_REGEX = /(https?:\/\/\S+|www\.\S+)/gi;
const EDGE_PUNCT_REGEX = /(^[^\w']+|[^\w']+$)/g;
function cleanForNgrams(text){
  if (!text || typeof text !== 'string') return '';
  let t = text.toLowerCase();
  t = t.replace(URL_REGEX, '');
  const tokens = t.split(/\s+/).map(tok => tok.replace(EDGE_PUNCT_REGEX, '')).filter(Boolean);
  return tokens.join(' ');
}
