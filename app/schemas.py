from marshmallow import Schema, fields, validate


class RegisterSchema(Schema):
    email = fields.Email(required=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    password = fields.String(required=True, validate=validate.Length(min=8))


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)


class GoalCreateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(load_default="")
    target_date = fields.Date(load_default=None)


class GoalUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=1, max=200))
    description = fields.String()
    status = fields.String(validate=validate.OneOf(["active", "paused", "completed"]))
    progress = fields.Float()
    target_date = fields.Date(allow_none=True)


class ResourceCreateSchema(Schema):
    title = fields.String(required=True)
    type = fields.String(required=True)
    url = fields.String(load_default=None)
    goal_id = fields.Integer(load_default=None)


class ProgressLogSchema(Schema):
    goal_id = fields.Integer(load_default=None)
    minutes = fields.Integer(required=True)