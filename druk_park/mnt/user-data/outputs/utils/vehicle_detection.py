"""
Vehicle Detection and Tracking using YOLOv11n
"""
import cv2
import numpy as np
from ultralytics import YOLO
import config


class VehicleDetector:
    def __init__(self):
        """Initialize YOLO model for vehicle detection and tracking"""
        print(f"Loading YOLOv11n model: {config.YOLO_MODEL}")
        try:
            self.model = YOLO(config.YOLO_MODEL)
            print("✅ YOLOv11n model loaded successfully")
        except Exception as e:
            print(f"⚠️ Error loading model: {e}")
            print("Downloading YOLOv11n model...")
            self.model = YOLO(config.YOLO_MODEL)
        
        self.tracked_vehicles = {}  # Store vehicle tracking info
        
    def detect_and_track(self, frame):
        """
        Detect and track vehicles in frame
        
        Returns:
            results: YOLO tracking results
            detections: List of (track_id, class_id, class_name, bbox, confidence)
        """
        # Run YOLOv11n with tracking (ByteTrack)
        results = self.model.track(
            frame,
            conf=config.CONFIDENCE_THRESHOLD,
            iou=config.IOU_THRESHOLD,
            classes=list(config.VEHICLE_CLASSES.keys()),
            persist=True,  # Enable persistent tracking
            verbose=False
        )
        
        detections = []
        
        if results[0].boxes is not None and results[0].boxes.id is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            track_ids = results[0].boxes.id.cpu().numpy().astype(int)
            confidences = results[0].boxes.conf.cpu().numpy()
            class_ids = results[0].boxes.cls.cpu().numpy().astype(int)
            
            for box, track_id, conf, class_id in zip(boxes, track_ids, confidences, class_ids):
                if class_id in config.VEHICLE_CLASSES:
                    x1, y1, x2, y2 = map(int, box)
                    class_name = config.VEHICLE_CLASSES[class_id]
                    
                    # Store vehicle info
                    if track_id not in self.tracked_vehicles:
                        self.tracked_vehicles[track_id] = {
                            'first_seen': None,
                            'last_seen': None,
                            'class': class_name,
                            'plate': None,
                            'slot': None,
                            'entry_time': None
                        }
                    
                    detections.append({
                        'track_id': track_id,
                        'class_id': class_id,
                        'class_name': class_name,
                        'bbox': (x1, y1, x2, y2),
                        'confidence': float(conf)
                    })
        
        return results, detections
    
    def draw_detections(self, frame, detections, plates_info=None):
        """
        Draw bounding boxes and labels on frame
        
        Args:
            frame: Input frame
            detections: List of detection dictionaries
            plates_info: Dictionary mapping track_id to plate info
        """
        for det in detections:
            track_id = det['track_id']
            x1, y1, x2, y2 = det['bbox']
            class_name = det['class_name']
            confidence = det['confidence']
            
            # Determine box color based on plate type
            color = config.COLOR_BBOX
            if plates_info and track_id in plates_info:
                plate_data = plates_info[track_id]
                if 'prefix' in plate_data:
                    prefix = plate_data['prefix']
                    if prefix in config.BHUTAN_PLATE_PREFIXES:
                        color = config.BHUTAN_PLATE_PREFIXES[prefix]['color']
            
            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Prepare label
            label = f"ID:{track_id} {class_name} {confidence:.2f}"
            
            # Add plate info if available
            if plates_info and track_id in plates_info:
                plate_data = plates_info[track_id]
                if 'plate_text' in plate_data and plate_data['plate_text']:
                    label += f" | {plate_data['plate_text']}"
            
            # Draw label background
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(frame, (x1, y1 - label_h - 10), (x1 + label_w, y1), color, -1)
            
            # Draw label text
            cv2.putText(frame, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, config.COLOR_TEXT, 2)
        
        return frame
    
    def get_plate_region(self, bbox):
        """
        Approximate license plate region from vehicle bounding box
        
        Args:
            bbox: (x1, y1, x2, y2) vehicle bounding box
            
        Returns:
            (px1, py1, px2, py2): Plate region coordinates
        """
        x1, y1, x2, y2 = bbox
        width = x2 - x1
        height = y2 - y1
        
        # Calculate plate region (top-front area of vehicle)
        px1 = int(x1 + width * config.PLATE_REGION['left_offset'])
        px2 = int(x1 + width * config.PLATE_REGION['right_offset'])
        py1 = int(y1 + height * config.PLATE_REGION['top_offset'])
        py2 = int(y1 + height * config.PLATE_REGION['bottom_offset'])
        
        return (px1, py1, px2, py2)
    
    def update_vehicle_info(self, track_id, **kwargs):
        """Update tracked vehicle information"""
        if track_id in self.tracked_vehicles:
            self.tracked_vehicles[track_id].update(kwargs)
    
    def get_vehicle_info(self, track_id):
        """Get tracked vehicle information"""
        return self.tracked_vehicles.get(track_id, None)
