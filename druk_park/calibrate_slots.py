"""
Interactive Parking Slot Calibration Tool
Allows users to define parking slot coordinates by clicking on a reference frame
"""
import cv2
import json
import os
import sys


class SlotCalibrator:
    def __init__(self, video_source):
        """
        Initialize slot calibrator
        
        Args:
            video_source: Path to video file or IP webcam URL
        """
        self.video_source = video_source
        self.slots = {}
        self.illegal_zones = {}
        self.current_points = []
        self.current_mode = 'slot'  # 'slot' or 'illegal'
        self.current_id = None
        self.reference_frame = None
        self.drawing = False
        
        print("=" * 60)
        print("PARKING SLOT CALIBRATION TOOL")
        print("=" * 60)
    
    def mouse_callback(self, event, x, y, flags, param):
        """Handle mouse events for drawing rectangles"""
        if event == cv2.EVENT_LBUTTONDOWN:
            self.current_points.append((x, y))
            self.drawing = True
            
        elif event == cv2.EVENT_MOUSEMOVE and self.drawing:
            # Show preview while drawing
            temp_frame = self.reference_frame.copy()
            if len(self.current_points) == 1:
                cv2.rectangle(temp_frame, self.current_points[0], (x, y), (0, 255, 0), 2)
                cv2.imshow('Calibration', temp_frame)
        
        elif event == cv2.EVENT_LBUTTONUP:
            if len(self.current_points) == 1:
                self.current_points.append((x, y))
                self.drawing = False
                
                # Get slot/zone ID
                if self.current_mode == 'slot':
                    slot_id = input(f"\nEnter Slot ID (e.g., A1, A2, B1): ").strip()
                    if slot_id:
                        x1, y1 = self.current_points[0]
                        x2, y2 = self.current_points[1]
                        # Ensure proper ordering
                        x1, x2 = min(x1, x2), max(x1, x2)
                        y1, y2 = min(y1, y2), max(y1, y2)
                        self.slots[slot_id] = (x1, y1, x2, y2)
                        print(f"✅ Added slot {slot_id}: ({x1}, {y1}, {x2}, {y2})")
                else:
                    zone_id = input(f"\nEnter Illegal Zone ID (e.g., A3, NO_PARK_1): ").strip()
                    if zone_id:
                        x1, y1 = self.current_points[0]
                        x2, y2 = self.current_points[1]
                        # Ensure proper ordering
                        x1, x2 = min(x1, x2), max(x1, x2)
                        y1, y2 = min(y1, y2), max(y1, y2)
                        self.illegal_zones[zone_id] = (x1, y1, x2, y2)
                        print(f"✅ Added illegal zone {zone_id}: ({x1}, {y1}, {x2}, {y2})")
                
                # Reset points
                self.current_points = []
                
                # Redraw all slots/zones
                self.redraw()
    
    def redraw(self):
        """Redraw all slots and zones on reference frame"""
        display = self.reference_frame.copy()
        
        # Draw parking slots in green
        for slot_id, coords in self.slots.items():
            x1, y1, x2, y2 = coords
            cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(display, slot_id, (x1 + 5, y1 + 25),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Draw illegal zones in red
        for zone_id, coords in self.illegal_zones.items():
            x1, y1, x2, y2 = coords
            cv2.rectangle(display, (x1, y1), (x2, y2), (0, 0, 255), 2)
            cv2.putText(display, zone_id, (x1 + 5, y1 + 25),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        # Draw instructions
        instructions = [
            f"MODE: {self.current_mode.upper()}",
            "Click and drag to define rectangles",
            "Press 's' for SLOT mode (green)",
            "Press 'i' for ILLEGAL ZONE mode (red)",
            "Press 'd' to delete last entry",
            "Press 'c' to clear all",
            "Press 'q' to finish and save"
        ]
        
        y_offset = 30
        for i, text in enumerate(instructions):
            color = (0, 255, 0) if i == 0 and self.current_mode == 'slot' else (0, 0, 255) if i == 0 else (255, 255, 255)
            cv2.putText(display, text, (10, y_offset + i * 25),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        cv2.imshow('Calibration', display)
    
    def get_reference_frame(self):
        """Extract reference frame from video source"""
        print(f"Opening video source: {self.video_source}")
        
        cap = cv2.VideoCapture(self.video_source)
        
        if not cap.isOpened():
            print(f"❌ Error: Cannot open video source: {self.video_source}")
            print("\nTroubleshooting:")
            print("1. For IP Webcam: Ensure phone and PC are on same network")
            print("2. Test URL in browser first (should show video stream)")
            print("3. For video files: Use full path like 'D:\\Videos\\demo.mp4'")
            return False
        
        # Read first frame (may need multiple attempts for streaming)
        ret, frame = None, None
        for _ in range(5):  # Try up to 5 times
            ret, frame = cap.read()
            if ret and frame is not None:
                break
        
        cap.release()
        
        if not ret or frame is None:
            print("❌ Error: Cannot read frame from video source")
            return False
        
        self.reference_frame = frame.copy()
        
        # Save reference image
        cv2.imwrite('calibration_reference.jpg', frame)
        print("✅ Reference frame captured and saved as 'calibration_reference.jpg'")
        
        return True
    
    def run(self):
        """Run the calibration tool"""
        # Get reference frame
        if not self.get_reference_frame():
            return
        
        # Create window and set mouse callback
        cv2.namedWindow('Calibration', cv2.WINDOW_NORMAL)
        cv2.resizeWindow('Calibration', 1280, 720)
        cv2.setMouseCallback('Calibration', self.mouse_callback)
        
        print("\n" + "=" * 60)
        print("INSTRUCTIONS:")
        print("=" * 60)
        print("1. Click and drag to draw rectangles for parking slots/zones")
        print("2. Press 's' to switch to SLOT mode (green)")
        print("3. Press 'i' to switch to ILLEGAL ZONE mode (red)")
        print("4. Press 'd' to delete the last entry")
        print("5. Press 'c' to clear all entries")
        print("6. Press 'q' when finished to save configuration")
        print("=" * 60 + "\n")
        
        # Initial display
        self.redraw()
        
        # Main loop
        while True:
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('s'):
                self.current_mode = 'slot'
                print("Switched to SLOT mode (green)")
                self.redraw()
            
            elif key == ord('i'):
                self.current_mode = 'illegal'
                print("Switched to ILLEGAL ZONE mode (red)")
                self.redraw()
            
            elif key == ord('d'):
                if self.current_mode == 'slot' and self.slots:
                    last_slot = list(self.slots.keys())[-1]
                    del self.slots[last_slot]
                    print(f"Deleted slot: {last_slot}")
                elif self.current_mode == 'illegal' and self.illegal_zones:
                    last_zone = list(self.illegal_zones.keys())[-1]
                    del self.illegal_zones[last_zone]
                    print(f"Deleted zone: {last_zone}")
                self.redraw()
            
            elif key == ord('c'):
                self.slots = {}
                self.illegal_zones = {}
                print("Cleared all entries")
                self.redraw()
            
            elif key == ord('q'):
                break
        
        cv2.destroyAllWindows()
        
        # Save configuration
        self.save_configuration()
    
    def save_configuration(self):
        """Save slot and zone configuration to JSON"""
        if not self.slots and not self.illegal_zones:
            print("⚠️ No slots or zones defined. Configuration not saved.")
            return
        
        config_data = {
            'parking_slots': self.slots,
            'illegal_zones': self.illegal_zones,
            'reference_image': 'calibration_reference.jpg',
            'video_source': self.video_source
        }
        
        output_file = 'slot_calibration.json'
        
        with open(output_file, 'w') as f:
            json.dump(config_data, f, indent=4)
        
        print("\n" + "=" * 60)
        print("CALIBRATION COMPLETE!")
        print("=" * 60)
        print(f"✅ Configuration saved to: {output_file}")
        print(f"✅ Reference image saved to: calibration_reference.jpg")
        print(f"\nDefined {len(self.slots)} parking slots:")
        for slot_id, coords in self.slots.items():
            print(f"   {slot_id}: {coords}")
        print(f"\nDefined {len(self.illegal_zones)} illegal zones:")
        for zone_id, coords in self.illegal_zones.items():
            print(f"   {zone_id}: {coords}")
        print("\nTo use this configuration, update config.py with these coordinates.")
        print("=" * 60)


def main():
    """Main function for calibration tool"""
    print("\n" + "=" * 60)
    print("PARKING SLOT CALIBRATION TOOL")
    print("=" * 60 + "\n")
    
    # Get video source
    video_source = input("Enter video source (file path or IP webcam URL): ").strip()
    
    if not video_source:
        print("❌ Error: No video source provided")
        return
    
    # Run calibrator
    calibrator = SlotCalibrator(video_source)
    calibrator.run()


if __name__ == "__main__":
    main()
