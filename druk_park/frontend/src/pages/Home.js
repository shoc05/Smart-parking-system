import React, { useState, useEffect } from 'react';
import LiveFeed from '../components/LiveFeed';
import KPI from '../components/KPI';
import SlotCard from '../components/SlotCard';
import ViolationsTable from '../components/ViolationsTable';
import NotificationBanner from '../components/NotificationBanner';
import { getDashboardStats, getSlots } from '../services/api';
import { useTimeFormat } from '../context/TimeFormatContext';
import { useNotifications } from '../context/NotificationContext';

// Helper function to get color based on status
const getColorForStatus = (status) => {
  const statusUpper = status ? status.toUpperCase() : 'AVAILABLE';
  switch(statusUpper) {
    case 'OCCUPIED':
      return '#EF4444'; // Red
    case 'ILLEGAL_ZONE':
      return '#F97316'; // Orange
    case 'ILLEGAL_OCCUPIED':
      return '#991B1B'; // Dark Red
    case 'AVAILABLE':
    default:
      return '#22C55E'; // Green
  }
};

const Home = () => {
  const [dashboardStats, setDashboardStats] = useState({
    occupancy: 0,
    activeViolations: 0,
    totalVehicles: 0,
    totalRevenue: 0,
  });
  const [slots, setSlots] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [previousStats, setPreviousStats] = useState(null);
  const { formatTime } = useTimeFormat();
  const { checkSlotChanges, checkViolationChanges, activeViolations, getSlotStatistics } = useNotifications();

  // Using HTTP polling for updates (Firebase configuration optional)

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000); // HTTP polling every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load dashboard stats
      const stats = await getDashboardStats();

      // Check for changes and create notifications
      if (previousStats) {
        checkForNotifications(stats, previousStats);
      }

      setDashboardStats(stats);
      setPreviousStats(stats);

      // Load slots
      const slotsData = await getSlots();
      // Ensure slots have the correct status and color mapping
      const slotsArray = (slotsData.slots || []).map(slot => ({
        ...slot,
        // Ensure status is one of: 'AVAILABLE', 'OCCUPIED', 'ILLEGAL_ZONE', 'ILLEGAL_OCCUPIED'
        status: slot.status ? slot.status.toUpperCase() : 'AVAILABLE',
        // Add color based on status if not provided
        color: getColorForStatus(slot.status)
      }));
      setSlots(slotsArray);
      
      // Update notification context with slot changes
      checkSlotChanges(slotsArray);

      // Load violations
      const violationsList = stats.activeViolationsList || [];
      setViolations(violationsList);
      
      // Update notification context with violation changes
      checkViolationChanges(violationsList);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForNotifications = (currentStats, prevStats) => {
    const currentOccupancy = currentStats.occupancy || 0;
    const prevOccupancy = prevStats.occupancy || 0;
    const currentViolations = currentStats.activeViolations || 0;
    const prevViolations = prevStats.activeViolations || 0;

    // Check for high occupancy (threshold: 85%)
    if (currentOccupancy > 85 && prevOccupancy <= 85) {
      addNotification({
        type: 'warning',
        message: `High Occupancy Alert: ${currentOccupancy.toFixed(1)}% of parking slots are now occupied`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for occupancy back to normal
    if (currentOccupancy <= 85 && prevOccupancy > 85) {
      addNotification({
        type: 'success',
        message: `Occupancy normalized: ${currentOccupancy.toFixed(1)}% - parking availability improved`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for new violations
    if (currentViolations > prevViolations) {
      const newViolations = currentViolations - prevViolations;
      addNotification({
        type: 'illegal_parking',
        message: `${newViolations} new violation${newViolations > 1 ? 's' : ''} detected! Total active: ${currentViolations}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for violations resolved
    if (currentViolations < prevViolations && currentViolations >= 0) {
      const resolvedViolations = prevViolations - currentViolations;
      addNotification({
        type: 'success',
        message: `${resolvedViolations} violation${resolvedViolations > 1 ? 's' : ''} resolved. Active violations: ${currentViolations}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for critical occupancy (threshold: 95%)
    if (currentOccupancy > 95 && prevOccupancy <= 95) {
      addNotification({
        type: 'illegal_parking',
        message: `CRITICAL: Parking lot nearly full at ${currentOccupancy.toFixed(1)}%!`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const addNotification = (notification) => {
    const newNotification = {
      ...notification,
      id: Date.now() + Math.random(), // Unique ID
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const handleSnapshot = (blob) => {
    const url = URL.createObjectURL(blob);
    setSnapshot(url);
  };

  const occupancyPercentage = dashboardStats.occupancy || 0;
  const isOccupancyHigh = occupancyPercentage > 85;

  return (
    <div className="bg-gray-50">
      {/* Notification Banners */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <NotificationBanner
            key={notification.id}
            notification={notification}
            onDismiss={dismissNotification}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KPI
            title="Occupancy"
            value={`${occupancyPercentage.toFixed(1)}%`}
            subtitle={`${dashboardStats.occupiedSlots || 0} of ${dashboardStats.totalSlots || 0} slots`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            color={isOccupancyHigh ? 'red' : 'blue'}
          />
          <KPI
            title="Active Violations"
            value={dashboardStats.activeViolations || 0}
            subtitle="Illegal parking detected"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            color={dashboardStats.activeViolations > 0 ? "red" : "green"}
          />
          <KPI
            title="Total Vehicles"
            value={dashboardStats.totalVehicles || 0}
            subtitle="Today's count"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            }
            color="green"
          />
          <KPI
            title="Total Revenue"
            value={`Nu. ${(dashboardStats.totalRevenue || 0).toFixed(2)}`}
            subtitle="Today's earnings"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="purple"
          />
        </div>

        {/* Occupancy Alert */}
        {isOccupancyHigh && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-medium text-red-800">
                High Occupancy Alert: {occupancyPercentage.toFixed(1)}% of slots are occupied
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Live Feed (70%) */}
          <div className="lg:col-span-2">
            <LiveFeed onSnapshot={handleSnapshot} />
          </div>

          {/* Right: IMEM Preview & Stats (30%) */}
          <div className="space-y-6">
            {/* Occupancy Percentage Overlay */}
            <div className="card bg-gradient-to-br from-bhutan-blue to-bhutan-dark-blue text-white">
              <h3 className="text-lg font-semibold mb-4">Occupancy</h3>
              <div className="text-5xl font-bold mb-2">{occupancyPercentage.toFixed(1)}%</div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${isOccupancyHigh ? 'bg-red-400' : 'bg-green-400'
                    }`}
                  style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm opacity-90">
                {dashboardStats.occupiedSlots || 0} of {dashboardStats.totalSlots || 0} slots occupied
              </p>
            </div>

          {/* Active Violations */}
          <ViolationsTable violations={violations} />

          {/* Real-time Slot Status */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Slot Occupancy Status</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                dashboardStats.occupancy > 85 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {dashboardStats.occupancy.toFixed(1)}% Full
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Occupied</span>
                <span className="text-lg font-bold text-red-600">{dashboardStats.occupiedSlots || 0} slots</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Available</span>
                <span className="text-lg font-bold text-green-600">{dashboardStats.availableSlots || 0} slots</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total</span>
                <span className="text-lg font-bold text-gray-900">{dashboardStats.totalSlots || 0} slots</span>
              </div>
              <div className="pt-2 border-t border-gray-200 mt-3">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      dashboardStats.occupancy > 85 ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(dashboardStats.occupancy || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Recent IMEM Events</h3>
                <a
                  href="/imem"
                  className="text-sm text-bhutan-blue hover:text-bhutan-dark-blue font-medium"
                >
                  View All →
                </a>
              </div>
              <div className="space-y-2">
                {slots.slice(0, 5).map((slot, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{slot.slotId || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{slot.plate || 'Empty'}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${slot.isOccupied
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}>
                      {slot.isOccupied ? 'Occupied' : 'Available'}
                    </span>
                  </div>
                ))}
                {slots.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">No recent events</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Slot Cards Grid */}
        {slots.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-6">Parking Slots</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {slots.map((slot) => {
                // Ensure status is always a valid value
                const status = slot.status || 'AVAILABLE';
                return (
                  <SlotCard
                    key={slot.slotId}
                    slotId={slot.slotId}
                    status={status}
                    color={slot.color || getColorForStatus(status)}
                    plate={slot.plate}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Active Violations Section */}
        {activeViolations.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-6 text-red-700">⚠️ Active Violations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeViolations.map((violation, idx) => (
                <div key={idx} className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-red-900">
                        {violation.license_plate || 'Unknown Plate'}
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        Zone: <span className="font-semibold">{violation.zone || 'Unknown'}</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                      Active
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-red-800">
                    {violation.vehicle_type && (
                      <p>Vehicle Type: <span className="font-medium">{violation.vehicle_type}</span></p>
                    )}
                    {violation.region_name && (
                      <p>Region: <span className="font-medium">{violation.region_name}</span></p>
                    )}
                    {violation.timestamp && (
                      <p>Detected: <span className="font-medium">{formatTime(violation.timestamp)}</span></p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Snapshot Modal */}
      {snapshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSnapshot(null)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Snapshot</h3>
              <button
                onClick={() => setSnapshot(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <img src={snapshot} alt="Snapshot" className="max-w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;