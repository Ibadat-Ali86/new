import os
from datetime import datetime
from flask import Blueprint, request, current_app
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from ..extensions import db
from ..models import Resource as ResourceModel
from ..schemas import ResourceCreateSchema


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
        rows = db.session.scalars(db.select(ResourceModel).where(ResourceModel.user_id == _user_id()).order_by(ResourceModel.created_at.desc())).all()
        return [
            {
                "id": r.id,
                "type": r.type,
                "title": r.title,
                "url": r.url,
                "path": r.path,
                "goal_id": r.goal_id,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]

    @jwt_required()
    def post(self):
        data = request.get_json() or {}
        errors = ResourceCreateSchema().validate(data)
        if errors:
            return {"errors": errors}, 400
        res = ResourceModel(user_id=_user_id(), goal_id=data.get("goal_id"), type=data["type"], title=data["title"], url=data.get("url"))
        db.session.add(res)
        db.session.commit()
        return {"id": res.id}, 201


class ResourceItemResource(Resource):
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
        res = ResourceModel(user_id=_user_id(), type="file", title=filename, path=save_path)
        db.session.add(res)
        db.session.commit()
        return {"id": res.id, "path": res.path}, 201


api.add_resource(ResourcesListResource, "/")
api.add_resource(ResourceItemResource, "/<int:resource_id>")
api.add_resource(ResourceUploadResource, "/upload")