from flask import Blueprint, request, jsonify, make_response
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import json
import csv
from io import StringIO

from ..extensions import db
from ..models import Goal, Resource as ResourceModel, ProgressLog, User, get_user_summary

bp = Blueprint("reports", __name__)
api = Api(bp)


def _user_id() -> int:
    return int(get_jwt_identity())


class ProgressReportResource(Resource):
    @jwt_required()
    def get(self):
        user_id = _user_id()
        user = db.get_or_404(User, user_id)
        
        # Get date range from query params
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date:
            start_date = datetime.fromisoformat(start_date)
        else:
            start_date = datetime.utcnow() - timedelta(days=30)
            
        if end_date:
            end_date = datetime.fromisoformat(end_date)
        else:
            end_date = datetime.utcnow()
        
        # Get goals data
        goals = db.session.scalars(
            db.select(Goal).where(Goal.user_id == user_id)
        ).all()
        
        # Get progress logs in date range
        progress_logs = db.session.scalars(
            db.select(ProgressLog).where(
                ProgressLog.user_id == user_id,
                ProgressLog.created_at >= start_date,
                ProgressLog.created_at <= end_date
            ).order_by(ProgressLog.created_at)
        ).all()
        
        # Get resources data
        resources = db.session.scalars(
            db.select(ResourceModel).where(ResourceModel.user_id == user_id)
        ).all()
        
        # Calculate statistics
        total_goals = len(goals)
        completed_goals = sum(1 for g in goals if g.is_completed)
        active_goals = total_goals - completed_goals
        overdue_goals = sum(1 for g in goals if g.is_overdue())
        
        total_study_time = sum(log.minutes for log in progress_logs)
        study_sessions = len(progress_logs)
        
        # Group progress by date
        daily_progress = {}
        for log in progress_logs:
            date_key = log.created_at.date().isoformat()
            if date_key not in daily_progress:
                daily_progress[date_key] = {"minutes": 0, "sessions": 0}
            daily_progress[date_key]["minutes"] += log.minutes
            daily_progress[date_key]["sessions"] += 1
        
        # Group goals by category
        goals_by_category = {}
        for goal in goals:
            category = goal.category or "uncategorized"
            if category not in goals_by_category:
                goals_by_category[category] = {"total": 0, "completed": 0}
            goals_by_category[category]["total"] += 1
            if goal.is_completed:
                goals_by_category[category]["completed"] += 1
        
        # Group resources by category
        resources_by_category = {}
        for resource in resources:
            category = resource.category or "uncategorized"
            if category not in resources_by_category:
                resources_by_category[category] = 0
            resources_by_category[category] += 1
        
        report_data = {
            "user": {
                "name": user.name,
                "email": user.email,
                "learning_streak": user.get_learning_streak(),
                "member_since": user.created_at.isoformat()
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": (end_date - start_date).days
            },
            "summary": {
                "total_goals": total_goals,
                "completed_goals": completed_goals,
                "active_goals": active_goals,
                "overdue_goals": overdue_goals,
                "completion_rate": round((completed_goals / total_goals * 100) if total_goals > 0 else 0, 1),
                "total_resources": len(resources),
                "total_study_time_minutes": total_study_time,
                "total_study_time_hours": round(total_study_time / 60, 1),
                "study_sessions": study_sessions,
                "avg_session_length": round(total_study_time / study_sessions) if study_sessions > 0 else 0
            },
            "daily_progress": daily_progress,
            "goals_by_category": goals_by_category,
            "resources_by_category": resources_by_category,
            "goals": [
                {
                    "id": g.id,
                    "title": g.title,
                    "category": g.category,
                    "priority": g.priority,
                    "progress": g.progress,
                    "is_completed": g.is_completed,
                    "is_overdue": g.is_overdue(),
                    "created_at": g.created_at.isoformat(),
                    "completed_at": g.completed_at.isoformat() if g.completed_at else None,
                    "target_date": g.target_date.isoformat() if g.target_date else None
                }
                for g in goals
            ],
            "recent_progress": [
                {
                    "date": log.created_at.isoformat(),
                    "goal_title": log.goal.title if log.goal else "General",
                    "minutes": log.minutes,
                    "activity_type": log.activity_type,
                    "notes": log.notes
                }
                for log in progress_logs[-10:]  # Last 10 entries
            ],
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return report_data


class ExportDataResource(Resource):
    @jwt_required()
    def get(self):
        user_id = _user_id()
        format_type = request.args.get('format', 'json').lower()
        data_type = request.args.get('type', 'all')  # all, goals, resources, progress
        
        if data_type == 'goals' or data_type == 'all':
            goals = db.session.scalars(
                db.select(Goal).where(Goal.user_id == user_id)
            ).all()
            goals_data = [
                {
                    "id": g.id,
                    "title": g.title,
                    "description": g.description,
                    "category": g.category,
                    "priority": g.priority,
                    "status": g.status,
                    "progress": g.progress,
                    "is_completed": g.is_completed,
                    "target_date": g.target_date.isoformat() if g.target_date else None,
                    "estimated_hours": g.estimated_hours,
                    "actual_hours": g.actual_hours,
                    "tags": g.tags,
                    "created_at": g.created_at.isoformat(),
                    "completed_at": g.completed_at.isoformat() if g.completed_at else None
                }
                for g in goals
            ]
        else:
            goals_data = []
        
        if data_type == 'resources' or data_type == 'all':
            resources = db.session.scalars(
                db.select(ResourceModel).where(ResourceModel.user_id == user_id)
            ).all()
            resources_data = [
                {
                    "id": r.id,
                    "title": r.title,
                    "type": r.type,
                    "category": r.category,
                    "url": r.url,
                    "content": r.content,
                    "tags": r.tags,
                    "rating": r.rating,
                    "is_favorite": r.is_favorite,
                    "goal_id": r.goal_id,
                    "created_at": r.created_at.isoformat(),
                    "last_accessed": r.last_accessed.isoformat() if r.last_accessed else None
                }
                for r in resources
            ]
        else:
            resources_data = []
        
        if data_type == 'progress' or data_type == 'all':
            progress_logs = db.session.scalars(
                db.select(ProgressLog).where(ProgressLog.user_id == user_id).order_by(ProgressLog.created_at.desc())
            ).all()
            progress_data = [
                {
                    "id": p.id,
                    "goal_id": p.goal_id,
                    "goal_title": p.goal.title if p.goal else None,
                    "milestone_id": p.milestone_id,
                    "minutes": p.minutes,
                    "activity_type": p.activity_type,
                    "notes": p.notes,
                    "created_at": p.created_at.isoformat()
                }
                for p in progress_logs
            ]
        else:
            progress_data = []
        
        export_data = {
            "exported_at": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "goals": goals_data,
            "resources": resources_data,
            "progress_logs": progress_data
        }
        
        if format_type == 'csv':
            # For CSV, we'll export the main data type requested
            if data_type == 'goals':
                return self._export_csv(goals_data, 'goals')
            elif data_type == 'resources':
                return self._export_csv(resources_data, 'resources')
            elif data_type == 'progress':
                return self._export_csv(progress_data, 'progress')
            else:
                return {"message": "CSV export requires specifying a single data type (goals, resources, or progress)"}, 400
        
        # JSON export
        response = make_response(json.dumps(export_data, indent=2))
        response.headers['Content-Type'] = 'application/json'
        response.headers['Content-Disposition'] = f'attachment; filename=learning_data_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json'
        
        return response
    
    def _export_csv(self, data, data_type):
        if not data:
            return {"message": "No data to export"}, 400
        
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename={data_type}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'
        
        return response


class AnalyticsResource(Resource):
    @jwt_required()
    def get(self):
        user_id = _user_id()
        
        # Get basic summary
        summary = get_user_summary(user_id)
        
        # Get progress over time (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        progress_logs = db.session.scalars(
            db.select(ProgressLog).where(
                ProgressLog.user_id == user_id,
                ProgressLog.created_at >= thirty_days_ago
            ).order_by(ProgressLog.created_at)
        ).all()
        
        # Group by date
        daily_stats = {}
        for log in progress_logs:
            date_key = log.created_at.date().isoformat()
            if date_key not in daily_stats:
                daily_stats[date_key] = {"minutes": 0, "sessions": 0}
            daily_stats[date_key]["minutes"] += log.minutes
            daily_stats[date_key]["sessions"] += 1
        
        # Get goals by status
        goals = db.session.scalars(
            db.select(Goal).where(Goal.user_id == user_id)
        ).all()
        
        goals_by_status = {
            "active": sum(1 for g in goals if not g.is_completed and not g.is_overdue()),
            "completed": sum(1 for g in goals if g.is_completed),
            "overdue": sum(1 for g in goals if g.is_overdue())
        }
        
        goals_by_category = {}
        goals_by_priority = {}
        
        for goal in goals:
            # By category
            category = goal.category or "uncategorized"
            if category not in goals_by_category:
                goals_by_category[category] = 0
            goals_by_category[category] += 1
            
            # By priority
            priority = goal.priority or "medium"
            if priority not in goals_by_priority:
                goals_by_priority[priority] = 0
            goals_by_priority[priority] += 1
        
        # Get resources stats
        resources = db.session.scalars(
            db.select(ResourceModel).where(ResourceModel.user_id == user_id)
        ).all()
        
        resources_by_type = {}
        resources_by_category = {}
        
        for resource in resources:
            # By type
            res_type = resource.type or "unknown"
            if res_type not in resources_by_type:
                resources_by_type[res_type] = 0
            resources_by_type[res_type] += 1
            
            # By category
            category = resource.category or "uncategorized"
            if category not in resources_by_category:
                resources_by_category[category] = 0
            resources_by_category[category] += 1
        
        return {
            "summary": summary,
            "daily_progress": daily_stats,
            "goals_by_status": goals_by_status,
            "goals_by_category": goals_by_category,
            "goals_by_priority": goals_by_priority,
            "resources_by_type": resources_by_type,
            "resources_by_category": resources_by_category,
            "generated_at": datetime.utcnow().isoformat()
        }


api.add_resource(ProgressReportResource, "/progress")
api.add_resource(ExportDataResource, "/export")
api.add_resource(AnalyticsResource, "/analytics")