import React from 'react';

/**
 * SlotCard Component - Displays individual parking slot status
 * 
 * Standardized Status Colors:
 * - AVAILABLE: #22C55E (Green)
 * - OCCUPIED: #EF4444 (Red)
 * - ILLEGAL_ZONE: #F97316 (Orange)
 * - ILLEGAL_OCCUPIED: #991B1B (Dark Red)
 */
const SlotCard = ({ slotId, status, color, plate, onClick }) => {
  // Map status to label and details
  const statusConfig = {
    'AVAILABLE': {
      label: 'Available',
      icon: '✓',
      borderColor: '#22C55E',
      bgColor: '#f0fdf4'
    },
    'OCCUPIED': {
      label: 'Occupied',
      icon: '●',
      borderColor: '#EF4444',
      bgColor: '#fef2f2'
    },
    'ILLEGAL_ZONE': {
      label: 'No-Parking Zone',
      icon: '⊗',
      borderColor: '#F97316',
      bgColor: '#fff7ed'
    },
    'ILLEGAL_OCCUPIED': {
      label: 'Illegal Parking',
      icon: '⚠',
      borderColor: '#991B1B',
      bgColor: '#7f1d1d'
    }
  };

  const config = statusConfig[status] || statusConfig['AVAILABLE'];
  const isIllegalOccupied = status === 'ILLEGAL_OCCUPIED';

  return (
    <div
      onClick={onClick}
      className="card cursor-pointer transition-all duration-300 hover:shadow-lg"
      style={{
        borderLeft: `4px solid ${color || config.borderColor}`,
        backgroundColor: isIllegalOccupied ? config.bgColor : config.bgColor
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{slotId}</h3>
          <p 
            className="text-sm font-medium mt-1"
            style={{ color: color || config.borderColor }}
          >
            {config.label}
          </p>
          
          {plate && (
            <div className="mt-2">
              <p className={`text-xs font-mono font-medium px-2 py-1 rounded ${
                isIllegalOccupied ? 'bg-red-100 text-red-900' : 'bg-gray-100 text-gray-700'
              }`}>
                {plate}
              </p>
            </div>
          )}
        </div>

        {/* Status Icon */}
        <div
          className="ml-4 h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg"
          style={{
            backgroundColor: isIllegalOccupied ? '#991B1B' : color || config.borderColor,
            color: 'white'
          }}
        >
          {config.icon}
        </div>
      </div>
    </div>
  );
};

export default SlotCard;
