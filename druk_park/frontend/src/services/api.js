const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Helper to handle network errors
const handleNetworkError = (error) => {
  if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
    throw new Error('Backend server is not running. Please start the Python backend API server on port 5000.');
  }
  throw error;
};

// Video Feed API
export const getVideoFeed = () => {
  return `${API_BASE_URL}/video-feed`;
};

export const setCameraUrl = async (url) => {
  try {
    const response = await fetch(`${API_BASE_URL}/set-camera-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    return handleResponse(response);
  } catch (error) {
    handleNetworkError(error);
  }
};

export const getCameraStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/camera-status`);
    return handleResponse(response);
  } catch (error) {
    handleNetworkError(error);
  }
};

// Calibration API
export const calibrate = async (calibrationData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/calibrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calibrationData),
    });
    return handleResponse(response);
  } catch (error) {
    handleNetworkError(error);
  }
};

export const getSlots = async () => {
  const response = await fetch(`${API_BASE_URL}/slots`);
  return handleResponse(response);
};

export const getCalibration = async () => {
  const response = await fetch(`${API_BASE_URL}/calibration`);
  return handleResponse(response);
};

// IMEM (Parking Events) API
export const getIMEM = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await fetch(`${API_BASE_URL}/imem?${queryParams}`);
  return handleResponse(response);
};

export const exportIMEMCSV = async () => {
  const response = await fetch(`${API_BASE_URL}/export/csv`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `parking_log_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Analytics API
export const getAnalytics = async (timeRange = '24h') => {
  const response = await fetch(`${API_BASE_URL}/analytics?range=${timeRange}`);
  return handleResponse(response);
};

// Dashboard Stats API
export const getDashboardStats = async () => {
  const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
  return handleResponse(response);
};

// Snapshot API
export const getSnapshot = async (eventId) => {
  const response = await fetch(`${API_BASE_URL}/snapshot/${eventId}`);
  return response.blob();
};

// Update IMEM event (mark as resolved, edit, etc.)
export const updateIMEMEvent = async (eventId, updates) => {
  const response = await fetch(`${API_BASE_URL}/imem/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  return handleResponse(response);
};

// Delete IMEM event
export const deleteIMEMEvent = async (eventId) => {
  const response = await fetch(`${API_BASE_URL}/imem/${eventId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};
