import React, { createContext, useContext, useState } from 'react';

const TimeFormatContext = createContext();

export const useTimeFormat = () => {
  const context = useContext(TimeFormatContext);
  if (!context) {
    throw new Error('useTimeFormat must be used within TimeFormatProvider');
  }
  return context;
};

export const TimeFormatProvider = ({ children }) => {
  const [format, setFormat] = useState('24H'); // '12H' or '24H'
  const [timezone] = useState('Asia/Thimphu'); // Bhutan Time (BTT)

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    
    try {
      const date = new Date(isoString);
      
      // Convert to Bhutan Time
      const options = format === '12H' 
        ? { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true,
            timeZone: timezone
          }
        : { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false,
            timeZone: timezone
          };
      
      return date.toLocaleTimeString('en-US', options);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    
    try {
      const date = new Date(isoString);
      
      const timeOptions = format === '12H' 
        ? { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true,
            timeZone: timezone
          }
        : { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false,
            timeZone: timezone
          };
      
      const dateOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: timezone
      };
      
      const dateStr = date.toLocaleDateString('en-US', dateOptions);
      const timeStr = date.toLocaleTimeString('en-US', timeOptions);
      
      return `${dateStr} ${timeStr}`;
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const toggleFormat = () => {
    setFormat(format === '12H' ? '24H' : '12H');
  };

  return (
    <TimeFormatContext.Provider value={{ format, toggleFormat, formatTime, formatDateTime, timezone }}>
      {children}
    </TimeFormatContext.Provider>
  );
};
