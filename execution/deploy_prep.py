import os
import shutil
import zipfile
from datetime import datetime

# Layer 3: Execution script - Package TrackVisites for deployment
# Use this to create a clean deployment bundle.

def prepare_dist():
    """Create a 'dist/' folder with only the files needed for production."""
    
    print("--- [Execution] Preparing 'dist/' for deployment ---")
    
    # Source: Current directory (absolute path for AG system)
    cwd = os.getcwd()
    dist_path = os.path.join(cwd, "dist")
    
    # Files needed for the web app
    source_files = [
        "index.html",
        "script.js",
        "styles.css",
        "Exemple idesign interface.png"
    ]
    
    # Clean up old dist
    if os.path.exists(dist_path):
        print(f"Removing old '{dist_path}'...")
        shutil.rmtree(dist_path)
    
    os.makedirs(dist_path)
    print(f"Created '{dist_path}'.")
    
    # Copy files
    for f in source_files:
        src = os.path.join(cwd, f)
        if os.path.exists(src):
            print(f"Copying {f}...")
            shutil.copy2(src, dist_path)
        else:
            print(f"Warning: {f} not found!")

    # Create zip for manual upload (Option C in directive)
    zip_name = f"trackvisites_deploy_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    zip_path = os.path.join(cwd, ".tmp", zip_name)
    
    if not os.path.exists(os.path.join(cwd, ".tmp")):
        os.makedirs(os.path.join(cwd, ".tmp"))

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for f in source_files:
            file_to_zip = os.path.join(dist_path, f)
            if os.path.exists(file_to_zip):
                zipf.write(file_to_zip, f)
                
    print(f"--- [Execution] Package created at {zip_path} ---")
    print(f"Ready for manual upload to Vercel/Netlify.")
    
    return zip_path

if __name__ == "__main__":
    prepare_dist()
