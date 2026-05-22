/**
 * File Transfer Manager with Chunking, Encryption, and Integrity Check
 */
class FileTransferManager {
  constructor(crypto, webrtc) {
    this.crypto = crypto;
    this.webrtc = webrtc;
    this.CHUNK_SIZE = 16 * 1024; // 16KB chunks (WebRTC safe limit)
    this.transfers = new Map(); // Track active transfers
    this.onProgress = null;
    this.onFileReceived = null;
  }

  /**
   * Calculate SHA-256 hash of file
   */
  async calculateFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Send file with chunking and encryption
   */
  async sendFile(file, onProgress) {
    const fileId = this.generateId();
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);

    console.log(`📤 Sending file: ${file.name} (${totalChunks} chunks)`);

    // Calculate file hash for integrity
    const fileHash = await this.calculateFileHash(file);
    console.log(`🔐 File hash (SHA-256): ${fileHash}`);

    // Send file metadata first
    const metadata = {
      type: 'file-metadata',
      fileId: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks: totalChunks,
      hash: fileHash
    };

    const encryptedMetadata = await this.crypto.encrypt(JSON.stringify(metadata));
    this.webrtc.sendMessage(JSON.stringify({
      type: 'encrypted-file-metadata',
      data: encryptedMetadata
    }));

    // Send chunks
    let chunksSent = 0;
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // Read chunk as ArrayBuffer
      const chunkData = await chunk.arrayBuffer();
      const chunkBase64 = this.arrayBufferToBase64(chunkData);

      // Encrypt chunk
      const chunkMessage = JSON.stringify({
        fileId: fileId,
        chunkIndex: i,
        data: chunkBase64
      });

      const encryptedChunk = await this.crypto.encrypt(chunkMessage);

      // Send encrypted chunk
      this.webrtc.sendMessage(JSON.stringify({
        type: 'encrypted-file-chunk',
        data: encryptedChunk
      }));

      chunksSent++;
      const progress = (chunksSent / totalChunks) * 100;

      if (onProgress) {
        onProgress({
          fileId,
          fileName: file.name,
          progress,
          chunksSent,
          totalChunks
        });
      }

      // Small delay to prevent overwhelming the data channel
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    console.log(`✅ File sent: ${file.name}`);
    return fileId;
  }

  /**
   * Handle incoming file metadata
   */
  handleFileMetadata(metadata) {
    console.log(`📥 Receiving file: ${metadata.fileName} (${metadata.totalChunks} chunks)`);

    this.transfers.set(metadata.fileId, {
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      fileType: metadata.fileType,
      totalChunks: metadata.totalChunks,
      receivedChunks: [],
      hash: metadata.hash,
      chunksReceived: 0
    });

    if (this.onProgress) {
      this.onProgress({
        fileId: metadata.fileId,
        fileName: metadata.fileName,
        progress: 0,
        chunksReceived: 0,
        totalChunks: metadata.totalChunks,
        receiving: true
      });
    }
  }

  /**
   * Handle incoming file chunk
   */
  async handleFileChunk(chunkData) {
    const transfer = this.transfers.get(chunkData.fileId);
    if (!transfer) {
      console.error('❌ Unknown file transfer:', chunkData.fileId);
      return;
    }

    // Store chunk
    transfer.receivedChunks[chunkData.chunkIndex] = chunkData.data;
    transfer.chunksReceived++;

    const progress = (transfer.chunksReceived / transfer.totalChunks) * 100;

    if (this.onProgress) {
      this.onProgress({
        fileId: chunkData.fileId,
        fileName: transfer.fileName,
        progress,
        chunksReceived: transfer.chunksReceived,
        totalChunks: transfer.totalChunks,
        receiving: true
      });
    }

    // Check if all chunks received
    if (transfer.chunksReceived === transfer.totalChunks) {
      await this.assembleFile(chunkData.fileId);
    }
  }

  /**
   * Assemble file from chunks and verify integrity
   */
  async assembleFile(fileId) {
    const transfer = this.transfers.get(fileId);
    console.log(`🔧 Assembling file: ${transfer.fileName}`);

    // Combine all chunks
    const chunks = transfer.receivedChunks.map(base64 =>
      this.base64ToArrayBuffer(base64)
    );

    const blob = new Blob(chunks, { type: transfer.fileType });

    // Verify file integrity
    const receivedHash = await this.calculateFileHash(blob);
    console.log(`🔍 Received hash: ${receivedHash}`);
    console.log(`🔍 Expected hash: ${transfer.hash}`);

    if (receivedHash === transfer.hash) {
      console.log(`✅ File integrity verified: ${transfer.fileName}`);

      if (this.onFileReceived) {
        this.onFileReceived({
          fileId, // <--- UNIQUE ID FOR FILE
          fileName: transfer.fileName,
          blob: blob,
          verified: true,
          hash: receivedHash
        });
      }
    } else {
      console.error(`❌ File integrity check failed for: ${transfer.fileName}`);

      if (this.onFileReceived) {
        this.onFileReceived({
          fileId, // <--- include fileId here too
          fileName: transfer.fileName,
          blob: null,
          verified: false,
          error: 'Hash mismatch'
        });
      }
    }

    // Clean up
    this.transfers.delete(fileId);
  }

  /**
   * Download file to user's device
   */
  downloadFile(fileName, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Helper: Generate unique ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Helper: ArrayBuffer to Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Helper: Base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export default FileTransferManager;
