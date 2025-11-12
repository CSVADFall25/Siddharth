/* dashboard.js
   Right-hand dashboard for the Instagram DM data portrait.

   - Lays out the dashboard panel next to the Word2Vec view.
   - Shows summary stats (messages, sentiment, people, characters).
   - Lists top unigrams, bigrams, trigrams, and emojis for the current view.
   - Adds left/right arrows to step through the selected time bin.

   I consulted the p5.js documentation.
   I consulted Copilot for assistance with the integration of the n-gram listing logic, the summary stats computation into the dashboard, and figuring out how to debug the placement of the text on the dashboard.
*/

// Sets dashboard position and dimensions
function layoutDashboardBounds() {
  const topEdge = height * 0.16;
  const bottomEdge = height * 0.64;
  const dashboardWidthFraction = 0.44;

  dashBounds.x = width * (1 - dashboardWidthFraction) - 10;
  dashBounds.y = topEdge;
  dashBounds.w = width - dashBounds.x - RIGHT_PAD;
  dashBounds.h = bottomEdge - topEdge;
}

// Draws the dashboard and its lists
function drawDashboard() {
  noStroke();
  fill(81, 91, 212, 22);
  rect(dashBounds.x - 6, dashBounds.y - 6, dashBounds.w + 12, dashBounds.h + 12, 16);
  fill(81, 91, 212, 36);
  rect(dashBounds.x, dashBounds.y, dashBounds.w, dashBounds.h, 12);

  const pad = 12;
  const columnGap = 14;
  const innerX = dashBounds.x + pad;
  const innerY = dashBounds.y + pad;
  const innerW = dashBounds.w - pad * 2;
  const innerH = dashBounds.h - pad * 2;
  const columnW = (innerW - columnGap) / 2;

  const maxItems = 5;
  const viewingByHour = (timeMode === "hour");
  const dateKeyFilter = viewingByHour ? null : selectedKey;
  const hourFilter = viewingByHour ? selectedKey : null;

  const summaryStats = computeStats(dateKeyFilter, hourFilter);

  const tables = viewingByHour
    ? { oneWord: uniH, twoWord: biH, threeWord: triH, emoji: emoH }
    : { oneWord: uniT, twoWord: biT, threeWord: triT, emoji: emoT };

  const minimumCount = 2;

  const topSingles = getTopFromTable(tables.oneWord, ["unigram","token","term","gram"], dateKeyFilter, maxItems, minimumCount, hourFilter);
  const topPairs   = getTopFromTable(tables.twoWord, ["bigram","token","term","gram"], dateKeyFilter, maxItems, minimumCount, hourFilter);
  const topTriples = getTopFromTable(tables.threeWord, ["trigram","token","term","gram"], dateKeyFilter, maxItems, minimumCount, hourFilter);
  const topEmoji   = getTopFromTable(tables.emoji, ["emoji","emojis","token","char"], dateKeyFilter, maxItems, 1, hourFilter);

  // increased card height to accommodate an extra metric row
  const cardH = 92;
  drawStatsCard(innerX, innerY, innerW, cardH, summaryStats);
  drawDashboardArrows(innerX, innerY - 20, innerW, cardH);

  const bodyY = innerY + cardH + 12;
  const bodyH = innerH - cardH - 12;
  const rowH = (bodyH - columnGap) / 2;

  // helper to draw each n-gram list
  const drawList = (title, items, x, y, w) => {
    textFont(uiFont);
    textAlign(LEFT, TOP);
    fill(255);
    textSize(16);
    text(title, x, y);
    stroke(255, 60);
    strokeWeight(1);
    line(x, y + 22, x + w, y + 22);
    noStroke();

    const startY = y + 30;
    const lineH = 22;

    if (!items || items.length === 0) {
      fill(200);
      textSize(13);
      text("None found.", x, startY);
      return;
    }

    // ranking with tie rules (1,1,3)
    const ranks = [];
    let lastValue = null;
    let lastRank = 0;
    for (let i = 0; i < items.length; i++) {
      const v = items[i].val;
      if (i === 0) lastRank = 1;
      else lastRank = v === lastValue ? lastRank : i + 1;
      ranks.push(lastRank);
      lastValue = v;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const yy = startY + i * lineH;

      fill(180);
      textSize(12);
      text(ranks[i] + ".", x, yy);

      if (containsEmoji(item.text)) textFont(EMOJI_FONT_STACK);
      else textFont(uiFont);

      fill(255);
      textSize(13);
      const labelX = x + 24;
      text(item.text, labelX, yy);

      textFont(uiFont);
      textAlign(RIGHT, TOP);
      fill(220);
      textSize(12);
      text(item.val, x + w, yy);
      textAlign(LEFT, TOP);
    }
  };

  // labels restored as before
  drawList("Top Unigrams", topSingles, innerX, bodyY, columnW);
  drawList("Top Bigrams",  topPairs,   innerX + columnW + columnGap, bodyY, columnW);
  drawList("Top Trigrams", topTriples, innerX, bodyY + rowH + columnGap, columnW);
  drawList("Top Emojis",   topEmoji,   innerX + columnW + columnGap, bodyY + rowH + columnGap, columnW);
}

// Computes message count and sentiment for the current scope
function computeStats(dateKeyOrNull, hourOrNull) {
  let messageCount = 0;
  let sentimentSum = 0;
  let sentimentN = 0;
  const recipientSet = new Set();
  let charSum = 0;

  for (let r = 0; r < msgTable.getRowCount(); r++) {
    const dtRaw = msgTable.getString(r, "datetime");
    if (!dtRaw) continue;
    const d = new Date(dtRaw);
    if (isNaN(d)) continue;

    let include = false;
    if (timeMode === "day") {
      const shortKey = toShortUS(dtRaw);
      include = !dateKeyOrNull || shortKey === dateKeyOrNull;
    } else if (timeMode === "month") {
      const monthNum = d.getMonth() + 1;
      if (dateKeyOrNull == null) include = true;
      else {
        const parsed = parseInt(dateKeyOrNull);
        if (!isNaN(parsed)) include = monthNum === parsed;
        else include = toMonthKey(dtRaw) === dateKeyOrNull;
      }
    } else if (timeMode === "year") {
      include = !dateKeyOrNull || String(d.getFullYear()) === dateKeyOrNull;
    } else if (timeMode === "hour") {
      include = hourOrNull == null || d.getHours() === hourOrNull;
    }

    if (!include) continue;
    messageCount += 1;

    // Track unique recipients in scope
    const recipRaw = msgTable.getString(r, "recipient_name");
    if (recipRaw != null) {
      const recip = String(recipRaw).trim();
      if (recip.length > 0) recipientSet.add(recip);
    }

    // Sum character counts (precomputed in CSV as character_count)
    const ccStr = msgTable.getString(r, "character_count");
    if (ccStr != null && ccStr !== "") {
      const cc = parseInt(ccStr);
      if (!isNaN(cc)) charSum += cc;
    }

    const sStr = msgTable.getString(r, "compound_sentiment");
    if (sStr) {
      const v = parseFloat(sStr);
      if (!isNaN(v)) {
        sentimentSum += v;
        sentimentN += 1;
      }
    }
  }

  const average = sentimentN ? sentimentSum / sentimentN : null;
  let label = "—";
  if (average !== null) {
    if (average > 0.05) label = "Positive";
    else if (average < -0.05) label = "Negative";
    else label = "Neutral";
  }

  return { msgCount: messageCount, avgSentimentBucket: label, avgSentiment: average, uniqueRecipientsCount: recipientSet.size, charCount: charSum };
}

// Draws the small summary card at the top of the dashboard
function drawStatsCard(x, y, w, h, stats) {
  noStroke();
  fill(255, 28);
  rect(x, y, w, h, 10);

  const pad = 12;
  const midX = x + w / 2;

  textFont(uiFont);
  textAlign(LEFT, TOP);
  fill(255);
  textSize(14);

  let scope = "(All)";
  if (selectedKey !== null) {
    if (timeMode === "hour") scope = `(Hour ${selectedKey})`;
    else if (timeMode === "month") scope = `(Month ${selectedKey})`;
    else if (timeMode === "year") scope = `(Year ${selectedKey})`;
    else if (timeMode === "day") scope = `(Date ${selectedKey})`;
  }

  text(`Stats ${scope}`, x + pad, y + pad);

  const lineY = y + pad + 22;
  textSize(13);
  fill(220);
  text("Messages", x + pad, lineY);
  textAlign(RIGHT, TOP);
  text(nf(stats.msgCount, 1, 0), midX - 12, lineY);

  textAlign(LEFT, TOP);
  text("Average Compound Sentiment", midX + 12, lineY);
  textAlign(RIGHT, TOP);
  const avgSuffix = stats.avgSentiment != null ? ` (${nf(stats.avgSentiment, 1, 2)})` : "";
  text(stats.avgSentimentBucket + avgSuffix, x + w - pad, lineY);
  textAlign(LEFT, TOP);

  // Second row: unique recipients on the left
  const lineY2 = lineY + 22;
  fill(220);
  text("Unique People Messaged", x + pad, lineY2);
  textAlign(RIGHT, TOP);
  text(nf(stats.uniqueRecipientsCount || 0, 1, 0), midX - 12, lineY2);
  textAlign(LEFT, TOP);

  // Second row (right): characters written
  text("Characters Written", midX + 12, lineY2);
  textAlign(RIGHT, TOP);
  text(nf(stats.charCount || 0, 1, 0), x + w - pad, lineY2);
  textAlign(LEFT, TOP);
}

// Draws navigation arrows on the dashboard card
function drawDashboardArrows(cardX, cardY, cardW, cardH) {
  const buttonSize = 28;
  const pad = 8;
  const gap = 8;
  // move arrows up slightly
  const y = cardY + (cardH - buttonSize) / 2 - 12.5;

  const rightX = cardX + cardW - pad - buttonSize;
  const leftX = rightX - gap - buttonSize;

  dashArrows = [
    { dir: -1, x: leftX, y, w: buttonSize, h: buttonSize },
    { dir: +1, x: rightX, y, w: buttonSize, h: buttonSize }
  ];

  for (const a of dashArrows) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(a.dir < 0 ? "◀" : "▶", a.x + a.w / 2, a.y + a.h / 2 + 1);
  }
}

// Shifts the selected key left or right when arrows are clicked
function nudgeSelection(direction) {
  if (!keys || !keys.length) return;
  if (selectedKey === null) {
    selectedKey = direction > 0 ? keys[0] : keys[keys.length - 1];
    return;
  }

  let idx = keys.indexOf(selectedKey);
  if (idx === -1) {
    selectedKey = direction > 0 ? keys[0] : keys[keys.length - 1];
    return;
  }

  let next = idx + direction;
  if (next < 0) next = keys.length - 1;
  if (next >= keys.length) next = 0;
  selectedKey = keys[next];
}

// Gets the top items from an n-gram table
function getTopFromTable(tbl, textFieldCandidates, dateKeyOrNull, topK, minCount, hourFilterOrNull) {
  if (!tbl) return [];
  const textField = resolveTokenField(tbl, textFieldCandidates);
  if (!textField) return [];

  const totals = new Map();
  const usingHourTables = tbl === uniH || tbl === biH || tbl === triH || tbl === emoH;

  for (let r = 0; r < tbl.getRowCount(); r++) {
    const text = tbl.getString(r, textField);
    const cStr = tbl.getString(r, "count");
    const count = int(cStr || 0);
    if (!text || !count) continue;

    if (usingHourTables) {
      const hStr = tbl.getString(r, "hour");
      const hr = hStr === "" || hStr == null ? null : int(hStr);
      if (hourFilterOrNull != null && hr !== hourFilterOrNull) continue;
    } else {
      const dRaw = tbl.getString(r, "date");
      let keep = true;

      if (dateKeyOrNull) {
        if (timeMode === "day") {
          keep = normalizeShortDate(dRaw) === dateKeyOrNull;
        } else if (timeMode === "month") {
          const dd = new Date(dRaw);
          const mNum = isNaN(dd) ? null : dd.getMonth() + 1;
          const parsed = parseInt(dateKeyOrNull);
          if (!isNaN(parsed) && mNum != null) keep = mNum === parsed;
          else keep = toMonthKey(dRaw) === dateKeyOrNull;
        } else if (timeMode === "year") {
          keep = toYearKey(dRaw) === dateKeyOrNull;
        }
      }
      if (!keep) continue;
    }

    totals.set(text, (totals.get(text) || 0) + count);
  }

  return Array.from(totals.entries())
    .map(([text, val]) => ({ text, val }))
    .filter(it => it.val >= (minCount || 1))
    .sort((a, b) => b.val - a.val || (a.text < b.text ? -1 : 1))
    .slice(0, topK);
}

// Picks the most likely token field
function resolveTokenField(tbl, candidates) {
  for (const c of candidates) if (tbl.columns && tbl.columns.includes(c)) return c;
  const cols = tbl.columns || [];
  for (const c of cols) {
    const lc = (c || "").toLowerCase();
    if (lc !== "date" && lc !== "count" && lc !== "hour") return c;
  }
  return null;
}

// Formats short date keys as mm/dd/yy
function normalizeShortDate(anyDateStr) {
  if (!anyDateStr) return null;
  const d = new Date(anyDateStr);
  if (isNaN(d)) return null;
  const mm = nf(d.getMonth() + 1, 2);
  const dd = nf(d.getDate(), 2);
  const yy = String(d.getFullYear()).slice(2);
  return `${mm}/${dd}/${yy}`;
}
