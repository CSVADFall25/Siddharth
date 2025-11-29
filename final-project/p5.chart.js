// Base


p5.prototype.chart = p5.prototype.chart || {};


p5.prototype.createChart = function (x, y, w, h, options) {
  return new Chart(this, x, y, w, h, options);
};


p5.prototype.barChart = function (x, y, w, h, values, options) {
  const chart = new Chart(this, x, y, w, h, options);
  chart.bar(values);
};


class Chart {
  constructor(p, x, y, w, h, options) {
    this.p = p; 
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    const defaults = {
      padding: 24,
      background: 255,
      axisColor: 0,
      barColor: 100
    };

    this.options = Object.assign({}, defaults, options);
  }

  // Draw a basic vertical bar chart from an array of numbers
  bar(values) {
    const p = this.p;

    if (!Array.isArray(values) || values.length === 0) {
      return;
    }

    const pad = this.options.padding;
    const innerX = this.x + pad;
    const innerY = this.y + pad;
    const innerW = this.w - 2 * pad;
    const innerH = this.h - 2 * pad;

    // Compute min and max
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }

    // Background for the chart area
    p.push();
    p.noStroke();
    p.fill(this.options.background);
    p.rect(this.x, this.y, this.w, this.h);

    // Axes
    p.stroke(this.options.axisColor);
    p.line(innerX, innerY, innerX, innerY + innerH); // y-axis
    p.line(innerX, innerY + innerH, innerX + innerW, innerY + innerH); // x-axis

    // Bars
    const n = values.length;
    const barW = innerW / n;

    p.noStroke();
    p.fill(this.options.barColor);

    for (let i = 0; i < n; i++) {
      const v = values[i];
      const t = (v - minVal) / (maxVal - minVal); // 0..1
      const barH = t * innerH;

      const bx = innerX + i * barW;
      const by = innerY + innerH - barH;

      // Slight gap between bars with 0.8 factor
      p.rect(bx, by, barW * 0.8, barH);
    }

    p.pop();
  }
}
