import os
from twilio.rest import Client
from typing import List

class SMSService:
    def __init__(self):
        # Twilio credentials (set these as environment variables)
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID', 'your_account_sid')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN', 'your_auth_token')
        self.from_number = os.getenv('TWILIO_FROM_NUMBER', '+1234567890')
        
        self.area_contacts = {
            1: ['+1234567890', '+1234567891'],  # Area 1 contacts
            2: ['+1234567892', '+1234567893'],  # Area 2 contacts  
            3: ['+1234567894', '+1234567895']   # Area 3 contacts
        }
        
        # General emergency contacts (for system-wide alerts)
        self.emergency_contacts = [
            '+1234567896',  # System administrator
            '+1234567897'   # Backup contact
        ]
        
        # Initialize Twilio client
        try:
            self.client = Client(self.account_sid, self.auth_token)
            self.enabled = True
        except Exception as e:
            print(f"SMS Service initialization failed: {e}")
            self.enabled = False
    
    def send_alert(self, message: str, severity: str = 'medium', area_id: int = None):
        """Send SMS alert to emergency contacts"""
        if not self.enabled:
            print(f"SMS disabled - would send: {message}")
            return
        
        if area_id and area_id in self.area_contacts:
            recipients = self.area_contacts[area_id]
            if severity == 'high':
                # For high severity, also notify general emergency contacts
                recipients.extend(self.emergency_contacts)
        else:
            # Use general emergency contacts for system-wide alerts
            recipients = self.emergency_contacts
        
        # Add severity prefix to message
        severity_prefix = {
            'high': '🚨 URGENT',
            'medium': '⚠️ WARNING',
            'low': 'ℹ️ INFO'
        }
        
        full_message = f"{severity_prefix.get(severity, '⚠️')} {message}"
        
        # Send SMS to each recipient
        for number in recipients:
            try:
                message_obj = self.client.messages.create(
                    body=full_message,
                    from_=self.from_number,
                    to=number
                )
                print(f"SMS sent to {number}: {message_obj.sid}")
            
            except Exception as e:
                print(f"Failed to send SMS to {number}: {e}")
    
    def send_test_message(self):
        """Send test message to verify SMS functionality"""
        test_message = "LEMOS System Test - SMS notifications are working correctly."
        self.send_alert(test_message, 'low')
