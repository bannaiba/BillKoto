import { useState, useRef } from 'react';
import { parseReceipt } from '../services/geminiService';
import './ReceiptUpload.css';

export default function ReceiptUpload({ receiptImage, setReceiptImage, onParsed, onSkip }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleScan = async () => {
    if (!receiptImage) return;
    setIsProcessing(true);
    setError('');
    try {
      const data = await parseReceipt(receiptImage);
      onParsed(data);
    } catch (err) {
      setError(err.message || 'Failed to scan receipt. You can enter items manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    setReceiptImage(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="receipt-upload animate-in">
      <div className="upload-header">
        <h2>Upload Your Receipt</h2>
        <p>Take a photo or upload an image of your receipt</p>
      </div>

      {!receiptImage ? (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          id="receipt-drop-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="drop-zone-input"
            id="receipt-file-input"
          />
          <div className="drop-zone-content">
            <div className="drop-zone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>
            <p className="drop-zone-text">
              <span className="drop-zone-highlight">Click to upload</span> or drag & drop
            </p>
            <p className="drop-zone-hint">PNG, JPG, HEIC — max 10MB</p>
            <p className="drop-zone-mobile-hint">📱 On mobile, tap to use your camera</p>
          </div>
        </div>
      ) : (
        <div className="preview-container glass-card">
          <div className="preview-image-wrapper">
            <img src={receiptImage} alt="Receipt preview" className="preview-image" />
            <button className="preview-remove" onClick={handleRemoveImage} title="Remove image" id="remove-receipt-btn">
              ✕
            </button>
          </div>

          {isProcessing && (
            <div className="processing-overlay">
              <div className="processing-spinner" />
              <p className="processing-text">Scanning receipt with AI...</p>
              <p className="processing-subtext">Extracting items and prices</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="upload-error">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="upload-actions">
        {receiptImage && !isProcessing && (
          <button className="btn btn-primary" onClick={handleScan} id="scan-receipt-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
            Scan Receipt
          </button>
        )}
        <button className="btn btn-secondary" onClick={onSkip} id="manual-entry-btn">
          ✍️ Enter Manually
        </button>
      </div>
    </div>
  );
}
