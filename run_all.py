import subprocess
import sys
import time
import os
import webbrowser
import signal

def main():
    print("=" * 80)
    print("  RAZORPAY AI REVENUE RECOVERY AGENT — TRACK 3")
    print("  Autonomous One-Command Full Stack Startup")
    print("=" * 80)

    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(workspace_dir, "backend")
    frontend_dir = os.path.join(workspace_dir, "frontend")

    print("\n[1/3] Starting FastAPI Backend on http://localhost:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "run_backend.py"],
        cwd=backend_dir,
        env=os.environ.copy()
    )

    # Wait for backend to initialize
    time.sleep(3)

    print("[2/3] Seeding initial synthetic evaluation batch (75 events)...")
    try:
        subprocess.run(
            [sys.executable, "run_evaluation.py"],
            cwd=backend_dir,
            check=True
        )
    except Exception as e:
        print(f"Warning during evaluation seed: {e}")

    print("\n[3/3] Starting Next.js Dashboard on http://localhost:3000 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        env=os.environ.copy()
    )

    print("\n" + "=" * 80)
    print("  SYSTEM READY & RUNNING LIVE!")
    print("  • Next.js Dashboard : http://localhost:3000")
    print("  • FastAPI Backend   : http://localhost:8000")
    print("  • API Documentation : http://localhost:8000/docs")
    print("=" * 80)
    print("Press Ctrl+C to stop all services.\n")

    try:
        # Open browser after a brief delay
        time.sleep(2)
        webbrowser.open("http://localhost:3000")
        
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Done.")

if __name__ == "__main__":
    main()
