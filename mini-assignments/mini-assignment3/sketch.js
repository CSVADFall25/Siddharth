/* 
I mirrored the video.
I changed the edges to blue dots and made it so motion means dots outlining edges moving become warmer (based on how fast).
I overlaid a grid on top of the dots for now.
*/
// IN PROGRESS

// example from https://kylemcdonald.github.io/cv-examples/
// https://inspirit.github.io/jsfeat/sample_canny_edge.html

var capture;
var buffer;
var result;
var w = 640,
    h = 480;

var grayNow, grayPrev;
var sampleStep = 3;

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
        var maxMotion = 60;
        for (var y = 0; y < h; y += sampleStep) {
            var rowIndex = y * w;
            for (var x = 0; x < w; x += sampleStep) {
                var idx = rowIndex + x;
                if (buffer.data[idx] !== 0) {
                    var m = Math.abs((grayNow.data[idx] | 0) - (grayPrev.data[idx] | 0));
                    if (m > maxMotion) m = maxMotion;
                    var hueVal = map(m, 0, maxMotion, 170, 0);
                    fill(hueVal, 255, 255);
                    ellipse(x, y, 8, 8);
                }
            }
        }
        pop();

        // overlay a grid
        stroke(255, 50);
        for (var x = 0; x < width; x += 20) {
            line(x, 0, x, height);
        }
        for (var y = 0; y < height; y += 20) {
            line(0, y, width, y);
        }
        noStroke();

        grayPrev.data.set(grayNow.data);
    }
}
