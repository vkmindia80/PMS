# System Dependencies Documentation

## Overview
This document lists all system-level dependencies required by the Enterprise Portfolio Management application and how they are managed.

## Required System Libraries

### 1. libmagic1
**Purpose:** File type detection for upload functionality  
**Required by:** `python-magic` Python package (used in `/app/backend/services/s3_service.py`)  
**Installation:** `apt-get install -y libmagic1`

**Why it's needed:**
- The file upload service uses `python-magic` to detect MIME types of uploaded files
- `python-magic` is a Python wrapper around the libmagic C library
- Without libmagic1, the backend service will crash on startup with:
  ```
  ImportError: failed to find libmagic. Check your installation
  ```

## Automated Installation

### Method 1: Entrypoint Script (Primary)
The system dependency is automatically installed when the container starts via `/entrypoint.sh`:

```bash
# Install system dependencies required by the application
echo "Installing required system dependencies..."
apt-get update -qq > /dev/null 2>&1
apt-get install -y libmagic1 > /dev/null 2>&1
echo "System dependencies installed successfully"
```

This ensures the dependency is always present, even after container restarts or redeployments.

### Method 2: Manual Setup Script (Backup)
If you need to manually install dependencies, run:

```bash
bash /app/setup_system_dependencies.sh
```

This script will:
1. Update the package list
2. Install libmagic1
3. Verify the installation
4. Provide instructions to restart services if needed

## Verification

To verify that libmagic1 is installed:

```bash
dpkg -l | grep libmagic1
```

Expected output:
```
ii  libmagic1:arm64  1:5.44-3  arm64  Recognize the type of data in a file using "magic" numbers - library
```

## Troubleshooting

### Issue: Backend fails to start with libmagic error

**Symptoms:**
- Backend service shows STOPPED status
- Error in `/var/log/supervisor/backend.err.log`: `ImportError: failed to find libmagic`
- 502 errors when accessing API endpoints

**Solution:**
1. Install the missing library:
   ```bash
   sudo apt-get update
   sudo apt-get install -y libmagic1
   ```

2. Restart the backend service:
   ```bash
   sudo supervisorctl restart backend
   ```

3. Verify it's running:
   ```bash
   sudo supervisorctl status backend
   curl http://localhost:8001/api/health
   ```

### Issue: Dependency not persisting across restarts

**Cause:** The entrypoint script may not be running or may have failed

**Solution:**
1. Check if entrypoint script is being executed:
   ```bash
   grep "Installing required system dependencies" /var/log/supervisor/supervisord.log
   ```

2. Manually run the setup script:
   ```bash
   bash /app/setup_system_dependencies.sh
   ```

3. For permanent fix, ensure `/entrypoint.sh` has execute permissions:
   ```bash
   chmod +x /entrypoint.sh
   ```

## Adding New System Dependencies

If you need to add more system dependencies in the future:

1. Update `/entrypoint.sh`:
   ```bash
   apt-get install -y libmagic1 your-new-package
   ```

2. Update `/app/setup_system_dependencies.sh`:
   ```bash
   apt-get install -y \
     libmagic1 \
     your-new-package
   ```

3. Document the new dependency in this file

4. Add a comment in `requirements.txt` if it's related to a Python package:
   ```
   python-package==1.0.0  # Requires system library: package-name
   ```

## Related Files

- `/entrypoint.sh` - Container startup script with auto-installation
- `/app/setup_system_dependencies.sh` - Manual setup script
- `/app/backend/requirements.txt` - Python dependencies (with system dependency comments)
- `/app/backend/services/s3_service.py` - File service that uses python-magic
- `/var/log/supervisor/backend.err.log` - Backend error logs for debugging

## Last Updated
October 8, 2025 - Initial documentation created
