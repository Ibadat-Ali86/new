from datetime import datetime
from typing import Optional

from passlib.hash import bcrypt
from sqlalchemy import func
from sqlalchemy.dialects.sqlite import JSON

from .extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_url = db.Column(db.String(500), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    timezone = db.Column(db.String(50), default='UTC', nullable=False)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    preferences = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    goals = db.relationship("Goal", backref="user", lazy=True, cascade="all, delete-orphan")
    resources = db.relationship("Resource", backref="user", lazy=True, cascade="all, delete-orphan")
    milestones = db.relationship("Milestone", backref="user", lazy=True, cascade="all, delete-orphan")
    reminders = db.relationship("Reminder", backref="user", lazy=True, cascade="all, delete-orphan")
    notifications = db.relationship("Notification", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        self.password_hash = bcrypt.hash(password)

    def check_password(self, password: str) -> bool:
        return bcrypt.verify(password, self.password_hash)
    
    def get_learning_streak(self) -> int:
        """Calculate current learning streak in days"""
        progress_logs = db.session.query(ProgressLog).filter_by(user_id=self.id).order_by(ProgressLog.created_at.desc()).all()
        if not progress_logs:
            return 0
        
        streak = 0
        current_date = datetime.utcnow().date()
        
        for log in progress_logs:
            log_date = log.created_at.date()
            if log_date == current_date or (current_date - log_date).days == streak + 1:
                streak += 1
                current_date = log_date
            else:
                break
        
        return streak
    
    def get_total_study_time(self) -> int:
        """Get total study time in minutes"""
        total = db.session.query(func.sum(ProgressLog.minutes)).filter_by(user_id=self.id).scalar()
        return total or 0


class Goal(db.Model):
    __tablename__ = "goals"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(100), nullable=False, default='general')
    priority = db.Column(db.String(20), default='medium', nullable=False)  # low, medium, high
    status = db.Column(db.String(50), default="active", nullable=False)
    progress = db.Column(db.Float, default=0.0, nullable=False)
    target_date = db.Column(db.Date, nullable=True)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    tags = db.Column(JSON, nullable=True)  # List of tags
    estimated_hours = db.Column(db.Integer, nullable=True)
    actual_hours = db.Column(db.Float, default=0.0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    progress_logs = db.relationship("ProgressLog", backref="goal", lazy=True, cascade="all, delete-orphan")
    milestones = db.relationship("Milestone", backref="goal", lazy=True, cascade="all, delete-orphan")
    reminders = db.relationship("Reminder", backref="goal", lazy=True, cascade="all, delete-orphan")
    
    def calculate_progress(self):
        """Calculate progress based on completed milestones"""
        if not self.milestones:
            return self.progress
        
        completed = sum(1 for m in self.milestones if m.is_completed)
        total = len(self.milestones)
        return (completed / total) * 100 if total > 0 else 0
    
    def is_overdue(self) -> bool:
        """Check if goal is overdue"""
        if not self.target_date or self.is_completed:
            return False
        return datetime.utcnow().date() > self.target_date
    
    def days_until_deadline(self) -> Optional[int]:
        """Get days until deadline"""
        if not self.target_date:
            return None
        delta = self.target_date - datetime.utcnow().date()
        return delta.days


class Milestone(db.Model):
    __tablename__ = "milestones"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    goal_id = db.Column(db.Integer, db.ForeignKey("goals.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    order_index = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
class Resource(db.Model):
    __tablename__ = "resources"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    goal_id = db.Column(db.Integer, db.ForeignKey("goals.id"), nullable=True, index=True)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(1024), nullable=True)
    path = db.Column(db.String(1024), nullable=True)
    content = db.Column(db.Text, nullable=True)  # For notes
    category = db.Column(db.String(100), nullable=False, default='general')
    tags = db.Column(JSON, nullable=True)  # List of tags
    rating = db.Column(db.Integer, nullable=True)  # 1-5 stars
    is_favorite = db.Column(db.Boolean, default=False, nullable=False)
    last_accessed = db.Column(db.DateTime, nullable=True)
    file_size = db.Column(db.Integer, nullable=True)  # In bytes
    file_type = db.Column(db.String(100), nullable=True)
    metadata_json = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ProgressLog(db.Model):
    __tablename__ = "progress_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    goal_id = db.Column(db.Integer, db.ForeignKey("goals.id"), nullable=True, index=True)
    milestone_id = db.Column(db.Integer, db.ForeignKey("milestones.id"), nullable=True, index=True)
    minutes = db.Column(db.Integer, nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)
    activity_type = db.Column(db.String(50), default='study', nullable=False)  # study, reading, practice, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    milestone = db.relationship("Milestone", backref="progress_logs")


class Reminder(db.Model):
    __tablename__ = "reminders"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    goal_id = db.Column(db.Integer, db.ForeignKey("goals.id"), nullable=True, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=True)
    reminder_type = db.Column(db.String(50), nullable=False)  # daily, weekly, custom, deadline
    frequency = db.Column(db.String(50), nullable=True)  # For recurring reminders
    next_reminder = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
class Notification(db.Model):
    __tablename__ = "notifications"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)  # reminder, achievement, system
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    action_url = db.Column(db.String(500), nullable=True)
    metadata_json = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    read_at = db.Column(db.DateTime, nullable=True)
    email_enabled = db.Column(db.Boolean, default=True, nullable=False)
    in_app_enabled = db.Column(db.Boolean, default=True, nullable=False)
class Achievement(db.Model):
    __tablename__ = "achievements"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    achievement_type = db.Column(db.String(50), nullable=False)  # streak, goals_completed, etc.
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    badge_icon = db.Column(db.String(100), nullable=True)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    user = db.relationship("User", backref="achievements")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
def get_user_summary(user_id: int) -> dict:
    goals_total = db.session.scalar(db.select(func.count(Goal.id)).where(Goal.user_id == user_id)) or 0
    goals_completed = db.session.scalar(db.select(func.count(Goal.id)).where(Goal.user_id == user_id, Goal.is_completed == True)) or 0
    goals_overdue = db.session.scalar(db.select(func.count(Goal.id)).where(
        Goal.user_id == user_id, 
        Goal.is_completed == False,
        Goal.target_date < datetime.utcnow().date()
    )) or 0
    resources_total = db.session.scalar(db.select(func.count(Resource.id)).where(Resource.user_id == user_id)) or 0
    minutes_total = db.session.scalar(db.select(func.coalesce(func.sum(ProgressLog.minutes), 0)).where(ProgressLog.user_id == user_id)) or 0
    milestones_total = db.session.scalar(db.select(func.count(Milestone.id)).where(Milestone.user_id == user_id)) or 0
    milestones_completed = db.session.scalar(db.select(func.count(Milestone.id)).where(Milestone.user_id == user_id, Milestone.is_completed == True)) or 0
    
    # Get learning streak
    user = db.session.get(User, user_id)
    streak = user.get_learning_streak() if user else 0
    
    return {
        "goals": goals_total,
        "goals_completed": goals_completed,
        "goals_overdue": goals_overdue,
        "resources": resources_total,
        "minutes": minutes_total,
        "hours": round(minutes_total / 60, 1),
        "milestones": milestones_total,
        "milestones_completed": milestones_completed,
        "learning_streak": streak,
        "completion_rate": round((goals_completed / goals_total * 100) if goals_total > 0 else 0, 1)
    }