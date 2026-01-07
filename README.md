# Smart Parking & ANPR System for Bhutan

---

**Important Update (2025):**
- Camera/CCTV URL is now set directly from the dashboard (not config.py).
- Dashboard is integrated with backend for live slot occupancy and illegal parking monitoring.
- See new instructions below for dashboard-backend integration.
---


A complete, real-time Smart Parking and Automatic Number Plate Recognition (ANPR) system designed for Bhutan, featuring live phone camera support, parking slot monitoring, illegal parking detection, and automated fee calculation.

## Features

-  **Live Phone Camera Support** via IP Webcam (Android)
-  **Vehicle Detection & Tracking** using YOLOv11n (COCO dataset)
-  **License Plate Recognition** with PaddleOCR (Offline, no API required)
-  **Bhutan Plate Format Support** (BP/BT/BG prefix parsing)
-  **Real-time Parking Slot Monitoring** with occupancy detection
-  **Illegal Parking Zone Detection** with violation logging
-  **Automated Fee Calculation** (Nu.40/hour pro-rated)
-  **Timestamp Extraction** from video feed
-  **Comprehenassive Logging** (CSV + JSON outputs)
-  **Annotated Video Output** with all visualizations
-  **Interactive Slot Calibration Tool** for easy setup

## System Requirements

### Hardware
- **CPU**: Intel Core i5 or equivalent (minimum)
- **RAM**: 8 GB minimum, 16 GB recommended
- **Storage**: 2 GB free space for dependencies
- **GPU**: Optional (CUDA-compatible for faster processing)

### Software
- **OS**: Windows 10/11, Linux, or macOS
- **Python**: 3.8 - 3.11 (tested on 3.9)
- **VS Code**: Latest version (recommended)

## Installation

### Step 1: Clone or Download Project

```bash
# If using Git
git clone <repository-url>
cd smart_parking

# Or extract the downloaded ZIP file
```

### Step 2: Create Virtual Environment (Recommended)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

**Note**: Initial installation may take 5-10 minutes as it downloads model files.

### Step 4: Verify Installation

```bash
python -c "import ultralytics; import paddleocr; import cv2; print('✅ All dependencies installed successfully')"
```

## Camera/CCTV Integration via Dashboard

The camera (IP webcam or CCTV RTSP/HTTP stream) URL is now added and managed from the dashboard UI. You no longer need to edit `config.py` for the video source.

### Steps:
1. Start the backend: `python main.py`
2. Start the dashboard frontend (see `frontend/README.md` for instructions)
3. In the dashboard, enter your camera or CCTV URL in the "Live Camera Feed" section and update.
   - Supported formats:
     - RTSP: `rtsp://username:password@ip:port/stream1`
     - HTTP: `http://ip:port/video`
4. The backend will automatically switch to the new URL and begin processing.

---

## Setting Up IP Webcam (Live Phone Camera)

### Android Setup

1. **Download IP Webcam App**
   - Install from Google Play Store: [IP Webcam](https://play.google.com/store/apps/details?id=com.pas.webcam)

2. **Configure IP Webcam**
   - Open the app
   - Scroll down and tap **"Start server"**
   - Note the IP address shown (e.g., `192.168.1.100:8080`)

3. **Update Configuration**
   - Open `config.py`
   - Update `IP_WEBCAM_URL`:
     ```python
     IP_WEBCAM_URL = "http://192.168.1.100:8080/video"  # Your phone's IP
     ```

4. **Network Requirements**
   - Ensure phone and computer are on the **same WiFi network**
   - Disable any VPN or firewall that may block connections

### iOS Alternative

For iOS users, use apps like:
- **EpocCam** (with browser access)
- **iVCam**

Update the URL format according to the app's documentation.

##  Slot Calibration (First-Time Setup)

Before running the main system, calibrate parking slot coordinates:

### Step 1: Run Calibration Tool

```bash
python calibrate_slots.py
```

### Step 2: Enter Video Source

```
Enter video source (file path or IP webcam URL): http://192.168.1.100:8080/video
```

Or use a video file:
```
Enter video source (file path or IP webcam URL): demo_video.mp4
```

### Step 3: Define Slots

1. **Switch modes**:
   - Press `s` for SLOT mode (green rectangles)
   - Press `i` for ILLEGAL ZONE mode (red rectangles)

2. **Draw rectangles**:
   - Click and drag to define areas
   - Enter ID when prompted (e.g., "A1", "A2", "NO_PARK")

3. **Controls**:
   - `d` - Delete last entry
   - `c` - Clear all entries
   - `q` - Finish and save

### Step 4: Update config.py

The tool saves coordinates to `slot_calibration.json`. Copy these to `config.py`:

```python
PARKING_SLOTS = {
    "A1": (200, 550, 750, 900),
    "A2": (750, 400, 1150, 650)
}

ILLEGAL_ZONES = {
    "A3": (100, 100, 400, 300)
}
```

##  Live Dashboard & Slot Occupancy Monitoring

- The dashboard shows real-time slot occupancy, illegal parking, and KPIs by connecting to the backend API.
- All slot and event data is updated every 5 seconds.
- Use the dashboard to:
  - Monitor live camera feed
  - View slot status (occupied/available)
  - See illegal parking events
  - Export logs and analytics

---

##  Running the System

### Option 1: Live Phone Camera

1. Start IP Webcam on your phone
2. Update `config.py` with your phone's IP
3. Run:
   ```bash
   python main.py
   ```

### Option 2: Video File

1. Place your video file in the project directory
2. Update `config.py`:
   ```python
   VIDEO_FILE_PATH = "your_video.mp4"
   ```
3. Run:
   ```bash
   python main.py
   ```

### Auto-Fallback Mode

By default, the system tries IP Webcam first, then falls back to video file:
```python
AUTO_FALLBACK = True  # In config.py
```

##  Outputs

After processing, the system generates:

### 1. Annotated Video (`outputs/output.mp4`)
- Vehicle bounding boxes with IDs
- License plate text overlays
- Parking slot status (Available/Occupied)
- Illegal zone warnings
- Timestamp and frame number

### 2. Parking Log CSV (`outputs/parking_log.csv`)
```csv
SlotID,Event,Plate,VehicleType,Region,Timestamp,DurationMinutes,Fee
A1,IN,BP-1-A1234,Private,Western,2024-01-15 10:30:00,,
A1,OUT,BP-1-A1234,Private,Western,2024-01-15 11:45:00,75.00,50.00
```

### 3. Summary JSON (`outputs/summary.json`)
```json
{
  "video_source": "http://192.168.1.100:8080/video",
  "start_time": "2024-01-15 10:00:00",
  "end_time": "2024-01-15 12:00:00",
  "total_duration_minutes": 120,
  "total_vehicles_detected": 25,
  "parking_statistics": {
    "total_slots": 2,
    "total_parking_events": 15,
    "total_revenue": 320.50
  },
  "illegal_parking": {
    "total_violations": 3
  }
}
```

##  Configuration Options

Edit `config.py` to customize:

### Video Source
```python
IP_WEBCAM_URL = "http://192.168.1.100:8080/video"
VIDEO_FILE_PATH = "demo_video.mp4"
AUTO_FALLBACK = True
```

### Detection Settings
```python
CONFIDENCE_THRESHOLD = 0.5  # Higher = fewer false positives
SLOT_OVERLAP_THRESHOLD = 0.40  # 40% overlap for slot occupancy
ILLEGAL_OVERLAP_THRESHOLD = 0.30  # 30% overlap for violation
```

### Parking Fees
```python
PARKING_FEE_PER_HOUR = 40  # ₹40 per hour (pro-rated)
```

### Performance
```python
SKIP_EMPTY_FRAMES = True  # Skip frames without vehicles
PROCESS_EVERY_N_FRAMES = 1  # Process every frame (1) or skip (2, 3, etc.)
DISPLAY_LIVE_FEED = True  # Show live window
```

### GPU Acceleration (Optional)
```python
PADDLE_USE_GPU = True  # Requires CUDA installation
```

To enable GPU:
```bash
pip uninstall paddlepaddle
pip install paddlepaddle-gpu
```

## 🇧🇹 Bhutan License Plate Format

### Supported Prefixes
- **BP** - Private vehicles (Red)
- **BT** - Taxi (Yellow)
- **BG** - Electric vehicles (Green)

### Region Codes
- **1** - Western
- **2** - South-West
- **3** - Central
- **4** - Eastern

### Format
```
PREFIX-REGION-NUMBER
Example: BP-1-A1234
```

### OCR Corrections
The system automatically applies Bhutan-specific corrections:
- `0` → `O`
- `1` → `I`
- `6` → `G`
- `8` → `B`

##  Troubleshooting

### Issue: IP Webcam Not Connecting

**Solutions:**
1. Verify phone and computer are on same WiFi
2. Check firewall settings (allow port 8080)
3. Test URL in web browser: `http://192.168.1.100:8080/video`
4. Try different port in IP Webcam settings

### Issue: "YOLO model not found"

**Solution:**
```bash
# Manually download YOLOv11n
python -c "from ultralytics import YOLO; YOLO('yolo11n.pt')"
```

### Issue: PaddleOCR Errors

**Solutions:**
1. Update PaddleOCR:
   ```bash
   pip install --upgrade paddleocr
   ```
2. Clear cache:
   ```bash
   rm -rf ~/.paddleocr
   ```

### Issue: Slow Performance

**Solutions:**
1. Enable frame skipping in `config.py`:
   ```python
   PROCESS_EVERY_N_FRAMES = 2  # Process every 2nd frame
   ```
2. Reduce video resolution
3. Enable GPU acceleration (if available)
4. Close other applications

### Issue: Plate Recognition Inaccurate

**Solutions:**
1. Adjust plate region offsets in `config.py`:
   ```python
   PLATE_REGION = {
       "top_offset": 0.6,
       "bottom_offset": 0.85,
       "left_offset": 0.25,
       "right_offset": 0.75
   }
   ```
2. Ensure good camera angle and lighting
3. Use higher resolution video

##  Demo Checklist for Evaluators

### Pre-Demo Setup (5 minutes)
- [ ] Install all dependencies
- [ ] Run slot calibration tool
- [ ] Test IP Webcam connection
- [ ] Verify video file fallback

### Live Demo (10 minutes)
- [ ] Start system with live phone camera
- [ ] Show vehicle detection and tracking
- [ ] Demonstrate plate recognition
- [ ] Trigger parking events (IN/OUT)
- [ ] Show illegal parking detection
- [ ] Display real-time slot status

### Results Review (5 minutes)
- [ ] Show annotated output video
- [ ] Review parking log CSV
- [ ] Examine summary JSON
- [ ] Demonstrate fee calculations

##  Project Structure

```
smart_parking/
│
├── main.py                    # Main application
├── config.py                  # Configuration settings
├── calibrate_slots.py         # Slot calibration tool
├── requirements.txt           # Python dependencies
├── README.md                  # This file
│
├── utils/
│   ├── vehicle_detection.py  # YOLOv11n detection
│   ├── plate_reader.py        # PaddleOCR recognition
│   ├── parking_slots.py       # Slot monitoring
│   ├── illegal_zones.py       # Violation detection
│   ├── timestamp_reader.py    # Timestamp extraction
│   └── logger.py              # CSV/JSON logging
│
└── outputs/
    ├── output.mp4             # Annotated video
    ├── parking_log.csv        # Parking events
    └── summary.json           # Session summary
```

##  Advanced Usage

### Custom Vehicle Classes

To detect additional vehicle types, edit `config.py`:

```python
VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
    1: "bicycle"  # Add bicycle detection
}
```

### Multiple Slot Types

Define different slot types with custom rules:

```python
PARKING_SLOTS = {
    "A1": (200, 550, 750, 900),     # Regular
    "H1": (100, 200, 400, 500),     # Handicap
    "E1": (500, 600, 800, 900)      # Electric
}
```

### Custom Fee Structures

Implement variable fees per slot type in `parking_slots.py`.

##  Support

For issues or questions:
1. Check Troubleshooting section
2. Review configuration options
3. Test with provided demo video
4. Verify all dependencies installed

##  License

This project is provided as-is for educational and demonstration purposes.

##  Acknowledgments

- **Ultralytics YOLOv11** - Vehicle detection
- **PaddleOCR** - License plate recognition
- **IP Webcam** - Live camera streaming
- **OpenCV** - Image processing

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Tested On**: Windows 10, Python 3.9

---

## Quick Start Command Summary

```bash
# Installation
pip install -r requirements.txt

# Calibrate slots (first time)
python calibrate_slots.py

# Run system
python main.py

# Press 'q' to stop
```

**Ready to deploy!  **
