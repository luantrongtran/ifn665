/**
 * Created by lua on 3/04/2016.
 */

/**
 * Checking if users' browser support RTCPeerConnection
 * @returns {*}
 */
function hasRTCPeerConnection () {
    window.RTCPeerConnection = window.RTCPeerConnection ||
    window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    return window.RTCPeerConnection;
}


function hasUserMedia() {
    return !! (navigator.getUserMedia || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia || navigator.msGetUserMedia);
}