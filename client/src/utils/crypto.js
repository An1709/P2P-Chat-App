/**
 * AES-GCM Encryption/Decryption utilities using Web Crypto API
 */

class CryptoUtils {
    constructor() {
      this.keyPair = null;
      this.sharedKey = null;
    }
  
    /**
     * Generate a random encryption key
     */
    async generateKey() {
      return await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
    }
  
    /**
     * Generate ECDH key pair for key exchange
     */
    async generateKeyPair() {
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey']
      );
      return this.keyPair;
    }
  
    /**
     * Export public key to share with peer
     */
    async exportPublicKey() {
      if (!this.keyPair) {
        await this.generateKeyPair();
      }
      
      const exported = await window.crypto.subtle.exportKey(
        'raw',
        this.keyPair.publicKey
      );
      
      return this.arrayBufferToBase64(exported);
    }
  
    /**
     * Import peer's public key and derive shared secret
     */
    async deriveSharedKey(peerPublicKeyBase64) {
      const peerPublicKeyBuffer = this.base64ToArrayBuffer(peerPublicKeyBase64);
      
      const peerPublicKey = await window.crypto.subtle.importKey(
        'raw',
        peerPublicKeyBuffer,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        []
      );
  
      this.sharedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: peerPublicKey
        },
        this.keyPair.privateKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['encrypt', 'decrypt']
      );
  
      return this.sharedKey;
    }
  
    /**
     * Encrypt a message using AES-GCM
     */
    async encrypt(message) {
      if (!this.sharedKey) {
        throw new Error('Shared key not established. Exchange keys first.');
      }
  
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
  
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.sharedKey,
        data
      );
  
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
  
      return this.arrayBufferToBase64(combined);
    }
  
    /**
     * Decrypt a message using AES-GCM
     */
    async decrypt(encryptedBase64) {
      if (!this.sharedKey) {
        throw new Error('Shared key not established. Exchange keys first.');
      }
  
      const combined = this.base64ToArrayBuffer(encryptedBase64);
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
  
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.sharedKey,
        data
      );
  
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    }
  
    /**
     * Helper: Convert ArrayBuffer to Base64
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
     * Helper: Convert Base64 to ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
  }
  
  export default CryptoUtils;
  
