import smtplib
from email.mime.text import MIMEText
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger()

def send_otp_email(recipient_email: str, otp: str):
    """Sends a one-time password to the user's email address."""
    sender_email = "noreply@virality.media"
    msg = MIMEText(f"Your Virality Media verification code is: {otp}\n\nThis code will expire in 10 minutes.")
    msg["Subject"] = "Your Verification Code"
    msg["From"] = sender_email
    msg["To"] = recipient_email

    try:
        # Note: For production, consider a more robust service like SendGrid or AWS SES.
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(sender_email, [recipient_email], msg.as_string())
            logger.info(f"OTP email sent to {recipient_email}")
            return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {recipient_email}: {e}")
        return False