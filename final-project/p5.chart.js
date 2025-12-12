// p5.chart.js
// Modern Data Visualization Library for p5.js


// Helper: Get luminance of a hex color
function getLuminance(hex) {
  hex = String(hex).replace('#', '');
  if (hex.length === 3) {
    hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  }
  if (hex.length !== 6) return 1; // fallback: treat as light
  const r = parseInt(hex.substring(0,2), 16) / 255;
  const g = parseInt(hex.substring(2,4), 16) / 255;
  const b = parseInt(hex.substring(4,6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Helper: Choose label color based on background
function getAutoLabelColor(bgColor) {
  let hex = bgColor;
  if (typeof hex === 'string' && hex.startsWith('rgb')) {
    const nums = hex.match(/\d+/g);
    if (nums && nums.length >= 3) {
      hex = '#' + nums.slice(0,3).map(x => (+x).toString(16).padStart(2,'0')).join('');
    }
  }
  const lum = getLuminance(hex);
  return lum > 0.6 ? '#111' : '#fff';
}

(function() {

  // ==========================================
  // 0. GLOBALS & CONFIG - OVERALL AESTHETICS
  // ==========================================
  
  p5.prototype.chart = p5.prototype.chart || {};
  
  // ====== COLOR PALETTE ======
  // Default color palette for all charts
  p5.prototype.chart.palette = [
    "#395B64", "#A5C9CA", "#E7F6F2", "#2C3333", 
    "#FF8B8B", "#EB4747", "#ABC9FF", "#FFD966"
  ];
  
  // ====== TYPOGRAPHY ======
  const DEFAULT_FONT = '"Roboto", "Helvetica Neue", "Helvetica", "Arial", sans-serif';
  const TEXT_COLOR = "#333333";
  const SUBTEXT_COLOR = "#666666";
  const TITLE_SIZE = 16;
  const SUBTITLE_SIZE = 13;
  const AXIS_LABEL_SIZE = 12;
  const TICK_LABEL_SIZE = 10;
  const DATA_LABEL_SIZE = 11;
  const SOURCE_AUTHOR_SIZE = 7;
  
  // ====== CHART MARGINS ======
  const DEFAULT_MARGIN = { top: 60, right: 40, bottom: 60, left: 80 };
  
  // ====== AXES & GRIDLINES ======
  const AXIS_COLOR = "#969696"; // 150 gray
  const AXIS_WEIGHT = 2;
  const TICK_COLOR = "#C8C8C8"; // 200 gray
  const TICK_WEIGHT = 1;
  const TICK_LENGTH = 5;
  const NUM_TICKS = 5;
  
  // ====== POINTS (Scatter & Line) ======
  const DEFAULT_POINT_SIZE = 6;
  const DEFAULT_POINT_SIZE_SCATTER = 8;
  const MIN_POINT_SIZE = 5;
  const MAX_POINT_SIZE = 20;
  const POINT_HOVER_SCALE = 1.5;
  const POINT_STROKE_WEIGHT = 2;
  const POINT_HOVER_STROKE_WEIGHT = 3;
  
  // ====== LINES ======
  const DEFAULT_LINE_SIZE = 2;
  
  // ====== BARS ======
  const BAR_GAP_RATIO = 0.8; // 0.8 = 20% gap, 80% bar
  const BAR_LABEL_POS = 'auto'; // 'auto', 'inside', 'outside', 'bottom', 'none'
  const BAR_LABEL_SIZE = 10;
  
  // ====== PIE/DONUT ======
  const PIE_LABEL_SIZE = 11;
  const PIE_STROKE_WEIGHT = 2;
  const PIE_STROKE_COLOR = "#FFFFFF";
  const PIE_HOVER_SCALE = 1.05;
  const DONUT_HOLE_RADIUS = 0.6;
  
  // ====== HISTOGRAM ======
  const HIST_DEFAULT_BINS = 10;
  const HIST_BORDER_WEIGHT = 1;
  const HIST_LABEL_SIZE = 10;
  
  // ====== TABLE ======
  const TABLE_ROW_HEIGHT = 30;
  const TABLE_MAX_ROWS = 10;
  const TABLE_HEADER_COLOR = "#F0F0F0"; 
  const TABLE_ROW_COLOR_1 = "#FFFFFF"; 
  const TABLE_ROW_COLOR_2 = "#FAFAFA"; 
  const TABLE_HOVER_COLOR = "#96C8FF"; 
  const TABLE_BORDER_COLOR = "#C8C8C8"; 
  const TABLE_TEXT_SIZE = 12;
  const TABLE_SEARCH_WIDTH = 150;
  const TABLE_ARROW_SIZE = 24;
  
  // ====== MAP ======
  const MAP_DEFAULT_ZOOM = 4;
  const MAP_POINT_SIZE = 12;
  const MAP_POINT_COLOR = "#D62728"; 
  const MAP_POINT_HOVER_SCALE = 1.3;
  const MAP_LABEL_SIZE = 11;
  const MAP_PAN_AMOUNT = 0.5;
  
  // ====== TOOLTIPS ======
  const TOOLTIP_BG_COLOR = "rgba(0, 0, 0, 0.86)"; 
  const TOOLTIP_TEXT_COLOR = "#FFFFFF";
  const TOOLTIP_TEXT_SIZE = 12;
  const TOOLTIP_PADDING = 10;
  const TOOLTIP_LINE_HEIGHT = 18;
  const TOOLTIP_BORDER_RADIUS = 4;
  const TOOLTIP_OFFSET = 15;
  
  // ====== BACKGROUNDS ======
  const DEFAULT_BG_COLOR = "#FFFFFF";
  
  // ====== HOVER EFFECTS ======
  const HOVER_ALPHA = 200; // Alpha for hover state (out of 255)
  const HOVER_CURSOR = 'HAND';
  
  // ====== LABEL POSITIONING ======
  const LABEL_OFFSET = 10;
  const LABEL_PADDING = 5;
  
  // ====== TRUNCATION ======
  const TRUNCATE_SUFFIX = "...";
  
  // ====== NaN HANDLING POLICY ======
  // Global policy for handling NaN/null values across all chart types
  // 'warn' (default): Logs warnings and handles gracefully with visual indicators
  // 'silent': Silently filters/skips NaN values without warnings
  // 'strict': Throws errors when NaN values are detected
  const NAN_POLICY = {
    WARN: 'warn',
    SILENT: 'silent', 
    STRICT: 'strict'
  };
  
  // Default NaN policy (can be overridden per chart)
  p5.prototype.chart.nanPolicy = NAN_POLICY.WARN;
  
  // Chart-Specific Behavior:
  //   Bar        - SKIP:    Bars with NaN not rendered
  //   Line       - BREAK:   Creates gaps in line where NaN occurs
  //   Histogram  - FILTER:  NaN values excluded from binning
  //   Scatter    - SKIP:    Points with NaN not drawn
  //   Map        - SKIP:    Points with NaN not drawn
  //   Pie        - STRICT:  Shows error message (defaults to strict mode)
  //   Table      - DISPLAY: Shows "—" with gray styling
  
  p5.prototype.chart.inputs = {}; // Cache for DOM elements

  // If true (default), charts will attempt to avoid CSS-squished canvases by resizing
  // the p5 canvas to match its displayed (CSS) size when needed.
  // Opt out globally by setting: p5.prototype.chart.autoFitCanvas = false;
  // Or per-chart via options.autoFitCanvas = false.
  if (p5.prototype.chart.autoFitCanvas === undefined) {
    p5.prototype.chart.autoFitCanvas = true;
  }

  // Inject a safe default CSS rule so p5 canvases don’t overflow on small/mobile screens.
  // This makes fixed-size sketches behave responsively without requiring sketch changes.
  (function ensureResponsiveCanvasCSS() {
    try {
      const styleId = 'p5chart-responsive-canvas';
      if (typeof document === 'undefined') return;
      if (document.getElementById(styleId)) return;
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
canvas.p5Canvas, canvas[id^="defaultCanvas"]{max-width:100%;height:auto;}
`;
      document.head.appendChild(style);
    } catch (e) {
      // ignore
    }
  })();

  // ==========================================
  // 1. DATAFRAME & LOADING 
  // ==========================================

  p5.prototype.chart.DataFrame = class DataFrame {
    constructor(data, columns) {
      this._rows = [];
      this._columns = [];
      if (!data) return;

      if (Array.isArray(data) && data.length > 0) {
        if (Array.isArray(data[0])) {
          if (!columns) throw new Error("DataFrame: Columns required for array data.");
          this._columns = columns;
          this._rows = data.map(row => {
            let obj = {};
            columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
          });
        } else {
          this._rows = data.map(d => ({ ...d }));
          this._columns = Object.keys(data[0]);
        }
      }
    }
    get columns() { return [...this._columns]; }
    get rows() { return this._rows.map(r => ({ ...r })); }
    col(name) { return this._rows.map(r => r[name]); }
    filter(colNameOrFn, operator, value) {
        // If only one argument and it's a function, use the old way
        if (typeof colNameOrFn === 'function') {
            return new p5.prototype.chart.DataFrame(this._rows.filter(colNameOrFn), this._columns);
        }
        // Otherwise, use simplified syntax: filter('Age', '>', 5)
        const filtered = this._rows.filter(row => {
            const colVal = row[colNameOrFn];
            if (operator === '>') return colVal > value;
            if (operator === '<') return colVal < value;
            if (operator === '>=') return colVal >= value;
            if (operator === '<=') return colVal <= value;
            if (operator === '===' || operator === '==') return colVal === value;
            if (operator === '!==' || operator === '!=') return colVal !== value;
            return true;
        });
        return new p5.prototype.chart.DataFrame(filtered, this._columns);
    }
    groupBy(col) {
        let groups = {};
        this._rows.forEach(r => {
            let key = r[col];
            if(!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        return groups;
    }
    // Transform a column by applying a function to each value
    transform(colName, fn) {
        this._rows.forEach(row => {
            if (row[colName] !== undefined) {
                row[colName] = fn(row[colName]);
            }
        });
        return this;
    }
    // Rename a column
    rename(oldName, newName) {
        const idx = this._columns.indexOf(oldName);
        if (idx === -1) throw new Error(`Column "${oldName}" not found`);
        this._columns[idx] = newName;
        this._rows.forEach(row => {
            row[newName] = row[oldName];
            delete row[oldName];
        });
        return this;
    }
    // Select specific columns
    select(columnNames) {
        if (!Array.isArray(columnNames)) columnNames = [columnNames];
        const newRows = this._rows.map(row => {
            let newRow = {};
            columnNames.forEach(col => {
                if (row[col] !== undefined) newRow[col] = row[col];
            });
            return newRow;
        });
        return new p5.prototype.chart.DataFrame(newRows, columnNames);
    }
    // Drop columns
    drop(columnNames) {
        if (!Array.isArray(columnNames)) columnNames = [columnNames];
        const keepCols = this._columns.filter(col => !columnNames.includes(col));
        return this.select(keepCols);
    }
    // Group by column and apply aggregation function
    group(colName, aggFunc) {
        const groups = this.groupBy(colName);
        const result = [];
        for (let key in groups) {
            const groupData = groups[key];
            const aggregated = aggFunc(groupData);
            result.push({ [colName]: key, ...aggregated });
        }
        return new p5.prototype.chart.DataFrame(result);
    }
    // Pivot table: create a cross-tabulation
    pivot(indexCol, columnCol, valueCol, aggFunc = 'sum') {
        const pivotData = {};
        const columnValues = new Set();
        
        this._rows.forEach(row => {
            const indexVal = row[indexCol];
            const colVal = row[columnCol];
            const val = row[valueCol];
            
            if (!pivotData[indexVal]) pivotData[indexVal] = {};
            if (!pivotData[indexVal][colVal]) pivotData[indexVal][colVal] = [];
            
            pivotData[indexVal][colVal].push(val);
            columnValues.add(colVal);
        });
        
        const result = [];
        const sortedCols = Array.from(columnValues).sort();
        
        for (let indexVal in pivotData) {
            let row = { [indexCol]: indexVal };
            sortedCols.forEach(colVal => {
                const values = pivotData[indexVal][colVal] || [];
                if (aggFunc === 'sum') {
                    row[colVal] = values.reduce((a, b) => a + b, 0);
                } else if (aggFunc === 'mean' || aggFunc === 'avg') {
                    row[colVal] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                } else if (aggFunc === 'count') {
                    row[colVal] = values.length;
                } else if (aggFunc === 'min') {
                    row[colVal] = values.length > 0 ? Math.min(...values) : 0;
                } else if (aggFunc === 'max') {
                    row[colVal] = values.length > 0 ? Math.max(...values) : 0;
                }
            });
            result.push(row);
        }
        
        return new p5.prototype.chart.DataFrame(result);
    }
    // Sort by column in ascending or descending order
    sort(colName, order = 'ascending') {
        const sortedRows = [...this._rows].sort((a, b) => {
            const valA = a[colName];
            const valB = b[colName];
            
            // Handle numbers
            if (typeof valA === 'number' && typeof valB === 'number') {
                return order === 'ascending' ? valA - valB : valB - valA;
            }
            
            // Handle strings
            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (order === 'ascending') {
                return strA < strB ? -1 : strA > strB ? 1 : 0;
            } else {
                return strA > strB ? -1 : strA < strB ? 1 : 0;
            }
        });
        
        return new p5.prototype.chart.DataFrame(sortedRows, this._columns);
    }
  };

  p5.prototype.createDataFrame = function(data, cols) { 
    return new this.chart.DataFrame(data, cols); 
  };

  // Ultra-simple loadDataFrame - just wraps loadTable and auto-converts
  p5.prototype.loadDataFrame = function(path, callback) {
    const p = this;
    
    // Use loadTable and return it - p5 handles preload
    const table = p.loadTable(path, 'csv', 'header', function() {
      if (typeof callback === 'function') {
        const df = p.tableToDataFrame(table);
        callback(df);
      }
    });
    
    // Return a proxy that converts to DataFrame on access
    return new Proxy(table, {
      get(target, prop) {
        if (prop === '_rows' || prop === '_columns' || typeof prop === 'string') {
          // Once loaded, convert and use DataFrame
          if (target.getRowCount() > 0) {
            const df = p.tableToDataFrame(target);
            return df[prop];
          }
        }
        return target[prop];
      }
    });
  };
  
  // Helper to convert p5.Table to DataFrame, or load CSV directly
  p5.prototype.tableToDataFrame = function(pathOrTable, type, options) {
    const p = this;
    
    // If first argument is a string (path), load the CSV first
    if (typeof pathOrTable === 'string') {
      const df = new this.chart.DataFrame([]);
      
      p.loadTable(pathOrTable, type || 'csv', options || 'header', function(table) {
        const loadedDf = p.tableToDataFrame(table);
        df._rows = loadedDf._rows;
        df._columns = loadedDf._columns;
      });
      
      return df;
    }
    
    // Otherwise, convert existing p5.Table to DataFrame
    const table = pathOrTable;
    const columns = table.columns;
    const data = [];
    
    for (let i = 0; i < table.getRowCount(); i++) {
      let row = table.getRow(i);
      let obj = {};
      columns.forEach(col => {
        let val = row.get(col);
        // Auto-convert numbers
        if (val !== null && val !== '' && !isNaN(Number(val))) {
          val = Number(val);
        }
        obj[col] = val;
      });
      data.push(obj);
    }
    
    return new this.chart.DataFrame(data, columns);
  };
  
  // Register as a preload method
  p5.prototype.registerPreloadMethod('loadDataFrame', p5.prototype);

  // ==========================================
  // 2. UTILS
  // ==========================================

  function getColor(p, i, customPalette) {
    const pal = customPalette && Array.isArray(customPalette) && customPalette.length > 0
        ? customPalette
        : p.chart.palette || ["#395B64", "#A5C9CA", "#E7F6F2", "#2C3333", "#FF8B8B", "#EB4747", "#ABC9FF", "#FFD966"];

    if (p.debug || (customPalette && customPalette.debug)) {
        console.log("Using palette:", pal);
        console.log("Returning color at index", i, ":", pal[i % pal.length]);
    }

    return pal[i % pal.length];
  }

  /**
   * Calculate nice tick interval for axes
   * Returns a "nice" number (1, 2, 5 * 10^n) for the given range
   * @param {number} range - The data range (max - min)
   * @param {number} targetTicks - Target number of ticks (default 5)
   * @returns {number} Nice interval value
   */
  function niceInterval(range, targetTicks = NUM_TICKS) {
    if (range === 0) return 1;
    const roughInterval = range / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
    const normalized = roughInterval / magnitude;
    
    // Choose nice number: 1, 2, 5, or 10
    let niceFactor;
    if (normalized <= 1) niceFactor = 1;
    else if (normalized <= 2) niceFactor = 2;
    else if (normalized <= 5) niceFactor = 5;
    else niceFactor = 10;
    
    return niceFactor * magnitude;
  }

  /**
   * Calculate nice axis bounds and tick values
   * @param {number} dataMin - Minimum value in data
   * @param {number} dataMax - Maximum value in data
   * @param {number} targetTicks - Target number of ticks
   * @returns {Object} { min, max, interval, ticks }
   */
  function niceAxisBounds(dataMin, dataMax, targetTicks = NUM_TICKS) {
    const range = dataMax - dataMin;
    const interval = niceInterval(range, targetTicks);
    
    const niceMin = Math.floor(dataMin / interval) * interval;
    const niceMax = Math.ceil(dataMax / interval) * interval;
    
    const ticks = [];
    for (let tick = niceMin; tick <= niceMax; tick += interval) {
      ticks.push(tick);
    }
    
    return { min: niceMin, max: niceMax, interval, ticks };
  }

  /**
   * Validates data for NaN/null values with consistent policy handling
   * @param {DataFrame} df - The DataFrame to validate
   * @param {Array<string>} columns - Columns to check for NaN values
   * @param {Object} options - Chart options including nanPolicy
   * @param {string} chartType - Type of chart (for logging)
   * @returns {Object} { hasNaN: boolean, nanCount: number, nanIndices: Array, cleanData: Array }
   */
  function validateData(df, columns, options = {}, chartType = 'chart') {
    const policy = options.nanPolicy || p5.prototype.chart.nanPolicy || 'warn';
    const rows = df.rows;
    
    let nanCount = 0;
    let nanIndices = [];
    let nanDetails = {}; // Track which columns have NaN
    
    rows.forEach((row, idx) => {
      let hasNaN = false;
      columns.forEach(col => {
        const val = row[col];
        if (val === null || val === '' || val === undefined || 
            (typeof val === 'number' && isNaN(val)) ||
            (typeof val === 'string' && isNaN(Number(val)) && val !== '')) {
          hasNaN = true;
          if (!nanDetails[col]) nanDetails[col] = 0;
          nanDetails[col]++;
        }
      });
      if (hasNaN) {
        nanCount++;
        nanIndices.push(idx);
      }
    });
    
    const hasNaN = nanCount > 0;
    
    // Handle based on policy
    if (hasNaN) {
      const detailsStr = Object.entries(nanDetails)
        .map(([col, count]) => `${col} (${count})`)
        .join(', ');
      
      if (policy === 'strict') {
        throw new Error(
          `[p5.chart.${chartType}] Data contains ${nanCount} row(s) with NaN/null values in columns: ${detailsStr}. ` +
          `Set nanPolicy: 'warn' or 'silent' to handle automatically.`
        );
      } else if (policy === 'warn') {
        console.warn(
          `[p5.chart.${chartType}] Data Quality Warning: ${nanCount} of ${rows.length} rows contain NaN/null values.`,
          `\n  Affected columns: ${detailsStr}`,
          `\n  These values will be handled according to chart type behavior.`,
          `\n  To suppress this warning, set nanPolicy: 'silent' in chart options.`,
          `\n  To throw an error instead, set nanPolicy: 'strict'.`
        );
      }
      // 'silent' mode: no output
    }
    
    return {
      hasNaN,
      nanCount,
      nanIndices,
      nanDetails,
      totalRows: rows.length,
      policy
    };
  }

  // ==========================================
  // RESPONSIVE LAYOUT HELPERS
  // ==========================================

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getCanvasElement(p) {
    return p.canvas || (p._renderer && p._renderer.elt) || null;
  }

  function getCanvasDisplayMetrics(p) {
    const elt = getCanvasElement(p);
    if (!elt || !elt.getBoundingClientRect) {
      return { left: 0, top: 0, width: p.width || 0, height: p.height || 0, scaleX: 1, scaleY: 1, scale: 1 };
    }
    const rect = elt.getBoundingClientRect();
    const scaleX = rect.width ? (p.width / rect.width) : 1;
    const scaleY = rect.height ? (p.height / rect.height) : 1;
    // scale: CSS pixels per canvas pixel (inverse of scaleX/scaleY)
    const cssPerCanvasX = rect.width && p.width ? (rect.width / p.width) : 1;
    const cssPerCanvasY = rect.height && p.height ? (rect.height / p.height) : 1;
    const cssPerCanvas = Math.min(cssPerCanvasX, cssPerCanvasY);

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      scaleX,
      scaleY,
      scale: cssPerCanvas
    };
  }

  function isMobileLayout(p, options = {}) {
    if (options && options.responsive === false) return false;
    if (options && options.mobilePadding === false) return false;
    if (options && options.mobilePadding === true) return true;
    const metrics = getCanvasDisplayMetrics(p);
    const displayW = metrics.width || p.width || 0;
    // Treat < 640px as mobile (Tailwind's sm breakpoint).
    return displayW > 0 && displayW < 640;
  }

  function getMobileRightPadding(p, options = {}) {
    if (!isMobileLayout(p, options)) return 0;
    return scalePx(p, options, 20, 8, 24);
  }

  function withMobileRightPadding(p, options, margin) {
    const m0 = margin || DEFAULT_MARGIN;
    const m = {
      top: m0.top || 0,
      right: m0.right || 0,
      bottom: m0.bottom || 0,
      left: m0.left || 0
    };
    const pad = getMobileRightPadding(p, options);
    if (pad > 0) m.right += pad;
    return m;
  }

  function ensureCanvasMatchesDisplay(p, options = {}) {
    const globalEnabled = p5.prototype.chart.autoFitCanvas !== false;
    const localEnabled = options.autoFitCanvas !== false;
    if (!globalEnabled || !localEnabled) return;
    if (!p || typeof p.resizeCanvas !== 'function') return;

    const elt = getCanvasElement(p);
    if (!elt || !elt.getBoundingClientRect) return;

    // Record the intended/original canvas size so we can restore it after shrinking.
    if (!p.chart._designCanvasSize) {
      p.chart._designCanvasSize = { w: p.width || 0, h: p.height || 0 };
    }
    const designW = Math.max(1, Math.round(p.chart._designCanvasSize.w || p.width || 1));
    const designH = Math.max(1, Math.round(p.chart._designCanvasSize.h || p.height || 1));

    // Determine available size from parent container (fallback to viewport).
    // Note: many pages don't give the canvas parent an explicit height; in that case
    // using parent height can incorrectly collapse the canvas. We only trust parent
    // height if it's reasonably sized.
    let availW = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : designW;
    let availH = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : designH;
    try {
      const parent = elt.parentElement;
      if (parent && parent.getBoundingClientRect) {
        const pr = parent.getBoundingClientRect();
        if (pr.width && pr.width > 0) availW = pr.width;
        // Only use parent height if it's explicitly constraining the layout.
        if (pr.height && pr.height >= 80) availH = pr.height;
      }
    } catch (e) {
      // ignore
    }

    // Fit to available space, but never grow beyond the design size.
    // This avoids “squish” (CSS scaling) while still allowing the canvas to return to normal.
    const targetW = Math.max(1, Math.round(Math.min(designW, availW)));
    const targetH = Math.max(1, Math.round(Math.min(designH, availH)));

    if (Math.abs((p.width || 0) - targetW) > 1 || Math.abs((p.height || 0) - targetH) > 1) {
      // Debounce per p5 instance to avoid repeated resize spam.
      if (!p.chart._lastAutoFit) p.chart._lastAutoFit = { w: 0, h: 0, frame: -1 };
      const last = p.chart._lastAutoFit;
      if (last.w === targetW && last.h === targetH && last.frame === p.frameCount) return;
      last.w = targetW;
      last.h = targetH;
      last.frame = p.frameCount;
      try {
        p.resizeCanvas(targetW, targetH);
      } catch (e) {
        // ignore
      }
    }
  }

  // Mobile-first scaling: returns 1 on typical desktop canvases and scales down on small canvases.
  // Can be disabled per-chart via { responsive: false }.
  function getResponsiveScale(p, options = {}) {
    if (options && options.responsive === false) return 1;
    if (options && typeof options.responsiveScale === 'number') {
      return clampNumber(options.responsiveScale, 0.4, 2);
    }

    // Prefer *displayed* canvas size (CSS pixels) so responsiveness works even when the
    // sketch uses a fixed createCanvas(...) but the canvas is scaled via CSS.
    const metrics = getCanvasDisplayMetrics(p);
    const displayW = metrics.width || ((options && options.width) ? options.width : p.width);
    const displayH = metrics.height || ((options && options.height) ? options.height : p.height);
    const minDim = Math.max(1, Math.min(displayW || 1, displayH || 1));

    // Keep default typography “normal” for common chart sizes (e.g. 600x400 where minDim=400),
    // and only scale down when the displayed canvas is actually smaller than that.
    const BASE_MIN_DIM = 400;
    if (minDim >= BASE_MIN_DIM) return 1;
    const displayScale = minDim / BASE_MIN_DIM;
    return clampNumber(displayScale, 0.6, 1);
  }

  function scalePx(p, options, px, min = 1, max = Infinity) {
    const s = getResponsiveScale(p, options);
    const v = Math.round(px * s);
    return clampNumber(v, min, max);
  }

  function getResponsiveMargin(p, options, baseMargin) {
    const s = getResponsiveScale(p, options);
    const baseW = (options && options.width) ? options.width : p.width;
    const baseH = (options && options.height) ? options.height : p.height;

    const m0 = baseMargin || DEFAULT_MARGIN;
    const m = {
      top: Math.round((m0.top || 0) * s),
      right: Math.round((m0.right || 0) * s),
      bottom: Math.round((m0.bottom || 0) * s),
      left: Math.round((m0.left || 0) * s)
    };

    // Keep margins usable on very small screens.
    const minMargin = 10;
    m.top = Math.max(minMargin, m.top);
    m.right = Math.max(minMargin, m.right);
    m.bottom = Math.max(minMargin, m.bottom);
    m.left = Math.max(minMargin, m.left);

    // Ensure space for titles and footer/axis labels.
    const needsTop = !!(options && (options.title || options.subtitle));
    const topMin = needsTop ? Math.round(50 * s) : Math.round(18 * s);
    m.top = Math.max(m.top, topMin);

    const needsBottom = !!(options && (options.xLabel || options.yLabel || options.source || options.author));
    const bottomMin = needsBottom ? Math.round(60 * s) : Math.round(18 * s);
    m.bottom = Math.max(m.bottom, bottomMin);

    // Prevent margins from swallowing the plot area.
    const maxLR = Math.max(40, Math.floor((baseW || 0) * 0.32));
    const maxTB = Math.max(40, Math.floor((baseH || 0) * 0.36));
    m.left = Math.min(m.left, maxLR);
    m.right = Math.min(m.right, maxLR);
    m.top = Math.min(m.top, maxTB);
    m.bottom = Math.min(m.bottom, maxTB);

    return m;
  }

  function drawMeta(p, opts, w, h) {
      p.push();
      p.noStroke();
      p.textFont(opts.font || DEFAULT_FONT);

      const scale = (opts && typeof opts._responsiveScale === 'number')
        ? opts._responsiveScale
        : getResponsiveScale(p, opts);
      let titleSize = (opts && opts.titleSize) ? opts.titleSize : Math.round(TITLE_SIZE * scale);
      let subtitleSize = (opts && opts.subtitleSize) ? opts.subtitleSize : Math.round(SUBTITLE_SIZE * scale);
      const axisLabelSize = (opts && opts.axisLabelSize) ? opts.axisLabelSize : Math.round(AXIS_LABEL_SIZE * scale);
      const sourceAuthorSize = (opts && opts.sourceAuthorSize) ? opts.sourceAuthorSize : Math.round(SOURCE_AUTHOR_SIZE * scale);

      const titleOffsetY = -Math.round(30 * scale);
      const subtitleOffsetY = -Math.round(12 * scale);
      const yLabelOffsetX = -Math.round(30 * scale);
      const xLabelOffsetY = Math.round(40 * scale);

      p.drawingContext.font = 'bold ' + titleSize + 'px Roboto, sans-serif';
      
      const align = opts.textAlign || p.LEFT;
      let xPos = 0;
      if (align === p.CENTER) xPos = w/2;
      if (align === p.RIGHT) xPos = w;

      // Auto-fit title/subtitle font sizes to available width (prevents clipping on mobile).
      // Can be disabled via { titleAutoFit: false } / { subtitleAutoFit: false }.
      const metaPad = Math.round(10 * scale);
      const maxMetaW = Math.max(10, w - metaPad * 2);
      if (opts.title && opts.titleAutoFit !== false && !(opts && opts.titleSize)) {
        p.textSize(titleSize);
        p.textStyle(p.BOLD);
        let guard = 0;
        while (p.textWidth(String(opts.title)) > maxMetaW && titleSize > 11 && guard++ < 20) {
          titleSize -= 1;
          p.textSize(titleSize);
        }
      }
      if (opts.subtitle && opts.subtitleAutoFit !== false && !(opts && opts.subtitleSize)) {
        p.textSize(subtitleSize);
        p.textStyle(opts.subtitleBold ? p.BOLD : p.NORMAL);
        let guard = 0;
        while (p.textWidth(String(opts.subtitle)) > maxMetaW && subtitleSize > 10 && guard++ < 20) {
          subtitleSize -= 1;
          p.textSize(subtitleSize);
        }
      }
      
      if (opts.title) {
          p.fill(TEXT_COLOR); 
          p.textSize(titleSize);
          p.textStyle(p.BOLD);
          p.drawingContext.fontWeight = 'bold';
          p.textAlign(align, p.BOTTOM); 
          p.text(opts.title, xPos, titleOffsetY);
      }
      if (opts.subtitle) {
          p.drawingContext.font = (opts.subtitleBold ? 'bold' : 'normal') + ' ' + subtitleSize + 'px Roboto, sans-serif';
          p.fill(SUBTEXT_COLOR); p.textSize(subtitleSize);
          p.textStyle(opts.subtitleBold ? p.BOLD : p.NORMAL);
          p.textAlign(align, p.BOTTOM); p.text(opts.subtitle, xPos, subtitleOffsetY);
      }
      if (opts.source || opts.author) {
          p.fill(SUBTEXT_COLOR); p.textSize(sourceAuthorSize);
          p.textAlign(p.LEFT, p.TOP);
          let footerText = "";
          if (opts.source) footerText += `Source: ${opts.source}`;
          if (opts.author) {
              if (opts.source) footerText += "  |  "; // Add spacing between source and author
              footerText += `Chart: ${opts.author}`;
          }
          const footerY = (opts.xLabel || opts.yLabel) ? (h + Math.round(50 * scale)) : (h + Math.round(30 * scale));
          p.text(footerText, 0, footerY);
      }
      
        // X-axis label
        if (opts.xLabel) {
          p.drawingContext.font = 'normal ' + axisLabelSize + 'px Roboto, sans-serif';
          p.fill(TEXT_COLOR); p.textSize(axisLabelSize); p.textStyle(p.NORMAL);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.text(opts.xLabel, w/2, h + xLabelOffsetY);
        }
      
        // Y-axis label
        if (opts.yLabel) {
          p.drawingContext.font = 'normal ' + axisLabelSize + 'px Roboto, sans-serif';
          p.fill(TEXT_COLOR); p.textSize(axisLabelSize); p.textStyle(p.NORMAL);
          p.push();
          p.translate(yLabelOffsetX, h/2);
          p.rotate(-p.HALF_PI);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.text(opts.yLabel, 0, 0);
          p.pop();
        }
      
      p.pop();
  }

  // Global hover state for ALL charts in this sketch
  p5.prototype.chart.hoverState = { active: false, x: 0, y: 0, content: [] };

  // Helper for rect hover in *global* coordinates
  function rectHover(p, gx, gy, w, h, content) {
    if (p.mouseX >= gx && p.mouseX <= gx + w && p.mouseY >= gy && p.mouseY <= gy + h) {
      p.chart.hoverState = { active: true, x: p.mouseX, y: p.mouseY, content: content };
      p.cursor(p.HAND);
      return true;
    }
    return false;
  }

  function drawTooltip(p) {
    const h = p.chart.hoverState;
    if (!h.active || !h.content || h.content.length === 0) {
      p.cursor(p.ARROW);
      // reset for next frame
      p.chart.hoverState.active = false;
      return;
    }
    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 220); // Using TOOLTIP_BG_COLOR concept
    p.rectMode(p.CORNER);

    const canvasScale = clampNumber(Math.min(p.width, p.height) / 700, 0.6, 1);
    const tipTextSize = Math.round(TOOLTIP_TEXT_SIZE * canvasScale);
    const tipPad = Math.round(TOOLTIP_PADDING * canvasScale);
    const tipLineH = Math.round(TOOLTIP_LINE_HEIGHT * canvasScale);
    const tipOffset = Math.round(TOOLTIP_OFFSET * canvasScale);
    const tipRadius = Math.round(TOOLTIP_BORDER_RADIUS * canvasScale);

    p.textSize(tipTextSize);
    p.textFont(DEFAULT_FONT);
    
    let maxWidth = 0;
    h.content.forEach(l => { 
      let w = p.textWidth(l); 
      if (w > maxWidth) maxWidth = w; 
    });
    let boxW = maxWidth + (tipPad * 2);
    let boxH = h.content.length * tipLineH + tipPad;
    
    let tx = h.x + tipOffset;
    let ty = h.y + tipOffset;
    if (tx + boxW > p.width) tx = h.x - boxW - tipOffset;
    if (ty + boxH > p.height) ty = h.y - boxH - tipOffset;
    
    p.translate(tx, ty); 
    p.rect(0, 0, boxW, boxH, tipRadius);
    p.fill(255); // TOOLTIP_TEXT_COLOR
    p.textAlign(p.LEFT, p.TOP);
    h.content.forEach((l, i) => p.text(l, tipPad, Math.round(8 * canvasScale) + i * tipLineH));
    p.pop();

    // reset so next frame recomputes
    p.chart.hoverState.active = false;
  }

  // Draw tooltip *after* all user drawing each frame
  p5.prototype._drawChartTooltip = function() {
    drawTooltip(this);
  };
  p5.prototype.registerMethod('post', p5.prototype._drawChartTooltip);

  function truncate(p, str, w) {
    str = String(str);
    if (p.textWidth(str) <= w) return str;
    let len = str.length;
    while (p.textWidth(str + "...") > w && len > 0) {
      str = str.substring(0, len - 1); len--;
    }
    return str + "...";
  }
  
  p5.prototype._cleanupChart = function() {
      for (let id in p5.prototype.chart.inputs) {
          if (p5.prototype.chart.inputs[id]) p5.prototype.chart.inputs[id].remove();
      }
      p5.prototype.chart.inputs = {};
  };
  p5.prototype.registerMethod('remove', p5.prototype._cleanupChart);

  // ==========================================
  // 3. BAR CHART
  // ==========================================
  
  /**
   * Creates a bar chart
   * NaN Handling: Bars with NaN values are SKIPPED (not rendered).
   * A warning is logged showing which rows/values are missing.
   * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
   */
  p5.prototype.bar = function(data, options = {}) {
    const p = this;
    ensureCanvasMatchesDisplay(p, options);
    let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
    
    const orient = options.orientation || 'horizontal';
    const stacked = options.mode === 'stacked';
    const labelCol = options.x || options.category || df.columns[0];
    let valCols = options.y || options.values || [df.columns[1]];
    if (!Array.isArray(valCols)) valCols = [valCols];
    
    // Validate data for NaN values
    const validation = validateData(df, valCols, options, 'bar');
    
    const labelPos = options.labelPos || 'auto';
    const labels = df.col(labelCol);
    const rows = df.rows;

    // Calculate label space dynamically for horizontal bars
    let labelSpace = options.labelSpace;
    if (!labelSpace && orient === 'horizontal') {
      const labelMeasureSize = scalePx(p, options, 12, 8, 16);
      p.textSize(labelMeasureSize);
      p.textFont(options.font || DEFAULT_FONT);
      let maxLabelWidth = 0;
      labels.forEach(lbl => {
        let lblWidth = p.textWidth(String(lbl));
        if (lblWidth > maxLabelWidth) maxLabelWidth = lblWidth;
      });
      labelSpace = maxLabelWidth + scalePx(p, options, 20, 10, 40); // padding
    } else if (!labelSpace) {
      labelSpace = scalePx(p, options, 70, 40, 120); // Default for vertical
    }
    
    if (options.xLabel === undefined) options.xLabel = labelCol;
    if (options.yLabel === undefined) options.yLabel = Array.isArray(valCols) ? valCols.join(', ') : valCols;
    if (options.title === undefined) options.title = df.columns.join(' vs. ');
    const leftMargin = options.yLabel ? scalePx(p, options, 50, 0, 120) : 0;
    const baseMargin = { top: DEFAULT_MARGIN.top, right: DEFAULT_MARGIN.right, bottom: DEFAULT_MARGIN.bottom, left: leftMargin };
    const margin0 = options.margin || getResponsiveMargin(p, options, baseMargin);
    const margin = withMobileRightPadding(p, options, margin0);
    const canvasW = p.width;
    const canvasH = p.height;
    const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
    const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;
    const w = baseW - margin.left - margin.right;
    const h = baseH - margin.top - margin.bottom;

    const _responsiveScale = getResponsiveScale(p, options);
    const tickLen = scalePx(p, options, TICK_LENGTH, 3, 10);
    const tickLabelSize = scalePx(p, options, TICK_LABEL_SIZE, 8, 14);
    const axisLabelSize = scalePx(p, options, AXIS_LABEL_SIZE, 9, 16);
    const barLabelSize = scalePx(p, options, BAR_LABEL_SIZE, 8, 14);
    const tickTextOffset = scalePx(p, options, 8, 6, 12);

    p.push();
    p.translate(margin.left, margin.top);
    drawMeta(p, Object.assign({}, options, { _responsiveScale }), w, h);

    let maxVal = 0;
    rows.forEach(row => {
      let sum = stacked 
        ? valCols.reduce((acc, c) => acc + (Number(row[c])||0), 0)
        : Math.max(...valCols.map(c => Number(row[c])||0));
      if (sum > maxVal) maxVal = sum;
    });
    if (maxVal === 0) maxVal = 1;

    if (options.background !== undefined) {
      p.noStroke();
      p.fill(options.background);
      p.rect(0, 0, w, h);
    }

    if (orient === 'horizontal') {
        const rowH = h / labels.length;
        const barH = stacked ? (rowH * BAR_GAP_RATIO) : (rowH * BAR_GAP_RATIO / valCols.length);
        
        // Reserve space for labels on the left
        const barStartX = labelSpace;
        const barWidth = w - labelSpace;
        
        // Y-axis
        p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(barStartX, 0, barStartX, h);
        // X-axis with ticks
        p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(barStartX, h, w, h);
        p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
        for(let i = 0; i <= NUM_TICKS; i++) {
          let xVal = barStartX + (barWidth / NUM_TICKS) * i;
          p.line(xVal, h, xVal, h + tickLen);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.CENTER, p.TOP);
          p.text(Math.round((maxVal / NUM_TICKS) * i), xVal, h + tickTextOffset);
          p.stroke(TICK_COLOR);
        }
        
        labels.forEach((lbl, i) => {
            let yBase = i * rowH + (rowH * 0.1);
            let xStack = 0;
            valCols.forEach((col, j) => {
                let rawVal = rows[i][col];
                // Skip if NaN/null/empty
                if (rawVal === null || rawVal === '' || rawVal === undefined || 
                    (typeof rawVal === 'number' && isNaN(rawVal)) ||
                    (typeof rawVal === 'string' && isNaN(Number(rawVal)))) {
                    return; // Skip this bar
                }
                
                let val = Number(rawVal);
                let rectW = p.map(val, 0, maxVal, 0, barWidth);
                let rectX = barStartX + (stacked ? xStack : 0);
                if (stacked) xStack += rectW;
                let by = stacked ? yBase : yBase + (j * barH);
                
                // If 1 col, use 'i', if multiple, use 'j'
                let colorIndex = valCols.length > 1 ? j : i;
                let c = getColor(p, colorIndex, options.palette);
                
                let colColor = p.color(c);
                p.noStroke();
                p.fill(colColor);

                const gx = margin.left + rectX;
                const gy = margin.top + by;

                if (rectHover(p, gx, gy, rectW, barH, [`${lbl}`, `${col}: ${val}`])) {
                  let hoverColor = p.color(c);
                  hoverColor.setAlpha(200);
                  p.fill(hoverColor);
                }
                p.rect(rectX, by, rectW, barH);

                if (labelPos !== 'none') {
                  p.textSize(barLabelSize); p.textAlign(p.LEFT, p.CENTER);
                  let txt = String(val);
                  let tw = p.textWidth(txt);
                  // Use label color protection for all label positions
                  if (labelPos === 'inside') {
                    p.fill(getAutoLabelColor(c));
                    p.text(txt, rectX + rectW - tw - 5, by + barH/2);
                  } else if (labelPos === 'outside') {
                    p.fill(getAutoLabelColor(options.background || 255));
                    p.text(txt, rectX + rectW + 5, by + barH/2);
                  } else if (labelPos === 'bottom') {
                    p.fill(getAutoLabelColor(options.background || 255));
                    p.text(txt, rectX + 5, by + barH/2);
                  } else if (labelPos === 'auto') {
                    if (rectW > tw + 10) {
                      p.fill(getAutoLabelColor(c));
                      p.text(txt, rectX + rectW - tw - 5, by + barH/2);
                    } else {
                      p.fill(getAutoLabelColor(options.background || 255));
                      p.text(txt, rectX + rectW + 5, by + barH/2);
                    }
                  }
                }
            });
            p.fill(TEXT_COLOR); p.textAlign(p.RIGHT, p.CENTER); p.textSize(axisLabelSize);
            p.text(truncate(p, lbl, labelSpace - 10), barStartX - 10, i * rowH + rowH/2);
        });
    } else {
        const colW = w / labels.length;
        const barW = stacked ? (colW * BAR_GAP_RATIO) : (colW * BAR_GAP_RATIO / valCols.length);
        
        // X-axis
        p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(0, h, w, h);
        // Y-axis with ticks
        p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(0, 0, 0, h);
        p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
        for(let i = 0; i <= NUM_TICKS; i++) {
          let yVal = h - (h / NUM_TICKS) * i;
          p.line(-tickLen, yVal, 0, yVal);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.RIGHT, p.CENTER);
          p.text(Math.round((maxVal / NUM_TICKS) * i), -8, yVal);
          p.stroke(TICK_COLOR);
        }
        labels.forEach((lbl, i) => {
            let xBase = i * colW + (colW * 0.1);
            let yStack = h;
            valCols.forEach((col, j) => {
                let rawVal = rows[i][col];
                // Skip if NaN/null/empty
                if (rawVal === null || rawVal === '' || rawVal === undefined || 
                    (typeof rawVal === 'number' && isNaN(rawVal)) ||
                    (typeof rawVal === 'string' && isNaN(Number(rawVal)))) {
                    return; // Skip this bar
                }
                
                let val = Number(rawVal);
                let rectH = p.map(val, 0, maxVal, 0, h);
                let rectY = stacked ? (yStack - rectH) : (h - rectH);
                if (stacked) yStack -= rectH;
                let bx = stacked ? xBase : xBase + (j * barW);
                
                // If 1 col, use 'i', if multiple, use 'j'
                let colorIndex = valCols.length > 1 ? j : i;
                let c = getColor(p, colorIndex, options.palette);

                let colColor = p.color(c);
                p.noStroke();
                p.fill(colColor);

                const gx = margin.left + bx;
                const gy = margin.top + rectY;

                if (rectHover(p, gx, gy, barW, rectH, [`${lbl}`, `${col}: ${val}`])) {
                  let hoverColor = p.color(c);
                  hoverColor.setAlpha(200);
                  p.fill(hoverColor);
                }

                p.rect(bx, rectY, barW, rectH);

                if (labelPos !== 'none') {
                  p.textSize(barLabelSize); p.textAlign(p.CENTER, p.BOTTOM);
                  let txt = String(val);
                  // Use label color protection for all label positions
                  if (labelPos === 'inside') {
                    p.fill(getAutoLabelColor(c));
                    p.text(txt, bx + barW/2, rectY + rectH - 5);
                  } else if (labelPos === 'outside') {
                    p.fill(getAutoLabelColor(options.background || 255));
                    p.text(txt, bx + barW/2, rectY - 2);
                  } else if (labelPos === 'bottom') {
                    p.fill(getAutoLabelColor(options.background || 255));
                    p.text(txt, bx + barW/2, rectY + rectH + 2);
                  } else if (labelPos === 'auto') {
                    if (rectH > 20) {
                      p.fill(getAutoLabelColor(c));
                      p.text(txt, bx + barW/2, rectY + rectH - 5);
                    } else {
                      p.fill(getAutoLabelColor(options.background || 255));
                      p.text(txt, bx + barW/2, rectY - 2);
                    }
                  }
                }
            });
            let centerX = i * colW + colW/2;
            p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
            p.line(centerX, h, centerX, h + tickLen);
            p.noStroke();
            p.fill(TEXT_COLOR); p.textAlign(p.CENTER, p.TOP); p.textSize(axisLabelSize);
            p.text(truncate(p, lbl, colW), centerX, h + scalePx(p, options, 10, 8, 14));
        });
    }
    p.pop();
  };

  // ==========================================
  // 4. PIE CHART 
  // ==========================================
  
  /**
   * Creates a pie/donut chart
   * NaN Handling: Pie charts are STRICT by default - will display error message if NaN values exist.
   * This prevents misleading visualizations where percentages don't add up to 100%.
   * Set nanPolicy: 'warn' to filter out NaN values and render remaining data (with warning).
   * Set nanPolicy: 'silent' to filter out NaN values silently.
   */
  p5.prototype.pie = function(data, options = {}) {
    const p = this;
    ensureCanvasMatchesDisplay(p, options);
    let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
    
    const valCol = options.value || df.columns[1];
    const lblCol = options.label || df.columns[0];
    
    // Validate data for NaN values - pie charts default to STRICT
    const pieOptions = Object.assign({}, options);
    if (pieOptions.nanPolicy === undefined) {
        pieOptions.nanPolicy = 'strict'; // Pie charts are strict by default
    }
    
    // Data Processing
    const allValues = df.col(valCol).map(Number);
    const allLabels = df.col(lblCol);
    
    // Check for NaN values
    const nanIndices = [];
    allValues.forEach((v, i) => {
        if (isNaN(v)) nanIndices.push(i);
    });
    
    if (nanIndices.length > 0) {
        const policy = pieOptions.nanPolicy;
        
        if (policy === 'strict') {
            // Display error message on canvas instead of rendering
            p.push();
            p.fill(255, 240, 240);
            p.stroke(180, 0, 0);
            p.strokeWeight(2);
            p.rect(0, 0, p.width, p.height);
            
            p.fill(180, 0, 0);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(scalePx(p, options, 16, 11, 18));
            p.text('Pie Chart Error: NaN Values Detected', p.width/2, p.height/2 - 40);
            
            p.textSize(scalePx(p, options, 12, 10, 14));
            p.fill(100, 0, 0);
            p.text(`${nanIndices.length} of ${allValues.length} values in '${valCol}' are NaN/null.`, p.width/2, p.height/2);
            p.text(`Pie charts cannot render with missing values.`, p.width/2, p.height/2 + 20);
            p.text(`Set nanPolicy: 'warn' or 'silent' to filter out NaN values.`, p.width/2, p.height/2 + 40);
            p.pop();
            
            console.error(
                `[p5.chart.pie] Cannot render pie chart: ${nanIndices.length} NaN values in column '${valCol}'.`,
                `\n  Affected rows: ${nanIndices.join(', ')}`,
                `\n  Set nanPolicy: 'warn' or 'silent' in options to filter out NaN values automatically.`
            );
            return; // Don't render the chart
        } else if (policy === 'warn') {
            console.warn(
                `[p5.chart.pie] Data Quality Warning: ${nanIndices.length} of ${allValues.length} values are NaN/null.`,
                `\n  Column: ${valCol}`,
                `\n  Affected rows: ${nanIndices.join(', ')}`,
                `\n  These values will be filtered out. Percentages based on ${allValues.length - nanIndices.length} valid values.`
            );
        }
        // 'silent' mode: no output
    }
    
    // Filter out NaN values for 'warn' and 'silent' modes
    const values = [];
    const labels = [];
    allValues.forEach((v, i) => {
        if (!isNaN(v)) {
            values.push(v);
            labels.push(allLabels[i]);
        }
    });
    
    if (values.length === 0) {
        p.push();
        p.fill(255, 240, 240);
        p.rect(0, 0, p.width, p.height);
        p.fill(180, 0, 0);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('No valid data to display', p.width/2, p.height/2);
        p.pop();
        return;
    }
    
    const total = values.reduce((a,b) => a+b, 0);
    
    // Layout & Config
    options.textAlign = options.textAlign || p.LEFT;

    const baseMargin = { top: DEFAULT_MARGIN.top, right: DEFAULT_MARGIN.right, bottom: 40, left: DEFAULT_MARGIN.right };
    const margin0 = options.margin || getResponsiveMargin(p, options, baseMargin);
    const margin = withMobileRightPadding(p, options, margin0);
    const canvasW = p.width;
    const canvasH = p.height;
    const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
    const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;
    const w = baseW - margin.left - margin.right;
    const h = baseH - margin.top - margin.bottom;
    const cx = w/2; 
    const cy = h/2;
    const r = options.radius || Math.min(w, h) / 2.5;

    const _responsiveScale = getResponsiveScale(p, options);
    const pieLabelSize = scalePx(p, options, PIE_LABEL_SIZE, 9, 14);
    const pieOutsideOffset = isMobileLayout(p, options)
      ? scalePx(p, options, 18, 12, 26)
      : scalePx(p, options, 30, 18, 50);
    const pieVerticalShift = (options.labelPos === 'outside') ? scalePx(p, options, 20, 10, 40) : 0;
    
    // Style check
    const isDonut = options.style === 'donut';
    
    p.push();
    p.translate(margin.left, margin.top);
    
    // Auto title if not provided
    if (options.title === undefined) {
      options.title = `${lblCol} vs. ${valCol}`;
    }
    // Draw Metadata (Title, Subtitle, etc.), left-aligned
    let pieMetaOpts = Object.assign({}, options, { textAlign: p.LEFT, _responsiveScale });
    drawMeta(p, pieMetaOpts, w, h);
    
    // Shift the pie center down if outside labels are used to clear title space.
    p.translate(cx, cy + pieVerticalShift);
    
    let startA = -p.HALF_PI;
    
    values.forEach((v, i) => {
      let ang = (v/total)*p.TWO_PI;
      let endA = startA + ang;
      let c = getColor(p, i, options.palette);

      // Hover Detection (coordinates adjusted for the pie's new center)
      let mx = p.mouseX - (margin.left + cx);
      let my = p.mouseY - (margin.top + cy + pieVerticalShift);
      let d = p.dist(0, 0, mx, my);
      let mouseAng = p.atan2(my, mx);
        
      const norm = (a) => {
        a = a % p.TWO_PI;
        if (a < 0) a += p.TWO_PI;
        return a;
      };
      let am = norm(mouseAng);
      let a0 = norm(startA);
      let a1 = norm(endA);
      
      // Donut/Pie Hover Check
      let holeRadius = options.holeRadius || 0.6;
      let inRing = isDonut ? (d < r && d > r * holeRadius) : (d < r);
      
      let inAngle = (a0 <= a1) ? (am >= a0 && am <= a1) : (am >= a0 || am <= a1);
      let isHover = inRing && inAngle;

      // Draw Slice
      let colColor = p.color(c);
      p.stroke(options.lineColor || PIE_STROKE_COLOR); 
      p.strokeWeight(options.lineSize || PIE_STROKE_WEIGHT);

      if (isHover) {
        p.cursor(p.HAND);
        p.push();
        p.scale(PIE_HOVER_SCALE); 
        colColor.setAlpha(230);
        p.fill(colColor);
        p.arc(0, 0, r*2, r*2, startA, endA, p.PIE);
        p.pop();
        
        let pct = Math.round((v/total)*100);
        p.chart.hoverState = { 
            active: true, 
            x: p.mouseX, 
            y: p.mouseY, 
            content: [`${labels[i]}`, `${v} (${pct}%)`] 
        };
      } else {
        p.fill(colColor);
        p.arc(0, 0, r*2, r*2, startA, endA, p.PIE);
      }

      // Donut Hole Drawing
      if (isDonut) {
        let hole = options.holeRadius || DONUT_HOLE_RADIUS;
        p.fill(options.background || 255);
        p.noStroke();
        p.ellipse(0, 0, r*2*hole, r*2*hole);
      }

      // --- Draw Labels & Connectors ---
      if (options.labelPos !== 'none') {
          let mid = startA + ang/2;
          // Label anchor radius: further out if outside, centered in ring if donut
          let tr = (options.labelPos === 'outside') 
                   ? r + pieOutsideOffset
                   : r * (isDonut ? (1 + (options.holeRadius || DONUT_HOLE_RADIUS)) / 2 : 0.65); // Center of ring or 65% radius
                   
          let tx = Math.cos(mid) * tr;
          let ty = Math.sin(mid) * tr;
          
          let pct = Math.round((v/total)*100);
          let labelText = String(labels[i]);

          // Label Content Logic
          switch (options.labelContent) {
              case 'value': labelText = String(v); break;
              case 'percent': labelText = `${pct}%`; break;
              case 'name_value': labelText = `${labels[i]} (${v})`; break;
              case 'name_percent': labelText = `${labels[i]} (${pct}%)`; break;
              case 'all': case 'name_value_percent': labelText = `${labels[i]} (${v} | ${pct}%)`; break;
              default: break;
          }

          // --- 1. Draw Connector Line ---
          if (options.showConnectors && options.labelPos === 'outside') {
              const r_diag = r + 10;
              
              let x1 = Math.cos(mid) * r;
              let y1 = Math.sin(mid) * r;
              
              let x2 = Math.cos(mid) * r_diag;
              let y2 = Math.sin(mid) * r_diag;
              
              p.push();
              p.stroke(TEXT_COLOR); 
              p.strokeWeight(1);
              p.noFill();
              p.beginShape();
              p.vertex(x1, y1); // 1. Start on pie edge
              p.vertex(x2, y2); // 2. Elbow point
              p.vertex(tx, y2); // 3. Horizontal line to text anchor X (at elbow's Y level)
              p.endShape();
              p.pop();
          }
          // --- End Connector Line ---


          // 2. Positioning & Alignment Fix
          p.noStroke(); 
          p.textSize(options.labelSize || pieLabelSize);

          // On mobile, outline ALL pie/donut labels for a unified look.
          const outlineActive = isMobileLayout(p, options);
          const outlineW = scalePx(p, options, 2, 1, 3);
          
          if (options.labelPos === 'outside') {
              // Alignment fix: Anchor away from pie center
              let align = (tx > 0) ? p.LEFT : p.RIGHT;
              let buffer = (tx > 0) ? scalePx(p, options, 5, 3, 10) : -scalePx(p, options, 5, 3, 10);
              
              p.textAlign(align, p.CENTER);
              if (outlineActive) {
                p.stroke(255, 220);
                p.strokeWeight(outlineW);
              } else {
                p.noStroke();
              }
              p.fill(TEXT_COLOR);
              tx += buffer;

              // Keep outside labels within chart bounds (especially on mobile)
              const labelPad = scalePx(p, options, 6, 4, 10);
              const maxOutsideLabelW = (options.outsideLabelMaxWidth !== undefined)
                ? options.outsideLabelMaxWidth
                : Math.min(
                    scalePx(p, options, 140, 90, 180),
                    Math.max(70, Math.floor(w * (isMobileLayout(p, options) ? 0.26 : 0.32)))
                  );

              // Truncate outside labels too (previously only truncated inside labels)
              labelText = truncate(p, labelText, maxOutsideLabelW);
              const tw = p.textWidth(labelText);

              // tx is in local pie coords (after translating to center)
              if (align === p.LEFT) {
                tx = Math.min(tx, (cx - labelPad) - tw);
              } else {
                tx = Math.max(tx, (-cx + labelPad) + tw);
              }
          } else {
              p.textAlign(p.CENTER, p.CENTER); 
              // Contrast check for inside labels
              let sliceColor = p.color(c);
              let brightness = (p.red(sliceColor) * 299 + p.green(sliceColor) * 587 + p.blue(sliceColor) * 114) / 1000;
              const useDark = brightness > 150;
              if (outlineActive) {
                p.stroke(useDark ? 255 : 0, 200);
                p.strokeWeight(outlineW);
              } else {
                p.noStroke();
              }
              p.fill(useDark ? TEXT_COLOR : 255);
          }
          
          // 3. Truncation and Visibility
          let maxLabelW = (options.labelPos === 'outside') ? scalePx(p, options, 100, 70, 160) : Math.abs(tr * ang * 0.9);

            if (options.labelPos !== 'outside' && p.textWidth(labelText) > maxLabelW) {
             while (labelText.length > 2 && p.textWidth(labelText + '…') > maxLabelW) {
                 labelText = labelText.slice(0, -1);
             }
             labelText += '…';
          }

          // Hide label if slice is too small to fit text (only applicable to inside labels)
           if (options.labelPos === 'outside' || ang > 0.15) {
             p.text(labelText, tx, ty);
           }
      }
        
      startA = endA;
    });

    p.pop();
  };
  
// ==========================================
  // 5. LINE PLOT
  // ==========================================
  
  /**
   * Creates a line plot
   * NaN Handling: Creates BREAKS (gaps) in the line where NaN values occur.
   * Points with NaN are NOT drawn. A warning is logged showing affected data.
   * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
   */
  p5.prototype.linePlot = function(data, options = {}) {
      const p = this;
      ensureCanvasMatchesDisplay(p, options);
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      const xCol = options.x || df.columns[0];
      const yCols = Array.isArray(options.y) ? options.y : [options.y || df.columns[1]];
      
      // Validate data for NaN values
      const validation = validateData(df, yCols, options, 'linePlot');
      
      const margin0 = options.margin || getResponsiveMargin(p, options, DEFAULT_MARGIN);
      const margin = withMobileRightPadding(p, options, margin0);
      const canvasW = p.width;
      const canvasH = p.height;
      const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
      const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;
      const w = baseW - margin.left - margin.right;
      const h = baseH - margin.top - margin.bottom;

      const _responsiveScale = getResponsiveScale(p, options);
      const tickLen = scalePx(p, options, TICK_LENGTH, 3, 10);
      const tickLabelSize = scalePx(p, options, TICK_LABEL_SIZE, 8, 14);
      const dataLabelSize = scalePx(p, options, DATA_LABEL_SIZE, 9, 14);
      const pointStrokeW = scalePx(p, options, POINT_STROKE_WEIGHT, 1, 4);
      const pointHoverStrokeW = scalePx(p, options, POINT_HOVER_STROKE_WEIGHT, 1, 5);
      const tickTextOffset = scalePx(p, options, 8, 6, 12);
      
      const ptSz = options.pointSize || DEFAULT_POINT_SIZE;
      const lnSz = options.lineSize || DEFAULT_LINE_SIZE;
      const isHollow = options.pointStyle === 'hollow';
      const bgColor = options.background || 255;
      
      // OPTION: showValues
      // true    = Always visible (static)
      // "click" = Visible on click
      // false   = Hidden
      const showVals = options.showValues !== undefined ? options.showValues : false; 
      const lblPos = options.labelPos || 'auto';

      let allV = [];
      yCols.forEach(c => allV.push(...df.col(c).map(v => Number(v)||0)));
      if (allV.length === 0) return;
      const minV = Math.min(0, ...allV), maxV = Math.max(0, ...allV);
      
      if (options.xLabel === undefined) options.xLabel = xCol;
      if (options.yLabel === undefined) options.yLabel = yCols.join(', ');
        if (options.title === undefined) options.title = yCols.join(' vs. ');

      const xs = df.col(xCol);
      const rows = df.rows;
      
      p.push();
      p.translate(margin.left, margin.top);
      drawMeta(p, Object.assign({}, options, { _responsiveScale }), w, h);
      
      // Axes
      p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT);
      p.line(0, h, w, h); // X
      p.line(0, 0, 0, h); // Y
      
      // Calculate nice Y-axis bounds
      const yAxis = niceAxisBounds(minV, maxV);
      
      p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
          function formatTick(val) {
            let num = Number(val);
            if (isNaN(num)) return String(val);
            if (num === 0) return '0';
            let absVal = Math.abs(num);
            if (Number.isInteger(num)) return num.toFixed(0);
            let decimals = 0;
            while (absVal < 1 && absVal !== 0 && decimals < 10) {
              absVal *= 10;
              decimals++;
            }
            return num.toFixed(decimals);
          }
      // Y-Ticks (using nice intervals)
      yAxis.ticks.forEach(tickVal => {
          let yVal = p.map(tickVal, yAxis.min, yAxis.max, h, 0);
          p.line(-tickLen, yVal, 0, yVal);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.RIGHT, p.CENTER);
          p.text(formatTick(tickVal), -8, yVal);
          p.stroke(TICK_COLOR);
      });
      
      // X-Ticks (categorical - keep as is for now)
      const tickInterval = Math.max(1, Math.floor(xs.length / 8));
        for(let i = 0; i < xs.length; i += tickInterval) {
          let xVal = p.map(i, 0, xs.length-1, 0, w);
          p.stroke(TICK_COLOR); p.line(xVal, h, xVal, h + tickLen);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.CENTER, p.TOP);
          p.text(formatTick(xs[i]), xVal, h + tickTextOffset);
        }

      // Draw Lines
      yCols.forEach((col, i) => {
          let c = getColor(p, i, options.palette);
          p.stroke(c); p.strokeWeight(lnSz); p.noFill();
          p.beginShape();
          xs.forEach((xVal, j) => {
              let val = rows[j][col];
              // Check for NaN/null/empty - create break in line
              if (val === null || val === '' || val === undefined || 
                  (typeof val === 'number' && isNaN(val)) ||
                  (typeof val === 'string' && isNaN(Number(val)))) {
                  p.endShape(); // End current line segment
                  p.beginShape(); // Start new segment after gap
                  return;
              }
              let px = p.map(j, 0, xs.length-1, 0, w);
              let py = p.map(Number(val), yAxis.min, yAxis.max, h, 0);
              p.vertex(px, py);
          });
          p.endShape();
      });

      // Draw Points & Labels
      if (options.dots !== false) {
          yCols.forEach((col, i) => {
              let c = getColor(p, i, options.palette);
              
              xs.forEach((xVal, j) => {
                  let val = Number(rows[j][col]);
                  if (isNaN(val)) return;
                  
                  let px = p.map(j, 0, xs.length-1, 0, w);
                  let py = p.map(val, yAxis.min, yAxis.max, h, 0);
                  
                  let d = p.dist(p.mouseX-margin.left, p.mouseY-margin.top, px, py);
                  let isHover = d < (ptSz + 4);
                  let isClicked = isHover && p.mouseIsPressed;

                  // 1. Draw Dot
                  p.strokeWeight(isHollow ? pointStrokeW : 0);
                  if (isHollow) { p.stroke(c); p.fill(bgColor); } 
                  else { p.noStroke(); p.fill(c); }

                  if (isHover) {
                      p.cursor(p.HAND);
                      if(isHollow) p.strokeWeight(pointHoverStrokeW);
                      else { let hc = p.color(c); hc.setAlpha(HOVER_ALPHA); p.fill(hc); p.circle(px, py, ptSz * POINT_HOVER_SCALE); }
                      
                      // Only show tooltip if NOT showing static labels
                      if (showVals !== true) {
                           p.chart.hoverState = { active: true, x: p.mouseX, y: p.mouseY, content: [`${col}`, `${val}`] };
                      }
                  } 
                  if (!isHover || isHollow) p.circle(px, py, ptSz);

                  // 2. Draw Label (Static or Interaction)
                  let drawThisLabel = false;
                  
                  // A. Static Mode: Always show
                  if (showVals === true) drawThisLabel = true;
                  
                  // B. Click Mode: Show only on click
                  else if (showVals === 'click' && isClicked) drawThisLabel = true;

                    if (drawThisLabel) {
                      p.noStroke();
                      // Use label color protection: auto choose black/white for contrast with point color
                      let labelBg = c;
                      p.fill(getAutoLabelColor(labelBg));
                      p.textSize(dataLabelSize);
                      p.textAlign(p.CENTER, p.CENTER);

                      let txt = String(val);
                      let offset = ptSz/2 + LABEL_OFFSET;
                      let ly = py - offset; // Default: Top

                      if (lblPos === 'bottom') {
                        ly = py + offset;
                      } else if (lblPos === 'auto') {
                        // Prevent going off top edge
                        if (py < 25) ly = py + offset; 
                        // Alternate for multiple lines to reduce overlap
                        else if (yCols.length > 1 && i % 2 !== 0) ly = py + offset;
                      }

                      p.text(txt, px, ly);
                    }
              });
          });
      }
      p.pop();
  };

// ==========================================
  // 6. SCATTER PLOT 
  // ==========================================

  /**
   * Creates a scatter plot
   * NaN Handling: Points with NaN in x or y are SKIPPED (not drawn).
   * A warning is logged showing how many points were skipped.
   * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
   */
  p5.prototype.scatter = function(data, options = {}) {
      const p = this;
      ensureCanvasMatchesDisplay(p, options);
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      const xCol = options.x || df.columns[0];
      const yCol = options.y || df.columns[1];
      
      // Validate data for NaN values
      const validation = validateData(df, [xCol, yCol], options, 'scatter');
      
      const margin0 = options.margin || getResponsiveMargin(p, options, DEFAULT_MARGIN);
      const margin = withMobileRightPadding(p, options, margin0);
      const canvasW = p.width;
      const canvasH = p.height;
      const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
      const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;
      const w = baseW - margin.left - margin.right;
      const h = baseH - margin.top - margin.bottom;

      const _responsiveScale = getResponsiveScale(p, options);
      const tickLen = scalePx(p, options, TICK_LENGTH, 3, 10);
      const tickLabelSize = scalePx(p, options, TICK_LABEL_SIZE, 8, 14);
      const dataLabelSize = scalePx(p, options, DATA_LABEL_SIZE, 9, 14);
      const pointStrokeW = scalePx(p, options, POINT_STROKE_WEIGHT, 1, 4);
      const pointHoverStrokeW = scalePx(p, options, POINT_HOVER_STROKE_WEIGHT, 1, 5);
      const tickTextOffset = scalePx(p, options, 8, 6, 12);

      // --- Data Extraction ---
      const rows = df.rows;
      const xs = df.col(xCol).map(Number);
      const ys = df.col(yCol).map(Number);
      if (xs.length === 0 || ys.length === 0) return;

      // Variable Size Logic
      let sizes = [];
      const sizeCol = options.size; // Column name for size
      let minS = 0, maxS = 0;
      if (sizeCol && rows[0][sizeCol] !== undefined) {
          sizes = df.col(sizeCol).map(Number);
          const validSizes = sizes.filter(s => !isNaN(s));
          if (validSizes.length > 0) {
              minS = Math.min(...validSizes);
              maxS = Math.max(...validSizes);
          }
      }
      const minPtSz = options.minSize || MIN_POINT_SIZE;
      const maxPtSz = options.maxSize || MAX_POINT_SIZE;
      const fixedPtSz = options.pointSize || DEFAULT_POINT_SIZE_SCATTER;

      // Variable Color Logic
      let colors = [];
      const colorCol = options.color; // Column name for color
      let colorDomain = []; // For categorical mapping
      let minC = 0, maxC = 0; // For numerical mapping
      let isColorNumeric = false;
      
      if (colorCol && rows[0][colorCol] !== undefined) {
          // Check type of first non-null value
          let sample = rows.find(r => r[colorCol] !== null && r[colorCol] !== "")[colorCol];
          isColorNumeric = !isNaN(Number(sample));
          
          if (isColorNumeric) {
             let vals = df.col(colorCol).map(Number).filter(v => !isNaN(v));
             if (vals.length > 0) {
                 minC = Math.min(...vals);
                 maxC = Math.max(...vals);
             }
          } else {
             // Unique categories
             colorDomain = [...new Set(df.col(colorCol))];
          }
      }

      // Bounds (default to include 0,0) - filter out NaN values
      const validXs = xs.filter(x => !isNaN(x));
      const validYs = ys.filter(y => !isNaN(y));
      const minX = (options.minX !== undefined) ? options.minX : (validXs.length > 0 ? Math.min(0, ...validXs) : 0);
      const maxX = (options.maxX !== undefined) ? options.maxX : (validXs.length > 0 ? Math.max(0, ...validXs) : 1);
      const minY = (options.minY !== undefined) ? options.minY : (validYs.length > 0 ? Math.min(0, ...validYs) : 0);
      const maxY = (options.maxY !== undefined) ? options.maxY : (validYs.length > 0 ? Math.max(0, ...validYs) : 1);

      // Defaults
      if (options.xLabel === undefined) options.xLabel = xCol;
      if (options.yLabel === undefined) options.yLabel = yCol;
      if (options.title === undefined) options.title = `${yCol} vs. ${xCol}`;

      // Config
      const isHollow = options.pointStyle === 'hollow';
      const bgColor = options.background || 255;
      const showVals = options.showValues !== undefined ? options.showValues : false;
      const lblPos = options.labelPos || 'auto';
      const palette = options.palette || p.chart.palette;

      p.push();
      p.translate(margin.left, margin.top);
      drawMeta(p, Object.assign({}, options, { _responsiveScale }), w, h);
      
      // --- Axes ---
      p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT);
      p.line(0, h, w, h); // X
      p.line(0, 0, 0, h); // Y
      
      // Calculate nice tick intervals
      const xAxis = niceAxisBounds(minX, maxX);
      const yAxis = niceAxisBounds(minY, maxY);
      
      // Ticks Helper
      function formatTick(val) {
        if (val === 0) return '0';
        let absVal = Math.abs(val);
        if (Number.isInteger(val)) return val.toFixed(0);
        if (absVal > 1000) return (val/1000).toFixed(1) + 'k';
        let decimals = 0;
        while (absVal < 1 && absVal !== 0 && decimals < 5) { absVal *= 10; decimals++; }
        return val.toFixed(decimals);
      }

      // X-Ticks (using nice intervals)
      p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
      xAxis.ticks.forEach(tickVal => {
        let xVal = p.map(tickVal, xAxis.min, xAxis.max, 0, w);
        p.line(xVal, h, xVal, h + tickLen);
        p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.CENTER, p.TOP);
        p.text(formatTick(tickVal), xVal, h + tickTextOffset);
        p.stroke(TICK_COLOR);
      });
      
      // Y-Ticks (using nice intervals)
      yAxis.ticks.forEach(tickVal => {
        let yVal = p.map(tickVal, yAxis.min, yAxis.max, h, 0);
        p.stroke(TICK_COLOR); p.line(-tickLen, yVal, 0, yVal);
        p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.RIGHT, p.CENTER);
        p.text(formatTick(tickVal), -8, yVal);
        p.stroke(TICK_COLOR);
      });

      // --- Connect Lines  ---
      if (options.connect) {
          let lineC = options.lineColor || palette[0];
          p.noFill(); p.stroke(lineC); p.strokeWeight(options.lineSize || DEFAULT_LINE_SIZE);
          p.beginShape();
          // Note: connecting assumes order in data array. 
          // If you need sorted, sort the DataFrame before passing.
          for(let i=0; i<xs.length; i++) {
             let cx = p.map(xs[i], xAxis.min, xAxis.max, 0, w);
             let cy = p.map(ys[i], yAxis.min, yAxis.max, h, 0);
             p.vertex(cx, cy);
          }
          p.endShape();
      }
      
      // --- Scatter Points ---
      p.noStroke(); 
      const baseColor = options.baseColor || palette[0];
      
      for(let i=0; i<xs.length; i++) {
          // Skip if x or y is NaN
          if (isNaN(xs[i]) || isNaN(ys[i])) continue;
          
          let cx = p.map(xs[i], xAxis.min, xAxis.max, 0, w);
          let cy = p.map(ys[i], yAxis.min, yAxis.max, h, 0);
          
          // 1. Determine Radius
          let r = fixedPtSz;
          if (sizeCol && sizes[i] !== undefined && !isNaN(sizes[i])) {
             let norm = (sizes[i] - minS) / (maxS - minS || 1);
             r = p.map(norm, 0, 1, minPtSz, maxPtSz);
          }

          // 2. Determine Color
          let ptColor = p.color(baseColor);
          if (colorCol) {
             let val = rows[i][colorCol];
             if (isColorNumeric) {
                 // Interpolate between first two palette colors
                 let norm = (Number(val) - minC) / (maxC - minC || 1);
                 let c1 = p.color(palette[0]);
                 let c2 = p.color(palette[1] || palette[0]);
                 ptColor = p.lerpColor(c1, c2, norm);
             } else {
                 // Categorical
                 let idx = colorDomain.indexOf(val);
                 if (idx === -1) idx = 0;
                 ptColor = p.color(getColor(p, idx, palette));
             }
          }

          // 3. Draw Point
          let d = p.dist(p.mouseX-margin.left, p.mouseY-margin.top, cx, cy);
          // Hit area includes radius + buffer
          let isHover = d < (r/2 + 4); 
          let isClicked = isHover && p.mouseIsPressed;

          // Style Setup
            p.strokeWeight(isHollow ? pointStrokeW : 0);
          if (isHollow) {
              p.stroke(ptColor); 
              p.fill(bgColor); 
          } else {
              p.noStroke(); 
              p.fill(ptColor);
          }

          // Hover State
          if (isHover) {
               p.cursor(p.HAND);
            if(isHollow) p.strokeWeight(pointHoverStrokeW);
               else { 
                   let hc = p.color(ptColor); 
                   hc.setAlpha(HOVER_ALPHA); 
                   p.fill(hc); 
                   p.circle(cx, cy, r * POINT_HOVER_SCALE); // Bloom effect
               }
               
               // Tooltip (only if values not static)
               if (showVals !== true) {
                   let content = [`X: ${xs[i]}`, `Y: ${ys[i]}`];
                   if (sizeCol) content.push(`${sizeCol}: ${sizes[i]}`);
                   if (colorCol) content.push(`${colorCol}: ${rows[i][colorCol]}`);
                   
                   p.chart.hoverState = { 
                     active: true, x: p.mouseX, y: p.mouseY, 
                     content: content
                   };
               }
          } 
          
          if (!isHover || isHollow) p.circle(cx, cy, r);

          // 4. Value Labels
          let drawLabel = false;
          if (showVals === true) drawLabel = true;
          else if (showVals === 'click' && isClicked) drawLabel = true;

          if (drawLabel) {
              p.noStroke();
              p.fill(TEXT_COLOR);
              p.textSize(dataLabelSize);
              p.textAlign(p.CENTER, p.CENTER);
              
              let txt = sizeCol ? String(sizes[i]) : String(ys[i]); 
              
              let offset = r/2 + (LABEL_OFFSET - 2);
              let ly = cy - offset;

              if (lblPos === 'bottom') ly = cy + offset;
              else if (lblPos === 'auto' && cy < 20) ly = cy + offset;

              p.text(txt, cx, ly);
          }
      }
      p.pop();
  };

// ==========================================
// 7. HISTOGRAM 
// ==========================================

/**
 * Creates a histogram
 * NaN Handling: Values are FILTERED OUT (excluded from binning).
 * A warning is logged showing how many values were removed.
 * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
 */
p5.prototype.hist = function(data, options = {}) {
    const p = this;
  ensureCanvasMatchesDisplay(p, options);
    let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
    const col = options.x || options.column || df.columns[0];
    
    // Validate data for NaN values BEFORE filtering
    const allVals = df.col(col);
    const originalCount = allVals.length;
    
    // --- Data Preparation (Binning) ---
    const vals = allVals.map(Number).filter(v => !isNaN(v));
    if (vals.length === 0) return;
    
    // Report filtered values if policy is 'warn'
    const filteredCount = originalCount - vals.length;
    if (filteredCount > 0) {
        const policy = options.nanPolicy || p5.prototype.chart.nanPolicy || 'warn';
        if (policy === 'strict') {
            throw new Error(
                `[p5.chart.hist] Data contains ${filteredCount} NaN/null values in column '${col}'. ` +
                `Set nanPolicy: 'warn' or 'silent' to handle automatically.`
            );
        } else if (policy === 'warn') {
            console.warn(
                `[p5.chart.hist] Data Quality Warning: ${filteredCount} of ${originalCount} values filtered out due to NaN/null.`,
                `\n  Column: ${col}`,
                `\n  Histogram will display ${vals.length} valid values.`,
                `\n  To suppress this warning, set nanPolicy: 'silent' in chart options.`
            );
        }
    }
    
    // Determine bounds and optimal bin size (Natural Bins)
    const requestedBins = options.bins || HIST_DEFAULT_BINS;
    const minRaw = Math.min(...vals);
    const maxRaw = Math.max(...vals);
    const span = maxRaw - minRaw;
    const roughBinWidth = span / requestedBins;
    
    const powersOf10 = Math.pow(10, Math.floor(Math.log10(roughBinWidth)));
    const factors = [1, 2, 5, 10];
    let step = powersOf10;
    
    for (const factor of factors) {
        if (factor * powersOf10 >= roughBinWidth) {
            step = factor * powersOf10;
            break;
        }
    }
    
    const minV = Math.floor(minRaw / step) * step;
    const maxV = Math.ceil(maxRaw / step) * step;
    const finalSpan = maxV - minV;
    const finalBins = Math.round(finalSpan / step);
    
    let counts = new Array(finalBins).fill(0);
    
    vals.forEach(v => {
        let idx = Math.floor((v - minV) / step);
        if (idx < 0) idx = 0;
        if (idx >= finalBins) idx = finalBins - 1;
        counts[idx]++;
    });

    const binEdges = Array.from({ length: finalBins + 1 }, (_, i) => minV + step * i);
    
    // --- Layout and Scaling ---
    const maxCount = Math.max(...counts);
    const margin0 = options.margin || getResponsiveMargin(p, options, DEFAULT_MARGIN);
    const margin = withMobileRightPadding(p, options, margin0);
    const canvasW = p.width;
    const canvasH = p.height;
    const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
    const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;
    const w = baseW - margin.left - margin.right;
    const h = baseH - margin.top - margin.bottom;

    const _responsiveScale = getResponsiveScale(p, options);
    const tickLen = scalePx(p, options, TICK_LENGTH, 3, 10);
    const tickLabelSize = scalePx(p, options, TICK_LABEL_SIZE, 8, 14);
    const histLabelSize = scalePx(p, options, HIST_LABEL_SIZE, 8, 14);
    const tickTextOffset = scalePx(p, options, 8, 6, 12);
    
    const maxAxisVal = Math.ceil(maxCount / 5) * 5;
    const barW = w / finalBins; 
    
    // 1. Determine Background Luminance for Contrast
    const bgColor = options.background || p.color(255); 
    const bg = p.color(bgColor);
    const bgLuminance = (p.red(bg) * 0.299 + p.green(bg) * 0.587 + p.blue(bg) * 0.114);
    
    // 2. Set Default Border Color for Reproducible Contrast
    const defaultContrastColor = (bgLuminance > 128) ? p.color('#333333') : p.color('#CCCCCC');
    
    const borderWeight = options.borderWeight || HIST_BORDER_WEIGHT;
    const borderColor = options.borderColor || defaultContrastColor; 
    const color = getColor(p, 0, options.palette);

    // Text color contrast for labels on top of bars
    const barColorLuminance = (p.red(p.color(color)) * 0.299 + p.green(p.color(color)) * 0.587 + p.blue(p.color(color)) * 0.114);
    const textColorContrast = (barColorLuminance > 128) ? TEXT_COLOR : p.color(255);

    const showLabels = options.showLabels !== undefined ? options.showLabels : true; 
    
    p.push();
    p.translate(margin.left, margin.top);
    
    // Metadata (Titles, Labels)
    options.xLabel = options.xLabel || col;
    options.yLabel = options.yLabel || "Count";
    options.title = options.title || `Histogram of ${col}`;
    
    p.textFont(options.font || DEFAULT_FONT);
    drawMeta(p, Object.assign({}, options, { _responsiveScale }), w, h);

    // --- Axes and Ticks ---
    p.textFont(options.font || DEFAULT_FONT);
    
    // X-axis (Base line)
    p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(0, h, w, h);
    
    // Y-axis (Vertical line)
    p.line(0, 0, 0, h); 
    
    // Calculate nice Y-axis bounds for count
    const yAxis = niceAxisBounds(0, maxCount);
    
    // Y-ticks (using nice intervals)
    p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
    yAxis.ticks.forEach(tickVal => {
        let yVal = p.map(tickVal, yAxis.min, yAxis.max, h, 0);
      p.line(-tickLen, yVal, 0, yVal);
        
        // Ensure Y-axis labels have no stroke
      p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize);
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(tickVal, -8, yVal);
        p.stroke(TICK_COLOR);
    });
    
    // X-Ticks (At Edges)
    p.fill(TEXT_COLOR); p.textSize(tickLabelSize);
    const TEXT_BOX_WIDTH = scalePx(p, options, 30, 22, 40); // Define text box width for 4-argument p.text()
    const TICK_LABEL_PADDING = scalePx(p, options, 3, 2, 6);
    
    // Controlled Label Decimation ---
    // 1. Estimate the space needed for a label (e.g., 20px) plus a buffer (5px) = 25px
    const minLabelSpace = scalePx(p, options, 25, 18, 40);
    
    // 2. Calculate how many bins fit in that space
    let labelEvery = Math.max(1, Math.ceil(minLabelSpace / barW));
    // -----------------------------------------
    
    binEdges.forEach((edgeValue, i) => {
        const xPos = i * barW; 
        
        p.stroke(TICK_COLOR); 
        p.line(xPos, h, xPos, h + tickLen);

        // Decide if we should show the label based on the controlled decimation
        const showLabel = (i % labelEvery === 0 || i === finalBins || i === 0);

        if (showLabel) {
            p.noStroke();
            
            let align = p.CENTER;
            let textX = xPos;
            
            let labelText = Number.isInteger(edgeValue) ? String(edgeValue) : edgeValue.toFixed(1);

            // Handle start and end edge alignment to prevent clipping
            if (i === 0) {
                // Left Edge: Align left, box starts at xPos (0)
                align = p.LEFT;
                
                p.textAlign(align, p.TOP);
                p.text(labelText, textX, h + tickTextOffset, TEXT_BOX_WIDTH); 

            } else if (i === finalBins) {
                // **FIX: Right Edge Special Alignment with Padding**
                // Use 2-argument p.text() which perfectly respects p.RIGHT alignment.
                // Add TICK_LABEL_PADDING to push the text past the tick mark.
                align = p.RIGHT; 
                
                p.textAlign(align, p.TOP);
                p.text(labelText, xPos + TICK_LABEL_PADDING, h + tickTextOffset); 

            } else {
                // Internal Ticks: Center aligned using 4-argument p.text()
                align = p.CENTER;
                // Shift the drawing point left by half the text box width 
                // so the center of the 30px box is at xPos.
                textX -= TEXT_BOX_WIDTH / 2;
                
                p.textAlign(align, p.TOP);
                
                // The p.text function with 4 arguments treats the x, y coordinates as the corner
                // of the text box.
                p.text(labelText, textX, h + tickTextOffset, TEXT_BOX_WIDTH); 
            }
        }
    });

    // --- Draw Bars (Touching with Dynamic Border and Tooltips) ---
    p.textFont(options.font || DEFAULT_FONT); 

    counts.forEach((count, i) => {
        const rectX = i * barW;
        const rectH = p.map(count, yAxis.min, yAxis.max, 0, h);
        const rectY = h - rectH;
        
        // Tooltip Check
        const gx = margin.left + rectX;
        const gy = margin.top + rectY;
        
        const binStart = binEdges[i];
        const binEnd = binEdges[i+1];
        
        let isHover = false;
        if (p.mouseX >= gx && p.mouseX <= gx + barW && p.mouseY >= gy && p.mouseY <= gy + rectH) {
            isHover = true;
            p.chart.hoverState = {
                active: true,
                x: p.mouseX,
                y: p.mouseY,
                content: [
                    `Range: ${binStart}—${binEnd}`,
                    `Count: ${count}`
                ]
            };
            p.cursor(p.HAND);
        }
        
        // Coloring and Drawing
        p.stroke(borderColor); 
        p.strokeWeight(borderWeight); 
        p.fill(color); 
        
        if (isHover) {
            let hoverColor = p.color(color);
            hoverColor.setAlpha(200);
            p.fill(hoverColor);
        }
        
        p.rect(rectX, rectY, barW, rectH);

        // Value Labels (Above Bar)
        if (showLabels) {
            p.noStroke(); 
            p.fill(TEXT_COLOR); 
            p.textAlign(p.CENTER, p.BOTTOM); 
          p.textSize(histLabelSize);
            
            p.text(count, rectX + barW / 2, rectY - 2); 
        }
    });

    p.pop();
};
  // ==========================================
  // 8. TABLE
  // ==========================================

  // Creates an interactive table with hover effects, optional search, and pagination
  // Parameters:
  //   - data: Array of objects or DataFrame
  //   - options: {
  //       title: string - Table title (default: "Data Table")
  //       x, y: number - Position coordinates
  //       width: number - Table width
  //       maxRows: number - Max rows to display (default: 10, pagination)
  //       searchable: boolean - Enable search input (default: false)
  //       tooltip: string - Custom tooltip message on hover (optional)
  //       id: string - Unique identifier for search input
  //       pagination: boolean - Enable pagination controls (default: false)
  //       page: number - Current page number (0-indexed, for external control)
  //       onPageChange: function - Callback when page changes
  //     }
  /**
   * Creates an interactive data table
   * NaN Handling: NaN/null values are DISPLAYED with visual indicator (grayed style).
   * A warning is logged showing which cells contain NaN values.
   * Set nanPolicy: 'silent' to suppress warnings.
   * Set nanIndicator: false to disable visual styling of NaN cells.
   */
  p5.prototype.table = function(data, options = {}) {
      const p = this;
      ensureCanvasMatchesDisplay(p, options);
      // Convert data to DataFrame if not already
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      const id = options.id || 'p5chart_table';
      
      // Validate data for NaN values
      const validation = validateData(df, df.columns, options, 'table');
      
      // Auto-enable searchable and pagination for tables with more than 10 rows
      const totalRowCount = df.rows.length;
      const searchable = options.searchable !== undefined ? options.searchable : (totalRowCount > TABLE_MAX_ROWS);
      const pagination = options.pagination !== undefined ? options.pagination : (totalRowCount > TABLE_MAX_ROWS);
      
      // Initialize pagination state if not exists
      if (!p.chart._tableStates) p.chart._tableStates = {};
      if (!p.chart._tableStates[id]) {
          p.chart._tableStates[id] = { currentPage: options.page || 0 };
      }
      const state = p.chart._tableStates[id];
      
      // Layout dimensions (calculate early for search input positioning)
      const _responsiveScale = getResponsiveScale(p, options);
      let x = (options.x !== undefined) ? options.x : scalePx(p, options, 20, 8, 24);
      let y = (options.y !== undefined) ? options.y : scalePx(p, options, 80, 40, 100);
      // On small canvases, prevent large fixed offsets from pushing the table off-screen.
      if (options.responsive !== false) {
        x = clampNumber(x, 0, Math.max(0, p.width - 10));
        y = clampNumber(y, 0, Math.max(0, Math.round(p.height * 0.25)));
      }

      // Mobile-only right padding (to match the left gutter from x).
      const rightPad = getMobileRightPadding(p, options);
      const maxTableW = Math.max(50, p.width - x - rightPad);
      const w = Math.min(
        (options.width !== undefined) ? options.width : (p.width - scalePx(p, options, 40, 16, 60)),
        maxTableW
      );
      let rowH = scalePx(p, options, TABLE_ROW_HEIGHT, 22, 40);
      const tableTextSize = scalePx(p, options, TABLE_TEXT_SIZE, 10, 14);
      const titleSize = scalePx(p, options, TITLE_SIZE, 12, 18);
      const axisLabelSize = scalePx(p, options, AXIS_LABEL_SIZE, 10, 16);
      const searchWidth = Math.min(scalePx(p, options, TABLE_SEARCH_WIDTH, 110, 220), Math.max(110, Math.floor(w * 0.7)));
      const arrowSize = scalePx(p, options, TABLE_ARROW_SIZE, 18, 28);
      
      // Only create search input if searchable is true
      if (searchable) {
          if (!p.chart.inputs[id]) {
              let inp = p.createInput('');
              // Position at bottom left corner
              inp.position(x, y + 400); // Will be adjusted dynamically
              inp.attribute('placeholder', 'Search...');
              inp.style('padding', '4px 8px');
              inp.style('font-family', 'sans-serif');
            inp.style('font-size', axisLabelSize + 'px');
            inp.style('width', searchWidth + 'px');
              inp.style('border', '1px solid #ccc');
              inp.style('border-radius', '3px');
              p.chart.inputs[id] = inp;
          }
      }
      
      // Filter rows based on search query
      const search = searchable && p.chart.inputs[id] ? p.chart.inputs[id].value().toLowerCase() : '';
      let rows = df.rows;
      if (search) rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(search)));
      
      // Pagination calculations
      let maxRows = options.maxRows || TABLE_MAX_ROWS;

      // Auto-fit table height on small canvases (avoid clipping).
      if (options.responsive !== false) {
        const bottomChrome = scalePx(p, options, 90, 70, 140); // space for search + pagination
        const availableH = p.height - y - bottomChrome;
        if (availableH > 0) {
          const fitRows = Math.max(1, Math.floor(availableH / rowH) - 1); // minus header
          maxRows = Math.min(maxRows, fitRows);
          // If we’re tight, also compress row height a bit (down to 18px).
          if ((maxRows + 1) * rowH > availableH) {
            rowH = Math.max(18, Math.floor(availableH / (maxRows + 1)));
          }
        }
      }
      const totalPages = Math.ceil(rows.length / maxRows);
      const currentPage = Math.min(state.currentPage, totalPages - 1);
      state.currentPage = Math.max(0, currentPage);
      
      const startIdx = state.currentPage * maxRows;
      const endIdx = Math.min(startIdx + maxRows, rows.length);
      const dispRows = rows.slice(startIdx, endIdx);
      const cols = df.columns;
      
      // Update dimensions
      const colW = w / cols.length;
      
      // Update search input position to bottom left
      if (searchable && p.chart.inputs[id]) {
          const tableBottom = y + (dispRows.length + 1) * rowH;
          // If canvas is CSS-scaled, convert canvas coords -> page coords so inputs stay aligned.
          const m = getCanvasDisplayMetrics(p);
          const pageX = m.left + x * (m.width && p.width ? (m.width / p.width) : 1);
          const pageY = m.top + (tableBottom + scalePx(p, options, 15, 10, 22)) * (m.height && p.height ? (m.height / p.height) : 1);
          p.chart.inputs[id].position(pageX, pageY);
          // Keep sizing in sync for responsive layouts / canvas resizes
          p.chart.inputs[id].style('font-size', axisLabelSize + 'px');
          // Scale width into CSS pixels so it matches the drawn table.
          const widthScale = m.width && p.width ? (m.width / p.width) : 1;
          p.chart.inputs[id].style('width', Math.max(90, Math.round(searchWidth * widthScale)) + 'px');
      }
      
      // Interactive hover - track which cell is hovered
      let hoveredCell = null;
      const mx = p.mouseX - x;
      const my = p.mouseY - y;
      
      if (mx >= 0 && mx <= w && my >= 0 && my <= (dispRows.length + 1) * rowH) {
          const hovCol = Math.floor(mx / colW);
          const hovRow = Math.floor(my / rowH);
          if (hovCol >= 0 && hovCol < cols.length && hovRow >= 0 && hovRow <= dispRows.length) {
              hoveredCell = { row: hovRow, col: hovCol };
          }
      }
      
      // Custom tooltip message (optional)
      const tooltipMsg = options.tooltip;
      
      // Color options with defaults
      const headerColor = options.headerColor || p.color(TABLE_HEADER_COLOR);
      const rowColor1 = options.rowColor1 || p.color(TABLE_ROW_COLOR_1);
      const rowColor2 = options.rowColor2 || p.color(TABLE_ROW_COLOR_2);
      const hoverColor = options.hoverColor || p.color(TABLE_HOVER_COLOR);
      const borderColor = options.borderColor || p.color(TABLE_BORDER_COLOR);
      
      // Draw title (without page count)
      const title = options.title || 'Data Table';
      p.push();
      p.translate(x, y - scalePx(p, options, 30, 18, 40));
      p.fill(TEXT_COLOR); 
      p.textSize(titleSize);
      p.textStyle(p.BOLD);
      p.textAlign(p.LEFT, p.BOTTOM); 
      p.textFont(DEFAULT_FONT);
      p.text(title, 0, 0);
      p.pop();
      
      // Draw table
      p.push();
      p.translate(x, y);
        // Draw header row
        p.fill(headerColor); p.noStroke(); p.rect(0, 0, w, rowH);
        p.fill(0); p.textAlign(p.LEFT, p.CENTER); p.textStyle(p.NORMAL); p.textFont(DEFAULT_FONT);
        p.textSize(tableTextSize);
        cols.forEach((c, i) => {
            // Highlight header on hover
            if (hoveredCell && hoveredCell.row === 0 && hoveredCell.col === i) {
                p.fill(p.lerpColor(headerColor, p.color(200), 0.3)); p.rect(i*colW, 0, colW, rowH);
            }
            p.fill(0);
            p.text(truncate(p, c, colW-10), i*colW + 5, rowH/2);
        });
      
        // Draw data rows
        p.textStyle(p.NORMAL);
        dispRows.forEach((r, i) => {
          let ry = (i+1)*rowH;
          // Alternating row colors for better readability
          let bg = i % 2 === 0 ? rowColor1 : rowColor2;
          
          // Highlight cell on hover with custom hover color
          if (hoveredCell && hoveredCell.row === i + 1) {
              bg = p.lerpColor(bg, hoverColor, 0.3);
          }
          
          // Draw row background
          p.fill(bg); p.rect(0, ry, w, rowH);
          
          // Determine text color based on background (color protection)
          let cellTextColor;
          if (typeof bg === 'number') {
              // Grayscale value - simple threshold
              cellTextColor = bg > 128 ? 0 : 255;
          } else {
              // Color object from lerpColor - calculate luminance
              let r = p.red(bg);
              let g = p.green(bg);
              let b = p.blue(bg);
              let luminance = 0.299 * r/255 + 0.587 * g/255 + 0.114 * b/255;
              cellTextColor = luminance > 0.6 ? 0 : 255;
          }
          
          p.fill(cellTextColor);
          
          // Draw cell values
          cols.forEach((c, j) => {
              const cellValue = r[c];
              const isNaN = cellValue === null || cellValue === '' || cellValue === undefined ||
                           (typeof cellValue === 'number' && Number.isNaN(cellValue));
              const showNaNIndicator = options.nanIndicator !== false;
              
              // Show tooltip only if user provided a tooltip message
              if (tooltipMsg && hoveredCell && hoveredCell.row === i + 1 && hoveredCell.col === j) {
                  p.push();
                  const tooltipW = p.textWidth(tooltipMsg) + 20;
                  const tooltipH = 25;
                  const tooltipX = j*colW + colW/2 - tooltipW/2;
                  const tooltipY = ry - tooltipH - 5;
                  
                  // Draw tooltip box
                  p.fill(50, 50, 50, 230);
                  p.noStroke();
                  p.rect(tooltipX, tooltipY, tooltipW, tooltipH, 4);
                  p.fill(255);
                  p.textAlign(p.CENTER, p.CENTER);
                  p.text(tooltipMsg, tooltipX + tooltipW/2, tooltipY + tooltipH/2);
                  p.pop();
              }
              
              // Visual indicator for NaN values
              if (isNaN && showNaNIndicator) {
                  // Gray background for NaN cell
                  p.fill(220, 220, 220, 100);
                  p.noStroke();
                  p.rect(j*colW + 1, ry + 1, colW - 2, rowH - 2);
                  
                  // Gray text
                  p.fill(150, 150, 150);
                  p.textStyle(p.ITALIC);
                  p.text('—', j*colW + 5, ry + rowH/2);
                  p.textStyle(p.NORMAL);
              } else {
                  p.fill(cellTextColor);
                  p.text(truncate(p, cellValue, colW-10), j*colW + 5, ry + rowH/2);
              }
          });
        });
      // Draw table border
      p.stroke(borderColor); p.noFill(); p.rect(0, 0, w, (dispRows.length + 1) * rowH);
      p.pop();
      
      // Draw pagination controls if enabled (compact, bottom-right corner)
      if (pagination && totalPages > 1) {
          const tableBottom = y + (dispRows.length + 1) * rowH;
          const paginationY = tableBottom + 15;
          const paginationX = x + w;
          
          p.push();
          p.textFont(DEFAULT_FONT);
          p.textSize(tableTextSize);
          
          // Arrow button dimensions
          const spacing = scalePx(p, options, 5, 3, 8);
          const pageTextWidth = scalePx(p, options, 50, 40, 70);
          
          // Page text: "1 of 4"
          const pageText = `${state.currentPage + 1} of ${totalPages}`;
          const textX = paginationX - arrowSize - spacing - pageTextWidth/2;
          const prevX = paginationX - arrowSize * 2 - spacing * 2 - pageTextWidth;
          const nextX = paginationX - arrowSize;
          
          // Check button hovers
          const hoverPrev = p.mouseX > prevX && p.mouseX < prevX + arrowSize && 
                           p.mouseY > paginationY && p.mouseY < paginationY + arrowSize;
          const hoverNext = p.mouseX > nextX && p.mouseX < nextX + arrowSize && 
                           p.mouseY > paginationY && p.mouseY < paginationY + arrowSize;
          
          // Previous arrow button
          if (state.currentPage > 0) {
              p.fill(hoverPrev ? p.color(150, 180, 255) : p.color(100, 150, 255));
          } else {
              p.fill(220);
          }
          p.noStroke();
          p.rect(prevX, paginationY, arrowSize, arrowSize, 3);
          // Draw left arrow (switched to point left)
          p.fill(255);
          p.triangle(prevX + 8, paginationY + 12, 
                    prevX + 16, paginationY + 6, 
                    prevX + 16, paginationY + 18);
          
          // Page text
          p.fill(100);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(pageText, textX, paginationY + arrowSize/2);
          
          // Next arrow button
          if (state.currentPage < totalPages - 1) {
              p.fill(hoverNext ? p.color(150, 180, 255) : p.color(100, 150, 255));
          } else {
              p.fill(220);
          }
          p.rect(nextX, paginationY, arrowSize, arrowSize, 3);
          // Draw right arrow (switched to point right)
          p.fill(255);
          p.triangle(nextX + 16, paginationY + 12, 
                    nextX + 8, paginationY + 6, 
                    nextX + 8, paginationY + 18);
          
          p.pop();
          
          // Handle button clicks
          if (p.mouseIsPressed && p.frameCount % 10 === 0) {
              if (hoverPrev && state.currentPage > 0) {
                  state.currentPage--;
                  if (options.onPageChange) options.onPageChange(state.currentPage);
              } else if (hoverNext && state.currentPage < totalPages - 1) {
                  state.currentPage++;
                  if (options.onPageChange) options.onPageChange(state.currentPage);
              }
          }
          
          // Handle keyboard navigation
          if (p.keyIsPressed) {
              if (p.keyCode === p.LEFT_ARROW && state.currentPage > 0 && p.frameCount % 10 === 0) {
                  state.currentPage--;
                  if (options.onPageChange) options.onPageChange(state.currentPage);
              } else if (p.keyCode === p.RIGHT_ARROW && state.currentPage < totalPages - 1 && p.frameCount % 10 === 0) {
                  state.currentPage++;
                  if (options.onPageChange) options.onPageChange(state.currentPage);
              }
          }
      }
  };

  // ==========================================
  // 9. MAP (OpenStreetMap Integration)
  // ==========================================
  
  /**
   * Creates a map chart with geographic points
   * NaN Handling: Points with NaN in lat/lon are SKIPPED (not drawn).
   * A warning is logged showing how many points were skipped.
   * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
   */
  p5.prototype.mapChart = function(data, options = {}) {
      const p = this;
      ensureCanvasMatchesDisplay(p, options);
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);

      // ---- Robust canvas event binding helpers (works across global/instance mode) ----
      const getCanvasElement = () => {
        // p.canvas is the HTMLCanvasElement in most p5 builds; fallback to renderer elt.
        return p.canvas || (p._renderer && p._renderer.elt) || null;
      };

      const getCanvasCoordsFromEvent = (e) => {
        const elt = getCanvasElement();
        if (!elt || !e) return { x: p.mouseX, y: p.mouseY };
        const rect = elt.getBoundingClientRect();
        // Convert client pixels into canvas coordinate space (handles CSS scaling).
        const scaleX = rect.width ? (p.width / rect.width) : 1;
        const scaleY = rect.height ? (p.height / rect.height) : 1;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        return { x, y };
      };
      
      // Column mapping
      const latCol = options.lat || options.latitude || 'lat';
      const lonCol = options.lon || options.longitude || 'lon';
      const labelCol = options.label || 'label';
      const valueCol = options.value || 'value';
      
      // Validate data for NaN values
      const validation = validateData(df, [latCol, lonCol], options, 'mapChart');
      
      // Auto-calculate center and zoom to fit all points
      let autoCenterLat = 37.8;
      let autoCenterLon = -96;
      let autoZoom = MAP_DEFAULT_ZOOM;
      
      const lats = df.col(latCol).map(Number).filter(v => !isNaN(v));
      const lons = df.col(lonCol).map(Number).filter(v => !isNaN(v));
      
      if (lats.length > 0 && lons.length > 0) {
          // Calculate bounds
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          
          // Calculate center
          autoCenterLat = (minLat + maxLat) / 2;
          autoCenterLon = (minLon + maxLon) / 2;
          
          // Calculate zoom to fit all points with padding
          const latRange = maxLat - minLat;
          const lonRange = maxLon - minLon;
          
          // Estimate zoom level to fit the bounds
          const WORLD_DIM = { height: 256, width: 256 };
          const zoomLat = Math.floor(Math.log2(p.height * 0.85 / (latRange * WORLD_DIM.height / 180)));
          const zoomLon = Math.floor(Math.log2(p.width * 0.85 / (lonRange * WORLD_DIM.width / 360)));
          autoZoom = Math.min(Math.max(Math.min(zoomLat, zoomLon), 2), 18); // Clamp between 2-18
      }
      
      // Map state
      if (!p.chart._mapState) {
          p.chart._mapState = {
              centerLat: options.centerLat || autoCenterLat,
              centerLon: options.centerLon || autoCenterLon,
              zoom: options.zoom || autoZoom,
              tiles: {},
              hoveredPoint: null,
              isDragging: false,
              dragStartX: 0,
              dragStartY: 0,
              dragStartLat: 0,
            dragStartLon: 0,
            _lastCanvasW: p.width,
              _lastCanvasH: p.height,
              _userZoom: false,
              _needsTileReload: false
          };
      }
      const state = p.chart._mapState;

        // If the canvas size changes (common on mobile resize/orientation changes),
        // adjust zoom to keep points fitting without requiring sketch changes.
        if (options.zoom === undefined) {
          const sizeChanged = state._lastCanvasW !== p.width || state._lastCanvasH !== p.height;
          if (sizeChanged) {
              // Only auto-adjust zoom if the user hasn't manually zoomed.
              if (!state._userZoom) {
                // Always recompute a fit-to-bounds zoom for the current dimensions.
                // This lets the map shrink and then expand back naturally.
                state.zoom = autoZoom;
              }

              // Refresh tiles for the new canvas size.
              state.tiles = {};
            state._lastCanvasW = p.width;
            state._lastCanvasH = p.height;
            // Defer tile loading until after helpers are defined.
            state._needsTileReload = true;
          }
        }
      
      // Style options
      const _responsiveScale = getResponsiveScale(p, options);
      const pointColor = options.pointColor || p.color(MAP_POINT_COLOR);
      const pointSize = options.pointSize || scalePx(p, options, MAP_POINT_SIZE, 8, 16);
      const showLabels = options.showLabels !== false;
      const showControls = options.showControls !== false;
      
      // Helper: Convert lat/lon to pixel coordinates
      const latLonToPixel = (lat, lon) => {
          let x = (lon + 180) / 360 * Math.pow(2, state.zoom) * 256;
          let latRad = lat * p.PI / 180;
          let y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / p.PI) / 2 * Math.pow(2, state.zoom) * 256;
          
          let centerX = (state.centerLon + 180) / 360 * Math.pow(2, state.zoom) * 256;
          let centerLatRad = state.centerLat * p.PI / 180;
          let centerY = (1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / p.PI) / 2 * Math.pow(2, state.zoom) * 256;
          
          return {
              x: p.width / 2 + (x - centerX),
              y: p.height / 2 + (y - centerY)
          };
      };
      
      // Helper: Convert pixel coordinates to lat/lon
      const pixelToLatLon = (x, y) => {
          let centerX = (state.centerLon + 180) / 360 * Math.pow(2, state.zoom) * 256;
          let centerLatRad = state.centerLat * p.PI / 180;
          let centerY = (1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / p.PI) / 2 * Math.pow(2, state.zoom) * 256;
          
          let worldX = centerX + (x - p.width / 2);
          let worldY = centerY + (y - p.height / 2);
          
          let lon = worldX / (Math.pow(2, state.zoom) * 256) * 360 - 180;
          let n = p.PI - 2 * p.PI * worldY / (Math.pow(2, state.zoom) * 256);
          let lat = 180 / p.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
          
          return { lat, lon };
      };
      
      // Helper: Load visible tiles
      const loadVisibleTiles = () => {
          let tileSize = 256;
          let numTiles = Math.pow(2, state.zoom);
          
          let centerTileX = Math.floor((state.centerLon + 180) / 360 * numTiles);
          let centerTileY = Math.floor((1 - Math.log(Math.tan(state.centerLat * p.PI / 180) + 1 / Math.cos(state.centerLat * p.PI / 180)) / p.PI) / 2 * numTiles);
          
          let tilesWide = Math.ceil(p.width / tileSize) + 2;
          let tilesHigh = Math.ceil(p.height / tileSize) + 2;
          
          for (let x = -tilesWide; x <= tilesWide; x++) {
              for (let y = -tilesHigh; y <= tilesHigh; y++) {
                  let tileX = (centerTileX + x + numTiles) % numTiles;
                  let tileY = centerTileY + y;
                  if (tileY >= 0 && tileY < numTiles) {
                      let key = `${state.zoom}/${tileX}/${tileY}`;
                      if (!state.tiles[key]) {
                          let url = `https://tile.openstreetmap.org/${state.zoom}/${tileX}/${tileY}.png`;
                          state.tiles[key] = { loading: true, img: null };
                          p.loadImage(url, img => { 
                              state.tiles[key].img = img; 
                              state.tiles[key].loading = false; 
                          });
                      }
                  }
              }
          }
      };
      
      // Helper: Draw tiles
      const drawTiles = () => {
          let tileSize = 256;
          let numTiles = Math.pow(2, state.zoom);
          
          let centerTileX = Math.floor((state.centerLon + 180) / 360 * numTiles);
          let centerTileY = Math.floor((1 - Math.log(Math.tan(state.centerLat * p.PI / 180) + 1 / Math.cos(state.centerLat * p.PI / 180)) / p.PI) / 2 * numTiles);
          
          let centerPixelX = (state.centerLon + 180) / 360 * numTiles * tileSize;
          let centerPixelY = (1 - Math.log(Math.tan(state.centerLat * p.PI / 180) + 1 / Math.cos(state.centerLat * p.PI / 180)) / p.PI) / 2 * numTiles * tileSize;
          
          let offsetX = p.width / 2 - centerPixelX;
          let offsetY = p.height / 2 - centerPixelY;
          
          for (let key in state.tiles) {
              if (state.tiles[key].img) {
                  let parts = key.split('/');
                  let z = parseInt(parts[0]);
                  let x = parseInt(parts[1]);
                  let y = parseInt(parts[2]);
                  
                  if (z === state.zoom) {
                      let px = x * tileSize + offsetX;
                      let py = y * tileSize + offsetY;
                      p.image(state.tiles[key].img, px, py);
                  }
              }
          }
      };
      
        // Load tiles if needed
        if (state._needsTileReload || Object.keys(state.tiles).length === 0) {
          state._needsTileReload = false;
          loadVisibleTiles();
      }
      
      // Draw map
      p.push();
      drawTiles();
      
      // Draw data points
      state.hoveredPoint = null;
      p.noStroke();
      
      df.rows.forEach(row => {
          let lat = Number(row[latCol]);
          let lon = Number(row[lonCol]);
          
          // Skip if lat/lon is NaN
          if (isNaN(lat) || isNaN(lon)) return;
          
          let pos = latLonToPixel(lat, lon);
          
          if (pos.x >= 0 && pos.x <= p.width && pos.y >= 0 && pos.y <= p.height) {
              let d = p.dist(p.mouseX, p.mouseY, pos.x, pos.y);
              let isHovered = d < pointSize;
              
              if (isHovered) {
                  state.hoveredPoint = { row, pos, labelCol, valueCol };
              }
              
              p.fill(pointColor.levels[0], pointColor.levels[1], pointColor.levels[2], isHovered ? 255 : HOVER_ALPHA);
              p.ellipse(pos.x, pos.y, isHovered ? pointSize * MAP_POINT_HOVER_SCALE : pointSize, isHovered ? pointSize * MAP_POINT_HOVER_SCALE : pointSize);
              p.fill(255);
              p.ellipse(pos.x, pos.y, isHovered ? pointSize * 0.5 : pointSize * 0.33, isHovered ? pointSize * 0.5 : pointSize * 0.33);
              
              if (showLabels && row[labelCol]) {
                  p.fill(0);
                  p.textAlign(p.CENTER, p.BOTTOM);
                  p.textSize(scalePx(p, options, MAP_LABEL_SIZE, 9, 14));
                  p.text(row[labelCol], pos.x, pos.y - (isHovered ? pointSize * 0.6 : pointSize * 0.5));
              }
          }
      });
      
      // Draw tooltip
      if (state.hoveredPoint) {
          p.cursor(p.HAND);
          let h = state.hoveredPoint;
          let lines = [];
          
          if (h.row[labelCol]) lines.push(String(h.row[labelCol]));
          if (h.row[valueCol]) lines.push(`${valueCol}: ${Number(h.row[valueCol]).toLocaleString()}`);
          lines.push(`Lat: ${Number(h.row[latCol]).toFixed(4)}, Lon: ${Number(h.row[lonCol]).toFixed(4)}`);

            const tipTextSize = scalePx(p, options, TOOLTIP_TEXT_SIZE, 10, 14);
            const tipPad = scalePx(p, options, TOOLTIP_PADDING, 6, 14);
            const tipLineH = scalePx(p, options, TOOLTIP_LINE_HEIGHT, 12, 22);
            const tipOffset = scalePx(p, options, TOOLTIP_OFFSET, 10, 18);
            const tipRadius = scalePx(p, options, TOOLTIP_BORDER_RADIUS, 3, 6);

            p.textSize(tipTextSize);
          let maxWidth = 0;
          lines.forEach(l => { maxWidth = Math.max(maxWidth, p.textWidth(l)); });
            let boxW = maxWidth + (tipPad * 2);
            let boxH = lines.length * tipLineH + tipPad;
          
            let tx = p.mouseX + tipOffset;
            let ty = p.mouseY + tipOffset;
            if (tx + boxW > p.width) tx = p.mouseX - boxW - tipOffset;
            if (ty + boxH > p.height) ty = p.mouseY - boxH - tipOffset;
          
          p.noStroke();
          p.fill(0, 0, 0, 220);
            p.rect(tx, ty, boxW, boxH, tipRadius);
          p.fill(255);
          p.textAlign(p.LEFT, p.TOP);
            lines.forEach((l, i) => p.text(l, tx + tipPad, ty + scalePx(p, options, 8, 6, 10) + i * tipLineH));
      } else {
          p.cursor(p.ARROW);
      }
      
      // Draw controls
      if (showControls) {
          p.fill(255, 240);
          p.noStroke();
          const pad = scalePx(p, options, 10, 6, 14);
          const boxW = scalePx(p, options, 150, 120, 200);
          const boxH = scalePx(p, options, 60, 48, 90);
          p.rect(pad, pad, boxW, boxH, scalePx(p, options, 5, 3, 8));
          p.fill(0);
          p.textAlign(p.LEFT, p.TOP);
          p.textSize(scalePx(p, options, AXIS_LABEL_SIZE, 10, 16));
          p.text('Drag: Pan', pad + scalePx(p, options, 5, 3, 8), pad + scalePx(p, options, 5, 3, 8));
          p.text('Scroll: Zoom', pad + scalePx(p, options, 5, 3, 8), pad + scalePx(p, options, 22, 16, 34));
          p.text(`Zoom: ${state.zoom}`, pad + scalePx(p, options, 5, 3, 8), pad + scalePx(p, options, 39, 28, 58));
      }
      
      p.pop();
      
      // Handle mouse drag for panning
        p._handleMapMousePressed = function(x = p.mouseX, y = p.mouseY) {
          if (x >= 0 && x <= p.width && y >= 0 && y <= p.height) {
              state.isDragging = true;
            state.dragStartX = x;
            state.dragStartY = y;
              state.dragStartLat = state.centerLat;
              state.dragStartLon = state.centerLon;
          }
      };
      
      p._handleMapMouseReleased = function() {
          state.isDragging = false;
      };
      
        p._handleMapMouseDragged = function(x = p.mouseX, y = p.mouseY) {
          if (state.isDragging) {
            // Convert pixel delta to lat/lon delta
              let startLatLon = pixelToLatLon(state.dragStartX, state.dragStartY);
            let endLatLon = pixelToLatLon(x, y);
              
              let deltaLat = startLatLon.lat - endLatLon.lat;
              let deltaLon = startLatLon.lon - endLatLon.lon;
              
              state.centerLat = state.dragStartLat + deltaLat;
              state.centerLon = state.dragStartLon + deltaLon;
              
              // Clamp latitude to valid range (-85 to 85 for web mercator)
              state.centerLat = Math.max(-85, Math.min(85, state.centerLat));
              
              // Wrap longitude to keep it in -180 to 180 range
              while (state.centerLon < -180) state.centerLon += 360;
              while (state.centerLon > 180) state.centerLon -= 360;
              
              loadVisibleTiles();
          }
      };
      
      p._handleMapWheel = function(event) {
          // Zoom in/out with mouse wheel
              const delta = (event && (event.delta !== undefined ? event.delta : (event.deltaY !== undefined ? event.deltaY : 0))) || 0;
              const prevZoom = state.zoom;
              if (delta > 0) {
                state.zoom = Math.max(2, state.zoom - 1);
              } else if (delta < 0) {
                state.zoom = Math.min(18, state.zoom + 1);
              }
              if (state.zoom !== prevZoom) {
                state._userZoom = true;
                // Clear tiles across zoom levels to avoid unbounded growth and stale tiles.
                state.tiles = {};
                loadVisibleTiles();
              }
          // Prevent page scroll
          return false;
      };

            // Prefer canvas-bound events 
            const cnvElt = getCanvasElement();
            if (cnvElt && (!p.chart._mapDomHandlersRegistered || p.chart._mapDomHandlersTarget !== cnvElt)) {
              // If previously bound to a different canvas, unbind first
              if (p.chart._mapDomHandlersRegistered && p.chart._mapDomHandlersTarget && p.chart._mapDomWheelListener) {
                try {
                  p.chart._mapDomHandlersTarget.removeEventListener('wheel', p.chart._mapDomWheelListener);
                  p.chart._mapDomHandlersTarget.removeEventListener('mousedown', p.chart._mapDomMouseDownListener);
                  window.removeEventListener('mousemove', p.chart._mapDomMouseMoveListener);
                  window.removeEventListener('mouseup', p.chart._mapDomMouseUpListener);
                } catch (e) {
                  // ignore
                }
              }

              p.chart._mapDomWheelListener = (e) => {
                if (!p._handleMapWheel) return;
                e.preventDefault();
                p._handleMapWheel(e);
              };

              p.chart._mapDomMouseDownListener = (e) => {
                if (!p._handleMapMousePressed) return;
                const pt = getCanvasCoordsFromEvent(e);
                p._handleMapMousePressed(pt.x, pt.y);
              };

              p.chart._mapDomMouseMoveListener = (e) => {
                if (!p._handleMapMouseDragged) return;
                if (!state.isDragging) return;
                const pt = getCanvasCoordsFromEvent(e);
                p._handleMapMouseDragged(pt.x, pt.y);
              };

              p.chart._mapDomMouseUpListener = () => {
                if (p._handleMapMouseReleased) p._handleMapMouseReleased();
              };

              cnvElt.addEventListener('wheel', p.chart._mapDomWheelListener, { passive: false });
              cnvElt.addEventListener('mousedown', p.chart._mapDomMouseDownListener);
              window.addEventListener('mousemove', p.chart._mapDomMouseMoveListener);
              window.addEventListener('mouseup', p.chart._mapDomMouseUpListener);

              p.chart._mapDomHandlersRegistered = true;
              p.chart._mapDomHandlersTarget = cnvElt;
            }
      
      // Auto-register handlers if not already done
            // Keep legacy p5 callback wrapping as a fallback only (for environments where canvas events can't bind).
            if (!p.chart._mapHandlersRegistered && !p.chart._mapDomHandlersRegistered) {
          const originalMousePressed = p.mousePressed || (() => {});
          p.mousePressed = function() {
              originalMousePressed.call(p);
              if (p._handleMapMousePressed) p._handleMapMousePressed();
          };
          
          const originalMouseReleased = p.mouseReleased || (() => {});
          p.mouseReleased = function() {
              originalMouseReleased.call(p);
              if (p._handleMapMouseReleased) p._handleMapMouseReleased();
          };
          
          const originalMouseDragged = p.mouseDragged || (() => {});
          p.mouseDragged = function() {
              originalMouseDragged.call(p);
              if (p._handleMapMouseDragged) p._handleMapMouseDragged();
          };
          
          const originalMouseWheel = p.mouseWheel || (() => {});
          p.mouseWheel = function(event) {
              const result = originalMouseWheel.call(p, event);
              if (p._handleMapWheel) {
                  const mapResult = p._handleMapWheel(event);
                  if (mapResult === false) return false;
              }
              return result;
          };
          
          p.chart._mapHandlersRegistered = true;
      }
  };

  // ==========================================
  // 10. EXPORT UTILITIES
  // ==========================================

  /**
   * Export current canvas as PNG image
   * Works for all chart types
   * @param {string} filename - Name of the file (default: 'chart.png')
   */
  p5.prototype.toPNG = function(filename = 'chart.png') {
    const p = this;
    
    // Ensure filename has .png extension
    if (!filename.endsWith('.png')) {
      filename += '.png';
    }
    
    // Use p5.js built-in save() to export canvas as PNG
    p.save(filename);
  };

  /**
   * Export table data as CSV file
   * Works for table visualizations
   * @param {DataFrame|Array|Object} data - The data to export (DataFrame, array of objects, or 2D array)
   * @param {string} filename - Name of the file (default: 'data.csv')
   * @param {Object} options - Export options
   *   - columns: Array of column names to include (default: all columns)
   *   - delimiter: Character to use as delimiter (default: ',')
   *   - includeHeader: Whether to include header row (default: true)
   */
  p5.prototype.toCSV = function(data, filename = 'data.csv', options = {}) {
    const p = this;
    
    // Ensure filename has .csv extension
    if (!filename.endsWith('.csv')) {
      filename += '.csv';
    }
    
    // Convert data to DataFrame if not already
    let df;
    if (data instanceof p.chart.DataFrame) {
      df = data;
    } else if (Array.isArray(data)) {
      df = new p.chart.DataFrame(data);
    } else {
      console.error('toCSV: Data must be a DataFrame, array of objects, or 2D array');
      return;
    }
    
    // Get options with defaults
    const delimiter = options.delimiter || ',';
    const includeHeader = options.includeHeader !== false;
    const columns = options.columns || df.columns;
    
    // Build CSV string
    let csvContent = '';
    
    // Add header row
    if (includeHeader) {
      csvContent += columns.map(col => escapeCSVField(col, delimiter)).join(delimiter) + '\n';
    }
    
    // Add data rows
    const rows = df.rows;
    rows.forEach(row => {
      const rowValues = columns.map(col => {
        const value = row[col];
        // Handle NaN/null values
        if (value === null || value === undefined || 
            (typeof value === 'number' && isNaN(value))) {
          return '';
        }
        return escapeCSVField(String(value), delimiter);
      });
      csvContent += rowValues.join(delimiter) + '\n';
    });
    
    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      // Feature detection for download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      console.error('toCSV: Browser does not support download attribute');
    }
  };

  /**
   * Helper function to escape CSV field values
   * Handles quotes, commas, and newlines properly
   */
  function escapeCSVField(field, delimiter = ',') {
    field = String(field);
    
    // If field contains delimiter, quotes, or newlines, wrap in quotes
    if (field.includes(delimiter) || field.includes('"') || field.includes('\n') || field.includes('\r')) {
      // Escape existing quotes by doubling them
      field = field.replace(/"/g, '""');
      return `"${field}"`;
    }
    
    return field;
  }

})();