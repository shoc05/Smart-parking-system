import React from 'react';
import { useTimeFormat } from '../context/TimeFormatContext';

const ViolationsTable = ({ violations = [] }) => {
  const { formatDateTime } = useTimeFormat();

  const maskPlate = (plate) => {
    if (!plate) return 'N/A';
    const plateUpper = plate.toUpperCase();
    if (plateUpper.includes('GOVT') || plateUpper.includes('ROYAL')) {
      return '***ANONYMIZED***';
    }
    return plate;
  };

  if (violations.length === 0) {
    return (
      <div className="card">
        <p className="text-center text-gray-500 py-8">No active violations</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Active Violations</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-red-50">
            <tr>
              <th className="table-header px-6 py-3 text-left">Zone</th>
              <th className="table-header px-6 py-3 text-left">Plate</th>
              <th className="table-header px-6 py-3 text-left">Detected At</th>
              <th className="table-header px-6 py-3 text-left">Duration</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {violations.map((violation, idx) => (
              <tr key={idx} className="hover:bg-red-50">
                <td className="table-cell font-medium">{violation.zone_id || 'N/A'}</td>
                <td className="table-cell">
                  <span className="font-mono">{maskPlate(violation.plate)}</span>
                </td>
                <td className="table-cell">{formatDateTime(violation.timestamp)}</td>
                <td className="table-cell">{violation.duration || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViolationsTable;
