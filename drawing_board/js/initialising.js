/**
 * The process to join an existing board: assume that there is a board created by an user. If another user wants to
 * connect to the board. Firstly, he/she will send a request to join a board. This step is done through a websocket
 * server and doesn't include any steps used for setting up peer connection using WebRTC. When the board's owner
 * receives the request from another user and accept it. Then the next steps are used to setup the peer connection using
 * WebRTC.
 */


/**
 * Created by lua on 4/04/2016.
 */
var connection = new WebSocket("ws://192.168.2.6:8888");//("ws://172.19.6.86:8888");

var currentUsername;// The username of the user

//The username of the board's owner. if the current user is the board owner this value of the variable will be empty
var boardOwnerUsername = "";

/**
 * Indicates if the current user is board owner or not
 * @type {boolean}
 */
var isBoardOwner = false;

/** Page 1 **/
var page1 = document.querySelector("#page1");
var page1_btnNext = document.querySelector("#page1_btnNext");
var page1_username = document.querySelector("#page1_username");
page1_btnNext.addEventListener("click", function() {
    login();
});
/** End page 1 **/

/**page 2**/
var page2 = document.querySelector("#page2");
var page2_btnCreate = document.querySelector("#page2_btnCreate");
var page2_btnJoin = document.querySelector("#page2_btnJoin");
var page2_board_id = document.querySelector("#page2_board_id");
var page2_err_msg = document.querySelector("#page2_err_msg");

//add event handler for button used to create a new board
page2_btnCreate.addEventListener("click", function() {
    if(page2_board_id.value.trim() == "") {
        return;
    }

   createNewBoard();
});
//add event handler for button used to join an existing board
page2_btnJoin.addEventListener("click", function() {
    if(page2_board_id.value.trim() == "") {
        page2_displayErrorMsg("Enter board ID");
        return;
    }

    sendRequestToJoinABoard();
});

function page2_displayErrorMsg(msg) {
    page2_err_msg.style.display = 'block';
    page2_err_msg.innerText = msg;
}

/** End page 2 **/

/** Page 3 **/
var page3 = document.querySelector("#page3");
var canvas_ele = document.querySelector("#canvas");
var canvas_wrapper = document.querySelector("#canvas_wrapper");
//Chat session
var chat_box = document.querySelector("#chat_box");
var chat_screen = document.querySelector("#chat_screen");
var chat_input_message = document.querySelector("#chat_input_message");
var chat_send_button = document.querySelector("#chat_send_button");

//drawing toolbar
var toolbar = document.querySelector("#toolbar");
var drawing_shape = document.querySelector("#drawing_shape");
var toolbar_ellipse = document.querySelector("#toolbar_ellipse");
var toolbar_rectangle = document.querySelector("#toolbar_rectangle");
var toolbar_line = document.querySelector("#toolbar_line");

////toolbar: Color picker
var color_picker = document.querySelector("#color_picker");
var color_palette = document.querySelector("#color_palette");

var page3_selected_color = document.querySelector("#page3_selected_color");

var edit_custom_colors = document.querySelector("#edit_custom_colors");
var done_custom_colors = document.querySelector("#done_custom_colors");

////toolbar: Update canvas section
var page3_btn_update_canvas_size = document.querySelector("#page3_btn_update_canvas_size");
var page3_canvas_width = document.querySelector("#page3_canvas_width");
var page3_canvas_height = document.querySelector("#page3_canvas_height");

//select color for chat msg
var text_color_picker = document.querySelector("#text_color_picker");

var page3_user_list = document.querySelector("#page3_userList");

function addMessageToChatScreen(msg) {
    //chat_screen.value += msg + "\n";
    chat_screen.innerHTML += msg + "<br>";
}

/**
 * since the board's owner and the guests User interface are on the same page index.html.
 * Therefore, it is necessary to separate the setting of these 2 UIs based on the role of the user
 */

/**
 * Setup page 3 for the board's owner
 */
function setupPage3ForOwner() {
    createDrawingToolbar();

    //setup chat box
    chat_send_button.addEventListener("click", function() {
        var msg = chat_input_message.value.trim();
        chat_input_message.value = "";// reset the input
        if(!msg) {
            return;
        }

        /**
         * Sends the chat message to all users using the board.
         */
        sendChatMessageToClients(msg);
    });
}

/**
 * Setup page 3 for the guest
 */
function setupPage3ForGuest() {
    createDrawingToolbar();
    //setup chat box
    chat_send_button.addEventListener("click", function() {
        var msg = chat_input_message.value.trim();
        chat_input_message.value = "";// reset the input

        if(!msg) {
            return;
        }

        sendChatMessageToServer(msg, true);
    });
}

/**
 * setup drawing tool
 */
function createDrawingToolbar() {
    createColorPicker();

    toolbar_ellipse.addEventListener("click", function() {
        unselectDrawingTool();
        $(this).addClass("clicked");

        selectedTool = TOOL.ELLIPSE;
    });

    toolbar_rectangle.addEventListener("click", function() {
        unselectDrawingTool();
        $(this).addClass("clicked");

        selectedTool = TOOL.RECTANGLE;
    });

    toolbar_line.addEventListener("click", function(){
        unselectDrawingTool();
        $(this).addClass("clicked");

        selectedTool = TOOL.LINE;
    });
}

/**
 * creates color picker
 */
function createColorPicker() {
    updateSelectedColor(selectedColor);

    var colors = ['#000000','#0433ff','#aa7942','#00FDFF','#00f900','#ff40ff','#ff9300','#942192','#ff2600','#fffb00','#CCCCCC','#ffffff'];

    //the elements of custom_color_divs are the wrappers of the elements in custom_color_buttons
    var custom_color_divs = color_palette.querySelectorAll(".column");
    for(var i = 0; i < custom_color_divs.length; i++) {
        custom_color_divs[i].style.backgroundColor = colors[i];

        custom_color_divs[i].addEventListener("click", function() {
            updateSelectedColor(this.style.backgroundColor);
        });
    }

    var custom_color_buttons = color_picker.querySelectorAll(".custom_color_btn");
    for(i = 0; i < custom_color_buttons.length; i++) {
        custom_color_buttons[i].addEventListener("click", function(event) {
            event.stopPropagation();
        });
        custom_color_buttons[i].addEventListener("change", function () {
            this.parentElement.style.backgroundColor = this.value.toString();
        });
    }

    edit_custom_colors.addEventListener("click", function () {
        done_custom_colors.style.display = "block";
        edit_custom_colors.style.display = "none";

        var custom_color_buttons = color_picker.querySelectorAll(".custom_color_btn");
        for(i = 0; i < custom_color_buttons.length; i++) {
            custom_color_buttons[i].style.display = "block";
        }
    });

    done_custom_colors.addEventListener("click", function() {
        edit_custom_colors.style.display = "block";
        done_custom_colors.style.display = "none";

        var custom_color_buttons = color_picker.querySelectorAll(".custom_color_btn");
        for(i = 0; i < custom_color_buttons.length; i++) {
            custom_color_buttons[i].style.display = "none";
        }
    });
}

/**
 * unselect the current drawing tool. This affects user interface only
 */
function unselectDrawingTool() {
    var buttons = drawing_shape.querySelectorAll(".drawing_tool_btn");
    for (var i = 0; i < buttons.length; i++) {
        $(buttons[i]).removeClass("clicked");
    }
}
/** End page 3 **/

/**
 * this is invoked when the user successfully login with an unique id/username.
 */
function goToPage2() {
    page1.style.display = "none";
    page2.style.display = "block";
    page3.style.display = "none";
}

/**
 * Users go to this page after creating a new board or joint an existing board.
 */
function goToPage3() {
    page1.style.display = "none";
    page2.style.display = "none";
    page3.style.display = "block";

    initCanvas();

    //setup color picker for chat text
    text_color_picker.addEventListener("change", function () {
        selectedTextColor = this.value.toString();
        chat_input_message.style.color = this.value.toString();
    });

    page3_canvas_width.value = canvas_initial_width;
    page3_canvas_height.value = canvas_initial_height;
    page3_btn_update_canvas_size.addEventListener("click", function() {
        var new_width = page3_canvas_width.value;
        var new_height = page3_canvas_height.value;

        var str = "";
        if(new_width > canvas_max_width || new_width < canvas_min_width) {
            str += "The canvas width should be in range of " + canvas_min_height + " to " + canvas_max_height + "\n";
        }

        if(new_height > canvas_max_height || new_height < canvas_min_height) {
            str += "The canvas width should be in range of " + canvas_min_height + " to " + canvas_max_height;
        }

        if(str != "") {
            alert(str);
            return;
        }

        updateCanvasSize(new_width, new_height);
    });

    if(isBoardOwner) {
        setupPage3ForOwner();
    } else {
        setupPage3ForGuest();
    }
}

/**
 * assigned to body onresize event
 */
//function resize() {
//    console.log("abc");
//    updateCanvasSize();
//}
//
//function updateCanvasSize() {
//    var chatbox_rect = chat_box.getBoundingClientRect();
//    var canvas_rect = canvas_ele.getBoundingClientRect();
//
//    var canvas_width = chatbox_rect.left - canvas_rect.left - 20;
//    canvas.setWidth(canvas_width);
//}

/**
 * @deprecated
 * Receives the response of the board's owner to whom you want to connect
 * @param data
 * if data.success == true. It means the board's owner accepted the request, vice versa
 */
//function onReceiveAnswer(data) {
//    var boardOwner = data.board_owner;
//    if(!data.success) {
//        //if the owner denied the request
//        alert(boardOwner + " doesn't accept your request");
//        console.log("request to join the board denied");
//        return;
//    }
//
//    //if the owner accepted the request
//    console.log("request to join the board accepted");
//    //boardOwnerUsername = boardOwner;
//}