import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from datetime import datetime, timedelta
import joblib
import os
from typing import List, Dict

class ForecastingModel:
    def __init__(self):
        self.methane_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.co_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_path = 'models/'
        
        # Create models directory if it doesn't exist
        os.makedirs(self.model_path, exist_ok=True)
        
        # Try to load existing models
        self.load_models()
    
    def prepare_features(self, data: List[Dict]) -> np.ndarray:
        """Prepare features for ML model"""
        if len(data) < 5:
            raise ValueError("Insufficient data for feature preparation")
        
        df = pd.DataFrame(data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        
        features = []
        
        for i in range(4, len(df)):
            # Time-based features
            current_time = df.iloc[i]['timestamp']
            hour = current_time.hour
            day_of_week = current_time.weekday()
            
            # Historical values (last 4 readings)
            methane_history = df.iloc[i-4:i]['methane'].values
            co_history = df.iloc[i-4:i]['co'].values
            temp_history = df.iloc[i-4:i]['temperature'].values
            humidity_history = df.iloc[i-4:i]['humidity'].values
            
            # Statistical features
            methane_mean = np.mean(methane_history)
            methane_std = np.std(methane_history)
            methane_trend = methane_history[-1] - methane_history[0]
            
            co_mean = np.mean(co_history)
            co_std = np.std(co_history)
            co_trend = co_history[-1] - co_history[0]
            
            temp_mean = np.mean(temp_history)
            humidity_mean = np.mean(humidity_history)
            
            # Current environmental conditions
            current_temp = df.iloc[i]['temperature']
            current_humidity = df.iloc[i]['humidity']
            current_water_level = df.iloc[i]['water_level']
            
            feature_row = [
                hour, day_of_week,
                methane_mean, methane_std, methane_trend,
                co_mean, co_std, co_trend,
                temp_mean, humidity_mean,
                current_temp, current_humidity, current_water_level
            ]
            
            features.append(feature_row)
        
        return np.array(features)
    
    def train(self, data: List[Dict]):
        """Train the forecasting models"""
        if len(data) < 20:
            print("Insufficient data for training. Need at least 20 readings.")
            return
        
        try:
            # Prepare features and targets
            features = self.prepare_features(data)
            
            df = pd.DataFrame(data)
            df = df.sort_values('timestamp')
            
            # Targets are the next values after the feature window
            methane_targets = df.iloc[4:]['methane'].values
            co_targets = df.iloc[4:]['co'].values
            
            # Scale features
            features_scaled = self.scaler.fit_transform(features)
            
            # Split data for training
            X_train, X_test, y_methane_train, y_methane_test = train_test_split(
                features_scaled, methane_targets, test_size=0.2, random_state=42
            )
            
            _, _, y_co_train, y_co_test = train_test_split(
                features_scaled, co_targets, test_size=0.2, random_state=42
            )
            
            # Train models
            self.methane_model.fit(X_train, y_methane_train)
            self.co_model.fit(X_train, y_co_train)
            
            # Evaluate models
            methane_score = self.methane_model.score(X_test, y_methane_test)
            co_score = self.co_model.score(X_test, y_co_test)
            
            print(f"Model training completed. Methane R²: {methane_score:.3f}, CO R²: {co_score:.3f}")
            
            self.is_trained = True
            self.save_models()
            
        except Exception as e:
            print(f"Training failed: {e}")
    
    def predict(self, historical_data: List[Dict], hours: int = 48) -> List[Dict]:
        """Generate forecast for the next N hours"""
        if not self.is_trained:
            # Try to train with available data
            self.train(historical_data)
            
            if not self.is_trained:
                # Return simple trend-based forecast as fallback
                return self.simple_forecast(historical_data, hours)
        
        try:
            # Use the last few readings as starting point
            recent_data = historical_data[-10:] if len(historical_data) >= 10 else historical_data
            
            forecast = []
            current_time = datetime.fromisoformat(recent_data[-1]['timestamp'])
            
            # Generate predictions for each hour
            for hour in range(1, hours + 1):
                future_time = current_time + timedelta(hours=hour)
                
                # Prepare features for prediction
                if len(recent_data) >= 4:
                    features = self.prepare_features(recent_data)
                    if len(features) > 0:
                        features_scaled = self.scaler.transform([features[-1]])
                        
                        # Predict values
                        methane_pred = self.methane_model.predict(features_scaled)[0]
                        co_pred = self.co_model.predict(features_scaled)[0]
                        
                        # Ensure predictions are non-negative
                        methane_pred = max(0, methane_pred)
                        co_pred = max(0, co_pred)
                        
                        prediction = {
                            'timestamp': future_time.isoformat(),
                            'methane': round(methane_pred, 2),
                            'co': round(co_pred, 2),
                            'confidence': 0.8 - (hour * 0.01)  # Decreasing confidence over time
                        }
                        
                        forecast.append(prediction)
                        
                        # Add prediction to recent_data for next iteration
                        recent_data.append({
                            'timestamp': future_time.isoformat(),
                            'methane': methane_pred,
                            'co': co_pred,
                            'temperature': recent_data[-1]['temperature'],  # Assume stable
                            'humidity': recent_data[-1]['humidity'],
                            'water_level': recent_data[-1]['water_level']
                        })
            
            return forecast
            
        except Exception as e:
            print(f"Prediction failed: {e}")
            return self.simple_forecast(historical_data, hours)
    
    def simple_forecast(self, data: List[Dict], hours: int) -> List[Dict]:
        """Simple trend-based forecast as fallback"""
        if len(data) < 2:
            return []
        
        # Calculate simple trends
        recent = data[-5:] if len(data) >= 5 else data
        
        methane_values = [r['methane'] for r in recent]
        co_values = [r['co'] for r in recent]
        
        methane_trend = (methane_values[-1] - methane_values[0]) / len(methane_values)
        co_trend = (co_values[-1] - co_values[0]) / len(co_values)
        
        forecast = []
        current_time = datetime.fromisoformat(data[-1]['timestamp'])
        
        for hour in range(1, hours + 1):
            future_time = current_time + timedelta(hours=hour)
            
            # Simple linear extrapolation
            methane_pred = max(0, methane_values[-1] + (methane_trend * hour))
            co_pred = max(0, co_values[-1] + (co_trend * hour))
            
            prediction = {
                'timestamp': future_time.isoformat(),
                'methane': round(methane_pred, 2),
                'co': round(co_pred, 2),
                'confidence': 0.5  # Lower confidence for simple forecast
            }
            
            forecast.append(prediction)
        
        return forecast
    
    def save_models(self):
        """Save trained models to disk"""
        try:
            joblib.dump(self.methane_model, os.path.join(self.model_path, 'methane_model.pkl'))
            joblib.dump(self.co_model, os.path.join(self.model_path, 'co_model.pkl'))
            joblib.dump(self.scaler, os.path.join(self.model_path, 'scaler.pkl'))
            print("Models saved successfully")
        except Exception as e:
            print(f"Failed to save models: {e}")
    
    def load_models(self):
        """Load trained models from disk"""
        try:
            methane_path = os.path.join(self.model_path, 'methane_model.pkl')
            co_path = os.path.join(self.model_path, 'co_model.pkl')
            scaler_path = os.path.join(self.model_path, 'scaler.pkl')
            
            if all(os.path.exists(path) for path in [methane_path, co_path, scaler_path]):
                self.methane_model = joblib.load(methane_path)
                self.co_model = joblib.load(co_path)
                self.scaler = joblib.load(scaler_path)
                self.is_trained = True
                print("Models loaded successfully")
            
        except Exception as e:
            print(f"Failed to load models: {e}")
            self.is_trained = False
