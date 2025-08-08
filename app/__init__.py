import os
from flask import Flask, jsonify, send_from_directory
from dotenv import load_dotenv

from .config import Config
from .extensions import db, migrate, jwt, login_manager, mail, cors, limiter, scheduler
from .security import add_security_headers
from .tasks import schedule_jobs


def create_app() -> Flask:
    load_dotenv()

    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(__file__), "..", "frontend"),
        static_url_path="/"
    )
    app.config.from_object(Config())

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})
    limiter.init_app(app)
    if app.config.get("RATELIMIT_DEFAULT"):
        limiter.default_limits = [app.config["RATELIMIT_DEFAULT"]]

    if not scheduler.running:
        scheduler.start()
    schedule_jobs()

    from .auth.routes import bp as auth_bp
    from .goals.routes import bp as goals_bp
    from .resources.routes import bp as resources_bp
    from .analytics.routes import bp as analytics_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(goals_bp, url_prefix="/api/v1/goals")
    app.register_blueprint(resources_bp, url_prefix="/api/v1/resources")
    app.register_blueprint(analytics_bp, url_prefix="/api/v1/analytics")

    @app.after_request
    def _set_headers(response):
        return add_security_headers(response)

    @app.route("/")
    def index():
        frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
        return send_from_directory(frontend_dir, "index.html")

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({"message": "Too many requests"}), 429

    return app