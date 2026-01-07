import React, { useState, useEffect, useRef } from 'react';
import { getVideoFeed, setCameraUrl, getCameraStatus, getCalibration, getSlots } from '../services/api';
import { useTimeFormat } from '../context/TimeFormatContext';
import Legend from './Legend';

const LiveFeed = ({ onSnapshot }) => {
  const [cameraUrl, setCameraUrlInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState({ connected: false, lastSeen: null });
  const [isUpdating, setIsUpdating] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const [calibratedSlots, setCalibratedSlots] = useState(null);
  const [illegalZones, setIllegalZones] = useState(null);
  const [slotStates, setSlotStates] = useState({});
  const [activeViolations, setActiveViolations] = useState([]);
  const { formatDateTime } = useTimeFormat();

  useEffect(() => {
    // Load current camera URL and status
    loadCameraStatus();
    
    // Update status periodically
    const statusInterval = setInterval(loadCameraStatus, 5000);
    
    return () => clearInterval(statusInterval);
  }, []);

  const loadCameraStatus = async () => {
    try {
      const status = await getCameraStatus();
      setCameraStatus(status);
      if (status.currentUrl) {
        setCameraUrlInput(status.currentUrl);
      }
    } catch (error) {
      // Silently fail for status checks - backend might not be running
      console.error('Failed to load camera status:', error);
      setCameraStatus({ connected: false, lastSeen: null });
    }
  };

  // Load calibration once and poll slot states
  useEffect(() => {
    let mounted = true;

    const loadCalibration = async () => {
      try {
        const data = await getCalibration();
        if (!mounted) return;
        if (data && data.parking_slots) {
          setCalibratedSlots(data.parking_slots);
        }
        // Also load illegal zones from calibration
        if (data && data.illegal_zones) {
          setIllegalZones(data.illegal_zones);
        }
      } catch (err) {
        console.warn('Failed to load calibration:', err.message || err);
      }
    };

    const loadSlotStates = async () => {
      try {
        const data = await getSlots();
        if (!mounted) return;
        // backend expected to return an object with `slot_states` or similar
        if (data && data.slot_states) setSlotStates(data.slot_states);
      } catch (err) {
        // ignore polling errors
      }
    };

    // Load active violations for illegal zone status
    const loadViolations = async () => {
      try {
        const response = await fetch('http://localhost:5000/dashboard/stats');
        if (!response.ok) return;
        const data = await response.json();
        if (mounted && data.activeViolationsList) {
          setActiveViolations(data.activeViolationsList || []);
        }
      } catch (err) {
        // ignore violation polling errors
      }
    };

    loadCalibration();
    loadSlotStates();
    loadViolations();
    const poll = setInterval(() => {
      loadSlotStates();
      loadViolations();
    }, 2000);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, []);

  const handleImageLoad = () => {
    drawOverlay();
  };

  // Redraw overlay when slots, zones or states change
  useEffect(() => {
    drawOverlay();
  }, [calibratedSlots, illegalZones, slotStates, activeViolations]);

  const drawOverlay = () => {
    const img = videoRef.current;
    const canvas = overlayRef.current;
    if (!img || !canvas) return;

    // Use natural size to compute scale
    const naturalW = img.naturalWidth || img.width || 1280;
    const naturalH = img.naturalHeight || img.height || 720;
    const dispW = img.clientWidth;
    const dispH = img.clientHeight;

    // Set canvas size to displayed size
    canvas.width = dispW;
    canvas.height = dispH;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = dispW / naturalW;
    const scaleY = dispH / naturalH;

    // Draw parking slots
    if (calibratedSlots) {
      Object.entries(calibratedSlots).forEach(([slotId, coords]) => {
        const [x1, y1, x2, y2] = coords;
        const sx = Math.round(x1 * scaleX);
        const sy = Math.round(y1 * scaleY);
        const sw = Math.round((x2 - x1) * scaleX);
        const sh = Math.round((y2 - y1) * scaleY);

        const state = slotStates && slotStates[slotId];
        const occupied = state === 'OCCUPIED' || state === 'occupied' || state === 'OCCUPY';
        const color = occupied ? 'rgba(234,179,8,0.9)' : 'rgba(34,197,94,0.9)'; // Yellow for occupied, green for free

        // Draw slot rectangle
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.strokeRect(sx, sy, sw, sh);

        // Draw label background
        ctx.font = 'bold 12px Inter, Arial, sans-serif';
        const label = `${slotId} ${occupied ? '🅿️' : '✓'}`;
        const textMetrics = ctx.measureText(label);
        const pad = 4;
        const lw = textMetrics.width + pad * 2;
        const lh = 18;
        ctx.fillStyle = color;
        ctx.fillRect(sx, Math.max(0, sy - lh - 2), lw, lh);

        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, sx + pad, Math.max(0, sy - 5));
      });
    }

    // Draw illegal zones with distinct styling
    if (illegalZones) {
      Object.entries(illegalZones).forEach(([zoneId, coords]) => {
        const [x1, y1, x2, y2] = coords;
        const sx = Math.round(x1 * scaleX);
        const sy = Math.round(y1 * scaleY);
        const sw = Math.round((x2 - x1) * scaleX);
        const sh = Math.round((y2 - y1) * scaleY);

        // Check if there's an active violation in this zone
        const hasViolation = activeViolations.some(v => v.zone === zoneId || v.zone?.includes(zoneId));
        const color = hasViolation ? 'rgba(239,68,68,0.9)' : 'rgba(249,115,22,0.8)'; // Red if violation, orange if clear

        // Draw diagonal stripes pattern for illegal zones
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.setLineDash([5, 5]); // Dashed line for illegal zones
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]); // Reset line style

        // Draw fill with pattern
        ctx.fillStyle = hasViolation ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.1)';
        ctx.fillRect(sx, sy, sw, sh);

        // Draw warning icon and label
        ctx.font = 'bold 12px Inter, Arial, sans-serif';
        const label = `⚠️ ${zoneId}${hasViolation ? ' [VIOLATION]' : ''}`;
        const textMetrics = ctx.measureText(label);
        const pad = 4;
        const lw = textMetrics.width + pad * 2;
        const lh = 18;
        ctx.fillStyle = color;
        ctx.fillRect(sx, Math.max(0, sy - lh - 2), lw, lh);

        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, sx + pad, Math.max(0, sy - 5));
      });
    }

    // Draw legend in bottom-left corner
    drawLegend(ctx, dispW, dispH);
  };

  const drawLegend = (ctx, width, height) => {
    const legendX = 10;
    const legendY = height - 130;
    const boxWidth = 180;
    const boxHeight = 120;

    // Legend background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(legendX, legendY, boxWidth, boxHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, boxWidth, boxHeight);

    // Legend title
    ctx.font = 'bold 11px Inter, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ZONE LEGEND', legendX + 8, legendY + 16);

    // Legend items
    const items = [
      { color: 'rgba(34,197,94,0.9)', label: '🟢 Available Slot' },
      { color: 'rgba(234,179,8,0.9)', label: '🟡 Occupied Slot' },
      { color: 'rgba(249,115,22,0.8)', label: '🟠 Illegal Zone' },
      { color: 'rgba(239,68,68,0.9)', label: '🔴 Active Violation' }
    ];

    ctx.font = '9px Inter, Arial, sans-serif';
    items.forEach((item, idx) => {
      const y = legendY + 30 + idx * 18;
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 8, y - 6, 10, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(item.label, legendX + 22, y + 2);
    });
  };

  const handleUpdateUrl = async (e) => {
    e.preventDefault();
    if (!cameraUrl.trim()) return;

    setIsUpdating(true);
    try {
      await setCameraUrl(cameraUrl.trim());
      setCameraStatus({ connected: true, lastSeen: new Date().toISOString() });
      // Reload video feed
      if (videoRef.current) {
        videoRef.current.src = getVideoFeed() + '?t=' + Date.now();
      }
    } catch (error) {
      console.error('Failed to update camera URL:', error);
      // Show more helpful error message
      const errorMessage = error.message.includes('Backend server is not running')
        ? 'Backend server is not running. Please start the Python backend API server. See BACKEND_API_REQUIREMENTS.md for setup instructions.'
        : `Failed to update camera URL: ${error.message}. Please check the URL and ensure the backend is running.`;
      alert(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSnapshot = () => {
    if (videoRef.current && onSnapshot) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        onSnapshot(blob);
      });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const videoFeedUrl = getVideoFeed() + '?t=' + Date.now();

  return (
    <div className="card" ref={containerRef}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Live Camera Feed</h2>
        <div className="flex items-center space-x-2">
          <span className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            cameraStatus.connected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              cameraStatus.connected ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            <span>{cameraStatus.connected ? 'Connected' : 'Disconnected'}</span>
          </span>
        </div>
      </div>

      {/* Video Feed */}
      <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
        <img
          ref={videoRef}
          src={videoFeedUrl}
          alt="Live feed"
          className="w-full h-full object-contain"
          onLoad={handleImageLoad}
          onError={(e) => {
            console.error('Video feed error');
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450"%3E%3Crect fill="%23333" width="800" height="450"/%3E%3Ctext fill="%23fff" x="400" y="225" text-anchor="middle" font-size="20"%3ENo feed available%3C/text%3E%3C/svg%3E';
          }}
        />

        {/* Legend inside camera feed */}
        <Legend position="inside-feed" embedded={true} />

        {/* Canvas overlay for calibrated slots (pointer-events none so it doesn't block controls) */}
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        
        {/* Overlay Controls */}
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <button
            onClick={handleSnapshot}
            className="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-lg shadow-lg transition-colors"
            title="Take Snapshot"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={toggleFullscreen}
            className="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-lg shadow-lg transition-colors"
            title="Toggle Fullscreen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Camera URL Input */}
      <form onSubmit={handleUpdateUrl} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          IP Webcam URL
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={cameraUrl}
            onChange={(e) => setCameraUrlInput(e.target.value)}
            placeholder="http://192.168.1.100:8080/video"
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={isUpdating}
            className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
        </div>
      </form>

      {/* Last Seen */}
      {cameraStatus.lastSeen && (
        <p className="text-xs text-gray-500 mt-2">
          Last seen: {formatDateTime(cameraStatus.lastSeen)}
        </p>
      )}
    </div>
  );
};

export default LiveFeed;
