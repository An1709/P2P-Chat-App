import React, { useEffect, useRef, useState } from 'react';
import { Shield, Pin, Smile, MoreVertical, Reply, Copy, Trash2, Search, X, File, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';

const MessageList = ({ messages, onPinMessage, onReactToMessage, onDeleteMessage, pinnedMessages = [] }) => {
  const messagesEndRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [filteredMessages, setFilteredMessages] = useState(messages);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = messages.filter(msg => 
        msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(messages);
    }
  }, [searchQuery, messages]);

  const groupMessagesByUser = (messages) => {
    const grouped = [];
    let currentGroup = null;

    messages.forEach((msg) => {
      if (
        currentGroup &&
        currentGroup.sender === msg.sender &&
        currentGroup.senderId === msg.senderId
      ) {
        currentGroup.messages.push(msg);
      } else {
        currentGroup = {
          sender: msg.senderDisplayName || msg.sender,
          senderId: msg.senderId,
          encrypted: msg.encrypted,
          messages: [msg]
        };
        grouped.push(currentGroup);
      }
    });

    return grouped;
  };

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message
    });
  };

  const handleEmojiClick = (messageId, emojiObject) => {
    onReactToMessage(messageId, emojiObject.emoji);
    setShowEmojiPicker(null);
  };

  const isPinned = (message) => {
    return pinnedMessages.some(pm => pm.id === message.id || pm.text === message.text);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const groupedMessages = groupMessagesByUser(filteredMessages);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-vscode-darker relative">
      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-20 px-4 py-3 bg-vscode-card/95 backdrop-blur-md border-b border-vscode-border"
          >
            <div className="flex items-center space-x-2">
              <Search size={18} className="text-vscode-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tin nhắn..."
                className="flex-1 bg-vscode-hover text-white placeholder-vscode-text-muted border-none rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-p2p-orange/50 text-sm"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="p-2 hover:bg-vscode-hover rounded-lg transition-colors"
              >
                <X size={18} className="text-vscode-text-muted" />
              </button>
            </div>
            {searchQuery && (
              <p className="text-xs text-vscode-text-muted mt-2">
                Tìm thấy {filteredMessages.length} tin nhắn
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <div className="sticky top-0 z-10 px-4 py-2 bg-vscode-accent/10 border-b border-vscode-accent/30">
          <div className="flex items-center space-x-2">
            <Pin size={16} className="text-vscode-accent" />
            <span className="text-sm text-vscode-accent font-semibold">
              {pinnedMessages.length} tin nhắn đã ghim
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="px-2 py-4">
        <AnimatePresence>
          {groupedMessages.map((group, groupIndex) => (
            <motion.div
              key={groupIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="message-group"
            >
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-p2p-orange to-p2p-yellow flex items-center justify-center text-vscode-dark font-bold shadow-lg">
                    {group.sender.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  {/* Username & Timestamp */}
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-bold text-vscode-text">
                      {group.sender}
                    </span>
                    
                    {group.encrypted && (
                      <div className="flex items-center space-x-1 badge badge-orange">
                        <Shield size={12} />
                        <span>E2E</span>
                      </div>
                    )}
                    {group.messages.some(msg => msg.offlineDelivered) && (
                      <div className="flex items-center space-x-1 badge badge-blue">
                        <span>Tin nhắn ngoại tuyến</span>
                      </div>
                    )}
                    {group.messages.some(msg => msg.offlineStored) && (
                      <div className="flex items-center space-x-1 badge badge-blue">
                        <span>Đã lưu để gửi khi người nhận online</span>
                      </div>
                    )}
                    {group.messages.some(msg => msg.offlineFile) && (
                      <div className="flex items-center space-x-1 badge badge-blue">
                        <span>Tệp ngoại tuyến</span>
                      </div>
                    )}
                    
                    <span className="text-xs text-vscode-text-muted">
                      {group.messages[0].timestamp}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="space-y-2">
                    {group.messages.map((msg, msgIndex) => (
                      <motion.div
                        key={msgIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: msgIndex * 0.05 }}
                        className="relative group"
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                      >
                        {msg.sender === 'Hệ thống' ? (
                          <div className="flex items-center space-x-2 text-sm py-2">
                            <div className="w-1 h-1 rounded-full bg-vscode-accent" />
                            <span className="text-vscode-text-muted">{msg.text}</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <div
                              className={`message-bubble ${msg.encrypted ? 'encrypted' : ''} ${
                                isPinned(msg) ? 'border-vscode-accent/50' : ''
                              }`}
                            >
                              {isPinned(msg) && (
                                <div className="absolute -top-2 -left-2">
                                  <Pin size={14} className="text-vscode-accent fill-vscode-accent" />
                                </div>
                              )}
                              
                              {msg.fileMessage ? (
                                <div className="flex items-center gap-3">
                                  <File size={20} className="text-vscode-accent flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-vscode-text text-sm font-semibold truncate">
                                      {msg.fileName || msg.text}
                                    </p>
                                    {msg.fileSize && (
                                      <p className="text-xs text-vscode-text-muted">
                                        {formatFileSize(msg.fileSize)}
                                      </p>
                                    )}
                                  </div>
                                  {typeof msg.onDownload === 'function' && (
                                    <button
                                      type="button"
                                      onClick={msg.onDownload}
                                      className="p-2 rounded-lg bg-vscode-hover hover:bg-vscode-border text-vscode-text transition-colors"
                                      title="Tải tệp xuống"
                                    >
                                      <Download size={16} />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-vscode-text text-sm leading-relaxed break-words">
                                  {msg.text}
                                </p>
                              )}

                              {(msg.offlineDelivered || msg.offlineStored) && (
                                <div className="mt-2 text-xs text-vscode-accent">
                                  {msg.offlineFile
                                    ? (msg.offlineDelivered ? 'Tệp ngoại tuyến - Được chuyển khi bạn online lại' : 'Tệp sẽ được chuyển khi người nhận trực tuyến')
                                    : (msg.offlineDelivered
                                      ? 'Tin nhắn ngoại tuyến'
                                      : 'Tin nhắn sẽ được chuyển khi người nhận trực tuyến')}
                                </div>
                              )}

                              {/* Reactions */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {msg.reactions.map((reaction, idx) => (
                                    <motion.button
                                      key={idx}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="flex items-center space-x-1 px-2 py-1 rounded-md bg-vscode-hover/50 border border-vscode-border hover:border-p2p-orange/30 transition-all"
                                    >
                                      <span className="text-sm">{reaction.emoji}</span>
                                      <span className="text-xs text-vscode-text-muted">
                                        {reaction.count}
                                      </span>
                                    </motion.button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Hover Actions */}
                            <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center space-x-1 bg-vscode-card border border-vscode-border rounded-lg p-1 shadow-lg">
                                <button
                                  onClick={() => setShowEmojiPicker(msg.id || msgIndex)}
                                  className="p-1.5 hover:bg-vscode-hover rounded transition-colors"
                                  title="Thêm biểu cảm"
                                >
                                  <Smile size={16} className="text-vscode-text-muted hover:text-p2p-orange" />
                                </button>
                                <button
                                  onClick={() => onPinMessage(msg)}
                                  className="p-1.5 hover:bg-vscode-hover rounded transition-colors"
                                  title={isPinned(msg) ? "Bỏ ghim" : "Ghim tin nhắn"}
                                >
                                  <Pin size={16} className={isPinned(msg) ? 'text-vscode-accent' : 'text-vscode-text-muted hover:text-vscode-accent'} />
                                </button>
                                <button
                                  onClick={(e) => handleContextMenu(e, msg)}
                                  className="p-1.5 hover:bg-vscode-hover rounded transition-colors"
                                  title="Tùy chọn khác"
                                >
                                  <MoreVertical size={16} className="text-vscode-text-muted" />
                                </button>
                              </div>
                            </div>

                            {/* Emoji Picker */}
                            <AnimatePresence>
                              {showEmojiPicker === (msg.id || msgIndex) && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="absolute top-full left-0 mt-2 z-30"
                                >
                                  <EmojiPicker
                                    onEmojiClick={(emoji) => handleEmojiClick(msg.id || msgIndex, emoji)}
                                    theme="dark"
                                    width={300}
                                    height={400}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                zIndex: 50
              }}
              className="bg-vscode-card border border-vscode-border rounded-lg shadow-2xl py-2 min-w-[180px]"
            >
              <button
                onClick={() => {
                  onPinMessage(contextMenu.message);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-vscode-text hover:bg-vscode-hover transition-colors flex items-center space-x-2"
              >
                <Pin size={16} />
                <span>{isPinned(contextMenu.message) ? 'Bỏ ghim' : 'Ghim'} tin nhắn</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.message.text);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-vscode-text hover:bg-vscode-hover transition-colors flex items-center space-x-2"
              >
                <Copy size={16} />
                <span>Sao chép nội dung</span>
              </button>
              <button
                onClick={() => {
                  setShowEmojiPicker(contextMenu.message.id);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-vscode-text hover:bg-vscode-hover transition-colors flex items-center space-x-2"
              >
                <Smile size={16} />
                <span>Thêm biểu cảm</span>
              </button>
              {contextMenu.message.senderId === 'self' && (
                <button
                  onClick={() => {
                    onDeleteMessage(contextMenu.message);
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>Xóa</span>
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} />

      {/* Floating Search Button */}
      {!showSearch && (
        <button
          onClick={() => setShowSearch(true)}
          className="fixed bottom-24 right-8 p-3 bg-vscode-card hover:bg-vscode-hover border border-vscode-border rounded-full shadow-lg transition-all z-10"
          title="Tìm tin nhắn"
        >
          <Search size={20} className="text-vscode-text" />
        </button>
      )}
    </div>
  );
};

export default MessageList;
