"""
Illegal Parking Zone Detection
"""
import cv2
import numpy as np
from datetime import datetime
import config


class IllegalZoneDetector:
    def __init__(self):
        """Initialize illegal zone detector"""
        self.zones = config.ILLEGAL_ZONES.copy()
        self.violations = []  # Track all violations
        self.active_violators = set()  # Track currently violating track_ids
        
        print(f"✅ Initialized {len(self.zones)} illegal parking zones")
    
    def calculate_overlap(self, bbox1, bbox2):
        """
        Calculate IoU (Intersection over Union) between two bounding boxes
        
        Args:
            bbox1: (x1, y1, x2, y2)
            bbox2: (x1, y1, x2, y2)
            
        Returns:
            IoU ratio (0-1)
        """
        x1_1, y1_1, x2_1, y2_1 = bbox1
        x1_2, y1_2, x2_2, y2_2 = bbox2
        
        # Calculate intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i < x1_i or y2_i < y1_i:
            return 0.0
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        
        # Calculate areas
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        
        # Calculate union
        union = area1 + area2 - intersection
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    def detect_violations(self, detections, plates_info, frame_number, timestamp=None):
        """
        Detect vehicles in illegal zones
        
        Args:
            detections: List of vehicle detections
            plates_info: Dictionary mapping track_id to plate info
            frame_number: Current frame number
            timestamp: Current timestamp
            
        Returns:
            List of violations
        """
        if timestamp is None:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        current_violators = set()
        violations = []
        
        # Check each detection against each illegal zone
        for det in detections:
            track_id = det['track_id']
            vehicle_bbox = det['bbox']
            
            for zone_id, zone_coords in self.zones.items():
                overlap = self.calculate_overlap(vehicle_bbox, zone_coords)
                
                if overlap > config.ILLEGAL_OVERLAP_THRESHOLD:
                    current_violators.add(track_id)
                    
                    # Only log new violations (not already active)
                    if track_id not in self.active_violators:
                        violation = {
                            'zone_id': zone_id,
                            'track_id': track_id,
                            'vehicle_class': det['class_name'],
                            'plate': None,
                            'vehicle_type': None,
                            'region': None,
                            'timestamp': timestamp,
                            'frame_number': frame_number,
                            'bbox': vehicle_bbox
                        }
                        
                        # Add plate info if available
                        if track_id in plates_info:
                            plate_data = plates_info[track_id]
                            if plate_data:
                                violation['plate'] = plate_data.get('plate_text')
                                violation['vehicle_type'] = plate_data.get('vehicle_type')
                                violation['region'] = plate_data.get('region_name')
                        
                        violations.append(violation)
                        self.violations.append(violation)
        
        # Update active violators
        self.active_violators = current_violators
        
        return violations
    
    def draw_zones(self, frame, detections, plates_info):
        """
        Draw illegal zones and violations on frame
        
        Args:
            frame: Input frame
            detections: List of vehicle detections
            plates_info: Dictionary mapping track_id to plate info
            
        Returns:
            Frame with zone overlays
        """
        # Draw illegal zones
        for zone_id, coords in self.zones.items():
            x1, y1, x2, y2 = coords
            
            # Draw zone rectangle (semi-transparent red)
            overlay = frame.copy()
            cv2.rectangle(overlay, (x1, y1), (x2, y2), config.COLOR_ILLEGAL, -1)
            cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
            
            # Draw zone border
            cv2.rectangle(frame, (x1, y1), (x2, y2), config.COLOR_ILLEGAL, 3)
            
            # Draw zone label
            label = f"⚠ {zone_id}: ILLEGAL ZONE"
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
            cv2.rectangle(frame, (x1, y1 - label_h - 15), (x1 + label_w + 10, y1), 
                         config.COLOR_ILLEGAL, -1)
            cv2.putText(frame, label, (x1 + 5, y1 - 8),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, config.COLOR_TEXT, 2)
        
        # Highlight violating vehicles
        for det in detections:
            track_id = det['track_id']
            
            if track_id in self.active_violators:
                x1, y1, x2, y2 = det['bbox']
                
                # Draw thick red border
                cv2.rectangle(frame, (x1, y1), (x2, y2), config.COLOR_WARNING, 4)
                
                # Draw warning text
                warning = "⚠ ILLEGAL PARKING"
                
                # Add plate if available
                if track_id in plates_info:
                    plate_data = plates_info[track_id]
                    if plate_data and 'plate_text' in plate_data:
                        warning += f" | {plate_data['plate_text']}"
                
                # Draw warning background
                (warn_w, warn_h), _ = cv2.getTextSize(warning, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
                cv2.rectangle(frame, (x1, y2 + 5), (x1 + warn_w + 10, y2 + warn_h + 15),
                            config.COLOR_WARNING, -1)
                
                # Draw warning text
                cv2.putText(frame, warning, (x1 + 5, y2 + warn_h + 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, config.COLOR_TEXT, 2)
        
        return frame
    
    def get_statistics(self):
        """Get illegal parking statistics"""
        return {
            'total_violations': len(self.violations),
            'active_violators': len(self.active_violators)
        }
