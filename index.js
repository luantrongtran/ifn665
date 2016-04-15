/**
 * Created by lua on 3/04/2016.
 */
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: 8888});

var users = {};

/**
 * value-pair map, the key is the board id and the value is the username of the board's owner
 * @type {{}}
 */
var boards = {};

wss.on('connection', function (connection) {
   console.log("User connected");

    connection.on('message', function (message) {
        var data;

        try {
            data = JSON.parse(message);
        } catch (expception) {
            console.log("data is not in JSON");
        }

        switch (data.type) {
            case "login":
                handleLoginRequest(connection, data);
                break;
            case "createNewBoard":
                handleCreateNewBoard(connection, data);
                break;
            case "requestToJoinABoard":
                handleRequestToJoinABoard(connection, data);
                break;
            case "answer":
                onAnswerReceived(connection, data);
                break;

            //Handlers for setting up WebRTC
            case "offer":
                //After accept the request to join the board, the owner sends WebRTC offer to the client
                onOffer(connection, data);
                break;
            case "webRTCAnswer":
                //The client send the WebRTC answer to the board's owner
                onWebRTCAnswer(connection, data);
                break;
            case "candidate":
                onCandidate(connection, data);
                break;
            default :
        }
    });

});

function onCandidate(con, data) {
    var targetConnection = users[data.connected_user];
    sendTo(targetConnection, {
        type: "candidate",
        candidate: data.candidate
    });

    console.log(con.name + " sends webrtc candidate to " + data.connected_user);
}

/**
 * The client sends the webRTC answer to the board's owner
 * @param con
 * @param data
 */
function onWebRTCAnswer(con, data) {
    var targetConnection = users[data.board_owner];

    sendTo(targetConnection, {
        type: "webRTCAnswer",
        answer: data.answer,
        client: con.name
    });

    console.log(con.name + " sends webrtc answer to " + data.sender);
}

/**
 * Board's owner sends WebRTC offer to the client
 * @param con
 * @param data
 */
function onOffer(con, data) {
    console.log(con.name + " (board's owner) sends webrtc offer to " + data.client_username + " (client)");


    var targetConnection = users[data.client_username];//the connection to the board's owner

    sendTo(targetConnection, {
        type: "offer",
        offer: data.offer,
        board_owner: con.name
    });
}

function onAnswerReceived (connection, data) {
    var sender = data.sender;//This is the username of the one sending the request to join an existing board
    var senderCon = users[sender];

    if (!data.success) {
        //if the board's owner didn't accept the request to join the board

        sendTo(senderCon, {
            type: "answer",
            board_owner: connection.name,
            success: false
        });
        return;
    }

    //var send = data.sender;
    sendTo(senderCon, {
       type: "answer",
        board_owner: connection.name,
        success: true
        //answer: data.answer
    });
}

/**
 * Client sends request to join a board
 * @param data contains
 *          type: "requestToJoinABoard"
 *          offer: the info, used for setting up peer-to-peer, of the sender
 *          board_id: the id of the board the sender wants to join
 */
function handleRequestToJoinABoard(con, data) {
    var boardId = data.board_id;
    var username = getBoardOwner(boardId);
    if(username == "") {
        //there is no board with the given board id
        //Reply the sender with an error message
        var errMsg = "There is no board named " + boardId;
        sendTo(con, {
            type: "requestToJoinABoard",
            success: false,
            message: errMsg
        });
    } else {
        // if there is a board with the given id, and the owner's username is returned
        // forward the request to the receiver
        var targetConnection = users[username];
        sendTo(targetConnection, {
            type: "receiveRequestToJoinTheBoard",
            //offer: data.offer,
            sender: con.name
        });

        //reply to the sender, that the offer has been successfully sent to the board owner
        sendTo(con, {
            type: "requestToJoinABoard",
            success: true
        })
    }
}

/**
 * invoked when receives request of logging in from an user
 * @param connection
 * @param data is a JSON string has 2 attributes
 *          type: indicating type of request
 *          username: the name of the user
 * . Ex: {type: "login", username: "user1"}.
 */
function handleLoginRequest(connection, data) {
    if(users[data.username]) {
        console.log("An user used an existing username: " + data.username);
        //if the username is being used by another person
        sendTo(connection, {
            type: "login",
            success: false
        });
    } else {
        //if no one has used the name
        console.log("A new user logged: " + data.username);

        connection.name = data.username;
        users[data.username] = connection;
        sendTo(connection, {
            type: "login",
            success: "true"
        });
    }
}

/**
 * invoked when receives an request of creating a new board
 * @param con
 * @param data
 */
function handleCreateNewBoard(con, data) {
    if(boards[data.board_id]) {
        //if the board id has been used
        sendTo(con, {
            type: "createNewBoard",
            success: false
        });
    } else {
        //IF the board id has not been used
        boards[data.board_id] = data.username;

        sendTo(con, {
            type: "createNewBoard",
            success: true
        });
    }
}

function sendTo(con, message) {
    console.log("Reply: " , message);
    con.send(JSON.stringify(message));
}

/**
 * Gets the username of the board owner using the given board id
 * @param boardId the board id
 * @return returns the username of the board owner. if there is no board with the given id returns empty string
 */
function getBoardOwner(boardId) {
    if(boards[boardId]) {
        return boards[boardId];
    } else {
        return "";
    }
}