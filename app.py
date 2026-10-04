from __future__ import annotations

import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

ROOT = Path(__file__).resolve().parent
INSTANCE = ROOT / "instance"
DATABASE = INSTANCE / "inspectpro.sqlite3"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES + 1024 * 1024


def connect_db() -> sqlite3.Connection:
    """Open a SQLite connection with rows addressable by column name."""
    INSTANCE.mkdir(exist_ok=True)
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with closing(connect_db()) as connection, connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS inspections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                image_data BLOB NOT NULL,
                byte_size INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )"""
        )


@app.get("/")
def home():
    return send_from_directory(ROOT, "index.html")


@app.get("/<page>.html")
def frontend_page(page: str):
    if page not in {"index", "inspect", "processing", "result"}:
        return jsonify(error="Page not found."), 404
    return send_from_directory(ROOT, f"{page}.html")


@app.get("/css/<path:filename>")
def frontend_css(filename: str):
    return send_from_directory(ROOT / "css", filename)


@app.get("/js/<path:filename>")
def frontend_js(filename: str):
    return send_from_directory(ROOT / "js", filename)


@app.post("/inspect")
def save_inspection():
    """Store an uploaded image as a SQLite BLOB; inspection remains mocked."""
    image = request.files.get("image")
    if image is None or not image.filename:
        return jsonify(error="Choose an image before starting the inspection."), 400

    safe_name = secure_filename(image.filename)
    extension = Path(safe_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify(error="Please choose a JPG, JPEG, or PNG image."), 400

    image_data = image.stream.read(MAX_IMAGE_BYTES + 1)
    if not image_data:
        return jsonify(error="This file appears to be empty. Choose another image."), 400
    if len(image_data) > MAX_IMAGE_BYTES:
        return jsonify(error="This image is over 10 MB. Choose a smaller file."), 413

    mime_type = "image/png" if extension == ".png" else "image/jpeg"
    with closing(connect_db()) as connection, connection:
        cursor = connection.execute(
            "INSERT INTO inspections (filename, mime_type, image_data, byte_size, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                safe_name,
                mime_type,
                sqlite3.Binary(image_data),
                len(image_data),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        inspection_id = cursor.lastrowid

    return jsonify(
        inspection_id=inspection_id,
        status="image_stored",
        filename=safe_name,
        byte_size=len(image_data),
    ), 201


@app.get("/inspection/<int:inspection_id>")
def inspection_metadata(inspection_id: int):
    with closing(connect_db()) as connection, connection:
        row = connection.execute(
            "SELECT id, filename, mime_type, byte_size, created_at "
            "FROM inspections WHERE id = ?",
            (inspection_id,),
        ).fetchone()
    if row is None:
        return jsonify(error="Inspection not found."), 404
    return jsonify(dict(row))


@app.get("/inspection/<int:inspection_id>/image")
def inspection_image(inspection_id: int):
    with closing(connect_db()) as connection, connection:
        row = connection.execute(
            "SELECT mime_type, image_data FROM inspections WHERE id = ?",
            (inspection_id,),
        ).fetchone()
    if row is None:
        return jsonify(error="Inspection not found."), 404
    return app.response_class(bytes(row["image_data"]), mimetype=row["mime_type"])


@app.errorhandler(413)
def too_large(_error):
    return jsonify(error="This image is over 10 MB. Choose a smaller file."), 413


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)


