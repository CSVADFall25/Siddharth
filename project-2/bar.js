/* bar.js
   Bottom time chart for the Instagram DM data portrait.

   - Draws the X-axis-only bar chart for day / month / year / hour.
   - Tracks bar hitboxes for hover, tooltips, and selection.
   - Computes labels, keys, and counts from the messages table.

   I consulted the p5.js documentation.
   I consulted Copilot for assistance with the interaction logic and for help with debugging the bar drawing code and time-based filtering.
   I used mini-assignment4 and the class examples as a reference as well.
*/

function drawChartXOnly() {
  // clear tooltip and prep text
  tooltipG.clear();
  textFont(uiFont);
  barRects = [];

  const chartTop = height * 0.68;
  const chartBottom = height - BOTTOM_PAD;
  const chartLeft = LEFT_PAD;
  const chartRight = width - RIGHT_PAD;
  const chartH = chartBottom - chartTop;
  const chartW = chartRight - chartLeft;

  const n = max(1, counts.length);

  // bar gradient (left→right)
  const barGrad = drawingContext.createLinearGradient(chartLeft, 0, chartRight, 0);
  barGrad.addColorStop(0.00, '#F58529');
  barGrad.addColorStop(0.25, '#FEDA77');
  barGrad.addColorStop(0.50, '#DD2A7B');
  barGrad.addColorStop(0.75, '#8134AF');
  barGrad.addColorStop(1.00, '#515BD4');

  // dynamic bar width per mode (thin for day)
  let bw;
  if (timeMode === 'day') bw = Math.max(1, Math.min(2, (chartW / n) * 0.9));
  else if (timeMode === 'month') bw = Math.max(10, Math.min(40, (chartW / n) * 0.7));
  else if (timeMode === 'year') bw = Math.max(8,  Math.min(40, (chartW / n) * 0.6));
  else if (timeMode === 'hour') bw = Math.max(6,  Math.min(28, (chartW / n) * 0.7));
  else bw = Math.max(6, Math.min(28, (chartW / n) * 0.7));
  const wHit = Math.max(6, bw);

  const maxVal = max(counts) || 1;
  let hoveredAnyBar = false;

  for (let i = 0; i < counts.length; i++) {
    const x = chartLeft + (i + 0.5) * (chartW / n);
    const hVis = map(counts[i], 0, maxVal, 0, chartH - 2);
    const yVis = chartBottom - hVis;

    const isSelected = (selectedKey !== null && keys[i] === selectedKey);
    const isHovered =
      mouseX >= x - wHit/2 && mouseX <= x + wHit/2 &&
      mouseY >= yVis && mouseY <= yVis + hVis;

    // rounded bar fill with gradient
    push();
    drawingContext.save();
    const ctx = drawingContext;
    ctx.beginPath();
    const bx = x - bw/2, by = yVis, brw = bw, brh = hVis, rad = 4;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bx, by, brw, brh, rad);
    } else {
      // rounded path fallback
      const r = Math.min(rad, brw/2, brh/2);
      const left = bx, top = by, right = bx + brw, bottom = by + brh;
      ctx.moveTo(left + r, top);
      ctx.arcTo(right, top, right, bottom, r);
      ctx.arcTo(right, bottom, left, bottom, r);
      ctx.arcTo(left, bottom, left, top, r);
      ctx.arcTo(left, top, right, top, r);
      ctx.closePath();
    }
    ctx.fillStyle = barGrad;
    ctx.fill();
    drawingContext.restore();
    pop();

    // hover tint
    if (isHovered) {
      hoveredAnyBar = true;
      noStroke();
      fill(255, 50);
      rect(x - bw/2, yVis, bw, hVis, 4);
    }

    // selection outline
    if (isSelected) {
      noFill();
      stroke(255);
      strokeWeight(2);
      strokeJoin(ROUND);
      rect(x - bw/2, yVis, bw, hVis, 4);
      noStroke();
    }

    // store wide hit rect for clicks/hover
    barRects.push({ x: x - wHit/2, y: chartTop, w: wHit, h: chartH, key: keys[i], label: labels[i], count: counts[i] });
  }

  // X axis line
  stroke(255);
  strokeWeight(1.2);
  line(chartLeft, chartBottom, chartRight, chartBottom);

  // tick labels
  noStroke();
  fill(255);
  textFont(uiFont);
  textSize(11);
  textAlign(CENTER, TOP);

  if (timeMode === 'day') {
    // month tick every ~6 months
    if (dayMonthFirstIdx.size > 0) {
      const monthKeys = Array.from(dayMonthFirstIdx.keys()).sort();
      if (monthKeys.length > 0) {
        const first = monthKeys[0];
        const { year: y0, month: m0 } = splitMonthKey(first);
        for (let i = 0; i < monthKeys.length; i++) {
          const mk = monthKeys[i];
          const idx = dayMonthFirstIdx.get(mk);
          if (idx == null) continue;
          const { year, month } = splitMonthKey(mk);
          const monthsFromStart = (year - y0) * 12 + (month - m0);
          if (monthsFromStart % 6 !== 0) continue;
          const x = chartLeft + (idx + 0.5) * (chartW / Math.max(1, counts.length));
          const abbr = monthAbbr(month);
          text(`${abbr} ${year}`, x, chartBottom + 6);
        }
      }
    }
  } else if (timeMode === 'month') {
    const nLabs = labels.length;
    const step = Math.max(1, Math.ceil(nLabs / 12));
    for (let i = 0; i < nLabs; i += step) {
      const x = chartLeft + (i + 0.5) * (chartW / Math.max(1, counts.length));
      text(labels[i], x, chartBottom + 6);
    }
  } else if (timeMode === 'year') {
    const step = (labels.length > 12) ? 2 : 1;
    for (let i = 0; i < labels.length; i += step) {
      const x = chartLeft + (i + 0.5) * (chartW / Math.max(1, counts.length));
      text(labels[i], x, chartBottom + 6);
    }
  } else if (timeMode === 'hour') {
    for (let i = 0; i < labels.length; i++) {
      const x = chartLeft + (i + 0.5) * (chartW / Math.max(1, counts.length));
      text(labels[i], x, chartBottom + 6);
    }
  }

  // tooltip on hover
  textSize(12);
  noStroke();
  for (let i = 0; i < counts.length; i++) {
    const x = chartLeft + (i + 0.5) * (chartW / Math.max(1, counts.length));
    const hVis = map(counts[i], 0, max(counts) || 1, 0, chartH - 2);
    const yHit = chartBottom - hVis;

    const over =
      mouseX >= x - Math.max(6, bw)/2 && mouseX <= x + Math.max(6, bw)/2 &&
      mouseY >= yHit && mouseY <= yHit + hVis;

    if (over) {
      const pct = totalCount ? (100 * (counts[i] / totalCount)) : 0;
      drawTooltip([ `${labels[i]}`, `Messages: ${nf(counts[i], 1, 0)}`, `Share: ${nfc(pct, 1)}%` ]);
    }
  }

  // pointer cursor when hovering bars
  if (hoveredAnyBar) cursor('pointer');
  image(tooltipG, 0, 0);
}

function drawTooltip(lines) {
  tooltipG.clear();
  tooltipG.textAlign(LEFT, TOP);
  tooltipG.textSize(12);

  const useEmojiFont = lines && lines.some(l => containsEmoji(l));
  const tipFont = useEmojiFont ? EMOJI_FONT_STACK : uiFont;
  tooltipG.textFont(tipFont);
  textFont(tipFont);
  tooltipG.fill(255);

  const padding = 8;
  let tw = 0;
  for (let t of lines) tw = max(tw, textWidth(t));
  const boxW = tw + padding*2, lineH = 16, boxH = lines.length*lineH + padding*2;
  const tipX = constrain(mouseX + 12, LEFT_PAD, width - RIGHT_PAD - boxW);
  const tipY = constrain(mouseY - (boxH + 12), TOP_PAD, height - BOTTOM_PAD - boxH);

  tooltipG.noStroke();
  tooltipG.fill(0, 190);
  tooltipG.rect(tipX, tipY, boxW, boxH, 6);

  tooltipG.fill(255);
  for (let i = 0; i < lines.length; i++) {
    tooltipG.text(lines[i], tipX + padding, tipY + padding + i * lineH);
  }
  image(tooltipG, 0, 0);
  textFont(uiFont);
}

// data prep (unchanged)
function recomputeBars() {
  labels = [];
  keys = [];
  counts = [];
  totalCount = 0;

  if (timeMode === 'hour') {
    const byHour = new Array(24).fill(0);
    for (let r = 0; r < msgTable.getRowCount(); r++) {
      const dt = msgTable.getString(r, 'datetime');
      if (!dt) continue;
      const d = new Date(dt);
      if (isNaN(d)) continue;
      byHour[d.getHours()]++;
    }
    for (let h = 0; h < 24; h++) {
      labels.push(h.toString().padStart(2, '0'));
      keys.push(h);
      counts.push(byHour[h]);
      totalCount += byHour[h];
    }
    return;
  }

  if (timeMode === 'day') {
    const byDay = new Map();
    for (let r = 0; r < msgTable.getRowCount(); r++) {
      const dt = msgTable.getString(r, 'datetime');
      const short = toShortUS(dt);
      if (!short) continue;
      byDay.set(short, (byDay.get(short) || 0) + 1);
    }

    labels = [];
    keys = [];
    counts = [];
    totalCount = 0;
    dayMonthFirstIdx = new Map();

    if (dayFirstDate && dayLastDate) {
      let d = dateFromShortUS(dayFirstDate);
      const end = dateFromShortUS(dayLastDate);
      let idx = 0;
      while (d <= end) {
        const short = formatShortUSFromDate(d);
        labels.push(short);
        keys.push(short);
        const c = byDay.get(short) || 0;
        counts.push(c);
        totalCount += c;
        if (d.getDate() === 1) {
          const mk = monthKey(d.getFullYear(), d.getMonth()+1);
          if (!dayMonthFirstIdx.has(mk)) dayMonthFirstIdx.set(mk, idx);
        }
        d = addDays(d, 1);
        idx++;
      }
    }
    return;
  }

  if (timeMode === 'month') {
    const byMonth = new Array(12).fill(0);
    for (let r = 0; r < msgTable.getRowCount(); r++) {
      const dt = msgTable.getString(r, 'datetime');
      if (!dt) continue;
      const d = new Date(dt);
      if (isNaN(d)) continue;
      const m = d.getMonth() + 1;
      byMonth[m - 1]++;
    }
    labels = [];
    keys = [];
    counts = [];
    totalCount = 0;
    for (let m = 1; m <= 12; m++) {
      labels.push(String(m));
      keys.push(m);
      const c = byMonth[m - 1] || 0;
      counts.push(c);
      totalCount += c;
    }
    return;
  }

  if (timeMode === 'year') {
    const byYear = new Map();
    for (let r = 0; r < msgTable.getRowCount(); r++) {
      const dt = msgTable.getString(r, 'datetime');
      if (!dt) continue;
      const yk = toYearKey(dt);
      if (!yk) continue;
      byYear.set(yk, (byYear.get(yk) || 0) + 1);
    }
    const sortedYears = Array.from(byYear.keys()).sort((a,b)=>int(a)-int(b));
    labels = sortedYears.slice();
    keys = sortedYears.slice();
    counts = sortedYears.map(k => byYear.get(k) || 0);
    totalCount = counts.reduce((a,b)=>a+b,0);
    return;
  }
}
