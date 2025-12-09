// p5.chart.js
// Basic data + chart utilities for p5.js
// Assumes p5 is already loaded.

// ---------------------------------------------------------
// Namespace
// ---------------------------------------------------------

p5.prototype.chart = p5.prototype.chart || {};

// ---------------------------------------------------------
// DataFrame
// ---------------------------------------------------------

p5.prototype.chart.DataFrame = class DataFrame {
  constructor(data, columns) {
    if (data === undefined) {
      this._rows = [];
      this._columns = [];
      return;
    }

    // Inline _normalize
    let rows = [];
    let cols = [];

    if (!Array.isArray(data) || data.length === 0) {
      this._rows = [];
      this._columns = [];
      return;
    }

    const first = data[0];

    if (first && typeof first === 'object' && !Array.isArray(first)) {
      rows = data.map((d) => ({ ...d }));
      cols = Object.keys(first);
    } else if (Array.isArray(first)) {
      if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error('DataFrame: columns array is required when using array-of-arrays data.');
      }
      cols = columns.slice();
      rows = data.map((rowArr) => {
        const obj = {};
        for (let i = 0; i < cols.length; i++) obj[cols[i]] = rowArr[i];
        return obj;
      });
    } else {
      throw new Error('DataFrame: unsupported data format.');
    }

    this._rows = rows;
    this._columns = cols;
  }

  _setFromParsedCSV(columns, dataRows) {
    this._columns = columns.slice();
    this._rows = dataRows.map((r) => ({ ...r }));
  }

  nRows() { return this._rows.length; }
  nCols() { return this._columns.length; }
  columns() { return this._columns.slice(); }

  row(i) {
    if (i < 0 || i >= this._rows.length) return null;
    return { ...this._rows[i] };
  }

  column(name) {
    if (this._columns.indexOf(name) === -1) {
      throw new Error(`DataFrame.column: unknown column "${name}".`);
    }
    const out = [];
    for (let i = 0; i < this._rows.length; i++) out.push(this._rows[i][name]);
    return out;
  }

  take(indices) {
    if (!Array.isArray(indices)) {
      throw new Error('DataFrame.take: indices must be an array.');
    }
    const newRows = indices
      .map((idx) => this._rows[idx])
      .filter((r) => r !== undefined)
      .map((r) => ({ ...r }));
    return new p5.prototype.chart.DataFrame(newRows);
  }

  head(n = 5) {
    const k = Math.max(0, Math.min(n, this._rows.length));
    const idx = [];
    for (let i = 0; i < k; i++) idx.push(i);
    return this.take(idx);
  }

  select(cols) {
    if (!Array.isArray(cols) || cols.length === 0) {
      throw new Error('DataFrame.select: cols must be a non-empty array.');
    }
    const cleanCols = [];
    const seen = {};
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (this._columns.indexOf(c) === -1) {
        throw new Error(`DataFrame.select: unknown column "${c}".`);
      }
      if (!seen[c]) {
        seen[c] = true;
        cleanCols.push(c);
      }
    }
    const newRows = this._rows.map((r) => {
      const obj = {};
      for (let i = 0; i < cleanCols.length; i++) obj[cleanCols[i]] = r[cleanCols[i]];
      return obj;
    });
    return new p5.prototype.chart.DataFrame(newRows);
  }

  drop(cols) {
    if (!Array.isArray(cols) || cols.length === 0) {
      throw new Error('DataFrame.drop: cols must be a non-empty array.');
    }
    const dropSet = {};
    for (let i = 0; i < cols.length; i++) dropSet[cols[i]] = true;
    const keepCols = this._columns.filter((c) => !dropSet[c]);
    const newRows = this._rows.map((r) => {
      const obj = {};
      for (let i = 0; i < keepCols.length; i++) obj[keepCols[i]] = r[keepCols[i]];
      return obj;
    });
    return new p5.prototype.chart.DataFrame(newRows);
  }

  rename(map) {
    const newRows = this._rows.map((r) => {
      const obj = {};
      for (let i = 0; i < this._columns.length; i++) {
        const oldName = this._columns[i];
        const newName = map.hasOwnProperty(oldName) ? map[oldName] : oldName;
        obj[newName] = r[oldName];
      }
      return obj;
    });
    return new p5.prototype.chart.DataFrame(newRows);
  }

  withColumn(name, valuesOrFn) {
    const newRows = [];
    if (typeof valuesOrFn === 'function') {
      for (let i = 0; i < this._rows.length; i++) {
        const oldRow = this._rows[i];
        const value = valuesOrFn(oldRow, i);
        const newRow = { ...oldRow, [name]: value };
        newRows.push(newRow);
      }
    } else if (Array.isArray(valuesOrFn)) {
      if (valuesOrFn.length !== this._rows.length) {
        throw new Error('DataFrame.withColumn: value array length must match nRows.');
      }
      for (let i = 0; i < this._rows.length; i++) {
        const oldRow = this._rows[i];
        const newRow = { ...oldRow, [name]: valuesOrFn[i] };
        newRows.push(newRow);
      }
    } else {
      throw new Error('DataFrame.withColumn: second argument must be function or array.');
    }
    return new p5.prototype.chart.DataFrame(newRows);
  }

  filterRows(fn) {
    if (typeof fn !== 'function') {
      throw new Error('DataFrame.filterRows: fn must be a function (row, index) => boolean.');
    }
    const newRows = [];
    for (let i = 0; i < this._rows.length; i++) {
      const r = this._rows[i];
      if (fn(r, i)) newRows.push({ ...r });
    }
    return new p5.prototype.chart.DataFrame(newRows);
  }

  where(columnName, op, value) {
    const ops = {
      '==': (a, b) => a === b,
      '!=': (a, b) => a !== b,
      '<': (a, b) => a < b,
      '<=': (a, b) => a <= b,
      '>': (a, b) => a > b,
      '>=': (a, b) => a >= b
    };
    const fn = ops[op];
    if (!fn) {
      throw new Error(`DataFrame.where: unsupported operator "${op}".`);
    }
    return this.filterRows((row) => fn(row[columnName], value));
  }

  sortBy(columnName, options) {
    if (this._columns.indexOf(columnName) === -1) {
      throw new Error(`DataFrame.sortBy: unknown column "${columnName}".`);
    }
    const opts = options || {};
    const descending = !!opts.descending;
    const rowsCopy = this._rows.map((r) => ({ ...r }));

    rowsCopy.sort((a, b) => {
      const av = a[columnName];
      const bv = b[columnName];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return descending ? bv - av : av - bv;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return descending ? 1 : -1;
      if (as > bs) return descending ? -1 : 1;
      return 0;
    });

    return new p5.prototype.chart.DataFrame(rowsCopy);
  }

  sample(n, options) {
    const opts = options || {};
    const withReplacement = !!opts.withReplacement;

    const N = this._rows.length;
    if (N === 0 || n <= 0) {
      return new p5.prototype.chart.DataFrame([]);
    }

    const newRows = [];
    if (withReplacement) {
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * N);
        newRows.push({ ...this._rows[idx] });
      }
    } else {
      const indices = [];
      for (let i = 0; i < N; i++) indices.push(i);
      for (let i = 0; i < Math.min(n, N); i++) {
        const j = i + Math.floor(Math.random() * (N - i));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
      }
      for (let k = 0; k < Math.min(n, N); k++) {
        newRows.push({ ...this._rows[indices[k]] });
      }
    }

    return new p5.prototype.chart.DataFrame(newRows);
  }

  groupBy(groupCols, options) {
    const cols = Array.isArray(groupCols) ? groupCols.slice() : [groupCols];
    if (cols.length === 0) {
      throw new Error('DataFrame.groupBy: groupCols must be a non-empty string or array.');
    }
    const opts = options || {};
    const op = opts.op || 'count';
    const valueCol = opts.column || null;

    if (op !== 'count' && !valueCol) {
      throw new Error('DataFrame.groupBy: options.column is required for op != "count".');
    }
    if (valueCol && this._columns.indexOf(valueCol) === -1) {
      throw new Error(`DataFrame.groupBy: unknown value column "${valueCol}".`);
    }

    const groups = new Map();

    for (let i = 0; i < this._rows.length; i++) {
      const row = this._rows[i];
      const keyVals = [];
      for (let j = 0; j < cols.length; j++) keyVals.push(row[cols[j]]);
      const key = JSON.stringify(keyVals);
      let entry = groups.get(key);
      if (!entry) {
        entry = { keyVals: keyVals, count: 0, sum: 0, min: null, max: null };
        groups.set(key, entry);
      }

      entry.count += 1;

      if (op !== 'count') {
        const rawVal = row[valueCol];
        const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
        if (!isNaN(numVal)) {
          entry.sum += numVal;
          if (entry.min === null || numVal < entry.min) entry.min = numVal;
          if (entry.max === null || numVal > entry.max) entry.max = numVal;
        }
      }
    }

    const outRows = [];
    const aggName =
      op === 'count'
        ? 'count'
        : op + '_' + (valueCol || 'value');

    groups.forEach((entry) => {
      const obj = {};
      for (let j = 0; j < cols.length; j++) obj[cols[j]] = entry.keyVals[j];
      if (op === 'count') obj[aggName] = entry.count;
      else if (op === 'sum') obj[aggName] = entry.sum;
      else if (op === 'mean') obj[aggName] = entry.count === 0 ? null : entry.sum / entry.count;
      else if (op === 'min') obj[aggName] = entry.min;
      else if (op === 'max') obj[aggName] = entry.max;
      else throw new Error(`DataFrame.groupBy: unsupported op "${op}".`);
      outRows.push(obj);
    });

    return new p5.prototype.chart.DataFrame(outRows);
  }

  pivot(indexCol, columnsCol, valuesCol, options) {
    if (this._columns.indexOf(indexCol) === -1) {
      throw new Error(`DataFrame.pivot: unknown index column "${indexCol}".`);
    }
    if (this._columns.indexOf(columnsCol) === -1) {
      throw new Error(`DataFrame.pivot: unknown columns column "${columnsCol}".`);
    }
    if (valuesCol && this._columns.indexOf(valuesCol) === -1) {
      throw new Error(`DataFrame.pivot: unknown values column "${valuesCol}".`);
    }

    const opts = options || {};
    const op = opts.op || 'sum';

    const indexKeys = [];
    const indexSeen = {};
    const colKeys = [];
    const colSeen = {};

    for (let i = 0; i < this._rows.length; i++) {
      const row = this._rows[i];
      const iv = row[indexCol];
      const cv = row[columnsCol];

      if (!indexSeen[iv]) {
        indexSeen[iv] = true;
        indexKeys.push(iv);
      }
      if (!colSeen[cv]) {
        colSeen[cv] = true;
        colKeys.push(cv);
      }
    }

    const acc = {};
    for (let i = 0; i < this._rows.length; i++) {
      const row = this._rows[i];
      const iv = row[indexCol];
      const cv = row[columnsCol];

      if (!acc[iv]) acc[iv] = {};
      if (!acc[iv][cv]) acc[iv][cv] = { sum: 0, count: 0 };

      if (op === 'count') {
        acc[iv][cv].count += 1;
      } else {
        const rawVal = valuesCol ? row[valuesCol] : 1;
        const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
        if (!isNaN(numVal)) {
          acc[iv][cv].sum += numVal;
          acc[iv][cv].count += 1;
        }
      }
    }

    const rowsOut = [];
    for (let i = 0; i < indexKeys.length; i++) {
      const iv = indexKeys[i];
      const obj = {};
      obj[indexCol] = iv;

      for (let j = 0; j < colKeys.length; j++) {
        const cv = colKeys[j];
        const cell = acc[iv] && acc[iv][cv];
        let val = null;

        if (!cell) val = null;
        else if (op === 'count') val = cell.count;
        else if (op === 'sum') val = cell.sum;
        else if (op === 'mean') val = cell.count === 0 ? null : cell.sum / cell.count;
        else throw new Error(`DataFrame.pivot: unsupported op "${op}".`);

        const colName = String(cv);
        obj[colName] = val;
      }

      rowsOut.push(obj);
    }

    return new p5.prototype.chart.DataFrame(rowsOut);
  }

  toArray() {
    return this._rows.map((r) => ({ ...r }));
  }
};

// ---------------------------------------------------------
// DataFrame helpers on p5
// ---------------------------------------------------------

p5.prototype.createDataFrame = function (data, columns) {
  return new this.chart.DataFrame(data, columns);
};

p5.prototype.loadDataFrame = function (filename, options) {
  const p = this;
  const df = new p.chart.DataFrame();

  const opts = Object.assign(
    { header: true, delimiter: null },
    options
  );

  fetch(filename)
    .then(function (res) { return res.text(); })
    .then(function (text) {
      const lines = text
        .split(/\r?\n/)
        .filter(function (ln) { return ln.trim().length > 0; });

      if (lines.length === 0) {
        if (typeof p._decrementPreload === 'function') p._decrementPreload();
        return;
      }

      const headerLine = lines[0];

      // Inline _detectDelimiter
      let delim = opts.delimiter;
      if (!delim) {
        if (headerLine.indexOf(',') !== -1) delim = ',';
        else if (headerLine.indexOf('\t') !== -1) delim = '\t';
        else if (headerLine.indexOf(';') !== -1) delim = ';';
        else delim = ',';
      }

      function splitLine(ln) {
        return ln.split(delim).map(function (s) { return s.trim(); });
      }

      let columns;
      let startIdx = 0;

      if (opts.header) {
        columns = splitLine(lines[0]);
        startIdx = 1;
      } else {
        const firstRow = splitLine(lines[0]);
        columns = firstRow.map(function (_ , i) { return 'col' + i; });
      }

      const dataRows = [];
      for (let i = startIdx; i < lines.length; i++) {
        const vals = splitLine(lines[i]);
        const obj = {};
        for (let j = 0; j < columns.length; j++) {
          // Inline _parseValue
          const raw = vals[j];
          const s = String(raw).trim();
          let v;
          if (s === '') {
            v = s;
          } else {
            const num = Number(s);
            v = isNaN(num) ? s : num;
          }
          obj[columns[j]] = v;
        }
        dataRows.push(obj);
      }

      df._setFromParsedCSV(columns, dataRows);

      if (typeof p._decrementPreload === 'function') p._decrementPreload();
    });

  return df;
};

p5.prototype.registerPreloadMethod('loadDataFrame', p5.prototype);

// ---------------------------------------------------------
// Chart class shell
// ---------------------------------------------------------

p5.prototype.chart.Chart = class Chart {
  constructor(p, x, y, w, h, options) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    const defaults = {
      background: 255,
      axisColor: 0,
      barColor: 100
    };

    this.options = Object.assign({}, defaults, options);
  }
};

// ---------------------------------------------------------
// BAR CHART
// ---------------------------------------------------------

p5.prototype.barChart = function () {
  const p = this;

  // Inline _resolveRect
  const args = arguments;
  let x, y, w, h, data, opts;
  if (typeof args[0] === 'number') {
    x = args[0];
    y = args[1];
    w = args[2];
    h = args[3];
    data = args[4];
    opts = args[5] || {};
  } else {
    data = args[0];
    opts = args[1] || {};
    const margin = opts.margin != null ? opts.margin : 40;
    x = margin;
    y = margin;
    w = p.width - margin * 2;
    h = p.height - margin * 2;
  }

  opts = opts || {};

  let values = [];
  let labels = null;

  if (data instanceof p.chart.DataFrame) {
    const xCol = opts.x || opts.category || null;
    const yCol = opts.y || opts.value || null;
    if (!yCol) {
      throw new Error('barChart: when using a DataFrame, provide options.y (value column).');
    }
    values = data.column(yCol).map(Number);
    if (xCol) {
      labels = data.column(xCol);
      if (!opts.xLabel) opts.xLabel = xCol;
    } else if (!opts.xLabel) {
      opts.xLabel = 'Index';
    }
    if (!opts.yLabel) opts.yLabel = yCol;
    if (!opts.title && xCol && yCol) opts.title = yCol + ' by ' + xCol;
    else if (!opts.title) opts.title = 'Bar Chart';
  } else if (Array.isArray(data)) {
    values = data.map(Number);
    labels = opts.labels || null;
    if (!opts.xLabel) opts.xLabel = labels ? 'Category' : 'Index';
    if (!opts.yLabel) opts.yLabel = 'Value';
    if (!opts.title) opts.title = 'Bar Chart';
  } else {
    throw new Error('barChart: data must be an array or a DataFrame.');
  }

  // Drawing (inline _drawBarChart + y-axis + title/labels)
  const pad = opts.padding != null ? opts.padding : 24;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;

  let minVal = Math.min.apply(null, values);
  let maxVal = Math.max.apply(null, values);

  p.push();
  p.noStroke();
  p.fill(opts.background || 255);
  p.rect(x, y, w, h);
  p.pop();

  // Inline _niceTicks + _drawYAxis
  if (minVal === maxVal) {
    if (minVal === 0) {
      minVal = -1;
      maxVal = 1;
    } else {
      minVal = minVal - Math.abs(minVal) * 0.1;
      maxVal = maxVal + Math.abs(maxVal) * 0.1;
    }
  }
  let spanY = maxVal - minVal;
  const tickCount = 5;
  const rawStep = spanY / (tickCount - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let step;
  if (norm < 1.5) step = 1 * mag;
  else if (norm < 3) step = 2 * mag;
  else if (norm < 7) step = 5 * mag;
  else step = 10 * mag;

  const niceMin = Math.floor(minVal / step) * step;
  const niceMax = Math.ceil(maxVal / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + 1e-9; v += step) {
    ticks.push(v);
  }
  minVal = niceMin;
  maxVal = niceMax;

  p.stroke(opts.axisColor || 0);
  p.line(innerX, innerY, innerX, innerY + innerH);

  p.textAlign(p.RIGHT, p.CENTER);
  p.textSize(opts.tickSize || 10);

  for (let i = 0; i < ticks.length; i++) {
    const t = ticks[i];
    const tNorm = (t - minVal) / (maxVal - minVal || 1);
    const ty = innerY + innerH - tNorm * innerH;
    p.line(innerX - 4, ty, innerX, ty);
    p.noStroke();
    p.text(t, innerX - 6, ty);
    p.stroke(opts.axisColor || 0);
  }

  // X axis
  p.stroke(opts.axisColor || 0);
  p.line(innerX, innerY + innerH, innerX + innerW, innerY + innerH);

  const n = values.length;
  const barW = innerW / n;
  const gap = Math.min(barW * 0.2, 8);
  const bw = barW - gap;
  const offset = gap / 2;

  p.noStroke();
  p.fill(opts.barColor || 100);

  for (let i = 0; i < n; i++) {
    const v = values[i];
    const t = (v - minVal) / (maxVal - minVal || 1);
    const barH = t * innerH;
    const bx = innerX + i * barW + offset;
    const by = innerY + innerH - barH;
    p.rect(bx, by, bw, barH);
  }

  if (labels && labels.length === n) {
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(opts.tickSize || 10);
    for (let i = 0; i < n; i++) {
      const cx = innerX + i * barW + barW / 2;
      const ty = innerY + innerH + 4;
      p.noStroke();
      p.fill(0);
      p.text(String(labels[i]), cx, ty);
    }
  }

  // Inline _drawTitleAndLabels
  const title = opts.title || '';
  const xLabel = opts.xLabel || '';
  const yLabel = opts.yLabel || '';

  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(opts.titleSize || 14);
  if (title) p.text(title, x + w / 2, y - 20);

  p.textSize(opts.labelSize || 12);
  if (xLabel) p.text(xLabel, x + w / 2, y + h + 28);

  if (yLabel) {
    p.push();
    p.translate(x - 30, y + h / 2);
    p.rotate(-p.HALF_PI);
    p.text(yLabel, 0, 0);
    p.pop();
  }
  p.pop();
};

// ---------------------------------------------------------
// LINE CHART
// ---------------------------------------------------------

p5.prototype.lineChart = function () {
  const p = this;

  const args = arguments;
  let x, y, w, h, data, opts;
  if (typeof args[0] === 'number') {
    x = args[0];
    y = args[1];
    w = args[2];
    h = args[3];
    data = args[4];
    opts = args[5] || {};
  } else {
    data = args[0];
    opts = args[1] || {};
    const margin = opts.margin != null ? opts.margin : 40;
    x = margin;
    y = margin;
    w = p.width - margin * 2;
    h = p.height - margin * 2;
  }

  opts = opts || {};

  let xs = [];
  let ys = [];

  if (data instanceof p.chart.DataFrame) {
    const xCol = opts.x || null;
    const yCol = opts.y || null;
    if (!xCol || !yCol) {
      throw new Error('lineChart: when using a DataFrame, provide options.x and options.y.');
    }
    xs = data.column(xCol).map(Number);
    ys = data.column(yCol).map(Number);
    if (!opts.xLabel) opts.xLabel = xCol;
    if (!opts.yLabel) opts.yLabel = yCol;
    if (!opts.title) opts.title = yCol + ' vs ' + xCol;
  } else if (Array.isArray(data)) {
    ys = data.map(Number);
    xs = ys.map((_, i) => i);
    if (!opts.xLabel) opts.xLabel = 'Index';
    if (!opts.yLabel) opts.yLabel = 'Value';
    if (!opts.title) opts.title = 'Line Chart';
  } else {
    throw new Error('lineChart: data must be an array or a DataFrame.');
  }

  // Inline _drawLineChart + axes + title/labels
  const pad = opts.padding != null ? opts.padding : 24;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;

  let minX = Math.min.apply(null, xs);
  let maxX = Math.max.apply(null, xs);
  let minY = Math.min.apply(null, ys);
  let maxY = Math.max.apply(null, ys);

  p.push();
  p.noStroke();
  p.fill(opts.background || 255);
  p.rect(x, y, w, h);
  p.pop();

  // Inline nice ticks + y-axis
  if (minY === maxY) {
    if (minY === 0) {
      minY = -1;
      maxY = 1;
    } else {
      minY = minY - Math.abs(minY) * 0.1;
      maxY = maxY + Math.abs(maxY) * 0.1;
    }
  }
  let spanY = maxY - minY;
  const tickCount = 5;
  const rawStep = spanY / (tickCount - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let step;
  if (norm < 1.5) step = 1 * mag;
  else if (norm < 3) step = 2 * mag;
  else if (norm < 7) step = 5 * mag;
  else step = 10 * mag;

  const niceMin = Math.floor(minY / step) * step;
  const niceMax = Math.ceil(maxY / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + 1e-9; v += step) {
    ticks.push(v);
  }
  minY = niceMin;
  maxY = niceMax;

  p.stroke(opts.axisColor || 0);
  p.line(innerX, innerY, innerX, innerY + innerH);

  p.textAlign(p.RIGHT, p.CENTER);
  p.textSize(opts.tickSize || 10);

  for (let i = 0; i < ticks.length; i++) {
    const t = ticks[i];
    const tNorm = (t - minY) / (maxY - minY || 1);
    const ty = innerY + innerH - tNorm * innerH;
    p.line(innerX - 4, ty, innerX, ty);
    p.noStroke();
    p.text(t, innerX - 6, ty);
    p.stroke(opts.axisColor || 0);
  }

  // Fix X range if degenerate
  if (minX === maxX) {
    if (minX === 0) {
      minX = -1;
      maxX = 1;
    } else {
      minX = minX - Math.abs(minX) * 0.1;
      maxX = maxX + Math.abs(maxX) * 0.1;
    }
  }

  p.stroke(opts.axisColor || 0);
  p.line(innerX, innerY + innerH, innerX + innerW, innerY + innerH);

  p.noFill();
  p.stroke(opts.lineColor || 50);
  p.strokeWeight(opts.strokeWeight || 2);

  p.beginShape();
  for (let i = 0; i < xs.length; i++) {
    const tX = (xs[i] - minX) / (maxX - minX || 1);
    const tY = (ys[i] - minY) / (maxY - minY || 1);
    const px2 = innerX + tX * innerW;
    const py2 = innerY + innerH - tY * innerH;
    p.vertex(px2, py2);
  }
  p.endShape();

  const title = opts.title || '';
  const xLabel = opts.xLabel || '';
  const yLabel = opts.yLabel || '';

  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(opts.titleSize || 14);
  if (title) p.text(title, x + w / 2, y - 20);

  p.textSize(opts.labelSize || 12);
  if (xLabel) p.text(xLabel, x + w / 2, y + h + 28);

  if (yLabel) {
    p.push();
    p.translate(x - 30, y + h / 2);
    p.rotate(-p.HALF_PI);
    p.text(yLabel, 0, 0);
    p.pop();
  }
  p.pop();
};

// ---------------------------------------------------------
// SCATTER PLOT
// ---------------------------------------------------------

p5.prototype.scatterPlot = function () {
  const p = this;

  const args = arguments;
  let x, y, w, h, data, opts;
  if (typeof args[0] === 'number') {
    x = args[0];
    y = args[1];
    w = args[2];
    h = args[3];
    data = args[4];
    opts = args[5] || {};
  } else {
    data = args[0];
    opts = args[1] || {};
    const margin = opts.margin != null ? opts.margin : 40;
    x = margin;
    y = margin;
    w = p.width - margin * 2;
    h = p.height - margin * 2;
  }

  opts = opts || {};

  let xs = [];
  let ys = [];

  if (data instanceof p.chart.DataFrame) {
    const xCol = opts.x || null;
    const yCol = opts.y || null;
    if (!xCol || !yCol) {
      throw new Error('scatterPlot: when using a DataFrame, provide options.x and options.y.');
    }
    xs = data.column(xCol).map(Number);
    ys = data.column(yCol).map(Number);
    if (!opts.xLabel) opts.xLabel = xCol;
    if (!opts.yLabel) opts.yLabel = yCol;
    if (!opts.title) opts.title = yCol + ' vs ' + xCol;
  } else if (Array.isArray(data)) {
    ys = data.map(Number);
    xs = ys.map((_, i) => i);
    if (!opts.xLabel) opts.xLabel = 'Index';
    if (!opts.yLabel) opts.yLabel = 'Value';
    if (!opts.title) opts.title = 'Scatter Plot';
  } else {
    throw new Error('scatterPlot: data must be an array or a DataFrame.');
  }

  const pad = opts.padding != null ? opts.padding : 24;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;

  let minX = Math.min.apply(null, xs);
  let maxX = Math.max.apply(null, xs);
  let minY = Math.min.apply(null, ys);
  let maxY = Math.max.apply(null, ys);

  p.push();
  p.noStroke();
  p.fill(opts.background || 255);
  p.rect(x, y, w, h);
  p.pop();

  // Inline y-axis ticks
  if (minY === maxY) {
    if (minY === 0) {
      minY = -1;
      maxY = 1;
    } else {
      minY = minY - Math.abs(minY) * 0.1;
      maxY = maxY + Math.abs(maxY) * 0.1;
    }
  }
  let spanY = maxY - minY;
  const tickCount = 5;
  const rawStep = spanY / (tickCount - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let step;
  if (norm < 1.5) step = 1 * mag;
  else if (norm < 3) step = 2 * mag;
  else if (norm < 7) step = 5 * mag;
  else step = 10 * mag;

  const niceMin = Math.floor(minY / step) * step;
  const niceMax = Math.ceil(maxY / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + 1e-9; v += step) {
    ticks.push(v);
  }
  minY = niceMin;
  maxY = niceMax;

  p.stroke(opts.axisColor || 0);
  p.line(innerX, innerY, innerX, innerY + innerH);

  p.textAlign(p.RIGHT, p.CENTER);
  p.textSize(opts.tickSize || 10);

  for (let i = 0; i < ticks.length; i++) {
    const t = ticks[i];
    const tNorm = (t - minY) / (maxY - minY || 1);
    const ty = innerY + innerH - tNorm * innerH;
    p.line(innerX - 4, ty, innerX, ty);
    p.noStroke();
    p.text(t, innerX - 6, ty);
    p.stroke(opts.axisColor || 0);
  }

  if (minX === maxX) {
    if (minX === 0) {
      minX = -1;
      maxX = 1;
    } else {
      minX = minX - Math.abs(minX) * 0.1;
      maxX = maxX + Math.abs(maxX) * 0.1;
    }
  }

  p.stroke(opts.axisColor || 0);
  p.line(innerX, innerY + innerH, innerX + innerW, innerY + innerH);

  p.noStroke();
  p.fill(opts.pointColor || 0);
  const r = opts.pointRadius || 4;

  for (let i = 0; i < xs.length; i++) {
    const tX = (xs[i] - minX) / (maxX - minX || 1);
    const tY = (ys[i] - minY) / (maxY - minY || 1);
    const px2 = innerX + tX * innerW;
    const py2 = innerY + innerH - tY * innerH;
    p.circle(px2, py2, r * 2);
  }

  const title = opts.title || '';
  const xLabel = opts.xLabel || '';
  const yLabel = opts.yLabel || '';

  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(opts.titleSize || 14);
  if (title) p.text(title, x + w / 2, y - 20);

  p.textSize(opts.labelSize || 12);
  if (xLabel) p.text(xLabel, x + w / 2, y + h + 28);

  if (yLabel) {
    p.push();
    p.translate(x - 30, y + h / 2);
    p.rotate(-p.HALF_PI);
    p.text(yLabel, 0, 0);
    p.pop();
  }
  p.pop();
};

// ---------------------------------------------------------
// PIE CHART
// ---------------------------------------------------------

p5.prototype.pieChart = function () {
  const p = this;

  const args = arguments;
  let x, y, w, h, data, opts;
  if (typeof args[0] === 'number') {
    x = args[0];
    y = args[1];
    w = args[2];
    h = args[3];
    data = args[4];
    opts = args[5] || {};
  } else {
    data = args[0];
    opts = args[1] || {};
    const margin = opts.margin != null ? opts.margin : 40;
    x = margin;
    y = margin;
    w = p.width - margin * 2;
    h = p.height - margin * 2;
  }

  opts = opts || {};

  let values = [];
  let labels = null;

  if (data instanceof p.chart.DataFrame) {
    const valueCol = opts.value || opts.y || null;
    const labelCol = opts.label || opts.category || null;
    if (!valueCol) {
      throw new Error('pieChart: when using a DataFrame, provide options.value (or options.y).');
    }
    values = data.column(valueCol).map(Number);
    labels = labelCol ? data.column(labelCol) : null;
    if (!opts.title && valueCol && labelCol) opts.title = valueCol + ' by ' + labelCol;
    else if (!opts.title) opts.title = 'Pie Chart';
  } else if (Array.isArray(data)) {
    values = data.map(Number);
    labels = opts.labels || null;
    if (!opts.title) opts.title = 'Pie Chart';
  } else {
    throw new Error('pieChart: data must be an array or a DataFrame.');
  }

  // Inline _drawPieChart + title/labels
  const pad = opts.padding != null ? opts.padding : 24;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = Math.min(w, h) / 2 - pad;

  const total = values.reduce((a, b) => a + b, 0) || 1;

  p.push();
  p.noStroke();
  p.fill(opts.background || 255);
  p.rect(x, y, w, h);
  p.pop();

  let angleStart = -p.HALF_PI;

  p.textSize(opts.tickSize || 10);
  p.textAlign(p.LEFT, p.CENTER);

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const angle = (v / total) * p.TWO_PI;
    const angleEnd = angleStart + angle;

    const hueVal = (i * 50) % 360;
    p.colorMode(p.HSB, 360, 100, 100);
    p.fill(hueVal, 70, 90);
    p.noStroke();
    p.arc(cx, cy, radius * 2, radius * 2, angleStart, angleEnd, p.PIE);

    const midAngle = (angleStart + angleEnd) / 2;
    const lx = cx + Math.cos(midAngle) * (radius * 0.7);
    const ly = cy + Math.sin(midAngle) * (radius * 0.7);

    p.fill(0);
    const label = labels && labels[i] != null ? String(labels[i]) : String(v);
    p.text(label, lx, ly);

    angleStart = angleEnd;
  }

  const title = opts.title || '';
  const xLabel = opts.xLabel || '';
  const yLabel = opts.yLabel || '';

  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(opts.titleSize || 14);
  if (title) p.text(title, x + w / 2, y - 20);

  p.textSize(opts.labelSize || 12);
  if (xLabel) p.text(xLabel, x + w / 2, y + h + 28);

  if (yLabel) {
    p.push();
    p.translate(x - 30, y + h / 2);
    p.rotate(-p.HALF_PI);
    p.text(yLabel, 0, 0);
    p.pop();
  }
  p.pop();

  p.colorMode(p.RGB, 255);
};

// ---------------------------------------------------------
// TABLE CHART (DataFrame visualization)
// ---------------------------------------------------------

p5.prototype.tableChart = function () {
  const p = this;

  const args = arguments;
  let x, y, w, h, data, opts;
  if (typeof args[0] === 'number') {
    x = args[0];
    y = args[1];
    w = args[2];
    h = args[3];
    data = args[4];
    opts = args[5] || {};
  } else {
    data = args[0];
    opts = args[1] || {};
    const margin = opts.margin != null ? opts.margin : 40;
    x = margin;
    y = margin;
    w = p.width - margin * 2;
    h = p.height - margin * 2;
  }

  opts = opts || {};

  if (!(data instanceof p.chart.DataFrame)) {
    throw new Error('tableChart: data must be a DataFrame.');
  }

  const maxRows = opts.maxRows || 10;
  const displayData = data.head(maxRows);
  const columns = displayData.columns();
  const rows = displayData.toArray();

  if (!opts.title) opts.title = 'Data Table';

  // Drawing
  const pad = opts.padding != null ? opts.padding : 24;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;

  p.push();
  p.noStroke();
  p.fill(opts.background || 255);
  p.rect(x, y, w, h);
  p.pop();

  // Calculate column widths
  const colWidth = innerW / columns.length;
  const rowHeight = opts.rowHeight || 30;
  const headerHeight = opts.headerHeight || 35;

  // Draw title
  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(opts.titleSize || 14);
  p.fill(0);
  if (opts.title) p.text(opts.title, x + w / 2, y + 10);
  p.pop();

  // Draw header
  p.push();
  p.fill(opts.headerBackground || 200);
  p.stroke(opts.borderColor || 0);
  p.strokeWeight(1);
  p.rect(innerX, innerY, innerW, headerHeight);

  p.fill(opts.headerTextColor || 0);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(opts.headerTextSize || 12);
  p.textStyle(p.BOLD);

  for (let i = 0; i < columns.length; i++) {
    const colX = innerX + i * colWidth;
    p.text(columns[i], colX + colWidth / 2, innerY + headerHeight / 2);
    
    // Draw vertical lines
    if (i > 0) {
      p.stroke(opts.borderColor || 0);
      p.line(colX, innerY, colX, innerY + headerHeight);
    }
  }
  p.pop();

  // Draw rows
  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(opts.textSize || 11);
  p.textStyle(p.NORMAL);

  for (let i = 0; i < rows.length; i++) {
    const rowY = innerY + headerHeight + i * rowHeight;
    
    // Alternate row colors
    if (i % 2 === 0) {
      p.fill(opts.rowBackground || 245);
    } else {
      p.fill(opts.altRowBackground || 255);
    }
    p.stroke(opts.borderColor || 0);
    p.strokeWeight(1);
    p.rect(innerX, rowY, innerW, rowHeight);

    // Draw cell values
    p.fill(opts.textColor || 0);
    for (let j = 0; j < columns.length; j++) {
      const colX = innerX + j * colWidth;
      const cellValue = rows[i][columns[j]];
      let displayValue = cellValue != null ? String(cellValue) : '';
      
      // Truncate long values
      const maxLen = opts.maxCellLength || 20;
      if (displayValue.length > maxLen) {
        displayValue = displayValue.substring(0, maxLen - 3) + '...';
      }
      
      p.noStroke();
      p.text(displayValue, colX + colWidth / 2, rowY + rowHeight / 2);
      
      // Draw vertical lines
      if (j > 0) {
        p.stroke(opts.borderColor || 0);
        p.line(colX, rowY, colX, rowY + rowHeight);
      }
    }
  }
  p.pop();

  // Draw outer border
  p.push();
  p.noFill();
  p.stroke(opts.borderColor || 0);
  p.strokeWeight(2);
  p.rect(innerX, innerY, innerW, headerHeight + rows.length * rowHeight);
  p.pop();

  // Show row count info
  if (data.nRows() > maxRows) {
    p.push();
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(opts.labelSize || 10);
    p.fill(100);
    const infoY = innerY + headerHeight + rows.length * rowHeight + 5;
    p.text(`Showing ${maxRows} of ${data.nRows()} rows`, x + w / 2, infoY);
    p.pop();
  }
};

// ---------------------------------------------------------
// HISTOGRAM
// ---------------------------------------------------------

p5.prototype.histChart = function () {
  const p = this;

  const args = arguments;
  let x, y, w, h, data, opts;
  if (typeof args[0] === 'number') {
    x = args[0];
    y = args[1];
    w = args[2];
    h = args[3];
    data = args[4];
    opts = args[5] || {};
  } else {
    data = args[0];
    opts = args[1] || {};
    const margin = opts.margin != null ? opts.margin : 40;
    x = margin;
    y = margin;
    w = p.width - margin * 2;
    h = p.height - margin * 2;
  }

  opts = opts || {};

  let values = [];
  const bins = opts.bins || null;

  if (data instanceof p.chart.DataFrame) {
    const col = opts.column || opts.x || opts.value || null;
    if (!col) {
      throw new Error('histChart: when using a DataFrame, provide options.column (or x/value).');
    }
    values = data.column(col).map(Number);
    if (!opts.title) opts.title = 'Histogram of ' + col;
    if (!opts.xLabel) opts.xLabel = col;
    if (!opts.yLabel) opts.yLabel = 'Count';
  } else if (Array.isArray(data)) {
    values = data.map(Number);
    if (!opts.title) opts.title = 'Histogram';
    if (!opts.xLabel) opts.xLabel = 'Value';
    if (!opts.yLabel) opts.yLabel = 'Count';
  } else {
    throw new Error('histChart: data must be an array or a DataFrame.');
  }

  // Inline _drawHistChart + _computeHistogram + axes + labels
  const pad = opts.padding != null ? opts.padding : 24;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;

  // compute histogram
  const minVal = Math.min.apply(null, values);
  const maxVal = Math.max.apply(null, values);
  const span = (maxVal - minVal) || 1;
  const b = bins || Math.round(Math.sqrt(values.length)) || 10;
  const counts = new Array(b).fill(0);
  const edges = [];
  for (let i = 0; i <= b; i++) edges.push(minVal + (span * i) / b);
  for (let i = 0; i < values.length; i++) {
    let t = (values[i] - minVal) / (span || 1);
    let idx = Math.floor(t * b);
    if (idx < 0) idx = 0;
    if (idx >= b) idx = b - 1;
    counts[idx]++;
  }

  const maxCount = Math.max.apply(null, counts) || 1;

  p.push();
  p.noStroke();
  p.fill(opts.background || 255);
  p.rect(x, y, w, h);
  p.pop();

  // y-axis from 0 to maxCount
  let yMin = 0;
  let yMax = maxCount;

  if (yMin === yMax) {
    if (yMin === 0) {
      yMin = -1;
      yMax = 1;
    } else {
      yMin = yMin - Math.abs(yMin) * 0.1;
      yMax = yMax + Math.abs(yMax) * 0.1;
    }
  }
  let spanY = yMax - yMin;
  const tickCount = 5;
  const rawStep = spanY / (tickCount - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let step;
  if (norm < 1.5) step = 1 * mag;
  else if (norm < 3) step = 2 * mag;
  else if (norm < 7) step = 5 * mag;
  else step = 10 * mag;

  const niceMin = Math.floor(yMin / step) * step;
  const niceMax = Math.ceil(yMax / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + 1e-9; v += step) {
    ticks.push(v);
  }
  yMin = niceMin;
  yMax = niceMax;

  p.stroke(opts.axisColor || 0);
  p.line(innerX, innerY, innerX, innerY + innerH);

  p.textAlign(p.RIGHT, p.CENTER);
  p.textSize(opts.tickSize || 10);

  for (let i = 0; i < ticks.length; i++) {
    const t = ticks[i];
    const tNorm = (t - yMin) / (yMax - yMin || 1);
    const ty = innerY + innerH - tNorm * innerH;
    p.line(innerX - 4, ty, innerX, ty);
    p.noStroke();
    p.text(t, innerX - 6, ty);
    p.stroke(opts.axisColor || 0);
  }

  p.stroke(opts.axisColor || 0);
  p.line(innerX, innerY + innerH, innerX + innerW, innerY + innerH);

  const n = counts.length;
  const barW = innerW / n;
  const gap = Math.min(barW * 0.2, 8);
  const bw = barW - gap;
  const offset = gap / 2;

  p.noStroke();
  p.fill(opts.barColor || 120);

  for (let i = 0; i < n; i++) {
    const c = counts[i];
    const t = (c - yMin) / (yMax - yMin || 1);
    const barH = t * innerH;
    const bx = innerX + i * barW + offset;
    const by = innerY + innerH - barH;
    p.rect(bx, by, bw, barH);
  }

  if (opts.showBinLabels) {
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(opts.tickSize || 10);
    for (let i = 0; i < n; i++) {
      const cx2 = innerX + i * barW + barW / 2;
      const ty = innerY + innerH + 4;
      const label = edges[i].toFixed(1) + '–' + edges[i + 1].toFixed(1);
      p.noStroke();
      p.fill(0);
      p.text(label, cx2, ty);
    }
  }

  const title = opts.title || '';
  const xLabel = opts.xLabel || '';
  const yLabel = opts.yLabel || '';

  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(opts.titleSize || 14);
  if (title) p.text(title, x + w / 2, y - 20);

  p.textSize(opts.labelSize || 12);
  if (xLabel) p.text(xLabel, x + w / 2, y + h + 28);

  if (yLabel) {
    p.push();
    p.translate(x - 30, y + h / 2);
    p.rotate(-p.HALF_PI);
    p.text(yLabel, 0, 0);
    p.pop();
  }
  p.pop();
};
