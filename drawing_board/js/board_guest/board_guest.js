/**
 * Created by lua on 16/04/2016.
 */

//These variables are used for clients who want to join the board of another user.
var peerConnection, dataChannel;

/**
 * Sends the request to join a created board
 */
function sendRequestToJoinABoard() {
    if(page2_board_id.value.length == 0) {
        return;
    }

    //Setup the dataChannel object for the invitee
    //setupDataChannelForInvitee();

    sendToWebSocketServer({
        type: "requestToJoinABoard",
        board_id: page2_board_id.value
    });

}

/**
 * handles the response from the server to check if the request to join a board is successful or not
 * @param data
 */
function onRequestToJoinABoard(data) {
    if(data.success) {
        //request is successfully sent to the board's owner
        alert("Please wait for the owner's response");
    } else {
        //failed to sendToWebSocketServer the request
        alert(data.message);
    }
}

/**
 * The client's browser receives WebRTC offer from the owner
 */
function onOfferReceived(data) {
    console.log("Receive WebRTC offer from the board owner: " + data.board_owner);

    boardOwnerUsername = data.board_owner;

    preparePeerConnection();
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    //addJoiner(data.sender); //add the username of the sender

    //creates answer and reply to the board's owner
    peerConnection.createAnswer(function (answer) {
        console.log("WebRTC Answer the offer of the board's owner " + data.board_owner);
        peerConnection.setLocalDescription(answer);
        sendToWebSocketServer({
            type: "webRTCAnswer",
            //success: true,
            answer: answer,
            board_owner: data.board_owner
        });
    }, function (error) {
        console.log("error in reply to the sender who sent the request to join the board");
    });
}

/**
 * When a user successfully creates a new board, the user needs to be ready for peer connection.
 * This function makes the peer connection ready, so that another user can connect to it.
 */
function preparePeerConnection() {

    if (hasRTCPeerConnection()) {
        console.log("Setting up peer connection");
        var configuration = {
            "iceServers": [{ "url": WebRTCIceUrl }]
        };
        peerConnection = new RTCPeerConnection(WebRTCPeerConfiguration, WebRTCPeerConnectionOptions);

        // Setup ice handling
        peerConnection.onicecandidate = function (event) {
            console.log("trading candidate");
            if (event.candidate) {
                sendToWebSocketServer({
                    type: "candidate",
                    candidate: event.candidate,
                    connected_user: boardOwnerUsername
                });
            }
        };

        console.log("Setup data channel");
        peerConnection.ondatachannel = function (event) {
            dataChannel = event.channel;
            dataChannel.onopen = onDataChannelWithBoardOwnerOpenedCallBack;

            dataChannel.onclose = onDataChannelWithBoardOwnerClosedCallBack;

            dataChannel.onerror = function() {
                console.log("Data Channel error");
            };
            dataChannel.onmessage = onMessageReceivedFromBoardOwnerCallBack;
        };

    } else {
        alert("Sorry, your browser does not support WebRTC.");
    }

}

function onDataChannelWithBoardOwnerOpenedCallBack() {
    console.log("Data channel opened");
    sendChatMessageToServer("Hi, I'm " + currentUsername, false);
}

/**
 * callback method triggered when receives message from server
 * @param event
 */
function onMessageReceivedFromBoardOwnerCallBack(event) {
    console.log("data channel message from board's owner: ", event.data);

    var data = JSON.parse(event.data);
    if (data.type == DataTransferType.CHAT_MESSAGE) {
        //if the data is a chat message
        addMessageToChatScreen(data.content);//add the msg into the chat screen
    } else if (data.type == DataTransferType.CANVAS_DATA) {
        var canvasData = data.content;
        if (canvasData.command == DrawingCommands.DRAWING) {
            //if the command is drawing
            var canvasObj = canvasData.canvasData;

            console.log("", canvasObj);

            if(arrDrawingObject[data.sender]) {
                //if the drawing object of the sender has been added into arrDrawingObject
                updateDrawingObjectOfAPeer(data.sender, canvasObj);
            } else {
                // if the drawing object of the sender is not added into the arrDrawingObject
                //add the drawing object into arrDrawingObject
                arrDrawingObject[data.sender] = new fabric.Rect(canvasObj);

                //add the drawing object into the canvas
                canvas.add(arrDrawingObject[data.sender]);
            }
            //console.log("drawing object from a guest: ", canvasObj);
        } else if (canvasData.command == DrawingCommands.FINISH_DRAWING) {
            //console.log("Finish drawing : " , data.sender);
            delete arrDrawingObject[data.sender];
        }
    }
}

function onDataChannelWithBoardOwnerClosedCallBack() {
    console.log("Data channel closed");
}

/**
 * The message sent to server will be broadcast to all users in the same board by the board's owner
 * @param message a string
 * @param addToScreenChat a boolean indicating if the message should be added into the screen chat. Default value is
 * true which means the message will be added into the chat screen.
 */
function sendChatMessageToServer(message, addToScreenChat) {
    addToScreenChat = (typeof addToScreenChat !== 'undefined') ? addToScreenChat : true;


    console.log("send chat message to server: ", message);
    message = formatChatMessage(currentUsername, message);

    if(addToScreenChat) {
        addMessageToChatScreen(message);//add the msg into the current chat screen of the current user
    }

    sendDataToAPeer(dataChannel, wrapData(message, DataTransferType.CHAT_MESSAGE));
}

