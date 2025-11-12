/* base.js
This file sets up the canvas and draws the Instagram-themed title and handle.
*/
let instagramLogo;
const instagramLink = "https://www.instagram.com/siddharthchattoraj/";
let isHovering = false;

function preload() {
  instagramLogo = loadImage('fonts/instagram_logo.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
}

function draw() {
  background(0);

  // helper to lighten a hex color toward white
  const lightenColor = (hex, percent) => {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) & 255,
        g = (num >> 8) & 255,
        b = num & 255;
    r = Math.round(r + (255 - r) * percent);
    g = Math.round(g + (255 - g) * percent);
    b = Math.round(b + (255 - b) * percent);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // title gradient
  const titleGradient = drawingContext.createLinearGradient(0, 0, width, 0);
  titleGradient.addColorStop(0.00, '#F58529');
  titleGradient.addColorStop(0.25, '#FEDA77');
  titleGradient.addColorStop(0.50, '#DD2A7B');
  titleGradient.addColorStop(0.75, '#8134AF');
  titleGradient.addColorStop(1.00, '#515BD4');
  drawingContext.fillStyle = titleGradient;

  // title
  const titleText = "Siddharth Chattoraj’s Sent Instagram DMs";
  const titleSize = width * 0.05;
  drawingContext.font = `${titleSize}px Billabong, cursive`;
  drawingContext.textAlign = "center";
  drawingContext.textBaseline = "middle";
  drawingContext.fillText(titleText, width / 2, height * 0.075);

  // handle
  const handleText = "@siddharthchattoraj";
  const handleSize = width * 0.0125;
  drawingContext.font = `${handleSize}px 'Instagram Sans', sans-serif`;
  drawingContext.textAlign = "right";
  drawingContext.textBaseline = "bottom";

  const margin = 20;
  const handleTextWidth = drawingContext.measureText(handleText).width;
  const handleY = height - margin;

  // hover detection for handle + logo area
  const logoHeight = handleSize * 1.5;
  const logoAspectRatio = instagramLogo ? (instagramLogo.width / instagramLogo.height) : 1;
  const logoWidth = logoHeight * logoAspectRatio;
  const totalWidth = handleTextWidth + logoWidth + 20;
  const isHoveringNow =
    mouseX >= width - margin * 2 - totalWidth &&
    mouseX <= width &&
    mouseY >= handleY - logoHeight &&
    mouseY <= handleY;

  // gradient for handle: brighter on hover
  const handleGradient = drawingContext.createLinearGradient(
    width - margin * 2 - handleTextWidth, 0, width - margin * 2, 0
  );
  if (isHoveringNow) {
    handleGradient.addColorStop(0.00, lightenColor('#F58529', 0.4));
    handleGradient.addColorStop(0.25, lightenColor('#FEDA77', 0.4));
    handleGradient.addColorStop(0.50, lightenColor('#DD2A7B', 0.4));
    handleGradient.addColorStop(0.75, lightenColor('#8134AF', 0.4));
    handleGradient.addColorStop(1.00, lightenColor('#515BD4', 0.4));
  } else {
    handleGradient.addColorStop(0.00, '#F58529');
    handleGradient.addColorStop(0.25, '#FEDA77');
    handleGradient.addColorStop(0.50, '#DD2A7B');
    handleGradient.addColorStop(0.75, '#8134AF');
    handleGradient.addColorStop(1.00, '#515BD4');
  }
  drawingContext.fillStyle = handleGradient;
  drawingContext.fillText(handleText, width - margin * 2, handleY);

  // logo next to handle and brighten a touch on hover
  if (instagramLogo) {
    imageMode(CORNER);
    if (isHoveringNow) drawingContext.filter = 'brightness(1.15)';
    image(
      instagramLogo,
      width - margin * 2 + 3,
      handleY - logoHeight + 5,
      logoWidth,
      logoHeight
    );
    drawingContext.filter = 'none';
  }
  isHovering = isHoveringNow;
  cursor(isHovering ? 'pointer' : 'default');
}

function mousePressed() {
  if (isHovering) {
    window.open(instagramLink, "_blank");
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
