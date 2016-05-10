/**
 * Created by lua on 15/04/2016.
 * This file is used for both board's owners and guest users. However, board's owners and guest users may have
 * different processes. These processes are implemented for board's owner and guest users
 * in drawing_guest.js and drawing_owner.js, in that order.
 */

//Debug variables
var debug = document.querySelector("#debug");
var dbSelectedTool = document.querySelector("#selectedTool");
var dbIsDrawing = document.querySelector("#isDrawing");
var dbDrawingObjInfo = document.querySelector("#drawingObjInfo");
var dbCustomInfo = document.querySelector("#customInfo");

var isDebugged = false;

//variables used for transferring data between 2 canvases

/**
 * supported tool in the application
 * @type {{NONE: string, ELLIPSE: string, RECTANGLE: string, LINE: string, TEXT: string, PENCIL: string}}
 */
var TOOL = {
    //The value should be the type in fabricjs
    NONE: "none",
    ELLIPSE: "ellipse",
    RECTANGLE: "rect",
    LINE: "line",
    TEXT: "i-text",
    PENCIL: "path"
};

var FONT_WEIGHT = {
    NORMAL: "normal",
    BOLD: "bold"
};

var FONT_STYLE = {
    ITALIC: "italic",
    NORMAL: "normal"
};

var TEXT_DECORATION = {
    UNDERLINE: "underline",
    NORMAL: "normal"
};

/**
 * The canvas
 */
var canvas;

var canvas_background_color = "#ffffff";

var canvas_initial_width = 800;
var canvas_initial_height = 400;

var canvas_width = canvas_initial_width;
var canvas_height = canvas_initial_height;

var canvas_min_width = 500;
var canvas_max_width = 1000;
var canvas_min_height = 400;
var canvas_max_height = 600;

var canvas_font_size = 20;
var canvas_font_family = 'Arial';
var canvas_font_style = "normal"; //normal or italic
var canvas_font_weight = "normal"; //normal or bold
var canvas_text_decoration = "normal"; //normal or underline

/**
 *
 * @type {string}
 */
var canvas_text_color = '#000000';

/**
 * The shape that the user is selecting in the tool bar.
 * Default is no tool selected
 */
var selectedTool = TOOL.PENCIL;

var selectedColor = "#ff0000";

var selectedStrokeWidth = 1;

//the border color of circle or rectangle
var selectedStrokeColor = "#000000";

/**
 * store the object that is being drawn
 */
var drawingObject;

/**
 * Stores the points when the selectedTool is PENCIL.
 */
var pencilDrawingPoints = [];

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
    canvas = new fabric.Canvas("canvas",{
        selection: false,
        height: canvas_initial_height,
        width: canvas_initial_width,
        backgroundColor: canvas_background_color
    });

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

    if(selectedTool == TOOL.PENCIL) {
        //console.log("mouseup " + isPencilDrawing);
        //finishPencilDrawing();
        canvas.clearContext(canvas.contextTop);
        finishPencilDrawing(pencilDrawingPoints,{strokeStyle: selectedColor, lineWidth: selectedStrokeWidth});
    }

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

        if (selectedTool == TOOL.NONE) {
            return;
        } else if(selectedTool == TOOL.RECTANGLE) {
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
        } else if (selectedTool == TOOL.TEXT) {
            return;
        } else if (selectedTool == TOOL.PENCIL) {
            canvas.clearContext(canvas.contextTop);
            capturePencilDrawingPoint(pointer.x, pointer.y);
            renderAllPencilDrawing();
            //renderPencilDrawingPoints();
            //return;
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
        drawingObject = new fabric.IText("", {
            left: mouseDownPosition.x,
            top: mouseDownPosition.y,
            fontFamily: canvas_font_family,
            fontSize: canvas_font_size,
            fill: canvas_text_color,
            fontStyle: canvas_font_style,
            textDecoration: canvas_text_decoration,
            fontWeight: canvas_font_weight
        });

        addObjectIntoCanvas(drawingObject);

        //not allowing users to edit after exiting edit mode
        drawingObject.on("editing:exited", function() {
            drawingObject.selectable = false;

            if(isBoardOwner) {
                finishDrawing_Owner();
            } else {
                finishDrawing_Guest()
            }
        });


        canvas.on("text:changed", function () {
            if(isBoardOwner) {
                sendDrawingObjectToOtherPeers(drawingObject);
            } else {
                if(drawingObject) {
                    sendDrawingObjectToServer(drawingObject);
                }
            }
        });

        //enter edit mode after IText had been created
        canvas.setActiveObject(drawingObject);
        drawingObject.enterEditing();

        selectedTool = TOOL.NONE;
        unselectDrawingTool();

        return;
    } else if (selectedTool == TOOL.PENCIL) {
        preparePencilDrawing(pointer.x, pointer.y);
        //renderPencilDrawingPoints();
        renderAllPencilDrawing();
        return;
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
        } else if (newDrawingObject.type == TOOL.TEXT) {
            updateDrawingTextOfAPeer(oldDrawingObject, newDrawingObject);
        } else if (newDrawingObject.type == TOOL.PENCIL) {
            updatePencilDrawingOfAPeer(peerUsername, newDrawingObject);
        }

        //canvas.renderAll();
        renderCanvas();
    } else {
        // if the drawing object of the sender is not added into the arrDrawingObject

        if(newDrawingObject.type != TOOL.PENCIL) {
            //add the drawing object into arrDrawingObject
            arrDrawingObject[peerUsername] = castToFabricObject(newDrawingObject);

            //add the drawing object into the canvas
            canvas.add(arrDrawingObject[peerUsername]);
        } else {
            arrDrawingObject[peerUsername] = [];
        }
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
 * This function is used to update the drawing object if the object is a i-text
 * @param oldTextObj
 * @param newTextObj
 */
function updateDrawingTextOfAPeer(oldTextObj, newTextObj) {
    console.log("update drawing text");
    oldTextObj.setText(newTextObj.text);
}

/**
 * This function is used to update the pencil drawing of peers.
 * @param peerUsername
 * @param newPencilDrawing
 */
function updatePencilDrawingOfAPeer(peerUsername, newPencilDrawing) {
    canvas.clearContext(canvas.contextTop);
    arrDrawingObject[peerUsername] = newPencilDrawing;

    //renderArrayPoint(newPencilDrawing.pointArray, newPencilDrawing.options);
    renderAllPencilDrawing();
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
        }, 30);
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

            var x2 = (obj.x1 < 0) ? obj.left + obj.width : obj.left - obj.width;
            var y2 = (obj.y1 < 0) ? obj.top + obj.height : obj.top - obj.height;

            returnObj = new fabric.Line([obj.left, obj.top,
                x2,y2], obj);
        } else if (obj.type == TOOL.TEXT) {
            returnObj = new fabric.IText("", {
                left: obj.left,
                top: obj.top,
                fontFamily: obj.fontFamily,
                fontSize: obj.fontSize,
                fill: obj.fill,
                fontStyle: obj.fontStyle,
                textDecoration: obj.textDecoration,
                fontWeight: obj.fontWeight
            });
        } else if (obj.type == TOOL.PENCIL) {

            var path = obj.path;
            var SVGString = "";
            for(var i = 0; i < path.length; i++) {
                SVGString += path[i].join(" ") + " ";
            }
            SVGString.trim();

            console.log("cast to fabric path: ", SVGString);

            returnObj = new fabric.Path(SVGString, {
                strokeWidth: obj.strokeWidth,
                stroke: obj.stroke,
                fill: null
            });
        }else {
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

    //canvas_wrapper.style.width = width;
    //canvas_wrapper.style.height = 500;

    page3_canvas_width.value = width;
    page3_canvas_height.value = height;

    //update toolbar
    toolbar.style.width = width;

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

    //For the current implementation text color has the same value with the drawing color
    canvas_text_color = newColor;
}

/**
 * rendering the current user' pencil drawing
 * @param pointsArray
 */
function renderPencilDrawingPoints() {
    var options = {
        strokeStyle: selectedColor,
        lineWidth: selectedStrokeWidth
    };

    renderArrayPoint(pencilDrawingPoints, options);
}

/**
 * render all the points in the given array on canvas.contextTop
 * @param pointsArray the array of points
 * @param options the options is an object {} may contain lineWidth, StrokeStyle (color)
 */
function renderArrayPoint(pointsArray, options) {
    //console.log("rendering pencil: ", pointsArray);
    //console.log(options);
    if(pointsArray.length < 2) {
        return;
    }
    var context = canvas.contextTop;
    context.beginPath();

    var p1 = pointsArray[0];
    var p2 = pointsArray[1];

    /**
     * if the user only clicked on the canvas, the canvas should draw a point instead of nothing
     */
    if(pointsArray.length == 2 && p1.x == p2.x && p1.y == p2.y) {
        p1.x -= 0.5;
        p2.x += 0.5;
    }

    context.moveTo(p1.x, p1.y);

    console.log("p2: " + p2);
    for(var i = 0; i < pointsArray.length; i++) {
        //context.moveTo(p1.x, p1.y);
        context.lineTo(p2.x, p2.y);
        //p1 = pointsArray[i];
        p2 = pointsArray[i+1];
    }


    context.strokeStyle = options.strokeStyle;
    context.lineWidth = options.lineWidth;
    context.stroke();
}

/**
 * @param x the first point's x
 * @param y the first point's y
 */
function preparePencilDrawing(x, y) {
    resetArray(pencilDrawingPoints);
    capturePencilDrawingPoint(x, y);
}

/**
 * This converts the pointArray into fabric.Path and adds it into the canvas.
 * @param pointArray
 * @param options contains {strokeStyle: //Line color, lineWidth: //line width}/
 */
function finishPencilDrawing(pointArray, options) {
    console.log("finish pencil drawing : ", pointArray, options);
    canvas.contextTop.closePath();
    var pathLines = convertPointArrayToPath(pointArray);
    console.log(pathLines);
    var path = new fabric.Path(pathLines, {
        stroke: options.strokeStyle,
        strokeWidth: options.lineWidth,
        fill: null,
        selectable: false
    });

    console.log(path);
    canvas.add(path);
    renderCanvas();
}

/**
 * if selectedTool = TOOL.PENCIL, the mousedownevent and mousemoveevent will capture the pointer of mouse click event
 * and add it into pencilDrawingPoints
 */
function capturePencilDrawingPoint(x, y) {
    pencilDrawingPoints.push(new fabric.Point(x, y));
}

/**
 * empty an array
 */
function resetArray(array) {
    array.length = 0;
}

/**
 * Convert an array of points into a string of SVG format
 */
function convertPointArrayToPath(pointArray) {

    if(pointArray.length == 0) {
        return "";
    }

    var path = [];

    path.push("M");
    path.push(pointArray[0].x);
    path.push(pointArray[0].y);
    for(var i = 1; i < pointArray.length; i++) {
        path.push("L", pointArray[i].x, pointArray[i].y);
    }

    return path.join(" ");
}

/**
 * This renders all drawing objects which are TOOL.PENCIL in arrDrawingObject and pencilDrawingPoints
 */
function renderAllPencilDrawing() {
    console.log("Render all pencil drawing: ");
    var sum = 0;
    for(var i in arrDrawingObject) {
        if(arrDrawingObject[i].type == TOOL.PENCIL) {
            renderArrayPoint(arrDrawingObject[i].pointArray, arrDrawingObject[i].options);
            sum++;
        }
    }
    console.log(sum);
    renderPencilDrawingPoints();

}