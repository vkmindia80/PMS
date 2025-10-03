#!/usr/bin/env python3
"""
Comprehensive Demo Data Generator for Enterprise Portfolio Management System
Consolidates all demo data generation into one reliable script with realistic, interconnected data
"""

import asyncio
import sys
import os
import json
from datetime import datetime, timedelta, date
import random
import uuid
from typing import List, Dict, Any
import logging

# Add the backend directory to the Python path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from auth.utils import hash_password

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ComprehensiveDemoDataGenerator:
    def __init__(self):
        self.db = None
        self.org_id = "demo-org-001"
        self.generated_data = {
            "users": [],
            "teams": [],
            "projects": [],
            "tasks": [],
            "comments": [],
            "files": [],
            "notifications": []
        }
        
        # Enhanced user profiles with specialized roles for diverse project types
        self.user_profiles = [
            # AI/ML Team
            {
                "email": "dr.sarah.neural@company.com",
                "first_name": "Dr. Sarah", "last_name": "Neural",
                "role": "team_lead", "department": "AI Research",
                "skills": ["TensorFlow", "PyTorch", "Computer Vision", "NLP", "MLOps", "Deep Learning", "Research"],
                "hourly_rate": 120, "experience_years": 12,
                "bio": "AI Research Director with PhD in Machine Learning, specializing in medical AI applications and computer vision",
                "certifications": ["Google Cloud ML Engineer", "AWS ML Specialty", "NVIDIA Deep Learning"],
                "clearance_level": "Top Secret"
            },
            {
                "email": "marcus.quantum@company.com",
                "first_name": "Marcus", "last_name": "Quantum",
                "role": "member", "department": "AI Research",
                "skills": ["Quantum Computing", "Qiskit", "Python", "Linear Algebra", "Quantum Algorithms", "Physics"],
                "hourly_rate": 110, "experience_years": 8,
                "bio": "Quantum Computing Engineer with background in theoretical physics and quantum algorithm development",
                "certifications": ["IBM Qiskit Certified", "Microsoft Quantum Development Kit"]
            },
            
            # Blockchain & Security Team
            {
                "email": "elena.blockchain@company.com",
                "first_name": "Elena", "last_name": "Blockchain",
                "role": "team_lead", "department": "Blockchain Engineering",
                "skills": ["Solidity", "Ethereum", "Smart Contracts", "Web3", "Cryptography", "DeFi", "Security"],
                "hourly_rate": 115, "experience_years": 9,
                "bio": "Senior Blockchain Engineer with expertise in DeFi protocols and smart contract security",
                "certifications": ["Certified Ethereum Developer", "Blockchain Security Professional"]
            },
            {
                "email": "james.cybersec@company.com",
                "first_name": "James", "last_name": "CyberSec",
                "role": "member", "department": "Security",
                "skills": ["Penetration Testing", "SIEM", "Threat Intelligence", "Malware Analysis", "Forensics", "Python"],
                "hourly_rate": 95, "experience_years": 7,
                "bio": "Cybersecurity Analyst specializing in threat detection and incident response",
                "certifications": ["CISSP", "CEH", "GCIH", "OSCP"],
                "clearance_level": "Secret"
            },
            
            # IoT & Hardware Team
            {
                "email": "raj.iot@company.com",
                "first_name": "Raj", "last_name": "IoTExpert",
                "role": "team_lead", "department": "IoT Engineering",
                "skills": ["IoT Architecture", "Edge Computing", "Arduino", "Raspberry Pi", "MQTT", "LoRaWAN", "5G"],
                "hourly_rate": 100, "experience_years": 10,
                "bio": "IoT Solutions Architect with expertise in smart city infrastructure and industrial IoT",
                "certifications": ["AWS IoT Core Specialty", "Cisco IoT Professional"]
            },
            
            # FinTech Team
            {
                "email": "olivia.fintech@company.com",
                "first_name": "Olivia", "last_name": "FinTech",
                "role": "team_lead", "department": "Financial Technology",
                "skills": ["HFT", "Risk Management", "Derivatives", "Quantitative Analysis", "Python", "C++", "Trading Systems"],
                "hourly_rate": 135, "experience_years": 11,
                "bio": "Quantitative Developer with Wall Street experience in high-frequency trading and risk systems",
                "certifications": ["CFA", "FRM", "Series 7", "Series 63"],
                "compliance": ["SEC", "FINRA", "SOX"]
            },
            
            # AR/VR Team
            {
                "email": "alex.immersive@company.com",
                "first_name": "Alex", "last_name": "Immersive",
                "role": "member", "department": "XR Development",
                "skills": ["Unity", "Unreal Engine", "ARKit", "ARCore", "WebXR", "3D Modeling", "VR/AR UX"],
                "hourly_rate": 88, "experience_years": 6,
                "bio": "Extended Reality Developer creating immersive training experiences and spatial computing solutions",
                "certifications": ["Unity Certified Expert", "Meta AR Developer"]
            },
            
            # Healthcare IT Team
            {
                "email": "dr.emily.healthtech@company.com",
                "first_name": "Dr. Emily", "last_name": "HealthTech",
                "role": "team_lead", "department": "Healthcare Technology",
                "skills": ["DICOM", "HL7 FHIR", "Medical Imaging", "FDA Compliance", "Clinical Workflows", "Radiology"],
                "hourly_rate": 125, "experience_years": 15,
                "bio": "Medical Informaticist and Radiologist leading healthcare AI development with clinical expertise",
                "certifications": ["Board Certified Radiologist", "HIMSS CPHIMS", "ABII"],
                "compliance": ["HIPAA", "FDA 510k", "ISO 13485"]
            },
            
            # Energy & Sustainability Team
            {
                "email": "peter.greentech@company.com",
                "first_name": "Peter", "last_name": "GreenTech",
                "role": "member", "department": "Energy Systems",
                "skills": ["Smart Grid", "Energy Storage", "Solar Systems", "Battery Management", "SCADA", "Power Electronics"],
                "hourly_rate": 92, "experience_years": 8,
                "bio": "Renewable Energy Engineer specializing in smart grid integration and energy management systems",
                "certifications": ["Professional Engineer (PE)", "NABCEP Solar PV", "IEEE Power & Energy"]
            },
            
            # Gaming Team
            {
                "email": "zoe.gamedev@company.com",
                "first_name": "Zoe", "last_name": "GameDev",
                "role": "member", "department": "Game Development",
                "skills": ["Unreal Engine", "Unity", "C#", "Game Design", "Multiplayer Systems", "Graphics Programming"],
                "hourly_rate": 82, "experience_years": 7,
                "bio": "Senior Game Developer with AAA studio experience in multiplayer game architecture",
                "certifications": ["Unity Certified Programmer", "Unreal Authorized Instructor"]
            },
            
            # EdTech Team
            {
                "email": "miguel.edtech@company.com",
                "first_name": "Miguel", "last_name": "EdTech",
                "role": "member", "department": "Educational Technology",
                "skills": ["Learning Analytics", "Adaptive Learning", "LMS", "SCORM", "xAPI", "Pedagogy", "UX Research"],
                "hourly_rate": 78, "experience_years": 9,
                "bio": "Educational Technologist with expertise in adaptive learning systems and learning analytics",
                "certifications": ["Certified Professional in Learning and Performance", "Google for Education"]
            },
            
            # Advanced Engineering Team
            {
                "email": "lisa.fullstack@company.com",
                "first_name": "Lisa", "last_name": "FullStack",
                "role": "team_lead", "department": "Engineering",
                "skills": ["React", "Node.js", "Microservices", "GraphQL", "Docker", "Kubernetes", "System Design"],
                "hourly_rate": 105, "experience_years": 11,
                "bio": "Principal Engineer with expertise in large-scale distributed systems and cloud architecture",
                "certifications": ["AWS Solutions Architect Professional", "Google Cloud Architect"]
            },
            
            # Product Management
            {
                "email": "jennifer.product@company.com",
                "first_name": "Jennifer", "last_name": "Product",
                "role": "manager", "department": "Product Management",
                "skills": ["Product Strategy", "User Research", "Analytics", "Roadmap Planning", "Stakeholder Management", "Agile"],
                "hourly_rate": 95, "experience_years": 10,
                "bio": "Senior Product Manager with experience launching enterprise B2B products from conception to scale",
                "certifications": ["Certified Scrum Product Owner", "Google Analytics IQ"]
            },
            
            # Quality Assurance
            {
                "email": "robert.qa@company.com",
                "first_name": "Robert", "last_name": "QualityAssurance",
                "role": "member", "department": "Quality Assurance",
                "skills": ["Test Automation", "Selenium", "API Testing", "Performance Testing", "Security Testing", "CI/CD"],
                "hourly_rate": 70, "experience_years": 6,
                "bio": "QA Engineer specializing in automated testing frameworks and continuous integration",
                "certifications": ["ISTQB Advanced", "Selenium Certified"]
            },
            
            # UX Research Team
            {
                "email": "maria.uxresearch@company.com",
                "first_name": "Maria", "last_name": "UXResearch",
                "role": "team_lead", "department": "User Experience",
                "skills": ["User Research", "Design Thinking", "Prototyping", "Accessibility", "A/B Testing", "Figma"],
                "hourly_rate": 85, "experience_years": 8,
                "bio": "Senior UX Researcher with expertise in accessibility and inclusive design principles",
                "certifications": ["Google UX Design Certificate", "Nielsen Norman Group UX Certification"]
            }
        ]
        
        # 10 Diverse, Comprehensive Project Templates with Industry-Specific Requirements
        self.project_templates = [
            {
                "name": "AI-Powered Medical Diagnosis Platform",
                "description": "FDA-compliant AI platform for automated medical image analysis supporting radiology, pathology, and dermatology workflows. Integrates with existing PACS/RIS systems and provides real-time diagnostic assistance with explainable AI features.",
                "type": "healthcare_ai",
                "priority": "critical",
                "status": "active",
                "estimated_hours": 4800,
                "duration_weeks": 28,
                "budget": 850000,
                "required_skills": ["TensorFlow", "PyTorch", "Computer Vision", "DICOM", "HL7 FHIR", "Medical Imaging", "FDA Compliance"],
                "category": "Healthcare AI",
                "tags": ["ai", "healthcare", "fda", "medical-imaging", "compliance"],
                "compliance_requirements": ["HIPAA", "FDA 510k", "ISO 13485", "IEC 62304"],
                "stakeholders": ["Radiologists", "Hospital IT", "FDA Regulatory", "Clinical Research"],
                "risks": ["Regulatory approval delays", "Clinical validation challenges", "Integration complexity"],
                "budget_breakdown": {
                    "development": 450000,
                    "compliance": 200000,
                    "clinical_trials": 150000,
                    "infrastructure": 50000
                }
            },
            {
                "name": "Smart City IoT Traffic Management System",
                "description": "Large-scale IoT deployment for intelligent traffic optimization across metropolitan area. Includes edge computing nodes, real-time analytics, predictive modeling, and integration with existing city infrastructure.",
                "type": "iot_smartcity",
                "priority": "high",
                "status": "planning",
                "estimated_hours": 5500,
                "duration_weeks": 32,
                "budget": 1200000,
                "required_skills": ["IoT Architecture", "Edge Computing", "5G", "Real-time Analytics", "MQTT", "LoRaWAN", "Machine Learning"],
                "category": "Smart Infrastructure",
                "tags": ["iot", "smart-city", "traffic", "edge-computing", "analytics"],
                "compliance_requirements": ["FCC Regulations", "Data Privacy Laws", "Municipal Standards"],
                "stakeholders": ["City Planning", "Traffic Authority", "Citizens", "Emergency Services"],
                "risks": ["Weather resilience", "Cybersecurity threats", "Public privacy concerns"],
                "budget_breakdown": {
                    "hardware": 600000,
                    "development": 350000,
                    "deployment": 200000,
                    "maintenance": 50000
                }
            },
            {
                "name": "Blockchain-Based Supply Chain Tracker",
                "description": "Immutable supply chain transparency platform using Ethereum smart contracts. Enables end-to-end traceability from raw materials to consumer delivery with automated compliance reporting and sustainability metrics.",
                "type": "blockchain_logistics",
                "priority": "medium",
                "status": "active",
                "estimated_hours": 3200,
                "duration_weeks": 22,
                "budget": 480000,
                "required_skills": ["Solidity", "Ethereum", "Smart Contracts", "Web3", "Supply Chain", "Cryptography"],
                "category": "Blockchain Logistics",
                "tags": ["blockchain", "supply-chain", "transparency", "smart-contracts", "sustainability"],
                "compliance_requirements": ["GDPR", "Import/Export Regulations", "Environmental Standards"],
                "stakeholders": ["Suppliers", "Manufacturers", "Retailers", "Regulators", "Consumers"],
                "risks": ["Gas fee volatility", "Scalability limitations", "Adoption resistance"],
                "budget_breakdown": {
                    "development": 280000,
                    "smart_contracts": 120000,
                    "integration": 60000,
                    "auditing": 20000
                }
            },
            {
                "name": "Real-Time Financial Trading Platform",
                "description": "Ultra-low latency algorithmic trading system supporting equities, derivatives, and cryptocurrency markets. Includes risk management, compliance monitoring, and real-time market data processing at microsecond speeds.",
                "type": "fintech_trading",
                "priority": "critical",
                "status": "active",
                "estimated_hours": 6000,
                "duration_weeks": 36,
                "budget": 2100000,
                "required_skills": ["HFT", "C++", "Quantitative Analysis", "Risk Management", "Trading Systems", "Market Data"],
                "category": "Financial Technology",
                "tags": ["fintech", "trading", "hft", "risk-management", "algorithms"],
                "compliance_requirements": ["SEC Regulations", "FINRA", "SOX", "MiFID II", "Basel III"],
                "stakeholders": ["Traders", "Risk Managers", "Compliance Officers", "Regulators"],
                "risks": ["Market volatility", "Regulatory changes", "System latency", "Cybersecurity"],
                "budget_breakdown": {
                    "development": 1200000,
                    "infrastructure": 500000,
                    "compliance": 300000,
                    "testing": 100000
                }
            },
            {
                "name": "AR/VR Corporate Training Ecosystem",
                "description": "Immersive training platform for enterprise skills development using mixed reality. Includes safety simulations, soft skills training, and collaborative virtual environments with learning analytics and progress tracking.",
                "type": "xr_training",
                "priority": "medium",
                "status": "planning",
                "estimated_hours": 3800,
                "duration_weeks": 24,
                "budget": 720000,
                "required_skills": ["Unity", "Unreal Engine", "ARKit", "ARCore", "3D Modeling", "Learning Analytics", "VR/AR UX"],
                "category": "Extended Reality",
                "tags": ["ar", "vr", "training", "enterprise", "simulation", "analytics"],
                "compliance_requirements": ["SCORM", "xAPI", "Accessibility Standards", "Corporate Training Standards"],
                "stakeholders": ["HR Teams", "Training Managers", "Employees", "Safety Officers"],
                "risks": ["VR motion sickness", "Hardware compatibility", "Content development costs"],
                "budget_breakdown": {
                    "development": 450000,
                    "content_creation": 180000,
                    "hardware": 60000,
                    "deployment": 30000
                }
            },
            {
                "name": "Quantum Computing Research Platform",
                "description": "Hybrid quantum-classical computing platform for materials science and drug discovery research. Provides quantum simulation capabilities, algorithm development tools, and secure access to quantum hardware resources.",
                "type": "quantum_research",
                "priority": "high",
                "status": "active",
                "estimated_hours": 4500,
                "duration_weeks": 30,
                "budget": 950000,
                "required_skills": ["Quantum Computing", "Qiskit", "Linear Algebra", "Quantum Algorithms", "Materials Science", "Drug Discovery"],
                "category": "Advanced Computing",
                "tags": ["quantum", "research", "materials", "drug-discovery", "simulation"],
                "compliance_requirements": ["Research Ethics", "Data Security", "Export Controls", "IP Protection"],
                "stakeholders": ["Research Scientists", "Universities", "Pharmaceutical Companies", "Government Agencies"],
                "risks": ["Quantum coherence limitations", "Hardware availability", "Talent scarcity"],
                "budget_breakdown": {
                    "development": 550000,
                    "quantum_hardware": 250000,
                    "research": 100000,
                    "security": 50000
                }
            },
            {
                "name": "Sustainable Energy Management System",
                "description": "Smart grid optimization platform integrating renewable energy sources, battery storage, and demand response. Provides real-time energy trading, carbon footprint tracking, and predictive maintenance for energy infrastructure.",
                "type": "energy_management",
                "priority": "high",
                "status": "active",
                "estimated_hours": 4200,
                "duration_weeks": 26,
                "budget": 780000,
                "required_skills": ["Smart Grid", "Energy Storage", "Battery Management", "SCADA", "Power Electronics", "Machine Learning"],
                "category": "Green Technology",
                "tags": ["energy", "sustainability", "smart-grid", "renewable", "carbon-tracking"],
                "compliance_requirements": ["Grid Codes", "Environmental Regulations", "Energy Market Rules"],
                "stakeholders": ["Utilities", "Energy Traders", "Environmental Agencies", "Consumers"],
                "risks": ["Grid stability", "Weather dependency", "Regulatory changes", "Technology obsolescence"],
                "budget_breakdown": {
                    "development": 420000,
                    "hardware": 240000,
                    "integration": 80000,
                    "certification": 40000
                }
            },
            {
                "name": "Next-Gen Gaming Platform with Social Features",
                "description": "Cloud-based gaming ecosystem supporting cross-platform multiplayer experiences with integrated social features, live streaming, tournaments, and user-generated content. Includes anti-cheat systems and community moderation.",
                "type": "gaming_social",
                "priority": "medium",
                "status": "completed",
                "estimated_hours": 5200,
                "duration_weeks": 34,
                "budget": 920000,
                "required_skills": ["Unreal Engine", "Unity", "Multiplayer Systems", "Cloud Gaming", "Live Streaming", "Community Management"],
                "category": "Gaming Entertainment",
                "tags": ["gaming", "multiplayer", "social", "streaming", "tournaments"],
                "compliance_requirements": ["Age Rating Systems", "Data Protection", "Content Moderation", "Anti-Cheat Policies"],
                "stakeholders": ["Gamers", "Content Creators", "Game Developers", "Esports Organizations"],
                "risks": ["Server capacity", "Toxicity management", "Competitive landscape", "Platform fees"],
                "budget_breakdown": {
                    "development": 520000,
                    "infrastructure": 280000,
                    "content": 80000,
                    "marketing": 40000
                }
            },
            {
                "name": "AI-Driven Cybersecurity Threat Detection",
                "description": "Enterprise security platform using machine learning for real-time threat detection, behavioral analytics, and automated incident response. Integrates with SIEM systems and provides zero-trust security architecture.",
                "type": "cybersecurity_ai",
                "priority": "critical",
                "status": "active",
                "estimated_hours": 3600,
                "duration_weeks": 20,
                "budget": 680000,
                "required_skills": ["Machine Learning", "Cybersecurity", "SIEM", "Threat Intelligence", "Network Security", "Incident Response"],
                "category": "Enterprise Security",
                "tags": ["cybersecurity", "ai", "threat-detection", "zero-trust", "siem"],
                "compliance_requirements": ["SOC 2", "ISO 27001", "NIST Framework", "GDPR"],
                "stakeholders": ["Security Teams", "IT Operations", "Compliance Officers", "Executive Leadership"],
                "risks": ["False positive rates", "Advanced persistent threats", "Skill shortage", "Regulatory compliance"],
                "budget_breakdown": {
                    "development": 400000,
                    "security_tools": 180000,
                    "training": 60000,
                    "compliance": 40000
                }
            },
            {
                "name": "Adaptive EdTech Learning Platform",
                "description": "AI-powered personalized learning ecosystem with adaptive content delivery, real-time assessment, and learning analytics. Supports multiple pedagogical approaches and integrates with existing educational infrastructure.",
                "type": "edtech_adaptive",
                "priority": "medium",
                "status": "planning",
                "estimated_hours": 3400,
                "duration_weeks": 18,
                "budget": 520000,
                "required_skills": ["Learning Analytics", "Adaptive Learning", "AI/ML", "Educational Psychology", "LMS Integration", "Accessibility"],
                "category": "Educational Technology",
                "tags": ["edtech", "adaptive-learning", "ai", "analytics", "personalization"],
                "compliance_requirements": ["COPPA", "FERPA", "Accessibility Standards", "Educational Standards"],
                "stakeholders": ["Educators", "Students", "Administrators", "Parents", "Education Boards"],
                "risks": ["Learning effectiveness validation", "Privacy concerns", "Teacher adoption", "Technology gaps"],
                "budget_breakdown": {
                    "development": 300000,
                    "content": 120000,
                    "research": 70000,
                    "accessibility": 30000
                }
            }
        ]

    async def connect_database(self):
        """Connect to the database"""
        try:
            await connect_to_mongo()
            self.db = await get_database()
            logger.info("✅ Connected to database")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            raise

    async def cleanup_existing_data(self):
        """Safely cleanup existing demo data while preserving the demo user and organization"""
        logger.info("🧹 Cleaning up existing demo data...")
        
        try:
            # Delete all data except the main demo user and organization
            collections_to_clean = [
                ("users", {"organization_id": self.org_id, "email": {"$ne": "demo@company.com"}}),
                ("teams", {"organization_id": self.org_id}),
                ("projects", {"organization_id": self.org_id}),
                ("tasks", {"project_id": {"$regex": "^proj-"}}),  # Tasks related to demo projects
                ("comments", {"organization_id": self.org_id}),
                ("files", {"organization_id": self.org_id}),
                ("notifications", {"organization_id": self.org_id})
            ]
            
            for collection_name, query in collections_to_clean:
                try:
                    result = await self.db[collection_name].delete_many(query)
                    logger.info(f"   Cleaned {result.deleted_count} items from {collection_name}")
                except Exception as e:
                    logger.warning(f"   Could not clean {collection_name}: {e}")
            
            # Reset organization stats
            await self.db.organizations.update_one(
                {"id": self.org_id},
                {
                    "$set": {
                        "member_count": 1,
                        "project_count": 0,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info("✅ Cleanup completed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cleanup failed: {e}")
            return False

    async def create_users(self):
        """Create demo users with proper error handling"""
        logger.info("👥 Creating demo users...")
        
        try:
            users_created = 0
            
            for profile in self.user_profiles:
                # Check if user already exists
                existing_user = await self.db.users.find_one({"email": profile["email"]})
                if existing_user:
                    logger.info(f"   User {profile['email']} already exists, skipping")
                    self.generated_data["users"].append(existing_user)
                    continue
                
                user_id = str(uuid.uuid4())
                user_data = {
                    "id": user_id,
                    "email": profile["email"],
                    "username": f"{profile['first_name'].lower()}_{profile['last_name'].lower()}",
                    "password_hash": hash_password("demo123456"),
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                    "phone": f"+1-555-{random.randint(1000, 9999)}",
                    "bio": profile.get("bio", f"Experienced {profile['department']} professional"),
                    "avatar_url": None,
                    "role": profile["role"],
                    "organization_id": self.org_id,
                    "is_active": True,
                    "status": "active",
                    "email_verified": True,
                    "email_verification_token": None,
                    "password_reset_token": None,
                    "password_reset_expires": None,
                    "last_login": datetime.utcnow() - timedelta(days=random.randint(1, 7)),
                    "login_count": random.randint(5, 50),
                    "timezone": "UTC",
                    "language": "en",
                    "theme": random.choice(["light", "dark"]),
                    "notifications_enabled": True,
                    "profile_completed": True,
                    "onboarding_completed": True,
                    "metadata": {
                        "department": profile["department"],
                        "skills": profile["skills"],
                        "hourly_rate": profile["hourly_rate"],
                        "experience_years": profile.get("experience_years", 5),
                        "availability": "full_time"
                    },
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 200)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.users.insert_one(user_data)
                self.generated_data["users"].append(user_data)
                users_created += 1
                
            logger.info(f"✅ Created {users_created} new users")
            return True
            
        except Exception as e:
            logger.error(f"❌ User creation failed: {e}")
            return False

    async def create_teams(self):
        """Create demo teams"""
        logger.info("👨‍👩‍👧‍👦 Creating demo teams...")
        
        try:
            team_configs = [
                {
                    "name": "AI Research Team",
                    "description": "Advanced AI/ML research and development team specializing in healthcare and quantum computing applications",
                    "type": "development",
                    "department": "AI Research",
                    "skills_focus": ["TensorFlow", "PyTorch", "Computer Vision", "NLP", "Quantum Computing", "Research"]
                },
                {
                    "name": "Blockchain Engineering Team",
                    "description": "Distributed systems and blockchain technology team focused on enterprise solutions",
                    "type": "development",
                    "department": "Blockchain Engineering",
                    "skills_focus": ["Solidity", "Ethereum", "Smart Contracts", "Web3", "Cryptography", "DeFi"]
                },
                {
                    "name": "Cybersecurity Team",
                    "description": "Information security and threat intelligence team protecting enterprise assets",
                    "type": "operations",
                    "department": "Security",
                    "skills_focus": ["Penetration Testing", "SIEM", "Threat Intelligence", "Malware Analysis", "Forensics"]
                },
                {
                    "name": "IoT Engineering Team",
                    "description": "Internet of Things and edge computing team developing smart city solutions",
                    "type": "development",
                    "department": "IoT Engineering",
                    "skills_focus": ["IoT Architecture", "Edge Computing", "MQTT", "LoRaWAN", "5G", "Real-time Analytics"]
                },
                {
                    "name": "Financial Technology Team",
                    "description": "High-frequency trading and financial systems development team",
                    "type": "development",
                    "department": "Financial Technology",
                    "skills_focus": ["HFT", "Risk Management", "Trading Systems", "Quantitative Analysis", "C++", "Python"]
                },
                {
                    "name": "Extended Reality Team",
                    "description": "AR/VR development team creating immersive training and gaming experiences",
                    "type": "development",
                    "department": "XR Development",
                    "skills_focus": ["Unity", "Unreal Engine", "ARKit", "ARCore", "3D Modeling", "VR/AR UX"]
                },
                {
                    "name": "Healthcare Technology Team",
                    "description": "Medical informatics and healthcare AI team ensuring clinical compliance",
                    "type": "development",
                    "department": "Healthcare Technology",
                    "skills_focus": ["DICOM", "HL7 FHIR", "Medical Imaging", "FDA Compliance", "Clinical Workflows"]
                },
                {
                    "name": "Energy Systems Team",
                    "description": "Smart grid and renewable energy technology development team",
                    "type": "development",
                    "department": "Energy Systems",
                    "skills_focus": ["Smart Grid", "Energy Storage", "Battery Management", "SCADA", "Power Electronics"]
                },
                {
                    "name": "Game Development Team",
                    "description": "Gaming platform and social features development team",
                    "type": "development",
                    "department": "Game Development",
                    "skills_focus": ["Unreal Engine", "Unity", "Multiplayer Systems", "Game Design", "Graphics Programming"]
                },
                {
                    "name": "Educational Technology Team",
                    "description": "Learning platforms and adaptive education technology development team",
                    "type": "development",
                    "department": "Educational Technology",
                    "skills_focus": ["Learning Analytics", "Adaptive Learning", "LMS", "Pedagogy", "UX Research"]
                },
                {
                    "name": "Core Engineering Team",
                    "description": "Full-stack development team handling platform infrastructure and integration",
                    "type": "development",
                    "department": "Engineering",
                    "skills_focus": ["React", "Node.js", "Microservices", "GraphQL", "Docker", "System Design"]
                },
                {
                    "name": "User Experience Team",
                    "description": "User research and design team ensuring accessibility and inclusive design",
                    "type": "design",
                    "department": "User Experience",
                    "skills_focus": ["User Research", "Design Thinking", "Prototyping", "Accessibility", "A/B Testing"]
                },
                {
                    "name": "Product Management Team",
                    "description": "Strategic product planning and stakeholder coordination team",
                    "type": "operations",
                    "department": "Product Management",
                    "skills_focus": ["Product Strategy", "User Research", "Analytics", "Roadmap Planning", "Stakeholder Management"]
                },
                {
                    "name": "Quality Assurance Team",
                    "description": "Comprehensive testing and quality assurance team ensuring system reliability",
                    "type": "operations",
                    "department": "Quality Assurance",
                    "skills_focus": ["Test Automation", "API Testing", "Performance Testing", "Security Testing", "CI/CD"]
                }
            ]
            
            for team_config in team_configs:
                # Find team members by department
                team_members = [user for user in self.generated_data["users"] 
                              if user.get("metadata", {}).get("department") == team_config["department"]]
                
                if not team_members:
                    logger.info(f"   No members found for {team_config['name']}, skipping")
                    continue
                
                # Find team lead
                team_lead = next((member for member in team_members if member["role"] in ["team_lead", "manager"]), None)
                
                # Create team member objects with proper structure
                members_list = []
                for member in team_members:
                    member_role = "lead" if member["role"] in ["team_lead", "manager"] else "regular"
                    if member["role"] == "member" and random.random() < 0.3:  # 30% chance to be senior
                        member_role = "senior"
                    
                    member_data = {
                        "user_id": member["id"],
                        "role": member_role,
                        "joined_at": datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                        "responsibilities": self._generate_responsibilities(team_config["type"], member_role),
                        "skills": member.get("metadata", {}).get("skills", [])[:5]  # Limit to 5 skills
                    }
                    members_list.append(member_data)
                
                team_id = str(uuid.uuid4())
                team_data = {
                    "id": team_id,
                    "name": team_config["name"],
                    "description": team_config["description"],
                    "type": team_config["type"],
                    "organization_id": self.org_id,
                    "lead_id": team_lead["id"] if team_lead else team_members[0]["id"],
                    "members": members_list,
                    "settings": {
                        "default_project_role": "member",
                        "auto_assign_tasks": random.choice([True, False]),
                        "require_approval": random.choice([True, False]),
                        "notification_settings": {
                            "email_notifications": True,
                            "slack_notifications": False,
                            "task_updates": True
                        }
                    },
                    "tags": team_config["skills_focus"][:3],  # Use first 3 skills as tags
                    "is_active": True,
                    "member_count": len(members_list),
                    "active_project_count": 0,  # Will be updated when projects are created
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(60, 200)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.teams.insert_one(team_data)
                self.generated_data["teams"].append(team_data)
                
            logger.info(f"✅ Created {len(self.generated_data['teams'])} teams")
            return True
            
        except Exception as e:
            logger.error(f"❌ Team creation failed: {e}")
            return False

    def _generate_responsibilities(self, team_type: str, role: str) -> List[str]:
        """Generate realistic responsibilities based on team type and role"""
        responsibilities_map = {
            "development": {
                "lead": ["Code reviews", "Architecture decisions", "Team mentoring", "Sprint planning"],
                "senior": ["Feature development", "Code reviews", "Junior mentoring", "Technical documentation"],
                "regular": ["Feature implementation", "Bug fixes", "Unit testing", "Code documentation"]
            },
            "design": {
                "lead": ["Design system oversight", "Design reviews", "Stakeholder meetings", "Team coordination"],
                "senior": ["UI/UX design", "User research", "Prototyping", "Design reviews"],
                "regular": ["Visual design", "Asset creation", "Design implementation", "User testing"]
            },
            "marketing": {
                "lead": ["Campaign strategy", "Team management", "Performance analysis", "Stakeholder reporting"],
                "senior": ["Campaign execution", "Content strategy", "SEO optimization", "Analytics"],
                "regular": ["Content creation", "Social media", "Campaign support", "Market research"]
            },
            "sales": {
                "lead": ["Sales strategy", "Team coaching", "Pipeline management", "Client relationships"],
                "senior": ["Account management", "Lead qualification", "Deal closing", "Team mentoring"],
                "regular": ["Lead generation", "Client calls", "CRM management", "Sales support"]
            },
            "operations": {
                "lead": ["Process optimization", "Team coordination", "Strategic planning", "Performance monitoring"],
                "senior": ["Project management", "Process improvement", "Quality assurance", "Team support"],
                "regular": ["Task coordination", "Documentation", "Quality checks", "Administrative support"]
            }
        }
        
        return responsibilities_map.get(team_type, {}).get(role, ["General responsibilities", "Team collaboration"])

    async def create_projects(self):
        """Create demo projects"""
        logger.info("📁 Creating demo projects...")
        
        try:
            if not self.generated_data["users"] or not self.generated_data["teams"]:
                logger.error("   No users or teams available for project assignment")
                return False
                
            for i, template in enumerate(self.project_templates):
                project_id = f"proj-{uuid.uuid4().hex[:12]}"
                
                # Assign project manager (team lead or manager)
                managers = [u for u in self.generated_data["users"] if u["role"] in ["admin", "manager", "team_lead"]]
                project_manager = random.choice(managers) if managers else self.generated_data["users"][0]
                
                # Assign team members based on required skills
                suitable_members = []
                for user in self.generated_data["users"]:
                    user_skills = user.get("metadata", {}).get("skills", [])
                    if any(skill in user_skills for skill in template["required_skills"]):
                        suitable_members.append(user["id"])
                
                # Ensure we have team members
                if not suitable_members:
                    suitable_members = [user["id"] for user in self.generated_data["users"][:5]]
                else:
                    # Fix: ensure valid range for randint by using max to handle edge case where exactly 3 members exist
                    max_members = min(8, len(suitable_members))
                    min_members = min(3, max_members)
                    suitable_members = suitable_members[:random.randint(min_members, max_members)]
                
                # Generate realistic project dates and progress
                created_date = datetime.utcnow() - timedelta(days=random.randint(30, 180))
                
                if template["status"] == "completed":
                    start_date = created_date + timedelta(days=random.randint(5, 15))
                    end_date = start_date + timedelta(weeks=template["duration_weeks"])
                    due_date = end_date
                    progress = 100
                elif template["status"] == "active":
                    start_date = created_date + timedelta(days=random.randint(5, 15))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(20, 80)
                elif template["status"] == "planning":
                    start_date = datetime.utcnow() + timedelta(weeks=random.randint(1, 4))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(0, 15)
                else:  # on_hold
                    start_date = created_date + timedelta(days=random.randint(5, 15))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(10, 40)
                
                # Generate milestones
                milestones = self._generate_project_milestones(template, start_date, due_date, progress)
                
                # Calculate budget information
                spent_percentage = progress / 100 * random.uniform(0.8, 1.2)
                budget_spent = template["budget"] * spent_percentage
                
                project_data = {
                    "id": project_id,
                    "name": template["name"],
                    "description": template["description"],
                    "status": template["status"],
                    "priority": template["priority"],
                    "visibility": "team",
                    "start_date": start_date if start_date else None,  # Keep as datetime
                    "due_date": due_date if due_date else None,  # Keep as datetime
                    "organization_id": self.org_id,
                    "owner_id": project_manager["id"],
                    "team_members": suitable_members,
                    "budget": {
                        "total_budget": template["budget"],
                        "spent_amount": budget_spent,
                        "currency": "USD"
                    },
                    "milestones": milestones,
                    "settings": {
                        "auto_assign_tasks": random.choice([True, False]),
                        "require_time_tracking": True,
                        "allow_guest_access": False,
                        "notification_settings": {
                            "milestone_completion": True,
                            "task_updates": True,
                            "deadline_reminders": True
                        }
                    },
                    "tags": template["tags"],
                    "category": template["category"],
                    "progress_percentage": progress,
                    "task_count": 0,  # Will be updated when tasks are created
                    "completed_task_count": 0,
                    "created_at": created_date,
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.projects.insert_one(project_data)
                self.generated_data["projects"].append(project_data)
                
            logger.info(f"✅ Created {len(self.generated_data['projects'])} projects")
            return True
            
        except Exception as e:
            logger.error(f"❌ Project creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _generate_project_milestones(self, template, start_date, due_date, progress):
        """Generate realistic project milestones with industry-specific phases"""
        milestone_templates = {
            "healthcare_ai": [
                "Regulatory Requirements Analysis & Clinical Research",
                "AI Model Architecture Design & Data Pipeline Setup",
                "Medical Image Processing Development & Algorithm Training",
                "Clinical Validation & FDA Pre-submission Preparation",
                "Integration Testing & DICOM/HL7 FHIR Compliance",
                "Clinical Trial Coordination & Performance Validation",
                "FDA 510k Submission & Regulatory Review Process",
                "Production Deployment & Clinical Workflow Integration"
            ],
            "iot_smartcity": [
                "City Infrastructure Assessment & Stakeholder Alignment",
                "IoT Network Architecture Design & Edge Computing Setup",
                "Sensor Deployment Strategy & Communication Protocols",
                "Real-time Analytics Platform Development",
                "Traffic Algorithm Implementation & Machine Learning Models",
                "Pilot Deployment & Performance Monitoring",
                "City-wide Rollout & Integration with Emergency Services",
                "Performance Optimization & Maintenance Framework"
            ],
            "blockchain_logistics": [
                "Supply Chain Analysis & Smart Contract Architecture",
                "Ethereum Network Setup & Development Environment",
                "Smart Contract Development & Security Auditing",
                "Web3 Integration & User Interface Development",
                "Supplier Onboarding & Integration Testing",
                "Blockchain Deployment & Gas Optimization",
                "End-to-end Traceability Testing & Compliance Verification",
                "Production Launch & Sustainability Metrics Integration"
            ],
            "fintech_trading": [
                "Market Analysis & Regulatory Compliance Framework",
                "Ultra-Low Latency Architecture Design & Risk Management System",
                "Algorithmic Trading Engine Development & Backtesting",
                "Market Data Integration & Real-time Processing Optimization",
                "Risk Controls Implementation & Compliance Monitoring",
                "Performance Testing & Latency Optimization",
                "Regulatory Approval & Stress Testing",
                "Production Deployment & Live Trading Validation"
            ],
            "xr_training": [
                "Learning Objectives Analysis & VR/AR Content Strategy",
                "3D Environment Design & Immersive Experience Development",
                "Unity/Unreal Engine Implementation & Physics Simulation",
                "Learning Analytics Integration & Progress Tracking",
                "Multi-platform Testing & Hardware Compatibility",
                "User Experience Testing & Motion Sickness Mitigation",
                "Enterprise Integration & LMS Connectivity",
                "Training Program Launch & Effectiveness Measurement"
            ],
            "quantum_research": [
                "Quantum Algorithm Research & Mathematical Framework",
                "Quantum Hardware Access & Development Environment Setup",
                "Hybrid Classical-Quantum Algorithm Development",
                "Materials Science & Drug Discovery Model Implementation",
                "Quantum Simulation Testing & Error Correction",
                "Research Collaboration Platform & Security Implementation",
                "Performance Benchmarking & Scientific Validation",
                "Research Publication & Platform Production Deployment"
            ],
            "energy_management": [
                "Grid Infrastructure Analysis & Renewable Energy Assessment",
                "Smart Grid Architecture Design & IoT Sensor Planning",
                "Energy Storage System Integration & Battery Management",
                "Real-time Analytics Platform & Predictive Modeling",
                "Demand Response System & Energy Trading Platform",
                "Grid Integration Testing & Stability Validation",
                "Carbon Footprint Tracking & Sustainability Reporting",
                "Production Deployment & Utility Integration"
            ],
            "gaming_social": [
                "Game Design Document & Social Features Architecture",
                "Cross-platform Engine Setup & Multiplayer Framework",
                "Core Gameplay Development & Social Integration",
                "Live Streaming Integration & Tournament System",
                "Anti-cheat Implementation & Community Moderation Tools",
                "Beta Testing & Performance Optimization",
                "Cloud Infrastructure Scaling & Launch Preparation",
                "Live Service Launch & Community Management"
            ],
            "cybersecurity_ai": [
                "Threat Landscape Analysis & AI Model Architecture",
                "Machine Learning Pipeline & Behavioral Analytics Development",
                "SIEM Integration & Threat Intelligence Platform",
                "Zero-trust Architecture Implementation & Network Monitoring",
                "Automated Incident Response & Orchestration",
                "Security Testing & Penetration Testing Validation",
                "SOC Integration & Analyst Training Program",
                "Production Deployment & Continuous Threat Monitoring"
            ],
            "edtech_adaptive": [
                "Educational Psychology Research & Learning Model Design",
                "AI-powered Adaptive Engine & Content Recommendation System",
                "Learning Analytics Platform & Progress Tracking",
                "Content Management System & Curriculum Integration",
                "Accessibility Compliance & Multi-device Optimization",
                "Educator Training Platform & Assessment Tools",
                "Pilot Program & Learning Effectiveness Validation",
                "Educational Institution Rollout & Performance Monitoring"
            ]
        }
        
        milestone_names = milestone_templates.get(template["type"], [
            "Project Initiation",
            "Design & Planning",
            "Implementation",
            "Testing & Review",
            "Completion & Delivery"
        ])
        
        milestones = []
        if start_date and due_date:
            total_duration = (due_date.date() - start_date.date()).days
            milestone_duration = total_duration // len(milestone_names)
            
            for i, name in enumerate(milestone_names):
                milestone_due = start_date + timedelta(days=(i + 1) * milestone_duration)
                completed = (i + 1) * 20 <= progress  # Each milestone is 20% of progress
                
                milestone = {
                    "id": f"milestone-{uuid.uuid4().hex[:8]}",
                    "title": name,
                    "description": f"Complete {name.lower()} for {template['name']}",
                    "due_date": milestone_due,  # Keep as datetime
                    "completed": completed,
                    "completed_at": milestone_due if completed else None
                }
                milestones.append(milestone)
        
        return milestones

    async def create_tasks(self):
        """Create demo tasks for projects"""
        logger.info("✅ Creating demo tasks...")
        
        try:
            if not self.generated_data["projects"] or not self.generated_data["users"]:
                logger.error("   No projects or users available for task creation")
                return False
                
            task_templates_by_type = {
                "healthcare_ai": [
                    "Conduct FDA pre-submission meetings and regulatory pathway planning",
                    "Design DICOM image processing pipeline with PACS integration",
                    "Implement computer vision models for radiology image analysis",
                    "Develop HL7 FHIR integration for clinical workflow compatibility",
                    "Create explainable AI features for diagnostic transparency",
                    "Build clinical decision support interface with radiologist feedback",
                    "Implement HIPAA-compliant data handling and audit logging",
                    "Conduct clinical validation studies with partner hospitals",
                    "Develop real-time inference engine with sub-second response times",
                    "Create comprehensive clinical documentation and user training materials",
                    "Implement FDA quality management system and risk analysis",
                    "Conduct cybersecurity assessments for medical device compliance"
                ],
                "iot_smartcity": [
                    "Deploy city-wide sensor network with 5G/LoRaWAN connectivity",
                    "Implement edge computing nodes for real-time traffic processing",
                    "Develop machine learning models for traffic pattern prediction",
                    "Create real-time dashboard for traffic management center operations",
                    "Integrate with emergency services dispatch and response systems",
                    "Implement citizen mobile app for traffic updates and reporting",
                    "Develop predictive maintenance system for IoT infrastructure",
                    "Create data privacy framework compliant with municipal regulations",
                    "Build weather-resistant hardware deployment and monitoring system",
                    "Implement cybersecurity measures for critical infrastructure protection",
                    "Develop energy optimization algorithms for sustainable operation",
                    "Create public reporting dashboard for transparency and engagement"
                ],
                "blockchain_logistics": [
                    "Design multi-party smart contract architecture for supply chain actors",
                    "Implement Ethereum smart contracts with gas optimization techniques",
                    "Develop Web3 integration layer for supplier onboarding and interaction",
                    "Create immutable product tracking from raw materials to consumer delivery",
                    "Build automated compliance reporting system with regulatory authorities",
                    "Implement sustainability metrics tracking and carbon footprint calculation",
                    "Develop mobile app for consumers to verify product authenticity and origin",
                    "Create smart contract auditing and security testing framework",
                    "Implement IPFS integration for decentralized document storage",
                    "Build integration APIs for existing ERP and WMS systems",
                    "Develop dispute resolution mechanism using oracle-based arbitration",
                    "Create comprehensive supply chain analytics and reporting dashboard"
                ],
                "fintech_trading": [
                    "Implement ultra-low latency trading engine with microsecond response times",
                    "Develop real-time market data processing and normalization system",
                    "Create quantitative risk management system with real-time monitoring",
                    "Build algorithmic trading strategies with backtesting framework",
                    "Implement regulatory compliance monitoring for SEC and FINRA requirements",
                    "Develop high-frequency trading infrastructure with co-location support",
                    "Create real-time portfolio management and position tracking system",
                    "Build automated market making and liquidity provision algorithms",
                    "Implement trade surveillance system for detecting market manipulation",
                    "Develop stress testing framework for risk scenario analysis",
                    "Create comprehensive audit trail and transaction reporting system",
                    "Build disaster recovery and business continuity infrastructure"
                ],
                "xr_training": [
                    "Design immersive VR training scenarios for safety procedures",
                    "Develop Unity-based multi-user collaborative virtual environments",
                    "Create adaptive learning pathways with performance-based progression",
                    "Implement haptic feedback integration for realistic skill training",
                    "Build AR overlay system for real-world equipment training assistance",
                    "Develop learning analytics engine for skill assessment and improvement",
                    "Create cross-platform deployment for VR headsets and AR devices",
                    "Implement motion sickness mitigation techniques and comfort settings",
                    "Build integration with existing LMS and HRIS systems",
                    "Develop comprehensive progress tracking and certification management",
                    "Create instructor dashboard for monitoring trainee performance",
                    "Implement accessibility features for diverse learning needs"
                ],
                "quantum_research": [
                    "Develop quantum algorithm implementations using Qiskit and Cirq",
                    "Create hybrid classical-quantum optimization routines",
                    "Implement quantum error correction and noise mitigation techniques",
                    "Build materials science simulation framework for drug discovery",
                    "Develop quantum machine learning algorithms for pattern recognition",
                    "Create secure quantum key distribution protocols",
                    "Implement quantum advantage benchmarking and validation framework",
                    "Build research collaboration platform with secure data sharing",
                    "Develop quantum circuit optimization and compilation tools",
                    "Create quantum simulation interface for chemistry and physics research",
                    "Implement quantum cryptography protocols for data security",
                    "Build performance monitoring system for quantum hardware utilization"
                ],
                "energy_management": [
                    "Implement smart grid integration with renewable energy forecasting",
                    "Develop battery management system with predictive maintenance",
                    "Create real-time energy trading platform with market optimization",
                    "Build demand response system for peak load management",
                    "Implement carbon footprint tracking and sustainability reporting",
                    "Develop predictive analytics for energy consumption optimization",
                    "Create grid stability monitoring with automated response systems",
                    "Build integration with existing SCADA and energy management systems",
                    "Implement dynamic pricing algorithms for energy market participation",
                    "Develop mobile app for consumer energy management and insights",
                    "Create regulatory compliance reporting for energy market authorities",
                    "Build cybersecurity framework for critical energy infrastructure"
                ],
                "gaming_social": [
                    "Develop cross-platform multiplayer networking with dedicated servers",
                    "Implement real-time voice chat and social interaction features",
                    "Create tournament system with automated bracket management",
                    "Build live streaming integration with popular platforms",
                    "Develop anti-cheat system using machine learning behavioral analysis",
                    "Implement user-generated content creation tools and moderation",
                    "Create in-game economy with virtual currency and marketplace",
                    "Build community features including guilds, messaging, and events",
                    "Develop mobile companion app for social features and game management",
                    "Implement comprehensive analytics for player behavior and engagement",
                    "Create content moderation system with AI-powered filtering",
                    "Build scalable cloud infrastructure for global player base"
                ],
                "cybersecurity_ai": [
                    "Develop machine learning models for anomaly detection and threat classification",
                    "Implement behavioral analytics engine for user and entity behavior monitoring",
                    "Create automated incident response and orchestration workflows",
                    "Build SIEM integration layer for centralized security event management",
                    "Develop threat intelligence platform with real-time feed integration",
                    "Implement zero-trust network architecture with micro-segmentation",
                    "Create security orchestration platform for automated threat response",
                    "Build comprehensive vulnerability management and patch automation system",
                    "Develop insider threat detection using advanced user behavior analytics",
                    "Implement dark web monitoring and threat intelligence gathering",
                    "Create security awareness training platform with phishing simulation",
                    "Build compliance reporting framework for SOC 2 and ISO 27001 requirements"
                ],
                "edtech_adaptive": [
                    "Develop AI-powered content recommendation engine based on learning styles",
                    "Create adaptive assessment system with real-time difficulty adjustment",
                    "Implement learning analytics dashboard for educators and administrators",
                    "Build multimodal content delivery system supporting various media types",
                    "Develop peer collaboration tools with virtual study groups and discussions",
                    "Create accessibility compliance framework for diverse learning needs",
                    "Implement gamification elements with achievement and progress tracking",
                    "Build integration with existing student information systems and LMS platforms",
                    "Develop parent/guardian portal for progress monitoring and communication",
                    "Create comprehensive curriculum mapping and standards alignment tools",
                    "Implement plagiarism detection and academic integrity monitoring",
                    "Build mobile learning app with offline content synchronization"
                ]
            }
            
            default_tasks = [
                "Project planning and scoping",
                "Requirements gathering",
                "Technical specification",
                "Design and mockups",
                "Development implementation",
                "Testing and quality assurance",
                "Documentation creation",
                "Stakeholder review",
                "Bug fixes and improvements",
                "Final deployment"
            ]
            
            task_counter = 1
            
            for project in self.generated_data["projects"]:
                # Get appropriate task templates
                project_type = project.get("type", "default")
                task_templates = task_templates_by_type.get(project_type, default_tasks)
                
                num_tasks = random.randint(8, 15)
                selected_tasks = random.sample(task_templates, min(num_tasks, len(task_templates)))
                
                # Add some additional tasks if needed
                while len(selected_tasks) < num_tasks:
                    selected_tasks.append(f"Additional task {len(selected_tasks) + 1} for {project['name']}")
                
                project_tasks = []
                completed_count = 0
                
                for i, task_title in enumerate(selected_tasks):
                    task_id = str(uuid.uuid4())
                    
                    # Determine task status based on project progress
                    task_progress_threshold = (i + 1) / len(selected_tasks) * 100
                    
                    if project["status"] == "completed":
                        status = random.choices(
                            ["completed", "cancelled"], 
                            weights=[0.95, 0.05]
                        )[0]
                    elif project["progress_percentage"] >= task_progress_threshold:
                        status = random.choices(
                            ["completed", "in_review"], 
                            weights=[0.8, 0.2]
                        )[0]
                    elif project["progress_percentage"] >= task_progress_threshold - 20:
                        status = random.choices(
                            ["in_progress", "in_review", "blocked"], 
                            weights=[0.6, 0.3, 0.1]
                        )[0]
                    else:
                        status = "todo"
                    
                    if status == "completed":
                        completed_count += 1
                    
                    # Assign task to project team member
                    assignee_id = random.choice(project["team_members"]) if project["team_members"] else None
                    
                    # Task dates
                    task_start_date = project.get("start_date")
                    if task_start_date:
                        task_start = task_start_date + timedelta(days=random.randint(0, 30))
                    else:
                        task_start = datetime.utcnow()
                    task_due = task_start + timedelta(days=random.randint(3, 21))
                    
                    # Time tracking
                    estimated_hours = random.randint(4, 40)
                    actual_hours = 0
                    if status == "completed":
                        actual_hours = estimated_hours * random.uniform(0.8, 1.3)
                    elif status == "in_progress":
                        actual_hours = estimated_hours * random.uniform(0.1, 0.7)
                    elif status == "in_review":
                        actual_hours = estimated_hours * random.uniform(0.8, 1.0)
                    
                    # Enhanced team member assignment - assign multiple team members
                    assigned_team_members = [assignee_id] if assignee_id else []
                    if len(project["team_members"]) > 1 and random.random() < 0.4:  # 40% chance for multiple assignees
                        additional_members = random.sample(
                            [m for m in project["team_members"] if m != assignee_id], 
                            min(2, len(project["team_members"]) - 1)
                        )
                        assigned_team_members.extend(additional_members)
                    
                    # Enhanced date calculation with proper sequencing
                    if project.get("start_date"):
                        # Calculate based on project timeline and task sequence
                        project_duration = (project.get("due_date", datetime.utcnow()) - project["start_date"]).days
                        task_sequence_offset = int(i / len(selected_tasks) * project_duration * 0.8)  # 80% of project duration for tasks
                        task_start = project["start_date"] + timedelta(days=task_sequence_offset)
                        task_duration = random.randint(2, 14)  # 2-14 days per task
                        task_due = task_start + timedelta(days=task_duration)
                        
                        # Adjust for weekends (simplified - just add days if due on weekend)
                        while task_due.weekday() >= 5:  # Saturday = 5, Sunday = 6
                            task_due += timedelta(days=1)
                    else:
                        task_start = datetime.utcnow()
                        task_due = task_start + timedelta(days=random.randint(3, 21))
                    
                    # More realistic progress and completion dates
                    if status == "completed":
                        actual_completion = task_due - timedelta(days=random.randint(0, 3))  # Completed slightly before or on due date
                        task_completed_at = actual_completion
                    elif status == "in_review":
                        task_completed_at = None
                    else:
                        task_completed_at = None
                    
                    task_data = {
                        "id": task_id,
                        "title": task_title,
                        "description": f"Complete {task_title.lower()} for the {project['name']} project. This task is part of the overall project deliverables and requires attention to detail and quality standards.",
                        "status": status,
                        "priority": random.choice(["low", "medium", "high", "critical"]),
                        "type": random.choice(["task", "feature", "bug", "improvement"]),
                        "project_id": project["id"],
                        "organization_id": self.org_id,
                        "assignee_id": assignee_id,
                        "assigned_team_members": assigned_team_members,  # Multiple team members
                        "reporter_id": project["owner_id"],
                        "parent_task_id": None,
                        "due_date": task_due,
                        "start_date": task_start,
                        "completed_at": task_completed_at,
                        "time_tracking": {
                            "estimated_hours": estimated_hours,
                            "actual_hours": actual_hours,
                            "logged_time": [],
                            "billable_hours": actual_hours * random.uniform(0.7, 1.0),  # Some hours may be non-billable
                            "overtime_hours": max(0, actual_hours - estimated_hours) if actual_hours > estimated_hours else 0
                        },
                        "dependencies": [],  # Will be populated after all tasks are created
                        "blocking_tasks": [],  # Tasks that this task is blocking
                        "subtasks": [],
                        "tags": random.sample(project["tags"], min(2, len(project["tags"]))),
                        "labels": [project["category"]],
                        "custom_fields": {
                            "complexity": random.choice(["low", "medium", "high", "very_high"]),
                            "business_value": random.choice(["low", "medium", "high", "critical"]),
                            "risk_level": random.choice(["low", "medium", "high"])
                        },
                        "progress_percentage": 100 if status == "completed" else (80 if status == "in_review" else (random.randint(20, 70) if status == "in_progress" else 0)),
                        "effort_points": random.randint(1, 13),  # Story points / effort estimation
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.tasks.insert_one(task_data)
                    project_tasks.append(task_data)
                    task_counter += 1
                
                # Update project with task counts
                await self.db.projects.update_one(
                    {"id": project["id"]},
                    {
                        "$set": {
                            "task_count": len(project_tasks),
                            "completed_task_count": completed_count,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                self.generated_data["tasks"].extend(project_tasks)
            
            # Create task dependencies after all tasks are created
            await self._create_task_dependencies()
                
            # Update organization project count
            await self.db.organizations.update_one(
                {"id": self.org_id},
                {
                    "$set": {
                        "project_count": len(self.generated_data["projects"]),
                        "member_count": len(self.generated_data["users"]) + 1,  # +1 for demo user
                        "updated_at": datetime.utcnow()
                    }
                }
            )
                
            logger.info(f"✅ Created {len(self.generated_data['tasks'])} tasks")
            return True
            
        except Exception as e:
            logger.error(f"❌ Task creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def _create_task_dependencies(self):
        """Create realistic task dependencies within projects"""
        logger.info("🔗 Creating task dependencies...")
        
        try:
            # Group tasks by project for dependency creation
            tasks_by_project = {}
            for task in self.generated_data["tasks"]:
                project_id = task["project_id"]
                if project_id not in tasks_by_project:
                    tasks_by_project[project_id] = []
                tasks_by_project[project_id].append(task)
            
            # Define dependency patterns for different project types
            dependency_patterns = {
                "healthcare_ai": [
                    # Dependencies based on typical healthcare AI project workflow
                    ("regulatory pathway planning", "clinical research"),
                    ("design dicom", "implement computer vision"),
                    ("computer vision", "clinical decision support"),
                    ("clinical validation", "fda quality management"),
                    ("cybersecurity assessments", "production deployment")
                ],
                "fintech_trading": [
                    ("market data processing", "trading engine"),
                    ("risk management system", "algorithmic trading strategies"),
                    ("trading engine", "portfolio management"),
                    ("compliance monitoring", "audit trail")
                ],
                "iot_smartcity": [
                    ("sensor network", "edge computing nodes"),
                    ("edge computing", "machine learning models"),
                    ("dashboard", "emergency services integration"),
                    ("cybersecurity measures", "public reporting dashboard")
                ]
            }
            
            for project_id, project_tasks in tasks_by_project.items():
                if len(project_tasks) < 3:  # Skip projects with too few tasks
                    continue
                
                # Sort tasks by creation order to create logical dependencies
                project_tasks.sort(key=lambda t: t["created_at"])
                
                dependencies_created = 0
                max_dependencies = min(len(project_tasks) - 1, 8)  # Limit dependencies per project
                
                for i, task in enumerate(project_tasks[1:], 1):  # Start from second task
                    # 60% chance to create a dependency
                    if random.random() < 0.6 and dependencies_created < max_dependencies:
                        # Create dependency on previous task or a task 1-2 positions back
                        possible_predecessors = project_tasks[max(0, i-3):i]
                        if possible_predecessors:
                            predecessor = random.choice(possible_predecessors)
                            
                            # Create dependency relationship
                            dependency = {
                                "id": str(uuid.uuid4()),
                                "predecessor_task_id": predecessor["id"],
                                "successor_task_id": task["id"],
                                "dependency_type": random.choice(["finish_to_start", "start_to_start", "finish_to_finish"]),
                                "lag_days": random.randint(0, 3),  # 0-3 days lag
                                "created_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow()
                            }
                            
                            # Update both tasks with dependency information
                            await self.db.tasks.update_one(
                                {"id": task["id"]},
                                {
                                    "$push": {"dependencies": predecessor["id"]},
                                    "$set": {"updated_at": datetime.utcnow()}
                                }
                            )
                            
                            await self.db.tasks.update_one(
                                {"id": predecessor["id"]},
                                {
                                    "$push": {"blocking_tasks": task["id"]},
                                    "$set": {"updated_at": datetime.utcnow()}
                                }
                            )
                            
                            # Update local data as well
                            task["dependencies"].append(predecessor["id"])
                            predecessor["blocking_tasks"].append(task["id"])
                            
                            dependencies_created += 1
                
                logger.info(f"   Created {dependencies_created} dependencies for project {project_id}")
            
            logger.info("✅ Task dependencies created successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create task dependencies: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def create_comments_and_files(self):
        """Create sample comments and files"""
        logger.info("💬 Creating comments and files...")
        
        try:
            comment_templates = [
                "Made good progress on this today. Should be ready for review soon.",
                "Encountered some technical challenges with the API integration. Working on alternative approach.",
                "Please review the latest changes when you have a chance. Added comprehensive error handling.",
                "Blocking issue resolved. Moving forward with the implementation as planned.",
                "Updated the requirements based on stakeholder feedback from yesterday's meeting.",
                "Code review completed. Made all the suggested improvements and optimizations.",
                "Testing phase complete. All unit tests passing and performance looks good.",
                "Documentation updated to reflect the latest changes and architectural decisions.",
                "Working on the final touches. Should be ready for production deployment.",
                "Great work on this feature! The implementation looks solid and well-tested."
            ]
            
            # Create comments on active tasks
            if self.generated_data["tasks"] and self.generated_data["users"]:
                active_tasks = [t for t in self.generated_data["tasks"] if t["status"] in ["in_progress", "in_review", "blocked"]]
                
                for i in range(min(40, len(active_tasks))):
                    task = random.choice(active_tasks)
                    commenter_id = task.get("assignee_id", random.choice(self.generated_data["users"])["id"])
                    
                    comment_data = {
                        "id": str(uuid.uuid4()),
                        "content": random.choice(comment_templates),
                        "entity_type": "task",
                        "entity_id": task["id"],
                        "author_id": commenter_id,
                        "organization_id": self.org_id,
                        "parent_id": None,
                        "is_internal": True,
                        "reactions": {},
                        "attachments": [],
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 15)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.comments.insert_one(comment_data)
                    self.generated_data["comments"].append(comment_data)
            
            # Create files attached to projects and tasks
            file_templates = [
                {"name": "Requirements Document", "type": "document", "size": 245760, "extension": "pdf"},
                {"name": "Design Mockups", "type": "image", "size": 1048576, "extension": "png"},
                {"name": "Technical Specification", "type": "document", "size": 524288, "extension": "docx"},
                {"name": "Test Results", "type": "document", "size": 102400, "extension": "xlsx"},
                {"name": "API Documentation", "type": "document", "size": 184320, "extension": "pdf"},
                {"name": "User Interface Screenshots", "type": "image", "size": 2097152, "extension": "jpg"},
                {"name": "Database Schema", "type": "code", "size": 51200, "extension": "sql"},
                {"name": "Project Presentation", "type": "document", "size": 3145728, "extension": "pptx"}
            ]
            
            # Attach files to projects
            for project in self.generated_data["projects"][:4]:  # Only first 4 projects
                for i in range(random.randint(2, 4)):
                    file_template = random.choice(file_templates)
                    uploader_id = random.choice(project["team_members"]) if project["team_members"] else project["owner_id"]
                    
                    file_data = {
                        "id": str(uuid.uuid4()),
                        "name": f"{file_template['name']} - {project['name'][:30]}",
                        "original_name": f"{file_template['name'].lower().replace(' ', '_')}.{file_template['extension']}",
                        "file_type": file_template["type"],
                        "file_size": file_template["size"],
                        "entity_type": "project",
                        "entity_id": project["id"],
                        "uploaded_by": uploader_id,
                        "organization_id": self.org_id,
                        "file_path": f"/uploads/{self.org_id}/projects/{project['id']}/file-{i+1:03d}.{file_template['extension']}",
                        "metadata": {
                            "description": f"Project file for {project['name']}",
                            "tags": project["tags"][:2]
                        },
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.files.insert_one(file_data)
                    self.generated_data["files"].append(file_data)
            
            # Attach files to some tasks
            for task in random.sample(self.generated_data["tasks"], min(15, len(self.generated_data["tasks"]))):
                file_template = random.choice(file_templates)
                uploader_id = task.get("assignee_id", random.choice(self.generated_data["users"])["id"])
                
                file_data = {
                    "id": str(uuid.uuid4()),
                    "name": f"{file_template['name']} - {task['title'][:30]}",
                    "original_name": f"{file_template['name'].lower().replace(' ', '_')}.{file_template['extension']}",
                    "file_type": file_template["type"],
                    "file_size": file_template["size"],
                    "entity_type": "task",
                    "entity_id": task["id"],
                    "uploaded_by": uploader_id,
                    "organization_id": self.org_id,
                    "file_path": f"/uploads/{self.org_id}/tasks/{task['id']}/attachment.{file_template['extension']}",
                    "metadata": {
                        "description": f"Task attachment for {task['title']}",
                        "tags": task["tags"]
                    },
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.files.insert_one(file_data)
                self.generated_data["files"].append(file_data)
            
            logger.info(f"✅ Created {len(self.generated_data['comments'])} comments and {len(self.generated_data['files'])} files")
            return True
            
        except Exception as e:
            logger.error(f"❌ Comments/files creation failed: {e}")
            return False

    async def create_notifications(self):
        """Create realistic notifications"""
        logger.info("🔔 Creating notifications...")
        
        try:
            notification_templates = [
                {"type": "task_assigned", "title": "New Task Assigned", "message": "You have been assigned to task: {task_title}"},
                {"type": "task_completed", "title": "Task Completed", "message": "Task '{task_title}' has been marked as completed"},
                {"type": "project_update", "title": "Project Update", "message": "Project '{project_name}' has been updated"},
                {"type": "deadline_reminder", "title": "Deadline Reminder", "message": "Task '{task_title}' is due tomorrow"},
                {"type": "comment_added", "title": "New Comment", "message": "New comment added to task: {task_title}"},
                {"type": "milestone_completed", "title": "Milestone Completed", "message": "Milestone '{milestone_title}' has been completed"},
                {"type": "team_update", "title": "Team Update", "message": "You have been added to team: {team_name}"},
                {"type": "file_uploaded", "title": "File Uploaded", "message": "New file uploaded to project: {project_name}"}
            ]
            
            # Create notifications for users
            for user in self.generated_data["users"]:
                num_notifications = random.randint(5, 15)
                
                for _ in range(num_notifications):
                    template = random.choice(notification_templates)
                    
                    # Generate context-specific message
                    if template["type"] in ["task_assigned", "task_completed", "deadline_reminder", "comment_added"]:
                        context_task = random.choice(self.generated_data["tasks"]) if self.generated_data["tasks"] else None
                        message = template["message"].format(task_title=context_task["title"] if context_task else "Sample Task")
                    elif template["type"] in ["project_update", "file_uploaded"]:
                        context_project = random.choice(self.generated_data["projects"]) if self.generated_data["projects"] else None
                        message = template["message"].format(project_name=context_project["name"] if context_project else "Sample Project")
                    elif template["type"] == "milestone_completed":
                        message = template["message"].format(milestone_title="Project Planning")
                    elif template["type"] == "team_update":
                        context_team = random.choice(self.generated_data["teams"]) if self.generated_data["teams"] else None
                        message = template["message"].format(team_name=context_team["name"] if context_team else "Sample Team")
                    else:
                        message = template["message"]
                    
                    notification_data = {
                        "id": str(uuid.uuid4()),
                        "title": template["title"],
                        "message": message,
                        "user_id": user["id"],
                        "organization_id": self.org_id,
                        "notification_type": template["type"],
                        "priority": random.choice(["low", "medium", "high"]),
                        "is_read": random.choice([True, False]),
                        "read_at": datetime.utcnow() - timedelta(days=random.randint(1, 7)) if random.choice([True, False]) else None,
                        "channels": ["in_app"],
                        "metadata": {
                            "source": "system",
                            "category": template["type"].split("_")[0]
                        },
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.notifications.insert_one(notification_data)
                    self.generated_data["notifications"].append(notification_data)
            
            logger.info(f"✅ Created {len(self.generated_data['notifications'])} notifications")
            return True
            
        except Exception as e:
            logger.error(f"❌ Notification creation failed: {e}")
            return False

    async def update_team_project_counts(self):
        """Update team active project counts"""
        logger.info("🔄 Updating team project counts...")
        
        try:
            for team in self.generated_data["teams"]:
                # Count active projects where team members are involved
                team_member_ids = [member["user_id"] for member in team["members"]]
                active_project_count = 0
                
                for project in self.generated_data["projects"]:
                    if project["status"] == "active":
                        # Check if any team member is involved in the project
                        if any(member_id in project["team_members"] for member_id in team_member_ids):
                            active_project_count += 1
                
                # Update team document
                await self.db.teams.update_one(
                    {"id": team["id"]},
                    {"$set": {"active_project_count": active_project_count, "updated_at": datetime.utcnow()}}
                )
            
            logger.info("✅ Team project counts updated")
            return True
            
        except Exception as e:
            logger.error(f"❌ Team project count update failed: {e}")
            return False

    async def generate_report(self):
        """Generate comprehensive report"""
        logger.info("📋 Generating completion report...")
        
        try:
            # Calculate comprehensive statistics
            active_projects = len([p for p in self.generated_data["projects"] if p["status"] == "active"])
            completed_projects = len([p for p in self.generated_data["projects"] if p["status"] == "completed"])
            active_tasks = len([t for t in self.generated_data["tasks"] if t["status"] in ["todo", "in_progress"]])
            completed_tasks = len([t for t in self.generated_data["tasks"] if t["status"] == "completed"])
            
            # Enhanced task statistics
            tasks_with_dependencies = len([t for t in self.generated_data["tasks"] if t.get("dependencies", [])])
            tasks_with_multiple_assignees = len([t for t in self.generated_data["tasks"] if len(t.get("assigned_team_members", [])) > 1])
            total_estimated_hours = sum(t.get("time_tracking", {}).get("estimated_hours", 0) for t in self.generated_data["tasks"])
            total_actual_hours = sum(t.get("time_tracking", {}).get("actual_hours", 0) for t in self.generated_data["tasks"])
            
            # Team and user statistics
            teams_by_type = {}
            for team in self.generated_data["teams"]:
                team_type = team.get("type", "unknown")
                teams_by_type[team_type] = teams_by_type.get(team_type, 0) + 1
            
            # Project category distribution
            projects_by_category = {}
            for project in self.generated_data["projects"]:
                category = project.get("category", "unknown")
                projects_by_category[category] = projects_by_category.get(category, 0) + 1
            
            report = {
                "generation_timestamp": datetime.utcnow().isoformat(),
                "status": "completed",
                "summary": {
                    "users_created": len(self.generated_data["users"]),
                    "teams_created": len(self.generated_data["teams"]),
                    "projects_created": len(self.generated_data["projects"]),
                    "tasks_created": len(self.generated_data["tasks"]),
                    "comments_created": len(self.generated_data["comments"]),
                    "files_created": len(self.generated_data["files"]),
                    "notifications_created": len(self.generated_data["notifications"]),
                    "total_data_points": sum(len(data) for data in self.generated_data.values())
                },
                "statistics": {
                    "active_projects": active_projects,
                    "completed_projects": completed_projects,
                    "active_tasks": active_tasks,
                    "completed_tasks": completed_tasks,
                    "team_members_total": len(self.generated_data["users"]) + 1,  # +1 for demo user
                    "tasks_with_dependencies": tasks_with_dependencies,
                    "tasks_with_multiple_assignees": tasks_with_multiple_assignees,
                    "total_estimated_hours": total_estimated_hours,
                    "total_actual_hours": total_actual_hours,
                    "teams_by_type": teams_by_type,
                    "projects_by_category": projects_by_category,
                    "dependency_completion_rate": f"{(tasks_with_dependencies / len(self.generated_data['tasks']) * 100):.1f}%" if self.generated_data["tasks"] else "0%",
                    "multi_assignee_rate": f"{(tasks_with_multiple_assignees / len(self.generated_data['tasks']) * 100):.1f}%" if self.generated_data["tasks"] else "0%"
                },
                "access_information": {
                    "demo_login": "demo@company.com / demo123456",
                    "frontend_url": "http://localhost:3000",
                    "backend_api": "http://localhost:8001",
                    "api_docs": "http://localhost:8001/docs"
                }
            }
            
            # Save report
            report_file = f"/app/comprehensive_demo_data_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            print("=" * 80)
            print("🎉 ENHANCED COMPREHENSIVE DEMO DATA GENERATION COMPLETED!")
            print("=" * 80)
            print(f"📊 Data Summary:")
            print(f"   👥 Users: {report['summary']['users_created']} + 1 (demo user)")
            print(f"   👨‍👩‍👧‍👦 Teams: {report['summary']['teams_created']} ({', '.join(f'{k}: {v}' for k, v in teams_by_type.items())})")
            print(f"   📁 Projects: {report['summary']['projects_created']} ({active_projects} active, {completed_projects} completed)")
            print(f"   ✅ Tasks: {report['summary']['tasks_created']} ({active_tasks} active, {completed_tasks} completed)")
            print(f"   💬 Comments: {report['summary']['comments_created']}")
            print(f"   📎 Files: {report['summary']['files_created']}")
            print(f"   🔔 Notifications: {report['summary']['notifications_created']}")
            print(f"   📋 Total Data Points: {report['summary']['total_data_points']}")
            print(f"\n🔗 Enhanced Task Features:")
            print(f"   📅 Tasks with Start/End dates: {report['summary']['tasks_created']} (100%)")
            print(f"   🔗 Tasks with Dependencies: {tasks_with_dependencies} ({report['statistics']['dependency_completion_rate']})")
            print(f"   👥 Tasks with Multiple Assignees: {tasks_with_multiple_assignees} ({report['statistics']['multi_assignee_rate']})")
            print(f"   ⏱️  Total Estimated Hours: {total_estimated_hours:,.0f}")
            print(f"   ⌛ Total Actual Hours: {total_actual_hours:,.0f}")
            print(f"\n📊 Project Categories: {', '.join(f'{k}: {v}' for k, v in projects_by_category.items())}")
            print(f"\n🔑 Access Information:")
            print(f"   Demo Login: {report['access_information']['demo_login']}")
            print(f"   Frontend: {report['access_information']['frontend_url']}")
            print(f"   Backend API: {report['access_information']['backend_api']}")
            print(f"\n💾 Report saved to: {report_file}")
            print("=" * 80)
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Report generation failed: {e}")
            return None

    async def run_complete_generation(self):
        """Run the complete demo data generation process"""
        logger.info("🚀 Starting Comprehensive Demo Data Generation...")
        print("=" * 80)
        
        start_time = datetime.utcnow()
        
        try:
            # Connect to database
            await self.connect_database()
            
            # Run generation steps
            steps = [
                ("Cleanup existing demo data", self.cleanup_existing_data),
                ("Create demo users", self.create_users),
                ("Create teams", self.create_teams),
                ("Create projects", self.create_projects),
                ("Create tasks", self.create_tasks),
                ("Create comments and files", self.create_comments_and_files),
                ("Create notifications", self.create_notifications),
                ("Generate analytics data", self.create_analytics_data),
                ("Update team project counts", self.update_team_project_counts)
            ]
            
            success_count = 0
            for step_name, step_function in steps:
                print(f"\n🔄 {step_name}...")
                if await step_function():
                    success_count += 1
                    print(f"✅ {step_name} completed successfully")
                else:
                    print(f"❌ {step_name} failed")
            
            # Generate report
            report = await self.generate_report()
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            print(f"\n⏱️ Generation completed in {duration:.2f} seconds")
            print(f"📈 Success rate: {success_count}/{len(steps)} steps completed")
            
            return report is not None
            
        except Exception as e:
            logger.error(f"❌ Demo data generation failed: {e}")
            return False

if __name__ == "__main__":
    generator = ComprehensiveDemoDataGenerator()
    success = asyncio.run(generator.run_complete_generation())
    sys.exit(0 if success else 1)