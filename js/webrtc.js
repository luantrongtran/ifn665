/**
 * Created by lua on 3/04/2016.
 */

var WebRTCIceUrl = "stun:stun.1.google.com:19302";
var WebRTCPeerConfiguration = {
    "iceServers": [{ "url": WebRTCIceUrl }]
};
var WebRTCPeerConnectionOptions = {};
var WebRTCDataChannelConfiguration = {
    reliable: false
};

var DataTransferType = {
    CHAT_MESSAGE: "chat_message",
    CANVAS_DATA: "canvas_data",
    SYNC: "sync_all_data_with_a_the_user" //except for canvas data
};

var DrawingCommands = {
    DRAWING: "drawing",
    FINISH_DRAWING: "finish_drawing",
    DELETE: "delete_object",
    SYNC: "synchronising_drawing_objects" //synchronising canvas data with a new user
};

$.ajax({
    url: "https://service.xirsys.com/ice",
    data: {
        ident: "lualua",
        secret: "073b7318-2a02-11e6-9ba6-4bbf443fcaf2",
        domain: "www.ifn665-project.com",
        application: "default",
        room: "drawing-board",
        secure: 1
    },
    success: function (data, status) {
        // data.d is where the iceServers object lives
        WebRTCPeerConfiguration = data.d;
        console.log(WebRTCPeerConfiguration);
    }
});

/**
 * Checking if users' browser support RTCPeerConnection
 * @returns {*}
 */
function hasRTCPeerConnection () {
    window.RTCPeerConnection = window.RTCPeerConnection ||
    window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    return window.RTCPeerConnection;
}

/**
 * Check the user's medias such as video and audio devices.
 * @return {boolean}
 */
function hasUserMedia() {
    return !! (navigator.getUserMedia || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia || navigator.msGetUserMedia);
}

/**
 * This is the function used to send data between 2 peers
 * @param datachannel the WebRTCDataChannel object used between the 2 peers.
 * @param data the data needs to be sent. for ex: {type: '', content: ''}
 */
function sendDataToAPeer(datachannel, data) {

    if(isBoardOwner) {
        var connState = peerConnectionList[datachannel.name].iceConnectionState;
        if(connState == "failed" || connState == "disconnected") {
            handleGuestConnectionDisconnectedUnexpectedly(datachannel);
            console.log("failed to send data to " + datachannel.name);

            return;
        }
    } else {
        var connState = peerConnection.iceConnectionState;
        if(connState == "failed" || connState == "disconnected") {
            console.log("failed to send data to server");
            handleServerConnectionDisconnected();
        }
    }
    console.log("send data to " + datachannel.name + " " + data);
    datachannel.send(JSON.stringify(data));

    //console.log(peerConnectionList[datachannel.name].iceConnectionState);//failed disconnected
    //console.log(dataChannelList[datachannel.name].readyState);
}