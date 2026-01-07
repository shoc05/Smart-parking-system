import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTimeFormat } from '../context/TimeFormatContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationBanner from './NotificationBanner';
import NotificationCenter from './NotificationCenter';
import { getDashboardStats, getSlots } from '../services/api';

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { format, toggleFormat } = useTimeFormat();
  const { notifications, removeNotification, checkSlotChanges, checkViolationChanges, activeViolations, slotStatus } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (isPolling) return;
    
    const pollInterval = setInterval(async () => {
      try {
        setIsPolling(true);
        // Fetch current data
        const [stats, slotsData] = await Promise.all([
          getDashboardStats(),
          getSlots()
        ]);
        
        // Check for changes and trigger notifications
        if (slotsData?.slots) {
          checkSlotChanges(slotsData.slots);
        }
        
        if (stats?.activeViolationsList) {
          checkViolationChanges(stats.activeViolationsList);
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      } finally {
        setIsPolling(false);
      }
    }, 30000); // Poll every 30 seconds

    // Initial fetch
    const initialFetch = async () => {
      try {
        const [stats, slotsData] = await Promise.all([
          getDashboardStats(),
          getSlots()
        ]);
        
        // Initialize with current data without triggering notifications
        if (slotsData?.slots) {
          checkSlotChanges(slotsData.slots);
        }
        
        if (stats?.activeViolationsList) {
          checkViolationChanges(stats.activeViolationsList);
        }
      } catch (error) {
        console.error('Error in initial fetch:', error);
      }
    };
    
    initialFetch();
    
    return () => clearInterval(pollInterval);
  }, [checkSlotChanges, checkViolationChanges, isPolling]);

  const unreadCount = notifications.length;

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/imem', label: 'IMEM Table' },
    { path: '/calibration', label: 'Calibration' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Menu */}
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-bhutan-blue">Druk Park</h1>
            </div>
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(item.path)
                      ? 'bg-bhutan-blue text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side: Notifications, Time Format, Admin */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
                aria-label="Notifications"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-gray-900">Quick Notifications</h3>
                      <button 
                        onClick={() => setShowNotificationCenter(true)}
                        className="text-sm text-bhutan-blue hover:text-bhutan-dark-blue font-medium"
                      >
                        View All →
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map(notification => (
                        <div 
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 last:border-0 ${
                            notification.type === 'illegal_parking' ? 'bg-red-50' : 
                            notification.type === 'slot_available' ? 'bg-green-50' :
                            notification.type === 'slot_occupied' ? 'bg-yellow-50' :
                            'bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                              notification.type === 'illegal_parking' ? 'bg-red-100 text-red-600' :
                              notification.type === 'slot_available' ? 'bg-green-100 text-green-600' :
                              notification.type === 'slot_occupied' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {notification.type === 'illegal_parking' ? (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.message}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {new Date(notification.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <button 
                              onClick={() => removeNotification(notification.id)}
                              className="ml-2 text-gray-400 hover:text-gray-500"
                            >
                              <span className="sr-only">Dismiss</span>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Banners */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notifications.slice(0, 3).map(notification => (
          <NotificationBanner
            key={notification.id}
            notification={notification}
            onDismiss={removeNotification}
          />
        ))}
      </div>

      {/* Notification Center */}
      <NotificationCenter isOpen={showNotificationCenter} onClose={() => setShowNotificationCenter(false)} />
            {/* Time Format Toggle */}
            <button
              onClick={toggleFormat}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
              title={`Switch to ${format === '12H' ? '24H' : '12H'} format`}
            >
              {format}
            </button>

            {/* Admin Avatar */}
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-bhutan-blue flex items-center justify-center text-white font-semibold">
                  SA
                </div>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">System Admin</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
