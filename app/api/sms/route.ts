import { type NextRequest, NextResponse } from "next/server"

const twilio = require("twilio")

interface SMSAlert {
  message: string
  severity: "low" | "medium" | "high"
  area_id?: number
}

export async function POST(request: NextRequest) {
  try {
    const { message, severity = "medium", area_id }: SMSAlert = await request.json()

    // Twilio credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_FROM

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({ error: "Twilio credentials not configured" }, { status: 500 })
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken)

    // Get contact numbers based on area
    let recipients: string[] = []

    if (area_id) {
      const areaContacts = process.env[`AREA_${area_id}_CONTACTS`]
      if (areaContacts) {
        recipients = areaContacts.split(",").map((num) => num.trim())
      }

      // For high severity, also add emergency contacts
      if (severity === "high") {
        const emergencyContacts = process.env.EMERGENCY_CONTACTS
        if (emergencyContacts) {
          recipients.push(...emergencyContacts.split(",").map((num) => num.trim()))
        }
      }
    } else {
      // System-wide alert - use emergency contacts
      const emergencyContacts = process.env.EMERGENCY_CONTACTS
      if (emergencyContacts) {
        recipients = emergencyContacts.split(",").map((num) => num.trim())
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients configured for this area" }, { status: 400 })
    }

    // Add severity prefix to message
    const severityPrefix = {
      high: "🚨 URGENT",
      medium: "⚠️ WARNING",
      low: "ℹ️ INFO",
    }

    const fullMessage = `${severityPrefix[severity]} ${message}`

    // Send SMS to each recipient
    const results = []
    for (const number of recipients) {
      try {
        const messageObj = await client.messages.create({
          body: fullMessage,
          from: fromNumber,
          to: number,
        })
        results.push({ number, sid: messageObj.sid, status: "sent" })
      } catch (error) {
        console.error(`Failed to send SMS to ${number}:`, error)
        results.push({ number, error: error.message, status: "failed" })
      }
    }

    return NextResponse.json({
      success: true,
      message: "SMS alerts processed",
      results,
    })
  } catch (error) {
    console.error("SMS API error:", error)
    return NextResponse.json({ error: "Failed to send SMS alerts" }, { status: 500 })
  }
}

// Test endpoint
export async function GET() {
  try {
    const testMessage = "LEMOS System Test - SMS notifications are working correctly."

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: testMessage,
        severity: "low",
      }),
    })

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Test SMS failed" }, { status: 500 })
  }
}
