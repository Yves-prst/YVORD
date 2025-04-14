const socket = io();
    const chat = document.getElementById('chat');
    let screenStream = null;

    // Enviar mensagem de chat
    function enviar() {
      const msg = document.getElementById('mensagem').value;
      socket.emit('mensagem', msg);
      document.getElementById('mensagem').value = '';
    }

    // Receber e exibir mensagem de chat
    socket.on('mensagem', msg => {
      chat.innerHTML += `<p>${msg}</p>`;
    });

    // --- WebRTC (áudio e vídeo) ---
    let localStream;
    let peerConnection;
    const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    // Iniciar chamada de áudio
    async function iniciarAudio() {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      peerConnection = new RTCPeerConnection(config);

      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (e) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = e.streams[0];
        remoteAudio.play();

        const remoteVideo = document.getElementById("remoteVideo");
        remoteVideo.srcObject = e.streams[0];
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

    // Responder a uma oferta de chamada
    socket.on('offer', async offer => {
      peerConnection = new RTCPeerConnection(config);
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (e) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = e.streams[0];
        remoteAudio.play();

        const remoteVideo = document.getElementById("remoteVideo");
        remoteVideo.srcObject = e.streams[0];
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
    function encerrarTela() {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;

        // Opcionalmente, parar de mostrar no localVideo
        const localVideo = document.getElementById("localVideo");
        localVideo.srcObject = null;

        alert("Compartilhamento de tela encerrado");
      }
    }