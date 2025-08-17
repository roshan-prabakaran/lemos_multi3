from datetime import datetime
import json
from typing import Dict, Any

class DataProcessor:
    def __init__(self):
        self.calibration_factors = {
            'methane': 1.0,
            'co': 1.0,
            'temperature': 1.0,
            'humidity': 1.0,
            'water_level': 1.0
        }
    
    def process_reading(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process and validate sensor reading"""
        try:
            # Add timestamp if not present
            if 'timestamp' not in raw_data:
                raw_data['timestamp'] = datetime.now().isoformat()
            
            # Apply calibration factors
            processed_data = {
                'area_id': int(raw_data['area_id']),
                'methane': self.calibrate_value(raw_data['methane'], 'methane'),
                'co': self.calibrate_value(raw_data['co'], 'co'),
                'temperature': self.calibrate_value(raw_data['temperature'], 'temperature'),
                'humidity': self.calibrate_value(raw_data['humidity'], 'humidity'),
                'water_level': self.calibrate_value(raw_data['water_level'], 'water_level'),
                'timestamp': raw_data['timestamp']
            }
            
            # Validate ranges
            processed_data = self.validate_ranges(processed_data)
            
            return processed_data
            
        except Exception as e:
            raise ValueError(f"Data processing failed: {e}")
    
    def calibrate_value(self, value: float, sensor_type: str) -> float:
        """Apply calibration factor to sensor value"""
        try:
            calibrated = float(value) * self.calibration_factors.get(sensor_type, 1.0)
            return round(calibrated, 2)
        except (ValueError, TypeError):
            return 0.0
    
    def validate_ranges(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate sensor values are within reasonable ranges"""
        # Define reasonable ranges for each sensor
        ranges = {
            'methane': (0, 10000),      # ppm
            'co': (0, 1000),            # ppm
            'temperature': (-40, 85),    # celsius
            'humidity': (0, 100),        # percentage
            'water_level': (0, 100)      # percentage
        }
        
        for key, (min_val, max_val) in ranges.items():
            if key in data:
                value = data[key]
                if value < min_val or value > max_val:
                    print(f"Warning: {key} value {value} outside normal range ({min_val}-{max_val})")
                    # Clamp to valid range
                    data[key] = max(min_val, min(max_val, value))
        
        return data
    
    def update_calibration(self, sensor_type: str, factor: float):
        """Update calibration factor for a sensor type"""
        if sensor_type in self.calibration_factors:
            self.calibration_factors[sensor_type] = factor
            print(f"Updated {sensor_type} calibration factor to {factor}")
        else:
            print(f"Unknown sensor type: {sensor_type}")
