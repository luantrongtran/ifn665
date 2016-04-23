/**
 * Created by lua on 15/04/2016.
 */

//Debug variables
var debug = document.querySelector("#debug");
var dbSelectedTool = document.querySelector("#selectedTool");
var dbIsDrawing = document.querySelector("#isDrawing");
var dbDrawingObjInfo = document.querySelector("#drawingObjInfo");
var dbCustomInfo = document.querySelector("#customInfo");

var isDebugged = false;

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
 * stores all the drawing objects of other peers. Drawing object are shapes being drawn by other peers.
 * Each user has an unique drawing object. This is a key, value pair array. For example, arrDrawingObject['username']
 * is the drawing object of a user whose username is 'username'
 * @type {{}}
 */
var arrDrawingObject = {};

/**
 * checking if mouse button is being pressed
 */
var isMouseDown;

/**
 * store the position whenever the mouse is clicked
 * @type {}
 */
var mouseDownPosition = {};

/**
 * Initialising the canvas. Also, adding necessary events for the canvas
 */
function initCanvas() {
    if(isDebugged) {
        debug.style.display = "block";
    } else {
        debug.style.display = "none";
    }

    console.log("initializing canvas");

    //var canvasElement = document.querySelector("#canvas");
    canvas = new fabric.Canvas("canvas",{selection: false, height: 500, width: 1000});

    //canvas.isDrawingMode = true;

    canvas.on("mouse:down", onMouseDownCanvas);

    canvas.on("mouse:up", onMouseUpCanvas);

    canvas.on("mouse:move", onMouseMoveCanvas);
}

/**
 * Mouse up event of canvas
 * @param o
 */
function onMouseUpCanvas(o) {
    isMouseDown = false;

    if(isBoardOwner) {

    } else {
        onMouseUpExtraEventForGuest();
    }

    if(debug) {
        dbIsDrawing.innerHTML = false + "";
    }
}

/**
 * Mouse move event of canvas
 * @param o
 */
function onMouseMoveCanvas(o) {

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

        if(isBoardOwner) {
            //Sending the drawing object to other peers

        } else {
            onMouseMoveExtraEventForGuest();
        }
    }

    canvas.renderAll();

    if(debug == true) {
        dbDrawingObjInfo.innerHTML = JSON.stringify(drawingObject);

        if(isMouseDown) {
            dbIsDrawing.innerHTML = "true";
        }

       dbCustomInfo.innerHTML = drawingObject.id;
    }
}

/**
 * When the canvas is clicked
 * @param o
 */
function onMouseDownCanvas(o) {
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
}

function updateDrawingObjectOfAPeer(peerUsername, newDrawingObject) {
    if(newDrawingObject.type == "rect") {
        updateDrawingRectangleOfAPeer(peerUsername, newDrawingObject);
    }
}

function updateDrawingRectangleOfAPeer(peerUsername, newRectangleObject) {
    var targetDrawingObj = arrDrawingObject[peerUsername];

    targetDrawingObj.set({
        left: newRectangleObject.left,
        top: newRectangleObject.top,
        width: newRectangleObject.width,
        height: newRectangleObject.height
    });

    canvas.renderAll();
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