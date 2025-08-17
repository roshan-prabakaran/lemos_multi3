class LEMOSDashboard {
  constructor() {
    this.currentArea = "1"
    this.charts = {}
    this.lastUpdate = null
    this.updateInterval = null

    this.init()
  }

  init() {
    this.initCharts()
    this.startDataUpdates()
    this.checkSystemStatus()

    // Update every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updateCurrentData()
      this.updateForecast()
    }, 30000)
  }

  initCharts() {
    // Gas Levels Chart
    const gasCtx = document.getElementById("gasChart").getContext("2d")
    this.charts.gas = new window.Chart(gasCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Methane (ppm)",
            data: [],
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.1)",
            tension: 0.4,
          },
          {
            label: "Carbon Monoxide (ppm)",
            data: [],
            borderColor: "#f39c12",
            backgroundColor: "rgba(243, 156, 18, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Concentration (ppm)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Time",
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    })

    // Environmental Chart
    const envCtx = document.getElementById("envChart").getContext("2d")
    this.charts.env = new window.Chart(envCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature (°C)",
            data: [],
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            yAxisID: "y",
          },
          {
            label: "Humidity (%)",
            data: [],
            borderColor: "#2ecc71",
            backgroundColor: "rgba(46, 204, 113, 0.1)",
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Temperature (°C)",
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Humidity (%)",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
          x: {
            title: {
              display: true,
              text: "Time",
            },
          },
        },
      },
    })

    // Forecast Chart
    const forecastCtx = document.getElementById("forecastChart").getContext("2d")
    this.charts.forecast = new window.Chart(forecastCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Predicted Methane",
            data: [],
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.1)",
            borderDash: [5, 5],
            tension: 0.4,
          },
          {
            label: "Predicted CO",
            data: [],
            borderColor: "#f39c12",
            backgroundColor: "rgba(243, 156, 18, 0.1)",
            borderDash: [5, 5],
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Predicted Concentration (ppm)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Future Time",
            },
          },
        },
      },
    })
  }

  async updateCurrentData() {
    try {
      console.log("[v0] Fetching current data for area:", this.currentArea)

      let response, data

      // First try the current endpoint
      try {
        response = await fetch(`/api/current/${this.currentArea}`)
        if (response.ok) {
          data = await response.json()
          console.log("[v0] Current API response:", data)
          if (data && Object.keys(data).length > 0) {
            this.updateReadings(data)
            this.updateConnectionStatus(true)
            this.lastUpdate = new Date()
            document.getElementById("last-update").textContent = `Last Update: ${this.lastUpdate.toLocaleTimeString()}`
            await this.updateHistoricalCharts()
            return
          }
        }
      } catch (e) {
        console.log("[v0] Current endpoint failed, trying readings endpoint")
      }

      // Fallback to readings endpoint
      response = await fetch(`/api/readings?area_id=${this.currentArea}&hours=1`)
      console.log("[v0] Readings API response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      data = await response.json()
      console.log("[v0] Readings API response data:", data)

      if (data && Array.isArray(data) && data.length > 0) {
        // Get the most recent reading
        const latestReading = data[0]
        console.log("[v0] Latest reading:", latestReading)
        this.updateReadings(latestReading)
        this.updateConnectionStatus(true)
        this.lastUpdate = new Date()
        document.getElementById("last-update").textContent = `Last Update: ${this.lastUpdate.toLocaleTimeString()}`
      } else if (data && !Array.isArray(data)) {
        // Handle single object response
        console.log("[v0] Single object response:", data)
        this.updateReadings(data)
        this.updateConnectionStatus(true)
        this.lastUpdate = new Date()
        document.getElementById("last-update").textContent = `Last Update: ${this.lastUpdate.toLocaleTimeString()}`
      } else {
        console.log("[v0] No data received or empty array")
        this.updateConnectionStatus(false)
      }

      // Update historical charts
      await this.updateHistoricalCharts()
    } catch (error) {
      console.error("[v0] Error updating current data:", error)
      this.updateConnectionStatus(false)

      const alertContainer = document.getElementById("alert-container")
      alertContainer.innerHTML = `
        <div class="alert-item warning">
          <span class="alert-icon">⚠️</span>
          <span class="alert-text">Connection error: ${error.message}</span>
        </div>
      `
    }
  }

  updateReadings(data) {
    console.log("[v0] Updating readings with data:", data)

    const methane = data.methane || data.mq4_avg || 0
    const co = data.co || data.mq7_avg || 0
    const temperature = data.temperature || data.temp || 0
    const humidity = data.humidity || 0
    const waterLevel = data.water_level || data.distance || 0
    const soilMoisture = data.soil_moisture || 0

    console.log("[v0] Processed values:", { methane, co, temperature, humidity, waterLevel, soilMoisture })

    // Update DOM elements with fallback values
    const mq4Element = document.getElementById("mq4-value")
    const mq7Element = document.getElementById("mq7-value")
    const tempElement = document.getElementById("temp-value")
    const humidityElement = document.getElementById("humidity-value")
    const distanceElement = document.getElementById("distance-value")
    const soilElement = document.getElementById("soil-value")

    if (mq4Element) mq4Element.textContent = `${methane.toFixed(1)} ppm`
    if (mq7Element) mq7Element.textContent = `${co.toFixed(1)} ppm`
    if (tempElement) tempElement.textContent = `${temperature.toFixed(1)} °C`
    if (humidityElement) humidityElement.textContent = `${humidity.toFixed(1)} %`
    if (distanceElement) distanceElement.textContent = `${waterLevel.toFixed(1)} cm`
    if (soilElement) soilElement.textContent = `${soilMoisture}`

    // Update alert status based on readings
    this.updateAlertStatus({ methane, co, temperature, humidity })

    // Apply warning/danger classes
    this.applyReadingClasses({ methane, co, temperature })
  }

  applyReadingClasses(data) {
    const mq4Element = document.getElementById("mq4-value")
    const mq7Element = document.getElementById("mq7-value")
    const tempElement = document.getElementById("temp-value")

    // Reset classes
    ;[mq4Element, mq7Element, tempElement].forEach((el) => {
      el.classList.remove("warning", "danger")
    })

    if (data.methane > 800) {
      mq4Element.classList.add(data.methane > 1000 ? "danger" : "warning")
    }

    if (data.co > 30) {
      mq7Element.classList.add(data.co > 50 ? "danger" : "warning")
    }

    if (data.temperature > 35) {
      tempElement.classList.add(data.temperature > 45 ? "danger" : "warning")
    }
  }

  updateAlertStatus(data) {
    const alertContainer = document.getElementById("alert-container")
    const alerts = []

    if (data.methane > 1000) {
      alerts.push({
        type: "danger",
        icon: "🚨",
        text: `High methane detected: ${data.methane.toFixed(1)} ppm`,
      })
    } else if (data.methane > 800) {
      alerts.push({
        type: "warning",
        icon: "⚠️",
        text: `Elevated methane: ${data.methane.toFixed(1)} ppm`,
      })
    }

    if (data.co > 50) {
      alerts.push({
        type: "danger",
        icon: "🚨",
        text: `High CO detected: ${data.co.toFixed(1)} ppm`,
      })
    } else if (data.co > 30) {
      alerts.push({
        type: "warning",
        icon: "⚠️",
        text: `Elevated CO: ${data.co.toFixed(1)} ppm`,
      })
    }

    if (data.temperature > 45) {
      alerts.push({
        type: "danger",
        icon: "🌡️",
        text: `High temperature: ${data.temperature.toFixed(1)}°C`,
      })
    }

    // Update alert display
    if (alerts.length === 0) {
      alertContainer.innerHTML = `
                <div class="alert-item safe">
                    <span class="alert-icon">✅</span>
                    <span class="alert-text">All systems normal</span>
                </div>
            `
    } else {
      alertContainer.innerHTML = alerts
        .map(
          (alert) => `
                <div class="alert-item ${alert.type}">
                    <span class="alert-icon">${alert.icon}</span>
                    <span class="alert-text">${alert.text}</span>
                </div>
            `,
        )
        .join("")
    }
  }

  async updateHistoricalCharts() {
    try {
      console.log("[v0] Fetching historical data for area:", this.currentArea)
      const response = await fetch(`/api/readings?area_id=${this.currentArea}&hours=24`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Historical data received:", data?.length || 0, "records")

      if (data && Array.isArray(data) && data.length > 0) {
        const sortedData = data.slice(-20).reverse()

        // Prepare data for charts
        const labels = sortedData.map((d) => {
          const date = new Date(d.timestamp)
          return date.toLocaleTimeString()
        })
        const mq4Data = sortedData.map((d) => d.methane || d.mq4_avg || 0)
        const mq7Data = sortedData.map((d) => d.co || d.mq7_avg || 0)
        const tempData = sortedData.map((d) => d.temperature || d.temp || 0)
        const humidityData = sortedData.map((d) => d.humidity || 0)

        console.log("[v0] Chart data prepared:", { labels: labels.length, mq4Data: mq4Data.length })

        // Update gas chart
        this.charts.gas.data.labels = labels
        this.charts.gas.data.datasets[0].data = mq4Data
        this.charts.gas.data.datasets[1].data = mq7Data
        this.charts.gas.update()

        // Update environmental chart
        this.charts.env.data.labels = labels
        this.charts.env.data.datasets[0].data = tempData
        this.charts.env.data.datasets[1].data = humidityData
        this.charts.env.update()

        console.log("[v0] Charts updated successfully")
      } else {
        console.log("[v0] No historical data available")
      }
    } catch (error) {
      console.error("[v0] Error updating historical charts:", error)
    }
  }

  async updateForecast() {
    try {
      const response = await fetch(`/api/forecast?area_id=${this.currentArea}&hours=48`)
      const data = await response.json()

      if (data && data.length > 0) {
        const labels = data.map((f) => new Date(f.timestamp).toLocaleString())
        const mq4Forecast = data.map((f) => f.methane)
        const mq7Forecast = data.map((f) => f.co)

        this.charts.forecast.data.labels = labels
        this.charts.forecast.data.datasets[0].data = mq4Forecast
        this.charts.forecast.data.datasets[1].data = mq7Forecast
        this.charts.forecast.update()
      }
    } catch (error) {
      console.error("[v0] Error updating forecast:", error)
    }
  }

  updateConnectionStatus(connected) {
    const statusElement = document.getElementById("connection-status")
    const esp32Status = document.getElementById("esp32-status")

    if (connected) {
      statusElement.textContent = "🟢 Connected"
      statusElement.style.color = "#27ae60"
      esp32Status.textContent = "🟢 Online"
    } else {
      statusElement.textContent = "🔴 Disconnected"
      statusElement.style.color = "#e74c3c"
      esp32Status.textContent = "🔴 Offline"
    }
  }

  async checkSystemStatus() {
    // This would check various system components
    // For now, we'll simulate the status
    document.getElementById("db-status").textContent = "🟢 Online"
    document.getElementById("sms-status").textContent = "🟢 Ready"
    document.getElementById("ml-status").textContent = "🟢 Active"
  }

  startDataUpdates() {
    // Initial data load
    this.updateCurrentData()
    this.updateForecast()
  }
}

// Area switching function
function switchArea(areaId) {
  // Update active tab
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active")
  })
  event.target.classList.add("active")

  // Update dashboard
  if (window.dashboard) {
    window.dashboard.currentArea = areaId
    window.dashboard.updateCurrentData()
    window.dashboard.updateForecast()
  }
}

// Initialize dashboard when page loads
document.addEventListener("DOMContentLoaded", () => {
  window.dashboard = new LEMOSDashboard()
})
