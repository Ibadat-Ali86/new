from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Goal, ProgressLog, Milestone
from ..schemas import GoalCreateSchema, GoalUpdateSchema, ProgressLogSchema, MilestoneCreateSchema, MilestoneUpdateSchema


bp = Blueprint("goals", __name__)
api = Api(bp)


def _user_id() -> int:
    return int(get_jwt_identity())


class GoalsListResource(Resource):
    @jwt_required()
    def get(self):
        # Get query parameters for filtering
        status = request.args.get('status')
        category = request.args.get('category')
        priority = request.args.get('priority')
        
        query = db.select(Goal).where(Goal.user_id == _user_id())
        
        if status:
            if status == 'completed':
                query = query.where(Goal.is_completed == True)
            elif status == 'active':
                query = query.where(Goal.is_completed == False)
            elif status == 'overdue':
                from datetime import datetime
                query = query.where(Goal.is_completed == False, Goal.target_date < datetime.utcnow().date())
        
        if category:
            query = query.where(Goal.category == category)
            
        if priority:
            query = query.where(Goal.priority == priority)
        
        goals = db.session.scalars(query.order_by(Goal.created_at.desc())).all()
        
        return [
            {
                "id": g.id,
                "title": g.title,
                "description": g.description,
                "category": g.category,
                "priority": g.priority,
                "status": g.status,
                "progress": g.progress,
                "is_completed": g.is_completed,
                "completed_at": g.completed_at.isoformat() if g.completed_at else None,
                "target_date": g.target_date.isoformat() if g.target_date else None,
                "estimated_hours": g.estimated_hours,
                "actual_hours": g.actual_hours,
                "tags": g.tags or [],
                "is_overdue": g.is_overdue(),
                "days_until_deadline": g.days_until_deadline(),
                "milestones_count": len(g.milestones),
                "milestones_completed": sum(1 for m in g.milestones if m.is_completed),
                "created_at": g.created_at.isoformat(),
                "updated_at": g.updated_at.isoformat(),
            }
            for g in goals
        ]

    @jwt_required()
    def post(self):
        data = request.get_json() or {}
        errors = GoalCreateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
            
        goal = Goal(
            user_id=_user_id(),
            title=data["title"],
            description=data.get("description", ""),
            category=data["category"],
            priority=data.get("priority", "medium"),
            target_date=data.get("target_date"),
            estimated_hours=data.get("estimated_hours"),
            tags=data.get("tags", [])
        )
        db.session.add(goal)
        db.session.commit()
        return {"id": goal.id}, 201


class GoalResource(Resource):
    @jwt_required()
    def get(self, goal_id: int):
        goal = db.get_or_404(Goal, goal_id)
        if goal.user_id != _user_id():
            return {"message": "Not found"}, 404
            
        # Get milestones
        milestones = db.session.scalars(
            db.select(Milestone).where(Milestone.goal_id == goal_id).order_by(Milestone.order_index)
        ).all()
        
        return {
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
            "category": goal.category,
            "priority": goal.priority,
            "status": goal.status,
            "progress": goal.progress,
            "is_completed": goal.is_completed,
            "completed_at": goal.completed_at.isoformat() if goal.completed_at else None,
            "target_date": goal.target_date.isoformat() if goal.target_date else None,
            "estimated_hours": goal.estimated_hours,
            "actual_hours": goal.actual_hours,
            "tags": goal.tags or [],
            "is_overdue": goal.is_overdue(),
            "days_until_deadline": goal.days_until_deadline(),
            "created_at": goal.created_at.isoformat(),
            "updated_at": goal.updated_at.isoformat(),
            "milestones": [
                {
                    "id": m.id,
                    "title": m.title,
                    "description": m.description,
                    "is_completed": m.is_completed,
                    "completed_at": m.completed_at.isoformat() if m.completed_at else None,
                    "order_index": m.order_index,
                    "created_at": m.created_at.isoformat(),
                }
                for m in milestones
            ]
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
            
        # Handle completion status change
        if "is_completed" in data and data["is_completed"] and not goal.is_completed:
            from datetime import datetime
            goal.completed_at = datetime.utcnow()
            goal.progress = 100.0
            goal.status = "completed"
        elif "is_completed" in data and not data["is_completed"] and goal.is_completed:
            goal.completed_at = None
            goal.status = "active"
            
        for key in ["title", "description", "category", "priority", "status", "progress", "target_date", "estimated_hours", "tags", "is_completed"]:
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
        log = ProgressLog(
            user_id=_user_id(),
            goal_id=goal.id,
            milestone_id=data.get("milestone_id"),
            minutes=data["minutes"],
            notes=data.get("notes", ""),
            activity_type=data.get("activity_type", "study")
        )
        db.session.add(log)
        
        # Update goal's actual hours
        goal.actual_hours += data["minutes"] / 60.0
        
        db.session.commit()
        return {"message": "logged"}, 201


class GoalMilestonesResource(Resource):
    @jwt_required()
    def get(self, goal_id: int):
        goal = db.get_or_404(Goal, goal_id)
        if goal.user_id != _user_id():
            return {"message": "Not found"}, 404
            
        milestones = db.session.scalars(
            db.select(Milestone).where(Milestone.goal_id == goal_id).order_by(Milestone.order_index)
        ).all()
        
        return [
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "is_completed": m.is_completed,
                "completed_at": m.completed_at.isoformat() if m.completed_at else None,
                "order_index": m.order_index,
                "created_at": m.created_at.isoformat(),
            }
            for m in milestones
        ]
    
    @jwt_required()
    def post(self, goal_id: int):
        goal = db.get_or_404(Goal, goal_id)
        if goal.user_id != _user_id():
            return {"message": "Not found"}, 404
            
        data = request.get_json() or {}
        errors = MilestoneCreateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
            
        milestone = Milestone(
            user_id=_user_id(),
            goal_id=goal_id,
            title=data["title"],
            description=data.get("description", ""),
            order_index=data.get("order_index", 0)
        )
        db.session.add(milestone)
        db.session.commit()
        
        # Update goal progress
class MilestoneResource(Resource):
    @jwt_required()
    def put(self, goal_id: int, milestone_id: int):
        milestone = db.get_or_404(Milestone, milestone_id)
        if milestone.user_id != _user_id() or milestone.goal_id != goal_id:
            return {"message": "Not found"}, 404
            
        data = request.get_json() or {}
        errors = MilestoneUpdateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
            
        # Handle completion status change
        if "is_completed" in data and data["is_completed"] and not milestone.is_completed:
            from datetime import datetime
            milestone.completed_at = datetime.utcnow()
        elif "is_completed" in data and not data["is_completed"] and milestone.is_completed:
            milestone.completed_at = None
            
        for key in ["title", "description", "is_completed", "order_index"]:
            if key in data:
                setattr(milestone, key, data[key])
                
        db.session.commit()
        
        # Update goal progress
        goal = milestone.goal
        goal.progress = goal.calculate_progress()
        db.session.commit()
        
        return {"message": "updated"}, 200
    
    @jwt_required()
    def delete(self, goal_id: int, milestone_id: int):
        milestone = db.get_or_404(Milestone, milestone_id)
        if milestone.user_id != _user_id() or milestone.goal_id != goal_id:
            return {"message": "Not found"}, 404
            
        db.session.delete(milestone)
        db.session.commit()
        
        # Update goal progress
        goal = db.get_or_404(Goal, goal_id)
        goal.progress = goal.calculate_progress()
        db.session.commit()
        
        return {"message": "deleted"}, 200
        goal.progress = goal.calculate_progress()
        db.session.commit()
class GoalCategoriesResource(Resource):
    @jwt_required()
    def get(self):
        """Get all unique categories for user's goals"""
        categories = db.session.scalars(
            db.select(Goal.category).where(Goal.user_id == _user_id()).distinct()
        ).all()
        return list(categories)
        
        return {"id": milestone.id}, 201
api.add_resource(GoalsListResource, "/")
api.add_resource(GoalResource, "/<int:goal_id>")
api.add_resource(GoalProgressResource, "/<int:goal_id>/progress")
api.add_resource(GoalMilestonesResource, "/<int:goal_id>/milestones")
api.add_resource(MilestoneResource, "/<int:goal_id>/milestones/<int:milestone_id>")
api.add_resource(GoalCategoriesResource, "/categories")