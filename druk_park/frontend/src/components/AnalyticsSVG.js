import React from 'react';

// 24h Occupancy Line Chart (SVG only)
export const OccupancyLineChart = ({ data = [] }) => {
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value), 100);
  const xScale = (index) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  const yScale = (value) => padding.top + chartHeight - (value / maxValue) * chartHeight;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">24-Hour Occupancy Trend</h3>
      <svg width={width} height={height} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((val) => (
          <g key={val}>
            <line
              x1={padding.left}
              y1={yScale(val)}
              x2={width - padding.right}
              y2={yScale(val)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={padding.left - 10}
              y={yScale(val)}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-gray-600"
            >
              {val}%
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % 2 === 0) {
            return (
              <text
                key={i}
                x={xScale(i)}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {d.label}
              </text>
            );
          }
          return null;
        })}

        {/* Line */}
        <polyline
          fill="none"
          stroke="#0b5fff"
          strokeWidth={2}
          points={points}
        />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.value)}
            r={4}
            fill="#0b5fff"
          />
        ))}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#374151"
          strokeWidth={2}
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#374151"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
};

// Peak Hours Bar Chart (SVG only)
export const PeakHoursBarChart = ({ data = [] }) => {
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / (data.length || 1) - 10;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const yScale = (value) => (value / maxValue) * chartHeight;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Peak Hours Analysis</h3>
      <svg width={width} height={height} className="w-full h-auto">
        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = yScale(d.value);
          const x = padding.left + i * (chartWidth / data.length) + 5;
          const y = padding.top + chartHeight - barHeight;
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#0b5fff"
                className="hover:opacity-80 transition-opacity"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-xs fill-gray-700 font-medium"
              >
                {d.value}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#374151"
          strokeWidth={2}
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#374151"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
};

// Violation Types Pie Chart (SVG only)
export const ViolationTypesPieChart = ({ data = [] }) => {
  const width = 400;
  const height = 400;
  const radius = 120;
  const centerX = width / 2;
  const centerY = height / 2;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = -Math.PI / 2; // Start at top

  const colors = ['#0b5fff', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  const paths = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    // Label position
    const labelAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius * 0.7;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    currentAngle = endAngle;

    return { pathData, labelX, labelY, label: d.label, value: d.value, color: colors[i % colors.length], percentage: ((d.value / total) * 100).toFixed(1) };
  });

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Violation Types Distribution</h3>
      <svg width={width} height={height} className="w-full h-auto">
        {paths.map((slice, i) => (
          <g key={i}>
            <path
              d={slice.pathData}
              fill={slice.color}
              stroke="white"
              strokeWidth={2}
              className="hover:opacity-80 transition-opacity"
            />
            <text
              x={slice.labelX}
              y={slice.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm fill-white font-semibold"
            >
              {slice.percentage}%
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-4 space-y-2">
        {paths.map((slice, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: slice.color }}></div>
              <span className="text-gray-700">{slice.label}</span>
            </div>
            <span className="font-semibold text-gray-900">{slice.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
