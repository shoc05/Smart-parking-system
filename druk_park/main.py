"""
Smart Parking & ANPR System for Bhutan
Main application file with integrated Flask API for Druk Park Dashboard
"""
import cv2
import numpy as np
import os
import sys
from datetime import datetime
import threading
import json

# Add utils to path
sys.path.append(os.path.dirname(__file__))

import config
from utils.vehicle_detection import VehicleDetector
from utils.plate_reader import PlateReader
from utils.parking_slots import ParkingSlotMonitor
from utils.illegal_zones import IllegalZoneDetector
from utils.timestamp_reader import TimestampReader
from utils.logger import ParkingLogger
from utils.slot_status_classifier import SlotStatusClassifier, SlotStatus

# Optional Firebase for real-time updates
try:
    from utils.firebase_service import get_firebase_service
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️ Firebase not available. Using HTTP polling only.")
    def get_firebase_service():
        class StubFirebase:
            initialized = False
        return StubFirebase()

# Flask API imports (optional - install with: pip install flask flask-cors)
try:
    from flask import Flask, jsonify, request, Response, send_file
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("⚠️ Flask not available. API server will not start.")
    print("   Install with: pip install flask flask-cors")

# Load calibrated slots/zones if available
CALIBRATION_FILE = getattr(config, 'CALIBRATION_OUTPUT', 'slot_calibration.json')
def load_calibrated_slots():
    if os.path.exists(CALIBRATION_FILE):
        try:
            with open(CALIBRATION_FILE, 'r') as f:
                data = json.load(f)
                slots = data.get('parking_slots', {})
                illegal_zones = data.get('illegal_zones', {})
                # Convert list format to tuple format for compatibility
                slots_dict = {}
                for slot_id, coords in slots.items():
                    if isinstance(coords, list) and len(coords) == 4:
                        slots_dict[slot_id] = tuple(coords)
                    else:
                        slots_dict[slot_id] = coords
                illegal_dict = {}
                for zone_id, coords in illegal_zones.items():
                    if isinstance(coords, list) and len(coords) == 4:
                        illegal_dict[zone_id] = tuple(coords)
                    else:
                        illegal_dict[zone_id] = coords
                print(f"✅ Loaded {len(slots_dict)} calibrated parking slots and {len(illegal_dict)} illegal zones from {CALIBRATION_FILE}")
                return slots_dict, illegal_dict
        except Exception as e:
            print(f"⚠️ Failed to load calibration file: {e}")
    # Fallback to config.py
    print("⚠️ Using default slots/zones from config.py")
    return config.PARKING_SLOTS, config.ILLEGAL_ZONES


class SmartParkingSystem:
    def __init__(self):
        """Initialize Smart Parking System"""
        print("\n" + "=" * 60)
        print("DRUK PARK - SMART PARKING & ANPR SYSTEM FOR BHUTAN")
        print("=" * 60 + "\n")
        
        # Load calibrated slots/zones
        slots, illegal_zones = load_calibrated_slots()
        # Initialize components
        self.vehicle_detector = VehicleDetector()
        self.plate_reader = PlateReader()
        self.slot_monitor = ParkingSlotMonitor(slots)
        self.illegal_detector = IllegalZoneDetector(illegal_zones)
        self.timestamp_reader = TimestampReader()
        self.logger = ParkingLogger()
        
        # Initialize slot status classifier (for Firestore)
        self.status_classifier = SlotStatusClassifier(slots, illegal_zones)
        
        # Initialize Firebase service (for real-time updates)
        self.firebase = get_firebase_service()
        
        self.frame_count = 0
        self.tracked_vehicle_ids = set()
        self.plates_info = {}  # Store plate info per track_id
        
        # Video capture (shared with API)
        self.video_cap = None
        self.current_frame = None
        self.video_source = None
        self.video_source_type = None
        
        # Camera URL (for API)
        self.camera_url = getattr(config, 'IP_WEBCAM_URL', None)
        
        print("\n✅ All systems initialized successfully\n")
    
    def get_video_source(self):
        """
        Determine video source (IP webcam, DroidCam, or video file)
        
        Returns:
            video_source: Path, URL, or index for cv2.VideoCapture
            source_type: 'ip_webcam', 'droidcam', or 'video_file'
        """
        # Try IP Webcam first
        print("Attempting to connect to IP Webcam...")
        print(f"URL: {getattr(config, 'IP_WEBCAM_URL', None)}\n")
        ip_webcam_url = getattr(config, 'IP_WEBCAM_URL', None)
        if ip_webcam_url:
            cap = cv2.VideoCapture(ip_webcam_url)
            if cap.isOpened():
                ret, frame = cap.read()
                cap.release()
                if ret and frame is not None:
                    print("✅ IP Webcam connected successfully!")
                    return ip_webcam_url, 'ip_webcam'
            print("⚠️ IP Webcam not available")
        else:
            print("⚠️ No IP Webcam URL configured in config.py")

        # Try DroidCam (webcam index)
        droidcam_index = getattr(config, 'DROID_CAM_INDEX', 1)
        print(f"Attempting to connect to DroidCam (webcam index {droidcam_index})...")
        cap = cv2.VideoCapture(droidcam_index)
        if cap.isOpened():
            ret, frame = cap.read()
            cap.release()
            if ret and frame is not None:
                print(f"✅ DroidCam connected successfully on index {droidcam_index}!")
                return droidcam_index, 'droidcam'
        print(f"⚠️ DroidCam not available on index {droidcam_index}")

        # Fallback to video file
        if getattr(config, 'AUTO_FALLBACK', True):
            print(f"Falling back to video file: {config.VIDEO_FILE_PATH}")
            if os.path.exists(config.VIDEO_FILE_PATH):
                print("✅ Video file found")
                return config.VIDEO_FILE_PATH, 'video_file'
            else:
                print(f"❌ Error: Video file not found: {config.VIDEO_FILE_PATH}")
                return None, None
        print("❌ No valid video source available")
        return None, None

    @staticmethod
    def list_available_cameras(max_index=10):
        """
        List available camera indices (for troubleshooting webcam/DroidCam).
        """
        import cv2
        available = []
        for i in range(max_index):
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                available.append(i)
            cap.release()
        print(f"Available camera indices: {available}")
        return available
    
    def process_frame(self, frame, frame_number):
        """
        Process a single frame
        
        Args:
            frame: Input frame
            frame_number: Current frame number
            
        Returns:
            Processed frame
        """
        # Store current frame for API video feed
        self.current_frame = frame.copy()
        
        # Detect and track vehicles
        results, detections = self.vehicle_detector.detect_and_track(frame)
        
        # Update tracked vehicles count
        for det in detections:
            self.tracked_vehicle_ids.add(det['track_id'])
        
        # Skip if no vehicles detected (optimization)
        if config.SKIP_EMPTY_FRAMES and not detections:
            return frame
        
        # Extract timestamp
        timestamp = self.timestamp_reader.get_current_timestamp(frame)
        
        # Process license plates for each vehicle
        for det in detections:
            track_id = det['track_id']
            bbox = det['bbox']
            
            # Check if plate already cached
            if track_id not in self.plates_info:
                # Get plate region
                plate_region = self.vehicle_detector.get_plate_region(bbox)
                
                # Read plate
                plate_info = self.plate_reader.read_plate(frame, plate_region, track_id)
                
                if plate_info:
                    self.plates_info[track_id] = plate_info
            else:
                # Use cached plate info
                pass
        
        # Update parking slots
        slot_update = self.slot_monitor.update_slots(detections, self.plates_info, timestamp)
        
        # Update status classifier and push to Firestore
        self._update_slot_statuses()
        
        # Log parking events
        for event in slot_update['events']:
            self.logger.log_parking_event(event)
            print(f"[{timestamp}] PARKING EVENT: {event['event']} - Slot {event['slot_id']} - {event.get('plate', 'N/A')}")
        
        # Detect illegal parking
        violations = self.illegal_detector.detect_violations(
            detections, self.plates_info, frame_number, timestamp
        )
        
        for violation in violations:
            print(f"[{timestamp}] ⚠️ ILLEGAL PARKING: {violation.get('plate', 'N/A')} in zone {violation['zone_id']}")
        
        # Draw visualizations
        # 1. Draw parking slots
        frame = self.slot_monitor.draw_slots(frame)
        
        # 2. Draw illegal zones
        frame = self.illegal_detector.draw_zones(frame, detections, self.plates_info)
        
        # 3. Draw vehicle detections
        frame = self.vehicle_detector.draw_detections(frame, detections, self.plates_info)
        
        # 4. Draw timestamp and frame info
        info_text = f"Frame: {frame_number} | Time: {timestamp}"
        cv2.putText(frame, info_text, (10, frame.shape[0] - 20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return frame
    
    def _update_slot_statuses(self):
        """
        Update slot status classifier and push to Firestore
        Called after each frame's slot detection
        """
        try:
            # Update regular parking slots
            for slot_id, is_occupied in self.slot_monitor.slot_states.items():
                occupant = self.slot_monitor.slot_occupants.get(slot_id)
                plate = occupant.get('plate') if occupant else None
                
                status = self.status_classifier.classify_slot(
                    slot_id=slot_id,
                    is_occupied=(is_occupied == 'OCCUPIED'),
                    is_illegal_zone=False,
                    plate=plate
                )
                
                # Push to Firestore
                if self.firebase.initialized:
                    self.firebase.push_slot_status(slot_id, status, plate)
            
            # Update illegal zones (check active violations)
            occupied_zones = {}
            if hasattr(self.illegal_detector, 'violations'):
                for violation in self.illegal_detector.violations[-20:]:  # Last 20 violations
                    zone_id = violation.get('zone_id', violation.get('zone'))
                    if zone_id:
                        occupied_zones[zone_id] = violation.get('plate')
            
            for zone_id in self.illegal_detector.illegal_zones.keys():
                plate = occupied_zones.get(zone_id)
                is_occupied = zone_id in occupied_zones
                
                status = self.status_classifier.classify_slot(
                    slot_id=zone_id,
                    is_occupied=is_occupied,
                    is_illegal_zone=True,
                    plate=plate
                )
                
                # Push to Firestore
                if self.firebase.initialized:
                    self.firebase.push_slot_status(zone_id, status, plate)
        
        except Exception as e:
            print(f"⚠️ Error updating slot statuses: {e}")
    
    def run(self, start_api=True):
        """Main processing loop"""
        # Get video source
        self.video_source, self.video_source_type = self.get_video_source()
        
        if self.video_source is None:
            print("\n❌ Error: No valid video source available")
            print("Please check:")
            print("1. IP Webcam is running and URL is correct in config.py")
            print("2. Video file exists at the specified path")
            return
        
        # Start API server in background thread if Flask is available
        if FLASK_AVAILABLE and start_api:
            api_thread = threading.Thread(target=self.start_api_server, daemon=True)
            api_thread.start()
            print("✅ API server started on http://localhost:5000")
        
        print(f"\n{'='*60}")
        print(f"STARTING PROCESSING")
        print(f"Source: {self.video_source_type}")
        print(f"{'='*60}\n")
        
        # Open video capture
        self.video_cap = cv2.VideoCapture(self.video_source)
        
        if not self.video_cap.isOpened():
            print(f"❌ Error: Cannot open video source: {self.video_source}")
            return
        
        # Get video properties
        fps = int(self.video_cap.get(cv2.CAP_PROP_FPS)) or config.OUTPUT_FPS
        width = int(self.video_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.video_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Video properties: {width}x{height} @ {fps} FPS\n")
        
        # Prepare output video writer
        os.makedirs(os.path.dirname(config.OUTPUT_VIDEO), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*config.VIDEO_CODEC)
        out = cv2.VideoWriter(config.OUTPUT_VIDEO, fourcc, fps, (width, height))
        
        # Create display window
        if config.DISPLAY_LIVE_FEED:
            cv2.namedWindow('Druk Park - Smart Parking System', cv2.WINDOW_NORMAL)
            cv2.resizeWindow('Druk Park - Smart Parking System', config.DISPLAY_WIDTH, config.DISPLAY_HEIGHT)
        
        print("Processing started... Press 'q' to stop\n")
        
        try:
            while True:
                ret, frame = self.video_cap.read()
                
                if not ret:
                    print("\nEnd of video or connection lost")
                    break
                
                self.frame_count += 1
                
                # Process frame at intervals
                if self.frame_count % config.PROCESS_EVERY_N_FRAMES == 0:
                    processed_frame = self.process_frame(frame, self.frame_count)
                else:
                    processed_frame = frame
                    self.current_frame = frame.copy()
                
                # Write to output video
                out.write(processed_frame)
                
                # Display live feed
                if config.DISPLAY_LIVE_FEED:
                    cv2.imshow('Druk Park - Smart Parking System', processed_frame)
                    
                    key = cv2.waitKey(1) & 0xFF
                    if key == ord('q'):
                        print("\nStopping by user request...")
                        break
                
                # Progress indicator
                if self.frame_count % 100 == 0:
                    print(f"Processed {self.frame_count} frames...")
        
        except KeyboardInterrupt:
            print("\n\nStopping by keyboard interrupt...")
        
        finally:
            # Cleanup
            if self.video_cap:
                self.video_cap.release()
            out.release()
            cv2.destroyAllWindows()
            
            # Generate and save summary
            self.generate_summary(self.video_source)
            
            print(f"\n{'='*60}")
            print("PROCESSING COMPLETE")
            print(f"{'='*60}")
            print(f"Total frames processed: {self.frame_count}")
            print(f"Output video: {config.OUTPUT_VIDEO}")
            print(f"Parking log: {config.OUTPUT_LOG_CSV}")
            print(f"Summary: {config.OUTPUT_SUMMARY_JSON}")
            print(f"{'='*60}\n")
    
    def generate_summary(self, video_source):
        """Generate and save final summary"""
        timestamp_info = self.timestamp_reader.get_summary()
        parking_stats = self.slot_monitor.get_statistics()
        illegal_stats = self.illegal_detector.get_statistics()
        total_vehicles = len(self.tracked_vehicle_ids)
        
        summary = self.logger.create_summary(
            video_source,
            timestamp_info,
            parking_stats,
            illegal_stats,
            total_vehicles
        )
        
        self.logger.save_summary(summary)
        
        # Print summary
        print("\n" + "=" * 60)
        print("SESSION SUMMARY")
        print("=" * 60)
        print(f"Video Source: {summary['video_source']}")
        print(f"Start Time: {summary['start_time']}")
        print(f"End Time: {summary['end_time']}")
        print(f"Duration: {summary['total_duration_minutes']} minutes")
        print(f"\nTotal Vehicles Detected: {summary['total_vehicles_detected']}")
        print(f"\nParking Statistics:")
        print(f"  Total Slots: {summary['parking_statistics']['total_slots']}")
        print(f"  Currently Occupied: {summary['parking_statistics']['currently_occupied']}")
        print(f"  Currently Available: {summary['parking_statistics']['currently_available']}")
        print(f"  Total Events: {summary['parking_statistics']['total_parking_events']}")
        print(f"  Total Revenue: ₹{summary['parking_statistics']['total_revenue']}")
        print(f"\nIllegal Parking:")
        print(f"  Total Violations: {summary['illegal_parking']['total_violations']}")
        print("=" * 60)
    
    def start_api_server(self):
        """Start Flask API server for dashboard"""
        app = Flask(__name__)
        CORS(app)
        
        # Store reference to this system instance
        system = self
        
        @app.route('/video-feed')
        def video_feed():
            """MJPEG video stream"""
            def generate():
                while True:
                    if system.current_frame is not None:
                        # Encode frame as JPEG
                        ret, buffer = cv2.imencode('.jpg', system.current_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                        if ret:
                            frame_bytes = buffer.tobytes()
                            yield (b'--frame\r\n'
                                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                    else:
                        # Send placeholder black frame if no frame available
                        import time
                        time.sleep(0.1)  # Small delay to prevent busy waiting
                        continue
            return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')
        
        @app.route('/set-camera-url', methods=['POST'])
        def set_camera_url():
            data = request.json
            url = data.get('url', '')
            system.camera_url = url
            # Update config for next run (optional - could also save to file)
            print(f"Camera URL updated to: {url}")
            return jsonify({'success': True, 'message': 'Camera URL updated', 'url': url})
        
        @app.route('/camera-status')
        def camera_status():
            connected = False
            if system.video_cap is not None:
                connected = system.video_cap.isOpened()
            
            return jsonify({
                'connected': connected,
                'currentUrl': system.camera_url or system.video_source,
                'lastSeen': datetime.now().isoformat() + 'Z' if connected else None
            })
        
        @app.route('/calibrate', methods=['POST'])
        def calibrate():
            data = request.json
            # Save to slot_calibration.json (same format as calibrate_slots.py)
            calibration_data = {
                'parking_slots': data.get('parking_slots', {}),
                'illegal_zones': data.get('illegal_zones', {}),
                'reference_image': 'calibration_reference.jpg',
                'video_source': system.video_source or system.camera_url or ''
            }
            
            with open(CALIBRATION_FILE, 'w') as f:
                json.dump(calibration_data, f, indent=4)
            
            print(f"✅ Calibration saved to {CALIBRATION_FILE}")
            # Reload calibration in system
            slots, illegal_zones = load_calibrated_slots()
            system.slot_monitor = ParkingSlotMonitor(slots)
            system.illegal_detector = IllegalZoneDetector(illegal_zones)
            
            return jsonify({'success': True, 'message': 'Calibration saved'})
        
        @app.route('/calibration')
        def get_calibration():
            if os.path.exists(CALIBRATION_FILE):
                with open(CALIBRATION_FILE, 'r') as f:
                    return jsonify(json.load(f))
            return jsonify({'parking_slots': {}, 'illegal_zones': {}})
        
        @app.route('/slots')
        def get_slots():
            """
            Get all parking slots and illegal zones with standardized status
            
            Returns:
            {
                'slots': [
                    {
                        'slotId': 'A1',
                        'status': 'AVAILABLE|OCCUPIED|ILLEGAL_ZONE|ILLEGAL_OCCUPIED',
                        'color': '#HEX_COLOR',
                        'plate': 'License plate or null',
                        'isIllegal': bool
                    },
                    ...
                ],
                'statistics': {
                    'available': int,
                    'occupied': int,
                    'illegal_zone': int,
                    'illegal_occupied': int,
                    'total': int
                }
            }
            """
            slots_list = []
            
            # Get slot statuses from classifier (single source of truth)
            all_statuses = system.status_classifier.get_all_statuses()
            
            for slot_id, status_info in all_statuses.items():
                slot_data = {
                    'slotId': slot_id,
                    'status': status_info['status'],
                    'color': status_info['color'],
                    'plate': status_info['plate'],
                    'isIllegal': status_info['status'] in ['ILLEGAL_ZONE', 'ILLEGAL_OCCUPIED']
                }
                slots_list.append(slot_data)
            
            # Get statistics
            stats = system.status_classifier.get_statistics()
            
            return jsonify({
                'slots': slots_list,
                'statistics': stats
            })
        
        @app.route('/dashboard/stats')
        def dashboard_stats():
            parking_stats = system.slot_monitor.get_statistics()
            illegal_stats = system.illegal_detector.get_statistics()
            
            # Calculate occupancy percentage
            occupancy = 0
            if parking_stats['total_slots'] > 0:
                occupancy = (parking_stats['occupied'] / parking_stats['total_slots']) * 100
            
            # Get active violations with proper format
            active_violations_list = []
            if hasattr(system.illegal_detector, 'violations'):
                for violation in system.illegal_detector.violations[-20:]:  # Last 20 violations
                    active_violations_list.append({
                        'id': violation.get('id', str(len(active_violations_list))),
                        'zone': violation.get('zone_id', violation.get('zone', 'Unknown Zone')),
                        'license_plate': violation.get('plate', violation.get('license_plate', 'Unknown')),
                        'vehicle_type': violation.get('vehicle_type', 'Unknown'),
                        'region_name': violation.get('region', violation.get('region_name', '')),
                        'timestamp': violation.get('timestamp', datetime.now().isoformat()),
                        'duration': violation.get('duration', 'N/A')
                    })
            
            return jsonify({
                'occupancy': round(occupancy, 2),
                'totalSlots': parking_stats['total_slots'],
                'occupiedSlots': parking_stats['occupied'],
                'availableSlots': parking_stats['available'],
                'activeViolations': illegal_stats['active_violators'],
                'activeViolationsList': active_violations_list,
                'totalVehicles': len(system.tracked_vehicle_ids),
                'totalRevenue': parking_stats['total_revenue']
            })
        
        @app.route('/imem')
        def get_imem():
            """Get IMEM events from CSV"""
            csv_path = config.OUTPUT_LOG_CSV
            data = []
            
            if os.path.exists(csv_path):
                import csv
                try:
                    with open(csv_path, 'r', encoding='utf-8') as f:
                        reader = csv.DictReader(f)
                        for idx, row in enumerate(reader, 1):
                            data.append({
                                'IMEM_ID': str(idx),
                                'SlotID': row.get('SlotID', ''),
                                'Plate': row.get('Plate', ''),
                                'CameraID': 'CAM-1',
                                'Timestamp': row.get('Timestamp', ''),
                                'VehicleType': row.get('VehicleType', ''),
                                'VehicleClass': 'Car',  # Default
                                'Event': row.get('Event', ''),
                                'DurationMinutes': row.get('DurationMinutes', ''),
                                'Fee': row.get('Fee', ''),
                                'Payment': 'Paid' if row.get('Fee') else 'Pending'
                            })
                except Exception as e:
                    print(f"Error reading CSV: {e}")
            
            return jsonify(data)
        
        @app.route('/export/csv')
        def export_csv():
            csv_path = config.OUTPUT_LOG_CSV
            if os.path.exists(csv_path):
                return send_file(csv_path, as_attachment=True, download_name='parking_log.csv')
            return jsonify({'error': 'CSV file not found'}), 404
        
        @app.route('/analytics')
        def get_analytics():
            # Basic analytics - can be enhanced with time-based data
            parking_stats = system.slot_monitor.get_statistics()
            illegal_stats = system.illegal_detector.get_statistics()
            
            return jsonify({
                'occupancy24h': [],  # Could be enhanced with historical data
                'peakHours': [],
                'violationTypes': [
                    {'label': 'Illegal Zone', 'value': illegal_stats['total_violations']}
                ],
                'kpis': {
                    'averageOccupancy': 0,  # Could calculate from history
                    'peakOccupancy': 0,
                    'totalVehicles': len(system.tracked_vehicle_ids),
                    'totalViolations': illegal_stats['total_violations'],
                    'averageDwellTime': 0
                }
            })
        
        @app.route('/snapshot/<event_id>')
        def get_snapshot(event_id):
            # Return current frame as snapshot
            if system.current_frame is not None:
                ret, buffer = cv2.imencode('.jpg', system.current_frame)
                if ret:
                    return Response(buffer.tobytes(), mimetype='image/jpeg')
            return jsonify({'error': 'Snapshot not available'}), 404
        
        @app.route('/imem/<event_id>', methods=['PATCH'])
        def update_imem_event(event_id):
            data = request.json
            # For now, just return success - could implement event marking
            # In a full implementation, you would update the CSV file here
            return jsonify({'success': True, 'message': 'Event updated'})
        
        @app.route('/imem/<event_id>', methods=['DELETE'])
        def delete_imem_event(event_id):
            # In a full implementation, you would remove the event from CSV
            # For now, just return success
            return jsonify({'success': True, 'message': 'Event deleted'})
        
        # Run Flask app
        app.run(debug=False, port=5000, host='0.0.0.0', use_reloader=False)


def main():
    """Main entry point"""
    try:
        system = SmartParkingSystem()
        system.run(start_api=FLASK_AVAILABLE)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
