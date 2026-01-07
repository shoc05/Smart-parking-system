"""
Parking Slot Monitoring and Management
"""
import cv2
import numpy as np
from datetime import datetime
import config


class ParkingSlotMonitor:
    def __init__(self):
        """Initialize parking slot monitor"""
        self.slots = config.PARKING_SLOTS.copy()
        self.slot_states = {slot_id: "AVAILABLE" for slot_id in self.slots}
        self.slot_occupants = {slot_id: None for slot_id in self.slots}
        self.parking_events = []  # Track IN/OUT events
        
        print(f"✅ Initialized {len(self.slots)} parking slots")
    
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
    
    def update_slots(self, detections, plates_info, timestamp=None):
        """
        Update parking slot occupancy based on vehicle detections
        
        Args:
            detections: List of vehicle detections
            plates_info: Dictionary mapping track_id to plate info
            timestamp: Current timestamp
            
        Returns:
            Dictionary of slot states and events
        """
        if timestamp is None:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        current_occupants = {slot_id: None for slot_id in self.slots}
        
        # Check each detection against each slot
        for det in detections:
            track_id = det['track_id']
            vehicle_bbox = det['bbox']
            
            for slot_id, slot_coords in self.slots.items():
                overlap = self.calculate_overlap(vehicle_bbox, slot_coords)
                
                if overlap > config.SLOT_OVERLAP_THRESHOLD:
                    # Vehicle is in this slot
                    current_occupants[slot_id] = {
                        'track_id': track_id,
                        'class': det['class_name'],
                        'plate': None
                    }
                    
                    # Add plate info if available
                    if track_id in plates_info:
                        plate_data = plates_info[track_id]
                        if plate_data and 'plate_text' in plate_data:
                            current_occupants[slot_id]['plate'] = plate_data['plate_text']
                            current_occupants[slot_id]['vehicle_type'] = plate_data.get('vehicle_type')
                            current_occupants[slot_id]['region'] = plate_data.get('region_name')
        
        # Detect state changes (IN/OUT events)
        events = []
        for slot_id in self.slots:
            old_occupant = self.slot_occupants[slot_id]
            new_occupant = current_occupants[slot_id]
            
            # Entry event (slot was empty, now occupied)
            if old_occupant is None and new_occupant is not None:
                self.slot_states[slot_id] = "OCCUPIED"
                event = {
                    'slot_id': slot_id,
                    'event': 'IN',
                    'track_id': new_occupant['track_id'],
                    'vehicle_class': new_occupant['class'],
                    'plate': new_occupant['plate'],
                    'vehicle_type': new_occupant.get('vehicle_type'),
                    'region': new_occupant.get('region'),
                    'timestamp': timestamp,
                    'entry_time': timestamp
                }
                events.append(event)
                self.parking_events.append(event)
            
            # Exit event (slot was occupied, now empty)
            elif old_occupant is not None and new_occupant is None:
                self.slot_states[slot_id] = "AVAILABLE"
                
                # Find entry event for this vehicle
                entry_event = None
                for event in reversed(self.parking_events):
                    if (event['slot_id'] == slot_id and 
                        event['track_id'] == old_occupant['track_id'] and
                        event['event'] == 'IN'):
                        entry_event = event
                        break
                
                # Calculate duration and fee
                duration_minutes = 0
                fee = 0
                if entry_event:
                    try:
                        entry_dt = datetime.strptime(entry_event['timestamp'], "%Y-%m-%d %H:%M:%S")
                        exit_dt = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
                        duration_minutes = (exit_dt - entry_dt).total_seconds() / 60
                        # Pro-rated fee calculation
                        fee = (duration_minutes / 60) * config.PARKING_FEE_PER_HOUR
                    except:
                        pass
                
                event = {
                    'slot_id': slot_id,
                    'event': 'OUT',
                    'track_id': old_occupant['track_id'],
                    'vehicle_class': old_occupant['class'],
                    'plate': old_occupant['plate'],
                    'vehicle_type': old_occupant.get('vehicle_type'),
                    'region': old_occupant.get('region'),
                    'timestamp': timestamp,
                    'duration_minutes': round(duration_minutes, 2),
                    'fee': round(fee, 2)
                }
                events.append(event)
                self.parking_events.append(event)
        
        # Update current occupants
        self.slot_occupants = current_occupants
        
        return {
            'slot_states': self.slot_states,
            'slot_occupants': self.slot_occupants,
            'events': events
        }
    
    def draw_slots(self, frame):
        """
        Draw parking slots on frame
        
        Args:
            frame: Input frame
            
        Returns:
            Frame with slot overlays
        """
        for slot_id, coords in self.slots.items():
            x1, y1, x2, y2 = coords
            
            # Determine color based on state
            if self.slot_states[slot_id] == "AVAILABLE":
                color = config.COLOR_AVAILABLE
                status = "AVAILABLE"
            else:
                color = config.COLOR_OCCUPIED
                status = "OCCUPIED"
            
            # Draw slot rectangle
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
            
            # Prepare label
            label = f"{slot_id}: {status}"
            
            # Add occupant info
            if self.slot_occupants[slot_id]:
                occupant = self.slot_occupants[slot_id]
                if occupant['plate']:
                    label += f" | {occupant['plate']}"
            
            # Draw label background
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(frame, (x1, y1 - label_h - 10), (x1 + label_w + 10, y1), color, -1)
            
            # Draw label text
            cv2.putText(frame, label, (x1 + 5, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, config.COLOR_TEXT, 2)
        
        return frame
    
    def get_statistics(self):
        """Get parking statistics"""
        total_slots = len(self.slots)
        occupied_slots = sum(1 for state in self.slot_states.values() if state == "OCCUPIED")
        available_slots = total_slots - occupied_slots
        
        total_revenue = sum(event['fee'] for event in self.parking_events 
                          if event['event'] == 'OUT' and 'fee' in event)
        
        return {
            'total_slots': total_slots,
            'occupied': occupied_slots,
            'available': available_slots,
            'total_events': len(self.parking_events),
            'total_revenue': round(total_revenue, 2)
        }
