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
  // 0. GLOBALS & CONFIG
  // ==========================================
  
  p5.prototype.chart = p5.prototype.chart || {};
  
  // Palette
  p5.prototype.chart.palette = [
    "#395B64", "#A5C9CA", "#E7F6F2", "#2C3333", 
    "#FF8B8B", "#EB4747", "#ABC9FF", "#FFD966"
  ];
  
  // Typography Defaults
  const DEFAULT_FONT = '"Roboto", "Helvetica Neue", "Helvetica", "Arial", sans-serif';
  const TEXT_COLOR = "#333333";
  const SUBTEXT_COLOR = "#666666";
  
  p5.prototype.chart.inputs = {}; // Cache for DOM elements

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

  function drawMeta(p, opts, w, h) {
      p.push();
      p.noStroke();
      p.textFont(opts.font || DEFAULT_FONT);
      p.drawingContext.font = 'bold 16px Roboto, sans-serif';
      
      const align = opts.textAlign || p.LEFT;
      let xPos = 0;
      if (align === p.CENTER) xPos = w/2;
      if (align === p.RIGHT) xPos = w;
      
      if (opts.title) {
          p.fill(TEXT_COLOR); 
          p.textSize(opts.titleSize || 16); 
          p.textStyle(p.BOLD);
          p.drawingContext.fontWeight = 'bold';
          p.textAlign(align, p.BOTTOM); 
          p.text(opts.title, xPos, -30);
      }
      if (opts.subtitle) {
          p.drawingContext.font = (opts.subtitleBold ? 'bold' : 'normal') + ' 13px Roboto, sans-serif';
          p.fill(SUBTEXT_COLOR); p.textSize(opts.subtitleSize || 13); 
          p.textStyle(opts.subtitleBold ? p.BOLD : p.NORMAL);
          p.textAlign(align, p.BOTTOM); p.text(opts.subtitle, xPos, -12);
      }
      if (opts.source || opts.author) {
          p.fill(SUBTEXT_COLOR); p.textSize(7); // Smaller font size for source/author
          p.textAlign(p.LEFT, p.TOP);
          let footerText = "";
          if (opts.source) footerText += `Source: ${opts.source}`;
          if (opts.author) {
              if (opts.source) footerText += "  |  "; // Add spacing between source and author
              footerText += `Chart: ${opts.author}`;
          }
          const footerY = opts.xLabel || opts.yLabel ? h + 50 : h + 30; // Move up if no axis labels
          p.text(footerText, 0, footerY);
      }
      
        // X-axis label
        if (opts.xLabel) {
          p.drawingContext.font = 'normal 12px Roboto, sans-serif';
          p.fill(TEXT_COLOR); p.textSize(12); p.textStyle(p.NORMAL);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.text(opts.xLabel, w/2, h + 40);
        }
      
        // Y-axis label
        if (opts.yLabel) {
          p.drawingContext.font = 'normal 12px Roboto, sans-serif';
          p.fill(TEXT_COLOR); p.textSize(12); p.textStyle(p.NORMAL);
          p.push();
          p.translate(-30, h/2);
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
    p.fill(0, 0, 0, 220);
    p.rectMode(p.CORNER);
    p.textSize(12);
    p.textFont(DEFAULT_FONT);
    
    let maxWidth = 0;
    h.content.forEach(l => { 
      let w = p.textWidth(l); 
      if (w > maxWidth) maxWidth = w; 
    });
    let boxW = maxWidth + 20; 
    let boxH = h.content.length * 18 + 10;
    
    let tx = h.x + 15; 
    let ty = h.y + 15;
    if (tx + boxW > p.width) tx = h.x - boxW - 10;
    if (ty + boxH > p.height) ty = h.y - boxH - 10;
    
    p.translate(tx, ty); 
    p.rect(0, 0, boxW, boxH, 4);
    p.fill(255); 
    p.textAlign(p.LEFT, p.TOP);
    h.content.forEach((l, i) => p.text(l, 10, 8 + i * 18));
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
  
  p5.prototype.bar = function(data, options = {}) {
    const p = this;
    let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
    
    const orient = options.orientation || 'horizontal';
    const stacked = options.mode === 'stacked';
    const labelCol = options.x || options.category || df.columns[0];
    let valCols = options.y || options.values || [df.columns[1]];
    if (!Array.isArray(valCols)) valCols = [valCols];
    
    const labelPos = options.labelPos || 'auto';
    const labels = df.col(labelCol);
    const rows = df.rows;

    // Calculate label space dynamically for horizontal bars
    let labelSpace = options.labelSpace;
    if (!labelSpace && orient === 'horizontal') {
      p.textSize(12);
      p.textFont(options.font || DEFAULT_FONT);
      let maxLabelWidth = 0;
      labels.forEach(lbl => {
        let lblWidth = p.textWidth(String(lbl));
        if (lblWidth > maxLabelWidth) maxLabelWidth = lblWidth;
      });
      labelSpace = maxLabelWidth + 20; // 20px padding
    } else if (!labelSpace) {
      labelSpace = 70; // Default for vertical
    }
    
    if (options.xLabel === undefined) options.xLabel = labelCol;
    if (options.yLabel === undefined) options.yLabel = Array.isArray(valCols) ? valCols.join(', ') : valCols;
    if (options.title === undefined) options.title = df.columns.join(' vs. ');
    const leftMargin = options.yLabel ? 50 : 0;
    const margin = options.margin || { top: 60, right: 40, bottom: 60, left: leftMargin };
    const w = (options.width || p.width) - margin.left - margin.right;
    const h = (options.height || p.height) - margin.top - margin.bottom;

    p.push();
    p.translate(margin.left, margin.top);
    drawMeta(p, options, w, h);

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
        const barH = stacked ? (rowH * 0.8) : (rowH * 0.8 / valCols.length);
        
        // Reserve space for labels on the left
        const barStartX = labelSpace;
        const barWidth = w - labelSpace;
        
        // Y-axis
        p.stroke(150); p.strokeWeight(1.5); p.line(barStartX, 0, barStartX, h);
        // X-axis with ticks
        p.stroke(150); p.strokeWeight(1.5); p.line(barStartX, h, w, h);
        p.stroke(200); p.strokeWeight(1);
        for(let i = 0; i <= 5; i++) {
          let xVal = barStartX + (barWidth / 5) * i;
          p.line(xVal, h, xVal, h + 5);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(10); p.textAlign(p.CENTER, p.TOP);
          p.text(Math.round((maxVal / 5) * i), xVal, h + 8);
          p.stroke(200);
        }
        
        labels.forEach((lbl, i) => {
            let yBase = i * rowH + (rowH * 0.1);
            let xStack = 0;
            valCols.forEach((col, j) => {
                let val = Number(rows[i][col]) || 0;
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
                  p.textSize(10); p.textAlign(p.LEFT, p.CENTER);
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
            p.fill(TEXT_COLOR); p.textAlign(p.RIGHT, p.CENTER); p.textSize(12);
            p.text(truncate(p, lbl, labelSpace - 10), barStartX - 10, i * rowH + rowH/2);
        });
    } else {
        const colW = w / labels.length;
        const barW = stacked ? (colW * 0.8) : (colW * 0.8 / valCols.length);
        
        // X-axis
        p.stroke(150); p.strokeWeight(1.5); p.line(0, h, w, h);
        // Y-axis with ticks
        p.stroke(150); p.strokeWeight(1.5); p.line(0, 0, 0, h);
        p.stroke(200); p.strokeWeight(1);
        for(let i = 0; i <= 5; i++) {
          let yVal = h - (h / 5) * i;
          p.line(-5, yVal, 0, yVal);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(10); p.textAlign(p.RIGHT, p.CENTER);
          p.text(Math.round((maxVal / 5) * i), -8, yVal);
          p.stroke(200);
        }
        labels.forEach((lbl, i) => {
            let xBase = i * colW + (colW * 0.1);
            let yStack = h;
            valCols.forEach((col, j) => {
                let val = Number(rows[i][col]) || 0;
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
                  p.textSize(10); p.textAlign(p.CENTER, p.BOTTOM);
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
            p.stroke(200); p.strokeWeight(1);
            p.line(centerX, h, centerX, h + 5);
            p.noStroke();
            p.fill(TEXT_COLOR); p.textAlign(p.CENTER, p.TOP); p.textSize(12);
            p.text(truncate(p, lbl, colW), centerX, h + 10);
        });
    }
    p.pop();
  };

  // ==========================================
  // 4. PIE CHART 
  // ==========================================
  
  p5.prototype.pie = function(data, options = {}) {
    const p = this;
    let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
    
    const valCol = options.value || df.columns[1];
    const lblCol = options.label || df.columns[0];
    
    // Data Processing
    const values = df.col(valCol).map(Number);
    const labels = df.col(lblCol);
    const total = values.reduce((a,b) => a+b, 0);
    
    // Layout & Config
    options.textAlign = options.textAlign || p.LEFT;
    
    const margin = options.margin || { top: 60, right: 40, bottom: 40, left: 60 };
    const w = (options.width || p.width) - margin.left - margin.right;
    const h = (options.height || p.height) - margin.top - margin.bottom;
    const cx = w/2; 
    const cy = h/2;
    const r = options.radius || Math.min(w, h)/2.5;
    
    // Style check
    const isDonut = options.style === 'donut';
    
    p.push();
    p.translate(margin.left, margin.top);
    
    // Auto title if not provided
    if (options.title === undefined) {
      options.title = `${lblCol} vs. ${valCol}`;
    }
    // Draw Metadata (Title, Subtitle, etc.), left-aligned
    let pieMetaOpts = Object.assign({}, options, { textAlign: p.LEFT });
    drawMeta(p, pieMetaOpts, w, h);
    
    // Shift the pie center down if outside labels are used to clear title space.
    let verticalShift = (options.labelPos === 'outside') ? 20 : 0; 
    p.translate(cx, cy + verticalShift);
    
    let startA = -p.HALF_PI;
    
    values.forEach((v, i) => {
      let ang = (v/total)*p.TWO_PI;
      let endA = startA + ang;
      let c = getColor(p, i, options.palette);

      // Hover Detection (coordinates adjusted for the pie's new center)
      let mx = p.mouseX - (margin.left + cx);
      let my = p.mouseY - (margin.top + cy + verticalShift);
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
      p.stroke(255); 
      p.strokeWeight(options.lineSize || 2);

      if (isHover) {
        p.cursor(p.HAND);
        p.push();
        p.scale(1.05); 
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
        let hole = options.holeRadius || 0.6;
        p.fill(options.background || 255);
        p.noStroke();
        p.ellipse(0, 0, r*2*hole, r*2*hole);
      }

      // --- Draw Labels & Connectors ---
      if (options.labelPos !== 'none') {
          let mid = startA + ang/2;
          // Label anchor radius: further out if outside, centered in ring if donut
          let tr = (options.labelPos === 'outside') 
                   ? r + 30 
                   : r * (isDonut ? (1 + (options.holeRadius || 0.6)) / 2 : 0.65); // Center of ring or 65% radius
                   
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
          p.textSize(options.labelSize || 11);
          
          if (options.labelPos === 'outside') {
              // Alignment fix: Anchor away from pie center
              let align = (tx > 0) ? p.LEFT : p.RIGHT;
              let buffer = (tx > 0) ? 5 : -5;
              
              p.textAlign(align, p.CENTER);
              p.fill(TEXT_COLOR);
              tx += buffer;
          } else {
              p.textAlign(p.CENTER, p.CENTER); 
              // Contrast check for inside labels
              let sliceColor = p.color(c);
              let brightness = (p.red(sliceColor) * 299 + p.green(sliceColor) * 587 + p.blue(sliceColor) * 114) / 1000;
              p.fill((brightness > 150) ? TEXT_COLOR : 255);
          }
          
          // 3. Truncation and Visibility
          let maxLabelW = (options.labelPos === 'outside') ? 100 : Math.abs(tr * ang * 0.9);

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
  
  p5.prototype.linePlot = function(data, options = {}) {
      const p = this;
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      const xCol = options.x || df.columns[0];
      const yCols = Array.isArray(options.y) ? options.y : [options.y || df.columns[1]];
      
      const margin = options.margin || { top: 50, right: 40, bottom: 60, left: 80 };
      const w = (options.width || p.width) - margin.left - margin.right;
      const h = (options.height || p.height) - margin.top - margin.bottom;
      
      const ptSz = options.pointSize || 6;
      const lnSz = options.lineSize || 2;
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
      drawMeta(p, options, w, h);
      
      // Axes
      p.stroke(150); p.strokeWeight(2);
      p.line(0, h, w, h); // X
      p.line(0, 0, 0, h); // Y
      
      p.stroke(200); p.strokeWeight(1);
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
      // Y-Ticks
        for(let i = 0; i <= 5; i++) {
          let yVal = h - (h / 5) * i;
          let labelVal = minV + ((maxV - minV) / 5) * i;
          p.line(-5, yVal, 0, yVal);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(10); p.textAlign(p.RIGHT, p.CENTER);
          p.text(formatTick(labelVal), -8, yVal);
          p.stroke(200);
        }
      // X-Ticks
      const tickInterval = Math.max(1, Math.floor(xs.length / 8));
        for(let i = 0; i < xs.length; i += tickInterval) {
          let xVal = p.map(i, 0, xs.length-1, 0, w);
          p.stroke(200); p.line(xVal, h, xVal, h + 5);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(10); p.textAlign(p.CENTER, p.TOP);
          p.text(formatTick(xs[i]), xVal, h + 8);
        }

      // Draw Lines
      yCols.forEach((col, i) => {
          let c = getColor(p, i, options.palette);
          p.stroke(c); p.strokeWeight(lnSz); p.noFill();
          p.beginShape();
          xs.forEach((xVal, j) => {
              let val = rows[j][col];
              if (val === null || val === "") { p.endShape(); p.beginShape(); return; }
              let px = p.map(j, 0, xs.length-1, 0, w);
              let py = p.map(Number(val), minV, maxV, h, 0);
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
                  let py = p.map(val, minV, maxV, h, 0);
                  
                  let d = p.dist(p.mouseX-margin.left, p.mouseY-margin.top, px, py);
                  let isHover = d < (ptSz + 4);
                  let isClicked = isHover && p.mouseIsPressed;

                  // 1. Draw Dot
                  p.strokeWeight(isHollow ? 2 : 0);
                  if (isHollow) { p.stroke(c); p.fill(bgColor); } 
                  else { p.noStroke(); p.fill(c); }

                  if (isHover) {
                      p.cursor(p.HAND);
                      if(isHollow) p.strokeWeight(3);
                      else { let hc = p.color(c); hc.setAlpha(200); p.fill(hc); p.circle(px, py, ptSz * 1.5); }
                      
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
                      p.textSize(11);
                      p.textAlign(p.CENTER, p.CENTER);

                      let txt = String(val);
                      let offset = ptSz/2 + 10;
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

  p5.prototype.scatter = function(data, options = {}) {
      const p = this;
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      const xCol = options.x || df.columns[0];
      const yCol = options.y || df.columns[1];
      
      const margin = options.margin || { top: 50, right: 40, bottom: 60, left: 80 };
      const w = (options.width || p.width) - margin.left - margin.right;
      const h = (options.height || p.height) - margin.top - margin.bottom;

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
          minS = Math.min(...sizes);
          maxS = Math.max(...sizes);
      }
      const minPtSz = options.minSize || 5;
      const maxPtSz = options.maxSize || 20;
      const fixedPtSz = options.pointSize || 8;

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
             let vals = df.col(colorCol).map(Number);
             minC = Math.min(...vals);
             maxC = Math.max(...vals);
          } else {
             // Unique categories
             colorDomain = [...new Set(df.col(colorCol))];
          }
      }

      // Bounds
      const minX = (options.minX !== undefined) ? options.minX : Math.min(...xs);
      const maxX = (options.maxX !== undefined) ? options.maxX : Math.max(...xs);
      const minY = (options.minY !== undefined) ? options.minY : Math.min(...ys);
      const maxY = (options.maxY !== undefined) ? options.maxY : Math.max(...ys);

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
      drawMeta(p, options, w, h);
      
      // --- Axes ---
      p.stroke(150); p.strokeWeight(2);
      p.line(0, h, w, h); // X
      p.line(0, 0, 0, h); // Y
      
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

      // X-Ticks
      p.stroke(200); p.strokeWeight(1);
      for(let i = 0; i <= 5; i++) {
        let xVal = (w / 5) * i;
        let labelVal = minX + ((maxX - minX) / 5) * i;
        p.line(xVal, h, xVal, h + 5);
        p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(10); p.textAlign(p.CENTER, p.TOP);
        p.text(formatTick(labelVal), xVal, h + 8);
        p.stroke(200);
      }
      
      // Y-Ticks
      for(let i = 0; i <= 5; i++) {
        let yVal = h - (h / 5) * i;
        let labelVal = minY + ((maxY - minY) / 5) * i;
        p.stroke(200); p.line(-5, yVal, 0, yVal);
        p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(10); p.textAlign(p.RIGHT, p.CENTER);
        p.text(formatTick(labelVal), -8, yVal);
        p.stroke(200);
      }

      // --- Connect Lines  ---
      if (options.connect) {
          let lineC = options.lineColor || palette[0];
          p.noFill(); p.stroke(lineC); p.strokeWeight(options.lineSize || 2);
          p.beginShape();
          // Note: connecting assumes order in data array. 
          // If you need sorted, sort the DataFrame before passing.
          for(let i=0; i<xs.length; i++) {
             let cx = p.map(xs[i], minX, maxX, 0, w);
             let cy = p.map(ys[i], minY, maxY, h, 0);
             p.vertex(cx, cy);
          }
          p.endShape();
      }
      
      // --- Scatter Points ---
      p.noStroke(); 
      const baseColor = options.baseColor || palette[0];
      
      for(let i=0; i<xs.length; i++) {
          let cx = p.map(xs[i], minX, maxX, 0, w);
          let cy = p.map(ys[i], minY, maxY, h, 0);
          
          // 1. Determine Radius
          let r = fixedPtSz;
          if (sizeCol && sizes[i] !== undefined) {
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
          p.strokeWeight(isHollow ? 2 : 0);
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
               if(isHollow) p.strokeWeight(3);
               else { 
                   let hc = p.color(ptColor); 
                   hc.setAlpha(200); 
                   p.fill(hc); 
                   p.circle(cx, cy, r * 1.5); // Bloom effect
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
              p.textSize(10);
              p.textAlign(p.CENTER, p.CENTER);
              
              let txt = sizeCol ? String(sizes[i]) : String(ys[i]); 
              
              let offset = r/2 + 8;
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

p5.prototype.hist = function(data, options = {}) {
    const p = this;
    let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
    const col = options.x || options.column || df.columns[0];
    
    // --- Data Preparation (Binning) ---
    const vals = df.col(col).map(Number).filter(v => !isNaN(v));
    if (vals.length === 0) return;
    
    // Determine bounds and optimal bin size (Natural Bins)
    const requestedBins = options.bins || 10;
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
    const margin = options.margin || { top: 60, right: 40, bottom: 60, left: 80 };
    const w = (options.width || p.width) - margin.left - margin.right;
    const h = (options.height || p.height) - margin.top - margin.bottom;
    
    const maxAxisVal = Math.ceil(maxCount / 5) * 5;
    const barW = w / finalBins; 
    
    // 1. Determine Background Luminance for Contrast
    const bgColor = options.background || p.color(255); 
    const bg = p.color(bgColor);
    const bgLuminance = (p.red(bg) * 0.299 + p.green(bg) * 0.587 + p.blue(bg) * 0.114);
    
    // 2. Set Default Border Color for Reproducible Contrast
    const defaultContrastColor = (bgLuminance > 128) ? p.color('#333333') : p.color('#CCCCCC');
    
    const borderWeight = options.borderWeight || 1;
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
    drawMeta(p, options, w, h);

    // --- Axes and Ticks ---
    p.textFont(options.font || DEFAULT_FONT);
    
    // X-axis (Base line)
    p.stroke(150); p.strokeWeight(1.5); p.line(0, h, w, h);
    
    // Y-axis (Vertical line)
    p.line(0, 0, 0, h); 
    
    // Y-ticks
    p.stroke(200); p.strokeWeight(1);
    for(let i = 0; i <= 5; i++) {
        let yVal = h - (h / 5) * i;
        let labelVal = (maxAxisVal / 5) * i;
        p.line(-5, yVal, 0, yVal);
        
        // Ensure Y-axis labels have no stroke
        p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(10); 
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(labelVal, -8, yVal);
        p.stroke(200);
    }
    
    // X-Ticks (At Edges)
    p.fill(TEXT_COLOR); p.textSize(10);
    const TEXT_BOX_WIDTH = 30; // Define text box width for 4-argument p.text()
    const TICK_LABEL_PADDING = 3; 
    
    // Controlled Label Decimation ---
    // 1. Estimate the space needed for a label (e.g., 20px) plus a buffer (5px) = 25px
    const minLabelSpace = 25; 
    
    // 2. Calculate how many bins fit in that space
    let labelEvery = Math.max(1, Math.ceil(minLabelSpace / barW));
    // -----------------------------------------
    
    binEdges.forEach((edgeValue, i) => {
        const xPos = i * barW; 
        
        p.stroke(200); 
        p.line(xPos, h, xPos, h + 5);

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
                p.text(labelText, textX, h + 8, TEXT_BOX_WIDTH); 

            } else if (i === finalBins) {
                // **FIX: Right Edge Special Alignment with Padding**
                // Use 2-argument p.text() which perfectly respects p.RIGHT alignment.
                // Add TICK_LABEL_PADDING to push the text past the tick mark.
                align = p.RIGHT; 
                
                p.textAlign(align, p.TOP);
                p.text(labelText, xPos + TICK_LABEL_PADDING, h + 8); 

            } else {
                // Internal Ticks: Center aligned using 4-argument p.text()
                align = p.CENTER;
                // Shift the drawing point left by half the text box width 
                // so the center of the 30px box is at xPos.
                textX -= TEXT_BOX_WIDTH / 2;
                
                p.textAlign(align, p.TOP);
                
                // The p.text function with 4 arguments treats the x, y coordinates as the corner
                // of the text box.
                p.text(labelText, textX, h + 8, TEXT_BOX_WIDTH); 
            }
        }
    });

    // --- Draw Bars (Touching with Dynamic Border and Tooltips) ---
    p.textFont(options.font || DEFAULT_FONT); 

    counts.forEach((count, i) => {
        const rectX = i * barW;
        const rectH = p.map(count, 0, maxAxisVal, 0, h);
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
            p.textSize(10);
            
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
  p5.prototype.table = function(data, options = {}) {
      const p = this;
      // Convert data to DataFrame if not already
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      const id = options.id || 'p5chart_table';
      
      // Auto-enable searchable and pagination for tables with more than 10 rows
      const totalRowCount = df.rows.length;
      const searchable = options.searchable !== undefined ? options.searchable : (totalRowCount > 10);
      const pagination = options.pagination !== undefined ? options.pagination : (totalRowCount > 10);
      
      // Initialize pagination state if not exists
      if (!p.chart._tableStates) p.chart._tableStates = {};
      if (!p.chart._tableStates[id]) {
          p.chart._tableStates[id] = { currentPage: options.page || 0 };
      }
      const state = p.chart._tableStates[id];
      
      // Layout dimensions (calculate early for search input positioning)
      const x = options.x || 20; 
      const y = options.y || 80;
      const w = options.width || p.width - 40;
      const rowH = 30;
      
      // Only create search input if searchable is true
      if (searchable) {
          if (!p.chart.inputs[id]) {
              let inp = p.createInput('');
              // Position at bottom left corner
              inp.position(x, y + 400); // Will be adjusted dynamically
              inp.attribute('placeholder', 'Search...');
              inp.style('padding', '4px 8px');
              inp.style('font-family', 'sans-serif');
              inp.style('font-size', '12px');
              inp.style('width', '150px');
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
      const maxRows = options.maxRows || 10;
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
          p.chart.inputs[id].position(x, tableBottom + 15);
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
      const headerColor = options.headerColor || p.color(240);
      const rowColor1 = options.rowColor1 || p.color(255);
      const rowColor2 = options.rowColor2 || p.color(250);
      const hoverColor = options.hoverColor || p.color(150, 200, 255);
      const borderColor = options.borderColor || p.color(200);
      
      // Draw title (without page count)
      const title = options.title || 'Data Table';
      p.push();
      p.translate(x, y - 30);
      p.fill(TEXT_COLOR); 
      p.textSize(16); 
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
              p.fill(cellTextColor);
              p.text(truncate(p, r[c], colW-10), j*colW + 5, ry + rowH/2);
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
          p.textSize(12);
          
          // Arrow button dimensions
          const arrowSize = 24;
          const spacing = 5;
          const pageTextWidth = 50;
          
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
  
  p5.prototype.mapChart = function(data, options = {}) {
      const p = this;
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      
      // Column mapping
      const latCol = options.lat || options.latitude || 'lat';
      const lonCol = options.lon || options.longitude || 'lon';
      const labelCol = options.label || 'label';
      const valueCol = options.value || 'value';
      
      // Auto-calculate center from data if not provided
      let autoCenterLat = 37.8;
      let autoCenterLon = -96;
      if (!options.centerLat || !options.centerLon) {
          const lats = df.col(latCol).map(Number).filter(v => !isNaN(v));
          const lons = df.col(lonCol).map(Number).filter(v => !isNaN(v));
          if (lats.length > 0 && lons.length > 0) {
              autoCenterLat = lats.reduce((a, b) => a + b, 0) / lats.length;
              autoCenterLon = lons.reduce((a, b) => a + b, 0) / lons.length;
          }
      }
      
      // Map state
      if (!p.chart._mapState) {
          p.chart._mapState = {
              centerLat: options.centerLat || autoCenterLat,
              centerLon: options.centerLon || autoCenterLon,
              zoom: options.zoom || 4,
              tiles: {},
              hoveredPoint: null
          };
      }
      const state = p.chart._mapState;
      
      // Style options
      const pointColor = options.pointColor || p.color(214, 39, 40);
      const pointSize = options.pointSize || 12;
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
      if (Object.keys(state.tiles).length === 0) {
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
          let pos = latLonToPixel(lat, lon);
          
          if (pos.x >= 0 && pos.x <= p.width && pos.y >= 0 && pos.y <= p.height) {
              let d = p.dist(p.mouseX, p.mouseY, pos.x, pos.y);
              let isHovered = d < pointSize;
              
              if (isHovered) {
                  state.hoveredPoint = { row, pos, labelCol, valueCol };
              }
              
              p.fill(pointColor.levels[0], pointColor.levels[1], pointColor.levels[2], isHovered ? 255 : 200);
              p.ellipse(pos.x, pos.y, isHovered ? pointSize * 1.3 : pointSize, isHovered ? pointSize * 1.3 : pointSize);
              p.fill(255);
              p.ellipse(pos.x, pos.y, isHovered ? pointSize * 0.5 : pointSize * 0.33, isHovered ? pointSize * 0.5 : pointSize * 0.33);
              
              if (showLabels && row[labelCol]) {
                  p.fill(0);
                  p.textAlign(p.CENTER, p.BOTTOM);
                  p.textSize(11);
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
          
          p.textSize(12);
          let maxWidth = 0;
          lines.forEach(l => { maxWidth = Math.max(maxWidth, p.textWidth(l)); });
          let boxW = maxWidth + 20;
          let boxH = lines.length * 18 + 10;
          
          let tx = p.mouseX + 15;
          let ty = p.mouseY + 15;
          if (tx + boxW > p.width) tx = p.mouseX - boxW - 10;
          if (ty + boxH > p.height) ty = p.mouseY - boxH - 10;
          
          p.noStroke();
          p.fill(0, 0, 0, 220);
          p.rect(tx, ty, boxW, boxH, 4);
          p.fill(255);
          p.textAlign(p.LEFT, p.TOP);
          lines.forEach((l, i) => p.text(l, tx + 10, ty + 8 + i * 18));
      } else {
          p.cursor(p.ARROW);
      }
      
      // Draw controls
      if (showControls) {
          p.fill(255, 240);
          p.noStroke();
          p.rect(10, 10, 150, 78, 5);
          p.fill(0);
          p.textAlign(p.LEFT, p.TOP);
          p.textSize(12);
          p.text('Arrow keys: Pan', 15, 15);
          p.text('+/- keys: Zoom', 15, 32);
          p.text('Scroll: Zoom', 15, 49);
          p.text(`Zoom: ${state.zoom}`, 15, 64);
      }
      
      p.pop();
      
      // Handle keyboard input for map navigation
      p._handleMapKeys = function() {
          let panAmount = 0.5;
          if (p.keyIsDown(p.LEFT_ARROW)) state.centerLon -= panAmount;
          if (p.keyIsDown(p.RIGHT_ARROW)) state.centerLon += panAmount;
          if (p.keyIsDown(p.UP_ARROW)) state.centerLat += panAmount;
          if (p.keyIsDown(p.DOWN_ARROW)) state.centerLat -= panAmount;
      };
      
      p._handleMapKeyPress = function() {
          if (p.key === '+' || p.key === '=') {
              state.zoom = Math.min(18, state.zoom + 1);
              loadVisibleTiles();
          }
          if (p.key === '-' || p.key === '_') {
              state.zoom = Math.max(2, state.zoom - 1);
              loadVisibleTiles();
          }
      };
      
      p._handleMapWheel = function(event) {
          // Zoom in/out with mouse wheel
          if (event.delta > 0) {
              state.zoom = Math.max(2, state.zoom - 1);
              loadVisibleTiles();
          } else if (event.delta < 0) {
              state.zoom = Math.min(18, state.zoom + 1);
              loadVisibleTiles();
          }
          // Prevent page scroll
          return false;
      };
      
      // Auto-register handlers if not already done
      if (!p.chart._mapHandlersRegistered) {
          const originalKeyPressed = p.keyPressed || (() => {});
          p.keyPressed = function() {
              originalKeyPressed.call(p);
              if (p._handleMapKeyPress) p._handleMapKeyPress();
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
      
      // Call navigation handler
      if (p._handleMapKeys) p._handleMapKeys();
  };
    
})();