"""
Configuration file for Smart Parking & ANPR System
"""

# ==================== VIDEO SOURCE ====================
# Primary: IP Webcam (Live Phone Camera) or CCTV/IP Camera
# For CCTV cameras, use RTSP or HTTP stream URL
# Examples:
#   RTSP: rtsp://username:password@192.168.1.100:554/stream1
#   HTTP: http://192.168.1.100:8080/video
#   ONVIF: rtsp://admin:admin@192.168.1.64:554/onvif1
IP_WEBCAM_URL = "http://192.168.1.11:8080/video"  # Change to your camera's URL

# Secondary: DroidCam (Phone as USB/Webcam)
DROID_CAM_INDEX = 1

# Tertiary: Video file fallback
VIDEO_FILE_PATH = "d:/Intern/live_anpr/input_vid.mp4"

# Auto-switch to video if IP stream unavailable
AUTO_FALLBACK = True

# ==================== YOLO SETTINGS ====================
YOLO_MODEL = "yolo11n.pt"  # Ultralytics YOLOv11n
CONFIDENCE_THRESHOLD = 0.5
IOU_THRESHOLD = 0.45

# Vehicle classes to detect (COCO dataset)
VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle", 
    5: "bus",
    7: "truck"
}

# ==================== PARKING SLOTS ====================
# Format: "SlotID": (x1, y1, x2, y2)
PARKING_SLOTS = {
    "A1": (200, 550, 750, 900),
    "A2": (750, 400, 1150, 650)
}

# Overlap threshold for slot occupancy
SLOT_OVERLAP_THRESHOLD = 0.40  # 40%

# ==================== ILLEGAL ZONES ====================
ILLEGAL_ZONES = {
    "A3": (100, 100, 400, 300)  # Illegal parking zone
}

# Overlap threshold for illegal parking
ILLEGAL_OVERLAP_THRESHOLD = 0.30  # 30%

# ==================== LICENSE PLATE SETTINGS ====================
# Plate region approximation (relative to vehicle bbox)
PLATE_REGION = {
    "top_offset": 0.6,      # Start at 60% from top of vehicle
    "bottom_offset": 0.85,  # End at 85% from top
    "left_offset": 0.25,    # Start at 25% from left
    "right_offset": 0.75    # End at 75% from left
}

# PaddleOCR settings
PADDLE_LANG = "en"
PADDLE_USE_GPU = False  # Set True if CUDA available

# OCR character corrections for Bhutan plates
OCR_CORRECTIONS = {
    '0': 'O',
    '1': 'I',
    '6': 'G',
    '8': 'B'
}

# Bhutan plate format: PREFIX-REGION-NUMBER
# Example: BP-1-A1111
BHUTAN_PLATE_PREFIXES = {
    "BP": {"type": "Private", "color": (0, 0, 255)},      # Red
    "BT": {"type": "Taxi", "color": (0, 255, 255)},       # Yellow
    "BG": {"type": "Electric", "color": (0, 255, 0)}      # Green
}

BHUTAN_REGIONS = {
    "1": "Western",
    "2": "South-West", 
    "3": "Central",
    "4": "Eastern"
}

# ==================== PARKING FEES ====================
PARKING_FEE_PER_HOUR = 40  # Nu. 40 per hour (pro-rated)

# ==================== TIMESTAMP SETTINGS ====================
# Timestamp OCR region (top-left corner)
TIMESTAMP_REGION = (0, 0, 400, 50)

# Expected timestamp format: MM-DD-YYYY Day HH:MM:SS
TIMESTAMP_FORMAT = "%m-%d-%Y %A %H:%M:%S"

# ==================== OUTPUT SETTINGS ====================
OUTPUT_VIDEO = "outputs/output.mp4"
OUTPUT_LOG_CSV = "outputs/parking_log.csv"
OUTPUT_SUMMARY_JSON = "outputs/summary.json"

# Video codec (Windows compatible)
VIDEO_CODEC = "mp4v"
OUTPUT_FPS = 20

# ==================== PERFORMANCE SETTINGS ====================
# Skip frame processing if no vehicles detected (improve speed)
SKIP_EMPTY_FRAMES = True

# Frame processing interval (process every N frames)
PROCESS_EVERY_N_FRAMES = 1

# Display settings
DISPLAY_LIVE_FEED = True
DISPLAY_WIDTH = 1280
DISPLAY_HEIGHT = 720

# ==================== VISUALIZATION COLORS ====================
COLOR_AVAILABLE = (0, 255, 0)    # Green
COLOR_OCCUPIED = (0, 0, 255)     # Red
COLOR_ILLEGAL = (0, 0, 255)      # Red
COLOR_BBOX = (255, 0, 0)         # Blue
COLOR_TEXT = (255, 255, 255)     # White
COLOR_WARNING = (0, 0, 255)      # Red

# ==================== SLOT CALIBRATION ====================
CALIBRATION_OUTPUT = "slot_calibration.json"
CALIBRATION_IMAGE = "calibration_reference.jpg"
