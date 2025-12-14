import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewName, setPreviewName] = useState('');

  // 1. Fetch File List
  const fetchFiles = async () => {
    try {
      const response = await axios.get('/files/db');
      setFiles(response.data);
    } catch (error) {
      console.error("Error fetching files:", error);
      alert("Could not fetch file list. Is Backend running?");
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // 2. Handle File Selection
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // 3. Upload File
  const handleUpload = async () => {
    if (!selectedFile) return alert("Please select a file first!");

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    try {
      await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Upload Successful!');
      setSelectedFile(null);
      document.getElementById('fileInput').value = ""; 
      fetchFiles();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // 4. Fetch Presigned URL and show preview
  const handlePreview = async (objectKey, originalName) => {
    setPreviewLoading(true);
    setPreviewName(originalName);
    try {
      const response = await axios.get(`/file/${objectKey}/url`);
      setPreviewUrl(response.data.url);
    } catch (error) {
      console.error("Error fetching preview URL:", error);
      alert("Could not load preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // 5. Close preview modal
  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewName('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>MinIO File Manager</h1>

      {/* Upload Section */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Upload New File</h3>
        <input 
          id="fileInput" 
          type="file" 
          onChange={handleFileChange} 
        />
        <button 
          onClick={handleUpload} 
          disabled={uploading}
          style={{ marginLeft: '10px', padding: '5px 15px', cursor: 'pointer' }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {/* File List Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>ID</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>File Name</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Size (Bytes)</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>No files found.</td>
            </tr>
          ) : (
            files.map((file) => (
              <tr key={file.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{file.id}</td>
                <td style={{ padding: '10px' }}>{file.originalName}</td>
                <td style={{ padding: '10px' }}>{file.size}</td>
                <td style={{ padding: '10px' }}>
                  <button 
                    onClick={() => handlePreview(file.objectKey, file.originalName)}
                    style={{ 
                      textDecoration: 'none', 
                      color: 'white', 
                      background: '#007bff', 
                      padding: '5px 10px', 
                      borderRadius: '3px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Preview
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Preview Modal */}
      {(previewUrl || previewLoading) && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={closePreview}
        >
          <div 
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '90%',
              maxHeight: '90%',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={closePreview}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>

            <h3 style={{ marginTop: 0, marginBottom: '15px', paddingRight: '40px' }}>
              {previewName}
            </h3>

            {previewLoading ? (
              <p style={{ textAlign: 'center', padding: '40px' }}>Loading...</p>
            ) : (
              <img 
                src={previewUrl} 
                alt={previewName}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh',
                  display: 'block',
                  margin: '0 auto'
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
