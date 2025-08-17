import sqlite3
import random
from datetime import datetime, timedelta
import json

def generate_sample_data():
    """Generate sample sensor data for testing"""
    
    # Connect to database
    conn = sqlite3.connect('lemos.db')
    cursor = conn.cursor()
    
    # Create tables if they don't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            area_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            mq4_1 REAL, mq4_2 REAL, mq4_3 REAL, mq4_avg REAL,
            mq7_1 REAL, mq7_2 REAL, mq7_3 REAL, mq7_avg REAL,
            temperature REAL, humidity REAL,
            ultrasonic_distance REAL,
            soil_moisture REAL,
            vibration INTEGER,
            ir_detection INTEGER
        )
    ''')
    
    # Generate data for last 7 days
    start_time = datetime.now() - timedelta(days=7)
    
    for area_id in ['1', '2', '3']:
        print(f"Generating data for Area {area_id}...")
        
        for i in range(7 * 24 * 2):  # Every 30 minutes for 7 days
            timestamp = start_time + timedelta(minutes=30 * i)
            
            # Generate realistic sensor values with some variation
            base_mq4 = 400 + random.gauss(0, 50)  # Base methane level
            base_mq7 = 10 + random.gauss(0, 2)    # Base CO level
            base_temp = 25 + random.gauss(0, 5)   # Base temperature
            
            # Add some daily patterns
            hour = timestamp.hour
            if 10 <= hour <= 16:  # Daytime heating
                base_temp += 5
                base_mq4 += 50
            
            # Occasional spikes for testing alerts
            if random.random() < 0.02:  # 2% chance of spike
                base_mq4 *= 2.5
                base_mq7 *= 3
            
            # Generate individual sensor readings
            mq4_1 = max(200, base_mq4 + random.gauss(0, 20))
            mq4_2 = max(200, base_mq4 + random.gauss(0, 20))
            mq4_3 = max(200, base_mq4 + random.gauss(0, 20))
            mq4_avg = (mq4_1 + mq4_2 + mq4_3) / 3
            
            mq7_1 = max(5, base_mq7 + random.gauss(0, 2))
            mq7_2 = max(5, base_mq7 + random.gauss(0, 2))
            mq7_3 = max(5, base_mq7 + random.gauss(0, 2))
            mq7_avg = (mq7_1 + mq7_2 + mq7_3) / 3
            
            temperature = base_temp + random.gauss(0, 2)
            humidity = max(20, min(90, 50 + random.gauss(0, 10)))
            ultrasonic_distance = 100 + random.gauss(0, 10)
            soil_moisture = 500 + random.gauss(0, 50)
            vibration = 1 if random.random() < 0.05 else 0
            ir_detection = 1 if random.random() < 0.1 else 0
            
            # Insert data
            cursor.execute('''
                INSERT INTO sensor_data (
                    area_id, timestamp, mq4_1, mq4_2, mq4_3, mq4_avg,
                    mq7_1, mq7_2, mq7_3, mq7_avg,
                    temperature, humidity, ultrasonic_distance,
                    soil_moisture, vibration, ir_detection
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                area_id, timestamp.isoformat(),
                mq4_1, mq4_2, mq4_3, mq4_avg,
                mq7_1, mq7_2, mq7_3, mq7_avg,
                temperature, humidity, ultrasonic_distance,
                soil_moisture, vibration, ir_detection
            ))
    
    conn.commit()
    conn.close()
    print("Sample data generation complete!")

if __name__ == "__main__":
    generate_sample_data()
