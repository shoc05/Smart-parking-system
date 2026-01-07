import React, { useState, useEffect, useMemo } from 'react';
import { getIMEM, exportIMEMCSV, updateIMEMEvent, getSnapshot, deleteIMEMEvent } from '../services/api';
import { useTimeFormat } from '../context/TimeFormatContext';

const IMEMTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filter, setFilter] = useState({ event: '', slot: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const { formatDateTime } = useTimeFormat();

  useEffect(() => {
    loadIMEMData();
    const interval = setInterval(loadIMEMData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadIMEMData = async () => {
    try {
      setLoading(true);
      const response = await getIMEM();
      setData(response.data || response);
    } catch (error) {
      console.error('Failed to load IMEM data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Mask plate numbers for GOVT and ROYAL vehicles
  const maskPlate = (plate) => {
    if (!plate) return 'N/A';
    const plateUpper = plate.toUpperCase();
    if (plateUpper.includes('GOVT') || plateUpper.includes('ROYAL')) {
      return '***ANONYMIZED***';
    }
    return plate;
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter((row) => {
      const matchesSearch = Object.values(row).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesEvent = !filter.event || row.Event === filter.event;
      const matchesSlot = !filter.slot || row.SlotID === filter.slot;
      return matchesSearch && matchesEvent && matchesSlot;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal > bVal ? 1 : -1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, filter, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const handleExport = async () => {
    try {
      await exportIMEMCSV();
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleViewSnapshot = async (eventId) => {
    try {
      const blob = await getSnapshot(eventId);
      const url = URL.createObjectURL(blob);
      setSelectedSnapshot(url);
    } catch (error) {
      console.error('Failed to load snapshot:', error);
      alert('Snapshot not available');
    }
  };

  const handleMarkResolved = async (eventId) => {
    try {
      await updateIMEMEvent(eventId, { resolved: true });
      loadIMEMData();
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleEdit = (row) => {
    setEditingRow(row.IMEM_ID || row.id || null);
    setEditFormData({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    try {
      await updateIMEMEvent(editingRow, editFormData);
      setEditingRow(null);
      setEditFormData({});
      loadIMEMData();
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  const handleDelete = async (eventId, index) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        // Call API to delete
        await deleteIMEMEvent(eventId);
        
        // Remove from local state
        const newData = data.filter((item, i) => {
          const itemId = item.IMEM_ID || i.toString();
          const deleteId = eventId || index.toString();
          return itemId !== deleteId;
        });
        setData(newData);
      } catch (error) {
        console.error('Failed to delete event:', error);
        loadIMEMData(); // Reload on error
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const columns = [
    { key: 'IMEM_ID', label: 'IMEM ID' },
    { key: 'SlotID', label: 'Slot' },
    { key: 'Plate', label: 'Plate' },
    { key: 'CameraID', label: 'Camera ID' },
    { key: 'Timestamp', label: 'Timestamp' },
    { key: 'VehicleType', label: 'Car Type' },
    { key: 'VehicleClass', label: 'Vehicle Class' },
    { key: 'Event', label: 'Remark' },
    { key: 'Payment', label: 'Payment' },
  ];

  if (loading && data.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bhutan-blue"></div>
          <p className="mt-4 text-gray-600">Loading IMEM data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search IMEM records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <select
            value={filter.event}
            onChange={(e) => setFilter({ ...filter, event: e.target.value })}
            className="input-field"
          >
            <option value="">All Events</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
          <button onClick={handleExport} className="btn-secondary">
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="table-header px-6 py-3 text-left cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.label}</span>
                      {sortConfig.key === col.key && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="table-header px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row, idx) => {
                const isEditing = editingRow === (row.IMEM_ID || idx);
                return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="table-cell">{row.IMEM_ID || idx + 1}</td>
                  <td className="table-cell font-medium">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.SlotID || ''}
                        onChange={(e) => setEditFormData({...editFormData, SlotID: e.target.value})}
                        className="input-field w-20 text-sm"
                      />
                    ) : (row.SlotID || 'N/A')}
                  </td>
                  <td className="table-cell">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.Plate || ''}
                        onChange={(e) => setEditFormData({...editFormData, Plate: e.target.value})}
                        className="input-field w-32 text-sm font-mono"
                      />
                    ) : (
                      <>
                        <span className="font-mono">{maskPlate(row.Plate)}</span>
                        {(row.Plate?.toUpperCase().includes('GOVT') || row.Plate?.toUpperCase().includes('ROYAL')) && (
                          <span className="ml-2 text-xs text-gray-500">(Anonymized)</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="table-cell">{row.CameraID || 'CAM-1'}</td>
                  <td className="table-cell">{formatDateTime(row.Timestamp)}</td>
                  <td className="table-cell">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.VehicleType || ''}
                        onChange={(e) => setEditFormData({...editFormData, VehicleType: e.target.value})}
                        className="input-field w-24 text-sm"
                      />
                    ) : (row.VehicleType || 'N/A')}
                  </td>
                  <td className="table-cell">{row.VehicleClass || 'N/A'}</td>
                  <td className="table-cell">
                    {isEditing ? (
                      <select
                        value={editFormData.Event || ''}
                        onChange={(e) => setEditFormData({...editFormData, Event: e.target.value})}
                        className="input-field text-sm"
                      >
                        <option value="IN">IN</option>
                        <option value="OUT">OUT</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        row.Event === 'IN' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {row.Event || 'N/A'}
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.Fee || ''}
                        onChange={(e) => setEditFormData({...editFormData, Fee: e.target.value})}
                        className="input-field w-24 text-sm"
                      />
                    ) : (row.Fee ? `Nu. ${parseFloat(row.Fee).toFixed(2)}` : '-')}
                  </td>
                  <td className="table-cell">
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                          title="Save"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                          title="Cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewSnapshot(row.IMEM_ID || idx)}
                          className="text-bhutan-blue hover:text-bhutan-dark-blue text-sm font-medium"
                          title="View Snapshot"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(row)}
                          className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row.IMEM_ID || idx, idx)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="input-field w-24"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedSnapshot(null)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Snapshot</h3>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <img src={selectedSnapshot} alt="Snapshot" className="max-w-full h-auto" />
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Privacy Notice:</strong> License plate numbers for GOVT and ROYAL vehicles are automatically anonymized to protect privacy.
        </p>
      </div>
    </div>
  );
};

export default IMEMTable;
