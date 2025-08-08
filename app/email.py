from typing import List, Optional
from flask_mail import Message
from flask import current_app

from .extensions import mail


def send_email(subject: str, recipients: List[str], html: str, sender: Optional[str] = None) -> None:
    msg = Message(subject=subject, recipients=recipients, html=html, sender=sender or current_app.config.get("MAIL_DEFAULT_SENDER"))
    mail.send(msg)