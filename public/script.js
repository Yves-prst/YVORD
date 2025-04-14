const socket = io();
const roomId = "sala-principal"; // pode trocar por ID dinâmico

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peers = {};

(async () => {
  // Captura áudio/vídeo local
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  localVideo.srcObject = localStream;

  socket.emit('join-room', roomId);
})();

socket.on('user-joined', async (userId) => {
  const peer = createPeer(userId, true);
  peers[userId] = peer;
});

socket.on('offer', async ({ from, offer }) => {
  const peer = createPeer(from, false);
  await peer.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  socket.emit('answer', { to: from, answer });
});

socket.on('answer', async ({ from, answer }) => {
  await peers[from]?.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', async ({ from, candidate }) => {
  await peers[from]?.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('user-disconnected', id => {
  if (peers[id]) {
    peers[id].close();
    delete peers[id];
  }
});

// Cria conexão com outro peer
function createPeer(id, isInitiator) {
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  const peer = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

  peer.onicecandidate = e => {
    if (e.candidate) {
      socket.emit('candidate', { to: id, candidate: e.candidate });
    }
  };

  peer.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  if (isInitiator) {
    peer.createOffer().then(offer => {
      peer.setLocalDescription(offer);
      socket.emit('offer', { to: id, offer });
    });
  }

  return peer;
}


// Encerrar chamada
function encerrarChamada() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    alert("Chamada encerrada");
  }
}

// Compartilhar tela
async function compartilharTela() {
  try {
    // Captura a tela
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

    // Exibe a tela localmente
    const localVideo = document.getElementById("localVideo");
    localVideo.srcObject = screenStream;

    // Substitui o vídeo da webcam pelo vídeo da tela no peerConnection
    screenStream.getTracks().forEach(track => {
      const sender = peerConnection.getSenders().find(s => s.track.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track);
      }
    });

    alert("Transmitindo a tela");

    // Quando o usuário parar de compartilhar a tela
    screenStream.getVideoTracks()[0].onended = () => {
      encerrarTela();
    };

  } catch (err) {
    console.error("Erro ao compartilhar a tela:", err);
  }
}

// Encerrar compartilhamento de tela
function encerrarChamada() {
  for (const id in peers) {
    peers[id].close();
    delete peers[id];
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  alert("Chamada encerrada");
}
