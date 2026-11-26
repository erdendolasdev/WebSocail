from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import os
import re
from uuid import uuid4

from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.security import generate_password_hash, check_password_hash


BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "nexo.db"
UPLOAD_DIR = BASE_DIR / "uploads"

app = Flask(__name__)
app.secret_key = os.environ.get("NEXO_SECRET_KEY", "gelistirme-icin-gecici-secret-key")
app.config["MAX_CONTENT_LENGTH"] = 55 * 1024 * 1024
HASHTAG_PATTERN = re.compile(r"(?<![\w#])#([\w]{1,30})", re.UNICODE)


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_db() as db:
        db.executescript(
            """
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT,
                avatar_url TEXT,
                cover_url TEXT,
                bio TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                image_url TEXT,
                media_type TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS likes (
                user_id INTEGER NOT NULL,
                post_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (user_id, post_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reposts (
                user_id INTEGER NOT NULL,
                post_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (user_id, post_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS saved_posts (
                user_id INTEGER NOT NULL,
                post_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (user_id, post_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                post_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS follows (
                follower_id INTEGER NOT NULL,
                following_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (follower_id, following_id),
                FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        columns = {row["name"] for row in db.execute("PRAGMA table_info(users)")}
        if "cover_url" not in columns:
            db.execute("ALTER TABLE users ADD COLUMN cover_url TEXT")
        if "bio" not in columns:
            db.execute("ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''")
        post_columns = {row["name"] for row in db.execute("PRAGMA table_info(posts)")}
        if "media_type" not in post_columns:
            db.execute("ALTER TABLE posts ADD COLUMN media_type TEXT")


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def read_profile_image(upload):
    if upload is None or not upload.filename:
        return None

    extension = Path(upload.filename).suffix.lower()
    allowed_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    if extension not in allowed_types or upload.mimetype != allowed_types[extension]:
        raise ValueError("Yalnızca JPG, PNG veya WEBP görsel yükleyebilirsin.")

    content = upload.stream.read(5 * 1024 * 1024 + 1)
    if not content:
        raise ValueError("Seçilen görsel boş.")
    if len(content) > 5 * 1024 * 1024:
        raise ValueError("Görseller en fazla 5 MB olabilir.")
    if extension == ".png":
        valid_signature = content.startswith(b"\x89PNG\r\n\x1a\n")
    elif extension in {".jpg", ".jpeg"}:
        valid_signature = content.startswith(b"\xff\xd8\xff")
    else:
        valid_signature = content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    if not valid_signature:
        raise ValueError("Dosyanın içeriği seçilen görsel türüyle eşleşmiyor.")

    return extension, content


def read_post_media(upload):
    if upload is None or not upload.filename:
        return None

    extension = Path(upload.filename).suffix.lower()
    media_types = {
        ".jpg": ("image/jpeg", "image"),
        ".jpeg": ("image/jpeg", "image"),
        ".png": ("image/png", "image"),
        ".webp": ("image/webp", "image"),
        ".mp4": ("video/mp4", "video"),
        ".webm": ("video/webm", "video"),
    }
    if extension not in media_types or upload.mimetype != media_types[extension][0]:
        raise ValueError("JPG, PNG, WEBP, MP4 veya WEBM dosyası seç.")

    media_type = media_types[extension][1]
    size_limit = 50 * 1024 * 1024 if media_type == "video" else 5 * 1024 * 1024
    content = upload.stream.read(size_limit + 1)
    if not content:
        raise ValueError("Seçilen medya dosyası boş.")
    if len(content) > size_limit:
        limit_mb = 50 if media_type == "video" else 5
        raise ValueError(f"{'Videolar' if media_type == 'video' else 'Görseller'} en fazla {limit_mb} MB olabilir.")

    if extension == ".png":
        valid_signature = content.startswith(b"\x89PNG\r\n\x1a\n")
    elif extension in {".jpg", ".jpeg"}:
        valid_signature = content.startswith(b"\xff\xd8\xff")
    elif extension == ".webp":
        valid_signature = content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    elif extension == ".mp4":
        valid_signature = len(content) >= 12 and content[4:8] == b"ftyp"
    else:
        valid_signature = content.startswith(b"\x1a\x45\xdf\xa3")
    if not valid_signature:
        raise ValueError("Dosyanın içeriği seçilen medya türüyle eşleşmiyor.")

    return extension, content, media_type


def remove_old_upload(url):
    if not url or not url.startswith("/uploads/"):
        return
    old_file = UPLOAD_DIR / Path(url).name
    if old_file.is_file():
        old_file.unlink()


def serialize_profile_post(post):
    return {
        "id": post["id"],
        "text": post["text"],
        "image_url": post["image_url"],
        "media_type": post["media_type"] or ("image" if post["image_url"] else None),
        "created_at": post["created_at"],
        "likes": post["likes"],
        "comments": post["comments"],
        "reposts": post["reposts"],
        "is_liked": bool(post["is_liked"]),
        "is_reposted": bool(post["is_reposted"]),
        "is_saved": bool(post["is_saved"]),
        "author": post["author_name"],
        "handle": f"@{post['author_username']}",
        "username": post["author_username"],
        "avatar": post["author_avatar"],
        "reposted_at": post["reposted_at"],
    }


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/explore")
def explore():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/@<username>")
def public_profile(username):
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/styles.css")
def styles():
    return send_from_directory(BASE_DIR, "styles.css")


@app.route("/script.js")
def script():
    return send_from_directory(BASE_DIR, "script.js")


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "Yüklenen dosya isteğin boyut sınırını aşıyor."}), 413


@app.route("/api/me")
def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False}), 200

    with get_db() as db:
        user = db.execute(
            "SELECT id, name, username, avatar_url, cover_url, bio FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if user is None:
        session.clear()
        return jsonify({"authenticated": False}), 200

    return jsonify(
        {
            "authenticated": True,
            "id": user["id"],
            "name": user["name"],
            "username": user["username"],
            "avatar": user["avatar_url"],
            "cover": user["cover_url"],
            "bio": user["bio"],
        }
    )


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if len(name) < 2:
        return jsonify({"error": "Ad soyad en az 2 karakter olmalıdır."}), 400
    if not re.fullmatch(r"[a-z0-9_.]{3,20}", username):
        return jsonify({"error": "Kullanıcı adı 3-20 karakter; harf, rakam, nokta veya alt çizgi kullanabilir."}), 400
    if len(password) < 6:
        return jsonify({"error": "Şifre en az 6 karakter olmalıdır."}), 400

    with get_db() as db:
        existing = db.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        if existing:
            return jsonify({"error": "Bu kullanıcı adı zaten kullanılıyor."}), 409

        cursor = db.execute(
            """
            INSERT INTO users (name, username, password_hash, avatar_url, created_at)
            VALUES (?, ?, ?, NULL, ?)
            """,
            (name, username, generate_password_hash(password), utc_now()),
        )
        user_id = cursor.lastrowid

    session.clear()
    session["user_id"] = user_id
    return jsonify(
        {
            "authenticated": True,
            "id": user_id,
            "name": name,
            "username": username,
            "avatar": None,
            "cover": None,
            "bio": "",
        }
    ), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    with get_db() as db:
        user = db.execute(
            "SELECT id, name, username, password_hash, avatar_url, cover_url, bio FROM users WHERE username = ?",
            (username,),
        ).fetchone()

    if user is None or not user["password_hash"] or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Kullanıcı adı veya şifre hatalı."}), 401

    session.clear()
    session["user_id"] = user["id"]
    return jsonify(
        {
            "authenticated": True,
            "id": user["id"],
            "name": user["name"],
            "username": user["username"],
            "avatar": user["avatar_url"],
            "cover": user["cover_url"],
            "bio": user["bio"],
        }
    )


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"authenticated": False})


@app.route("/api/profile", methods=["POST"])
def update_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Profilini düzenlemek için giriş yapmalısın."}), 401

    with get_db() as db:
        user = db.execute(
            "SELECT id, name, username, avatar_url, cover_url, bio FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if user is None:
        session.clear()
        return jsonify({"error": "Oturum geçersiz."}), 401

    name = request.form.get("name", user["name"]).strip()
    bio = request.form.get("bio", user["bio"] or "").strip()
    if len(name) < 2:
        return jsonify({"error": "Ad soyad en az 2 karakter olmalıdır."}), 400
    if len(bio) > 160:
        return jsonify({"error": "Hakkında alanı en fazla 160 karakter olabilir."}), 400

    try:
        avatar_upload = read_profile_image(request.files.get("avatar"))
        cover_upload = read_profile_image(request.files.get("cover"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    UPLOAD_DIR.mkdir(exist_ok=True)
    new_avatar = f"/uploads/{uuid4().hex}{avatar_upload[0]}" if avatar_upload else user["avatar_url"]
    new_cover = f"/uploads/{uuid4().hex}{cover_upload[0]}" if cover_upload else user["cover_url"]
    if avatar_upload:
        (UPLOAD_DIR / Path(new_avatar).name).write_bytes(avatar_upload[1])
    if cover_upload:
        (UPLOAD_DIR / Path(new_cover).name).write_bytes(cover_upload[1])

    with get_db() as db:
        db.execute(
            """
            UPDATE users
            SET name = ?, bio = ?, avatar_url = ?, cover_url = ?
            WHERE id = ?
            """,
            (name, bio, new_avatar, new_cover, user_id),
        )

    if avatar_upload:
        remove_old_upload(user["avatar_url"])
    if cover_upload:
        remove_old_upload(user["cover_url"])

    return jsonify(
        {
            "authenticated": True,
            "id": user_id,
            "name": name,
            "username": user["username"],
            "avatar": new_avatar,
            "cover": new_cover,
            "bio": bio,
        }
    )


@app.route("/api/users/<username>")
def get_profile(username):
    username = username.strip().lower()
    viewer_id = session.get("user_id")

    with get_db() as db:
        user = db.execute(
            "SELECT id, name, username, avatar_url, cover_url, bio, created_at FROM users WHERE username = ?",
            (username,),
        ).fetchone()

        if user is None:
            return jsonify({"error": "Kullanıcı bulunamadı."}), 404

        posts = db.execute(
            """
            SELECT p.id, p.text, p.image_url, p.media_type, p.created_at, NULL AS reposted_at,
                   u.name AS author_name, u.username AS author_username,
                   u.avatar_url AS author_avatar,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments,
                   (SELECT COUNT(*) FROM reposts r WHERE r.post_id = p.id) AS reposts,
                   EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS is_liked,
                   EXISTS(SELECT 1 FROM reposts r WHERE r.post_id = p.id AND r.user_id = ?) AS is_reposted,
                   EXISTS(SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = ?) AS is_saved
            FROM posts p JOIN users u ON u.id = p.user_id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC, p.id DESC
            """,
            (viewer_id, viewer_id, viewer_id, user["id"]),
        ).fetchall()
        liked_posts = db.execute(
            """
            SELECT p.id, p.text, p.image_url, p.media_type, p.created_at, NULL AS reposted_at,
                   u.name AS author_name, u.username AS author_username,
                   u.avatar_url AS author_avatar,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments,
                   (SELECT COUNT(*) FROM reposts r WHERE r.post_id = p.id) AS reposts,
                   EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS is_liked,
                   EXISTS(SELECT 1 FROM reposts r WHERE r.post_id = p.id AND r.user_id = ?) AS is_reposted,
                   EXISTS(SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = ?) AS is_saved
            FROM likes activity
            JOIN posts p ON p.id = activity.post_id
            JOIN users u ON u.id = p.user_id
            WHERE activity.user_id = ?
            ORDER BY activity.created_at DESC
            """,
            (viewer_id, viewer_id, viewer_id, user["id"]),
        ).fetchall()
        reposted_posts = db.execute(
            """
            SELECT p.id, p.text, p.image_url, p.media_type, p.created_at, activity.created_at AS reposted_at,
                   u.name AS author_name, u.username AS author_username,
                   u.avatar_url AS author_avatar,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments,
                   (SELECT COUNT(*) FROM reposts r WHERE r.post_id = p.id) AS reposts,
                   EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS is_liked,
                   EXISTS(SELECT 1 FROM reposts r WHERE r.post_id = p.id AND r.user_id = ?) AS is_reposted,
                   EXISTS(SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = ?) AS is_saved
            FROM reposts activity
            JOIN posts p ON p.id = activity.post_id
            JOIN users u ON u.id = p.user_id
            WHERE activity.user_id = ?
            ORDER BY activity.created_at DESC
            """,
            (viewer_id, viewer_id, viewer_id, user["id"]),
        ).fetchall()
        followers = db.execute(
            "SELECT COUNT(*) AS total FROM follows WHERE following_id = ?",
            (user["id"],),
        ).fetchone()["total"]
        following = db.execute(
            "SELECT COUNT(*) AS total FROM follows WHERE follower_id = ?",
            (user["id"],),
        ).fetchone()["total"]

    return jsonify(
        {
            "id": user["id"],
            "name": user["name"],
            "username": user["username"],
            "avatar": user["avatar_url"],
            "cover": user["cover_url"],
            "bio": user["bio"],
            "created_at": user["created_at"],
            "followers": followers,
            "following": following,
            "posts": [serialize_profile_post(post) for post in posts],
            "likes": [serialize_profile_post(post) for post in liked_posts],
            "reposts": [serialize_profile_post(post) for post in reposted_posts],
        }
    )


@app.route("/api/posts", methods=["GET"])
def list_posts():
    with get_db() as db:
        rows = db.execute(
            """
            SELECT p.id, p.text, p.image_url, p.media_type, p.created_at,
                   u.id AS user_id, u.name, u.username, u.avatar_url,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments,
                   (SELECT COUNT(*) FROM reposts r WHERE r.post_id = p.id) AS reposts,
                   EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS is_liked,
                   EXISTS(SELECT 1 FROM reposts r WHERE r.post_id = p.id AND r.user_id = ?) AS is_reposted,
                   EXISTS(SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = ?) AS is_saved
            FROM posts p
            JOIN users u ON u.id = p.user_id
            ORDER BY p.created_at DESC, p.id DESC
            """,
            (session.get("user_id"), session.get("user_id"), session.get("user_id")),
        ).fetchall()

    return jsonify(
        [
            {
                "id": row["id"],
                "text": row["text"],
                "image_url": row["image_url"],
                "media_type": row["media_type"] or ("image" if row["image_url"] else None),
                "created_at": row["created_at"],
                "author": row["name"],
                "handle": f"@{row['username']}",
                "username": row["username"],
                "avatar": row["avatar_url"],
                "likes": row["likes"],
                "comments": row["comments"],
                "reposts": row["reposts"],
                "is_liked": bool(row["is_liked"]),
                "is_reposted": bool(row["is_reposted"]),
                "is_saved": bool(row["is_saved"]),
            }
            for row in rows
        ]
    )


@app.route("/api/tags")
def list_tags():
    with get_db() as db:
        rows = db.execute(
            "SELECT id, text, created_at FROM posts ORDER BY created_at DESC, id DESC"
        ).fetchall()

    tags = {}
    for row in rows:
        post_tags = {match.casefold() for match in HASHTAG_PATTERN.findall(row["text"])}
        for tag in sorted(post_tags):
            if tag not in tags:
                tags[tag] = {
                    "tag": tag,
                    "posts": 0,
                    "latest": row["created_at"],
                    "latest_id": row["id"],
                }
            tags[tag]["posts"] += 1

    entries = list(tags.values())
    popular = sorted(
        entries,
        key=lambda item: (item["posts"], item["latest"], item["latest_id"]),
        reverse=True,
    )[:8]
    recent = sorted(
        entries,
        key=lambda item: (item["latest"], item["latest_id"]),
        reverse=True,
    )[:8]

    def public_tag(item):
        return {"tag": item["tag"], "posts": item["posts"]}

    return jsonify(
        {
            "popular": [public_tag(item) for item in popular],
            "new": [public_tag(item) for item in recent],
        }
    )


@app.route("/api/posts", methods=["POST"])
def create_post():
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form
    text = str(data.get("text", "")).strip()
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Gönderi paylaşmak için giriş yapmalısın.", "auth_required": True}), 401

    if len(text) > 280:
        return jsonify({"error": "Gönderi en fazla 280 karakter olabilir."}), 400

    with get_db() as db:
        user = db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        session.clear()
        return jsonify({"error": "Oturum geçersiz.", "auth_required": True}), 401

    try:
        media_upload = read_post_media(request.files.get("media"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    image_url = data.get("image_url")
    media_type = "image" if image_url else None
    if not text and not media_upload and not image_url:
        return jsonify({"error": "Gönderi için bir metin veya medya ekle."}), 400

    if media_upload:
        extension, content, media_type = media_upload
        UPLOAD_DIR.mkdir(exist_ok=True)
        image_url = f"/uploads/{uuid4().hex}{extension}"
        (UPLOAD_DIR / Path(image_url).name).write_bytes(content)

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO posts (user_id, text, image_url, media_type, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, text, image_url, media_type, utc_now()),
        )
        post_id = cursor.lastrowid

    return jsonify({"id": post_id, "message": "Gönderi oluşturuldu."}), 201


@app.route("/api/posts/<int:post_id>/like", methods=["POST"])
def like_post(post_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Beğenmek için giriş yapmalısın.", "auth_required": True}), 401

    with get_db() as db:
        user = db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if user is None:
            session.clear()
            return jsonify({"error": "Oturum geçersiz.", "auth_required": True}), 401

        existing = db.execute(
            "SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?",
            (user_id, post_id),
        ).fetchone()

        if existing:
            db.execute(
                "DELETE FROM likes WHERE user_id = ? AND post_id = ?",
                (user_id, post_id),
            )
            liked = False
        else:
            db.execute(
                "INSERT INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)",
                (user_id, post_id, utc_now()),
            )
            liked = True

        count = db.execute(
            "SELECT COUNT(*) AS total FROM likes WHERE post_id = ?", (post_id,)
        ).fetchone()["total"]

    return jsonify({"liked": liked, "likes": count})


@app.route("/api/posts/<int:post_id>/repost", methods=["POST"])
def repost_post(post_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Tekrar göndermek için giriş yapmalısın.", "auth_required": True}), 401

    with get_db() as db:
        user = db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if user is None:
            session.clear()
            return jsonify({"error": "Oturum geçersiz.", "auth_required": True}), 401
        post = db.execute("SELECT id FROM posts WHERE id = ?", (post_id,)).fetchone()
        if post is None:
            return jsonify({"error": "Gönderi bulunamadı."}), 404

        existing = db.execute(
            "SELECT 1 FROM reposts WHERE user_id = ? AND post_id = ?",
            (user_id, post_id),
        ).fetchone()
        if existing:
            db.execute(
                "DELETE FROM reposts WHERE user_id = ? AND post_id = ?",
                (user_id, post_id),
            )
            reposted = False
        else:
            db.execute(
                "INSERT INTO reposts (user_id, post_id, created_at) VALUES (?, ?, ?)",
                (user_id, post_id, utc_now()),
            )
            reposted = True

        count = db.execute(
            "SELECT COUNT(*) AS total FROM reposts WHERE post_id = ?", (post_id,)
        ).fetchone()["total"]

    return jsonify({"reposted": reposted, "reposts": count})


@app.route("/api/posts/<int:post_id>/save", methods=["POST"])
def save_post(post_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Kaydetmek için giriş yapmalısın.", "auth_required": True}), 401

    with get_db() as db:
        user = db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if user is None:
            session.clear()
            return jsonify({"error": "Oturum geçersiz.", "auth_required": True}), 401
        post = db.execute("SELECT id FROM posts WHERE id = ?", (post_id,)).fetchone()
        if post is None:
            return jsonify({"error": "Gönderi bulunamadı."}), 404

        existing = db.execute(
            "SELECT 1 FROM saved_posts WHERE user_id = ? AND post_id = ?",
            (user_id, post_id),
        ).fetchone()
        if existing:
            db.execute(
                "DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?",
                (user_id, post_id),
            )
            saved = False
        else:
            db.execute(
                "INSERT INTO saved_posts (user_id, post_id, created_at) VALUES (?, ?, ?)",
                (user_id, post_id, utc_now()),
            )
            saved = True

    return jsonify({"saved": saved})


@app.route("/api/posts/<int:post_id>/comments", methods=["GET", "POST"])
def post_comments(post_id):
    if request.method == "POST":
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Yorum yapmak için giriş yapmalısın.", "auth_required": True}), 401

        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Yorum metni geçersiz."}), 400
        text = str(data.get("text", "")).strip()
        if not text:
            return jsonify({"error": "Yorum boş olamaz."}), 400
        if len(text) > 500:
            return jsonify({"error": "Yorum en fazla 500 karakter olabilir."}), 400

        with get_db() as db:
            user = db.execute(
                "SELECT id, name, username, avatar_url FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            if user is None:
                session.clear()
                return jsonify({"error": "Oturum geçersiz.", "auth_required": True}), 401
            post = db.execute("SELECT id FROM posts WHERE id = ?", (post_id,)).fetchone()
            if post is None:
                return jsonify({"error": "Gönderi bulunamadı."}), 404

            created_at = utc_now()
            cursor = db.execute(
                "INSERT INTO comments (user_id, post_id, text, created_at) VALUES (?, ?, ?, ?)",
                (user_id, post_id, text, created_at),
            )
            comment_id = cursor.lastrowid
            count = db.execute(
                "SELECT COUNT(*) AS total FROM comments WHERE post_id = ?",
                (post_id,),
            ).fetchone()["total"]

        return jsonify(
            {
                "comment": {
                    "id": comment_id,
                    "text": text,
                    "created_at": created_at,
                    "author": user["name"],
                    "username": user["username"],
                    "avatar": user["avatar_url"],
                },
                "comments": count,
            }
        ), 201

    with get_db() as db:
        post = db.execute("SELECT id FROM posts WHERE id = ?", (post_id,)).fetchone()
        if post is None:
            return jsonify({"error": "Gönderi bulunamadı."}), 404
        rows = db.execute(
            """
            SELECT c.id, c.text, c.created_at, u.name AS author,
                   u.username, u.avatar_url AS avatar
            FROM comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC, c.id ASC
            """,
            (post_id,),
        ).fetchall()
    return jsonify(
        [
            {
                "id": row["id"],
                "text": row["text"],
                "created_at": row["created_at"],
                "author": row["author"],
                "username": row["username"],
                "avatar": row["avatar"],
            }
            for row in rows
        ]
    )


init_db()


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
