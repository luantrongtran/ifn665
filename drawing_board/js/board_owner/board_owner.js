/**
 * Created by lua on 16/04/2016.
 */
/**
 * These variables are used for the board's owner. these 2 lists are synchronized, for example, the first
 * WebRTCDataChannel in dataChannelList is created by the first WebRTCPeerConnection in peerConnectionList.
 */
var peerConnectionList = {};// stores the WebRTCPeerConnection instances between the board's owner and other guests/clients
var dataChannelList = {}; //stores the WebRTCDataChannel
var usernameList = []; // stores all the usernames of guests

/**
 * Sends request to create a new board
 */
function createNewBoard() {
    if(page2_board_id.value.length == 0) {
        return;
    }

    var data = {
        type: "createNewBoard",
        username: page1_username.value, // the username of the guest user
        board_id: page2_board_id.value //board id to which the guest user wants to connect
    };

    console.log("Create new board: ", data);

    //Send the request to the server.
    sendToWebSocketServer(data);
}

/**
 * Receives the result of creating new board from server.
 * @param data data.success is true if the board is successfully created, otherwise, data.success is false
 */
function onNewBoardCreated (data) {
    console.log("received data for creating board: ", data);
    if (data.success) {
        //board created successfully
        isBoardOwner = true; //isBoardOwner is declared in initialising.js
        goToPage3();
    } else {
        page2_displayErrorMsg("Failed to create new board! Please choose a different id.");
    }
}

/**
 * When the board's owner receives a request to join the board from another one.
 * @param data
 */
function onReceiveRequestToJoinTheBoard(data) {
    var result = confirm(data.client_username + " wants to join the board");

    if (result) {
        //accept the request to join the board
        //Creates peer2peer connection offer and sends to the board's owner
        addNewUser(data.client_username);
    } else {
        //deny the request
        console.log("deny request to join the board from ", data.client_username);
        var repliedData = {
            type: "denyRequest",
            client_username: data.client_username,
            sender: currentUsername
        };
        sendToWebSocketServer(repliedData);
    }
}

/**
 * Receives WebRTC answer from the client
 */
function onWebRTCAnswer(data) {
    console.log("Receives WebRTC Answer from the client: ", data);

    var targetPeerCon = peerConnectionList[data.clientUsername];
    targetPeerCon.setRemoteDescription(new RTCSessionDescription(data.answer));
}

/**
 * Accept a new user to join the board after he/she had requested to join
 * @param clientUsername the username of the new client
 */
function addNewUser(clientUsername) {
    var newPeerConnection = preparePeerConnectionForANewClient(clientUsername);
    if (newPeerConnection) {
        //if new peer connection is created successfully
        usernameList.push(clientUsername);
        newPeerConnection.createOffer(function (offer) {
            console.log("Owner creates webRTC offer and send to the client " + clientUsername);
            newPeerConnection.setLocalDescription(offer);
            var data_ = {
                type: "offer",
                //board_id: page2_board_id.value,
                offer: offer,
                client_username: clientUsername
            };
            sendToWebSocketServer(data_);
        }, function (error) {
            console.log("Failed to create offer", error);
        });
    }
}

/**
 * setup a new peer connection for a new user who wants to join the board
 * @param clientUsername the username of the new client
 * @return returns the a WebRTCPeerConnection object created for the new client
 */
function preparePeerConnectionForANewClient(clientUsername) {
    var newPeerConnection;

    if (hasRTCPeerConnection()) {
        console.log("Setting up a new peer connection for " + clientUsername);
        newPeerConnection = new RTCPeerConnection(WebRTCPeerConfiguration, WebRTCPeerConnectionOptions);

        // Setup ice handling
        newPeerConnection.onicecandidate = function (event) {
            if (event.candidate) {
                sendToWebSocketServer({
                    type: "candidate",
                    candidate: event.candidate,
                    connected_user: clientUsername
                });
            }
        };

        peerConnectionList[clientUsername] = newPeerConnection;

        //create a new data channel for the new user
        var newDataChannel = newPeerConnection.createDataChannel("data_channel_" + clientUsername, WebRTCDataChannelConfiguration);
        newDataChannel.name = clientUsername;

        newDataChannel.onopen = function () {
            console.log("Data channel opened with " + clientUsername);
            sendChatMessageToAClient(clientUsername, "Welcome on board, " + clientUsername, false);
        };

        newDataChannel.onclose = function () {
            console.log("Data channel closed");
        };
        newDataChannel.onerror = function() {
            console.log("Data Channel error");
        };
        newDataChannel.onmessage = onMessageReceivedFromAClientCallback;

        dataChannelList[clientUsername] = newDataChannel;

    } else {
        alert("Sorry, your browser does not support WebRTC.");
    }

    return newPeerConnection;
}

/**
 * When receives a message through peer-to-peer data channel.
 * @param event
 */
function onMessageReceivedFromAClientCallback(event) {
    console.log("data channel receives msg: ", event.data);
    var data = JSON.parse(event.data);
    console.log("Data channel receives message from: ", data.sender);

    if (data.type == DataTransferType.CHAT_MESSAGE) {
        //if the data is a chat message

        //add the msg into the chat screen
        addMessageToChatScreen(data.content);

        //broadcast the chat message to other users
        broadcastChatMessage(data.content, data.sender);
    } else if (data.type == DataTransferType.CANVAS_DATA) {
        var canvasData = data.content;
        if (canvasData.command == DrawingCommands.DRAWING) {
            //if the command is drawing
            var canvasObj = canvasData.canvasData;

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
            console.log("Finish drawing : " , data.sender);
            delete arrDrawingObject[data.sender];
        }

        forwardCanvasData(canvasData, data.sender);
    }
}

/**
 * broadcast a chat message to all users in the board.
 * @param message a string
 * @param exceptionUsername the username of the user that won't receive the message
 */
function broadcastChatMessage(message, exceptionUsername) {
    var broadcastList = "";//use for console.log
    for (var i = 0; i < usernameList.length; i++) {
        if (usernameList[i] == exceptionUsername) {
            continue;
        }
        forwardChatMessageToACLient(usernameList[i], message);

        broadcastList += usernameList[i] + "    ";
    }

    console.log("Broadcast chat message to all users: " + broadcastList);
}

/**
 * Sends a simple text to the receivers. The difference with the forwardChatMessageToAClient is that this method
 * send the chat message to all users. The chat message includes the name of the board's owner
 * @param clientUsername
 * @param message a string
 * @param addToScreenChat a boolean indicating if the message should be added into the screen chat. Default value is
 * true which means the message will be added into the chat screen.
 */
function sendChatMessageToClients(message, addToScreenChat) {

    addToScreenChat = (typeof addToScreenChat !== 'undefined') ? addToScreenChat : true;

    console.log("Sends text msg to other peers");
    message = formatChatMessage(currentUsername, message);

    if (addToScreenChat) {
        addMessageToChatScreen(message);//adds the chat message into the current screen chat of the owner
    }

    broadcastChatMessage(message); //Sends the message to all other peers.
}

/**
 * Sends a text message to another user
 * @param clientUsername the username of the user to who the message will be delivered
 * @param message
 * @param addToScreenChat
 */
function sendChatMessageToAClient(clientUsername, message, addToScreenChat) {
    addToScreenChat = (typeof addToScreenChat !== 'undefined') ? addToScreenChat : true;
    console.log("Sends text msg to " + clientUsername);

    message = formatChatMessage(currentUsername, message);

    if(addToScreenChat) {
        addMessageToChatScreen(message);//adds the chat message into the current screen chat of the owner
    }

    sendDataToAClient(clientUsername, wrapData(message, DataTransferType.CHAT_MESSAGE));
}

/**
 * Forwards the text message from a user to another peer
 */
function forwardChatMessageToACLient(clientUsername, message) {
    console.log("Forwards chat msg to ", clientUsername);
    sendDataToAClient(clientUsername, wrapData(message, DataTransferType.CHAT_MESSAGE));
}

/**
 * Sends data to a specific user
 * @param clientUsername
 * @param data
 */
function sendDataToAClient(clientUsername, data) {
    var targetDataChannel = dataChannelList[clientUsername];
    if (targetDataChannel) {
        sendDataToAPeer(targetDataChannel, data);
    } else {
        console.log("Cannot find data channel for username: " + clientUsername);
    }
}