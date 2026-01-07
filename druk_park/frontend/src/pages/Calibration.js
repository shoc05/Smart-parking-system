import React, { useState, useRef, useEffect } from 'react';
import { calibrate, getCalibration, getVideoFeed } from '../services/api';

const Calibration = () => {
  const [mode, setMode] = useState('slots'); // 'slots' or 'illegal'
  const [rectangles, setRectangles] = useState({
    slots: [],
    illegal: [],
  });
  const [currentRect, setCurrentRect] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    loadCalibration();
  }, []);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [rectangles, mode, currentRect, imageLoaded]);

  const loadCalibration = async () => {
    try {
      const data = await getCalibration();
      if (data.parking_slots && data.illegal_zones) {
        const slots = Object.entries(data.parking_slots).map(([id, coords]) => {
          if (Array.isArray(coords) && coords.length === 4) {
            return {
              id,
              x: coords[0],
              y: coords[1],
              width: coords[2] - coords[0],
              height: coords[3] - coords[1],
            };
          }
          return null;
        }).filter(Boolean);

        const illegal = Object.entries(data.illegal_zones).map(([id, coords]) => {
          if (Array.isArray(coords) && coords.length === 4) {
            return {
              id,
              x: coords[0],
              y: coords[1],
              width: coords[2] - coords[0],
              height: coords[3] - coords[1],
            };
          }
          return null;
        }).filter(Boolean);

        setRectangles({ slots, illegal });
      }
    } catch (error) {
      console.error('Failed to load calibration:', error);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const image = imageRef.current;

    if (!canvas || !container || !image || !image.complete) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Only draw if image has loaded dimensions
    if (image.naturalWidth === 0 || image.naturalHeight === 0) return;

    // Calculate scale factors
    const scaleX = canvas.width / image.naturalWidth;
    const scaleY = canvas.height / image.naturalHeight;

    // Draw rectangles
    const currentList = mode === 'slots' ? rectangles.slots : rectangles.illegal;
    const color = mode === 'slots' ? '#10b981' : '#ef4444';

    currentList.forEach((rect) => {
      const x = rect.x * scaleX;
      const y = rect.y * scaleY;
      const width = rect.width * scaleX;
      const height = rect.height * scaleY;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = color + '40';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = color;
      ctx.font = '14px Arial';
      ctx.fillText(rect.id, x + 5, y + 20);
    });

    // Draw current rectangle being drawn
    if (currentRect) {
      const x1 = Math.min(currentRect.startX, currentRect.endX);
      const y1 = Math.min(currentRect.startY, currentRect.endY);
      const width = Math.abs(currentRect.endX - currentRect.startX);
      const height = Math.abs(currentRect.endY - currentRect.startY);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x1, y1, width, height);
      ctx.setLineDash([]);
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Return canvas coordinates directly
    return {
      x: mouseX,
      y: mouseY,
    };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const pos = getMousePos(e);
    setIsDrawing(true);
    setCurrentRect({
      startX: pos.x,
      startY: pos.y,
      endX: pos.x,
      endY: pos.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentRect) return;
    e.preventDefault();
    const pos = getMousePos(e);
    setCurrentRect({
      ...currentRect,
      endX: pos.x,
      endY: pos.y,
    });
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !currentRect) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image || !image.complete) {
      setIsDrawing(false);
      setCurrentRect(null);
      return;
    }

    const pos = getMousePos(e);
    const x1Canvas = Math.min(currentRect.startX, pos.x);
    const y1Canvas = Math.min(currentRect.startY, pos.y);
    const x2Canvas = Math.max(currentRect.startX, pos.x);
    const y2Canvas = Math.max(currentRect.startY, pos.y);

    // Convert from canvas coordinates to image coordinates
    const scaleX = image.naturalWidth / canvas.width;
    const scaleY = image.naturalHeight / canvas.height;

    const x1 = x1Canvas * scaleX;
    const y1 = y1Canvas * scaleY;
    const x2 = x2Canvas * scaleX;
    const y2 = y2Canvas * scaleY;

    if (x2Canvas - x1Canvas > 20 && y2Canvas - y1Canvas > 20) {
      const id = prompt(`Enter ${mode === 'slots' ? 'slot' : 'zone'} ID:`);
      if (id && id.trim()) {
        const newRect = {
          id: id.trim(),
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1,
        };
        setRectangles((prev) => ({
          ...prev,
          [mode]: [...prev[mode], newRect],
        }));
      }
    }

    setIsDrawing(false);
    setCurrentRect(null);
  };

  const handleDelete = (index) => {
    if (window.confirm('Delete this ' + (mode === 'slots' ? 'slot' : 'zone') + '?')) {
      setRectangles((prev) => ({
        ...prev,
        [mode]: prev[mode].filter((_, i) => i !== index),
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const calibrationData = {
        parking_slots: {},
        illegal_zones: {},
      };

      rectangles.slots.forEach((rect) => {
        calibrationData.parking_slots[rect.id] = [
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.x + rect.width),
          Math.round(rect.y + rect.height),
        ];
      });

      rectangles.illegal.forEach((rect) => {
        calibrationData.illegal_zones[rect.id] = [
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.x + rect.width),
          Math.round(rect.y + rect.height),
        ];
      });

      await calibrate(calibrationData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save calibration:', error);
      alert('Failed to save calibration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const videoFeedUrl = getVideoFeed() + '?t=' + Date.now();

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Calibration</h1>
          <p className="text-gray-600">Define parking slots and illegal zones by drawing rectangles on the live feed</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Canvas Area */}
          <div className="lg:col-span-3">
            <div className="card">
              {/* Mode Toggle */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setMode('slots')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'slots'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Parking Slots
                  </button>
                  <button
                    onClick={() => setMode('illegal')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'illegal'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Illegal Zones
                  </button>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Calibration'}
                </button>
              </div>

              {/* Success Message */}
              {saveSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                  ✅ Calibration saved successfully!
                </div>
              )}

              {/* Instructions */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Click and drag on the video feed to draw rectangles.
                  Current mode: <strong>{mode === 'slots' ? 'Parking Slots (Green)' : 'Illegal Zones (Red)'}</strong>
                </p>
              </div>

              {/* Canvas */}
              <div
                ref={containerRef}
                className="relative bg-black rounded-lg overflow-hidden"
                style={{ aspectRatio: '16/9' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  setIsDrawing(false);
                  setCurrentRect(null);
                }}
              >
                <img
                  ref={imageRef}
                  src={videoFeedUrl}
                  alt="Calibration feed"
                  className="absolute inset-0 w-full h-full object-contain"
                  onLoad={() => {
                    setImageLoaded(true);
                    drawCanvas();
                  }}
                  onError={(e) => {
                    console.error('Video feed error');
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450"%3E%3Crect fill="%23333" width="800" height="450"/%3E%3Ctext fill="%23fff" x="400" y="225" text-anchor="middle" font-size="20"%3ENo feed available%3C/text%3E%3C/svg%3E';
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair pointer-events-auto"
                />
              </div>
            </div>
          </div>

          {/* Sidebar: List of Rectangles */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">
                {mode === 'slots' ? 'Parking Slots' : 'Illegal Zones'}
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(mode === 'slots' ? rectangles.slots : rectangles.illegal).map((rect, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{rect.id}</p>
                      <p className="text-xs text-gray-600">
                        ({Math.round(rect.x)}, {Math.round(rect.y)}) - ({Math.round(rect.x + rect.width)}, {Math.round(rect.y + rect.height)})
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {((mode === 'slots' ? rectangles.slots : rectangles.illegal).length === 0) && (
                  <p className="text-center text-gray-500 py-4 text-sm">No {mode === 'slots' ? 'slots' : 'zones'} defined</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calibration;