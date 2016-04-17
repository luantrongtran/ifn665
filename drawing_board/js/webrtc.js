/**
 * Created by lua on 3/04/2016.
 */

var WebRTCIceUrl = "stun:stun.1.google.com:19302";
var WebRTCPeerConfiguration = {
    "iceServers": [{ "url": WebRTCIceUrl }]
};
var WebRTCPeerConnectionOptions = {optional: [{RtpDataChannels: false}]};
var WebRTCDataChannelConfiguration = {
    reliable: false
};

var DataTransferType = {
    CHAT_MESSAGE: "chat_message",
    CANVAS_DATA: "canvas_data"
};

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
 * This is the common function used to send data between 2 peers
 * @param datachannel the WebRTCDataChannel object used between the 2 peers.
 * @param data the data needs to be sent. for ex: {type: '', content: ''}
 */
function sendDataToAPeer(datachannel, data) {
    datachannel.send(JSON.stringify(data));
}