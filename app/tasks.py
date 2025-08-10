from datetime import datetime, timedelta
from flask import current_app

from .extensions import scheduler, db
from .models import Reminder, Notification, User, Goal
from .email import send_email


def schedule_jobs():
    """Schedule all background jobs"""
    if not scheduler.get_job("heartbeat"):
        scheduler.add_job(
            id="heartbeat", 
            func=heartbeat, 
            trigger="interval", 
            minutes=30, 
            replace_existing=True
        )
    
    if not scheduler.get_job("process_reminders"):
        scheduler.add_job(
            id="process_reminders", 
            func=process_reminders, 
            trigger="interval", 
            minutes=5, 
            replace_existing=True
        )
    
    if not scheduler.get_job("check_goal_deadlines"):
        scheduler.add_job(
            id="check_goal_deadlines", 
            func=check_goal_deadlines, 
            trigger="interval", 
            hours=1, 
            replace_existing=True
        )
    
    if not scheduler.get_job("generate_daily_reminders"):
        scheduler.add_job(
            id="generate_daily_reminders",
            func=generate_daily_reminders,
            trigger="cron",
            hour=9,  # 9 AM daily
            replace_existing=True
        )


def heartbeat():
    """Simple heartbeat to keep scheduler alive"""
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
                            action_url=f"/goals/{reminder.goal_id}" if reminder.goal_id else None,
                            metadata_json={"reminder_id": reminder.id}
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
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <h2 style="color: #0d6efd;">{reminder.title}</h2>
                                        <p>{reminder.message}</p>
                                        <p>This is a reminder from your Learning Dashboard.</p>
                                        <div style="margin: 20px 0;">
                                            <a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:5000')}" 
                                               style="background-color: #0d6efd; color: white; padding: 10px 20px; 
                                                      text-decoration: none; border-radius: 5px;">
                                                Visit Dashboard
                                            </a>
                                        </div>
                                        <hr>
                                        <p style="color: #666; font-size: 12px;">
                                            You're receiving this because you have email notifications enabled. 
                                            You can manage your notification preferences in your dashboard settings.
                                        </p>
                                    </div>
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
                                else:
                                    # Default to daily if unit not recognized
                                    reminder.next_reminder = now + timedelta(days=1)
                            else:
                                # Default to daily if parsing fails
                                reminder.next_reminder = now + timedelta(days=1)
                        except (ValueError, IndexError):
                            # Default to daily if parsing fails
                            reminder.next_reminder = now + timedelta(days=1)
                    else:
                        # For deadline reminders, deactivate after sending
                        reminder.is_active = False
                    
                    db.session.commit()
                    current_app.logger.info(f"Processed reminder {reminder.id} for user {reminder.user_id}")
                    
                except Exception as e:
                    current_app.logger.error(f"Error processing reminder {reminder.id}: {e}")
                    db.session.rollback()
                    
    except Exception as e:
        current_app.logger.error(f"Error in process_reminders: {e}")


def check_goal_deadlines():
    """Check for approaching goal deadlines and create notifications"""
    try:
        with current_app.app_context():
            from datetime import date
            
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
                            message = f"Your goal '{goal.title}' is due tomorrow! Current progress: {goal.progress}%"
                        elif days_ahead == 3:
                            title = f"Goal Due in 3 Days: {goal.title}"
                            message = f"Your goal '{goal.title}' is due in 3 days. Current progress: {goal.progress}%"
                        else:  # 7 days
                            title = f"Goal Due in 1 Week: {goal.title}"
                            message = f"Your goal '{goal.title}' is due in 1 week. Current progress: {goal.progress}%"
                        
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
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <h2 style="color: #dc3545;">{title}</h2>
                                        <p>{message}</p>
                                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                            <p><strong>Goal:</strong> {goal.title}</p>
                                            <p><strong>Target Date:</strong> {goal.target_date.strftime('%B %d, %Y')}</p>
                                            <p><strong>Current Progress:</strong> {goal.progress}%</p>
                                            <p><strong>Category:</strong> {goal.category}</p>
                                        </div>
                                        <div style="margin: 20px 0;">
                                            <a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:5000')}/goals/{goal.id}" 
                                               style="background-color: #0d6efd; color: white; padding: 10px 20px; 
                                                      text-decoration: none; border-radius: 5px;">
                                                View Goal
                                            </a>
                                        </div>
                                        <hr>
                                        <p style="color: #666; font-size: 12px;">
                                            You're receiving this because you have email notifications enabled. 
                                            You can manage your notification preferences in your dashboard settings.
                                        </p>
                                    </div>
                                    """
                                )
                            except Exception as e:
                                current_app.logger.error(f"Failed to send deadline email: {e}")
            
            db.session.commit()
            current_app.logger.info("Completed goal deadline check")
            
    except Exception as e:
        current_app.logger.error(f"Error in check_goal_deadlines: {e}")


def generate_daily_reminders():
    """Generate daily learning reminders for active users"""
    try:
        with current_app.app_context():
            # Get users who have been active in the last 7 days
            week_ago = datetime.utcnow() - timedelta(days=7)
            active_users = db.session.scalars(
                db.select(User).where(
                    User.is_active == True,
                    User.last_login >= week_ago
                )
            ).all()
            
            for user in active_users:
                # Check if user has any active goals
                active_goals = db.session.scalars(
                    db.select(Goal).where(
                        Goal.user_id == user.id,
                        Goal.is_completed == False
                    )
                ).all()
                
                if active_goals:
                    # Create a daily motivation notification
                    goal_count = len(active_goals)
                    completed_goals = db.session.scalar(
                        db.select(db.func.count(Goal.id)).where(
                            Goal.user_id == user.id,
                            Goal.is_completed == True
                        )
                    ) or 0
                    
                    streak = user.get_learning_streak()
                    
                    # Personalized message based on user's progress
                    if streak >= 7:
                        message = f"Amazing! You're on a {streak}-day learning streak! Keep up the excellent work with your {goal_count} active goals."
                    elif completed_goals > 0:
                        message = f"You've completed {completed_goals} goals so far! Time to make progress on your {goal_count} active goals today."
                    else:
                        message = f"Ready to tackle your {goal_count} learning goals today? Every small step counts!"
                    
                    # Check if we already sent a daily reminder today
                    today = datetime.utcnow().date()
                    existing_reminder = db.session.scalar(
                        db.select(Notification).where(
                            Notification.user_id == user.id,
                            Notification.notification_type == "reminder",
                            Notification.title.contains("Daily Learning"),
                            db.func.date(Notification.created_at) == today
                        )
                    )
                    
                    if not existing_reminder:
                        notification = Notification(
                            user_id=user.id,
                            title="Daily Learning Reminder 📚",
                            message=message,
                            notification_type="reminder",
                            metadata_json={
                                "type": "daily_motivation",
                                "streak": streak,
                                "active_goals": goal_count,
                                "completed_goals": completed_goals
                            }
                        )
                        db.session.add(notification)
            
            db.session.commit()
            current_app.logger.info(f"Generated daily reminders for {len(active_users)} active users")
            
    except Exception as e:
        current_app.logger.error(f"Error in generate_daily_reminders: {e}")


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
            current_app.logger.info(f"Created achievement notification for user {user_id}: {title}")
    except Exception as e:
        current_app.logger.error(f"Error creating achievement notification: {e}")


def check_achievements(user_id: int):
    """Check and award achievements for a user"""
    try:
        with current_app.app_context():
            user = db.session.get(User, user_id)
            if not user:
                return
            
            goals = db.session.scalars(
                db.select(Goal).where(Goal.user_id == user_id)
            ).all()
            
            completed_goals = [g for g in goals if g.is_completed]
            streak = user.get_learning_streak()
            
            # First goal completion
            if len(completed_goals) == 1:
                create_achievement_notification(
                    user_id,
                    "first_goal",
                    "🎯 First Goal Complete!",
                    "Congratulations on completing your first learning goal! This is just the beginning of your journey."
                )
            
            # Multiple goal milestones
            elif len(completed_goals) == 5:
                create_achievement_notification(
                    user_id,
                    "goal_master",
                    "🏆 Goal Master!",
                    "Amazing! You've completed 5 learning goals. You're becoming a learning champion!"
                )
            
            elif len(completed_goals) == 10:
                create_achievement_notification(
                    user_id,
                    "learning_champion",
                    "🌟 Learning Champion!",
                    "Incredible! You've completed 10 learning goals. Your dedication is truly inspiring!"
                )
            
            # Streak achievements
            if streak == 7:
                create_achievement_notification(
                    user_id,
                    "week_streak",
                    "🔥 Week Streak!",
                    "You've maintained a 7-day learning streak! Consistency is the key to success."
                )
            
            elif streak == 30:
                create_achievement_notification(
                    user_id,
                    "month_streak",
                    "💪 Month Streak!",
                    "Outstanding! You've maintained a 30-day learning streak. You're unstoppable!"
                )
            
            elif streak == 100:
                create_achievement_notification(
                    user_id,
                    "century_streak",
                    "🏅 Century Streak!",
                    "Legendary! 100 days of continuous learning. You're an inspiration to others!"
                )
            
    except Exception as e:
        current_app.logger.error(f"Error checking achievements for user {user_id}: {e}")


def cleanup_old_notifications():
    """Clean up old notifications (older than 30 days)"""
    try:
        with current_app.app_context():
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            deleted_count = db.session.execute(
                db.delete(Notification).where(
                    Notification.created_at < thirty_days_ago,
                    Notification.is_read == True
                )
            ).rowcount
            
            db.session.commit()
            current_app.logger.info(f"Cleaned up {deleted_count} old notifications")
            
    except Exception as e:
        current_app.logger.error(f"Error in cleanup_old_notifications: {e}")


# Schedule cleanup job to run weekly
def schedule_cleanup():
    """Schedule the cleanup job"""
    if not scheduler.get_job("cleanup_notifications"):
        scheduler.add_job(
            id="cleanup_notifications",
            func=cleanup_old_notifications,
            trigger="cron",
            day_of_week=0,  # Sunday
            hour=2,  # 2 AM
            replace_existing=True
        )