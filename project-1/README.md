# Pattern Illustrator
**MAT 236: Project 1**
**By: Siddharth Chattoraj**

## Overview

Pattern Illustrator is a drawing and animation tool that enables users to directly design symmetric pattern drawings or generate sketches with Gemini. All illustrations created within the tool are built from a series of strokes, and the user can modify these strokes to improve the overall aesthetic of the drawing. Pattern Illustrator further provides users with the power to visualize an animation between up to 10 illustrations created within the platform. The goal of Pattern Illustrator is to encourage the user to find meaning from and create expression out of patterns. 

## Functionality

Users are constrained to create drawings only based on existing patterns. They have the choice of choosing from one of seven modes of symmetry — 180 degree rotational, 4-way rotational, mirrored, radial, dihedral, spiral, kaleidoscopic, and fractal symmetry — or they can use Gemini, which fundamentally is based on recognizing patterns from its training dataset, to generate artwork. As users create their drawings, they will ink a series of strokes onto the canvas, which can then be individually modified. 

Pattern Illustrator has interfaces, buttons, and sliders that can be applied to creating new strokes or modifying existing onces in order to allow the user to experiment with different modes of creation. Depending on the mode of symmetry selected, sliders may appear allowing the user to control the number of symmetry repetitions (`N`), `Scale`, and/or `Depth` of the pattern before they draw. Users can control the hue, saturation, brightness, thickness, and opacity of the stroke via the color picker and subsequent sliders. Furthermore, Pattern Illustrator allows the user to click an individual stroke to change its color/thickness properties (`Change`), alter its form (`Vertex`), move its location (`Move`), erase the select portion (`Erase`), or delete the stroke (`Delete`). Users can also clear the canvas (`Clear`), save the current canvas as a PNG (`Save`), and store (`Store`) drawings for future modification or for eventual animation. Drawings can be removed from the store panel by clicking the red `x` on the drawing in the panel, and drawings can be accessed for modification in the Canvas by clicking on them. 

At the bottom of the tools section, there are two AI prompt sections: `AI Art` and `AI Palette`. Prompting Gemini within the AI Art textbox will result in Gemini's representation of the user's request as 20 to 60 modifiable strokes on the Canvas, with the same properties (e.g. color, thickness) that users have access, but without the constraint of symmetry. Prompting Gemini within the AI Palette text box will result in 4 to 5 color swatches appearing in the top left of the drawing tool, and the user can click on those and use them in their illustrations.

To animate drawings, users must have at least two drawings stored. Storing does not automatically clear the canvas, but users are welcome to clear the canvas as they see fit between stored drawings for an animation. They can set the `Ease` and `Animation Duration` via a dropdown and slider respectively in the tools panel. Pressing `Animate` will render an animation in the Canvas.

## Design

At no point is the user able to "free draw", but they are able to "free modify" their illustrations.

- indivual strokes modoifying goal

## Reflections and Outcomes

- todo

## Instructions to run with AI features
1. Clone the repository.
2. Create a free Gemini API key for 2.5-Flash in Google AI Studio following these [instructions](https://ai.google.dev/gemini-api/docs/api-key). 
3. Rename `.env.example` to `.env` and insert the API key.
4. Download and install [node.js](https://nodejs.org/en/download).
5. Open Visual Studio Code and make sure you are in the `project-1` directory. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
6. Run `node server.js` in the terminal. You should see the following message if done correctly:
```
🚀 Server running on http://localhost:8787
🧠 Using model: gemini-2.5-flash
✅ Ready for /palette and /art
```
7. Open `index.html` with Live Server. 

