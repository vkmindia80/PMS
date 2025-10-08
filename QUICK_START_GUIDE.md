# 🚀 Quick Start Guide - Enterprise Portfolio Management

## ⚡ Quick Commands

### Check System Status
```bash
sudo supervisorctl status
```

### Start All Services
```bash
sudo supervisorctl start all
```

### Restart All Services
```bash
sudo supervisorctl restart all
```

### Run Complete Startup Check
```bash
bash /app/scripts/startup.sh
```

### Verify Dependencies
```bash
bash /app/scripts/ensure_dependencies.sh
```

---

## 🔍 Health Checks

### Backend Health
```bash
curl http://localhost:8001/api/health
```

**Expected**: `{"status":"healthy","service":"Enterprise Portfolio Management API",...}`

### Frontend Access
```bash
curl -I http://localhost:3000
```

**Expected**: `HTTP/1.1 200 OK`

---

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **Backend API** | http://localhost:8001 | REST API endpoints |
| **API Docs** | http://localhost:8001/docs | Interactive API documentation |
| **API Schema** | http://localhost:8001/openapi.json | OpenAPI schema |

---

## 📋 Demo Data

### Login Credentials
- **Email**: `demo@company.com`
- **Password**: `demo123456`

### Generate Demo Data
From the login page, click "Generate Demo Data" button, or use the API:
```bash
curl -X POST http://localhost:8001/api/system/generate-demo-data
```

---

## 🔧 Troubleshooting

### Issue: 502 Bad Gateway Error

**Solution**:
```bash
# Check backend status
sudo supervisorctl status backend

# If stopped, check logs
tail -n 50 /var/log/supervisor/backend.err.log

# Verify dependencies
bash /app/scripts/ensure_dependencies.sh

# Restart backend
sudo supervisorctl restart backend
```

### Issue: Backend Won't Start

**Solution**:
```bash
# Check for missing dependencies
dpkg -l | grep libmagic

# Install if missing
apt-get install -y libmagic1 libmagic-dev

# Restart backend
sudo supervisorctl restart backend
```

### Issue: Frontend Not Loading

**Solution**:
```bash
# Check frontend status
sudo supervisorctl status frontend

# Check logs
tail -n 50 /var/log/supervisor/frontend.err.log

# Restart frontend
sudo supervisorctl restart frontend
```

### Issue: Database Connection Error

**Solution**:
```bash
# Check MongoDB status
sudo supervisorctl status mongodb

# Test connection
mongosh --eval "db.adminCommand('ping')"

# Restart MongoDB if needed
sudo supervisorctl restart mongodb
```

---

## 📊 Service Logs

### View Backend Logs
```bash
# Error logs
tail -f /var/log/supervisor/backend.err.log

# Output logs
tail -f /var/log/supervisor/backend.out.log
```

### View Frontend Logs
```bash
# Error logs
tail -f /var/log/supervisor/frontend.err.log

# Output logs
tail -f /var/log/supervisor/frontend.out.log
```

### View All Supervisor Logs
```bash
tail -f /var/log/supervisor/*.log
```

---

## 🛠️ Development

### Install New Python Package
```bash
cd /app/backend
pip install package-name
pip freeze > requirements.txt
sudo supervisorctl restart backend
```

### Install New Node Package
```bash
cd /app/frontend
yarn add package-name
sudo supervisorctl restart frontend
```

### Run Backend Manually (for debugging)
```bash
cd /app/backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Run Frontend Manually (for debugging)
```bash
cd /app/frontend
yarn dev
```

---

## ✅ Pre-Deployment Checklist

Before deploying or restarting:

- [ ] Run dependency check: `bash /app/scripts/ensure_dependencies.sh`
- [ ] Verify MongoDB is running: `sudo supervisorctl status mongodb`
- [ ] Check backend configuration: `cd /app/backend && python3 -c "import server"`
- [ ] Review recent logs: `tail -n 50 /var/log/supervisor/*.err.log`
- [ ] Test health endpoint: `curl http://localhost:8001/api/health`
- [ ] Verify frontend builds: `cd /app/frontend && yarn build --dry-run` (if available)

---

## 🎯 Common Tasks

### Restart After Code Changes

**Backend changes**:
```bash
sudo supervisorctl restart backend
```

**Frontend changes**:
```bash
# Hot reload enabled, no restart needed
# Or manually restart:
sudo supervisorctl restart frontend
```

### Clear Logs
```bash
sudo truncate -s 0 /var/log/supervisor/*.log
```

### Check System Resources
```bash
# CPU and Memory
top

# Disk usage
df -h

# Process list
ps aux | grep -E "uvicorn|node|mongod"
```

---

## 📚 Documentation References

- **Full 502 Fix Documentation**: `/app/502_ERROR_PERMANENT_FIX.md`
- **System Dependencies**: `/app/setup_system_dependencies.sh`
- **Project README**: `/app/README.md`
- **Real System Status**: `/app/REAL_SYSTEM_STATUS_ASSESSMENT.md`

---

## 🚨 Emergency Recovery

If everything is broken:

```bash
# 1. Stop all services
sudo supervisorctl stop all

# 2. Check dependencies
bash /app/scripts/ensure_dependencies.sh

# 3. Verify MongoDB
mongosh --eval "db.adminCommand('ping')"

# 4. Start services one by one
sudo supervisorctl start mongodb
sleep 2
sudo supervisorctl start backend
sleep 2
sudo supervisorctl start frontend

# 5. Check status
sudo supervisorctl status

# 6. Verify health
curl http://localhost:8001/api/health
```

---

*Quick Reference | Always Keep Handy | Updated January 2025*
