import sqlite3
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class DatabaseManager:
    def __init__(self, db_path='lemos.db'):
        self.db_path = db_path
    
    def init_database(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Sensor readings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                area_id INTEGER NOT NULL,
                methane REAL NOT NULL,
                co REAL NOT NULL,
                temperature REAL NOT NULL,
                humidity REAL NOT NULL,
                water_level REAL NOT NULL,
                timestamp TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Alerts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                area_id INTEGER NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                data TEXT,
                timestamp TEXT NOT NULL,
                acknowledged BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_readings_area_time ON readings(area_id, timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts(timestamp)')
        
        conn.commit()
        conn.close()
    
    def store_reading(self, reading: Dict):
        """Store sensor reading in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        print(f"Storing reading in database: {reading}")
        
        cursor.execute('''
            INSERT INTO readings (area_id, methane, co, temperature, humidity, water_level, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            reading['area_id'],
            reading['methane'],
            reading['co'],
            reading['temperature'],
            reading['humidity'],
            reading['water_level'],
            reading['timestamp']
        ))
        
        conn.commit()
        print(f"Successfully stored reading for area {reading['area_id']}")
        conn.close()
    
    def get_readings(self, hours: int = 24, area_id: Optional[int] = None) -> List[Dict]:
        """Get sensor readings from the last N hours"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Calculate time threshold
        time_threshold = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        if area_id:
            cursor.execute('''
                SELECT * FROM readings 
                WHERE area_id = ? AND timestamp >= ?
                ORDER BY timestamp DESC
            ''', (area_id, time_threshold))
        else:
            cursor.execute('''
                SELECT * FROM readings 
                WHERE timestamp >= ?
                ORDER BY timestamp DESC
            ''', (time_threshold,))
        
        columns = [desc[0] for desc in cursor.description]
        readings = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        return readings
    
    def store_alert(self, alert: Dict):
        """Store alert in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO alerts (type, area_id, severity, message, data, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            alert['type'],
            alert.get('area_id', 0),
            alert.get('severity', 'medium'),
            json.dumps(alert),
            json.dumps(alert),
            alert['timestamp']
        ))
        
        conn.commit()
        conn.close()
    
    def get_alerts(self, hours: int = 24) -> List[Dict]:
        """Get alerts from the last N hours"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        time_threshold = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        cursor.execute('''
            SELECT * FROM alerts 
            WHERE timestamp >= ?
            ORDER BY timestamp DESC
        ''', (time_threshold,))
        
        columns = [desc[0] for desc in cursor.description]
        alerts = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        return alerts
    
    def cleanup_old_data(self, days: int = 30):
        """Clean up old data to prevent database bloat"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        time_threshold = (datetime.now() - timedelta(days=days)).isoformat()
        
        cursor.execute('DELETE FROM readings WHERE timestamp < ?', (time_threshold,))
        cursor.execute('DELETE FROM alerts WHERE timestamp < ?', (time_threshold,))
        
        conn.commit()
        conn.close()
