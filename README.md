# LEMOS - Landfill Emission Monitoring System

A real-time monitoring dashboard for landfill gas emissions with multi-area support, ESP32 sensor integration, and ML-powered forecasting.

## Features

- **Multi-Area Monitoring**: Monitor up to 3 different areas simultaneously
- **Real-time Data**: Live sensor readings from ESP32 devices
- **Gas Detection**: Methane (MQ-4) and Carbon Monoxide (MQ-7) monitoring
- **Environmental Tracking**: Temperature and humidity monitoring (DHT11)
- **Water Level Monitoring**: Ultrasonic sensor integration
- **ML Forecasting**: 48-hour prediction capabilities
- **Alert System**: Real-time alerts for dangerous gas levels
- **Responsive Design**: Works on desktop and mobile devices

## Deployment on Render

This application is configured for easy deployment on Render.com:

1. **Fork this repository** to your GitHub account
2. **Connect to Render**: 
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
3. **Configure deployment**:
   - Render will automatically detect the `render.yaml` configuration
   - The app will build and deploy automatically
4. **Environment Variables** (optional):
   - Add any custom environment variables in Render dashboard
   - The app works without additional configuration

## Local Development

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
\`\`\`

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Render.com ready

## Hardware Integration

The dashboard is designed to work with:
- ESP32 microcontrollers
- MQ-4 methane sensors
- MQ-7 carbon monoxide sensors
- DHT11 temperature/humidity sensors
- Ultrasonic water level sensors

## License

MIT License - see LICENSE file for details
