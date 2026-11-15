
import platform
import psutil
import uvicorn
import time
import os
import json
import urllib.request
import urllib.error

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from repairs.temp_cleanup import (
    scan_temp_files,
    quarantine_selected_files,
    restore_quarantine_batch,
    get_quarantine_history
)
from repairs.network_diagnostics import (
    run_network_diagnostics,
    flush_dns_cache
)


# ==========================================
# FIXMATE LOCAL AGENT CONFIGURATION
# ==========================================

AGENT_VERSION = "1.3.0"
AGENT_HOST = "127.0.0.1"
AGENT_PORT = 8765
CPU_SAMPLE_INTERVAL = 1.0

app = FastAPI(
    title="FixMate Local Agent",
    description="Local Windows diagnostic service",
    version=AGENT_VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"]
)

# Identify the current Python Agent process.
FIXMATE_AGENT_PID = os.getpid()


# ==========================================
# TEMP CLEANUP REQUEST MODELS
# ==========================================

class QuarantineRequest(BaseModel):
    file_ids: list[str] = Field(min_length=1, max_length=200)


class RestoreRequest(BaseModel):
    batch_id: str


# ==========================================
# WINDOWS PROCESS CLASSIFICATION
# ==========================================

WINDOWS_PROCESSES = {
    "memcompression": {
        "type": "Windows System",
        "description": "Windows memory management component."
    },
    "system": {
        "type": "Windows System",
        "description": "Core Windows system process."
    },
    "registry": {
        "type": "Windows System",
        "description": "Windows registry process."
    },
    "system idle process": {
        "type": "Windows System",
        "description": "Represents unused CPU capacity."
    },
    "svchost.exe": {
        "type": "Windows Service",
        "description": "Hosts Windows background services."
    },
    "services.exe": {
        "type": "Windows Service",
        "description": "Manages Windows services."
    },
    "taskhostw.exe": {
        "type": "Windows System",
        "description": "Hosts Windows background tasks."
    },
    "msempeng.exe": {
        "type": "Windows Security",
        "description": "Microsoft Defender Antivirus process."
    },
    "msmpeng.exe": {
        "type": "Windows Security",
        "description": "Microsoft Defender Antivirus process."
    },
    "explorer.exe": {
        "type": "Windows Shell",
        "description": "Windows desktop and File Explorer."
    },
    "dwm.exe": {
        "type": "Windows System",
        "description": "Windows Desktop Window Manager."
    },
    "lsass.exe": {
        "type": "Windows Security",
        "description": "Local Security Authority process."
    },
    "wininit.exe": {
        "type": "Windows System",
        "description": "Windows initialization process."
    },
    "winlogon.exe": {
        "type": "Windows System",
        "description": "Manages Windows sign-in operations."
    },
    "csrss.exe": {
        "type": "Windows System",
        "description": "Windows client/server runtime process."
    },
    "smss.exe": {
        "type": "Windows System",
        "description": "Windows Session Manager."
    },
    "searchindexer.exe": {
        "type": "Windows Service",
        "description": "Windows Search indexing service."
    },
    "runtimebroker.exe": {
        "type": "Windows System",
        "description": "Manages permissions for Windows applications."
    }
}


# ==========================================
# PROCESS IDENTIFICATION
# ==========================================

def identify_process(name, pid):

    process_name = (name or "Unknown").lower()

    if pid == FIXMATE_AGENT_PID:
        return {
            "category": "FixMate Agent",
            "description": "Python process running the FixMate Local Agent.",
            "isFixMateAgent": True,
            "isWindowsSystem": False
        }

    if process_name in WINDOWS_PROCESSES:

        details = WINDOWS_PROCESSES[process_name]

        return {
            "category": details["type"],
            "description": details["description"],
            "isFixMateAgent": False,
            "isWindowsSystem": True
        }

    return {
        "category": "Application",
        "description": "Running application or background process.",
        "isFixMateAgent": False,
        "isWindowsSystem": False
    }


# ==========================================
# AUTHENTICATION
# ==========================================

BACKEND_VERIFY_URL = "http://localhost:8080/api/agent/verify"


def verify_user_token(authorization: str):
    """
    Validate the user's JWT through the Spring Boot backend.
    The JWT signing secret is never stored in the Python Agent.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in to FixMate."
        )

    request = urllib.request.Request(
        BACKEND_VERIFY_URL,
        headers={
            "Authorization": authorization,
            "Accept": "application/json"
        },
        method="GET"
    )

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))

        if result.get("authenticated") is not True or not result.get("userId"):
            raise HTTPException(
                status_code=401,
                detail="FixMate authentication failed."
            )
        return result["userId"]

    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            raise HTTPException(
                status_code=401,
                detail="Your FixMate session is invalid or expired. Please log in again."
            )
        raise HTTPException(
            status_code=502,
            detail="Unable to verify authentication with FixMate backend."
        )
    except (urllib.error.URLError, TimeoutError):
        raise HTTPException(
            status_code=503,
            detail="FixMate backend is unavailable. Please start the backend."
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Authentication verification failed."
        )

# ==========================================
# TEMPORARY FILE SCANNER
# ==========================================

@app.get("/api/repairs/temp/scan")
def scan_temporary_files(
    authorization: str = Header(default="")
):

    # Verify FixMate Agent authentication.
    verify_user_token(authorization)

    # Windows-only functionality.
    if platform.system() != "Windows":
        raise HTTPException(
            status_code=400,
            detail="Windows only"
        )

    try:
        result = scan_temp_files()
        return result

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Temporary file scan failed: {str(error)}"
        )



# ==========================================
# TEMP FILE QUARANTINE
# ==========================================

@app.post("/api/repairs/temp/quarantine")
def quarantine_temporary_files(
    request: QuarantineRequest,
    authorization: str = Header(default="")
):
    verify_user_token(authorization)

    if platform.system() != "Windows":
        raise HTTPException(
            status_code=400,
            detail="Windows only"
        )

    try:
        return quarantine_selected_files(request.file_ids)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Quarantine failed: {str(error)}"
        )


# ==========================================
# RESTORE QUARANTINED FILES
# ==========================================

@app.post("/api/repairs/temp/restore")
def restore_temporary_files(
    request: RestoreRequest,
    authorization: str = Header(default="")
):
    verify_user_token(authorization)

    if platform.system() != "Windows":
        raise HTTPException(
            status_code=400,
            detail="Windows only"
        )

    try:
        return restore_quarantine_batch(request.batch_id)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Restore failed: {str(error)}"
        )


# ==========================================
# QUARANTINE HISTORY
# ==========================================

@app.get("/api/repairs/temp/history")
def temporary_file_history(
    authorization: str = Header(default="")
):
    verify_user_token(authorization)

    if platform.system() != "Windows":
        raise HTTPException(
            status_code=400,
            detail="Windows only"
        )

    try:
        return {
            "success": True,
            "history": get_quarantine_history()
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"History retrieval failed: {str(error)}"
        )





# ==========================================
# NETWORK DIAGNOSTICS AND DNS REPAIR
# ==========================================

@app.get("/api/repairs/network/diagnostics")
def network_diagnostics(
    authorization: str = Header(default="")
):
    verify_user_token(authorization)

    if platform.system() != "Windows":
        raise HTTPException(status_code=400, detail="Windows only")

    try:
        return run_network_diagnostics()
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Network diagnostics failed: {str(error)}"
        )


@app.post("/api/repairs/network/flush-dns")
def network_flush_dns(
    authorization: str = Header(default="")
):
    verify_user_token(authorization)

    if platform.system() != "Windows":
        raise HTTPException(status_code=400, detail="Windows only")

    try:
        return flush_dns_cache()
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error))


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health():

    return {
        "status": "online",
        "agent": "FixMate Local Agent",
        "version": AGENT_VERSION,
        "agentPid": FIXMATE_AGENT_PID
    }


# ==========================================
# SYSTEM DIAGNOSTICS
# ==========================================

@app.get("/api/diagnostics/system")
def system_diagnostics(
    authorization: str = Header(default="")
):

    verify_user_token(authorization)

    if platform.system() != "Windows":
        raise HTTPException(
            status_code=400,
            detail="This agent currently supports Windows only"
        )

    try:

        cpu_usage = psutil.cpu_percent(interval=1)

        memory = psutil.virtual_memory()

        disk = psutil.disk_usage("C:\\")

        report = {
            "operatingSystem": platform.platform(),

            "processor": platform.processor(),

            "cpu": {
                "usagePercent": round(cpu_usage, 2),
                "status": (
                    "High" if cpu_usage >= 85
                    else "Normal"
                )
            },

            "memory": {
                "totalGB": round(
                    memory.total / (1024 ** 3), 2
                ),
                "usedGB": round(
                    memory.used / (1024 ** 3), 2
                ),
                "usagePercent": round(memory.percent, 2),
                "status": (
                    "High" if memory.percent >= 85
                    else "Normal"
                )
            },

            "disk": {
                "drive": "C:",
                "totalGB": round(
                    disk.total / (1024 ** 3), 2
                ),
                "freeGB": round(
                    disk.free / (1024 ** 3), 2
                ),
                "usagePercent": round(disk.percent, 2),
                "status": (
                    "Low Space"
                    if disk.free < 10 * (1024 ** 3)
                    else "Normal"
                )
            }
        }

        return {
            "success": True,
            "message": "System diagnostic completed",
            "report": report
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"System diagnostic failed: {str(error)}"
        )


# ==========================================
# PROCESS DIAGNOSTICS
# ==========================================

@app.get("/api/diagnostics/processes")
def process_diagnostics(
    authorization: str = Header(default="")
):

    verify_user_token(authorization)

    if platform.system() != "Windows":
        raise HTTPException(
            status_code=400,
            detail="Windows only"
        )

    scan_start = time.perf_counter()

    processes = []
    available_processes = []

    logical_cpu_count = psutil.cpu_count(logical=True) or 1

    # --------------------------------------
    # STEP 1: INITIALIZE PROCESS CPU SAMPLES
    # --------------------------------------

    for process in psutil.process_iter(
        ["pid", "name"]
    ):

        try:

            process_name = (
                process.info.get("name") or "Unknown"
            )
            # System Idle Process represents unused CPU capacity.
            # It must not be included in CPU usage rankings.
            if process_name.lower() == "system idle process":
                continue
            pid = process.info.get("pid")

            # Initialize CPU measurement.
            process.cpu_percent(interval=None)

            available_processes.append(process)

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess
        ):
            continue

    # --------------------------------------
    # STEP 2: WAIT FOR CPU SAMPLING INTERVAL
    # --------------------------------------

    time.sleep(CPU_SAMPLE_INTERVAL)

    # --------------------------------------
    # STEP 3: COLLECT PROCESS INFORMATION
    # --------------------------------------

    for process in available_processes:

        try:

            pid = process.info["pid"]

            name = (
                process.info.get("name") or "Unknown"
            )

            # Raw process CPU percentage.
            raw_cpu_usage = process.cpu_percent(
                interval=None
            )

            # Normalize against all logical CPU cores.
            cpu_usage = round(
                raw_cpu_usage / logical_cpu_count,
                2
            )

            # Process RAM usage as percentage of total RAM.
            memory_usage = round(
                process.memory_percent(),
                2
            )

            identification = identify_process(
                name,
                pid
            )

            processes.append({

                "pid": pid,

                "name": name,

                "cpuPercent": cpu_usage,

                "memoryPercent": round(
                    memory_usage, 2
                ),

                "rawCpuPercent": round(
                    raw_cpu_usage, 2
                ),

                **identification

            })

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess
        ):
            continue

    # --------------------------------------
    # STEP 4: SORT CPU PROCESSES
    # --------------------------------------

    top_cpu_processes = sorted(
        processes,
        key=lambda item: item["cpuPercent"],
        reverse=True
    )[:10]

    # --------------------------------------
    # STEP 5: SORT RAM PROCESSES
    # --------------------------------------

    top_memory_processes = sorted(
        processes,
        key=lambda item: item["memoryPercent"],
        reverse=True
    )[:10]

    # --------------------------------------
    # STEP 6: SCAN SUMMARY
    # --------------------------------------

    scan_duration = round(
        time.perf_counter() - scan_start,
        2
    )

    return {

        "success": True,

        "message": "Process diagnosis completed",

        "agentPid": FIXMATE_AGENT_PID,

        "totalProcesses": len(processes),

        "logicalCpuCount": logical_cpu_count,

        "cpuSamplingIntervalSeconds": CPU_SAMPLE_INTERVAL,

        "scanDurationSeconds": scan_duration,

        "cpuMeasurementNote": (
            "Process CPU percentage is normalized across logical CPU cores. "
            "Raw CPU percentage is also provided for reference. "
            "Readings are short-duration samples and may fluctuate."
        ),

        "topCpuProcesses": top_cpu_processes,

        "topMemoryProcesses": top_memory_processes

    }


# ==========================================
# START LOCAL AGENT
# ==========================================

if __name__ == "__main__":

    print("=" * 55)
    print("             FIXMATE LOCAL AGENT")
    print("=" * 55)

    print("Agent starting...")

    print(f"Address: http://{AGENT_HOST}:{AGENT_PORT}")

    print(f"Version: {AGENT_VERSION}")

    print(f"Agent PID: {FIXMATE_AGENT_PID}")

    print(f"Logical CPU Cores: {psutil.cpu_count(logical=True)}")


    print("=" * 55)

    print("Keep this terminal open while using FixMate.")

    uvicorn.run(
        app,
        host=AGENT_HOST,
        port=AGENT_PORT
    )
