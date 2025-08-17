# LEMOS Dashboard - Render Deployment Guide

## Prerequisites
1. **Twilio Account**: Sign up at [twilio.com](https://twilio.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Render Account**: Sign up at [render.com](https://render.com)

## Twilio Setup
1. **Get Twilio Credentials**:
   - Account SID: Found in Twilio Console Dashboard
   - Auth Token: Found in Twilio Console Dashboard
   - Phone Number: Purchase a phone number in Twilio Console

2. **Configure Phone Numbers**:
   - Update the contact numbers in your environment variables
   - Use international format: +1234567890

## Render Deployment Steps

### 1. Connect GitHub Repository
- Go to [render.com](https://render.com) and sign in
- Click "New +" → "Web Service"
- Connect your GitHub account and select your LEMOS repository

### 2. Configure Build Settings
- **Name**: `lemos-dashboard`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 3. Set Environment Variables
In the Render dashboard, add these environment variables:

#### Required Twilio Variables:
\`\`\`
TWILIO_ACCOUNT_SID=your_account_sid_from_twilio_console
TWILIO_AUTH_TOKEN=your_auth_token_from_twilio_console
TWILIO_FROM_NUMBER=+1234567890
\`\`\`

#### Area Contact Configuration:
\`\`\`
AREA_1_CONTACTS=+1234567890,+1234567891
AREA_2_CONTACTS=+1234567892,+1234567893
AREA_3_CONTACTS=+1234567894,+1234567895
EMERGENCY_CONTACTS=+1234567896,+1234567897
\`\`\`

#### App Configuration:
\`\`\`
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com
\`\`\`

### 4. Deploy
- Click "Create Web Service"
- Render will automatically build and deploy your app
- Your app will be available at: `https://your-app-name.onrender.com`

## Testing SMS Functionality

### Test SMS Endpoint
Visit: `https://your-app-name.onrender.com/api/sms`

This will send a test message to your emergency contacts.

### Manual Alert Test
\`\`\`bash
curl -X POST https://your-app-name.onrender.com/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "type": "methane",
    "area_id": "1",
    "value": 1200,
    "threshold": 1000,
    "severity": "high",
    "timestamp": "2024-01-01T12:00:00Z"
  }'
\`\`\`

## Contact Configuration Guide

### Area-Specific Contacts
- **Area 1**: Field technicians responsible for Area 1
- **Area 2**: Field technicians responsible for Area 2  
- **Area 3**: Field technicians responsible for Area 3

### Emergency Contacts
- **System Administrator**: Primary contact for system issues
- **Backup Contact**: Secondary contact for high-severity alerts

### Alert Severity Levels
- **Low**: Info messages, system status updates
- **Medium**: Warning levels, threshold breaches
- **High**: Urgent alerts, dangerous gas levels (also notifies emergency contacts)

## Troubleshooting

### Common Issues:
1. **SMS not sending**: Check Twilio credentials and phone number format
2. **Build failures**: Ensure all dependencies are in package.json
3. **Environment variables**: Double-check all required variables are set

### Logs:
- View logs in Render dashboard under "Logs" tab
- Check for Twilio API errors in the logs

## Cost Considerations
- **Render**: Free tier available, paid plans start at $7/month
- **Twilio**: Pay-per-SMS, approximately $0.0075 per SMS in the US
- **Phone Number**: ~$1/month for Twilio phone number

## Security Notes
- Never commit Twilio credentials to your repository
- Use environment variables for all sensitive data
- Regularly rotate your Twilio Auth Token
- Monitor SMS usage to prevent unexpected charges
