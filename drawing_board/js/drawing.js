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
    ELLIPSE: "ellipse",
    RECTANGLE: "rect",
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
var selectedTool = TOOL.ELLIPSE;

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
    canvas = new fabric.Canvas("canvas",{selection: false, height: 500, width: 500});

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
        onMouseUpExtraEventForOwner();
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

    if (isMouseDown) {
        var pointer = canvas.getPointer(o.e);

        if(selectedTool == TOOL.RECTANGLE) {
            if (mouseDownPosition.x > pointer.x) {
                drawingObject.set({left: pointer.x});
            }
            if (mouseDownPosition.y > pointer.y) {
                drawingObject.set({top: pointer.y});
            }

            drawingObject.set({
                width: Math.abs(mouseDownPosition.x - pointer.x),
                height: Math.abs(mouseDownPosition.y - pointer.y)
            });
        } else if (selectedTool == TOOL.ELLIPSE) {
            if (mouseDownPosition.x > pointer.x) {
                drawingObject.set({left: pointer.x});
            }
            if (mouseDownPosition.y > pointer.y) {
                drawingObject.set({top: pointer.y});
            }

            drawingObject.set({
                rx: Math.abs(mouseDownPosition.x - pointer.x)/2,
                ry: Math.abs(mouseDownPosition.y - pointer.y)/2
            });
        }

        if(isBoardOwner) {
            onMouseMoveExtraEventForOwner();
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
    } else if (selectedTool == TOOL.RECTANGLE) {
        drawingObject = new fabric.Rect({
            originX: "left",
            originY: "top",
            left: mouseDownPosition.x,
            top: mouseDownPosition.y,
            fill: selectedColor,
            width: 0,
            height: 0
        });
    } else if (selectedTool == TOOL.ELLIPSE) {
        console.log("drawing circle");
        drawingObject = new fabric.Ellipse({
            fill: selectedColor,
            originX: "left",
            originY: "top",
            left: mouseDownPosition.x,
            top: mouseDownPosition.y,
            rx: 0,
            ry: 0
        });
    }

    addObjectIntoCanvas(drawingObject);

    if (debug) {
        dbSelectedTool.innerHTML = selectedTool + "";
    }
}

/**
 * Update the object which is being drawn by another peer
 * @param peerUsername the username of the peer who is drawing the object
 * @param newDrawingObject the data of the drawing object
 */
function updateDrawingObjectOfAPeer(peerUsername, newDrawingObject) {
    if(arrDrawingObject[peerUsername]) {
        //if the drawing object of the sender has been added into arrDrawingObject

        //Get the drawing object of a guest user using his/her username which is peerUsername
        var oldDrawingObject = arrDrawingObject[peerUsername];

        if(newDrawingObject.type == TOOL.RECTANGLE) {
            updateDrawingRectangleOfAPeer(oldDrawingObject, newDrawingObject);
        } else if (newDrawingObject.type == TOOL.ELLIPSE) {
            updateDrawingEllipseOfAPeer(oldDrawingObject, newDrawingObject);
        }
    } else {
        // if the drawing object of the sender is not added into the arrDrawingObject
        //add the drawing object into arrDrawingObject
        if(newDrawingObject.type == TOOL.RECTANGLE) {
            arrDrawingObject[peerUsername] = new fabric.Rect(newDrawingObject);
        } else if (newDrawingObject.type == TOOL.ELLIPSE) {
            arrDrawingObject[peerUsername] = new fabric.Ellipse(newDrawingObject);
        }

        //add the drawing object into the canvas
        canvas.add(arrDrawingObject[peerUsername]);
    }


}

/**
 * This function is used to update the drawing object if the object is a rectangle
 * @param peerUsername
 * @param newRectangleObject
 */
function updateDrawingRectangleOfAPeer(oldRectangleObject, newRectangleObject) {

    oldRectangleObject.set({
        left: newRectangleObject.left,
        top: newRectangleObject.top,
        width: newRectangleObject.width,
        height: newRectangleObject.height
    });

    canvas.renderAll();
}

/**
 * This function is used to update the drawing object if the object is a ellipse
 * @param oldEllipseObj
 * @param newEllipseObj
 */
function updateDrawingEllipseOfAPeer(oldEllipseObj, newEllipseObj) {
    oldEllipseObj.set({
        left: newEllipseObj.left,
        top: newEllipseObj.top,
        rx: newEllipseObj.rx,
        ry: newEllipseObj.ry
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