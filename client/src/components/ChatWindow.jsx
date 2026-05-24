import React, { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const ChatWindow = ({ onSendMessage, onFileSelect, isConnected, hasP2PConnection = isConnected, isSending, peers = [] }) => {
  const [message, setMessage] = useState('');
  const [targetPeerId, setTargetPeerId] = useState('group');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (targetPeerId !== 'group' && !peers.some((peer) => peer.userId === targetPeerId)) {
      setTargetPeerId('group');
    }
    if (targetPeerId === 'group' && !hasP2PConnection && peers.length > 0) {
      setTargetPeerId(peers[0].userId);
    }
  }, [hasP2PConnection, peers, targetPeerId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (message.trim() && isConnected && !isSending) {
      onSendMessage(message, targetPeerId);
      setMessage('');
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
      event.target.value = '';
    }
  };

  return (
    <div className="p-4 bg-vscode-dark border-t border-vscode-border">
      <form onSubmit={handleSubmit} className="relative">
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2"
          >
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-sm text-red-300">Chưa có peer nào kết nối</span>
          </motion.div>
        )}

        {isConnected && (
          <div className="mb-3 flex items-center gap-2">
            <label className="text-xs font-semibold text-vscode-text-muted" htmlFor="message-target">
              Gửi tới
            </label>
            <select
              id="message-target"
              value={targetPeerId}
              onChange={(event) => setTargetPeerId(event.target.value)}
              className="bg-vscode-card border border-vscode-border text-vscode-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-p2p-orange/50"
            >
              <option value="group" disabled={!hasP2PConnection}>Cả phòng</option>
              {peers.map((peer) => (
                <option key={peer.userId} value={peer.userId}>
                  Riêng: {peer.displayName || peer.username}{peer.offline ? ' (offline)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="relative flex items-end space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleFileClick}
            disabled={!hasP2PConnection}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-vscode-card hover:bg-vscode-hover border border-vscode-border hover:border-p2p-orange/30 text-vscode-text-secondary hover:text-p2p-orange transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Đính kèm tệp"
          >
            <Paperclip size={20} />
          </motion.button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={isConnected ? 'Nhập tin nhắn...' : 'Hãy kết nối với peer trước...'}
              disabled={!isConnected || isSending}
              className="chat-input pr-12"
            />

            {hasP2PConnection && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
              >
                <Lock size={16} className="text-p2p-orange" />
              </motion.div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!message.trim() || !isConnected || isSending}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-r from-p2p-orange to-p2p-yellow hover:from-p2p-orange-dark hover:to-p2p-orange disabled:from-vscode-hover disabled:to-vscode-hover disabled:cursor-not-allowed text-vscode-dark transition-all flex items-center justify-center shadow-lg disabled:shadow-none"
            title="Gửi"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-vscode-dark border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </motion.button>
        </div>

        {isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-center space-x-4 text-xs text-vscode-text-muted"
          >
            <div className="flex items-center space-x-1">
              <div className={`status-dot ${hasP2PConnection ? 'status-encrypted' : 'bg-yellow-400'}`} />
              <span>{hasP2PConnection ? 'Mã hóa đầu cuối' : 'Có thể gửi tin offline'}</span>
            </div>
            <span>•</span>
            <span>Nhấn Enter để gửi</span>
          </motion.div>
        )}
      </form>
    </div>
  );
};

export default ChatWindow;
