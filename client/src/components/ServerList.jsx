import React from 'react';
import { Home, Compass, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const ServerList = () => {
  const servers = [
    { id: 'home', icon: Home, active: true },
    { id: 'discover', icon: Compass, active: false }
  ];

  return (
    <div className="w-18 bg-vscode-dark flex flex-col items-center py-3 space-y-2 border-r border-vscode-border">
      {/* Home Server */}
      {servers.map((server) => (
        <motion.div
          key={server.id}
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className={`server-icon ${server.active ? 'active' : ''}`}
        >
          <server.icon size={24} />
        </motion.div>
      ))}

      {/* Separator */}
      <div className="w-8 h-px bg-vscode-border" />

      {/* Add Server */}
      <motion.div
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="server-icon text-green-400"
      >
        <Plus size={24} />
      </motion.div>
    </div>
  );
};

export default ServerList;
