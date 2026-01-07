"""
System Check Script - Verify Installation
Run this before starting the main application
"""
import sys
import os

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 60)
    print(f" {text}")
    print("=" * 60)

def check_python_version():
    """Check Python version"""
    print_header("PYTHON VERSION CHECK")
    version = sys.version_info
    print(f"Python Version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major == 3 and version.minor >= 8:
        print("✅ Python version is compatible")
        return True
    else:
        print("❌ Python 3.8+ required")
        return False

def check_dependencies():
    """Check if all required packages are installed"""
    print_header("DEPENDENCY CHECK")
    
    dependencies = {
        'ultralytics': 'YOLOv11',
        'paddleocr': 'PaddleOCR',
        'cv2': 'OpenCV',
        'numpy': 'NumPy',
        'pandas': 'Pandas'
    }
    
    all_installed = True
    
    for package, name in dependencies.items():
        try:
            if package == 'cv2':
                import cv2
            else:
                __import__(package)
            print(f"✅ {name:20} - Installed")
        except ImportError:
            print(f"❌ {name:20} - NOT INSTALLED")
            all_installed = False
    
    return all_installed

def check_yolo_model():
    """Check if YOLO model is available"""
    print_header("YOLO MODEL CHECK")
    
    try:
        from ultralytics import YOLO
        
        # Try to load model (will auto-download if missing)
        print("Checking/Downloading YOLOv11n model...")
        model = YOLO('yolo11n.pt')
        print("✅ YOLOv11n model ready")
        return True
    except Exception as e:
        print(f"❌ Error with YOLO model: {e}")
        return False

def check_paddleocr():
    """Check PaddleOCR initialization"""
    print_header("PADDLEOCR CHECK")
    
    try:
        from paddleocr import PaddleOCR
        print("Initializing PaddleOCR (first run may download models)...")
        ocr = PaddleOCR(use_textline_orientation=True, lang='en')
        print("✅ PaddleOCR initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Error with PaddleOCR: {e}")
        return False

def check_opencv_video():
    """Check OpenCV video capture capability"""
    print_header("OPENCV VIDEO CHECK")
    
    try:
        import cv2
        
        # Try to create a VideoCapture object
        cap = cv2.VideoCapture(0)  # Try default camera
        if cap.isOpened():
            print("✅ OpenCV can access video devices")
            cap.release()
            return True
        else:
            print("⚠️ No camera detected (this is OK if using files)")
            return True
    except Exception as e:
        print(f"❌ Error with OpenCV: {e}")
        return False

def check_directory_structure():
    """Check project directory structure"""
    print_header("DIRECTORY STRUCTURE CHECK")
    
    required_dirs = ['utils', 'outputs']
    required_files = [
        'main.py',
        'config.py',
        'calibrate_slots.py',
        'requirements.txt',
        'utils/vehicle_detection.py',
        'utils/plate_reader.py',
        'utils/parking_slots.py',
        'utils/illegal_zones.py',
        'utils/timestamp_reader.py',
        'utils/logger.py',
        'utils/__init__.py'
        
    ]
    
    all_present = True
    
    for directory in required_dirs:
        if os.path.exists(directory):
            print(f"✅ Directory: {directory}")
        else:
            print(f"❌ Missing directory: {directory}")
            all_present = False
    
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ File: {file}")
        else:
            print(f"❌ Missing file: {file}")
            all_present = False
    
    return all_present

def check_config():
    """Check configuration"""
    print_header("CONFIGURATION CHECK")
    
    try:
        import config
        
        print(f"IP Webcam URL: {config.IP_WEBCAM_URL}")
        print(f"Video File: {config.VIDEO_FILE_PATH}")
        print(f"Auto Fallback: {config.AUTO_FALLBACK}")
        print(f"Parking Slots: {len(config.PARKING_SLOTS)} defined")
        print(f"Illegal Zones: {len(config.ILLEGAL_ZONES)} defined")
        print("✅ Configuration loaded successfully")
        return True
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        return False

def test_ip_webcam():
    """Test IP Webcam connection"""
    print_header("IP WEBCAM CONNECTION TEST")
    
    try:
        import cv2
        import config
        
        print(f"Testing connection to: {config.IP_WEBCAM_URL}")
        print("Attempting to connect... (timeout in 5 seconds)")
        
        cap = cv2.VideoCapture(config.IP_WEBCAM_URL)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        import time
        start = time.time()
        timeout = 5
        
        while time.time() - start < timeout:
            if cap.isOpened():
                ret, frame = cap.read()
                cap.release()
                
                if ret and frame is not None:
                    print(f"✅ IP Webcam connected successfully!")
                    print(f"   Resolution: {frame.shape[1]}x{frame.shape[0]}")
                    return True
                else:
                    print("⚠️ Connected but cannot read frame")
                    return False
        
        print("⚠️ IP Webcam not available (will fallback to video file)")
        return False
        
    except Exception as e:
        print(f"⚠️ IP Webcam test failed: {e}")
        print("   (This is OK if using video file)")
        return False

def main():
    """Run all checks"""
    print("\n" + "=" * 60)
    print(" SMART PARKING SYSTEM - INSTALLATION CHECK")
    print("=" * 60)
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Directory Structure", check_directory_structure),
        ("Configuration", check_config),
        ("YOLO Model", check_yolo_model),
        ("PaddleOCR", check_paddleocr),
        ("OpenCV Video", check_opencv_video),
        ("IP Webcam (optional)", test_ip_webcam)
    ]
    
    results = []
    
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ {name} check failed with error: {e}")
            results.append((name, False))
    
    # Summary
    print_header("SUMMARY")
    
    critical_passed = True
    optional_passed = True
    
    for name, result in results:
        if name == "IP Webcam (optional)":
            if result:
                print(f"✅ {name}")
            else:
                print(f"⚠️ {name} - Not available")
                optional_passed = False
        else:
            if result:
                print(f"✅ {name}")
            else:
                print(f"❌ {name}")
                critical_passed = False
    
    print("\n" + "=" * 60)
    
    if critical_passed:
        print("✅ ALL CRITICAL CHECKS PASSED")
        print("\nYou can now run the system:")
        print("  python main.py")
        
        if not optional_passed:
            print("\n⚠️ Note: IP Webcam not available")
            print("   System will use video file fallback")
    else:
        print("❌ SOME CHECKS FAILED")
        print("\nPlease fix the issues above before running the system.")
        print("\nCommon fixes:")
        print("  1. Install dependencies: pip install -r requirements.txt")
        print("  2. Check Python version: python --version")
        print("  3. Verify all files are present")
    
    print("=" * 60 + "\n")
    
    return critical_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
