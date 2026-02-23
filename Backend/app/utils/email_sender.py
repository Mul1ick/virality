import os
import resend
from app.config.config import settings
from app.utils.logger import get_logger

logger = get_logger()

def send_otp_email(recipient_email: str, otp: str) -> bool:
    """
    Sends a One-Time Password (OTP) email to the user's address using the Resend API.

    Args:
        recipient_email (str): The target email address.
        otp (str): The OTP code to send.

    Returns:
        bool: True if sent successfully, False otherwise.
    """
    # Safely get the API key without breaking Pydantic settings if it's missing from config.py
    api_key = getattr(settings, "RESEND_API_KEY", None) or os.getenv("RESEND_API_KEY")
    
    if not api_key:
        logger.error("[MAIL] RESEND_API_KEY is missing! Cannot send email.")
        return False

    resend.api_key = api_key

    # While testing on the free tier, Resend requires you to send FROM this exact address.
    # Once you verify your domain later, you can change this back to "noreply@virality.media"
    sender_email = "Virality Dashboard <onboarding@resend.dev>"

    text_content = f"""
    Your Virality Media verification code is: {otp}

    This code will expire in 10 minutes.
    If you didn’t request this, please ignore this email.
    """

    try:
        # Build the email payload
        params = {
            "from": sender_email,
            "to": recipient_email,
            "subject": "🔐 Your Virality Verification Code",
            "text": text_content,
        }

        # Send via Resend HTTP API (Port 443 - Bypasses Render's firewall)
        resend.Emails.send(params)

        logger.info(f"[MAIL] OTP email sent → {recipient_email} via Resend")
        return True

    except Exception as e:
        logger.error(f"[MAIL] Failed to send OTP to {recipient_email}: {e}", exc_info=True)
        return False