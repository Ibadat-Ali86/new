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
    preferences = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    goals = db.relationship("Goal", backref="user", lazy=True, cascade="all, delete-orphan")
    resources = db.relationship("Resource", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        self.password_hash = bcrypt.hash(password)

    def check_password(self, password: str) -> bool:
        return bcrypt.verify(password, self.password_hash)


class Goal(db.Model):
    __tablename__ = "goals"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default="active", nullable=False)
    progress = db.Column(db.Float, default=0.0, nullable=False)
    target_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    progress_logs = db.relationship("ProgressLog", backref="goal", lazy=True, cascade="all, delete-orphan")


class Resource(db.Model):
    __tablename__ = "resources"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    goal_id = db.Column(db.Integer, db.ForeignKey("goals.id"), nullable=True, index=True)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(1024), nullable=True)
    path = db.Column(db.String(1024), nullable=True)
    metadata_json = db.Column(JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ProgressLog(db.Model):
    __tablename__ = "progress_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    goal_id = db.Column(db.Integer, db.ForeignKey("goals.id"), nullable=True, index=True)
    minutes = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


def get_user_summary(user_id: int) -> dict:
    goals_total = db.session.scalar(db.select(func.count(Goal.id)).where(Goal.user_id == user_id)) or 0
    resources_total = db.session.scalar(db.select(func.count(Resource.id)).where(Resource.user_id == user_id)) or 0
    minutes_total = db.session.scalar(db.select(func.coalesce(func.sum(ProgressLog.minutes), 0)).where(ProgressLog.user_id == user_id)) or 0
    return {
        "goals": goals_total,
        "resources": resources_total,
        "minutes": minutes_total,
    }