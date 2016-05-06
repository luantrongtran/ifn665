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
    LINE: "line",
    TEXT: "text"
};

/**
 * The canvas
 */
var canvas;

var canvas_initial_width = 800;
var canvas_initial_height = 400;

var canvas_width = canvas_initial_width;
var canvas_height = canvas_initial_height;

var canvas_min_width = 500;
var canvas_max_width = 1000;
var canvas_min_height = 400;
var canvas_max_height = 600;

/**
 * The shape that the user is selecting in the tool bar.
 * Default is no tool selected
 */
var selectedTool = TOOL.LINE;

var selectedColor = "#ff0000";

var selectedStrokeWidth = 1;

//the border color of circle or rectangle
var selectedStrokeColor = "#000000";

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
    canvas = new fabric.Canvas("canvas",{selection: false, height: canvas_initial_height, width: canvas_initial_width,
        backgroundColor: "#ffffff"});

    //canvas.isDrawingMode = true;

    canvas.on("mouse:down", onMouseDownCanvas);

    canvas.on("mouse:up", onMouseUpCanvas);

    canvas.on("mouse:move", onMouseMoveCanvas);

    updateCanvasSize(canvas_initial_width, canvas_initial_height);
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

    if(isDebugged) {
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
        } else if (selectedTool == TOOL.LINE) {
            drawingObject.set({
                x2: pointer.x,
                y2: pointer.y
            });
        }

        if(isBoardOwner) {
            onMouseMoveExtraEventForOwner();
        } else {
            onMouseMoveExtraEventForGuest();
        }
    }

    canvas.renderAll();


    if(isDebugged == true) {
        dbDrawingObjInfo.innerHTML = JSON.stringify(drawingObject);

        if(isMouseDown) {
            dbIsDrawing.innerHTML = "true";
        }
       dbCustomInfo.innerHTML = drawingObject.x1 + ", " + drawingObject.y1 + ", " + drawingObject.x2 + ", " + drawingObject.y2;
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
            height: 0,
            strokeWidth: selectedStrokeWidth,
            stroke: selectedStrokeColor
        });
    } else if (selectedTool == TOOL.ELLIPSE) {
        drawingObject = new fabric.Ellipse({
            fill: selectedColor,
            originX: "left",
            originY: "top",
            left: mouseDownPosition.x,
            top: mouseDownPosition.y,
            rx: 0,
            ry: 0,
            strokeWidth: selectedStrokeWidth,
            stroke: selectedStrokeColor
        });
    } else if (selectedTool == TOOL.LINE) {
        drawingObject = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            originX: "left",
            originY: "top",
            stroke: selectedColor,
            strokeWidth: selectedStrokeWidth
        });
    } else if (selectedTool == TOOL.TEXT) {

    }

    addObjectIntoCanvas(drawingObject);

    if (isDebugged) {
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
        } else if (newDrawingObject.type == TOOL.LINE) {
            updateDrawingLineOfAPeer(oldDrawingObject, newDrawingObject);
        }

        //canvas.renderAll();
        renderCanvas();
    } else {
        // if the drawing object of the sender is not added into the arrDrawingObject

        //add the drawing object into arrDrawingObject
        arrDrawingObject[peerUsername] = castToFabricObject(newDrawingObject);

        //add the drawing object into the canvas
        canvas.add(arrDrawingObject[peerUsername]);
    }
}

/**
 * This function is used to update the drawing object if the object is a rectangle
 * @param oldRectangleObject the old object need updating
 * @param newRectangleObject the new object contain new information
 */
function updateDrawingRectangleOfAPeer(oldRectangleObject, newRectangleObject) {
    oldRectangleObject.set({
        left: newRectangleObject.left,
        top: newRectangleObject.top,
        width: newRectangleObject.width,
        height: newRectangleObject.height
    });
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
}

/**
 * This function is used to update the drawing object if the object is a line
 * @param oldLineObj
 * @param newLineObj
 */
function updateDrawingLineOfAPeer(oldLineObj, newLineObj) {
    console.log("update drawing line");
    oldLineObj.set({
        x2: (newLineObj.x1 < 0) ? newLineObj.left + newLineObj.width : newLineObj.left ,
        y2: (newLineObj.y1 < 0) ? newLineObj.top + newLineObj.height : newLineObj.top
    });
}

/**
 * This variable is used to avoid calling the canvas.renderAll() continuously
 * @type {boolean}
 */
var isRenderReady = false;
/**
 * This functions is used to avoid calling render immediately after a drawing command which may make the canvas
 * cannot render 2 objects which are being drawn at the same time by 2 users.
 */
function renderCanvas() {
    if(isRenderReady == false) {
        isRenderReady = true;

        setTimeout(function(){
            isRenderReady = false;

            canvas.renderAll();
        }, 10);
    }
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

/**
 * Convert an object into Fabricjs object
 */
function castToFabricObject(obj) {
    if(obj) {
        var returnObj;
        if(obj.type == TOOL.RECTANGLE) {
            returnObj = new fabric.Rect(obj);
        } else if (obj.type == TOOL.ELLIPSE) {
            returnObj = new fabric.Ellipse(obj);
        } else if (obj.type == TOOL.LINE) {
            returnObj = new fabric.Line([obj.left, obj.top,
                obj.left + obj.width, obj.top + obj.height], obj);
        } else {
            return null;
        }

        /**
         * After casting, the attribute "selectable" of the new fabricjs is set to true by default.
         * Therefore, its 'selectable' attribute has to be set based on the canvas.selection
         */
        returnObj.selectable = canvas.selection;

        return returnObj;
    } else {
        return null;
    }
}

/**
 * Update the size of the canvas
 * @param width number
 * @param height number
 */
function updateCanvasSize(width, height) {
    canvas_width = width;
    canvas_height = height;

    canvas.setWidth(canvas_width);
    canvas.setHeight(canvas_height);

    canvas_wrapper.style.width = width;
    //
    //var canvas_wrapper_rect = canvas_wrapper.getBoundingClientRect();
    //if(canvas_wrapper.style.height < canvas_max_height) {
    //    canvas_wrapper.style.height = width + 10;
    //}

    page3_canvas_width.value = width;
    page3_canvas_height.value = height;

    if (isBoardOwner) {
        //if the board's owner resizes the board, then notify other users to update their board size
        sendSyncDataToAllUsers(false, false, true);
    }
}

/**
 * Update the selected color including displaying the selected color on UI
 * @param newColor
 */
function updateSelectedColor(newColor) {
    selectedColor = newColor;
    page3_selected_color.style.backgroundColor = selectedColor;
}