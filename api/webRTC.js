/**
 * @license
 * Created by Karina Romero on 30/06/2016.
 * Copyright © 2016 Sandcode Software S.A. de C.V. All rights reserved.
 */
var name="", connectedUser;
var connection = new WebSocket('ws://162.243.206.15:8888');
var loginPage = document.querySelector('#login-page'),
    usernameInput = document.querySelector('#username'),
    loginButton = document.querySelector('#login'),
    callPage = document.querySelector('#call-page'),
    theirUsernameInput = document.querySelector('#their-username'),
    callButton = document.querySelector('#call'),
    hangUpButton = document.querySelector('#hang-up');

callPage.style.display = "none";

//Login when the user clicks the button ---> Iniciar secion cuando el usuario de click en el boton
loginButton.addEventListener("click", function (event) {
    name = usernameInput.value;

    if (name.length > 0) {
        send({
            type: "login",
            name: name
        });
    }

});

connection.onopen = function () {
    console.log("Connected");
}

//Handle all menssages throungh this callback---> manejar todos los mensajes a traves de esta resuesta
connection.onmessage = function (message) {
    console.log("Got menssge", message.data);

    var data = JSON.parse(message.data);

    switch (data.type) {
        case "login":
            onLogin(data.success);
            //console.log("Login",data.success);
            break;
        case "offer":
            onOffer(data.offer, data.name);
            //console.log("onOffer: ",data.offer);
            break;
        case "answer":
            onAnswer(data.answer);
            console.log("onAnswer: ",data.answer);
            break;
        case "candidate":
            onCandidate(data.candidate);
           // console.log("onCandidate: ",data.candidate);
            break;
        case "leave":
            onLeave();
            break;
        default:
            break;
    }
};

connection.onerror = function (err) {
    console.log("Got error", err);
};

//Alias for sending messages in JSON format---> haremos un alias para enviar un mensaje en formato JSON
function send(message) {
    if (connectedUser) {
        message.name = connectedUser;
    }
    connection.send(JSON.stringify(message));
}

function onLogin(success) {
    if (success === false) {
        alert("Login unsuccessful, please try a different name.");
    } else {
        loginPage.style.display = "none";
        callPage.style.display = "block";

        //Get the plumbing ready for a call
        startConnection();
    }
}

callButton.addEventListener("click", function () {
    var theirUsername = theirUsernameInput.value;

    if (theirUsername.length > 0) {
        startPeerConnection(theirUsername);
    }

});

function onOffer(offer, name) {
    connectedUser = name;
    //Begin the offer- Inicia la oferta de conexión del protocolo SDP
    yourConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // POST-Offer-SDP-For-Other-Peer(sessionDescription.sdp, sessionDescription.type);
    yourConnection.createAnswer(function (answer) {
        yourConnection.setLocalDescription(answer);

        // POST-answer-SDP-back-to-Offerer(sessionDescription.sdp, sessionDescription.type);

        send({type: "answer", answer: answer});
    }, function (error) {
        alert(error);
    }, {'mandatory': {'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true}});

    console.log(yourConnection);

}

function onAnswer(answer) {
    console.log("SDP",answer);
    yourConnection.setRemoteDescription(new RTCSessionDescription(answer));

}

function onCandidate(candidate) {
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));

}

function onLeave() {
    connectedUser=null;
    theirVideo.src=null;
    yourConnection.close();
    yourConnection.onicecandidate=null;
    yourConnection.onaddstream=null;
    setupPeerConnection(stream);
    console.log("onLeave",stream.toString());
}

hangUpButton.addEventListener("click",function (){
    send({type:"leave"});
    onLeave();
});

/**
 * Verifica si hay medios disponibles (audio y video) segun los navegadores admitidos(chrome,mozilla,opera,explorer)
 * @returns {boolean}
 */
function hasUserMedia() {
    return !!(navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
        || navigator.mozGetUserMedia || navigator.msGetUserMedia);
}
/**
 * Verifica si el navegador acepta el protocolo
 * @returns {boolean}
 */
function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    window.RTCSessionDescription = window.RTCSessionDescription ||
        window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
    window.RTCIceCandidate = window.RTCIceCandidate ||
        window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
    return !!window.RTCPeerConnection;
}

var yourVideo = document.querySelector('#yours'),
    theirVideo = document.querySelector("#theirs"),
    yourConnection, connectedUser, stream;


function startConnection() {
    if (hasUserMedia()) {
        navigator.getUserMedia({video: true, audio: false}, function (myStream) {
            stream = myStream;
            yourVideo.src = window.URL.createObjectURL(stream);

            if (hasRTCPeerConnection()) {
                setupPeerConnection(stream);
            } else {
                alert("Sorry, your browser does not support WebRTC. ");
            }
        }, function (error) {
            console.log(error);
        });

    } else {
        alert("Sorry, your browser does not support WebRTC. ");
    }
}
/**
 * Inicia el peerConection
 * @param stream datos multimedia que envia el cliente
 */
function setupPeerConnection(stream) {
    console.log(stream);
    var configuration = {
        //Uncoment this code to add custom iceServers
        "iceServers": [{"url": "stun:stun.1.google.com:19302"}]
        //"iceServers":[{"url":"stun:127.0.0.1:9876"}]
    };
    yourConnection = new RTCPeerConnection(configuration);

    //Setup Stream listening- Configurando la excucha del stream

    yourConnection.addStream(stream);

    //Cuando empiezas a recibir stream
    yourConnection.onaddstream = function (e) {
        console.log(e.stream);
        theirVideo.src = window.URL.createObjectURL(e.stream);
    };

    //Setup ice handling- configuracion del ice

    yourConnection.onicecandidate = function (event) {
        if (event.candidate) {
            //theirConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
            send({
                type:"candidate",
                candidate:event.candidate
            });
        }
    };

    /* theirConnection.onicecandidate = function (event) {
     if (event.candidate) {
     yourConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
     }
     };
     */

}

function startPeerConnection(user) {
    connectedUser = user;

    //Begin the offer
    yourConnection.createOffer(function (offer) {
        send({type: "offer", offer: offer});
        yourConnection.setLocalDescription(offer);
    }, function (error) {
        alert("An error has ocurred.")
    });

}



