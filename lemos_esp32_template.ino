#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>
#include <sys/time.h>

// WiFi credentials
const char* ssid = "GNXS82508446";
const char* password = "B43D08494FD8";

// Server configuration
const char* serverURL = "https://lemos-multi-forecasting.onrender.com//api/readings"; // Change IP to your Flask server IP
const String areaId = "1"; // Change for different areas

// NTP server configuration
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 3600;

// Pin definitions based on your configuration
// MQ-4 Gas Sensors (Methane)
const int MQ4_PIN_1 = 33;  // GPIO34 (A0)
const int MQ4_PIN_2 = 39;  // GPIO35 (A1)
const int MQ4_PIN_3 = 32;  // GPIO32 (A2)

// MQ-7 Gas Sensors (Carbon Monoxide)
const int MQ7_PIN_1 = 35;  // GPIO33 (A3)
const int MQ7_PIN_2 = 34;  // GPIO36 (A4)
const int MQ7_PIN_3 = 36;  // GPIO39 (A5)

// DHT11 Temperature & Humidity Sensors
const int DHT_PIN_1 = 25;   // GPIO4
const int DHT_PIN_2 = 26;  // GPIO16
const int DHT_PIN_3 = 27;  // GPIO17

// Ultrasonic Sensor (HC-SR04)
const int TRIG_PIN = 4;   // GPIO25
const int ECHO_PIN = 5;   // GPIO26

// Other sensors
const int SOIL_MOISTURE_PIN =14;  // GPIO27 (A6)
const int VIBRATION_PIN =18;      // GPIO14
const int IR_SENSOR_PIN =19;      // GPIO13
const int BUZZER_PIN =2;         // GPIO23

// I2C LCD (16x2 or 20x4)
const int SDA_PIN = 21;    // GPIO21
const int SCL_PIN = 22;    // GPIO22

// Initialize sensors
DHT dht1(DHT_PIN_1, DHT11);
DHT dht2(DHT_PIN_2, DHT11);
DHT dht3(DHT_PIN_3, DHT11);
LiquidCrystal_I2C lcd(0x27, 20, 4); // Adjust address if needed

// Sensor calibration values
float MQ4_R0 = 10.0;  // Calibrate in clean air
float MQ7_R0 = 10.0;  // Calibrate in clean air

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
const unsigned long SENSOR_INTERVAL = 5000;  // Read sensors every 5 seconds
const unsigned long SEND_INTERVAL = 30000;   // Send data every 30 seconds

// Data storage
struct SensorData {
  float mq4_1, mq4_2, mq4_3;
  float mq7_1, mq7_2, mq7_3;
  float temperature, humidity;
  float ultrasonic_distance;
  int soil_moisture;
  bool vibration;
  bool ir_detection;
};

SensorData currentData;
bool alertActive = false;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(VIBRATION_PIN, INPUT);
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Initialize I2C for LCD
  Wire.begin(SDA_PIN, SCL_PIN);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("LEMOS System Init...");
  
  // Initialize DHT sensors
  dht1.begin();
  dht2.begin();
  dht3.begin();
  
  // Connect to WiFi
  connectToWiFi();
  
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("Waiting for NTP time sync...");
  
  // Display ready message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LEMOS Area " + areaId);
  lcd.setCursor(0, 1);
  lcd.print("System Ready");
  
  Serial.println("LEMOS ESP32 System Ready");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read sensors periodically
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
    readAllSensors();
    updateLCDDisplay();
    checkAlertConditions();
    lastSensorRead = currentTime;
  }
  
  // Send data to server periodically
  if (currentTime - lastDataSend >= SEND_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED) {
      sendDataToServer();
    } else {
      connectToWiFi();
    }
    lastDataSend = currentTime;
  }
  
  delay(100);
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  lcd.setCursor(0, 2);
  lcd.print("Connecting WiFi...");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    lcd.setCursor(0, 2);
    lcd.print("WiFi: Connected    ");
  } else {
    Serial.println("\nWiFi connection failed!");
    lcd.setCursor(0, 2);
    lcd.print("WiFi: Failed       ");
  }
}

void readAllSensors() {
  // Read MQ-4 sensors (Methane)
  currentData.mq4_1 = readMQ4(MQ4_PIN_1);
  currentData.mq4_2 = readMQ4(MQ4_PIN_2);
  currentData.mq4_3 = readMQ4(MQ4_PIN_3);
  
  // Read MQ-7 sensors (Carbon Monoxide)
  currentData.mq7_1 = readMQ7(MQ7_PIN_1);
  currentData.mq7_2 = readMQ7(MQ7_PIN_2);
  currentData.mq7_3 = readMQ7(MQ7_PIN_3);
  
  // Read DHT sensors (average of 3 sensors)
  float temp1 = dht1.readTemperature();
  float temp2 = dht2.readTemperature();
  float temp3 = dht3.readTemperature();
  float hum1 = dht1.readHumidity();
  float hum2 = dht2.readHumidity();
  float hum3 = dht3.readHumidity();
  
  // Calculate averages (ignore NaN values)
  int tempCount = 0, humCount = 0;
  float tempSum = 0, humSum = 0;
  
  if (!isnan(temp1)) { tempSum += temp1; tempCount++; }
  if (!isnan(temp2)) { tempSum += temp2; tempCount++; }
  if (!isnan(temp3)) { tempSum += temp3; tempCount++; }
  
  if (!isnan(hum1)) { humSum += hum1; humCount++; }
  if (!isnan(hum2)) { humSum += hum2; humCount++; }
  if (!isnan(hum3)) { humSum += hum3; humCount++; }
  
  currentData.temperature = (tempCount > 0) ? tempSum / tempCount : 25.0;
  currentData.humidity = (humCount > 0) ? humSum / humCount : 50.0;
  
  // Read ultrasonic sensor
  currentData.ultrasonic_distance = readUltrasonic();
  
  // Read soil moisture
  currentData.soil_moisture = analogRead(SOIL_MOISTURE_PIN);
  
  // Read digital sensors
  currentData.vibration = digitalRead(VIBRATION_PIN);
  currentData.ir_detection = digitalRead(IR_SENSOR_PIN);
}

float readMQ4(int pin) {
  int sensorValue = analogRead(pin);
  float voltage = sensorValue * (3.3 / 4095.0);
  float Rs = (3.3 - voltage) / voltage * 10000; // 10k load resistor
  float ratio = Rs / MQ4_R0;
  
  // MQ-4 curve approximation for methane (ppm)
  float ppm = 1000 * pow(ratio, -1.5);
  return constrain(ppm, 200, 5000);
}

float readMQ7(int pin) {
  int sensorValue = analogRead(pin);
  float voltage = sensorValue * (3.3 / 4095.0);
  float Rs = (3.3 - voltage) / voltage * 10000; // 10k load resistor
  float ratio = Rs / MQ7_R0;
  
  // MQ-7 curve approximation for CO (ppm)
  float ppm = 100 * pow(ratio, -1.4);
  return constrain(ppm, 10, 1000);
}

float readUltrasonic() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return -1; // No echo received
  
  float distance = duration * 0.034 / 2; // Convert to cm
  return constrain(distance, 2, 400);
}

void updateLCDDisplay() {
  lcd.setCursor(0, 0);
  lcd.print("Area " + areaId + " - LEMOS    ");
  
  lcd.setCursor(0, 1);
  lcd.print("CH4:" + String(currentData.mq4_1, 0) + " CO:" + String(currentData.mq7_1, 0) + "    ");
  
  lcd.setCursor(0, 2);
  lcd.print("T:" + String(currentData.temperature, 1) + "C H:" + String(currentData.humidity, 0) + "%    ");
  
  lcd.setCursor(0, 3);
  if (alertActive) {
    lcd.print("*** ALERT ***       ");
  } else {
    lcd.print("Status: Normal      ");
  }
}

void checkAlertConditions() {
  bool newAlertState = false;
  
  // Check gas levels
  float avgMQ4 = (currentData.mq4_1 + currentData.mq4_2 + currentData.mq4_3) / 3.0;
  float avgMQ7 = (currentData.mq7_1 + currentData.mq7_2 + currentData.mq7_3) / 3.0;
  
  if (avgMQ4 > 1000 || avgMQ7 > 50 || currentData.temperature > 45) {
    newAlertState = true;
  }
  
  // Handle alert state change
  if (newAlertState && !alertActive) {
    // New alert triggered
    alertActive = true;
    activateBuzzer();
    Serial.println("ALERT: Dangerous levels detected!");
  } else if (!newAlertState && alertActive) {
    // Alert cleared
    alertActive = false;
    deactivateBuzzer();
    Serial.println("Alert cleared - levels normal");
  }
}

void activateBuzzer() {
  // Activate buzzer with pulsing pattern
  for (int i = 0; i < 5; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
  }
}

void deactivateBuzzer() {
  digitalWrite(BUZZER_PIN, LOW);
}

void sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping data send");
    return;
  }
  
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(1024);
  doc["area_id"] = areaId.toInt();
  doc["timestamp"] = getCurrentTimestamp();
  
  // Calculate average gas sensor readings to match Flask expectations
  float avgMethane = (currentData.mq4_1 + currentData.mq4_2 + currentData.mq4_3) / 3.0;
  float avgCO = (currentData.mq7_1 + currentData.mq7_2 + currentData.mq7_3) / 3.0;
  
  // Send aggregated data as expected by Flask
  doc["methane"] = avgMethane;
  doc["co"] = avgCO;
  doc["temperature"] = currentData.temperature;
  doc["humidity"] = currentData.humidity;
  doc["water_level"] = currentData.ultrasonic_distance; // Map ultrasonic to water_level
  
  // Additional sensor data for monitoring
  doc["soil_moisture"] = currentData.soil_moisture;
  doc["vibration"] = currentData.vibration ? 1 : 0;
  doc["ir_detection"] = currentData.ir_detection ? 1 : 0;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Sending data: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response: " + String(httpResponseCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
    Serial.println("Error details: " + http.errorToString(httpResponseCode));
  }
  
  http.end();
}

unsigned long getCurrentTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time, using millis()");
    return millis() / 1000; // Return seconds since boot as fallback
  }
  return mktime(&timeinfo);
} why in this code it sends only area 1 readings
