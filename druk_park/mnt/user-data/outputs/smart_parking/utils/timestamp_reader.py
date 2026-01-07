"""
Timestamp Detection and Parsing using PaddleOCR
"""
import cv2
import numpy as np
import re
from datetime import datetime
from paddleocr import PaddleOCR
import config


class TimestampReader:
    def __init__(self):
        """Initialize timestamp reader"""
        print("Initializing Timestamp Reader...")
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang=config.PADDLE_LANG,
            use_gpu=config.PADDLE_USE_GPU,
            show_log=False
        )
        
        self.start_time = None
        self.end_time = None
        self.last_timestamp = None
        
        print("✅ Timestamp Reader initialized")
    
    def extract_timestamp(self, frame):
        """
        Extract timestamp from top-left corner of frame
        
        Args:
            frame: Input frame
            
        Returns:
            Timestamp string or None
        """
        # Crop timestamp region (top-left corner)
        x1, y1, x2, y2 = config.TIMESTAMP_REGION
        h, w = frame.shape[:2]
        x2 = min(x2, w)
        y2 = min(y2, h)
        
        timestamp_img = frame[y1:y2, x1:x2]
        
        if timestamp_img.size == 0:
            return None
        
        try:
            # Run OCR on timestamp region
            result = self.ocr.ocr(timestamp_img, cls=True)
            
            if result and result[0]:
                # Concatenate all detected text
                text = ""
                for line in result[0]:
                    text += line[1][0] + " "
                
                text = text.strip()
                
                # Parse timestamp
                timestamp = self.parse_timestamp(text)
                
                if timestamp:
                    # Update times
                    if self.start_time is None:
                        self.start_time = timestamp
                    self.end_time = timestamp
                    self.last_timestamp = timestamp
                
                return timestamp
        
        except Exception as e:
            pass
        
        return None
    
    def parse_timestamp(self, text):
        """
        Parse timestamp from OCR text
        Expected format: MM-DD-YYYY Day HH:MM:SS
        
        Args:
            text: OCR text containing timestamp
            
        Returns:
            Formatted timestamp string or None
        """
        # Try to extract date and time components
        # Pattern: MM-DD-YYYY Day HH:MM:SS
        
        # Remove extra spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Try multiple patterns
        patterns = [
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+\w+\s+(\d{1,2}:\d{2}:\d{2})',
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+(\d{1,2}:\d{2}:\d{2})',
            r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(\d{1,2}:\d{2}:\d{2})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                date_str = match.group(1)
                time_str = match.group(2)
                
                # Try to parse
                try:
                    # Try MM-DD-YYYY format
                    dt = datetime.strptime(f"{date_str} {time_str}", "%m-%d-%Y %H:%M:%S")
                    return dt.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    pass
                
                try:
                    # Try DD-MM-YYYY format
                    dt = datetime.strptime(f"{date_str} {time_str}", "%d-%m-%Y %H:%M:%S")
                    return dt.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    pass
                
                try:
                    # Try YYYY-MM-DD format
                    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
                    return dt.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    pass
        
        return None
    
    def get_fallback_timestamp(self):
        """Get system timestamp as fallback"""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    def get_current_timestamp(self, frame=None):
        """
        Get current timestamp (from frame or fallback)
        
        Args:
            frame: Optional frame to extract timestamp from
            
        Returns:
            Timestamp string
        """
        if frame is not None:
            timestamp = self.extract_timestamp(frame)
            if timestamp:
                return timestamp
        
        # Fallback to last known timestamp or system time
        if self.last_timestamp:
            return self.last_timestamp
        
        return self.get_fallback_timestamp()
    
    def calculate_duration(self):
        """
        Calculate total duration from start to end
        
        Returns:
            Duration in minutes
        """
        if self.start_time and self.end_time:
            try:
                start_dt = datetime.strptime(self.start_time, "%Y-%m-%d %H:%M:%S")
                end_dt = datetime.strptime(self.end_time, "%Y-%m-%d %H:%M:%S")
                duration = (end_dt - start_dt).total_seconds() / 60
                return round(duration, 2)
            except:
                pass
        
        return 0
    
    def get_summary(self):
        """Get timestamp summary"""
        return {
            'start_time': self.start_time or "N/A",
            'end_time': self.end_time or "N/A",
            'duration_minutes': self.calculate_duration()
        }
