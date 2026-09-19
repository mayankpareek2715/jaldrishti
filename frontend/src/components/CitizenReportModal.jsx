import { useState, useRef, useEffect } from 'react'
import { api } from '../api/client'

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', '.msi', '.bin',
  '.jar', '.jsp', '.php', '.asp', '.aspx', '.js', '.vbs', '.py', '.com', '.scr', '.pif'
]

function validateMediaFile(file) {
  if (!file) throw new Error('No file selected.')
  
  const name = file.name.toLowerCase()
  const isDangerous = DANGEROUS_EXTENSIONS.some(ext => name.endsWith(ext))
  if (isDangerous) {
    throw new Error('Executable and script files are not allowed for security reasons.')
  }

  const isVideo = file.type.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov') || name.endsWith('.ogg')
  const isImage = file.type.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp') || name.endsWith('.gif')

  if (!isImage && !isVideo) {
    throw new Error('Invalid file format. Only images (JPG, PNG, WebP, GIF) and videos (MP4, WebM, MOV) are supported.')
  }

  if (isVideo && file.size > 25 * 1024 * 1024) {
    throw new Error('Video file size exceeds 25 MB limit.')
  }

  if (isImage && file.size > 15 * 1024 * 1024) {
    throw new Error('Image file size exceeds 15 MB limit.')
  }

  return {
    isVideo,
    isImage,
    type: isVideo ? 'video' : 'image',
    sizeFormatted: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
  }
}

import { SEED_LOCALITIES } from '../api/mockData'

export default function CitizenReportModal({ localities = [], activeCity = 'Bengaluru', onClose, onSuccess }) {
  const allLocs = (Array.isArray(localities) && localities.length > 0) ? localities : SEED_LOCALITIES
  const currentCity = (activeCity || 'Bengaluru').toLowerCase()
  const filteredLocalities = allLocs.filter(
    (l) => l && l.city && l.city.toLowerCase() === currentCity
  )

  const [localityId, setLocalityId] = useState(() => filteredLocalities[0]?.id || 'koramangala')
  const [locationDescription, setLocationDescription] = useState('')
  const [waterLevelFeet, setWaterLevelFeet] = useState(1.5)
  const [description, setDescription] = useState('')
  
  // Keep localityId valid if city or localities change
  useEffect(() => {
    if (!filteredLocalities.some(l => l.id === localityId)) {
      setLocalityId(filteredLocalities[0]?.id || 'koramangala')
    }
  }, [currentCity, filteredLocalities, localityId])
  
  // Media upload state
  const [mediaTab, setMediaTab] = useState('file') // 'file' or 'url'
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewData, setPreviewData] = useState(null) // { url, type, name, size }
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitStage, setSubmitStage] = useState('')
  const [submitError, setSubmitError] = useState('')

  const fileInputRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewData?.url && previewData.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewData.url)
      }
    }
  }, [previewData])

  const handleFileChange = (files) => {
    if (!files || !files[0]) return
    const file = files[0]
    setUploadError('')

    try {
      const meta = validateMediaFile(file)
      if (previewData?.url && previewData.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewData.url)
      }
      const objectUrl = URL.createObjectURL(file)
      setSelectedFile(file)
      setPreviewData({
        url: objectUrl,
        type: meta.type,
        name: file.name,
        size: meta.sizeFormatted
      })
    } catch (err) {
      setUploadError(err.message || 'Error processing media file.')
      setSelectedFile(null)
      setPreviewData(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    if (e) e.preventDefault()
    setIsDragging(false)
  }

  const handleLeave = handleDragLeave

  const handleRemoveMedia = () => {
    if (previewData?.url && previewData.url.startsWith('blob:')) {
      URL.revokeObjectURL(previewData.url)
    }
    setSelectedFile(null)
    setPreviewData(null)
    setPhotoUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!localityId) {
      setSubmitError('Please select a monitored ward/locality.')
      return
    }
    if (!locationDescription.trim()) {
      setSubmitError('Please specify the exact location or landmark.')
      return
    }
    if (!description.trim()) {
      setSubmitError('Please enter an incident description.')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      let finalMediaUrl = ''
      if (mediaTab === 'file' && selectedFile) {
        setSubmitStage('Uploading evidence to secure storage...')
        const uploadRes = await api.uploadMedia(selectedFile)
        if (!uploadRes || !uploadRes.url) {
          throw new Error('Backend failed to return uploaded media URL.')
        }
        finalMediaUrl = uploadRes.url
      } else if (mediaTab === 'url' && photoUrl.trim()) {
        finalMediaUrl = photoUrl.trim()
      }

      setSubmitStage('Submitting report to emergency operations...')
      const savedReport = await api.submitCitizenReport({
        localityId,
        locationDescription: locationDescription.trim(),
        waterLevelFeet: Number(waterLevelFeet) || 0.0,
        description: description.trim(),
        photoUrl: finalMediaUrl
      })

      if (!savedReport || !savedReport.id) {
        throw new Error('Database persistence did not return a valid report confirmation.')
      }

      // Notify any active views (e.g. ReportsView) to refresh
      window.dispatchEvent(new CustomEvent('citizen-report-created', { detail: savedReport }))

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Submission failed:', err)
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to submit report.'
      setSubmitError(errorMsg)
    } finally {
      setSubmitting(false)
      setSubmitStage('')
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        backdropFilter: 'blur(4px)'
      }}
    >
      <div className="card" style={{
        maxWidth: 480, width: '100%', padding: 22,
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 8, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
      }}>
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            📢 CITIZEN FLOOD REPORT DISPATCH
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '2px 6px' }}
          >✕</button>
        </div>

        {submitError && (
          <div style={{
            marginBottom: 14, padding: '8px 12px', borderRadius: 4,
            border: '1px solid var(--status-critical)', background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--status-critical)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)'
          }}>
            ⚠️ {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>SELECT WARD / LOCALITY ({activeCity.toUpperCase()})</label>
          <select
            value={localityId}
            onChange={(e) => setLocalityId(e.target.value)}
            style={{ marginBottom: 12 }}
          >
            {filteredLocalities.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          <label>EXACT LOCATION / LANDMARK</label>
          <input 
            type="text" 
            required 
            value={locationDescription} 
            onChange={(e) => setLocationDescription(e.target.value)} 
            placeholder="e.g. Near Ejipura 4th Block Junction / Service Road" 
            style={{ marginBottom: 12 }}
          />

          <label>ESTIMATED WATER LEVEL (FEET)</label>
          <input 
            type="number" 
            step="0.1" 
            min="0.1" 
            max="15.0" 
            required 
            value={waterLevelFeet} 
            onChange={(e) => setWaterLevelFeet(e.target.value)} 
            style={{ marginBottom: 12 }}
          />

          <label>INCIDENT DESCRIPTION</label>
          <textarea 
            required 
            rows="2" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Describe current road conditions, stranded vehicles, or drain overflow..." 
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text-primary)', padding: 8, fontSize: 12,
              fontFamily: 'var(--font-sans)', width: '100%', marginBottom: 12, outline: 'none'
            }}
          />

          {/* ── PHOTO & VIDEO EVIDENCE ATTACHMENT ── */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ margin: 0 }}>PHOTO &amp; VIDEO EVIDENCE (OPTIONAL)</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setMediaTab('file')}
                  style={{
                    background: mediaTab === 'file' ? 'var(--accent-primary)' : 'transparent',
                    color: mediaTab === 'file' ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 3,
                    padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-mono)'
                  }}
                >
                  📁 File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTab('url')}
                  style={{
                    background: mediaTab === 'url' ? 'var(--accent-primary)' : 'transparent',
                    color: mediaTab === 'url' ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 3,
                    padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-mono)'
                  }}
                >
                  🔗 Web Link
                </button>
              </div>
            </div>

            {mediaTab === 'file' ? (
              <div>
                {!previewData ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={{
                      border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border)'}`,
                      borderRadius: 6,
                      background: isDragging ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-input)',
                      padding: '16px 14px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,video/*"
                      onChange={(e) => handleFileChange(e.target.files)}
                      style={{ display: 'none' }}
                    />
                    <div style={{ fontSize: 24 }}>📸 🎥</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Click to upload picture or video
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Supports JPG, PNG, WebP, GIF, MP4, WebM (or drag &amp; drop)
                    </div>
                  </div>
                ) : (
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    background: 'var(--bg-input)',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {previewData.type === 'video' ? '🎥 Video File' : '📷 Picture File'}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({previewData.size})</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        style={{
                          background: 'none', border: 'none', color: 'var(--status-critical)',
                          cursor: 'pointer', fontSize: 11, fontWeight: 600
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>

                    {/* Media Preview Player / Image */}
                    {previewData.type === 'video' ? (
                      <video
                        src={previewData.url}
                        controls
                        style={{
                          width: '100%', maxHeight: 180, borderRadius: 4,
                          background: '#000', objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <div style={{ position: 'relative', width: '100%', maxHeight: 180, overflow: 'hidden', borderRadius: 4 }}>
                        <img
                          src={previewData.url}
                          alt="Evidence preview"
                          style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div style={{ color: 'var(--status-critical)', fontSize: 11, marginTop: 4 }}>
                    ⚠️ {uploadError}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input 
                  type="url" 
                  value={photoUrl} 
                  onChange={(e) => setPhotoUrl(e.target.value)} 
                  placeholder="https://example.com/photo.jpg or video link" 
                />
                {photoUrl && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>URL Preview:</span>
                    {photoUrl.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i) ? (
                      <video src={photoUrl} controls style={{ width: '100%', maxHeight: 140, borderRadius: 4, marginTop: 4 }} />
                    ) : (
                      <img src={photoUrl} alt="URL preview" onError={(e) => e.currentTarget.style.display = 'none'} style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 4, marginTop: 4 }} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {submitStage && (
            <div style={{
              fontSize: 11, color: 'var(--accent-primary)', marginBottom: 8,
              fontFamily: 'var(--font-mono)', textAlign: 'right'
            }}>
              ⏳ {submitStage}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>CANCEL</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'TRANSMITTING...' : 'TRANSMIT REPORT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

