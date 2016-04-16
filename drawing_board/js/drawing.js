/**
 * Created by lua on 15/04/2016.
 */

//Debug variables
var debug = document.querySelector("#debug");
var dbSelectedTool = document.querySelector("#selectedTool");
var dbIsDrawing = document.querySelector("#isDrawing");
var dbDrawingObjInfo = document.querySelector("#drawingObjInfo");
var dbCustomInfo = document.querySelector("#customInfo");

var isDebugged = true;

//variables used for transferring data between 2 canvases


var TOOL = {
    NONE: "none",
    CIRCLE: "circle",
    RECTANGLE: "rectangle",
    LINE: "line"
};

/**
 * The canvas
 */
var canvas;

/**
 * The shape that the user is selecting in the tool bar.
 * Default is no tool selected
 */
var selectedTool = TOOL.RECTANGLE;

var selectedColor = "#ff0000";

/**
 * store the object that is being drawn
 */
var drawingObject;

/**
 * checking if mouse button is being pressed
 */
var isMouseDown;
/**
 * store the position whenever the mouse is clicked
 * @type {{}}
 */
var mouseDownPosition = {};

function initCanvas() {
    if(isDebugged) {
        debug.style.display = "block";
    } else {
        debug.style.display = "none";
    }

    console.log("initializing canvas");
    canvas = new fabric.Canvas("canvas",{selection: false});

    canvas.on("mouse:down", function(o) {
        isMouseDown = true;

        var pointer = canvas.getPointer(o.e);
        mouseDownPosition.x = pointer.x;
        mouseDownPosition.y = pointer.y;

        if (selectedTool == TOOL.NONE) {
            return;
        } else if (selectedTool = TOOL.RECTANGLE) {
            drawingObject = new fabric.Rect({
                originX: "left",
                originY: "top",
                left: mouseDownPosition.x,
                top: mouseDownPosition.y,
                fill: selectedColor,
                width: 0,
                height: 0
            });
        }

        addObjectIntoCanvas(drawingObject);

        if (debug) {
            dbSelectedTool.innerHTML = selectedTool + "";
        }
    });

    canvas.on("mouse:up", function(o) {
        isMouseDown = false;

        if(debug) {
            dbIsDrawing.innerHTML = false + "";
        }
    });

    canvas.on("mouse:move", function(o) {
        if (isMouseDown && selectedTool != TOOL.NONE) {
            var pointer = canvas.getPointer(o.e);


            if(mouseDownPosition.x > pointer.x) {
                drawingObject.set({left: pointer.x});
            }
            if(mouseDownPosition.y > pointer.y) {
                drawingObject.set({top: pointer.y});
            }


            drawingObject.set({
                width: Math.abs(mouseDownPosition.x - pointer.x),
                height: Math.abs(mouseDownPosition.y - pointer.y)
            });
        }

        canvas.renderAll();

        if(debug){
            dbDrawingObjInfo.innerHTML = JSON.stringify(drawingObject);

            if(isMouseDown) {
                dbIsDrawing.innerHTML = "true";
            }

            //var pointer = canvas.getPointer(o.e);
            //dbCustomInfo.innerHTML = "pointer (" + pointer.x + ", " + pointer.y + ")";

            var objs = canvas.getObjects();
            dbCustomInfo.innerHTML = drawingObject.id;
        }
    });
}

/**
 * By using this function to add an object into the canvas, each canvas is assigned an unique id
 */
function addObjectIntoCanvas(fabricObject) {
    fabricObject.id = objectIdGenerator();
    canvas.add(fabricObject);
}

/**
 * auto generates id for a drawing object. The id includes the user's username who draws the object and an autoincrement
 * number
 */
var autoIndex = 0; //
function objectIdGenerator() {
    return currentUsername + "_" + autoIndex++;
}