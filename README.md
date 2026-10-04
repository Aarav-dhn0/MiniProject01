# InspectPro — Industrial Vision Inspection

A small frontend and Flask prototype for the InspectPro academic project. Uploaded JPG, JPEG, and PNG images are stored as binary data in SQLite. The processing stages and inspection result are still simulated; this project does not yet analyze image defects.

## Run locally

From this folder, create and activate a virtual environment, install Flask, then start the app:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000). Do not open the HTML file directly because uploads need the Flask server.

## Image storage

When Analyze Product is clicked, the browser sends the image as multipart form data to `POST /inspect`. The server validates the file and inserts the bytes into the `inspections` table in `instance/inspectpro.sqlite3`. The generated database is created automatically on first run.

- `GET /inspection/<id>` returns stored image metadata.
- `GET /inspection/<id>/image` returns the original image bytes.

The image remains stored in SQLite after the browser session ends. No inspection result or defect analysis is persisted yet.

## Project files

- `index.html` — project overview
- `inspect.html` — upload, preview, and validation
- `processing.html` — simulated processing stages
- `result.html` — sample result with illustrative overlay
- `app.py` — Flask routes and SQLite storage
- `requirements.txt` — Python dependency list
- `css/style.css` and `js/app.js` — frontend styling and behavior
