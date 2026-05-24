/**
 * Multi-User WebRTC Manager (Mesh Topology)
 * Supports up to 4 users in a room
 */
class WebRTCManager {
  constructor(signalingServerUrl, authToken = null) {
    this.signalingServerUrl = signalingServerUrl;
    this.authToken = authToken;
    this.ws = null;
    this.userId = null;
    this.roomId = null;
    
    // Map of peer connections: peerId -> { pc, dataChannel, makingOffer, ignoreOffer }
    this.peers = new Map();
    
    // Callbacks
    this.onMessage = null;
    this.onRoomJoined = null;
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onUserListUpdate = null;
    this.onConnectionStateChange = null;
    this.onDataChannelOpen = null;
    this.onError = null;
    this.onOfflineMessages = null;
    this.onOfflineMessageStored = null;
    this.onOfflineMessagesDelivered = null;
    this.onOfflineMessageError = null;
    
    // ICE servers
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  /**
   * Connect to signaling server
   */
  connectToSignalingServer() {
    return new Promise((resolve, reject) => {
      console.log('🔄 Connecting to:', this.signalingServerUrl);
      
      this.ws = new WebSocket(this.getAuthenticatedSignalingUrl());
      
      this.ws.onopen = () => {
        console.log('✅ Connected to signaling server');
        resolve(); // Resolve immediately on connection
      };
      
      this.ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log('📨 Signaling:', message.type);
        
        switch(message.type) {
          case 'room-joined':
            this.roomId = message.roomId;
            this.userId = message.userId; // Store our user ID
            console.log('🏠 Joined room:', this.roomId);
            console.log('🆔 My user ID:', this.userId);
            console.log('👥 Existing users:', message.users.length);
            
            // Create peer connections to all existing users
            for (const user of message.users) {
              if (user.simulated) {
                console.log('🧪 Simulated churn peer listed:', user.username);
                continue;
              }
              await this.createPeerConnection(user.userId, true); // We initiate
            }
            
            if (this.onRoomJoined) {
              this.onRoomJoined(message);
            }
            break;
            
          case 'user-joined':
            console.log('👋 User joined:', message.username);
            if (message.simulated) {
              if (this.onUserJoined) {
                this.onUserJoined(message);
              }
              break;
            }
            // New user will initiate connection to us, we just wait
            await this.createPeerConnection(message.userId, false); // They initiate
            
            if (this.onUserJoined) {
              this.onUserJoined(message);
            }
            break;
            
          case 'user-left':
            console.log('👋 User left:', message.username);
            if (!message.simulated) {
              this.removePeerConnection(message.userId);
            }
            
            if (this.onUserLeft) {
              this.onUserLeft(message);
            }
            break;
            
          case 'user-list':
            if (this.onUserListUpdate) {
              this.onUserListUpdate(message.users);
            }
            break;
            
          case 'signal':
            // Handle WebRTC signaling
            const { fromId, signal } = message;
            if (signal.type === 'offer') {
              await this.handleOffer(fromId, signal);
            } else if (signal.type === 'answer') {
              await this.handleAnswer(fromId, signal);
            } else if (signal.candidate) {
              await this.handleIceCandidate(fromId, signal);
            }
            break;
            
          case 'error':
            console.error('❌ Server error:', message.message);
            if (this.onError) {
              this.onError(message.message);
            }
            break;

          case 'offline-message:pending':
            if (this.onOfflineMessages) {
              this.onOfflineMessages(message.messages || []);
            }
            break;

          case 'offline-message:store':
            if (this.onOfflineMessageStored) {
              this.onOfflineMessageStored(message.message);
            }
            break;

          case 'offline-message:delivered':
            if (this.onOfflineMessagesDelivered) {
              this.onOfflineMessagesDelivered(message);
            }
            break;

          case 'offline-message:error':
            console.error('❌ Offline message error:', message.message);
            if (this.onOfflineMessageError) {
              this.onOfflineMessageError(message.message);
            }
            break;
            
          default:
            console.log('❓ Unknown message type:', message.type);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = () => {
        console.log('🔌 Disconnected from signaling server');
        this.cleanup();
      };
    });
  }

  /**
   * Join the chat (auto-join to default room)
   */
  join(username, roomId) {
    console.log('📢 Joining room:', roomId, 'as:', username);
    this.sendSignalingMessage({
      type: 'join',
      username: username,
      roomId: roomId
    });
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (!this.roomId) return;
    
    console.log('📢 Leaving room:', this.roomId);
    this.sendSignalingMessage({
      type: 'leave'
    });
    
    this.cleanup();
  }

  /**
   * Create peer connection to a specific user
   */
  async createPeerConnection(peerId, shouldInitiate) {
    if (this.peers.has(peerId)) {
      console.log('⚠️ Peer connection already exists:', peerId);
      return;
    }
    
    console.log(`🔧 Creating peer connection to ${peerId} (initiate: ${shouldInitiate})`);
    
    const pc = new RTCPeerConnection(this.iceServers);
    const peerData = {
      pc: pc,
      dataChannel: null,
      makingOffer: false,
      ignoreOffer: false,
      polite: !shouldInitiate // If we initiate, we're impolite
    };
    
    this.peers.set(peerId, peerData);
    
    // Handle negotiation needed
    pc.onnegotiationneeded = async () => {
      try {
        console.log(`🔄 Negotiation needed for ${peerId}`);
        peerData.makingOffer = true;
        await pc.setLocalDescription();
        
        // Send through 'signal' type
        this.sendSignalingMessage({
          type: 'signal',
          targetId: peerId,
          signal: pc.localDescription
        });
      } catch (error) {
        console.error('❌ Negotiation error:', error);
      } finally {
        peerData.makingOffer = false;
      }
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'signal',
          targetId: peerId,
          signal: { candidate: event.candidate }
        });
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection to ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('[P2P] connection established:', peerId);
      } else if (pc.connectionState === 'failed') {
        console.warn('[P2P] connection failed:', peerId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        console.warn('[P2P] connection unavailable:', peerId, pc.connectionState);
      }
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(peerId, pc.connectionState);
      }
    };
    
    // Handle incoming data channel
    pc.ondatachannel = (event) => {
      console.log(`📡 Received data channel from ${peerId}`);
      peerData.dataChannel = event.channel;
      this.setupDataChannel(peerId, event.channel);
    };
    
    // If we should initiate, create data channel
    if (shouldInitiate) {
      console.log(`📢 Creating data channel to ${peerId}`);
      const dataChannel = pc.createDataChannel('chat', { ordered: true });
      peerData.dataChannel = dataChannel;
      this.setupDataChannel(peerId, dataChannel);
    }
  }

  /**
   * Remove peer connection
   */
  removePeerConnection(peerId) {
    const peerData = this.peers.get(peerId);
    if (!peerData) return;
    
    console.log(`🗑️ Removing peer connection: ${peerId}`);
    
    if (peerData.dataChannel) {
      peerData.dataChannel.close();
    }
    if (peerData.pc) {
      peerData.pc.close();
    }
    
    this.peers.delete(peerId);
  }

  /**
   * Setup data channel event handlers
   */
  setupDataChannel(peerId, dataChannel) {
    dataChannel.onopen = () => {
      console.log(`📡 Data channel opened to ${peerId}`);
      // Notify app that data channel is ready
      if (this.onDataChannelOpen) {
        this.onDataChannelOpen(peerId);
      }
    };
    
    dataChannel.onclose = () => {
      console.log(`📡 Data channel closed to ${peerId}`);
      console.warn('[P2P] DataChannel closed:', peerId);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(peerId, 'disconnected');
      }
    };
    
    dataChannel.onmessage = (event) => {
      console.log(`📨 Raw message from ${peerId}:`, event.data.substring(0, 50));
      if (this.onMessage) {
        this.onMessage(peerId, event.data);
      } else {
        console.error('⚠️ onMessage callback not set!');
      }
    };
    
    dataChannel.onerror = (error) => {
      console.error(`❌ Data channel error (${peerId}):`, error);
      console.error('[P2P] DataChannel failed:', peerId, error);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(peerId, 'failed');
      }
    };
  }

  /**
   * Handle incoming offer
   */
  async handleOffer(fromId, offer) {
    let peerData = this.peers.get(fromId);
    
    if (!peerData) {
      // Create peer connection if we don't have one yet
      await this.createPeerConnection(fromId, false);
      peerData = this.peers.get(fromId);
    }
    
    const offerCollision = peerData.makingOffer || 
                          peerData.pc.signalingState !== 'stable';
    
    peerData.ignoreOffer = !peerData.polite && offerCollision;
    
    if (peerData.ignoreOffer) {
      console.log(`🚫 Ignoring offer from ${fromId} (collision)`);
      return;
    }
    
    console.log(`📥 Setting remote offer from ${fromId}`);
    await peerData.pc.setRemoteDescription(offer);
    await peerData.pc.setLocalDescription();
    
    this.sendSignalingMessage({
      type: 'signal',
      targetId: fromId,
      signal: peerData.pc.localDescription
    });
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(fromId, answer) {
    const peerData = this.peers.get(fromId);
    if (!peerData) return;
    
    console.log(`📥 Setting remote answer from ${fromId}`);
    await peerData.pc.setRemoteDescription(answer);
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(fromId, candidate) {
    const peerData = this.peers.get(fromId);
    if (!peerData) return;
    
    if (peerData.ignoreOffer) return;
    
    try {
      await peerData.pc.addIceCandidate(candidate.candidate);
      console.log(`✅ Added ICE candidate from ${fromId}`);
    } catch (error) {
      console.error(`❌ Error adding ICE candidate:`, error);
    }
  }

  /**
   * Send message to all peers
   */
  broadcastMessage(message) {
    let sent = 0;
    this.peers.forEach((peerData, peerId) => {
      if (peerData.dataChannel && peerData.dataChannel.readyState === 'open') {
        peerData.dataChannel.send(message);
      console.log('[P2P] message sent over DataChannel:', peerId);
        sent++;
      }
    });
    console.log(`📤 Broadcast message to ${sent} peer(s)`);
    return sent > 0;
  }

  /**
   * Send message to specific peer
   */
  sendMessageToPeer(peerId, message) {
    const peerData = this.peers.get(peerId);
    if (peerData?.dataChannel?.readyState === 'open') {
      peerData.dataChannel.send(message);
      console.log('[P2P] message sent over DataChannel:', peerId);
      return true;
    }
    console.warn(`⚠️ Cannot send to ${peerId}: channel not ready`);
    return false;
  }

  storeOfflineMessage(message) {
    return this.sendSignalingMessage({
      type: 'offline-message:store',
      ...message
    });
  }

  acknowledgeOfflineMessages(messageIds) {
    return this.sendSignalingMessage({
      type: 'offline-message:delivered',
      messageIds
    });
  }

  /**
   * Send signaling message through WebSocket
   */
  sendSignalingMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  getAuthenticatedSignalingUrl() {
    if (!this.authToken) {
      return this.signalingServerUrl;
    }

    const url = new URL(this.signalingServerUrl);
    url.searchParams.set('token', this.authToken);
    return url.toString();
  }

  /**
   * Cleanup all connections
   */
  cleanup() {
    this.peers.forEach((peerData, peerId) => {
      this.removePeerConnection(peerId);
    });
    this.roomId = null;
  }

  /**
   * Close all connections
   */
  close() {
    console.log('🔌 Closing all connections');
    this.cleanup();
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default WebRTCManager;
