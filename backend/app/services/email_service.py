import smtplib
import os
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

# Brevo (formerly Sendinblue) SMTP — free 300 emails/day, no App Password needed
# Docs: https://help.brevo.com/hc/en-us/articles/209462765
SMTP_HOST = "smtp-relay.brevo.com"
SMTP_PORT = 587

# Debug: confirm credentials at startup
_sender = os.getenv("EMAIL_ADDRESS", "")
_api_key = os.getenv("EMAIL_APP_PASSWORD", "")
if _sender and _api_key:
    print(f"[Email] ✓ Credentials loaded — sender: {_sender}")
else:
    print("[Email] WARNING: EMAIL_ADDRESS or EMAIL_APP_PASSWORD missing from .env")


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send email via Brevo SMTP (smtp-relay.brevo.com, port 587).

    .env vars required:
      EMAIL_ADDRESS     = your Brevo account login email
      EMAIL_APP_PASSWORD = your Brevo SMTP Key (Brevo dashboard → SMTP & API → SMTP Keys)

    Never raises — all errors are logged and silently absorbed.
    """
    sender = os.getenv("EMAIL_ADDRESS", "")
    api_key = os.getenv("EMAIL_APP_PASSWORD", "")

    if not sender or not api_key:
        print("[Email] ERROR: EMAIL_ADDRESS or EMAIL_APP_PASSWORD not set — check .env")
        return False
    if not to_email:
        print("[Email] WARNING: No recipient address — skipping")
        return False

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(sender, api_key)
            smtp.send_message(msg)
        print(f"[Email] ✓ Sent to {to_email} — {subject}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"[Email] Auth failed (code {e.smtp_code}): {e.smtp_error}")
        print("[Email] FIX: EMAIL_ADDRESS = Brevo login email | EMAIL_APP_PASSWORD = Brevo SMTP Key")
        return False
    except Exception as e:
        print(f"[Email] ERROR {type(e).__name__}: {e}")
        return False


def build_crop_notification_email(
    crop_name: str,
    location: str,
    estimated_yield: float,
    harvest_start: str,
    harvest_end: str,
    price_min: float,
    price_max: float,
    byproducts: list | None = None,
) -> tuple[str, str]:
    """Build subject + body for a 'new crop available' buyer notification."""
    subject = f"New Crop Available in Vasudha — {crop_name.title()}"

    byproduct_section = ""
    if byproducts:
        bp_lines = "\n".join(
            f"  • {bp.get('name', 'Unknown')}: {bp.get('totalQuantity', 0):.1f} quintals"
            f"  (₹{bp.get('predictedPriceMin', 0):.0f}–₹{bp.get('predictedPriceMax', 0):.0f}/quintal)"
            for bp in byproducts
        )
        byproduct_section = f"\nBy-Products Available:\n{bp_lines}\n"

    body = f"""\
Hello,

Good news! A farmer has finalized a new crop plan on Vasudha that matches your demand.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CROP DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Crop           : {crop_name.title()}
  Location       : {location}
  Estimated Yield: {estimated_yield:.1f} quintals
  Harvest Window : {harvest_start} to {harvest_end}
  Price Range    : ₹{price_min:.0f} – ₹{price_max:.0f} per quintal
{byproduct_section}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Login to Vasudha to view this crop and place your commitment:
  {os.getenv("FRONTEND_URL", "http://localhost:5173")}/marketplace

This is an automated notification from Vasudha.
Please do not reply to this email.

— The Vasudha Team
"""
    return subject, body
