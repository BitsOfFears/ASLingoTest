import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const isSendingRef = useRef(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [detectedLetter, setDetectedLetter] = useState(null)
  const [statusText, setStatusText] = useState('Initializing camera')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let stream

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatusText('Camera not supported in this browser')
          return
        }

        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setStatusText('Camera ready')
        }
      } catch (error) {
        setPermissionDenied(true)
        setStatusText('Unable to access camera')
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      captureAndSendFrame()
    }, 1200)

    return () => clearInterval(interval)
  })

  const captureAndSendFrame = () => {
    if (isSendingRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) {
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      return
    }

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0, width, height)

    canvas.toBlob(async blob => {
      if (!blob) {
        return
      }

      isSendingRef.current = true
      setStatusText('Analyzing sign')

      const formData = new FormData()
      formData.append('image', blob, 'frame.jpg')

      try {
        const response = await fetch(`${API_BASE_URL}/api/asl-infer`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Request failed')
        }

        const data = await response.json()
        if (data.letter) {
          setDetectedLetter(data.letter)
          setStatusText('Live ASL detection')
          setLastUpdated(new Date().toLocaleTimeString())
        } else {
          setStatusText('No hand detected')
        }
      } catch (error) {
        setStatusText('Unable to reach ASL server')
      } finally {
        isSendingRef.current = false
      }
    }, 'image/jpeg', 0.8)
  }

  return (
    <div className="page">
      <div className="nav">
        <div className="nav-logo">ASL Practice</div>
        <div className="nav-links">
          <span>Learn</span>
          <span>Practice</span>
          <span>About</span>
        </div>
      </div>
      <main className="hero">
        <section className="hero-copy">
          <p className="eyebrow">American Sign Language</p>
          <h1 className="headline">Say more with every gesture.</h1>
          <p className="subheadline">
            Live ASL letter recognition powered by computer vision. Practice your alphabet in real time and build muscle memory with instant feedback.
          </p>
          <div className="hero-actions">
            <button className="primary-cta">Start practicing</button>
            <button className="secondary-cta">View alphabet</button>
          </div>
          <p className="footnote">
            Works best in good lighting with your hand centered in the frame.
          </p>
        </section>
        <section className="hero-panel">
          <div className="panel">
            <div className="panel-header">
              <div className="status-pill">
                <span className="dot" />
                {statusText}
              </div>
              {lastUpdated && (
                <span className="timestamp">Updated {lastUpdated}</span>
              )}
            </div>
            <div className="video-shell">
              {permissionDenied ? (
                <div className="permission-message">
                  <h2>Enable your camera</h2>
                  <p>
                    To practice ASL letters, allow camera access in your browser settings.
                  </p>
                </div>
              ) : (
                <video ref={videoRef} className="video" playsInline muted />
              )}
              <canvas ref={canvasRef} className="capture-canvas" />
            </div>
            <div className="letter-readout">
              <div className="letter-label">Detected letter</div>
              <div className="letter-value">
                {detectedLetter || '-'}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
