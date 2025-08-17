"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AlertTriangle, Thermometer, Droplets, Wind, Activity, Zap, Database, Smartphone, Brain } from "lucide-react"

interface SensorReading {
  timestamp: string
  methane: number
  co: number
  temperature: number
  humidity: number
  water_level: number
  area_id: string
}

interface AlertData {
  type: string
  area_id: string
  value: number
  threshold: number
  severity: "low" | "medium" | "high"
  timestamp: string
}

export default function LEMOSDashboard() {
  const [currentArea, setCurrentArea] = useState("1")
  const [sensorData, setSensorData] = useState<Record<string, SensorReading>>({})
  const [historicalData, setHistoricalData] = useState<SensorReading[]>([])
  const [forecastData, setForecastData] = useState<any[]>([])
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [systemStatus, setSystemStatus] = useState({
    database: true,
    esp32: true,
    sms: true,
    ml: true,
  })
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate sensor readings for each area
      const areas = ["1", "2", "3"]
      const newData: Record<string, SensorReading> = {}

      areas.forEach((area) => {
        newData[area] = {
          timestamp: new Date().toISOString(),
          methane: Math.random() * 1200 + 300, // 300-1500 ppm
          co: Math.random() * 80 + 10, // 10-90 ppm
          temperature: Math.random() * 15 + 20, // 20-35°C
          humidity: Math.random() * 40 + 40, // 40-80%
          water_level: Math.random() * 50 + 100, // 100-150 cm
          area_id: area,
        }
      })

      setSensorData(newData)
      setLastUpdate(new Date())

      // Generate historical data for charts
      const now = new Date()
      const historical = Array.from({ length: 24 }, (_, i) => {
        const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000)
        return {
          timestamp: time.toISOString(),
          methane: Math.random() * 800 + 200,
          co: Math.random() * 50 + 5,
          temperature: Math.random() * 10 + 22,
          humidity: Math.random() * 30 + 45,
          water_level: Math.random() * 30 + 110,
          area_id: currentArea,
        }
      })
      setHistoricalData(historical)

      // Generate forecast data
      const forecast = Array.from({ length: 48 }, (_, i) => {
        const time = new Date(now.getTime() + i * 60 * 60 * 1000)
        return {
          timestamp: time.toISOString(),
          methane: Math.random() * 600 + 300,
          co: Math.random() * 40 + 10,
          confidence: Math.max(0.3, 0.9 - i * 0.01),
        }
      })
      setForecastData(forecast)

      // Check for alerts
      const newAlerts: AlertData[] = []
      Object.entries(newData).forEach(([areaId, reading]) => {
        if (reading.methane > 1000) {
          newAlerts.push({
            type: "methane",
            area_id: areaId,
            value: reading.methane,
            threshold: 1000,
            severity: reading.methane > 1200 ? "high" : "medium",
            timestamp: reading.timestamp,
          })
        }
        if (reading.co > 50) {
          newAlerts.push({
            type: "co",
            area_id: areaId,
            value: reading.co,
            threshold: 50,
            severity: reading.co > 70 ? "high" : "medium",
            timestamp: reading.timestamp,
          })
        }
      })
      setAlerts(newAlerts)
    }, 5000) // Update every 5 seconds for demo

    return () => clearInterval(interval)
  }, [currentArea])

  const getStatusColor = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return "text-red-600"
    if (value >= thresholds.warning) return "text-yellow-600"
    return "text-green-600"
  }

  const getStatusBadge = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return <Badge variant="destructive">Danger</Badge>
    if (value >= thresholds.warning) return <Badge variant="secondary">Warning</Badge>
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Normal
      </Badge>
    )
  }

  const currentReading = sensorData[currentArea]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                LEMOS
              </h1>
              <p className="text-gray-600 text-lg">Landfill Emission Monitoring System</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">
                {lastUpdate ? `Last Update: ${lastUpdate.toLocaleTimeString()}` : "Connecting..."}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Active Alerts:</strong> {alerts.length} area(s) require attention
            </AlertDescription>
          </Alert>
        )}

        {/* Area Selector */}
        <Tabs value={currentArea} onValueChange={setCurrentArea} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="1" className="data-[state=active]:bg-white">
              Area 1
            </TabsTrigger>
            <TabsTrigger value="2" className="data-[state=active]:bg-white">
              Area 2
            </TabsTrigger>
            <TabsTrigger value="3" className="data-[state=active]:bg-white">
              Area 3
            </TabsTrigger>
          </TabsList>

          <TabsContent value={currentArea} className="space-y-6 mt-6">
            {/* Current Readings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {currentReading && (
                <>
                  <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Wind className="h-4 w-4" />
                        Methane (MQ-4)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${getStatusColor(currentReading.methane, { warning: 800, danger: 1000 })}`}
                      >
                        {currentReading.methane.toFixed(1)} ppm
                      </div>
                      {getStatusBadge(currentReading.methane, { warning: 800, danger: 1000 })}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Carbon Monoxide (MQ-7)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${getStatusColor(currentReading.co, { warning: 30, danger: 50 })}`}
                      >
                        {currentReading.co.toFixed(1)} ppm
                      </div>
                      {getStatusBadge(currentReading.co, { warning: 30, danger: 50 })}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Thermometer className="h-4 w-4" />
                        Temperature (DHT11)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${getStatusColor(currentReading.temperature, { warning: 35, danger: 45 })}`}
                      >
                        {currentReading.temperature.toFixed(1)}°C
                      </div>
                      {getStatusBadge(currentReading.temperature, { warning: 35, danger: 45 })}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        Humidity (DHT11)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{currentReading.humidity.toFixed(1)}%</div>
                      <Badge variant="outline">Normal</Badge>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Water Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-cyan-600">{currentReading.water_level.toFixed(1)} cm</div>
                      <Badge variant="outline">Stable</Badge>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gas Levels Chart */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle>Gas Levels - Last 24 Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                        <YAxis />
                        <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                        <Legend />
                        <Line type="monotone" dataKey="methane" stroke="#ef4444" strokeWidth={2} name="Methane (ppm)" />
                        <Line type="monotone" dataKey="co" stroke="#f97316" strokeWidth={2} name="CO (ppm)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Environmental Chart */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle>Environmental Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                        <YAxis />
                        <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="temperature"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Temperature (°C)"
                        />
                        <Line type="monotone" dataKey="humidity" stroke="#10b981" strokeWidth={2} name="Humidity (%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Forecast Chart */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle>48-Hour Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                        <YAxis />
                        <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="methane"
                          stroke="#ef4444"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Predicted Methane"
                        />
                        <Line
                          type="monotone"
                          dataKey="co"
                          stroke="#f97316"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Predicted CO"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    ML-powered predictions with decreasing confidence over time
                  </p>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>Database</span>
                    </div>
                    <Badge variant={systemStatus.database ? "default" : "destructive"}>
                      {systemStatus.database ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span>ESP32 Sensors</span>
                    </div>
                    <Badge variant={systemStatus.esp32 ? "default" : "destructive"}>
                      {systemStatus.esp32 ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>SMS Alerts</span>
                    </div>
                    <Badge variant={systemStatus.sms ? "default" : "destructive"}>
                      {systemStatus.sms ? "Ready" : "Error"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      <span>ML Forecasting</span>
                    </div>
                    <Badge variant={systemStatus.ml ? "default" : "destructive"}>
                      {systemStatus.ml ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Alerts */}
            {alerts.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-red-600">Active Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts.map((alert, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-l-4 ${
                          alert.severity === "high"
                            ? "border-red-500 bg-red-50"
                            : alert.severity === "medium"
                              ? "border-yellow-500 bg-yellow-50"
                              : "border-blue-500 bg-blue-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {alert.type.toUpperCase()} Alert - Area {alert.area_id}
                            </p>
                            <p className="text-sm text-gray-600">
                              Level: {alert.value.toFixed(1)} ppm (Threshold: {alert.threshold} ppm)
                            </p>
                          </div>
                          <Badge variant={alert.severity === "high" ? "destructive" : "secondary"}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
