from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Goal, ProgressLog
from ..schemas import GoalCreateSchema, GoalUpdateSchema, ProgressLogSchema


bp = Blueprint("goals", __name__)
api = Api(bp)


def _user_id() -> int:
    return int(get_jwt_identity())


class GoalsListResource(Resource):
    @jwt_required()
    def get(self):
        goals = db.session.scalars(db.select(Goal).where(Goal.user_id == _user_id()).order_by(Goal.created_at.desc())).all()
        return [
            {
                "id": g.id,
                "title": g.title,
                "description": g.description,
                "status": g.status,
                "progress": g.progress,
                "target_date": g.target_date.isoformat() if g.target_date else None,
                "created_at": g.created_at.isoformat(),
            }
            for g in goals
        ]

    @jwt_required()
    def post(self):
        data = request.get_json() or {}
        errors = GoalCreateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
        goal = Goal(user_id=_user_id(), title=data["title"], description=data.get("description", ""), target_date=data.get("target_date"))
        db.session.add(goal)
        db.session.commit()
        return {"id": goal.id}, 201


class GoalResource(Resource):
    @jwt_required()
    def get(self, goal_id: int):
        goal = db.get_or_404(Goal, goal_id)
        if goal.user_id != _user_id():
            return {"message": "Not found"}, 404
        return {
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
            "status": goal.status,
            "progress": goal.progress,
            "target_date": goal.target_date.isoformat() if goal.target_date else None,
            "created_at": goal.created_at.isoformat(),
        }

    @jwt_required()
    def put(self, goal_id: int):
        goal = db.get_or_404(Goal, goal_id)
        if goal.user_id != _user_id():
            return {"message": "Not found"}, 404
        data = request.get_json() or {}
        errors = GoalUpdateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
        for key in ["title", "description", "status", "progress", "target_date"]:
            if key in data:
                setattr(goal, key, data[key])
        db.session.commit()
        return {"message": "updated"}, 200

    @jwt_required()
    def delete(self, goal_id: int):
        goal = db.get_or_404(Goal, goal_id)
        if goal.user_id != _user_id():
            return {"message": "Not found"}, 404
        db.session.delete(goal)
        db.session.commit()
        return {"message": "deleted"}, 200


class GoalProgressResource(Resource):
    @jwt_required()
    def post(self, goal_id: int):
        goal = db.get_or_404(Goal, goal_id)
        if goal.user_id != _user_id():
            return {"message": "Not found"}, 404
        data = request.get_json() or {}
        errors = ProgressLogSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
        log = ProgressLog(user_id=_user_id(), goal_id=goal.id, minutes=data["minutes"])
        db.session.add(log)
        db.session.commit()
        return {"message": "logged"}, 201


api.add_resource(GoalsListResource, "/")
api.add_resource(GoalResource, "/<int:goal_id>")
api.add_resource(GoalProgressResource, "/<int:goal_id>/progress")