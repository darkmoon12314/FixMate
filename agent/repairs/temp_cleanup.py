import os
import tempfile
import hashlib
import ctypes
import json
import uuid

from pathlib import Path
from datetime import datetime, timedelta, timezone


OLD_FILE_DAYS = 15
PREVIEW_LIMIT = 200
RESTORE_RETENTION_DAYS = 7


# ==========================================
# PATH CONFIGURATION
# ==========================================

def get_temp_root():
    return Path(tempfile.gettempdir()).resolve()


def get_quarantine_root():
    """
    Keep quarantine outside TEMP but on the same volume.
    This allows rename-based moves instead of copy-and-delete.
    """
    temp_root = get_temp_root()
    root = (temp_root.parent / "FixMateQuarantine").resolve()

    if root == temp_root or root.is_relative_to(temp_root):
        raise RuntimeError("Unsafe quarantine folder location.")

    return root


def is_inside_folder(file_path, folder_path):
    try:
        candidate = Path(file_path).resolve(strict=False)
        parent = Path(folder_path).resolve(strict=False)
        return candidate != parent and candidate.is_relative_to(parent)
    except (OSError, ValueError):
        return False


def has_symlink_component(path, root):
    """
    Check every existing component below root without following symlinks.
    The caller must first ensure path is lexically inside root.
    """
    path = Path(path)
    root = Path(root)

    try:
        relative = path.relative_to(root)
    except ValueError:
        return True

    current = root
    for part in relative.parts:
        current = current / part
        try:
            if current.is_symlink():
                return True
        except OSError:
            return True

    return False


def save_manifest(manifest_path, manifest):
    temporary_path = manifest_path.with_name("manifest.tmp")
    with temporary_path.open("w", encoding="utf-8") as file:
        json.dump(manifest, file, indent=2)
        file.flush()
        os.fsync(file.fileno())

    os.replace(temporary_path, manifest_path)


def safe_batch_folder(batch_id):
    try:
        normalized_id = str(uuid.UUID(batch_id))
    except (ValueError, TypeError, AttributeError):
        raise ValueError("Invalid quarantine batch ID.")

    quarantine_root = get_quarantine_root()
    batch_folder = quarantine_root / normalized_id

    if not is_inside_folder(batch_folder, quarantine_root):
        raise ValueError("Invalid quarantine batch location.")

    return normalized_id, quarantine_root, batch_folder


# ==========================================
# WINDOWS FILE LOCK CHECK
# ==========================================

def check_file_lock(file_path):
    """
    True  = Windows reports sharing/lock violation.
    False = Exclusive open succeeded.
    None  = Status could not be determined.

    This is a best-effort check, not a guarantee that a file is unused.
    """
    if os.name != "nt":
        return None

    try:
        from ctypes import wintypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

        create_file = kernel32.CreateFileW
        create_file.argtypes = [
            wintypes.LPCWSTR,
            wintypes.DWORD,
            wintypes.DWORD,
            wintypes.LPVOID,
            wintypes.DWORD,
            wintypes.DWORD,
            wintypes.HANDLE,
        ]
        create_file.restype = wintypes.HANDLE

        close_handle = kernel32.CloseHandle
        close_handle.argtypes = [wintypes.HANDLE]
        close_handle.restype = wintypes.BOOL

        handle = create_file(
            str(file_path),
            0x80000000,
            0,
            None,
            3,
            0x80,
            None
        )

        invalid_handle = ctypes.c_void_p(-1).value

        if handle == invalid_handle:
            error_code = ctypes.get_last_error()
            if error_code in (32, 33):
                return True
            return None

        close_handle(handle)
        return False

    except Exception:
        return None


# ==========================================
# FILE IDENTIFICATION
# ==========================================

def create_file_id(file_path, modified_ns, file_size):
    identity = f"{file_path}|{modified_ns}|{file_size}"
    return hashlib.sha256(
        identity.encode("utf-8", errors="replace")
    ).hexdigest()


# ==========================================
# TEMPORARY FILE SCANNER
# ==========================================

def scan_temp_files():
    """Read-only scan of the current user's TEMP folder."""
    temp_path = get_temp_root()

    old_files = []
    recent_files = []
    in_use_files = []
    unknown_files = []

    total_size = 0
    skipped_count = 0
    scanned_count = 0

    now = datetime.now()
    old_threshold = timedelta(days=OLD_FILE_DAYS)

    if not temp_path.exists() or not temp_path.is_dir():
        raise RuntimeError("Windows TEMP folder was not found.")

    for root, dirs, files in os.walk(temp_path, followlinks=False):
        dirs[:] = [
            directory for directory in dirs
            if not (Path(root) / directory).is_symlink()
        ]

        for filename in files:
            file_path = Path(root) / filename

            try:
                if file_path.is_symlink():
                    skipped_count += 1
                    continue

                file_info = file_path.stat(follow_symlinks=False)

                if not file_path.is_file():
                    skipped_count += 1
                    continue

                file_size = file_info.st_size
                modified_datetime = datetime.fromtimestamp(file_info.st_mtime)
                age = now - modified_datetime
                age_days = max(0, round(age.total_seconds() / 86400, 2))
                modified_time = modified_datetime.strftime("%Y-%m-%d %H:%M:%S")

                file_id = create_file_id(
                    str(file_path),
                    file_info.st_mtime_ns,
                    file_size
                )

                lock_status = check_file_lock(file_path)

                file_record = {
                    "fileId": file_id,
                    "name": filename,
                    "path": str(file_path),
                    "sizeBytes": file_size,
                    "modifiedAt": modified_time,
                    "ageDays": age_days,
                    "lockStatus": (
                        "locked" if lock_status is True
                        else "available" if lock_status is False
                        else "unknown"
                    )
                }

                total_size += file_size
                scanned_count += 1

                if lock_status is True:
                    in_use_files.append(file_record)
                elif lock_status is None:
                    unknown_files.append(file_record)
                elif age > old_threshold:
                    old_files.append(file_record)
                else:
                    recent_files.append(file_record)

            except (PermissionError, OSError):
                skipped_count += 1
                continue

    all_files = old_files + recent_files + in_use_files + unknown_files

    return {
        "success": True,
        "message": "Temporary file scan completed.",
        "folder": str(temp_path),
        "totalFiles": scanned_count,
        "totalSizeBytes": total_size,
        "totalSizeMB": round(total_size / (1024 * 1024), 2),
        "skippedFiles": skipped_count,
        "thresholdDays": OLD_FILE_DAYS,
        "previewLimit": PREVIEW_LIMIT,
        "oldFileCount": len(old_files),
        "recentFileCount": len(recent_files),
        "inUseFileCount": len(in_use_files),
        "unknownStatusCount": len(unknown_files),
        "oldFiles": old_files[:PREVIEW_LIMIT],
        "recentFiles": recent_files[:PREVIEW_LIMIT],
        "inUseFiles": in_use_files[:PREVIEW_LIMIT],
        "unknownFiles": unknown_files[:PREVIEW_LIMIT],
        "files": all_files[:PREVIEW_LIMIT]
    }


# ==========================================
# QUARANTINE SELECTED FILES
# ==========================================

def quarantine_selected_files(file_ids):
    """
    Move selected, freshly verified TEMP files into quarantine.
    The client supplies IDs only; it never supplies filesystem paths.
    No permanent deletion takes place.
    """
    if os.name != "nt":
        raise RuntimeError("Quarantine is supported on Windows only.")

    if not isinstance(file_ids, list) or not file_ids:
        raise ValueError("Select at least one file.")

    if len(file_ids) > PREVIEW_LIMIT:
        raise ValueError("Too many files selected.")

    if len(set(file_ids)) != len(file_ids):
        raise ValueError("Duplicate file IDs are not allowed.")

    if any(
        not isinstance(item, str)
        or len(item) != 64
        or any(char not in "0123456789abcdef" for char in item)
        for item in file_ids
    ):
        raise ValueError("One or more file IDs are invalid.")

    fresh_scan = scan_temp_files()
    available_files = fresh_scan["oldFiles"] + fresh_scan["recentFiles"]
    file_lookup = {
        item["fileId"]: item
        for item in available_files
        if item["lockStatus"] == "available"
    }

    temp_root = get_temp_root()
    quarantine_root = get_quarantine_root()
    quarantine_root.mkdir(parents=True, exist_ok=True)

    # Confirm both folders are on the same volume; do not fall back to copy/delete.
    if os.stat(temp_root).st_dev != os.stat(quarantine_root).st_dev:
        raise RuntimeError(
            "Quarantine folder must be on the same drive as the TEMP folder."
        )

    if quarantine_root.is_symlink():
        raise RuntimeError("Quarantine folder cannot be a symbolic link.")

    batch_id = str(uuid.uuid4())
    batch_folder = quarantine_root / batch_id
    files_folder = batch_folder / "files"
    files_folder.mkdir(parents=True, exist_ok=False)

    manifest_path = batch_folder / "manifest.json"
    now = datetime.now(timezone.utc)

    manifest = {
        "batchId": batch_id,
        "createdAt": now.isoformat(),
        "expiresAt": (now + timedelta(days=RESTORE_RETENTION_DAYS)).isoformat(),
        "status": "in_progress",
        "files": []
    }
    save_manifest(manifest_path, manifest)

    results = []

    for file_id in file_ids:
        record = file_lookup.get(file_id)

        if not record:
            results.append({
                "fileId": file_id,
                "status": "rejected",
                "reason": "File was not found in the fresh scan or is not available."
            })
            continue

        source_path = Path(record["path"])

        try:
            # Do not trust the path from the scan without checking it again.
            if not is_inside_folder(source_path, temp_root):
                raise ValueError("File is outside the TEMP folder.")

            if has_symlink_component(source_path, temp_root):
                raise ValueError("Symbolic-link paths are not allowed.")

            resolved_source = source_path.resolve(strict=True)

            if not is_inside_folder(resolved_source, temp_root):
                raise ValueError("Resolved file is outside the TEMP folder.")

            if not resolved_source.is_file():
                raise ValueError("Selected item is not a regular file.")

            current_info = resolved_source.stat(follow_symlinks=False)
            current_id = create_file_id(
                str(resolved_source),
                current_info.st_mtime_ns,
                current_info.st_size
            )

            if current_id != file_id:
                raise ValueError("File changed after the scan. Scan again.")

            lock_status = check_file_lock(resolved_source)
            if lock_status is not False:
                raise ValueError(
                    "File is locked or its lock status cannot be verified."
                )

            relative_path = resolved_source.relative_to(temp_root)
            destination = files_folder / relative_path

            if not is_inside_folder(destination, files_folder):
                raise ValueError("Unsafe quarantine destination.")

            destination.parent.mkdir(parents=True, exist_ok=True)

            if has_symlink_component(destination.parent, files_folder):
                raise ValueError("Quarantine destination contains a symbolic link.")

            if destination.exists():
                raise ValueError("Quarantine destination already exists.")

            entry = {
                "fileId": file_id,
                "name": resolved_source.name,
                "relativePath": relative_path.as_posix(),
                "sizeBytes": current_info.st_size,
                "modifiedNs": current_info.st_mtime_ns,
                "status": "moving"
            }

            # Persist intent before moving so an interrupted operation is visible.
            manifest["files"].append(entry)
            save_manifest(manifest_path, manifest)

            # Same-volume rename: no copy-and-delete fallback.
            os.rename(resolved_source, destination)

            moved_info = destination.stat(follow_symlinks=False)
            if (
                moved_info.st_size != current_info.st_size
                or moved_info.st_mtime_ns != current_info.st_mtime_ns
            ):
                # Attempt to put the file back without overwriting anything.
                if not resolved_source.exists():
                    os.rename(destination, resolved_source)
                entry["status"] = "failed"
                entry["error"] = "File metadata changed during quarantine."
                save_manifest(manifest_path, manifest)
                raise RuntimeError("File metadata changed during quarantine.")

            entry["status"] = "quarantined"
            save_manifest(manifest_path, manifest)

            results.append({
                "fileId": file_id,
                "name": resolved_source.name,
                "status": "quarantined"
            })

        except Exception as error:
            # If the rename did not happen, mark the pending manifest entry
            # as failed. If it did happen before an interruption, keep "moving"
            # so the restore routine can recover it.
            for pending_entry in manifest["files"]:
                if (
                    pending_entry.get("fileId") == file_id
                    and pending_entry.get("status") == "moving"
                ):
                    pending_relative = Path(pending_entry["relativePath"])
                    pending_destination = files_folder / pending_relative
                    if not pending_destination.exists():
                        pending_entry["status"] = "failed"
                        pending_entry["error"] = str(error)
                        save_manifest(manifest_path, manifest)
                    break

            results.append({
                "fileId": file_id,
                "status": "failed",
                "reason": str(error)
            })

    quarantined_count = sum(
        1 for item in manifest["files"]
        if item.get("status") in ("quarantined", "moving")
    )

    manifest["status"] = (
        "completed" if quarantined_count and all(
            item.get("status") == "quarantined"
            for item in manifest["files"]
        ) else "partially_completed" if quarantined_count
        else "failed"
    )
    save_manifest(manifest_path, manifest)

    if not manifest["files"]:
        try:
            (batch_folder / "manifest.json").unlink(missing_ok=True)
            batch_folder.rmdir()
        except OSError:
            pass

    return {
        "success": quarantined_count > 0,
        "message": (
            "Quarantine operation completed."
            if quarantined_count
            else "No files were moved to quarantine."
        ),
        "batchId": batch_id if quarantined_count else None,
        "quarantinedCount": quarantined_count,
        "results": results
    }


# ==========================================
# RESTORE / UNDO QUARANTINE BATCH
# ==========================================

def restore_quarantine_batch(batch_id):
    """
    Restore files from a quarantine batch.
    Existing original files are never overwritten.
    """
    if os.name != "nt":
        raise RuntimeError("Restore is supported on Windows only.")

    batch_id, quarantine_root, batch_folder = safe_batch_folder(batch_id)
    temp_root = get_temp_root()
    manifest_path = batch_folder / "manifest.json"
    files_folder = batch_folder / "files"

    if batch_folder.is_symlink() or manifest_path.is_symlink():
        raise ValueError("Quarantine batch contains an unsafe symbolic link.")

    if not manifest_path.is_file():
        raise ValueError("Quarantine batch was not found.")

    if not is_inside_folder(files_folder, batch_folder):
        raise ValueError("Invalid quarantine files folder.")

    with manifest_path.open("r", encoding="utf-8") as file:
        manifest = json.load(file)

    if not isinstance(manifest, dict) or manifest.get("batchId") != batch_id:
        raise ValueError("Quarantine manifest does not match.")

    try:
        expires_at = datetime.fromisoformat(manifest["expiresAt"])
        if expires_at.tzinfo is None:
            raise ValueError("Invalid quarantine expiry timestamp.")
    except (KeyError, TypeError, ValueError):
        raise ValueError("Quarantine expiry information is invalid.")

    if datetime.now(timezone.utc) > expires_at:
        raise ValueError("Restore period has expired.")

    results = []

    for entry in manifest.get("files", []):
        if not isinstance(entry, dict):
            continue

        if entry.get("status") not in ("quarantined", "moving"):
            continue

        try:
            relative_text = entry.get("relativePath")
            if not isinstance(relative_text, str) or not relative_text:
                raise ValueError("Stored relative path is invalid.")

            relative_path = Path(relative_text)

            if relative_path.is_absolute() or ".." in relative_path.parts:
                raise ValueError("Stored relative path is unsafe.")

            original_path = temp_root / relative_path
            quarantine_path = files_folder / relative_path

            if not is_inside_folder(original_path, temp_root):
                raise ValueError("Original path is outside TEMP folder.")

            if not is_inside_folder(quarantine_path, files_folder):
                raise ValueError("Quarantine path is outside its batch.")

            if has_symlink_component(quarantine_path, files_folder):
                raise ValueError("Quarantine path contains a symbolic link.")

            if not quarantine_path.is_file():
                # A "moving" entry may have been moved back before a crash.
                if entry.get("status") == "moving" and original_path.is_file():
                    entry["status"] = "restored"
                    save_manifest(manifest_path, manifest)
                    results.append({
                        "name": entry.get("name", relative_path.name),
                        "status": "already_restored"
                    })
                    continue
                raise ValueError("Quarantined file is missing.")

            info = quarantine_path.stat(follow_symlinks=False)
            if (
                info.st_size != entry.get("sizeBytes")
                or info.st_mtime_ns != entry.get("modifiedNs")
            ):
                raise ValueError("Quarantined file changed; restore was blocked.")

            lock_status = check_file_lock(quarantine_path)
            if lock_status is not False:
                raise ValueError(
                    "Quarantined file is locked or its lock status is unknown."
                )

            # Create parent directories one at a time, rejecting symlinks.
            current = temp_root
            for part in relative_path.parts[:-1]:
                current = current / part
                if current.exists():
                    if current.is_symlink() or not current.is_dir():
                        raise ValueError("Restore parent path is unsafe.")
                else:
                    current.mkdir()

            if has_symlink_component(original_path.parent, temp_root):
                raise ValueError("Restore destination contains a symbolic link.")

            if original_path.exists():
                raise FileExistsError(
                    "A file already exists at the original location."
                )

            # os.rename on Windows does not overwrite an existing destination.
            os.rename(quarantine_path, original_path)

            restored_info = original_path.stat(follow_symlinks=False)
            if (
                restored_info.st_size != entry.get("sizeBytes")
                or restored_info.st_mtime_ns != entry.get("modifiedNs")
            ):
                raise RuntimeError("Restored file metadata verification failed.")

            entry["status"] = "restored"
            save_manifest(manifest_path, manifest)

            results.append({
                "name": entry.get("name", relative_path.name),
                "status": "restored"
            })

        except Exception as error:
            results.append({
                "name": entry.get("name", "Unknown"),
                "status": "failed",
                "reason": str(error)
            })

    remaining = sum(
        1 for item in manifest.get("files", [])
        if item.get("status") in ("quarantined", "moving")
    )

    manifest["status"] = "restored" if remaining == 0 else "partially_restored"
    save_manifest(manifest_path, manifest)

    return {
        "success": remaining == 0,
        "message": "Restore operation completed.",
        "batchId": batch_id,
        "remainingFiles": remaining,
        "results": results
    }


# ==========================================
# QUARANTINE HISTORY
# ==========================================

def get_quarantine_history():
    quarantine_root = get_quarantine_root()

    if not quarantine_root.exists():
        return []

    if quarantine_root.is_symlink():
        raise RuntimeError("Quarantine folder cannot be a symbolic link.")

    history = []

    for batch_folder in quarantine_root.iterdir():
        if not batch_folder.is_dir() or batch_folder.is_symlink():
            continue

        manifest_path = batch_folder / "manifest.json"

        try:
            if not manifest_path.is_file() or manifest_path.is_symlink():
                continue

            with manifest_path.open("r", encoding="utf-8") as file:
                manifest = json.load(file)

            if not isinstance(manifest, dict):
                continue

            if manifest.get("batchId") != batch_folder.name:
                continue

            entries = manifest.get("files", [])
            if not isinstance(entries, list):
                continue

            history.append({
                "batchId": manifest["batchId"],
                "createdAt": manifest.get("createdAt"),
                "expiresAt": manifest.get("expiresAt"),
                "status": manifest.get("status"),
                "totalFiles": len(entries),
                "quarantinedFiles": sum(
                    1 for item in entries
                    if isinstance(item, dict)
                    and item.get("status") in ("quarantined", "moving")
                ),
                "restoredFiles": sum(
                    1 for item in entries
                    if isinstance(item, dict)
                    and item.get("status") == "restored"
                ),
                "files": [
                    {
                        "name": item.get("name") or Path(item.get("relativePath", "")).name or "Unknown",
                        "relativePath": item.get("relativePath"),
                        "sizeBytes": item.get("sizeBytes", 0),
                        "status": item.get("status", "unknown")
                    }
                    for item in entries
                    if isinstance(item, dict)
                ]
            })

        except (OSError, ValueError, KeyError):
            continue

    return sorted(
        history,
        key=lambda item: item.get("createdAt") or "",
        reverse=True
    )
