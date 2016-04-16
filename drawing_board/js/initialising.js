/**
 * Created by lua on 4/04/2016.
 */
var connection = new WebSocket("ws://localhost:8888");
var peerConnection, dataChannel;

var currentUsername;// The username of the user
var connectedUser; //The username of the partner
/*
This variable contains all the usernames of people who joined the board. This variable contains nothing if
the user is not the board's owner
 */
//var joiners = [];
/*
 if the user connect to a board created by another one. This variable store the username of the board's owner
 */
//var boardOwnerUsername;

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
    joinABoard();
    goToPage3();
});

//testing
var page2_test = document.querySelector("#page2_test");
page2_test.addEventListener("click", function() {
    dataChannel.send("abc");
    //alert(dataChannel.readyState);
    //alert(peerConnection.iceConnectionState);
});

/** End page 2 **/

/** Page 3 **/
var page3 = document.querySelector("#page3");
/** End page 3 **/

/**
 * sends log in request to server
 */
function login() {
    if(page1_username.value.length == 0) {
        return;
    }
    var data = {
        type: "login",
        username: page1_username.value
    };
    console.log("sending login request", data);
    sendToWebSocketServer(data);
}

/**
 * receive login response
 * @param data
 */
function onLogin(data) {
    if(data.success) {
        console.log("logged successfully");
        preparePeerConnection();

        currentUsername = page1_username.value;
        goToPage2();
    } else {
        alert("the username is already being used");
    }
}

/**
 * Sends request to create a new board
 */
function createNewBoard() {
    if(page2_board_id.value.length == 0) {
        return;
    }

    var data = {
        type: "createNewBoard",
        username: page1_username.value,
        board_id: page2_board_id.value
    };

    console.log("Create new board: ", data);

    sendToWebSocketServer(data);
}

/**
 * Receives the result of creating new board from server.
 * @param data
 */
function onNewBoardCreated (data) {
    console.log("received data for creating board: ", data);
    if (data.success) {
        //board created successfully
        //preparePeerConnection();
        //Setup data channel so that it is ready to be connected by another user

        setupDataChannelForTheOwner();
        goToPage3();
    } else {
        alert("Failed to create new board! Please choose another id.");
    }
}

/**
 * Sends the request to join a created board
 */
function joinABoard() {
    if(page2_board_id.value.length == 0) {
        return;
    }

    //Setup the dataChannel object for the invitee
    setupDataChannelForInvitee();

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
 * When a user successfully creates a new board, the user needs to be ready for peer connection.
 * This function makes the peer connection ready, so that another user can connect to it.
 */
function preparePeerConnection() {

    if (hasRTCPeerConnection()) {
        console.log("Setting up peer connection");
        var configuration = {
            "iceServers": [{ "url": "stun:stun.1.google.com:19302" }]
        };
        peerConnection = new RTCPeerConnection(configuration, {optional: [{RtpDataChannels: false}]});

        // Setup ice handling
        peerConnection.onicecandidate = function (event) {
            console.log("trading candidate");
            if (event.candidate) {
                sendToWebSocketServer({
                    type: "candidate",
                    candidate: event.candidate,
                    connected_user: connectedUser
                });
            } };

    } else {
        alert("Sorry, your browser does not support WebRTC.");
    }

}

/**
 * When the board's owner receives a request to join the board from another one.
 * @param data
 */
function onReceiveRequestToJoinTheBoard(data) {
    var result = confirm(data.sender + " wants to join the board");

    //sendToWebSocketServer back the reply to the requester
    //sendToWebSocketServer({
    //    type: "answer",
    //    success: result,
    //    sender: data.sender // the username of the person sending the request to join the board
    //});

    if (result) {
        //if accept the request, set the connectedUser to the username of the sender
        connectedUser = data.sender;

        //Creates peer2peer connection offer and sends to the board's owner
        peerConnection.createOffer(function (offer) {
            console.log("Owner creates webRTC offer and send to the client " + connectedUser);
            peerConnection.setLocalDescription(offer);
            var data_ = {
                type: "offer",
                //board_id: page2_board_id.value,
                offer: offer,
                client_username: connectedUser
            };
            sendToWebSocketServer(data_);
        }, function (error) {
            console.log("Failed to create offer", error);
        });
    }
}

/**
 * Receives the response of the board's owner to whom you want to connect
 * @param data
 * if data.success == true. It means the board's owner accepted the request, vice versa
 */
function onReceiveAnswer(data) {
    var boardOwner = data.board_owner;
    if(!data.success) {
        //if the owner denied the request
        alert(boardOwner + " doesn't accept your request");
        console.log("request to join the board denied");
        return;
    }



    //if the owner accepted the request
    console.log("request to join the board accepted");
    connectedUser = boardOwner;
}

/**
 *
 * The dataChannel object can be setup differently. It depends on the user if he/she is the board's owner or an invitee
 * This function is for setting up the dataChannel object for the board's owner
 */
function setupDataChannelForTheOwner() {
    console.log("Setup data channel for the owner");
    //Initialize the dataChannel for the board's owner.
    var dataChannelOptions = {
        reliable: false
    };
    dataChannel = peerConnection.createDataChannel("data_channel", dataChannelOptions);

    //Setup data channel so that it is ready to be connected by another user
    setupDataChannel();
}

/**
 *
 * The dataChannel object can be setup differently. It depends on the user if he/she is the board's owner or an invitee
 * This function is for setting up the dataChannel object for invitees
 * @param targetDataChannel Since an invitee will use an data channel created by the board's owner. It is necessary
 * to pass an targetDataChannel which is created by the board's owner.
 */
function setupDataChannelForInvitee() {
    console.log("Setup data channel for the invitee");
    peerConnection.ondatachannel = function (event) {
        dataChannel = event.channel;
        setupDataChannel();
    };

}

/**
 * prepare data channel
 */
function setupDataChannel() {
    dataChannel.onopen = function () {
        console.log("Data channel opened");
        dataChannel.send("Hello world");
    };
    dataChannel.onclose = function () {
        console.log("Data channel closed");
    };
    dataChannel.onerror = function() {
        console.log("Data Channel error");
    };
    dataChannel.onmessage = function(event) {
        alert("message received");
        console.log("data channel message: ", event.data);
    };
}

/**
 * Receives WebRTC answer from the client
 */
function onWebRTCAnswer(data) {
    console.log("Receives WebRTC Answer from the client: ", data);
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
}

/**
 * The client's browser receives WebRTC offer from the owner
 */
function onOfferReceived(data) {
    console.log("Receive WebRTC offer from the board owner: " + data.board_owner);

    connectedUser = data.board_owner;

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

function onCandidate(data) {
    console.log("adding candidate", data.candidate);
    peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
}

/**
 * Send data to websocket server for setting up the peer connection
 * @param message
 */
function sendToWebSocketServer(message){
    connection.send(JSON.stringify(message));
}

function goToPage2() {
    page1.style.display = "none";
    page2.style.display = "block";
    page3.style.display = "none";
}

function goToPage3() {
    page1.style.display = "none";
    page2.style.display = "none";
    page3.style.display = "block";
}

/**
 * Adds a new username into the variable joiners which is an array managing username of joiners.
 *
 * @param username
// */
//function addJoiner(username) {
//    joiners.push(username);
//}

/**
 * Removes an username from the variable joiners
 * @param username
 */
//function removeJoiner(username) {
//    for(var i = 0; i < joiners.length; i++) {
//        if(username == joiners[i]) {
//            joiners.splice(i, 1);
//            return;
//        }
//    }
//}