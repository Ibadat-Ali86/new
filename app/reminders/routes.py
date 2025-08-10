from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta

from ..extensions import db
from ..models import Reminder, Notification
from ..schemas import ReminderCreateSchema, ReminderUpdateSchema

bp = Blueprint("reminders", __name__)
api = Api(bp)


def _user_id() -> int:
    return int(get_jwt_identity())


class RemindersListResource(Resource):
    @jwt_required()
    def get(self):
        reminders = db.session.scalars(
            db.select(Reminder).where(Reminder.user_id == _user_id()).order_by(Reminder.created_at.desc())
        ).all()
        
        return [
            {
                "id": r.id,
                "title": r.title,
                "message": r.message,
                "reminder_type": r.reminder_type,
                "frequency": r.frequency,
                "next_reminder": r.next_reminder.isoformat(),
                "is_active": r.is_active,
                "email_enabled": r.email_enabled,
                "in_app_enabled": r.in_app_enabled,
                "goal_id": r.goal_id,
                "created_at": r.created_at.isoformat(),
            }
            for r in reminders
        ]
    
    @jwt_required()
    def post(self):
        data = request.get_json() or {}
        errors = ReminderCreateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
            
        reminder = Reminder(
            user_id=_user_id(),
            title=data["title"],
            message=data.get("message", ""),
            reminder_type=data["reminder_type"],
            frequency=data.get("frequency"),
            next_reminder=data["next_reminder"],
            goal_id=data.get("goal_id"),
            email_enabled=data.get("email_enabled", True),
            in_app_enabled=data.get("in_app_enabled", True)
        )
        db.session.add(reminder)
        db.session.commit()
        
        return {"id": reminder.id}, 201


class ReminderResource(Resource):
    @jwt_required()
    def get(self, reminder_id: int):
        reminder = db.get_or_404(Reminder, reminder_id)
        if reminder.user_id != _user_id():
            return {"message": "Not found"}, 404
            
        return {
            "id": reminder.id,
            "title": reminder.title,
            "message": reminder.message,
            "reminder_type": reminder.reminder_type,
            "frequency": reminder.frequency,
            "next_reminder": reminder.next_reminder.isoformat(),
            "is_active": reminder.is_active,
            "email_enabled": reminder.email_enabled,
            "in_app_enabled": reminder.in_app_enabled,
            "goal_id": reminder.goal_id,
            "created_at": reminder.created_at.isoformat(),
        }
    
    @jwt_required()
    def put(self, reminder_id: int):
        reminder = db.get_or_404(Reminder, reminder_id)
        if reminder.user_id != _user_id():
            return {"message": "Not found"}, 404
            
        data = request.get_json() or {}
        errors = ReminderUpdateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
            
        for key in ["title", "message", "reminder_type", "frequency", "next_reminder", "is_active", "email_enabled", "in_app_enabled"]:
            if key in data:
                setattr(reminder, key, data[key])
                
        db.session.commit()
        return {"message": "updated"}, 200
    
    @jwt_required()
    def delete(self, reminder_id: int):
        reminder = db.get_or_404(Reminder, reminder_id)
        if reminder.user_id != _user_id():
            return {"message": "Not found"}, 404
            
        db.session.delete(reminder)
        db.session.commit()
        return {"message": "deleted"}, 200


class NotificationsListResource(Resource):
    @jwt_required()
    def get(self):
        notifications = db.session.scalars(
            db.select(Notification).where(Notification.user_id == _user_id()).order_by(Notification.created_at.desc()).limit(50)
        ).all()
        
        return [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "is_read": n.is_read,
                "action_url": n.action_url,
                "metadata": n.metadata_json,
                "created_at": n.created_at.isoformat(),
                "read_at": n.read_at.isoformat() if n.read_at else None,
            }
            for n in notifications
        ]


class NotificationResource(Resource):
    @jwt_required()
    def put(self, notification_id: int):
        notification = db.get_or_404(Notification, notification_id)
        if notification.user_id != _user_id():
            return {"message": "Not found"}, 404
            
        # Mark as read
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.session.commit()
            
        return {"message": "marked as read"}, 200


class NotificationsBulkResource(Resource):
    @jwt_required()
    def put(self):
        """Mark all notifications as read"""
        notifications = db.session.scalars(
            db.select(Notification).where(
                Notification.user_id == _user_id(),
                Notification.is_read == False
            )
        ).all()
        
        for notification in notifications:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            
        db.session.commit()
        return {"message": f"Marked {len(notifications)} notifications as read"}, 200
    
    @jwt_required()
    def delete(self):
        """Delete all notifications"""
        db.session.execute(
            db.delete(Notification).where(Notification.user_id == _user_id())
        )
        db.session.commit()
        return {"message": "All notifications deleted"}, 200


api.add_resource(RemindersListResource, "/")
api.add_resource(ReminderResource, "/<int:reminder_id>")
api.add_resource(NotificationsListResource, "/notifications")
api.add_resource(NotificationResource, "/notifications/<int:notification_id>")
api.add_resource(NotificationsBulkResource, "/notifications/bulk")