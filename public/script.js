const socket = io();
const chat = document.getElementById('chat');
let screenStream = null;


function enviar() {
  const msg = document.getElementById('mensagem').value;
  socket.emit('mensagem', msg);
  document.getElementById('mensagem').value = '';
}

socket.on('mensagem', msg => {
  chat.innerHTML += `<p>${msg}</p>`;
});

// --- WebRTC (áudio) ---
let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function iniciarAudio() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (e) => {
    const remoteAudio = new Audio();
    remoteAudio.srcObject = e.streams[0];
    remoteAudio.play();
  };

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('candidate', e.candidate);
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', offer);
}

socket.on('offer', async offer => {
  peerConnection = new RTCPeerConnection(config);
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (e) => {
    const remoteAudio = new Audio();
    remoteAudio.srcObject = e.streams[0];
    remoteAudio.play();
  };

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('candidate', e.candidate);
    }
  };

  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async answer => {
  await peerConnection.setRemoteDescription(answer);
});

socket.on('candidate', async candidate => {
  if (peerConnection) {
    await peerConnection.addIceCandidate(candidate);
  }
});

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

async function compartilharTela() {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

    screenStream.getTracks().forEach(track => {
      const sender = peerConnection.getSenders().find(s => s.track.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track);
      }
    });

    alert("Transmitindo a tela");

    // Se o usuário parar manualmente pelo navegador
    screenStream.getVideoTracks()[0].onended = () => {
      encerrarTela();
    };

  } catch (err) {
    console.error("Erro ao compartilhar a tela:", err);
  }
}

function encerrarTela() {
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
    alert("Compartilhamento de tela encerrado");
  }
}

