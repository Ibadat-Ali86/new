import os
from datetime import datetime
from flask import Blueprint, request, current_app
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from ..extensions import db
from ..models import Resource as ResourceModel
from ..schemas import ResourceCreateSchema, ResourceUpdateSchema


bp = Blueprint("resources", __name__)
api = Api(bp)


ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "mp4", "mp3", "webm"}


def _user_id() -> int:
    return int(get_jwt_identity())


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


class ResourcesListResource(Resource):
    @jwt_required()
    def get(self):
        # Get query parameters for filtering
        category = request.args.get('category')
        resource_type = request.args.get('type')
        goal_id = request.args.get('goal_id')
        search = request.args.get('search')
        favorites_only = request.args.get('favorites') == 'true'
        
        query = db.select(ResourceModel).where(ResourceModel.user_id == _user_id())
        
        if category:
            query = query.where(ResourceModel.category == category)
            
        if resource_type:
            query = query.where(ResourceModel.type == resource_type)
            
        if goal_id:
            query = query.where(ResourceModel.goal_id == int(goal_id))
            
        if favorites_only:
            query = query.where(ResourceModel.is_favorite == True)
            
        if search:
            search_term = f"%{search}%"
            query = query.where(
                db.or_(
                    ResourceModel.title.ilike(search_term),
                    ResourceModel.content.ilike(search_term)
                )
            )
        
        rows = db.session.scalars(query.order_by(ResourceModel.created_at.desc())).all()
        
        return [
            {
                "id": r.id,
                "type": r.type,
                "title": r.title,
                "url": r.url,
                "path": r.path,
                "content": r.content,
                "category": r.category,
                "tags": r.tags or [],
                "rating": r.rating,
                "is_favorite": r.is_favorite,
                "last_accessed": r.last_accessed.isoformat() if r.last_accessed else None,
                "file_size": r.file_size,
                "file_type": r.file_type,
                "goal_id": r.goal_id,
                "created_at": r.created_at.isoformat(),
                "updated_at": r.updated_at.isoformat(),
            }
            for r in rows
        ]

    @jwt_required()
    def post(self):
        data = request.get_json() or {}
        errors = ResourceCreateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
            
        res = ResourceModel(
            user_id=_user_id(),
            goal_id=data.get("goal_id"),
            type=data["type"],
            title=data["title"],
            url=data.get("url"),
            content=data.get("content"),
            category=data["category"],
            tags=data.get("tags", [])
        )
        db.session.add(res)
        db.session.commit()
        return {"id": res.id}, 201


class ResourceItemResource(Resource):
    @jwt_required()
    def get(self, resource_id: int):
        res = db.get_or_404(ResourceModel, resource_id)
        if res.user_id != _user_id():
            return {"message": "Not found"}, 404
            
        # Update last accessed time
        res.last_accessed = datetime.utcnow()
        db.session.commit()
        
        return {
            "id": res.id,
            "type": res.type,
            "title": res.title,
            "url": res.url,
            "path": res.path,
            "content": res.content,
            "category": res.category,
            "tags": res.tags or [],
            "rating": res.rating,
            "is_favorite": res.is_favorite,
            "last_accessed": res.last_accessed.isoformat() if res.last_accessed else None,
            "file_size": res.file_size,
            "file_type": res.file_type,
            "goal_id": res.goal_id,
            "created_at": res.created_at.isoformat(),
            "updated_at": res.updated_at.isoformat(),
        }
    
    @jwt_required()
    def put(self, resource_id: int):
        res = db.get_or_404(ResourceModel, resource_id)
        if res.user_id != _user_id():
            return {"message": "Not found"}, 404
            
        data = request.get_json() or {}
        errors = ResourceUpdateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
            
        for key in ["title", "url", "content", "category", "tags", "rating", "is_favorite"]:
            if key in data:
                setattr(res, key, data[key])
                
        db.session.commit()
        return {"message": "updated"}, 200
    
    @jwt_required()
    def delete(self, resource_id: int):
        res = db.get_or_404(ResourceModel, resource_id)
        if res.user_id != _user_id():
            return {"message": "Not found"}, 404
        if res.path and os.path.exists(res.path):
            try:
                os.remove(res.path)
            except OSError:
                pass
        db.session.delete(res)
        db.session.commit()
        return {"message": "deleted"}, 200


class ResourceUploadResource(Resource):
    @jwt_required()
    def post(self):
        if "file" not in request.files:
            return {"message": "No file"}, 400
        file = request.files["file"]
        if file.filename == "":
            return {"message": "No selected file"}, 400
        if not allowed_file(file.filename):
            return {"message": "File type not allowed"}, 400
            
        filename = secure_filename(file.filename)
        upload_dir = os.path.join(current_app.root_path, "..", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        timestamped = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
        save_path = os.path.abspath(os.path.join(upload_dir, timestamped))
        file.save(save_path)
        
        # Get additional form data
        category = request.form.get('category', 'general')
        goal_id = request.form.get('goal_id')
        tags = request.form.get('tags', '').split(',') if request.form.get('tags') else []
        
        res = ResourceModel(
            user_id=_user_id(),
            type="file",
            title=filename,
            path=save_path,
            category=category,
            goal_id=int(goal_id) if goal_id else None,
            tags=[tag.strip() for tag in tags if tag.strip()],
            file_size=os.path.getsize(save_path),
            file_type=file.content_type
        )
        db.session.add(res)
        db.session.commit()
        return {"id": res.id, "path": res.path}, 201


class ResourceCategoriesResource(Resource):
    @jwt_required()
    def get(self):
        """Get all unique categories for user's resources"""
        categories = db.session.scalars(
            db.select(ResourceModel.category).where(ResourceModel.user_id == _user_id()).distinct()
class ResourceTagsResource(Resource):
    @jwt_required()
    def get(self):
        """Get all unique tags for user's resources"""
        resources = db.session.scalars(
            db.select(ResourceModel).where(ResourceModel.user_id == _user_id())
        ).all()
        
        all_tags = set()
        for resource in resources:
            if resource.tags:
                all_tags.update(resource.tags)
        
        return list(all_tags)
        ).all()
        return list(categories)
api.add_resource(ResourcesListResource, "/")
api.add_resource(ResourceItemResource, "/<int:resource_id>")
api.add_resource(ResourceUploadResource, "/upload")
api.add_resource(ResourceCategoriesResource, "/categories")
api.add_resource(ResourceTagsResource, "/tags")