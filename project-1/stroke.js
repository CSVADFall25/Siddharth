/* Stroke.js
- Stores Points + Color (+ Thickness)
- Draws a Smooth Polyline
*/
class Stroke {
    // Creates new stroke with chosen color and thickness
    constructor(col, thickness = 4, opacity = 100) {
        this.col = col;              // color of stroke
        this.thickness = thickness;  // line thickness in pixels
        this.opacity = this.opacity; // line opacity (0-100)
        this.points = [];            // list of points {x , y} that form the stroke
    }

    // Adds a new point (x, y) to the stroke while mouse is being dragged
    add(x, y) {
        this.points.push({ x, y});
    }

    // Draws the stroke on canvas
    draw(p) {
        // Draw nothing if not enough points
        if (this.points.length < 2) return;

        // Set Drawing style
        p.stroke(this.col);               // line color
        p.noFill();                       // no fill
        p.strokeWeight(this.thickness);   // line thickness
        p.strokeCap(p.ROUND);             // rounded line ends
        p.strokeJoin(p.ROUND);            // rounded line joints

        // Begin Shape
        p.beginShape();
        for (const pt of this.points) {
            p.curveVertex(pt.x, pt.y); // add curve vertex at point
        }
        p.endShape(); // end shape
    }
}
