from datetime import datetime
from flask import current_app

from .extensions import scheduler


def schedule_jobs():
    if not scheduler.get_job("heartbeat"):
        scheduler.add_job(id="heartbeat", func=heartbeat, trigger="interval", minutes=30, replace_existing=True)


def heartbeat():
    current_app.logger.info(f"Scheduler heartbeat at {datetime.utcnow().isoformat()}Z")