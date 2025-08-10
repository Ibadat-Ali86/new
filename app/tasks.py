from datetime import datetime
from flask import current_app

from .extensions import scheduler
from .models import Reminder, Notification, User, Goal
from .extensions import db
from .email import send_email


def schedule_jobs():
    if not scheduler.get_job("heartbeat"):
        scheduler.add_job(id="heartbeat", func=heartbeat, trigger="interval", minutes=30, replace_existing=True)
    
    if not scheduler.get_job("process_reminders"):
        scheduler.add_job(id="process_reminders", func=process_reminders, trigger="interval", minutes=5, replace_existing=True)
    
    if not scheduler.get_job("check_goal_deadlines"):
        scheduler.add_job(id="check_goal_deadlines", func=check_goal_deadlines, trigger="interval", hours=1, replace_existing=True)


def heartbeat():
    current_app.logger.info(f"Scheduler heartbeat at {datetime.utcnow().isoformat()}Z")


def process_reminders():
    """Process due reminders and send notifications"""
    try:
        with current_app.app_context():
            now = datetime.utcnow()
            due_reminders = db.session.scalars(
                db.select(Reminder).where(
                    Reminder.is_active == True,
                    Reminder.next_reminder <= now
                )
            ).all()
            
            for reminder in due_reminders:
                try:
                    # Create in-app notification if enabled
                    if reminder.in_app_enabled:
                        notification = Notification(
                            user_id=reminder.user_id,
                            title=reminder.title,
                            message=reminder.message,
                            notification_type="reminder",
                            action_url=f"/goals/{reminder.goal_id}" if reminder.goal_id else None
                        )
                        db.session.add(notification)
                    
                    # Send email if enabled
                    if reminder.email_enabled:
                        user = db.session.get(User, reminder.user_id)
                        if user and user.email:
                            try:
                                send_email(
                                    subject=f"Learning Reminder: {reminder.title}",
                                    recipients=[user.email],
                                    html=f"""
                                    <h2>{reminder.title}</h2>
                                    <p>{reminder.message}</p>
                                    <p>This is a reminder from your Learning Dashboard.</p>
                                    <p><a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:5000')}">Visit Dashboard</a></p>
                                    """
                                )
                            except Exception as e:
                                current_app.logger.error(f"Failed to send reminder email: {e}")
                    
                    # Update next reminder time based on frequency
                    if reminder.reminder_type == "daily":
                        reminder.next_reminder = now + timedelta(days=1)
                    elif reminder.reminder_type == "weekly":
                        reminder.next_reminder = now + timedelta(weeks=1)
                    elif reminder.reminder_type == "custom" and reminder.frequency:
                        # Parse custom frequency (e.g., "3 days", "2 hours")
                        try:
                            parts = reminder.frequency.split()
                            if len(parts) == 2:
                                amount = int(parts[0])
                                unit = parts[1].lower()
                                if unit.startswith('day'):
                                    reminder.next_reminder = now + timedelta(days=amount)
                                elif unit.startswith('hour'):
                                    reminder.next_reminder = now + timedelta(hours=amount)
                                elif unit.startswith('week'):
                                    reminder.next_reminder = now + timedelta(weeks=amount)
                        except:
                            # Default to daily if parsing fails
                            reminder.next_reminder = now + timedelta(days=1)
                    else:
                        # For deadline reminders, deactivate after sending
                        reminder.is_active = False
                    
                    db.session.commit()
                    
                except Exception as e:
                    current_app.logger.error(f"Error processing reminder {reminder.id}: {e}")
                    db.session.rollback()
                    
    except Exception as e:
        current_app.logger.error(f"Error in process_reminders: {e}")


def check_goal_deadlines():
    """Check for approaching goal deadlines and create notifications"""
    try:
        with current_app.app_context():
            from datetime import date, timedelta
            
            # Check for goals due in 1 day, 3 days, and 7 days
            for days_ahead in [1, 3, 7]:
                target_date = date.today() + timedelta(days=days_ahead)
                
                goals = db.session.scalars(
                    db.select(Goal).where(
                        Goal.target_date == target_date,
                        Goal.is_completed == False
                    )
                ).all()
                
                for goal in goals:
                    # Check if we already sent a notification for this deadline
                    existing_notification = db.session.scalar(
                        db.select(Notification).where(
                            Notification.user_id == goal.user_id,
                            Notification.notification_type == "deadline",
                            Notification.metadata_json.contains(f'"goal_id": {goal.id}'),
                            Notification.metadata_json.contains(f'"days_ahead": {days_ahead}'),
                            Notification.created_at >= datetime.utcnow() - timedelta(days=1)
                        )
                    )
                    
                    if not existing_notification:
                        if days_ahead == 1:
                            title = f"Goal Due Tomorrow: {goal.title}"
                            message = f"Your goal '{goal.title}' is due tomorrow!"
                        elif days_ahead == 3:
                            title = f"Goal Due in 3 Days: {goal.title}"
                            message = f"Your goal '{goal.title}' is due in 3 days."
                        else:  # 7 days
                            title = f"Goal Due in 1 Week: {goal.title}"
                            message = f"Your goal '{goal.title}' is due in 1 week."
                        
                        notification = Notification(
                            user_id=goal.user_id,
                            title=title,
                            message=message,
                            notification_type="deadline",
                            action_url=f"/goals/{goal.id}",
                            metadata_json={
                                "goal_id": goal.id,
                                "days_ahead": days_ahead,
                                "target_date": goal.target_date.isoformat()
                            }
                        )
                        db.session.add(notification)
                        
                        # Also send email if user has email notifications enabled
                        user = db.session.get(User, goal.user_id)
                        if user and user.email and user.preferences and user.preferences.get('email_notifications', True):
                            try:
                                send_email(
                                    subject=title,
                                    recipients=[user.email],
                                    html=f"""
                                    <h2>{title}</h2>
                                    <p>{message}</p>
                                    <p><strong>Goal:</strong> {goal.title}</p>
                                    <p><strong>Target Date:</strong> {goal.target_date.strftime('%B %d, %Y')}</p>
                                    <p><strong>Current Progress:</strong> {goal.progress}%</p>
                                    <p><a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:5000')}/goals/{goal.id}">View Goal</a></p>
                                    """
                                )
                            except Exception as e:
                                current_app.logger.error(f"Failed to send deadline email: {e}")
            
            db.session.commit()
            
    except Exception as e:
        current_app.logger.error(f"Error in check_goal_deadlines: {e}")


def create_achievement_notification(user_id: int, achievement_type: str, title: str, message: str):
    """Create an achievement notification"""
    try:
        with current_app.app_context():
            notification = Notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type="achievement",
                metadata_json={"achievement_type": achievement_type}
            )
            db.session.add(notification)
            db.session.commit()
    except Exception as e:
        current_app.logger.error(f"Error creating achievement notification: {e}")