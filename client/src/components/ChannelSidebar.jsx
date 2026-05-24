import React, { useState } from 'react';
import { Hash, ChevronDown, ChevronRight, Settings, LogOut, Shield, Users as UsersIcon, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChannelSidebar = ({
  connectionState,
  isEncrypted,
  roomUsers,
  currentUsername,
  currentRoom,
  availableRooms,
  onRoomSwitch,
  onLeaveRoom,
  soundEnabled,
  onToggleSound
}) => {
  const [showChannels, setShowChannels] = useState(true);
  const [showMembers, setShowMembers] = useState(true);

  return (
    <div className="w-60 bg-vscode-darker flex flex-col border-r border-vscode-border">
      {/* Server Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-vscode-border bg-vscode-card/30">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-p2p-orange to-p2p-yellow flex items-center justify-center">
            <Shield size={18} className="text-vscode-dark" />
          </div>
          <span className="font-bold text-vscode-text text-sm">SecureChat</span>
        </div>
        <ChevronDown size={18} className="text-vscode-text-muted cursor-pointer hover:text-vscode-text transition-colors" />
      </div>

      {/* Connection Status */}
      <div className="px-3 py-3 border-b border-vscode-border">
        <div className="flex items-center justify-between px-3 py-2 bg-vscode-card/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <motion.div 
              className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-400' : 'bg-gray-500'}`}
              animate={connectionState === 'connected' ? {
                boxShadow: ['0 0 0 0 rgba(74, 222, 128, 0.7)', '0 0 0 8px rgba(74, 222, 128, 0)']
              } : {}}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span className="text-xs font-semibold text-vscode-text-secondary">
              {connectionState === 'connected' ? 'Đã kết nối' : 'Đang kết nối...'}
            </span>
          </div>
          {isEncrypted && (
            <div className="badge badge-orange">
              <Shield size={10} className="mr-1" />
              E2E
            </div>
          )}
        </div>
      </div>

      {/* Channels Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        <div
          className="category-header"
          onClick={() => setShowChannels(!showChannels)}
        >
          <div className="flex items-center space-x-1">
            {showChannels ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Phòng</span>
          </div>
          <span className="text-vscode-text-muted">{availableRooms.length}</span>
        </div>

        <AnimatePresence>
          {showChannels && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-0.5"
            >
              {availableRooms.map((room) => (
                <motion.div
                  key={room.id}
                  whileHover={{ x: 4 }}
                  onClick={() => onRoomSwitch(room.id)}
                  className={`channel-item ${currentRoom === room.id ? 'active' : ''}`}
                >
                  <span className="text-lg">{room.icon}</span>
                  <Hash size={16} />
                  <span className="text-sm font-medium">{room.name}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Members Section */}
        <div
          className="category-header mt-4"
          onClick={() => setShowMembers(!showMembers)}
        >
          <div className="flex items-center space-x-1">
            {showMembers ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Người đang online</span>
          </div>
          <span className="text-vscode-text-muted">{roomUsers.length + 1}</span>
        </div>

        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1 px-2"
            >
              {/* Current User */}
              <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-p2p-orange/10 border border-p2p-orange/30">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-p2p-orange to-p2p-yellow flex items-center justify-center text-vscode-dark text-xs font-bold">
                  {currentUsername.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-p2p-orange truncate">{currentUsername}</div>
                  <div className="text-xs text-vscode-text-muted">Bạn</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
              </div>

              {/* Other Users */}
              {roomUsers.map((user, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-vscode-card/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-vscode-card flex items-center justify-center text-vscode-text-secondary text-xs font-bold border border-vscode-border">
                    {(user.displayName || user.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-vscode-text truncate">
                      {user.displayName || user.username}
                    </div>
                    {user.simulated && (
                      <div className="text-xs text-vscode-accent">peer mô phỏng</div>
                    )}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 bg-vscode-card border-t border-vscode-border">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-vscode-darker/50">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-p2p-orange to-p2p-yellow flex items-center justify-center text-vscode-dark text-xs font-bold">
              {currentUsername.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-vscode-text truncate">{currentUsername}</div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-vscode-text-muted">Đang online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {/* Sound Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleSound}
              className="p-1.5 hover:bg-vscode-hover rounded-md transition-colors"
              title={soundEnabled ? "Tắt âm thông báo" : "Bật âm thông báo"}
            >
              {soundEnabled ? (
                <Volume2 size={16} className="text-vscode-text-muted hover:text-vscode-text" />
              ) : (
                <VolumeX size={16} className="text-red-400" />
              )}
            </motion.button>
            
            {/* Settings */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 hover:bg-vscode-hover rounded-md transition-colors"
              title="Cài đặt"
            >
              <Settings size={16} className="text-vscode-text-muted hover:text-vscode-text" />
            </motion.button>
            
            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLeaveRoom}
              className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={16} className="text-vscode-text-muted hover:text-red-400" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelSidebar;
