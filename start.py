import subprocess
import sys
import time
import os

def main():
    print("Starting AI Internship Application...")
    
    # Start Frontend
    print("Starting Next.js Frontend on port 3000...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"], 
        cwd="frontend",
        shell=True
    )
    
    # Start Backend
    print("Starting FastAPI Backend on port 8000...")
    backend_process = subprocess.Popen(
        [r"..\venv\Scripts\python", "-m", "uvicorn", "main:app", "--port", "8000"], 
        cwd="backend",
        shell=True
    )
    
    print("\n" + "="*50)
    print("Application is running!")
    print("Frontend: http://localhost:3000")
    print("Backend API: http://localhost:8000")
    print("Press Ctrl+C to stop all servers.")
    print("="*50 + "\n")
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping servers...")
        frontend_process.terminate()
        backend_process.terminate()
        print("Servers stopped successfully.")
        sys.exit(0)

if __name__ == "__main__":
    main()
