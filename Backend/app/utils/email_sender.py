import smtplib
from email.mime.text import MIMEText
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger()

def send_otp_email(recipient_email: str, otp: str) -> bool:
    """
    Sends a One-Time Password (OTP) email to the user's address.

    Args:
        recipient_email (str): The target email address.
        otp (str): The OTP code to send.

    Returns:
        bool: True if sent successfully, False otherwise.
    """
    sender_email = settings.SMTP_USERNAME or "noreply@virality.media"
    smtp_server = settings.SMTP_SERVER
    smtp_port = int(settings.SMTP_PORT or 587)

    msg = MIMEText(
        f"""
        Your Virality Media verification code is: {otp}

        This code will expire in 10 minutes.
        If you didn’t request this, please ignore this email.
        """
    )
    msg["Subject"] = "🔐 Your Virality Verification Code"
    msg["From"] = sender_email
    msg["To"] = recipient_email

    try:
        # Secure SMTP connection
        with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(sender_email, [recipient_email], msg.as_string())

        logger.info(f"[MAIL] OTP email sent → {recipient_email}")
        return True

    except Exception as e:
        logger.error(f"[MAIL] Failed to send OTP to {recipient_email}: {e}", exc_info=True)
        return False
