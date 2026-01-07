import React from 'react';

/**
 * Legend Component - Shows standardized slot status colors and meanings
 * Can be positioned inside camera feed or as floating panel
 * 
 * Status Colors:
 * - AVAILABLE (Green #22C55E)
 * - OCCUPIED (Red #EF4444)
 * - ILLEGAL_ZONE (Orange #F97316)
 * - ILLEGAL_OCCUPIED (Dark Red #991B1B)
 */
const Legend = ({ position = 'inside-feed', embedded = false }) => {
  const legendItems = [
    {
      label: 'Available',
      color: '#22C55E',
      status: 'AVAILABLE'
    },
    {
      label: 'Occupied',
      color: '#EF4444',
      status: 'OCCUPIED'
    },
    {
      label: 'No-Parking',
      color: '#F97316',
      status: 'ILLEGAL_ZONE'
    },
    {
      label: 'Illegal Parking',
      color: '#991B1B',
      status: 'ILLEGAL_OCCUPIED'
    }
  ];

  // For embedded inside camera feed
  if (embedded || position === 'inside-feed') {
    return (
      <div className="absolute bottom-4 left-4 z-40 bg-black bg-opacity-75 rounded-lg p-3 backdrop-blur-sm">
        <h3 className="text-xs font-bold text-white mb-2">Status Legend</h3>
        <div className="space-y-1.5">
          {legendItems.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div
                className="flex-shrink-0 w-4 h-4 rounded border border-white border-opacity-50"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium text-white">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Floating panel (original style)
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Slot Status Legend</h3>
      
      <div className="space-y-2">
        {legendItems.map((item) => (
          <div key={item.status} className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-6 h-6 rounded border border-gray-300"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs font-medium text-gray-700">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Legend;
