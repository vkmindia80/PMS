# Enterprise Portfolio Management System

A comprehensive SaaS platform for portfolio and project management with advanced features including multi-tenant architecture, real-time collaboration, and AI-powered insights.

## 🚀 Project Status

### Phase 1: Foundation & Core Setup ✅
- [x] **1.1** Project Structure & Environment Setup
- [ ] **1.2** Database Design & Models (Next)
- [ ] **1.3** Authentication & Authorization System

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **MongoDB** - NoSQL database for flexible data storage
- **Motor** - Async MongoDB driver
- **JWT** - JSON Web Token authentication
- **Pydantic** - Data validation and serialization

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **React Query** - Server state management
- **React Router** - Client-side routing

## 📁 Project Structure

```
/app/
├── backend/                 # FastAPI backend
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Backend environment variables
├── frontend/               # React frontend
│   ├── src/               # Source code
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── App.tsx        # Main App component
│   │   └── main.tsx       # Entry point
│   ├── package.json       # Node.js dependencies
│   ├── vite.config.ts     # Vite configuration
│   ├── tailwind.config.js # Tailwind CSS configuration
│   └── .env               # Frontend environment variables
└── supervisord.conf        # Process management
```

## 🏃‍♂️ Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- MongoDB (local or cloud)
- Yarn package manager

### Installation

1. **Install Backend Dependencies**
   ```bash
   cd /app/backend
   pip install -r requirements.txt
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd /app/frontend
   yarn install
   ```

3. **Start Services**
   ```bash
   # Start all services with supervisor
   sudo supervisorctl start all
   
   # Or start individually
   sudo supervisorctl start backend
   sudo supervisorctl start frontend
   ```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/api/health

## 🔧 Development Commands

### Backend
```bash
# Start development server
cd /app/backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Run tests (when implemented)
pytest

# Check API docs
curl http://localhost:8001/api/health
```

### Frontend
```bash
# Start development server
cd /app/frontend
yarn dev

# Build for production
yarn build

# Run tests (when implemented)
yarn test

# Lint code
yarn lint
```

### Supervisor Management
```bash
# Check status
sudo supervisorctl status

# Restart services
sudo supervisorctl restart all
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# View logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/frontend.out.log
```

## 🌟 Current Features (Phase 1.1)

### ✅ Completed
- Professional project structure with TypeScript support
- FastAPI backend with proper CORS and middleware setup
- React frontend with modern tooling (Vite, Tailwind CSS)
- Enterprise-grade dependency management
- Supervisor-based process management
- Health check endpoints
- Responsive dashboard layout
- API connection testing

### 🚧 Coming Next (Phase 1.2)
- MongoDB database models and connections
- User, Project, Task, and Organization schemas
- Database indexing strategies
- Data validation and serialization

## 🔒 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DATABASE_NAME=enterprise_portfolio_db
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
VITE_API_URL=http://localhost:8001
```

## 📋 Next Steps

1. **Phase 1.2**: Implement database models and MongoDB connection
2. **Phase 1.3**: Add JWT authentication and user management
3. **Phase 2**: Build core portfolio management features
4. **Phase 3**: Add advanced project analytics and reporting

## 🤝 Contributing

This project follows the enterprise development roadmap. Each phase should be completed and tested before moving to the next.

## 📄 License

Enterprise Portfolio Management System - Internal Development Project