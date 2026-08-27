"""
main.py — Root Entrypoint exposing the FastAPI app from solar_api/solar_api/app.py
"""
import sys
import os

# Add nested directory to python path
pkg_dir = os.path.join(os.path.dirname(__file__), "solar_api", "solar_api")
if pkg_dir not in sys.path:
    sys.path.insert(0, pkg_dir)

from app import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
