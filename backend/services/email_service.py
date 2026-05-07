"""
PaySplit Email Service
Handles all transactional emails via SendGrid.
"""

import os
import logging
from typing import Optional

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

logger = logging.getLogger(__name__)

# Load config from env
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "rajukotturi45@gmail.com")
SENDGRID_FROM_NAME = os.getenv("SENDGRID_FROM_NAME", "PaySplit")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _get_client() -> Optional[SendGridAPIClient]:
    """Initialize SendGrid client. Returns None if key is missing."""
    if not SENDGRID_API_KEY:
        logger.error("SENDGRID_API_KEY is not set in environment")
        return None
    return SendGridAPIClient(SENDGRID_API_KEY)


def _send(to_email: str, subject: str, html_content: str) -> bool:
    """Core send function. Returns True on success, False otherwise."""
    client = _get_client()
    if not client:
        logger.error(f"Cannot send to {to_email}: SendGrid not configured")
        return False

    try:
        message = Mail(
            from_email=Email(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content),
        )
        response = client.send(message)
        logger.info(
            f"Email sent to {to_email} | Status: {response.status_code}"
        )
        # 2xx = success
        return 200 <= response.status_code < 300
    except Exception as e:
        logger.exception(f"Failed to send email to {to_email}: {e}")
        return False


# ---------------------------------------------------------------------------
# Public email functions
# ---------------------------------------------------------------------------

def send_approval_email(
    participant_email: str,
    approval_link: str,
    merchant_name: str,
    amount: float,
    initiator_name: str = "A friend",
) -> bool:
    """
    Sends an approval request email to a participant invited to a split.
    """
    subject = f"{initiator_name} wants to split a payment with you on PaySplit"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>PaySplit Approval Request</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">PaySplit</h1>
                  <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px;">Split any online payment</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px 30px;">
                  <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:22px;">You've been invited to a split</h2>
                  <p style="color:#4a4a4a;font-size:16px;line-height:1.6;margin:0 0 24px;">
                    <strong>{initiator_name}</strong> is splitting a payment at <strong>{merchant_name}</strong> and has asked you to cover your share.
                  </p>

                  <!-- Amount box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9ff;border:1px solid #e0e4ff;border-radius:8px;margin:0 0 32px;">
                    <tr>
                      <td style="padding:24px;text-align:center;">
                        <p style="color:#667eea;margin:0 0 8px;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your Share</p>
                        <p style="color:#1a1a1a;margin:0;font-size:36px;font-weight:700;">${amount:.2f}</p>
                        <p style="color:#6a6a6a;margin:8px 0 0;font-size:14px;">at {merchant_name}</p>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="{approval_link}"
                           style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:600;">
                          Review &amp; Approve
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color:#8a8a8a;font-size:13px;line-height:1.5;margin:32px 0 0;text-align:center;">
                    This link expires in 7 days. If you didn't expect this email, you can safely ignore it.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#f8f9fa;padding:24px 30px;text-align:center;border-top:1px solid #e8e8e8;">
                  <p style="color:#8a8a8a;font-size:12px;margin:0;">
                    &copy; 2026 PaySplit &middot; <a href="https://www.paysplit.in" style="color:#667eea;text-decoration:none;">paysplit.in</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    return _send(participant_email, subject, html_content)


def send_split_created_email(
    initiator_email: str,
    merchant_name: str,
    total_amount: float,
    participant_count: int,
) -> bool:
    """
    Confirmation email to the person who created the split.
    """
    subject = f"Your split at {merchant_name} was created"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Split Created ✓</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px 30px;">
                  <p style="color:#4a4a4a;font-size:16px;line-height:1.6;margin:0 0 16px;">
                    Your split at <strong>{merchant_name}</strong> for <strong>${total_amount:.2f}</strong> has been created.
                  </p>
                  <p style="color:#4a4a4a;font-size:16px;line-height:1.6;margin:0 0 24px;">
                    Approval requests have been sent to <strong>{participant_count} participant{"s" if participant_count != 1 else ""}</strong>. We'll notify you as each person responds.
                  </p>
                  <p style="color:#8a8a8a;font-size:14px;margin:0;">
                    Status: <strong style="color:#f59e0b;">Awaiting Approvals</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f9fa;padding:24px 30px;text-align:center;border-top:1px solid #e8e8e8;">
                  <p style="color:#8a8a8a;font-size:12px;margin:0;">
                    &copy; 2026 PaySplit &middot; <a href="https://www.paysplit.in" style="color:#667eea;text-decoration:none;">paysplit.in</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    return _send(initiator_email, subject, html_content)


def send_approval_status_email(
    initiator_email: str,
    merchant_name: str,
    participant_name: str,
    status: str,
) -> bool:
    """
    Notify the initiator when a participant approves or declines.
    status: 'approved' or 'declined'
    """
    is_approved = status.lower() == "approved"
    emoji = "✅" if is_approved else "❌"
    color = "#10b981" if is_approved else "#ef4444"
    action_word = "approved" if is_approved else "declined"

    subject = f"{participant_name} {action_word} your split at {merchant_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">PaySplit Update</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px 30px;text-align:center;">
                  <div style="font-size:48px;margin-bottom:16px;">{emoji}</div>
                  <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:22px;">
                    <span style="color:{color};">{participant_name}</span> {action_word} the split
                  </h2>
                  <p style="color:#4a4a4a;font-size:16px;line-height:1.6;margin:0;">
                    for your payment at <strong>{merchant_name}</strong>.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f9fa;padding:24px 30px;text-align:center;border-top:1px solid #e8e8e8;">
                  <p style="color:#8a8a8a;font-size:12px;margin:0;">
                    &copy; 2026 PaySplit &middot; <a href="https://www.paysplit.in" style="color:#667eea;text-decoration:none;">paysplit.in</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    return _send(initiator_email, subject, html_content)