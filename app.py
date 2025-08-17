from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime, timedelta
import threading
import time
from services.database import DatabaseManager
from services.sms_service import SMSService
from ml.forecasting import ForecastingModel
from ingestion.data_processor import DataProcessor

app = Flask(__name__)
CORS(app)

# Initialize services
db_manager = DatabaseManager()
sms_service = SMSService()
forecasting_model = ForecastingModel()
data_processor = DataProcessor()

# Global variables for real-time monitoring
latest_readings = {}
alert_thresholds = {
    'methane': 1000,  # ppm
    'co': 50,         # ppm
    'temperature': 35, # celsius
    'humidity': 80     # percentage
}

@app.route('/')
def dashboard():
    """Main dashboard page"""
    return render_template('dashboard.html')

@app.route('/api/readings', methods=['POST'])
def receive_readings():
    """Receive sensor readings from Arduino"""
    try:
        data = request.get_json()
        
        print(f"Received data: {data}")
        
        if 'area_1' in data and 'area_2' in data and 'area_3' in data:
            # Multi-zone format from single ESP32
            processed_readings = []
            
            for area_key in ['area_1', 'area_2', 'area_3']:
                area_data = data[area_key]
                
                # Add shared sensor data to each area
                area_data['water_level'] = data.get('water_level', 0)
                area_data['soil_moisture'] = data.get('soil_moisture', 0)
                area_data['vibration'] = data.get('vibration', 0)
                area_data['ir_detection'] = data.get('ir_detection', 0)
                area_data['timestamp'] = data.get('timestamp', datetime.now().isoformat())
                area_data['device_id'] = data.get('device_id', 'ESP32_MultiZone')
                
                # Process and store each area's data
                processed_data = data_processor.process_reading(area_data)
                db_manager.store_reading(processed_data)
                processed_readings.append(processed_data)
                
                # Update latest readings
                latest_readings[area_data['area_id']] = processed_data
                
                # Check for alerts
                check_alerts(processed_data)
                
                print(f"Successfully stored reading for area {area_data['area_id']}")
            
            return jsonify({
                'status': 'success', 
                'message': f'Multi-zone readings stored successfully for {len(processed_readings)} areas',
                'areas_processed': [r['area_id'] for r in processed_readings]
            })
        
        else:
            # Single-zone format (backward compatibility)
            required_fields = ['area_id', 'methane', 'co', 'temperature', 'humidity', 'water_level']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"Missing required fields: {missing_fields}")
                return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400
            
            # Process and store data
            processed_data = data_processor.process_reading(data)
            db_manager.store_reading(processed_data)
            
            # Update latest readings
            latest_readings[data['area_id']] = processed_data
            
            print(f"Successfully stored reading for area {data['area_id']}")
            
            # Check for alerts
            check_alerts(processed_data)
            
            return jsonify({'status': 'success', 'message': 'Reading stored successfully'})
    
    except Exception as e:
        print(f"Error processing reading: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/readings')
def get_readings():
    """Get recent sensor readings"""
    try:
        hours = request.args.get('hours', 24, type=int)
        area_id = request.args.get('area_id')
        
        readings = db_manager.get_readings(hours=hours, area_id=area_id)
        return jsonify(readings)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast')
def get_forecast():
    """Get ML forecast for gas levels"""
    try:
        area_id = request.args.get('area_id', type=int)
        hours = request.args.get('hours', 48, type=int)
        
        if not area_id:
            return jsonify({'error': 'area_id is required'}), 400
        
        # Get historical data for forecasting
        historical_data = db_manager.get_readings(hours=168, area_id=area_id)  # 1 week
        
        if len(historical_data) < 10:
            return jsonify({'error': 'Insufficient historical data for forecasting'}), 400
        
        # Generate forecast
        forecast = forecasting_model.predict(historical_data, hours=hours)
        
        return jsonify(forecast)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/alerts')
def get_alerts():
    """Get recent alerts"""
    try:
        hours = request.args.get('hours', 24, type=int)
        alerts = db_manager.get_alerts(hours=hours)
        return jsonify(alerts)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/thresholds', methods=['GET', 'POST'])
def manage_thresholds():
    """Get or update alert thresholds"""
    global alert_thresholds
    
    if request.method == 'GET':
        return jsonify(alert_thresholds)
    
    elif request.method == 'POST':
        try:
            new_thresholds = request.get_json()
            alert_thresholds.update(new_thresholds)
            return jsonify({'status': 'success', 'thresholds': alert_thresholds})
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/status')
def system_status():
    """Get system status and latest readings"""
    try:
        total_areas = len(latest_readings)
        active_alerts = sum(1 for reading in latest_readings.values() 
                          if (reading.get('methane', 0) > alert_thresholds['methane'] or 
                              reading.get('co', 0) > alert_thresholds['co']))
        
        status = {
            'server_time': datetime.now().isoformat(),
            'latest_readings': latest_readings,
            'database_connected': True,
            'areas_monitored': list(latest_readings.keys()),
            'total_areas': total_areas,
            'active_alerts': active_alerts,
            'system_mode': 'multi-zone' if total_areas > 1 else 'single-zone'
        }
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/current/<int:area_id>')
def get_current_reading(area_id):
    """Get current/latest reading for specific area"""
    try:
        # Get the most recent reading for this area
        readings = db_manager.get_readings(hours=1, area_id=area_id)
        
        if not readings:
            return jsonify({'error': 'No recent readings found'}), 404
        
        # Return the most recent reading
        latest = readings[0]
        return jsonify(latest)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast/<int:area_id>')
def get_area_forecast(area_id):
    """Get forecast for specific area (alternative endpoint)"""
    try:
        hours = request.args.get('hours', 48, type=int)
        
        # Get historical data for forecasting
        historical_data = db_manager.get_readings(hours=168, area_id=area_id)  # 1 week
        
        if len(historical_data) < 10:
            return jsonify({'error': 'Insufficient historical data for forecasting'}), 400
        
        # Generate forecast
        forecast = forecasting_model.predict(historical_data, hours=hours)
        
        return jsonify(forecast)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def check_alerts(reading):
    """Check if reading exceeds thresholds and send alerts"""
    alerts = []
    
    # Check methane levels
    if reading['methane'] > alert_thresholds['methane']:
        alert = {
            'type': 'methane',
            'area_id': reading['area_id'],
            'value': reading['methane'],
            'threshold': alert_thresholds['methane'],
            'severity': 'high' if reading['methane'] > alert_thresholds['methane'] * 1.5 else 'medium',
            'timestamp': reading['timestamp']
        }
        alerts.append(alert)
    
    # Check CO levels
    if reading['co'] > alert_thresholds['co']:
        alert = {
            'type': 'co',
            'area_id': reading['area_id'],
            'value': reading['co'],
            'threshold': alert_thresholds['co'],
            'severity': 'high' if reading['co'] > alert_thresholds['co'] * 1.5 else 'medium',
            'timestamp': reading['timestamp']
        }
        alerts.append(alert)
    
    # Store alerts and send notifications
    for alert in alerts:
        db_manager.store_alert(alert)
        
        message = f"LEMOS ALERT: {alert['type'].upper()} level {alert['value']} exceeds threshold {alert['threshold']} in Area {alert['area_id']}"
        sms_service.send_alert(message, alert['severity'], alert['area_id'])

def background_monitoring():
    """Background task for continuous monitoring and forecasting"""
    while True:
        try:
            # Run forecasting for all areas every hour
            for area_id in [1, 2, 3]:
                historical_data = db_manager.get_readings(hours=168, area_id=area_id)
                if len(historical_data) >= 10:
                    forecast = forecasting_model.predict(historical_data, hours=48)
                    
                    # Check if forecast predicts dangerous levels
                    for point in forecast:
                        if (point['methane'] > alert_thresholds['methane'] or 
                            point['co'] > alert_thresholds['co']):
                            
                            alert = {
                                'type': 'forecast_warning',
                                'area_id': area_id,
                                'predicted_time': point['timestamp'],
                                'predicted_values': {
                                    'methane': point['methane'],
                                    'co': point['co']
                                },
                                'timestamp': datetime.now().isoformat()
                            }
                            
                            db_manager.store_alert(alert)
                            message = f"LEMOS FORECAST WARNING: Dangerous levels predicted for Area {area_id} at {point['timestamp']}"
                            sms_service.send_alert(message, 'medium', area_id)
            
            time.sleep(3600)  # Run every hour
            
        except Exception as e:
            print(f"Background monitoring error: {e}")
            time.sleep(300)  # Wait 5 minutes before retrying

if __name__ == '__main__':
    # Initialize database
    db_manager.init_database()
    
    # Start background monitoring thread
    monitoring_thread = threading.Thread(target=background_monitoring, daemon=True)
    monitoring_thread.start()
    
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
