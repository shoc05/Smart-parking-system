# Druk Park - Admin Dashboard

System Admin Dashboard for Druk Park built with React and Tailwind CSS.

## Features

- **Live Camera Feed**: Real-time video streaming from IP webcam
- **Dynamic Dashboard**: Real-time KPIs, occupancy monitoring, and alerts
- **IMEM Table**: Comprehensive event management with search, filter, sort, and export
- **Analytics**: SVG-based charts for occupancy trends, peak hours, and violations
- **Calibration Tool**: Interactive slot and illegal zone definition
- **Time Format Toggle**: Global 12-hour / 24-hour time format switching
- **Privacy Protection**: Automatic anonymization of GOVT and ROYAL vehicle plates
- **Keyboard Shortcuts**: Quick navigation and actions
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology Stack

- **React 18** (Create React App)
- **React Router 6** for navigation
- **Tailwind CSS 3** for styling
- **No external UI libraries** (pure Tailwind CSS)
- **SVG-only charts** (no chart libraries)

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Python backend API running on `http://localhost:5000` (or configure via `REACT_APP_API_URL`)

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Backend API Requirements

The frontend expects the following API endpoints:

- `GET /video-feed` - Video stream endpoint
- `POST /set-camera-url` - Update camera URL
- `GET /camera-status` - Get camera connection status
- `POST /calibrate` - Save calibration data
- `GET /calibration` - Get current calibration
- `GET /slots` - Get parking slots status
- `GET /imem` - Get IMEM events
- `GET /export/csv` - Export IMEM data as CSV
- `GET /analytics?range=24h|7d` - Get analytics data
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /snapshot/:eventId` - Get snapshot image

## Keyboard Shortcuts

- **F** - Focus search/filter input (on IMEM page)
- **N** - Jump to next unread IMEM event (on IMEM page)
- **S** - Open snapshot modal (context-dependent)

## Privacy Rules

License plate numbers are automatically anonymized for:
- Vehicles with "GOVT" in plate number
- Vehicles with "ROYAL" in plate number

These are displayed as "***ANONYMIZED***" in the UI.

## Theme

The dashboard uses Bhutan government enterprise styling:
- Primary Blue: `#0b5fff`
- Dark Blue: `#023e8a`
- Clean, professional design
- Rounded corners and soft shadows
- Inter/Poppins fonts

## Project Structure

```
src/
 ├─ App.js                 # Main app with routing
 ├─ index.css              # Tailwind CSS styles
 ├─ context/
 │   └─ TimeFormatContext.js  # Global time format state
 ├─ pages/
 │   ├─ Home.js            # Dashboard home page
 │   ├─ Analytics.js       # Analytics dashboard
 │   ├─ IMEM.js            # IMEM table page
 │   └─ Calibration.js     # Calibration tool
 ├─ components/
 │   ├─ TopNav.js          # Top navigation bar
 │   ├─ LiveFeed.js        # Live video feed component
 │   ├─ KPI.js             # KPI card component
 │   ├─ SlotCard.js        # Parking slot card
 │   ├─ IMEMTable.js       # IMEM data table
 │   ├─ AnalyticsSVG.js    # SVG chart components
 │   ├─ ViolationsTable.js # Violations table
 │   └─ AdminTools.js      # Admin tools panel
 └─ services/
     └─ api.js             # API service layer
```

## Environment Variables

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:5000
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Copyright © 2024 Windsurf Smart Parking System
