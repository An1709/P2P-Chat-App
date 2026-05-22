import React, { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';

const FileUpload = ({ onFileSelect, disabled }) => {
  const fileInputRef = useRef(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={handleFileClick}
        disabled={disabled}
        className="text-discord-muted hover:text-discord-text transition-colors disabled:opacity-50"
        title="Đính kèm tệp"
      >
        <Paperclip size={24} />
      </button>
    </>
  );
};

export default FileUpload;
