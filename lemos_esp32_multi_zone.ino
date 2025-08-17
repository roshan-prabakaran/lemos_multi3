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
const char* serverURL = "https://your-render-app-name.onrender.com/api/readings"; // Replace 'your-render-app-name' with your actual Render app name

// NTP server configuration
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 3600;

// Area 1 Sensors
const int MQ4_AREA1 = 33;  // Methane sensor for Area 1
const int MQ7_AREA1 = 35;  // CO sensor for Area 1
const int DHT_AREA1 = 25;  // Temperature/Humidity for Area 1

// Area 2 Sensors
const int MQ4_AREA2 = 39;  // Methane sensor for Area 2
const int MQ7_AREA2 = 34;  // CO sensor for Area 2
const int DHT_AREA2 = 26;  // Temperature/Humidity for Area 2

// Area 3 Sensors
const int MQ4_AREA3 = 32;  // Methane sensor for Area 3
const int MQ7_AREA3 = 36;  // CO sensor for Area 3
const int DHT_AREA3 = 27;  // Temperature/Humidity for Area 3

// Shared sensors
const int TRIG_PIN = 4;   // Ultrasonic sensor
const int ECHO_PIN = 5;
const int SOIL_MOISTURE_PIN = 14;
const int VIBRATION_PIN = 18;
const int IR_SENSOR_PIN = 19;  // Changed from 4 to avoid conflict
const int BUZZER_PIN = 2;

// I2C LCD
const int SDA_PIN = 21;
const int SCL_PIN = 22;

DHT dht_area1(DHT_AREA1, DHT11);
DHT dht_area2(DHT_AREA2, DHT11);
DHT dht_area3(DHT_AREA3, DHT11);
LiquidCrystal_I2C lcd(0x27, 20, 4);

// Sensor calibration values
float MQ4_R0 = 10.0;
float MQ7_R0 = 10.0;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
const unsigned long SENSOR_INTERVAL = 5000;
const unsigned long SEND_INTERVAL = 30000;

struct AreaData {
  float methane;
  float co;
  float temperature;
  float humidity;
  bool alert_active;
};

struct SystemData {
  AreaData area1;
  AreaData area2;
  AreaData area3;
  float ultrasonic_distance;
  int soil_moisture;
  bool vibration;
  bool ir_detection;
};

SystemData currentData;
int currentDisplayArea = 1;
unsigned long lastDisplaySwitch = 0;
const unsigned long DISPLAY_SWITCH_INTERVAL = 3000; // Switch display every 3 seconds

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
  lcd.print("LEMOS Multi-Zone");
  lcd.setCursor(0, 1);
  lcd.print("System Init...");
  
  dht_area1.begin();
  dht_area2.begin();
  dht_area3.begin();
  
  // Connect to WiFi
  connectToWiFi();
  
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("Waiting for NTP time sync...");
  
  // Display ready message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LEMOS Multi-Zone");
  lcd.setCursor(0, 1);
  lcd.print("3 Areas Ready");
  
  Serial.println("LEMOS ESP32 Multi-Zone System Ready");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read sensors periodically
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
    readAllSensors();
    checkAlertConditions();
    lastSensorRead = currentTime;
  }
  
  // Update LCD display (cycle through areas)
  if (currentTime - lastDisplaySwitch >= DISPLAY_SWITCH_INTERVAL) {
    updateLCDDisplay();
    currentDisplayArea = (currentDisplayArea % 3) + 1;
    lastDisplaySwitch = currentTime;
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

void readAllSensors() {
  // Read Area 1 sensors
  currentData.area1.methane = readMQ4(MQ4_AREA1);
  currentData.area1.co = readMQ7(MQ7_AREA1);
  currentData.area1.temperature = dht_area1.readTemperature();
  currentData.area1.humidity = dht_area1.readHumidity();
  
  // Handle NaN values for Area 1
  if (isnan(currentData.area1.temperature)) currentData.area1.temperature = 25.0;
  if (isnan(currentData.area1.humidity)) currentData.area1.humidity = 50.0;
  
  // Read Area 2 sensors
  currentData.area2.methane = readMQ4(MQ4_AREA2);
  currentData.area2.co = readMQ7(MQ7_AREA2);
  currentData.area2.temperature = dht_area2.readTemperature();
  currentData.area2.humidity = dht_area2.readHumidity();
  
  // Handle NaN values for Area 2
  if (isnan(currentData.area2.temperature)) currentData.area2.temperature = 25.0;
  if (isnan(currentData.area2.humidity)) currentData.area2.humidity = 50.0;
  
  // Read Area 3 sensors
  currentData.area3.methane = readMQ4(MQ4_AREA3);
  currentData.area3.co = readMQ7(MQ7_AREA3);
  currentData.area3.temperature = dht_area3.readTemperature();
  currentData.area3.humidity = dht_area3.readHumidity();
  
  // Handle NaN values for Area 3
  if (isnan(currentData.area3.temperature)) currentData.area3.temperature = 25.0;
  if (isnan(currentData.area3.humidity)) currentData.area3.humidity = 50.0;
  
  // Read shared sensors
  currentData.ultrasonic_distance = readUltrasonic();
  currentData.soil_moisture = analogRead(SOIL_MOISTURE_PIN);
  currentData.vibration = digitalRead(VIBRATION_PIN);
  currentData.ir_detection = digitalRead(IR_SENSOR_PIN);
  
  Serial.println("Area 1 - CH4: " + String(currentData.area1.methane) + " CO: " + String(currentData.area1.co));
  Serial.println("Area 2 - CH4: " + String(currentData.area2.methane) + " CO: " + String(currentData.area2.co));
  Serial.println("Area 3 - CH4: " + String(currentData.area3.methane) + " CO: " + String(currentData.area3.co));
}

void updateLCDDisplay() {
  AreaData* currentArea;
  String areaName;
  
  switch(currentDisplayArea) {
    case 1:
      currentArea = &currentData.area1;
      areaName = "Area 1";
      break;
    case 2:
      currentArea = &currentData.area2;
      areaName = "Area 2";
      break;
    case 3:
      currentArea = &currentData.area3;
      areaName = "Area 3";
      break;
  }
  
  lcd.setCursor(0, 0);
  lcd.print(areaName + " - LEMOS    ");
  
  lcd.setCursor(0, 1);
  lcd.print("CH4:" + String(currentArea->methane, 0) + " CO:" + String(currentArea->co, 0) + "    ");
  
  lcd.setCursor(0, 2);
  lcd.print("T:" + String(currentArea->temperature, 1) + "C H:" + String(currentArea->humidity, 0) + "%    ");
  
  lcd.setCursor(0, 3);
  if (currentArea->alert_active) {
    lcd.print("*** ALERT ***       ");
  } else {
    lcd.print("Status: Normal      ");
  }
}

void checkAlertConditions() {
  // Check Area 1
  currentData.area1.alert_active = (currentData.area1.methane > 1000 || 
                                   currentData.area1.co > 50 || 
                                   currentData.area1.temperature > 45);
  
  // Check Area 2
  currentData.area2.alert_active = (currentData.area2.methane > 1000 || 
                                   currentData.area2.co > 50 || 
                                   currentData.area2.temperature > 45);
  
  // Check Area 3
  currentData.area3.alert_active = (currentData.area3.methane > 1000 || 
                                   currentData.area3.co > 50 || 
                                   currentData.area3.temperature > 45);
  
  // Activate buzzer if any area has alert
  bool anyAlert = currentData.area1.alert_active || 
                  currentData.area2.alert_active || 
                  currentData.area3.alert_active;
  
  static bool previousAlertState = false;
  
  if (anyAlert && !previousAlertState) {
    activateBuzzer();
    Serial.println("ALERT: Dangerous levels detected in one or more areas!");
  } else if (!anyAlert && previousAlertState) {
    deactivateBuzzer();
    Serial.println("All areas normal - alerts cleared");
  }
  
  previousAlertState = anyAlert;
}

void sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping data send");
    return;
  }
  
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(2048);
  doc["timestamp"] = getCurrentTimestamp();
  doc["device_id"] = "ESP32_MultiZone_001";
  
  // Area 1 data
  JsonObject area1 = doc.createNestedObject("area_1");
  area1["area_id"] = 1;
  area1["methane"] = currentData.area1.methane;
  area1["co"] = currentData.area1.co;
  area1["temperature"] = currentData.area1.temperature;
  area1["humidity"] = currentData.area1.humidity;
  area1["alert_active"] = currentData.area1.alert_active;
  
  // Area 2 data
  JsonObject area2 = doc.createNestedObject("area_2");
  area2["area_id"] = 2;
  area2["methane"] = currentData.area2.methane;
  area2["co"] = currentData.area2.co;
  area2["temperature"] = currentData.area2.temperature;
  area2["humidity"] = currentData.area2.humidity;
  area2["alert_active"] = currentData.area2.alert_active;
  
  // Area 3 data
  JsonObject area3 = doc.createNestedObject("area_3");
  area3["area_id"] = 3;
  area3["methane"] = currentData.area3.methane;
  area3["co"] = currentData.area3.co;
  area3["temperature"] = currentData.area3.temperature;
  area3["humidity"] = currentData.area3.humidity;
  area3["alert_active"] = currentData.area3.alert_active;
  
  // Shared sensor data
  doc["water_level"] = currentData.ultrasonic_distance;
  doc["soil_moisture"] = currentData.soil_moisture;
  doc["vibration"] = currentData.vibration ? 1 : 0;
  doc["ir_detection"] = currentData.ir_detection ? 1 : 0;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Sending multi-zone data: " + jsonString);
  
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

void connectToWiFi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
}

float readMQ4(int pin) {
  // Placeholder function for reading MQ4 sensor
  return 1000.0; // Example value
}

float readMQ7(int pin) {
  // Placeholder function for reading MQ7 sensor
  return 50.0; // Example value
}

float readUltrasonic() {
  // Placeholder function for reading ultrasonic sensor
  return 10.0; // Example value
}

void activateBuzzer() {
  digitalWrite(BUZZER_PIN, HIGH);
}

void deactivateBuzzer() {
  digitalWrite(BUZZER_PIN, LOW);
}

String getCurrentTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "NTP Sync Error";
  }
  char timeString[50];
  strftime(timeString, sizeof(timeString), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeString);
}
