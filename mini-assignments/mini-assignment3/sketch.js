/* 
I mirrored the video.
1) The live feed is subdivided into a grid, and each cell's color intensity is based on the average motion detected within that cell.
2) I created sliders to modify the grid composition overlay (horizontal and vertical divisions).
3) I changed the edges to blue dots and made it so motion means dots outlining edges moving become warmer (based on how fast).
I consulted ChatGPT to help debug syntax errors and to help construct the subdivision average motion detection.
*/

// example from https://kylemcdonald.github.io/cv-examples/
// https://inspirit.github.io/jsfeat/sample_canny_edge.html

var capture;
var buffer;
var result;
var w = 640,
    h = 480;

var grayNow, grayPrev;
var sampleStep = 3;
var x_val, y_val;

function setup() {
    capture = createCapture({
        audio: false,
        video: {
            width: w,
            height: h
        }
    }, function() {
        console.log('capture ready.')
    });
    capture.elt.setAttribute('playsinline', '');
    createCanvas(w, h);
    capture.size(w, h);
    capture.hide();
    buffer = new jsfeat.matrix_t(w, h, jsfeat.U8C1_t);
    grayNow  = new jsfeat.matrix_t(w, h, jsfeat.U8C1_t);
    grayPrev = new jsfeat.matrix_t(w, h, jsfeat.U8C1_t);

    colorMode(HSB, 255);
    noStroke();

    // Horizontal and Vertical grid sliders
    let controlsParent = select('#highThreshold') ? select('#highThreshold').elt.parentNode : null;

    let xDivContainer = createDiv();
    xDivContainer.html('<br>Vertical Divisions: ');
    xDivContainer.style('color', 'black');
    xDivContainer.style('display', 'flex');
    xDivContainer.style('gap', '8px');
    xDivContainer.style('align-items', 'center');
    xDivSlider = createSlider(1, 20, 10, 1);
    xDivSlider.style('width', '200px');
    xDivSlider.parent(xDivContainer);

    let yDivContainer = createDiv();
    yDivContainer.html('Horizontal Divisions: ');
    yDivContainer.style('color', 'black');
    yDivContainer.style('display', 'flex');
    yDivContainer.style('gap', '8px');
    yDivContainer.style('align-items', 'center');
    yDivSlider = createSlider(1, 20, 10, 1);
    yDivSlider.style('width', '200px');
    yDivSlider.parent(yDivContainer);

    if (controlsParent) {
        xDivContainer.parent(controlsParent);
        yDivContainer.parent(controlsParent); 
    }
}

function jsfeatToP5(src, dst) {
    if (!dst || dst.width != src.cols || dst.height != src.rows) {
        dst = createImage(src.cols, src.rows);
    }
    var n = src.data.length;
    dst.loadPixels();
    var srcData = src.data;
    var dstData = dst.pixels;
    for (var i = 0, j = 0; i < n; i++) {
        var cur = srcData[i];
        dstData[j++] = cur;
        dstData[j++] = cur;
        dstData[j++] = cur;
        dstData[j++] = 255;
    }
    dst.updatePixels();
    return dst;
}

function draw() {
    background(0); // only dots visible
    capture.loadPixels();
    if (capture.pixels.length > 0) { // don't forget this!
        var blurSize = select('#blurSize') ? select('#blurSize').elt.value : 50;
        var lowThreshold = select('#lowThreshold') ? select('#lowThreshold').elt.value : 20;
        var highThreshold = select('#highThreshold') ? select('#highThreshold').elt.value : 60;

        blurSize = map(blurSize, 0, 100, 1, 12);
        lowThreshold = map(lowThreshold, 0, 100, 0, 255);
        highThreshold = map(highThreshold, 0, 100, 0, 255);

        jsfeat.imgproc.grayscale(capture.pixels, w, h, grayNow);

        buffer.data.set(grayNow.data);
        jsfeat.imgproc.gaussian_blur(buffer, buffer, blurSize, 0);
        jsfeat.imgproc.canny(buffer, buffer, lowThreshold, highThreshold);
        var n = buffer.rows * buffer.cols;
        // Invert image
        // for (var i = 0; i < n; i++) {
        //     buffer.data[i] = 255 - buffer.data[i];
        // }
        // Result
        result = jsfeatToP5(buffer, result);

        // Mirror image
        push();
        translate(width, 0);
        scale(-1, 1);

        // Dots!
        var maxMotion = 30;
        for (var y = 0; y < h; y += sampleStep) {
            var rowIndex = y * w;
            for (var x = 0; x < w; x += sampleStep) {
                var idx = rowIndex + x;
                if (buffer.data[idx] !== 0) {
                    var m = Math.abs((grayNow.data[idx] | 0) - (grayPrev.data[idx] | 0));
                    if (m > maxMotion) m = maxMotion;
                    var hueVal = map(m, 0, maxMotion, 170, 0);
                    fill(hueVal, 255, 255);
                    ellipse(x, y, 4, 4);
                }
            }
        }
        pop();

        // sliders to modify grid
        x_val = xDivSlider ? xDivSlider.value() : 10;
        y_val = yDivSlider ? yDivSlider.value() : 10;
        const xStep = width  / Math.max(1, x_val);
        const yStep = height / Math.max(1, y_val);

        // overlay a grid with content-aware subdivision
        for (let gy = 0; gy < y_val; gy++) {
            for (let gx = 0; gx < x_val; gx++) {
                const x0 = Math.floor(gx * xStep), x1 = Math.floor((gx + 1) * xStep);
                const y0 = Math.floor(gy * yStep), y1 = Math.floor((gy + 1) * yStep);

                let acc = 0, cnt = 0;
                for (let yy = y0; yy < y1; yy += sampleStep) {
                const row = yy * w;
                for (let xx = x0; xx < x1; xx += sampleStep) {
                    const idx = row + xx;
                    if (buffer.data[idx] !== 0) {
                    let m = Math.abs((grayNow.data[idx] | 0) - (grayPrev.data[idx] | 0));
                    if (m > 60) m = 60;          
                    acc += m; cnt++;
                    }
                }
                }

                const mAvg = cnt ? acc / cnt : 0;
                const hueVal = map(mAvg, 0, 30, 170, 0); 

                noStroke();
                fill(hueVal, 255, 255, cnt ? 60 : 0);   
                rect(x0, y0, x1 - x0, y1 - y0);
            }
        }

        // Overlay Grid
        stroke(255, 50);
        for (let x = 0; x < width; x += xStep) line(x, 0, x, height);
        for (let y = 0; y < height; y += yStep) line(0, y, width, y);
        noStroke();

        grayPrev.data.set(grayNow.data);
    }
}
