import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [activeViolations, setActiveViolations] = useState([]);
  const [slotStatus, setSlotStatus] = useState({});
  const prevSlotsRef = useRef({});
  const prevViolationsRef = useRef([]);
  const notificationSound = useRef(null);

  // Load notification sound
  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3');
    return () => {
      if (notificationSound.current) {
        notificationSound.current.pause();
        notificationSound.current = null;
      }
    };
  }, []);

  const addNotification = useCallback(({ type, message, data }) => {
    const id = Date.now() + Math.random();
    const newNotification = { id, type, message, data, timestamp: new Date() };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Play notification sound
    if (notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(e => console.error('Error playing sound:', e));
    }

    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 10000);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Function to check for slot status changes
  const checkSlotChanges = useCallback((currentSlots) => {
    // Convert to a map for easier comparison
    const currentSlotsMap = {};
    if (Array.isArray(currentSlots)) {
      currentSlots.forEach(slot => {
        const slotId = slot.id || slot.slotId;
        currentSlotsMap[slotId] = {
          ...slot,
          isOccupied: slot.isOccupied || slot.status === 'occupied'
        };
      });
    } else if (typeof currentSlots === 'object') {
      Object.entries(currentSlots).forEach(([key, value]) => {
        if (typeof value === 'object') {
          currentSlotsMap[key] = value;
        }
      });
    }

    // Check for changes
    Object.entries(currentSlotsMap).forEach(([slotId, slot]) => {
      const prevSlot = prevSlotsRef.current[slotId];
      
      if (prevSlot) {
        // Slot became available
        if (prevSlot.isOccupied && !slot.isOccupied) {
          addNotification({
            type: 'slot_available',
            message: `Parking Slot ${slotId} is now available`,
            data: { 
              slotId, 
              slotName: slot.name || slotId,
              status: 'AVAILABLE'
            }
          });
        }
        // Slot became occupied
        else if (!prevSlot.isOccupied && slot.isOccupied) {
          addNotification({
            type: 'slot_occupied',
            message: `Parking Slot ${slotId} is now occupied`,
            data: {
              slotId,
              slotName: slot.name || slotId,
              licensePlate: slot.plate || 'Unknown',
              status: 'OCCUPIED'
            }
          });
        }
      }
    });

    // Update slot status
    setSlotStatus(currentSlotsMap);
    prevSlotsRef.current = currentSlotsMap;
  }, [addNotification]);

  // Function to check for new violations
  const checkViolationChanges = useCallback((currentViolations) => {
    const violations = Array.isArray(currentViolations) ? currentViolations : [];
    
    violations.forEach(violation => {
      const isNewViolation = !prevViolationsRef.current.some(v => 
        (v.id === violation.id) || 
        (v.license_plate === violation.license_plate && v.timestamp === violation.timestamp)
      );
      
      if (isNewViolation) {
        addNotification({
          type: 'illegal_parking',
          message: `⚠️ Illegal Parking Violation: ${violation.license_plate || 'Unknown'} in ${violation.zone || 'restricted zone'}`,
          data: { 
            violationId: violation.id,
            zone: violation.zone,
            licensePlate: violation.license_plate,
            timestamp: violation.timestamp,
            severity: 'HIGH'
          }
        });
      }
    });

    // Update active violations
    setActiveViolations(violations);
    prevViolationsRef.current = violations;
  }, [addNotification]);

  // Update slot status with percentage
  const getSlotStatistics = useCallback(() => {
    const slots = Object.values(slotStatus);
    const total = slots.length;
    const occupied = slots.filter(s => s.isOccupied).length;
    const available = total - occupied;
    const occupancyPercentage = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;
    
    return {
      total,
      occupied,
      available,
      occupancyPercentage,
      slots: slotStatus
    };
  }, [slotStatus]);

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications,
        activeViolations,
        slotStatus,
        addNotification, 
        removeNotification,
        checkSlotChanges,
        checkViolationChanges,
        getSlotStatistics
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
