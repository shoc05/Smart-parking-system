"""
Logging utilities for parking events and summary
"""
import csv
import json
import os
from datetime import datetime
import config


class ParkingLogger:
    def __init__(self):
        """Initialize parking logger"""
        self.csv_path = config.OUTPUT_LOG_CSV
        self.json_path = config.OUTPUT_SUMMARY_JSON
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(self.csv_path), exist_ok=True)
        
        # Initialize CSV file with headers
        self.init_csv()
        
        print(f"✅ Logger initialized")
        print(f"   CSV: {self.csv_path}")
        print(f"   JSON: {self.json_path}")
    
    def init_csv(self):
        """Initialize CSV file with headers"""
        headers = [
            'SlotID',
            'Event',
            'Plate',
            'VehicleType',
            'Region',
            'Timestamp',
            'DurationMinutes',
            'Fee'
        ]
        
        with open(self.csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
    
    def log_parking_event(self, event):
        """
        Log a parking event to CSV
        
        Args:
            event: Event dictionary with keys:
                - slot_id
                - event (IN/OUT)
                - plate
                - vehicle_type
                - region
                - timestamp
                - duration_minutes (for OUT events)
                - fee (for OUT events)
        """
        row = [
            event.get('slot_id', ''),
            event.get('event', ''),
            event.get('plate', ''),
            event.get('vehicle_type', ''),
            event.get('region', ''),
            event.get('timestamp', ''),
            event.get('duration_minutes', ''),
            event.get('fee', '')
        ]
        
        with open(self.csv_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(row)
    
    def log_illegal_event(self, violation):
        """
        Log an illegal parking event
        
        Args:
            violation: Violation dictionary
        """
        # Could be logged to a separate file or included in summary
        pass
    
    def save_summary(self, summary_data):
        """
        Save summary to JSON file
        
        Args:
            summary_data: Dictionary containing:
                - video_source
                - start_time
                - end_time
                - total_duration
                - total_vehicles
                - total_parking_events
                - total_illegal_events
                - slot_statistics
                - total_revenue
        """
        with open(self.json_path, 'w', encoding='utf-8') as f:
            json.dump(summary_data, f, indent=4)
        
        print(f"✅ Summary saved to {self.json_path}")
    
    def create_summary(self, video_source, timestamp_info, parking_stats, 
                      illegal_stats, total_vehicles):
        """
        Create comprehensive summary
        
        Args:
            video_source: Video input source
            timestamp_info: Dictionary from TimestampReader
            parking_stats: Dictionary from ParkingSlotMonitor
            illegal_stats: Dictionary from IllegalZoneDetector
            total_vehicles: Total unique vehicles detected
            
        Returns:
            Summary dictionary
        """
        summary = {
            'video_source': video_source,
            'start_time': timestamp_info.get('start_time', 'N/A'),
            'end_time': timestamp_info.get('end_time', 'N/A'),
            'total_duration_minutes': timestamp_info.get('duration_minutes', 0),
            'total_vehicles_detected': total_vehicles,
            'parking_statistics': {
                'total_slots': parking_stats.get('total_slots', 0),
                'currently_occupied': parking_stats.get('occupied', 0),
                'currently_available': parking_stats.get('available', 0),
                'total_parking_events': parking_stats.get('total_events', 0),
                'total_revenue': parking_stats.get('total_revenue', 0)
            },
            'illegal_parking': {
                'total_violations': illegal_stats.get('total_violations', 0),
                'active_violators': illegal_stats.get('active_violators', 0)
            },
            'slot_usage': self.calculate_slot_usage(parking_stats),
            'generated_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return summary
    
    def calculate_slot_usage(self, parking_stats):
        """Calculate slot-wise usage statistics"""
        # This would require tracking per-slot metrics
        # Placeholder for now
        return {
            'details': 'See parking_log.csv for detailed slot usage'
        }
