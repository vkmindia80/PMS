# Quick Fix Guide - Common Issues

## 🔧 Backend Not Starting (libmagic Error)

### Symptoms
- Backend shows `STOPPED` in supervisor status
- Error in logs: `ImportError: failed to find libmagic`
- 502 Bad Gateway errors on API calls

### Quick Fix (One Command)
```bash
sudo apt-get install -y libmagic1 && sudo supervisorctl restart backend
```

### Automated Fix (Recommended)
```bash
bash /app/setup_system_dependencies.sh
```

### Verify Fix
```bash
# Check backend status
sudo supervisorctl status backend

# Test API health
curl http://localhost:8001/api/health
```

---

## 🔄 Services Not Running

### Check Status
```bash
sudo supervisorctl status
```

### Start All Services
```bash
sudo supervisorctl start all
```

### Restart Specific Service
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl restart mongodb
```

---

## 📋 Check Logs

### Backend Logs
```bash
# Error logs
tail -f /var/log/supervisor/backend.err.log

# Output logs
tail -f /var/log/supervisor/backend.out.log
```

### Frontend Logs
```bash
tail -f /var/log/supervisor/frontend.out.log
tail -f /var/log/supervisor/frontend.err.log
```

### MongoDB Logs
```bash
tail -f /var/log/mongodb.out.log
tail -f /var/log/mongodb.err.log
```

---

## 🧪 Test API Endpoints

### Health Check
```bash
curl http://localhost:8001/api/health
```

### Test Login
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@company.com","password":"demo123456"}'
```

### Database Status
```bash
curl http://localhost:8001/api/database/status
```

---

## 🔐 Demo Credentials

**Email:** demo@company.com  
**Password:** demo123456

---

## 📚 More Documentation

- **System Dependencies:** See `/app/SYSTEM_DEPENDENCIES.md`
- **Project Overview:** See `/app/README.md`
- **Project Summary:** See `/app/PROJECT_SUMMARY.md`

---

## 🆘 Emergency Reset

If services are completely broken:

```bash
# Stop all services
sudo supervisorctl stop all

# Install system dependencies
bash /app/setup_system_dependencies.sh

# Start all services
sudo supervisorctl start all

# Wait 10 seconds
sleep 10

# Check status
sudo supervisorctl status
```
