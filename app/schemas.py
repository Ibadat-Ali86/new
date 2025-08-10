from marshmallow import Schema, fields, validate


class RegisterSchema(Schema):
    email = fields.Email(required=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    password = fields.String(required=True, validate=validate.Length(min=8))
    timezone = fields.String(load_default='UTC')


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)


class ProfileUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=120))
    bio = fields.String(validate=validate.Length(max=1000))
    timezone = fields.String()
    avatar_url = fields.Url()


class GoalCreateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(load_default="")
    category = fields.String(required=True, validate=validate.Length(min=1, max=100))
    priority = fields.String(validate=validate.OneOf(["low", "medium", "high"]), load_default="medium")
    target_date = fields.Date(load_default=None)
    estimated_hours = fields.Integer(validate=validate.Range(min=1), load_default=None)
    tags = fields.List(fields.String(), load_default=[])


class GoalUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=1, max=200))
    description = fields.String()
    category = fields.String(validate=validate.Length(min=1, max=100))
    priority = fields.String(validate=validate.OneOf(["low", "medium", "high"]))
    status = fields.String(validate=validate.OneOf(["active", "paused", "completed"]))
    progress = fields.Float()
    target_date = fields.Date(allow_none=True)
    estimated_hours = fields.Integer(validate=validate.Range(min=1), allow_none=True)
    tags = fields.List(fields.String())
    is_completed = fields.Boolean()


class MilestoneCreateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(load_default="")
    order_index = fields.Integer(load_default=0)


class MilestoneUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=1, max=200))
    description = fields.String()
    is_completed = fields.Boolean()
    order_index = fields.Integer()


class ResourceCreateSchema(Schema):
    title = fields.String(required=True)
    type = fields.String(required=True)
    url = fields.String(load_default=None)
    content = fields.String(load_default=None)
    category = fields.String(required=True, validate=validate.Length(min=1, max=100))
    tags = fields.List(fields.String(), load_default=[])
    goal_id = fields.Integer(load_default=None)


class ResourceUpdateSchema(Schema):
    title = fields.String()
    url = fields.String(allow_none=True)
    content = fields.String(allow_none=True)
    category = fields.String(validate=validate.Length(min=1, max=100))
    tags = fields.List(fields.String())
    rating = fields.Integer(validate=validate.Range(min=1, max=5), allow_none=True)
    is_favorite = fields.Boolean()


class ProgressLogSchema(Schema):
    goal_id = fields.Integer(load_default=None)
    milestone_id = fields.Integer(load_default=None)
    minutes = fields.Integer(required=True)
    notes = fields.String(load_default="")
    activity_type = fields.String(load_default="study")


class ReminderCreateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    message = fields.String(load_default="")
    reminder_type = fields.String(required=True, validate=validate.OneOf(["daily", "weekly", "custom", "deadline"]))
    frequency = fields.String(load_default=None)
    next_reminder = fields.DateTime(required=True)
    goal_id = fields.Integer(load_default=None)
    email_enabled = fields.Boolean(load_default=True)
    in_app_enabled = fields.Boolean(load_default=True)


class ReminderUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=1, max=200))
    message = fields.String()
    reminder_type = fields.String(validate=validate.OneOf(["daily", "weekly", "custom", "deadline"]))
    frequency = fields.String()
    next_reminder = fields.DateTime()
    is_active = fields.Boolean()
    email_enabled = fields.Boolean()
    in_app_enabled = fields.Boolean()