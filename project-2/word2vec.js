/*
  word2vec.js
  3D word plot with search and a neighbor list. Uses existing globals and renders on a dark canvas.
  Inspired by https://projector.tensorflow.org/.
*/

// Layout
function layoutWord2VecBounds() {
  const topEdge = height * 0.16;
  const bottomEdge = height * 0.64;
  const gapPx = 0;
  const leftBase = (typeof LEFT_PAD !== 'undefined') ? LEFT_PAD : 60;

  // stronger left nudge than before
  const leftEdge = Math.max(8, leftBase - 240);

  const rightEdge = (typeof dashBounds !== 'undefined' ? dashBounds.x : width * 0.6) - gapPx;

  w2vBounds.x = leftEdge;
  w2vBounds.y = topEdge;
  w2vBounds.w = Math.max(160, rightEdge - leftEdge);
  w2vBounds.h = Math.max(160, bottomEdge - topEdge);

  w2vCenter.x = w2vBounds.x + w2vBounds.w / 2;
  w2vCenter.y = w2vBounds.y + w2vBounds.h / 2;
}

// Draws the 3D plot and handles hover/selection and labels
function drawWord2VecPanel() {
  const padPx = 10;
  const fontSafe = uiFont || 'sans-serif';
  if (typeof window !== 'undefined' && typeof window.w2vLastSelected === 'undefined') window.w2vLastSelected = null;
  if (typeof window !== 'undefined' && typeof window.w2vQueryAtSelection === 'undefined') window.w2vQueryAtSelection = '';

  // reset label hitboxes each frame
  if (typeof w2vLabelBoxes !== 'undefined') w2vLabelBoxes.length = 0;

  // title + help
  textFont(fontSafe);
  textSize(16);
  textAlign(LEFT, TOP);
  fill(255);
  text('Word2Vec Embedding Space', w2vBounds.x + padPx, w2vBounds.y + padPx);

  textSize(11);
  fill(220);
  text('Drag to rotate • Scroll to zoom • Click to select', w2vBounds.x + padPx, w2vBounds.y + padPx + 18);
  // additional subtitle for context
  textSize(11);
  fill(200);
  text('Closer terms represent words used in more similar contexts.', w2vBounds.x + padPx, w2vBounds.y + padPx + 34);

  // plot rect
  const plotX = w2vBounds.x + padPx;
  const headerH = 54; 
  const plotY = w2vBounds.y + padPx + headerH;
  const plotW = w2vBounds.w - padPx * 2;
  const plotH = w2vBounds.h - (padPx * 2 + headerH);

  // camera + axes
  const camDist = 3.0;
  const cx = plotX + plotW / 2;
  const cy = plotY + plotH / 2;

  stroke(255, 40);
  strokeWeight(1);
  const axisLen = Math.min(plotW, plotH) * 0.35;
  const axes3d = [
    { v: [1, 0, 0], c: color(245, 133, 41) },  // x
    { v: [0, 1, 0], c: color(129, 52, 175) },  // y
    { v: [0, 0, 1], c: color(221, 42, 123) },  // z
  ];
  for (const a of axes3d) {
    const r0 = project3([0, 0, 0], w2vYaw, w2vPitch, camDist, w2vZoom, cx, cy, axisLen);
    const r1 = project3([a.v[0], a.v[1], a.v[2]], w2vYaw, w2vPitch, camDist, w2vZoom, cx, cy, axisLen);
    stroke(a.c);
    line(r0.sx, r0.sy, r1.sx, r1.sy);
  }

  // points
  w2vProj = [];

  if (w2vData && w2vData.length) {
    const pointScale = Math.min(plotW, plotH) * 0.42;

    for (let i = 0; i < w2vData.length; i++) {
      const p = w2vData[i];
      const pr = project3([p.nx, p.ny, p.nz], w2vYaw, w2vPitch, camDist, w2vZoom, cx, cy, pointScale);
      w2vProj.push({ sx: pr.sx, sy: pr.sy, sz: pr.sz, word: p.word, freq: p.freq, nx: p.nx, ny: p.ny, nz: p.nz });
    }

    // back-to-front
    w2vProj.sort((a, b) => a.sz - b.sz);

    // hover within plot area; when searching, prefer matching words for hover/selection
    w2vHovered = null;
    if (pointInRect(mouseX, mouseY, { x: plotX, y: plotY, w: plotW, h: plotH })) {
      let bestD = 18;
      const qRaw = (w2vQuery || '').trim();
      const qLower = qRaw.toLowerCase();
      const consider = (arr) => {
        let found = false;
        for (let i = arr.length - 1; i >= 0; i--) {
          const pt = arr[i];
          const d = dist(mouseX, mouseY, pt.sx, pt.sy);
          if (d < bestD) { bestD = d; w2vHovered = pt; found = true; }
        }
        return found;
      };
      if (qLower.length > 0) {
        const matches = [];
        for (let i = 0; i < w2vProj.length; i++) {
          const pt = w2vProj[i];
          if ((pt.word || '').toLowerCase().includes(qLower)) matches.push(pt);
        }
        if (!consider(matches)) consider(w2vProj);
      } else {
        consider(w2vProj);
      }
    }

    // search mode: substring only
    const qRaw = (w2vQuery || '').trim();
    const qLower = qRaw.toLowerCase();
    const matchSet = new Set();
    if (qLower.length > 0) {
      for (const pt of w2vProj) {
        if ((pt.word || '').toLowerCase().includes(qLower)) matchSet.add(pt.word);
      }
    }

    if (typeof window !== 'undefined') {
      if (w2vSelected !== window.w2vLastSelected) {
        window.w2vLastSelected = w2vSelected || null;
        window.w2vQueryAtSelection = qRaw;
      }
    }

    // draw points
    noStroke();
    for (const pt of w2vProj) {
      let col = color(255, 255, 255, 150);
      const isSel = (w2vSelected && pt.word === w2vSelected);
      const isHover = (w2vHovered && pt.word === w2vHovered.word);
      const isMatch = matchSet.has(pt.word);
      if (isSel) col = color(254, 218, 119, 230);        // gold
      else if (isHover) col = color(129, 52, 175, 220);  // purple
      else if (isMatch) col = color(221, 42, 123, 210);  // pink
      else if (qLower.length > 0) col = color(255, 255, 255, 60);

      fill(col);
      const baseR = map(constrain(pt.freq, 1, 2000), 1, 2000, 2.0, 8.0);
      const sizePx = baseR * (2.6 / (pt.sz + 0.5));
      circle(pt.sx, pt.sy, sizePx);
    }

    // labels for selected / hover / match
    textFont(fontSafe);
    textSize(11);
    for (const pt of w2vProj) {
      const isSel = (w2vSelected && pt.word === w2vSelected);
      const isHover = (w2vHovered && pt.word === w2vHovered.word);
      const isMatch = matchSet.has(pt.word);
      const suppressLabelsBecauseSelectedAndQueryUnchanged = (
        !!w2vSelected && qLower.length > 0 &&
        (typeof window === 'undefined' ? false : qRaw === (window.w2vQueryAtSelection || ''))
      );
      if (
        isSel ||
        (!suppressLabelsBecauseSelectedAndQueryUnchanged && (isHover || isMatch))
      ) {
        const label = pt.word;
        const tw = textWidth(label);
        const lx = pt.sx + 6;
        const ly = pt.sy - 10;
        noStroke(); fill(0, 180);
        rect(lx - 3, ly - 2, tw + 6, 16, 3);
        fill(isSel ? color(254, 218, 119) : 255);
        textAlign(LEFT, TOP);
        const needEmoji = containsEmoji && containsEmoji(label);
        textFont(needEmoji ? EMOJI_FONT_STACK : fontSafe);
        text(label, lx, ly);
        textFont(fontSafe);

        // record hitbox for label click equivalence
        if (typeof w2vLabelBoxes !== 'undefined') {
          w2vLabelBoxes.push({ word: pt.word, x: lx - 3, y: ly - 2, w: tw + 6, h: 16 });
        }
      }
    }

    // neighbor panel data: selection persists; hover only used when nothing is selected
    const anchorWord =
      (w2vSelected && w2vSelected.length) ? w2vSelected :
      ((w2vHovered && w2vHovered.word) ? w2vHovered.word : null);

    if (anchorWord && (!w2vNeighborAnchor || w2vNeighborAnchor !== anchorWord || w2vNeighborsDirty || (typeof window !== 'undefined' && window.w2vMetric !== window.w2vNeighborsMetricCached))) {
      w2vNeighborAnchor = anchorWord;
      const metricInUse = (typeof window !== 'undefined' && window.w2vMetric) ? window.w2vMetric : 'euclidean';
      w2vNeighbors = knnFor(anchorWord, w2vK, metricInUse);
      if (typeof window !== 'undefined') window.w2vNeighborsMetricCached = metricInUse;
      w2vNeighborsDirty = false;
    }

    // show top 10 neighbors whenever a point is selected (even if the search query keeps changing)
    const allowNeighborLabels = !!w2vSelected;
    if (allowNeighborLabels && w2vNeighbors && w2vNeighbors.length && anchorWord === w2vSelected) {
      const maxTips = 10;
      const wordsToShow = new Set(w2vNeighbors.slice(0, maxTips).map(n => n.word));

      textFont(fontSafe);
      textSize(11);
      for (const pt of w2vProj) {
        if (!wordsToShow.has(pt.word)) continue;
        if (pt.sx < plotX || pt.sx > plotX + plotW || pt.sy < plotY || pt.sy > plotY + plotH) continue;

        const label = pt.word;
        const tw = textWidth(label);
        const lx = pt.sx + 6;
        const ly = pt.sy - 10;
        noStroke(); fill(0, 180);
        rect(lx - 3, ly - 2, tw + 6, 16, 3);
        fill(255);
        textAlign(LEFT, TOP);
        const needEmoji = containsEmoji && containsEmoji(label);
        textFont(needEmoji ? EMOJI_FONT_STACK : fontSafe);
        text(label, lx, ly);
        textFont(fontSafe);

        // record neighbor label hitbox as well
        if (typeof w2vLabelBoxes !== 'undefined') {
          w2vLabelBoxes.push({ word: pt.word, x: lx - 3, y: ly - 2, w: tw + 6, h: 16 });
        }
      }

      // selected word label in yellow
      const selPt = w2vProj.find(p => p.word === w2vSelected);
      if (selPt && selPt.sx >= plotX && selPt.sx <= plotX + plotW && selPt.sy >= plotY && selPt.sy <= plotY + plotH) {
        const label = selPt.word;
        const tw = textWidth(label);
        const lx = selPt.sx + 6;
        const ly = selPt.sy - 10;
        noStroke(); fill(0, 200);
        rect(lx - 3, ly - 2, tw + 6, 16, 3);
        fill(color(254, 218, 119));
        textAlign(LEFT, TOP);
        const needEmoji = containsEmoji && containsEmoji(label);
        textFont(needEmoji ? EMOJI_FONT_STACK : fontSafe);
        text(label, lx, ly);
        textFont(fontSafe);

        if (typeof w2vLabelBoxes !== 'undefined') {
          w2vLabelBoxes.push({ word: selPt.word, x: lx - 3, y: ly - 2, w: tw + 6, h: 16 });
        }
      }
    }

  } else {
    textFont(fontSafe);
    textSize(13);
    textAlign(CENTER, CENTER);
    fill(220);
    if (w2vScope === 'scoped') {
      text('No points for this selection', w2vBounds.x + w2vBounds.w / 2, w2vBounds.y + w2vBounds.h / 2);
    } else {
      text('Loading words…', w2vBounds.x + w2vBounds.w / 2, w2vBounds.y + w2vBounds.h / 2);
    }
  }

  // neighbor side panel
  drawW2VNeighborPanel();
}

// Ensures the search input exists and is placed at the bottom-left of the plot
function ensureW2VSearchInput() {
  if (!w2vSearchEl) {
    const el = document.createElement('input');
    el.type = 'text';
    el.placeholder = 'Search word…';
    el.autocapitalize = 'off';
    el.autocomplete = 'off';
    el.spellcheck = false;
    el.id = 'w2v-search';
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: 10,
      padding: '6px 10px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.25)',
      outline: 'none',
      background: 'rgba(20,20,20,0.65)',
      color: '#fff',
      fontFamily: "InstagramSans, 'Instagram Sans', sans-serif",
      fontSize: '13px',
      width: '240px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
    });
    document.body.appendChild(el);

    const tryAutoSelect = (q) => {
      const data = w2vData || [];
      if (!data.length) return false;

      const exact = data.find(p => (p.word || '').toLowerCase() === q);
      const first = exact || data.find(p => (p.word || '').toLowerCase().includes(q));
      if (first) {
        w2vSelected = first.word;
        w2vNeighborAnchor = first.word;
        w2vNeighborSort = 'distance'; 
        w2vNeighborsDirty = true;
        if (typeof window !== 'undefined') {
          window.w2vSelectionFromSearch = true;
          // keep the selection-query association fresh even if the same word stays selected
          window.w2vQueryAtSelection = q;
          window.w2vLastSelected = first.word;
        }
        return true;
      }
      return false;
    };

    el.addEventListener('input', () => {
      w2vQuery = el.value || '';
      const q = (w2vQuery.trim().toLowerCase());
      if (q.length) tryAutoSelect(q);
      else { w2vNeighborSort = 'distance'; } // back to default when search cleared
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = (el.value || '').trim().toLowerCase();
        if (!q.length) return;
        tryAutoSelect(q);
      }
      if (e.key === 'Escape') el.blur();
    });

    w2vSearchEl = el;
  }

  const left = Math.round(w2vBounds.x + 10);
  const inputH = (w2vSearchEl && w2vSearchEl.offsetHeight) ? w2vSearchEl.offsetHeight : 34;
  const top = Math.round(w2vBounds.y + w2vBounds.h - inputH - 8);
  w2vSearchEl.style.left = `${left}px`;
  w2vSearchEl.style.top = `${top}px`;

  ensureW2VControls();
}

// Metric is fixed to Euclidean
function ensureW2VControls() {
  if (w2vNeighborsSliderEl) { try { w2vNeighborsSliderEl.remove(); } catch (e) {} w2vNeighborsSliderEl = null; }
  if (typeof window !== 'undefined' && window.w2vMetricEl) { try { window.w2vMetricEl.remove(); } catch (e) {} window.w2vMetricEl = null; }

  if (!window.w2vMetricToggleEl) {
    const wrap = document.createElement('div');
    wrap.id = 'w2v-metric-toggle';
    Object.assign(wrap.style, {
      position: 'fixed',
      zIndex: 10,
      display: 'inline-flex',
      gap: '0px',
      background: 'rgba(20,20,20,0.65)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.25)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
    });

    // Prevent clicks on the metric toggle from bubbling to the canvas,
    // which could otherwise clear the current selection.
    const swallow = (e) => { try { e.preventDefault(); e.stopPropagation(); } catch (_) {} };
    ['pointerdown','pointerup','mousedown','mouseup','click','dblclick','touchstart','touchend'].forEach(evt => {
      wrap.addEventListener(evt, swallow);
    });

    const mkBtn = (id, label) => {
      const b = document.createElement('button');
      b.id = id;
      b.textContent = label;
      Object.assign(b.style, {
        padding: '6px 10px',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: '#fff',
        fontFamily: "InstagramSans, 'Instagram Sans', sans-serif",
        fontSize: '13px',
        cursor: 'pointer',
        borderRadius: '8px'
      });
      // Also swallow events at the button level for safety
      ['pointerdown','pointerup','mousedown','mouseup','click','dblclick','touchstart','touchend'].forEach(evt => {
        b.addEventListener(evt, (e) => { try { e.preventDefault(); e.stopPropagation(); } catch (_) {} });
      });
      return b;
    };

    const btnCos = mkBtn('w2v-metric-cosine', 'Cosine');
    const btnEuc = mkBtn('w2v-metric-euclidean', 'Euclidean');

    const applySel = () => {
      // default to euclidean if not set
      if (typeof window !== 'undefined' && !window.w2vMetric) window.w2vMetric = 'euclidean';
      const useCos = (typeof window !== 'undefined' && window.w2vMetric === 'cosine');
      btnCos.style.background = useCos ? 'rgba(129,52,175,0.8)' : 'transparent';
      btnEuc.style.background = !useCos ? 'rgba(129,52,175,0.8)' : 'transparent';
    };

    btnCos.addEventListener('click', (e) => {
      // preserve any current selection (from point or label click)
      const sel = (typeof w2vSelected !== 'undefined') ? w2vSelected : null;
      if (typeof window !== 'undefined') window.w2vMetric = 'cosine';
      w2vNeighborsDirty = true;
      if (sel) { w2vSelected = sel; w2vNeighborAnchor = sel; }
      applySel();
    });
    btnEuc.addEventListener('click', (e) => {
      const sel = (typeof w2vSelected !== 'undefined') ? w2vSelected : null;
      if (typeof window !== 'undefined') window.w2vMetric = 'euclidean';
      w2vNeighborsDirty = true;
      if (sel) { w2vSelected = sel; w2vNeighborAnchor = sel; }
      applySel();
    });

    wrap.appendChild(btnCos);
    wrap.appendChild(btnEuc);
    document.body.appendChild(wrap);
    if (typeof window !== 'undefined') window.w2vMetricToggleEl = wrap;
    applySel();
  }

  if (typeof window !== 'undefined' && window.w2vMetricToggleEl) {
    const h = window.w2vMetricToggleEl.offsetHeight || 34;
    const w = window.w2vMetricToggleEl.offsetWidth || 170;
    const left = Math.round(w2vBounds.x + w2vBounds.w - w - 10);
    const top = Math.round(w2vBounds.y + w2vBounds.h - h - 8);
    window.w2vMetricToggleEl.style.left = `${left}px`;
    window.w2vMetricToggleEl.style.top = `${top}px`;
  }
}

// Draws the right-hand neighbor list with bars and distances
function drawW2VNeighborPanel() {
  const fontSafe = uiFont || 'sans-serif';

  const inset = 8;
  const panelX = Math.round(w2vBounds.x + w2vBounds.w - 300);
  const panelY = Math.round(w2vBounds.y + 15);

  let maxW = Math.min(300, (typeof dashBounds !== 'undefined' && dashBounds.x)
    ? Math.max(180, dashBounds.x - panelX - 16)
    : 300);

  const panelW = Math.max(180, maxW);
  const panelH = Math.max(180, w2vBounds.h - (panelY - w2vBounds.y) - inset);

  noStroke();
  fill(0, 180);
  rect(panelX, panelY, panelW, panelH, 10);

  // header
  textFont(fontSafe);
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  const anchorTxt = w2vNeighborAnchor ? w2vNeighborAnchor : '—';
  text(anchorTxt, panelX + 10, panelY + 8);

  // frequency of anchor word
  if (w2vNeighborAnchor && Array.isArray(w2vData) && w2vData.length) {
    const anchorPoint = w2vData.find(p => p.word === w2vNeighborAnchor);
    if (anchorPoint && typeof anchorPoint.freq !== 'undefined') {
      const cntStr = (typeof anchorPoint.freq === 'number' && anchorPoint.freq.toLocaleString)
        ? anchorPoint.freq.toLocaleString()
        : String(anchorPoint.freq);
      textAlign(RIGHT, TOP);
      fill(220);
      textSize(14);
      text(`Count: ${cntStr}`, panelX + panelW - 10, panelY + 8);
    }
  }

  // subheader
  textSize(11);
  fill(200);
  textAlign(LEFT, TOP);
  text('top 10 neighbors', panelX + 10, panelY + 28);
  textAlign(RIGHT, TOP);
  const metricLabel = (typeof window !== 'undefined' && window.w2vMetric === 'cosine') ? 'COSINE SIMILARITY' : 'EUCLIDEAN DISTANCE';
  text(metricLabel, panelX + panelW - 10, panelY + 28);

  // list
  textAlign(LEFT, TOP);
  textSize(12);
  const startY = panelY + 52;
  const lineH = 16;
  const maxRows = Math.floor((panelH - (startY - panelY) - 8) / lineH);

  let rows = (w2vNeighbors || []).slice(0);
  if (rows.length) {
    if (w2vNeighborSort === 'size') {
      const freqMap = new Map();
      for (const p of (w2vData || [])) freqMap.set(p.word, p.freq || 1);
      rows.sort((a, b) => (freqMap.get(b.word) || 0) - (freqMap.get(a.word) || 0));
    } else {
      rows.sort((a, b) => a.dist - b.dist);
    }

    const limit = Math.min(maxRows, 10);

  const metricIsCosine = (typeof window !== 'undefined' && window.w2vMetric === 'cosine');
  let barScale = 1;
    if (w2vNeighborSort === 'size') {
      const freqs = rows.slice(0, limit).map(n => {
        const p = (w2vData || []).find(x => x.word === n.word);
        return p ? p.freq || 1 : 1;
      });
      const maxF = Math.max(...freqs, 1);
      barScale = 1 / maxF;
    } else if (!metricIsCosine) {
      const maxD = rows.slice(0, limit).reduce((m, n) => Math.max(m, n.dist), 0.0001);
      barScale = 1 / maxD;
    } else {
      // cosine similarity: use absolute similarity s = 1 - d in [-1,1], bar maps to [0,1] via (s+1)/2
      barScale = 1; // not used for cosine
    }

    for (let i = 0; i < limit; i++) {
      const n = rows[i];
      // Decrease the maximum possible bar length by 25%
      const barW = (panelW - 20 - 80) * 0.8 + 5;
    const p = (w2vData || []).find(x => x.word === n.word);
    const sizeVal = (p ? p.freq || 1 : 1) * barScale;
    const distVal = (!metricIsCosine) ? (n.dist * barScale) : 0; // for Euclidean
    const simAbs = (metricIsCosine) ? (1 - n.dist) : 0;         
    const simRel = (metricIsCosine) ? simAbs : 0;               

      fill(220);
      textAlign(LEFT, TOP);
      text(n.word, panelX + 10, startY + i * lineH);

      textAlign(RIGHT, TOP);
      fill(180);
      if (metricIsCosine) {
        const sim = 1 - n.dist; // cosine similarity in [-1, 1]
        text(sim.toFixed(3), panelX + panelW - 10, startY + i * lineH);
      } else {
        text(n.dist.toFixed(3), panelX + panelW - 10, startY + i * lineH);
      }

      noStroke();
      fill(129, 52, 175, 180);
      // Make bars represent the same quantity as the number shown
      // - Euclidean: bar ~ normalized distance
      // - Cosine:    bar ~ absolute cosine similarity mapped to [0,1]
      const rel = (w2vNeighborSort === 'size')
        ? sizeVal
        : (metricIsCosine ? Math.max(0, Math.min(1, simRel)) : Math.max(0, Math.min(1, distVal)));
      rect(
        panelX + 10 + 70,
        startY + i * lineH + 6,
        Math.max(2, barW * Math.max(0, Math.min(1, rel))),
        3,
        2
      );
    }
  } else {
    fill(180);
    textAlign(LEFT, TOP);
    text('Nearest points will appear here.\nHover or click a point.', panelX + 10, startY);
  }
}

// 3D -> 2D projection
function project3(v, yaw, pitch, camDist, zoom, cx, cy, scale) {
  const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);

  let x =  v[0] * cyaw + v[2] * syaw;
  let z = -v[0] * syaw + v[2] * cyaw;
  let y =  v[1];

  let y2 =  y * cp - z * sp;
  let z2 =  y * sp + z * cp;

  const denom = (z2 + camDist);
  const s = zoom * (scale / Math.max(0.02, denom));
  const sx = cx + x * s;
  const sy = cy + y2 * s;
  return { sx, sy, sz: denom };
}

// Hit-test helper for rectangles
function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Neighbor search in 3D using Euclidean 
function knnFor(anchorWord, k, metric) {
  if (!anchorWord || !w2vData || !w2vData.length) return [];
  const a = w2vData.find(p => p.word === anchorWord);
  if (!a) return [];
  const out = [];
  const ax = a.nx, ay = a.ny, az = a.nz;
  const aLen = Math.hypot(ax, ay, az) || 1;

  for (const p of w2vData) {
    if (p.word === anchorWord) continue;
    let d;
    if (metric === 'cosine') {
      const dot = ax * p.nx + ay * p.ny + az * p.nz;
      const bLen = Math.hypot(p.nx, p.ny, p.nz) || 1;
      d = 1 - (dot / (aLen * bLen));
      if (!isFinite(d)) d = 1;
      d = Math.max(0, Math.min(2, d));
    } else {
      const dx = ax - p.nx, dy = ay - p.ny, dz = az - p.nz;
      d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    out.push({ word: p.word, dist: d });
  }
  out.sort((x, y) => x.dist - y.dist);
  return out.slice(0, Math.max(1, Math.min(1000, k)));
}

// Builds the current word list depending on the global or scoped selection
function updateWord2VecData() {
  if (w2vScope === 'global') {
    w2vData = (w2vBaseData || []).slice();
    w2vNeighborsDirty = true;
    return;
  }

  const tm = timeMode || 'year';
  let table = null, groupCol = null, targetKey = selectedKey;

  if (tm === 'day') { table = w2vByDate; groupCol = 'date'; }
  else if (tm === 'month') { table = w2vByMonth; groupCol = 'month'; }
  else if (tm === 'year') { table = w2vByYear; groupCol = 'year'; }
  else if (tm === 'hour') { table = w2vByHour; groupCol = 'hour'; }

  if (!table || !table.getRowCount || table.getRowCount() === 0 || targetKey == null) {
    if (w2vScope === 'global') {
      w2vData = (w2vBaseData || []).slice();
    } else {
      w2vData = [];
    }
    w2vNeighborsDirty = true;
    return;
  }

  if (tm === 'day') {
    targetKey = shortToISODate(targetKey);
  } else if (tm === 'month') {
    const mm = parseInt(String(targetKey).slice(5, 7));
    if (!isNaN(mm)) targetKey = mm;
  }

  const rows = [];
  for (let r = 0; r < table.getRowCount(); r++) {
    const gVal = table.getString(r, groupCol);
    if (gVal == null) continue;

    if (tm === 'hour') {
      const hr = parseInt(gVal);
      if (hr !== parseInt(targetKey)) continue;
    } else if (tm === 'month') {
      const gm = parseInt(gVal);
      if (gm !== parseInt(targetKey)) continue;
    } else if (String(gVal) !== String(targetKey)) continue;

    const word = table.getString(r, 'word');
    const x = parseFloat(table.getString(r, 'x'));
    const y = parseFloat(table.getString(r, 'y'));
    const z = parseFloat(table.getString(r, 'z'));
    const freq = int(table.getString(r, 'frequency') || 1);
    if (!word || [x, y, z].some(v => isNaN(v))) continue;
    rows.push({ word, x, y, z, freq });
  }

  if (rows.length) {
    w2vData = normalizeWord2VecRows(rows);
  } else {
    w2vData = [];
  }
  w2vNeighborsDirty = true;
}

// Normalizes a p5.Table into centered/scaled {x,y,z} rows
function normalizeWord2VecTable(tbl) {
  const rows = [];
  if (!tbl || !tbl.getRowCount) return rows;
  for (let r = 0; r < tbl.getRowCount(); r++) {
    const word = tbl.getString(r, 'word');
    const x = parseFloat(tbl.getString(r, 'x'));
    const y = parseFloat(tbl.getString(r, 'y'));
    const z = parseFloat(tbl.getString(r, 'z'));
    const freq = int(tbl.getString(r, 'frequency') || 1);
    if (!word || [x, y, z].some(v => isNaN(v))) continue;
    rows.push({ word, x, y, z, freq });
  }
  return normalizeWord2VecRows(rows);
}

// Centers and scales points to a common cube and caches extents
function normalizeWord2VecRows(rows) {
  if (!rows.length) return [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const p of rows) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const spanZ = maxZ - minZ || 1;
  const scale = 2 / Math.max(spanX, spanY, spanZ);
  w2vExtents = { minX, maxX, minY, maxY, minZ, maxZ, scale };

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  for (const p of rows) {
    p.nx = (p.x - cx) * scale;
    p.ny = (p.y - cy) * scale;
    p.nz = (p.z - cz) * scale;
  }
  return rows;
}

// Converts mm/dd/yy to ISO yyyy-mm-dd
function shortToISODate(short) {
  const { year, month, day } = parseShortUS(short);
  const mm = (month < 10 ? '0' : '') + month;
  const dd = (day < 10 ? '0' : '') + day;
  return `${year}-${mm}-${dd}`;
}
