"""
License Plate Recognition using PaddleOCR (Offline)
"""
import cv2
import numpy as np
import re
from paddleocr import PaddleOCR
import config


class PlateReader:
    def __init__(self):
        """Initialize PaddleOCR for plate recognition"""
        print("Initializing PaddleOCR...")
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang=config.PADDLE_LANG,
            use_gpu=config.PADDLE_USE_GPU,
            show_log=False
        )
        print("✅ PaddleOCR initialized successfully")
        
        self.plate_cache = {}  # Cache recognized plates per track_id
    
    def preprocess_plate_image(self, plate_img):
        """
        Enhance plate image for better OCR
        
        Args:
            plate_img: Cropped plate region
            
        Returns:
            Enhanced plate image
        """
        if plate_img is None or plate_img.size == 0:
            return None
        
        # Resize (2x)
        height, width = plate_img.shape[:2]
        plate_img = cv2.resize(plate_img, (width * 2, height * 2), interpolation=cv2.INTER_CUBIC)
        
        # Convert to grayscale
        if len(plate_img.shape) == 3:
            gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
        else:
            gray = plate_img
        
        # Apply sharpening
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]])
        sharpened = cv2.filter2D(gray, -1, kernel)
        
        # Apply adaptive threshold
        enhanced = cv2.adaptiveThreshold(
            sharpened, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11, 2
        )
        
        return enhanced
    
    def apply_ocr_corrections(self, text):
        """
        Apply Bhutan-specific OCR corrections
        
        Args:
            text: Raw OCR text
            
        Returns:
            Corrected text
        """
        corrected = ""
        for char in text:
            if char in config.OCR_CORRECTIONS:
                corrected += config.OCR_CORRECTIONS[char]
            else:
                corrected += char
        return corrected
    
    def parse_bhutan_plate(self, plate_text):
        """
        Parse Bhutan license plate format: PREFIX-REGION-NUMBER
        Example: BP-1-A1111
        
        Args:
            plate_text: Recognized plate text
            
        Returns:
            Dictionary with parsed plate info
        """
        plate_info = {
            'plate_text': plate_text,
            'prefix': None,
            'vehicle_type': None,
            'region_code': None,
            'region_name': None,
            'plate_number': None,
            'color': config.COLOR_BBOX
        }
        
        # Clean plate text
        plate_text = re.sub(r'[^A-Z0-9-]', '', plate_text.upper())
        
        # Try to match Bhutan format: PREFIX-REGION-NUMBER
        pattern = r'([A-Z]{2})-?([0-9])-?([A-Z0-9]+)'
        match = re.search(pattern, plate_text)
        
        if match:
            prefix = match.group(1)
            region_code = match.group(2)
            plate_number = match.group(3)
            
            plate_info['prefix'] = prefix
            plate_info['region_code'] = region_code
            plate_info['plate_number'] = plate_number
            
            # Get vehicle type and color
            if prefix in config.BHUTAN_PLATE_PREFIXES:
                plate_info['vehicle_type'] = config.BHUTAN_PLATE_PREFIXES[prefix]['type']
                plate_info['color'] = config.BHUTAN_PLATE_PREFIXES[prefix]['color']
            
            # Get region name
            if region_code in config.BHUTAN_REGIONS:
                plate_info['region_name'] = config.BHUTAN_REGIONS[region_code]
        
        return plate_info
    
    def read_plate(self, frame, plate_region, track_id=None):
        """
        Read license plate from region
        
        Args:
            frame: Full frame
            plate_region: (x1, y1, x2, y2) coordinates
            track_id: Vehicle tracking ID
            
        Returns:
            Dictionary with plate information
        """
        # Check cache first
        if track_id and track_id in self.plate_cache:
            return self.plate_cache[track_id]
        
        x1, y1, x2, y2 = plate_region
        
        # Validate coordinates
        if x1 >= x2 or y1 >= y2 or x1 < 0 or y1 < 0:
            return None
        
        # Crop plate region
        h, w = frame.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        plate_img = frame[y1:y2, x1:x2]
        
        if plate_img.size == 0:
            return None
        
        # Preprocess
        enhanced = self.preprocess_plate_image(plate_img)
        
        if enhanced is None:
            return None
        
        try:
            # Run OCR
            result = self.ocr.ocr(enhanced, cls=True)
            
            if result and result[0]:
                # Concatenate all detected text
                plate_text = ""
                for line in result[0]:
                    text = line[1][0]  # Extract text from result
                    plate_text += text
                
                # Apply corrections
                plate_text = self.apply_ocr_corrections(plate_text)
                
                # Parse Bhutan format
                plate_info = self.parse_bhutan_plate(plate_text)
                
                # Cache result
                if track_id and plate_info['prefix']:
                    self.plate_cache[track_id] = plate_info
                
                return plate_info
        
        except Exception as e:
            # Silently fail for OCR errors
            pass
        
        return None
    
    def get_cached_plate(self, track_id):
        """Get cached plate info for track_id"""
        return self.plate_cache.get(track_id, None)
