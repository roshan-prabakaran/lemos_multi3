import { type NextRequest, NextResponse } from "next/server"

interface AlertData {
  type: string
  area_id: string | number
  value: number
  threshold: number
  severity: "low" | "medium" | "high"
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const alertData: AlertData = await request.json()

    // Create alert message
    const message = `LEMOS ALERT: ${alertData.type.toUpperCase()} level ${alertData.value.toFixed(1)} exceeds threshold ${alertData.threshold} in Area ${alertData.area_id}`

    // Send SMS alert
    const smsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        severity: alertData.severity,
        area_id: Number(alertData.area_id),
      }),
    })

    const smsResult = await smsResponse.json()

    // Here you would typically also store the alert in a database
    // For now, we'll just return the SMS result

    return NextResponse.json({
      success: true,
      alert: alertData,
      sms_result: smsResult,
    })
  } catch (error) {
    console.error("Alert API error:", error)
    return NextResponse.json({ error: "Failed to process alert" }, { status: 500 })
  }
}
