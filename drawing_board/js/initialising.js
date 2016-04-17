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
var connection = new WebSocket("ws://localhost:8888");

/**
 * These variables are used for the board's owner. these 2 lists are synchronized, for example, the first
 * WebRTCDataChannel in dataChannelList is created by the first WebRTCPeerConnection in peerConnectionList.
*/
var peerConnectionList = {};// stores the WebRTCPeerConnection instances between the board's owner and other guests/clients
var dataChannelList = {}; //stores the WebRTCDataChannel
var usernameList = []; // stores all the usernames of guests

//These variables are used for clients who want to join the board of another user.
var peerConnection, dataChannel;

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

//add event handler for button used to create a new board
page2_btnCreate.addEventListener("click", function() {
   createNewBoard();
});
//add event handler for button used to join an existing board
page2_btnJoin.addEventListener("click", function() {
    sendRequestToJoinABoard();
    goToPage3();
});

//testing
//var page2_test = document.querySelector("#page2_test");
//page2_test.addEventListener("click", function() {
//    dataChannel.send("abc");
//    //alert(dataChannel.readyState);
//    //alert(peerConnection.iceConnectionState);
//});

/** End page 2 **/

/** Page 3 **/
var page3 = document.querySelector("#page3");
var chat_screen = document.querySelector("#chat_screen");
var chat_input_message = document.querySelector("#chat_input_message");
var chat_send_button = document.querySelector("#chat_send_button");

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

    //setup chat box
    chat_send_button.addEventListener("click", function() {
        var msg = chat_input_message.value.trim();
        chat_input_message.value = "";// reset the input

        if(!msg) {
            return;
        }

        sendChatMessageToServer(msg);
    });
}

/** End page 3 **/

function goToPage2() {
    page1.style.display = "none";
    page2.style.display = "block";
    page3.style.display = "none";
}

function goToPage3() {
    page1.style.display = "none";
    page2.style.display = "none";
    page3.style.display = "block";

    initCanvas();
    if(isBoardOwner) {
        setupPage3ForOwner();
    } else {
        setupPage3ForGuest();
    }
}

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