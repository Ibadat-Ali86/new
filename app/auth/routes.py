from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import User
from ..schemas import RegisterSchema, LoginSchema


bp = Blueprint("auth", __name__)
api = Api(bp)


class RegisterResource(Resource):
    def post(self):
        data = request.get_json() or {}
        errors = RegisterSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
        user = User(email=data["email"].lower().strip(), name=data["name"].strip())
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
        access = create_access_token(identity=str(user.id))
        refresh = create_refresh_token(identity=str(user.id))
        return {"access_token": access, "refresh_token": refresh, "user": {"id": user.id, "email": user.email, "name": user.name}}, 200


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
        return {"id": user.id, "email": user.email, "name": user.name, "preferences": user.preferences}, 200


api.add_resource(RegisterResource, "/register")
api.add_resource(LoginResource, "/login")
api.add_resource(RefreshResource, "/refresh")
api.add_resource(ProfileResource, "/me")