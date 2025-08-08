from flask import Blueprint
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import get_user_summary


bp = Blueprint("analytics", __name__)
api = Api(bp)


class SummaryResource(Resource):
    @jwt_required()
    def get(self):
        user_id = int(get_jwt_identity())
        return get_user_summary(user_id)


api.add_resource(SummaryResource, "/summary")