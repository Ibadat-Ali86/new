from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from ..extensions import db
from ..models import User
from ..schemas import RegisterSchema, LoginSchema, ProfileUpdateSchema


bp = Blueprint("auth", __name__)
api = Api(bp)


class RegisterResource(Resource):
    def post(self):
        data = request.get_json() or {}
        errors = RegisterSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
        user = User(
            email=data["email"].lower().strip(),
            name=data["name"].strip(),
            timezone=data.get("timezone", "UTC")
        )
        user.set_password(data["password"])
        db.session.add(user)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return {"message": "Email already registered"}, 400
        return {"message": "Registration successful"}, 201


class LoginResource(Resource):
    def post(self):
        data = request.get_json() or {}
        errors = LoginSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
        user = db.session.scalar(db.select(User).where(User.email == data["email"].lower().strip()))
        if not user or not user.check_password(data["password"]):
            return {"message": "Invalid credentials"}, 401
            
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        access = create_access_token(identity=str(user.id))
        refresh = create_refresh_token(identity=str(user.id))
        return {
            "access_token": access,
            "refresh_token": refresh,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url,
                "bio": user.bio,
                "timezone": user.timezone,
                "email_verified": user.email_verified,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "created_at": user.created_at.isoformat()
            }
        }, 200


class RefreshResource(Resource):
    @jwt_required(refresh=True)
    def post(self):
        user_id = get_jwt_identity()
        return {"access_token": create_access_token(identity=user_id)}, 200


class ProfileResource(Resource):
    @jwt_required()
    def get(self):
        user_id = int(get_jwt_identity())
        user = db.get_or_404(User, user_id)
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "timezone": user.timezone,
            "email_verified": user.email_verified,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "preferences": user.preferences,
            "learning_streak": user.get_learning_streak(),
            "total_study_time": user.get_total_study_time(),
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat()
        }, 200
    
    @jwt_required()
    def put(self):
        user_id = int(get_jwt_identity())
        user = db.get_or_404(User, user_id)
        
        data = request.get_json() or {}
        errors = ProfileUpdateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
            
        for key in ["name", "bio", "timezone", "avatar_url"]:
            if key in data:
                setattr(user, key, data[key])
                
        db.session.commit()
        return {"message": "Profile updated successfully"}, 200


class PasswordChangeResource(Resource):
    @jwt_required()
    def post(self):
        user_id = int(get_jwt_identity())
        user = db.get_or_404(User, user_id)
        
        data = request.get_json() or {}
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        
        if not current_password or not new_password:
            return {"message": "Current password and new password are required"}, 400
            
        if not user.check_password(current_password):
            return {"message": "Current password is incorrect"}, 400
            
        if len(new_password) < 8:
            return {"message": "New password must be at least 8 characters long"}, 400
            
        user.set_password(new_password)
        db.session.commit()
class UserStatsResource(Resource):
    @jwt_required()
    def get(self):
        user_id = int(get_jwt_identity())
        from ..models import get_user_summary
        stats = get_user_summary(user_id)
        
        # Add additional stats
        user = db.get_or_404(User, user_id)
        stats.update({
            "learning_streak": user.get_learning_streak(),
            "total_study_time": user.get_total_study_time(),
            "member_since": user.created_at.isoformat()
        })
        
        return stats, 200
        
        return {"message": "Password changed successfully"}, 200
api.add_resource(RegisterResource, "/register")
api.add_resource(LoginResource, "/login")
api.add_resource(RefreshResource, "/refresh")
api.add_resource(ProfileResource, "/me")
api.add_resource(PasswordChangeResource, "/change-password")
api.add_resource(UserStatsResource, "/stats")