import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useTimeFormat } from '../context/TimeFormatContext';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { notifications, activeViolations, slotStatus, getSlotStatistics, removeNotification } = useNotifications();
  const { formatDateTime } = useTimeFormat();
  const [activeTab, setActiveTab] = useState('violations');

  const stats = getSlotStatistics();

  if (!isOpen) return null;

  const violationSummary = {
    totalActive: activeViolations.length,
    byZone: {}
  };

  activeViolations.forEach(v => {
    const zone = v.zone || 'Unknown Zone';
    violationSummary.byZone[zone] = (violationSummary.byZone[zone] || 0) + 1;
  });

  const slotSummary = {
    totalSlots: stats.total,
    occupiedSlots: stats.occupied,
    availableSlots: stats.available,
    occupancyPercentage: stats.occupancyPercentage
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Notification Center Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Notification Center</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4">
          <button
            onClick={() => setActiveTab('violations')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'violations'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              Active Violations
              {activeViolations.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {activeViolations.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('occupancy')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'occupancy'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Occupancy Status
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'recent'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              Recent Notifications
              {notifications.length > 0 && (
                <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5">
                  {notifications.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'violations' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                  <p className="text-sm text-red-600 font-medium">Active Violations</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{violationSummary.totalActive}</p>
                  <p className="text-xs text-red-500 mt-2">Critical: High priority</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                  <p className="text-sm text-orange-600 font-medium">Zones Affected</p>
                  <p className="text-3xl font-bold text-orange-700 mt-1">{Object.keys(violationSummary.byZone).length}</p>
                  <p className="text-xs text-orange-500 mt-2">Monitored zones</p>
                </div>
              </div>

              {/* Violations by Zone */}
              {Object.keys(violationSummary.byZone).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Violations by Zone</h4>
                  <div className="space-y-2">
                    {Object.entries(violationSummary.byZone).map(([zone, count]) => (
                      <div key={zone} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                        <span className="text-sm font-medium text-gray-700">{zone}</span>
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Violations List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Recent Violations</h4>
                {activeViolations.length > 0 ? (
                  <div className="space-y-3">
                    {activeViolations.slice(0, 10).map((violation, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-red-900">
                              {violation.license_plate || 'Unknown Plate'}
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                              Zone: <span className="font-semibold">{violation.zone || 'Unknown'}</span>
                            </p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">
                            Active
                          </span>
                        </div>
                        {violation.timestamp && (
                          <p className="text-xs text-red-600">
                            Detected: {formatDateTime(violation.timestamp)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-green-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 font-medium">No active violations</p>
                    <p className="text-sm text-gray-400">All zones are clear</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'occupancy' && (
            <div className="space-y-4">
              {/* Occupancy Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-sm text-blue-600 font-medium">Occupancy Rate</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{slotSummary.occupancyPercentage}%</p>
                  <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${slotSummary.occupancyPercentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <p className="text-sm text-green-600 font-medium">Available Slots</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">{slotSummary.availableSlots}</p>
                  <p className="text-xs text-green-500 mt-2">Ready to use</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                  <p className="text-sm text-red-600 font-medium">Occupied Slots</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{slotSummary.occupiedSlots}</p>
                  <p className="text-xs text-red-500 mt-2">In use</p>
                </div>
              </div>

              {/* Total Slots */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Total Parking Slots</p>
                <p className="text-4xl font-bold text-gray-900">{slotSummary.totalSlots}</p>
              </div>

              {/* Slot Status Details */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Slot Status Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {Object.entries(stats.slots).map(([slotId, slot]) => (
                    <div
                      key={slotId}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        slot.isOccupied
                          ? 'bg-red-50 border-red-200'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{slotId}</p>
                          {slot.plate && (
                            <p className="text-sm text-gray-600">{slot.plate}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          slot.isOccupied
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {slot.isOccupied ? 'Occupied' : 'Available'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recent' && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Recent Notifications</h4>
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        notification.type === 'illegal_parking'
                          ? 'bg-red-50 border-red-500'
                          : notification.type === 'slot_available'
                          ? 'bg-green-50 border-green-500'
                          : notification.type === 'slot_occupied'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className={`font-medium ${
                            notification.type === 'illegal_parking'
                              ? 'text-red-900'
                              : notification.type === 'slot_available'
                              ? 'text-green-900'
                              : notification.type === 'slot_occupied'
                              ? 'text-yellow-900'
                              : 'text-blue-900'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className={`text-xs ${
                        notification.type === 'illegal_parking'
                          ? 'text-red-600'
                          : notification.type === 'slot_available'
                          ? 'text-green-600'
                          : notification.type === 'slot_occupied'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                      }`}>
                        {formatDateTime(notification.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500 font-medium">No recent notifications</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
