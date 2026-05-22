import React, { useState, useEffect, useRef } from 'react';
import { Hash, Bell, Pin, Search } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// Components
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import ChannelSidebar from './components/ChannelSidebar';
import MessageList from './components/MessageList';
import ChatWindow from './components/ChatWindow';
import FileTransferProgress from './components/FileTransferProgress';

// Utils
import WebRTCManager from './utils/webrtc';
import CryptoUtils from './utils/crypto';
import FileTransferManager from './utils/fileTransfer';
import notificationSounds from './utils/notificationSounds';
import { getCurrentUser } from './utils/authApi';

// const getSignalingServerUrl = () => {
//   const hostname = window.location.hostname;
//   return `wss://${hostname}:3001`; // Use wss:// for secure WebSocket
// };

// const SIGNALING_SERVER = getSignalingServerUrl();



// client/src/app.jsx - NEW CODE
// Use the production URL from Vercel's environment variables,
// but fall back to our local server for development.
const SIGNALING_SERVER = import.meta.env.VITE_WEBSOCKET_URL || 'wss://localhost:3001';

const AVAILABLE_ROOMS = [
  { id: 'general', name: 'chung', icon: '🏠', description: 'Phòng chat chung' },
  { id: 'gaming', name: 'game', icon: '🎮', description: 'Thảo luận về game' },
  { id: 'music', name: 'âm nhạc', icon: '🎵', description: 'Âm nhạc và âm thanh' },
  { id: 'coding', name: 'lập trình', icon: '💻', description: 'Trao đổi về lập trình' },
  { id: 'random', name: 'tự do', icon: '🎲', description: 'Nội dung bất kỳ' },
];

function App() {
  // App state
  const [showLanding, setShowLanding] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // User state
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState('general');
  
  // Room-specific state
  const [roomStates, setRoomStates] = useState({
    general: { messages: [], roomUsers: [], fileTransfers: [] },
    gaming: { messages: [], roomUsers: [], fileTransfers: [] },
    music: { messages: [], roomUsers: [], fileTransfers: [] },
    coding: { messages: [], roomUsers: [], fileTransfers: [] },
    random: { messages: [], roomUsers: [], fileTransfers: [] },
  });
  
  // Connection state
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isSending, setIsSending] = useState(false);
  
  // New feature states
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  
  // Managers
  const [webrtc, setWebrtc] = useState(null);
  const [crypto, setCrypto] = useState(null);
  
  // Refs
  const peerCryptoRef = useRef(new Map());
  const [peerCryptoReady, setPeerCryptoReady] = useState(0);
  const peerUsernamesRef = useRef(new Map());
  const fileManagersRef = useRef(new Map());
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);
  const selfIdRef = useRef(null);
  const displayNameRef = useRef('');
  const currentRoomIdRef = useRef('general');

  // Update refs whenever state changes
  useEffect(() => {
    displayNameRef.current = displayName || username;
  }, [displayName, username]);

  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  // Get current room state
  const currentRoomMeta = AVAILABLE_ROOMS.find(room => room.id === currentRoomId);
  const currentRoomState = roomStates[currentRoomId] || { messages: [], roomUsers: [], fileTransfers: [] };
  const messages = currentRoomState.messages;
  const roomUsers = currentRoomState.roomUsers;
  const fileTransfers = currentRoomState.fileTransfers;

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedSession = localStorage.getItem('p2pChatSession');
        const storedToken = localStorage.getItem('p2pChatToken') || (storedSession ? JSON.parse(storedSession).token : '');

        if (!storedToken) {
          setAuthChecked(true);
          return;
        }

        const result = await getCurrentUser(storedToken);
        setUser(result.user);
        setUsername(result.user.email);
        setDisplayName(result.user.displayName);
        setAuthToken(storedToken);
        setShowLanding(false);
      } catch (error) {
        localStorage.removeItem('p2pChatToken');
        localStorage.removeItem('p2pChatUser');
        localStorage.removeItem('p2pChatSession');
      } finally {
        setAuthChecked(true);
      }
    };

    restoreSession();
  }, []);

  // Authenticated user identity stays separate from WebRTC transport.
  const handleLoginAuthenticated = (authenticatedUser, token) => {
    console.log('✅ User authenticated:', authenticatedUser.email);
    setUser(authenticatedUser);
    setUsername(authenticatedUser.email);
    setDisplayName(authenticatedUser.displayName);
    setAuthToken(token);
    setShowLoginModal(false);
    setShowLanding(false);
    
    localStorage.setItem('p2pChatToken', token);
    localStorage.setItem('p2pChatUser', JSON.stringify(authenticatedUser));
    localStorage.setItem('p2pChatSession', JSON.stringify({ user: authenticatedUser, token }));
  };

  const handleLogout = () => {
    if (webrtc) {
      webrtc.close();
    }

    localStorage.removeItem('p2pChatToken');
    localStorage.removeItem('p2pChatUser');
    localStorage.removeItem('p2pChatSession');

    peerCryptoRef.current.clear();
    peerUsernamesRef.current.clear();
    fileManagersRef.current.clear();
    initializingRef.current = false;
    initializedRef.current = false;
    selfIdRef.current = null;

    setWebrtc(null);
    setCrypto(null);
    setUser(null);
    setAuthToken('');
    setUsername('');
    setDisplayName('');
    setConnectionState('disconnected');
    setIsAuthenticated(false);
    setCurrentRoomId('general');
    setPeerCryptoReady(0);
    setPinnedMessages([]);
    setRoomStates({
      general: { messages: [], roomUsers: [], fileTransfers: [] },
      gaming: { messages: [], roomUsers: [], fileTransfers: [] },
      music: { messages: [], roomUsers: [], fileTransfers: [] },
      coding: { messages: [], roomUsers: [], fileTransfers: [] },
      random: { messages: [], roomUsers: [], fileTransfers: [] },
    });
  };

  // Handle Get Started button
  const handleGetStarted = () => {
    setShowLoginModal(true);
  };

  // New Feature Handlers
  const handlePinMessage = (message) => {
    setPinnedMessages(prev => {
      const isPinned = prev.some(pm => 
        (pm.text === message.text && pm.timestamp === message.timestamp) || 
        pm.id === message.id
      );
      
      if (isPinned) {
        // Unpin
        return prev.filter(pm => 
          !((pm.text === message.text && pm.timestamp === message.timestamp) || pm.id === message.id)
        );
      } else {
        // Pin
        if (notificationSoundEnabled) {
          notificationSounds.playPinSound();
        }
        return [...prev, { ...message, id: message.id || Date.now() }];
      }
    });
  };

  const handleReactToMessage = async (messageId, emoji) => {
    // Update local state
    setRoomStates(prev => {
      const roomId = currentRoomIdRef.current;
      const currentRoom = prev[roomId] || { messages: [], roomUsers: [], fileTransfers: [] };
      
      const updatedMessages = currentRoom.messages.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.emoji === emoji);
          
          if (existingReaction) {
            existingReaction.count += 1;
            existingReaction.users = existingReaction.users || [];
            if (!existingReaction.users.includes(displayNameRef.current)) {
              existingReaction.users.push(displayNameRef.current);
            }
          } else {
            reactions.push({ emoji, count: 1, users: [displayNameRef.current] });
          }
          
          if (notificationSoundEnabled) {
            notificationSounds.playReactionSound();
          }
          
          return { ...msg, reactions: [...reactions] };
        }
        return msg;
      });
      
      return {
        ...prev,
        [roomId]: {
          ...currentRoom,
          messages: updatedMessages
        }
      };
    });

    // Send reaction to all peers
    if (webrtc && peerCryptoRef.current.size > 0) {
      const reactionMessage = JSON.stringify({
        type: 'emoji-reaction',
        messageId: messageId,
        emoji: emoji,
        username: displayNameRef.current
      });

      for (const peerId of peerCryptoRef.current.keys()) {
        try {
          webrtc.sendMessageToPeer(peerId, reactionMessage);
        } catch (error) {
          console.error('Failed to send reaction to peer:', error);
        }
      }
    }
  };

  const handleDeleteMessage = (message) => {
    setRoomStates(prev => {
      const roomId = currentRoomIdRef.current;
      const currentRoom = prev[roomId] || { messages: [], roomUsers: [], fileTransfers: [] };
      
      return {
        ...prev,
        [roomId]: {
          ...currentRoom,
          messages: currentRoom.messages.filter(m => m.id !== message.id)
        }
      };
    });
    
    // Also remove from pinned if it was pinned
    setPinnedMessages(prev => prev.filter(pm => pm.id !== message.id));
  };

  const handleToggleSound = () => {
    const newState = !notificationSoundEnabled;
    setNotificationSoundEnabled(newState);
    notificationSounds.setEnabled(newState);
    
    // Play a test sound when enabling
    if (newState) {
      notificationSounds.playMessageSound();
    }
  };

  // Initialize connection when authenticated and displayName is set
  useEffect(() => {
    if (initializedRef.current || initializingRef.current || !user?.id || !authToken || !displayName) {
      return;
    }

    initializingRef.current = true;

    const initializeConnection = async () => {
      try {
        setConnectionState('connecting');
        addSystemMessage('Đang khởi tạo kết nối bảo mật...', currentRoomIdRef.current);
        
        const webrtcManager = new WebRTCManager(SIGNALING_SERVER, authToken);
        
        webrtcManager.onRoomJoined = async (data) => {
          const roomId = data.roomId || currentRoomIdRef.current;
          addSystemMessage(`Đã vào phòng #${roomId}`, roomId);
          
          if (webrtcManager.userId && !selfIdRef.current) {
            selfIdRef.current = webrtcManager.userId;
          }
          
          for (const user of data.users) {
            if (!peerUsernamesRef.current.has(user.userId)) {
              peerUsernamesRef.current.set(user.userId, user.username);
            }
            console.log('[P2P] peer discovered:', user.username, user.userId);
            await initializePeerCrypto(user.userId, webrtcManager, user.username);
            addSystemMessage(`Đang kết nối tới ${user.username}...`, roomId);
          }
          
          setConnectionState('connected');
        };
        
        webrtcManager.onUserJoined = async (data) => {
          if (!peerUsernamesRef.current.has(data.userId)) {
            peerUsernamesRef.current.set(data.userId, data.username);
          }
          
          addSystemMessage(`${data.username} đã tham gia`, currentRoomIdRef.current);
          console.log('[P2P] peer discovered:', data.username, data.userId);
          await initializePeerCrypto(data.userId, webrtcManager, data.username);
        };
        
        webrtcManager.onUserLeft = (data) => {
          const leavingUsername = peerUsernamesRef.current.get(data.userId) || data.username;
          addSystemMessage(`${leavingUsername} đã rời phòng`, currentRoomIdRef.current);
          
          peerCryptoRef.current.delete(data.userId);
          fileManagersRef.current.delete(data.userId);
          peerUsernamesRef.current.delete(data.userId);
          setPeerCryptoReady(prev => prev + 1);
        };
        
        webrtcManager.onUserListUpdate = (users) => {
          setTimeout(() => {
            setRoomStates(prev => {
              const roomId = currentRoomIdRef.current;
              const currentRoom = prev[roomId] || { messages: [], roomUsers: [], fileTransfers: [] };
              
              const correctedUsers = users.map(serverUser => {
                const storedDisplayName = peerUsernamesRef.current.get(serverUser.userId);
                const finalName = storedDisplayName || serverUser.username;
                
                return {
                  ...serverUser,
                  username: finalName,
                  displayName: finalName
                };
              });

              return {
                ...prev,
                [roomId]: {
                  ...currentRoom,
                  roomUsers: correctedUsers
                }
              };
            });
          }, 200);
        };
        
        webrtcManager.onConnectionStateChange = (peerId, state) => {
          const peerName = peerUsernamesRef.current.get(peerId) || peerId;
          if (state === 'connected') {
            console.log('[P2P] connection established:', peerName);
            addSystemMessage(`Kết nối P2P đã sẵn sàng: ${peerName}`, currentRoomIdRef.current);
          } else if (state === 'failed') {
            console.warn('[P2P] connection failed:', peerName);
            addSystemMessage(`Kết nối P2P thất bại: ${peerName}`, currentRoomIdRef.current);
          } else if (state === 'disconnected' || state === 'closed') {
            console.warn('[P2P] connection unavailable:', peerName, state);
            addSystemMessage(`Kết nối P2P bị gián đoạn: ${peerName}`, currentRoomIdRef.current);
          }
        };
        
        webrtcManager.onDataChannelOpen = (peerId) => {
          setTimeout(() => {
            sendKeyExchange(peerId, webrtcManager);
          }, 100);
  
          const sendDisplayName = () => {
            try {
              const currentName = displayNameRef.current;
              const nameShareMsg = JSON.stringify({
                type: 'display-name-share',
                name: currentName
              });
              
              webrtcManager.sendMessageToPeer(peerId, nameShareMsg);
            } catch (error) {
              console.error('Failed to send display name share:', error);
            }
          };
          
          setTimeout(sendDisplayName, 300);
          setTimeout(sendDisplayName, 600);
          setTimeout(sendDisplayName, 1000);
        };
        
        webrtcManager.onMessage = async (fromId, data) => {
          try {
            const message = JSON.parse(data);
            const peerCryptoInstance = peerCryptoRef.current.get(fromId);
            
            if (message.type === 'key-exchange') {
              if (peerCryptoInstance) {
                await peerCryptoInstance.deriveSharedKey(message.publicKey);
                addSystemMessage('Kết nối mã hóa đã sẵn sàng', currentRoomIdRef.current);
                setPeerCryptoReady(prev => prev + 1);
              }
            
            } else if (message.type === 'display-name-share') {
              const newName = message.name;
              const userId = fromId;

              if (newName) {
                peerUsernamesRef.current.set(userId, newName);
                
                setRoomStates(prev => {
                  const updated = {};
                  for (const [roomId, room] of Object.entries(prev)) {
                    const updatedUsers = (room.roomUsers || []).map(u => {
                      if (u.userId === userId) {
                        return { ...u, username: newName, displayName: newName };
                      }
                      return u;
                    });
                    
                    const updatedMessages = (room.messages || []).map(msg =>
                      msg.senderId === userId
                        ? { ...msg, sender: newName, senderDisplayName: newName }
                        : msg
                    );
                    
                    updated[roomId] = {
                      ...room,
                      roomUsers: updatedUsers,
                      messages: updatedMessages
                    };
                  }
                  return updated;
                });
                
                setPeerCryptoReady(prev => prev + 1);
              }
  
            } else if (message.type === 'encrypted-message') {
              if (peerCryptoInstance && peerCryptoInstance.sharedKey) {
                try {
                  const decrypted = await peerCryptoInstance.decrypt(message.data);
                  const senderUsername = peerUsernamesRef.current.get(fromId) || 'Không rõ';
                  
                  // Use the shared message ID from the sender
                  const messageId = message.messageId || `${fromId}-${Date.now()}`;
                  
                  console.log('[P2P] message received via DataChannel from:', senderUsername);
                  const displayText = message.isDirect ? `[Riêng tư] ${decrypted}` : decrypted;
                  addSystemMessage(`Tin nhắn nhận qua DataChannel từ ${senderUsername}`, currentRoomIdRef.current);
                  addMessageWithId(messageId, senderUsername, displayText, true, currentRoomIdRef.current, senderUsername, fromId);
                } catch (decryptError) {
                  console.error('❌ Decryption failed:', decryptError);
                  addSystemMessage('Không thể giải mã tin nhắn', currentRoomIdRef.current);
                }
              }
            
            } else if (message.type === 'emoji-reaction') {
              // Handle incoming emoji reaction from peer
              const { messageId, emoji, username } = message;
              
              setRoomStates(prev => {
                const roomId = currentRoomIdRef.current;
                const currentRoom = prev[roomId] || { messages: [], roomUsers: [], fileTransfers: [] };
                
                const updatedMessages = currentRoom.messages.map(msg => {
                  if (msg.id === messageId) {
                    const reactions = msg.reactions || [];
                    const existingReaction = reactions.find(r => r.emoji === emoji);
                    
                    if (existingReaction) {
                      existingReaction.count += 1;
                      existingReaction.users = existingReaction.users || [];
                      if (!existingReaction.users.includes(username)) {
                        existingReaction.users.push(username);
                      }
                    } else {
                      reactions.push({ emoji, count: 1, users: [username] });
                    }
                    
                    if (notificationSoundEnabled) {
                      notificationSounds.playReactionSound();
                    }
                    
                    return { ...msg, reactions: [...reactions] };
                  }
                  return msg;
                });
                
                return {
                  ...prev,
                  [roomId]: {
                    ...currentRoom,
                    messages: updatedMessages
                  }
                };
              });
            
            } else if (message.type === 'encrypted-file-metadata') {
              const fileManager = fileManagersRef.current.get(fromId);
              if (peerCryptoInstance && peerCryptoInstance.sharedKey && fileManager) {
                try {
                  const decrypted = await peerCryptoInstance.decrypt(message.data);
                  const metadata = JSON.parse(decrypted);
                  fileManager.handleFileMetadata(metadata);
                  
                  const senderUsername = peerUsernamesRef.current.get(fromId) || 'Không rõ';
                  addSystemMessage(`Đang nhận: ${metadata.fileName} từ ${senderUsername}`, currentRoomIdRef.current);
                } catch (decryptError) {
                  console.error('❌ Failed to process file metadata:', decryptError);
                }
              }
            } else if (message.type === 'encrypted-file-chunk') {
              const fileManager = fileManagersRef.current.get(fromId);
              if (peerCryptoInstance && peerCryptoInstance.sharedKey && fileManager) {
                try {
                  const decrypted = await peerCryptoInstance.decrypt(message.data);
                  const chunkData = JSON.parse(decrypted);
                  await fileManager.handleFileChunk(chunkData);
                } catch (error) {
                  console.error('❌ Failed to process file chunk:', error);
                }
              }
            }
          } catch (error) {
            console.error('❌ Error handling message:', error);
          }
        };
        
        webrtcManager.onError = (error) => {
          addSystemMessage(`Lỗi: ${error}`, currentRoomIdRef.current);
        };
        
        const cryptoUtils = new CryptoUtils();
        await cryptoUtils.generateKeyPair();
        setCrypto(cryptoUtils);
        addSystemMessage('Đã tạo khóa mã hóa', currentRoomIdRef.current);
        
        addSystemMessage('Đang kết nối tới máy chủ...', currentRoomIdRef.current);
        await webrtcManager.connectToSignalingServer();
        addSystemMessage('Đã kết nối tới máy chủ', currentRoomIdRef.current);
        
        webrtcManager.join(displayNameRef.current, currentRoomIdRef.current);
        
        setWebrtc(webrtcManager);
        initializedRef.current = true;
        initializingRef.current = false;
        setIsAuthenticated(true);
        
      } catch (error) {
        console.error('Connection error:', error);
        setConnectionState('disconnected');
        initializingRef.current = false;
        addSystemMessage('Kết nối thất bại: '.concat(error.message), currentRoomIdRef.current);
      }
    };

    initializeConnection();
    
    return () => {
      if (webrtc) {
        webrtc.close();
      }
    };
  }, [user, authToken, displayName]);

  const handleRoomSwitch = async (newRoomId) => {
    if (newRoomId === currentRoomId || !webrtc) return;
    
    webrtc.leaveRoom();
    
    peerCryptoRef.current.clear();
    peerUsernamesRef.current.clear();
    fileManagersRef.current.clear();
    
    setCurrentRoomId(newRoomId);
    setPeerCryptoReady(0);
    setPinnedMessages([]);
    
    webrtc.join(displayNameRef.current, newRoomId);
    
    addSystemMessage(`Đã chuyển sang phòng #${newRoomId}`, newRoomId);
  };

  const initializePeerCrypto = async (peerId, webrtcManager, username = null) => {
    if (username) {
      if (!peerUsernamesRef.current.has(peerId)) {
        peerUsernamesRef.current.set(peerId, username);
      }
    }
    
    const peerCryptoInstance = new CryptoUtils();
    await peerCryptoInstance.generateKeyPair();
    peerCryptoRef.current.set(peerId, peerCryptoInstance);
    
    const fileManager = new FileTransferManager(peerCryptoInstance, {
      sendMessage: (msg) => {
        return webrtcManager.sendMessageToPeer(peerId, msg);
      }
    });
    
    fileManager.onProgress = (progress) => {
      setRoomStates(prev => {
        const roomId = currentRoomIdRef.current;
        const currentRoom = prev[roomId] || { messages: [], roomUsers: [], fileTransfers: [] };
        const updatedTransfers = [...currentRoom.fileTransfers.filter(t => t.fileId !== progress.fileId), progress];
        
        return {
          ...prev,
          [roomId]: {
            ...currentRoom,
            fileTransfers: updatedTransfers
          }
        };
      });
    };
    
    fileManager.onFileReceived = (fileData) => {
      if (fileData.verified) {
        addSystemMessage(`Tệp đã được xác minh: ${fileData.fileName}`, currentRoomIdRef.current);
        
        setRoomStates(prev => {
          const roomId = currentRoomIdRef.current;
          const currentRoom = prev[roomId] || { messages: [], roomUsers: [], fileTransfers: [] };
          const updatedTransfers = currentRoom.fileTransfers.map(t =>
            t.fileId === fileData.fileId
              ? { 
                  ...t, 
                  verified: true, 
                  blob: fileData.blob,
                  progress: 100,
                  onDownload: () => fileManager.downloadFile(fileData.fileName, fileData.blob)
                }
              : t
          );
          
          return {
            ...prev,
            [roomId]: {
              ...currentRoom,
              fileTransfers: updatedTransfers
            }
          };
        });
      } else {
        addSystemMessage(`Kiểm tra toàn vẹn tệp thất bại: ${fileData.fileName}`, currentRoomIdRef.current);
      }
    };
    
    fileManagersRef.current.set(peerId, fileManager);
    setPeerCryptoReady(prev => prev + 1);
  };

  const sendKeyExchange = async (peerId, webrtcManager) => {
    const peerCryptoInstance = peerCryptoRef.current.get(peerId);
    if (!peerCryptoInstance) return;
    
    const publicKey = await peerCryptoInstance.exportPublicKey();
    const keyExchangeMsg = JSON.stringify({
      type: 'key-exchange',
      publicKey: publicKey
    });
    
    webrtcManager.sendMessageToPeer(peerId, keyExchangeMsg);
  };

  const handleSendMessage = async (text, targetPeerId = 'group') => {
    if (!webrtc || peerCryptoRef.current.size === 0) {
      addSystemMessage('Chưa có peer nào kết nối', currentRoomIdRef.current);
      return;
    }
    
    try {
      setIsSending(true);
      
      const sharedMessageId = `${selfIdRef.current}-${Date.now()}`;
      const isDirect = targetPeerId && targetPeerId !== 'group';
      const targetPeerIds = isDirect ? [targetPeerId] : Array.from(peerCryptoRef.current.keys());
      const targetName = isDirect
        ? (peerUsernamesRef.current.get(targetPeerId) || targetPeerId)
        : 'cả phòng';
      let sentCount = 0;
      
      for (const peerId of targetPeerIds) {
        const peerCryptoInstance = peerCryptoRef.current.get(peerId);
        if (peerCryptoInstance?.sharedKey) {
          try {
            const encrypted = await peerCryptoInstance.encrypt(text);
            
            const messageObj = {
              type: 'encrypted-message',
              data: encrypted,
              messageId: sharedMessageId,
              timestamp: new Date().getTime(),
              isDirect,
              targetId: isDirect ? targetPeerId : null
            };
            
            const sent = webrtc.sendMessageToPeer(peerId, JSON.stringify(messageObj));
            if (sent) sentCount++;
          } catch (error) {
            console.error('Failed to encrypt/send to peer:', peerId, error);
          }
        }
      }
      
      if (sentCount === 0) {
        addSystemMessage('Gửi tin nhắn thất bại: chưa có DataChannel sẵn sàng', currentRoomIdRef.current);
        console.warn('[P2P] message send failed, no ready DataChannel:', { targetPeerId });
        return;
      }

      const selfId = selfIdRef.current;
      const currentDisplayName = displayNameRef.current;
      const roomId = currentRoomIdRef.current;
      const localText = isDirect ? `[Riêng tư] ${text}` : text;
      
      console.log('[P2P] message sent via DataChannel:', { target: targetName, sentCount, isDirect });
      addSystemMessage(
        isDirect
          ? `Tin nhắn riêng đã gửi qua DataChannel tới ${targetName}`
          : `Tin nhắn nhóm đã gửi qua DataChannel tới ${sentCount} peer`,
        roomId
      );
      addMessageWithId(sharedMessageId, currentDisplayName, localText, true, roomId, currentDisplayName, selfId);
    } catch (error) {
      console.error('Error sending message:', error);
      addSystemMessage('Gửi tin nhắn thất bại: chưa có DataChannel sẵn sàng', currentRoomIdRef.current);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (fileManagersRef.current.size === 0) {
      addSystemMessage('Chưa có peer nào kết nối', currentRoomIdRef.current);
      return;
    }
    
    addSystemMessage(`Đang gửi: ${file.name} (${formatFileSize(file.size)})`, currentRoomIdRef.current);
    
    try {
      let sentCount = 0;
      
      for (const [peerId, fileManager] of fileManagersRef.current.entries()) {
        const peerCrypto = peerCryptoRef.current.get(peerId);
        
        if (peerCrypto && peerCrypto.sharedKey) {
          try {
            await fileManager.sendFile(file, (progress) => {
              // Progress callback
            });
            sentCount++;
          } catch (error) {
            console.error(`❌ Failed to send file to ${peerId}:`, error);
          }
        }
      }
      
      if (sentCount > 0) {
        addSystemMessage(`Đã gửi tệp tới ${sentCount} peer: ${file.name}`, currentRoomIdRef.current);
      } else {
        addSystemMessage('Gửi tệp thất bại: chưa có peer sẵn sàng', currentRoomIdRef.current);
      }
    } catch (error) {
      console.error('❌ Error sending file:', error);
      addSystemMessage(`Gửi tệp thất bại: ${error.message}`, currentRoomIdRef.current);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const addMessageWithId = (messageId, sender, text, encrypted = false, roomId, senderDisplayName, senderId = null) => {
    const newMessage = {
      id: messageId,
      sender,
      text,
      encrypted,
      senderDisplayName,
      senderId,
      reactions: [],
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
    
    // Play notification sound for incoming messages (not from self or system)
    if (senderId !== selfIdRef.current && senderId !== 'system' && notificationSoundEnabled) {
      notificationSounds.playMessageSound();
    }
    
    setRoomStates(prev => {
      const currentRoom = prev[roomId] || { messages: [], roomUsers: [], fileTransfers: [] };
      return {
        ...prev,
        [roomId]: {
          ...currentRoom,
          messages: [...currentRoom.messages, newMessage]
        }
      };
    });
  };

  const addMessage = (sender, text, encrypted = false, roomId, senderDisplayName, senderId = null) => {
    const messageId = `${senderId || 'system'}-${Date.now()}`;
    addMessageWithId(messageId, sender, text, encrypted, roomId, senderDisplayName, senderId);
  };

  const addSystemMessage = (text, roomId) => {
    addMessage('Hệ thống', text, false, roomId, 'Hệ thống', 'system');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vscode-dark text-vscode-text-secondary">
        Đang khôi phục phiên đăng nhập...
      </div>
    );
  }

  if (!user || !authToken) {
    return (
      <AuthModal
        onAuthenticated={handleLoginAuthenticated}
        onClose={() => {}}
        showClose={false}
      />
    );
  }

  // Show landing page
  if (showLanding) {
    return (
      <>
        <LandingPage onGetStarted={handleGetStarted} />
        <AnimatePresence>
          {showLoginModal && (
            <AuthModal 
              onAuthenticated={handleLoginAuthenticated}
              onClose={() => setShowLoginModal(false)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // Show chat interface (authenticated)
  return (
    <div className="flex h-screen bg-vscode-dark">
      <ChannelSidebar 
        connectionState={connectionState}
        isEncrypted={peerCryptoRef.current.size > 0}
        roomUsers={roomUsers}
        currentUsername={displayName || username}
        currentRoom={currentRoomId}
        availableRooms={AVAILABLE_ROOMS}
        onRoomSwitch={handleRoomSwitch}
        onLeaveRoom={handleLogout}
        soundEnabled={notificationSoundEnabled}
        onToggleSound={handleToggleSound}
      />
      
      <div className="flex-1 flex flex-col bg-vscode-darker">
        <div className="h-14 px-6 flex items-center justify-between border-b border-vscode-border bg-vscode-card/30">
          <div className="flex items-center space-x-3">
            <Hash size={20} className="text-p2p-orange" />
            <span className="text-white font-bold text-lg">{currentRoomMeta?.name || currentRoomId}</span>
            <div className="h-6 w-px bg-vscode-border mx-2"></div>
            <span className="text-sm text-vscode-text-muted">
              {roomUsers.length + 1} người đang online
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-p2p-orange shadow-lg shadow-p2p-orange/50" />
            <span className="text-xs text-vscode-text-muted">
              {displayName || user?.email || 'Đã đăng nhập'}
            </span>
          </div>
        </div>

        
        <MessageList 
          messages={messages}
          onPinMessage={handlePinMessage}
          onReactToMessage={handleReactToMessage}
          onDeleteMessage={handleDeleteMessage}
          pinnedMessages={pinnedMessages}
        />
        
        {fileTransfers.length > 0 && (
          <div className="px-4 max-h-48 overflow-y-auto custom-scrollbar">
            {fileTransfers.map((transfer, index) => (
              <FileTransferProgress key={index} transfer={transfer} />
            ))}
          </div>
        )}
        
        <ChatWindow 
          onSendMessage={handleSendMessage}
          onFileSelect={handleFileSelect}
          isConnected={peerCryptoRef.current.size > 0}
          isSending={isSending}
          peers={roomUsers}
        />
      </div>
    </div>
  );
}

export default App;
