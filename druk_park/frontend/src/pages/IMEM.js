import React from 'react';
import IMEMTable from '../components/IMEMTable';

const IMEM = () => {
  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IMEM Table</h1>
          <p className="text-gray-600">Integrated Monitoring and Event Management - View and manage all parking events</p>
        </div>
        <IMEMTable />
      </div>
    </div>
  );
};

export default IMEM;
