import React from 'react';
import { File, Download, CheckCircle, XCircle, Loader } from 'lucide-react';

const FileTransferProgress = ({ transfer }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = () => {
    if (transfer.verified === true) {
      return <CheckCircle size={20} className="text-green-400" />;
    }
    if (transfer.verified === false) {
      return <XCircle size={20} className="text-red-400" />;
    }
    return <Loader size={20} className="text-blue-400 animate-spin" />;
  };

  return (
    <div className="px-4 py-3 bg-discord-lighter rounded-lg mb-2">
      <div className="flex items-center space-x-3">
        <File size={24} className="text-discord-muted flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-white truncate">
              {transfer.fileName}
            </span>
            {getStatusIcon()}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-discord-gray rounded-full h-2 mb-1">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                transfer.verified === true
                  ? 'bg-green-500'
                  : transfer.verified === false
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${transfer.progress}%` }}
            ></div>
          </div>

          {/* Progress Text */}
          <div className="flex items-center justify-between text-xs text-discord-muted">
            <span>
              {transfer.receiving ? 'Đang nhận' : 'Đang gửi'}: {Math.round(transfer.progress)}%
            </span>
            <span>
              {transfer.chunksReceived || transfer.chunksSent} / {transfer.totalChunks} phần
            </span>
          </div>

          {/* Verification Status */}
          {transfer.verified === true && (
            <div className="mt-2 text-xs text-green-400 flex items-center space-x-1">
              <CheckCircle size={14} />
              <span>Đã xác minh toàn vẹn (SHA-256)</span>
            </div>
          )}

          {transfer.verified === false && (
            <div className="mt-2 text-xs text-red-400 flex items-center space-x-1">
              <XCircle size={14} />
              <span>Kiểm tra toàn vẹn thất bại</span>
            </div>
          )}
        </div>

        {/* Download Button (for received files) */}
        {transfer.verified === true && transfer.blob && typeof transfer.onDownload === 'function' && (
          <button
            onClick={transfer.onDownload}
            className="text-discord-muted hover:text-discord-text transition-colors"
            title="Tải tệp xuống"
          >
            <Download size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileTransferProgress;
