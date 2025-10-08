#!/usr/bin/env python3
"""
ENHANCED Comprehensive Demo Data Generator for Enterprise Portfolio Management System
Rebuilt from scratch with extensive data creation for the full application system
Includes advanced features: financial tracking, enhanced user profiles, 
complex project scenarios, detailed timelines, and comprehensive analytics data
"""

import asyncio
import sys
import os
import json
from datetime import datetime, timedelta, date
import random
import uuid
from typing import List, Dict, Any, Optional
import logging
import math
from decimal import Decimal

# Add the backend directory to the Python path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from auth.utils import hash_password

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedComprehensiveDemoDataGenerator:
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
            "notifications": [],
            "timeline_tasks": [],
            "custom_roles": [],
            "integrations": []
        }
        
        # Enhanced user profiles with much more comprehensive data
        self.enhanced_user_profiles = [
            # Executive Leadership Team
            {
                "email": "ceo.alexandra.sterling@company.com",
                "first_name": "Alexandra", "last_name": "Sterling",
                "role": "super_admin", "department": "Executive Leadership",
                "job_title": "Chief Executive Officer",
                "skills": ["Strategic Planning", "Executive Leadership", "Business Development", "M&A", "Board Relations"],
                "hourly_rate": 500, "experience_years": 20,
                "bio": "Visionary CEO with 20+ years experience scaling tech companies from startup to IPO",
                "certifications": ["Harvard Business School Executive Program", "Board Director Certification"],
                "clearance_level": "Top Secret",
                "education": "MBA Harvard Business School, BS Computer Science MIT",
                "languages": ["English", "French", "German"],
                "location": {"city": "New York", "country": "USA", "timezone": "US/Eastern"},
                "salary_range": {"min": 400000, "max": 800000},
                "performance_rating": 4.9,
                "management_level": "C-Level"
            },
            {
                "email": "cto.michael.techwise@company.com",
                "first_name": "Michael", "last_name": "TechWise",
                "role": "super_admin", "department": "Engineering",
                "job_title": "Chief Technology Officer",
                "skills": ["System Architecture", "Cloud Infrastructure", "Team Leadership", "Technical Strategy", "DevOps"],
                "hourly_rate": 400, "experience_years": 18,
                "bio": "Technical leader driving digital transformation and engineering excellence across the organization",
                "certifications": ["AWS Solutions Architect Professional", "Google Cloud Architect", "CISSP"],
                "clearance_level": "Top Secret",
                "education": "PhD Computer Science Stanford, MS Electrical Engineering CalTech",
                "languages": ["English", "Mandarin"],
                "location": {"city": "San Francisco", "country": "USA", "timezone": "US/Pacific"},
                "salary_range": {"min": 350000, "max": 600000},
                "performance_rating": 4.8,
                "management_level": "C-Level"
            },
            
            # Advanced AI/ML Research Team
            {
                "email": "dr.sarah.neuralnet@company.com",
                "first_name": "Dr. Sarah", "last_name": "NeuralNet",
                "role": "team_lead", "department": "AI Research",
                "job_title": "Director of AI Research",
                "skills": ["Deep Learning", "Computer Vision", "NLP", "MLOps", "Research", "TensorFlow", "PyTorch"],
                "hourly_rate": 180, "experience_years": 15,
                "bio": "AI Research Director with PhD in Machine Learning, pioneering medical AI applications and computer vision breakthroughs",
                "certifications": ["Google Cloud ML Engineer", "AWS ML Specialty", "NVIDIA Deep Learning Institute"],
                "clearance_level": "Top Secret",
                "education": "PhD Machine Learning MIT, MS Computer Science CMU",
                "languages": ["English", "Python", "R"],
                "location": {"city": "Boston", "country": "USA", "timezone": "US/Eastern"},
                "salary_range": {"min": 200000, "max": 350000},
                "performance_rating": 4.9,
                "management_level": "Director",
                "publications": 47,
                "patents": 12
            },
            {
                "email": "marcus.quantum.researcher@company.com",
                "first_name": "Marcus", "last_name": "Quantum",
                "role": "member", "department": "AI Research",
                "job_title": "Senior Quantum Computing Research Scientist",
                "skills": ["Quantum Computing", "Qiskit", "Quantum Algorithms", "Linear Algebra", "Python", "Physics"],
                "hourly_rate": 165, "experience_years": 12,
                "bio": "Quantum Computing Research Scientist advancing quantum machine learning and optimization algorithms",
                "certifications": ["IBM Qiskit Certified", "Microsoft Quantum Development Kit", "Google Cirq Certified"],
                "education": "PhD Quantum Physics MIT, MS Physics Oxford",
                "languages": ["English", "German", "Python"],
                "location": {"city": "Cambridge", "country": "USA", "timezone": "US/Eastern"},
                "salary_range": {"min": 180000, "max": 280000},
                "performance_rating": 4.7,
                "publications": 23,
                "patents": 5
            },
            {
                "email": "dr.emily.vision@company.com", 
                "first_name": "Dr. Emily", "last_name": "Vision",
                "role": "member", "department": "AI Research",
                "job_title": "Computer Vision Research Lead",
                "skills": ["Computer Vision", "Medical Imaging", "Deep Learning", "OpenCV", "CUDA", "Research"],
                "hourly_rate": 155, "experience_years": 10,
                "bio": "Computer Vision expert specializing in medical image analysis and autonomous systems perception",
                "certifications": ["NVIDIA Deep Learning Institute", "AWS ML Specialty"],
                "education": "PhD Computer Vision Stanford, MS Biomedical Engineering Johns Hopkins",
                "languages": ["English", "Korean"],
                "location": {"city": "Palo Alto", "country": "USA", "timezone": "US/Pacific"},
                "salary_range": {"min": 160000, "max": 250000},
                "performance_rating": 4.8,
                "publications": 31,
                "patents": 8
            },
            
            # Blockchain & Fintech Engineering Team
            {
                "email": "elena.blockchain.architect@company.com",
                "first_name": "Elena", "last_name": "BlockchainPro",
                "role": "team_lead", "department": "Blockchain Engineering", 
                "job_title": "Lead Blockchain Architect",
                "skills": ["Solidity", "Ethereum", "Smart Contracts", "Web3", "DeFi", "Security Auditing", "Cryptography"],
                "hourly_rate": 170, "experience_years": 8,
                "bio": "Senior Blockchain Architect designing enterprise DeFi solutions and smart contract security frameworks",
                "certifications": ["Certified Ethereum Developer", "Blockchain Security Professional", "ConsenSys Developer"],
                "education": "MS Cryptography Carnegie Mellon, BS Computer Science UC Berkeley",
                "languages": ["English", "Russian", "Solidity"],
                "location": {"city": "Austin", "country": "USA", "timezone": "US/Central"},
                "salary_range": {"min": 170000, "max": 280000},
                "performance_rating": 4.6,
                "smart_contracts_deployed": 47,
                "audits_completed": 23
            },
            {
                "email": "james.defi.security@company.com",
                "first_name": "James", "last_name": "DeFiSec",
                "role": "member", "department": "Blockchain Engineering",
                "job_title": "DeFi Security Engineer", 
                "skills": ["Smart Contract Security", "Penetration Testing", "Solidity", "Web3 Security", "Cryptography"],
                "hourly_rate": 145, "experience_years": 6,
                "bio": "DeFi Security specialist ensuring smart contract security and conducting comprehensive blockchain security audits",
                "certifications": ["Certified Blockchain Security Professional", "CEH", "OSCP"],
                "education": "MS Cybersecurity NYU, BS Mathematics MIT",
                "languages": ["English", "Spanish"],
                "location": {"city": "Miami", "country": "USA", "timezone": "US/Eastern"},
                "salary_range": {"min": 140000, "max": 220000},
                "performance_rating": 4.7,
                "vulnerabilities_found": 89,
                "security_reports": 34
            },
            
            # Advanced Cybersecurity Team
            {
                "email": "alex.cyberthreat.hunter@company.com",
                "first_name": "Alex", "last_name": "ThreatHunter",
                "role": "team_lead", "department": "Cybersecurity",
                "job_title": "Principal Cybersecurity Architect",
                "skills": ["Threat Hunting", "SIEM", "Security Architecture", "Incident Response", "Forensics", "AI Security"],
                "hourly_rate": 160, "experience_years": 14,
                "bio": "Elite cybersecurity professional protecting critical infrastructure with advanced threat detection and response capabilities",
                "certifications": ["CISSP", "CISSP", "GCFA", "GNFA", "SANS GIAC"],
                "clearance_level": "Top Secret/SCI",
                "education": "MS Cybersecurity George Washington University, BS Computer Science Virginia Tech",
                "languages": ["English", "Arabic"],
                "location": {"city": "Washington DC", "country": "USA", "timezone": "US/Eastern"},
                "salary_range": {"min": 165000, "max": 280000},
                "performance_rating": 4.9,
                "threats_mitigated": 156,
                "incident_responses": 78
            },
            
            # IoT & Edge Computing Team
            {
                "email": "raj.iot.solutions@company.com",
                "first_name": "Raj", "last_name": "IoTMaster",
                "role": "team_lead", "department": "IoT Engineering",
                "job_title": "IoT Solutions Architect",
                "skills": ["IoT Architecture", "Edge Computing", "5G", "MQTT", "LoRaWAN", "Industrial IoT", "Smart Cities"],
                "hourly_rate": 140, "experience_years": 11,
                "bio": "IoT architect designing smart city infrastructure and industrial automation solutions at massive scale",
                "certifications": ["AWS IoT Core Specialty", "Cisco IoT Professional", "Azure IoT Developer"],
                "education": "MS Electrical Engineering IIT Delhi, BS Electronics Engineering",
                "languages": ["English", "Hindi", "Telugu"],
                "location": {"city": "Seattle", "country": "USA", "timezone": "US/Pacific"},
                "salary_range": {"min": 145000, "max": 230000},
                "performance_rating": 4.8,
                "iot_deployments": 34,
                "sensors_managed": 12500
            },
            
            # Financial Technology Team
            {
                "email": "olivia.quantitative.trader@company.com", 
                "first_name": "Olivia", "last_name": "QuantTrader",
                "role": "team_lead", "department": "Financial Technology",
                "job_title": "Head of Quantitative Trading",
                "skills": ["HFT", "Quantitative Analysis", "Risk Management", "Derivatives", "C++", "Python", "Machine Learning"],
                "hourly_rate": 200, "experience_years": 13,
                "bio": "Quantitative trading expert developing ultra-low latency trading systems and risk management algorithms",
                "certifications": ["CFA", "FRM", "Series 7", "Series 63", "CME Trading Certification"],
                "compliance": ["SEC Registered", "FINRA", "CFTC"],
                "education": "PhD Financial Engineering Stanford, MS Mathematics Wharton",
                "languages": ["English", "Mandarin", "Japanese"],
                "location": {"city": "Chicago", "country": "USA", "timezone": "US/Central"},
                "salary_range": {"min": 220000, "max": 400000},
                "performance_rating": 4.9,
                "trading_algorithms": 23,
                "pnl_generated": 8500000
            },
            
            # Healthcare Technology Team
            {
                "email": "dr.emily.medtech@company.com",
                "first_name": "Dr. Emily", "last_name": "MedTech", 
                "role": "team_lead", "department": "Healthcare Technology",
                "job_title": "Chief Medical Informatics Officer",
                "skills": ["Medical Informatics", "DICOM", "HL7 FHIR", "FDA Compliance", "Clinical Research", "Radiology"],
                "hourly_rate": 185, "experience_years": 16,
                "bio": "Board-certified physician and medical informaticist leading healthcare AI development with deep clinical expertise",
                "certifications": ["Board Certified Radiologist", "HIMSS CPHIMS", "ABII", "FDA 510k Specialist"],
                "compliance": ["HIPAA Expert", "FDA 21 CFR Part 820", "ISO 13485"],
                "education": "MD Harvard Medical School, MS Biomedical Informatics Stanford", 
                "languages": ["English", "French"],
                "location": {"city": "Baltimore", "country": "USA", "timezone": "US/Eastern"},
                "salary_range": {"min": 200000, "max": 350000},
                "performance_rating": 4.8,
                "clinical_trials": 12,
                "fda_submissions": 7
            },
            
            # Extended Reality (XR) Team
            {
                "email": "alex.immersive.architect@company.com",
                "first_name": "Alex", "last_name": "XRArchitect",
                "role": "team_lead", "department": "Extended Reality",
                "job_title": "XR Technology Director",
                "skills": ["Unity", "Unreal Engine", "WebXR", "ARCore", "ARKit", "3D Graphics", "Spatial Computing"],
                "hourly_rate": 150, "experience_years": 9,
                "bio": "Extended Reality innovator creating next-generation immersive experiences and spatial computing solutions",
                "certifications": ["Unity Certified Expert", "Meta AR Developer", "Microsoft HoloLens Developer"],
                "education": "MS Computer Graphics CMU, BS Game Development Full Sail",
                "languages": ["English", "Japanese"],
                "location": {"city": "Los Angeles", "country": "USA", "timezone": "US/Pacific"},
                "salary_range": {"min": 155000, "max": 250000},
                "performance_rating": 4.7,
                "vr_experiences_built": 28,
                "ar_apps_published": 15
            },
            
            # Energy & Sustainability Engineering
            {
                "email": "peter.sustainable.energy@company.com",
                "first_name": "Peter", "last_name": "GreenTech",
                "role": "team_lead", "department": "Sustainable Energy",
                "job_title": "Renewable Energy Systems Lead",
                "skills": ["Smart Grid", "Energy Storage", "Solar Engineering", "Battery Management", "SCADA", "Sustainability"],
                "hourly_rate": 135, "experience_years": 12,
                "bio": "Renewable energy expert designing smart grid solutions and sustainable energy management systems",
                "certifications": ["Professional Engineer (PE)", "NABCEP Solar PV", "IEEE Power & Energy Society"],
                "education": "MS Electrical Engineering UC Berkeley, BS Sustainable Energy MIT",
                "languages": ["English", "Portuguese"],
                "location": {"city": "Denver", "country": "USA", "timezone": "US/Mountain"},
                "salary_range": {"min": 140000, "max": 220000},
                "performance_rating": 4.6,
                "renewable_projects": 19,
                "carbon_saved_tons": 45000
            },
            
            # Advanced Gaming & Entertainment
            {
                "email": "zoe.gamedev.architect@company.com",
                "first_name": "Zoe", "last_name": "GameArchitect",
                "role": "team_lead", "department": "Gaming Technology", 
                "job_title": "Principal Game Technology Architect",
                "skills": ["Unreal Engine", "Unity", "Multiplayer Systems", "Cloud Gaming", "Graphics Programming", "Game AI"],
                "hourly_rate": 145, "experience_years": 11,
                "bio": "Game technology architect with AAA studio experience building next-generation multiplayer gaming platforms",
                "certifications": ["Unity Certified Expert", "Unreal Authorized Instructor", "AWS GameTech Specialty"],
                "education": "MS Game Development USC, BS Computer Science DigiPen",
                "languages": ["English", "Korean"],
                "location": {"city": "Redmond", "country": "USA", "timezone": "US/Pacific"},
                "salary_range": {"min": 150000, "max": 240000},
                "performance_rating": 4.8,
                "games_shipped": 8,
                "players_reached": 25000000
            },
            
            # Educational Technology Innovation
            {
                "email": "miguel.edtech.innovation@company.com",
                "first_name": "Miguel", "last_name": "EduInnovator", 
                "role": "team_lead", "department": "Educational Technology",
                "job_title": "EdTech Innovation Director",
                "skills": ["Learning Analytics", "Adaptive Learning", "AI in Education", "LMS Architecture", "Pedagogy", "UX Research"],
                "hourly_rate": 125, "experience_years": 10,
                "bio": "Educational technology innovator transforming learning through AI-powered adaptive systems and learning analytics",
                "certifications": ["Google for Education Certified", "CPLP", "Learning Analytics Certificate"],
                "education": "PhD Educational Technology Arizona State, MS Learning Sciences Northwestern", 
                "languages": ["English", "Spanish", "Portuguese"],
                "location": {"city": "Phoenix", "country": "USA", "timezone": "US/Mountain"},
                "salary_range": {"min": 130000, "max": 200000},
                "performance_rating": 4.7,
                "learning_platforms": 12,
                "students_impacted": 150000
            },
            
            # Full-Stack Engineering Leadership
            {
                "email": "lisa.fullstack.principal@company.com",
                "first_name": "Lisa", "last_name": "CloudNative",
                "role": "team_lead", "department": "Platform Engineering",
                "job_title": "Principal Software Engineer",
                "skills": ["React", "Node.js", "Kubernetes", "Microservices", "GraphQL", "System Design", "DevOps"],
                "hourly_rate": 165, "experience_years": 14,
                "bio": "Principal Engineer architecting cloud-native platforms and mentoring engineering teams in modern development practices",
                "certifications": ["AWS Solutions Architect Professional", "Google Cloud Architect", "CKAD", "CKA"],
                "education": "MS Computer Science Stanford, BS Software Engineering RIT",
                "languages": ["English", "Mandarin"],
                "location": {"city": "San Francisco", "country": "USA", "timezone": "US/Pacific"},
                "salary_range": {"min": 170000, "max": 300000},
                "performance_rating": 4.9,
                "systems_architected": 15,
                "engineers_mentored": 34
            },
            
            # Product Management Excellence  
            {
                "email": "jennifer.product.strategy@company.com",
                "first_name": "Jennifer", "last_name": "ProductVision",
                "role": "manager", "department": "Product Management",
                "job_title": "VP of Product Strategy",
                "skills": ["Product Strategy", "Market Research", "Data Analytics", "User Research", "Roadmap Planning", "Stakeholder Management"],
                "hourly_rate": 155, "experience_years": 12,
                "bio": "Product visionary with track record of launching successful enterprise products from conception to market leadership",
                "certifications": ["Certified Scrum Product Owner", "Google Analytics Expert", "Product Management Certificate"],
                "education": "MBA Kellogg, BS Industrial Engineering Georgia Tech",
                "languages": ["English", "French"],
                "location": {"city": "Chicago", "country": "USA", "timezone": "US/Central"},
                "salary_range": {"min": 160000, "max": 280000},
                "performance_rating": 4.8,
                "products_launched": 7,
                "revenue_generated": 125000000
            },
            
            # Quality Assurance Engineering
            {
                "email": "robert.qa.automation@company.com",
                "first_name": "Robert", "last_name": "QualityFirst",
                "role": "team_lead", "department": "Quality Engineering",
                "job_title": "Senior QA Engineering Manager",
                "skills": ["Test Automation", "Selenium", "Cypress", "Performance Testing", "Security Testing", "CI/CD", "Quality Strategy"],
                "hourly_rate": 120, "experience_years": 11,
                "bio": "Quality engineering leader building comprehensive testing frameworks and automated quality assurance systems",
                "certifications": ["ISTQB Advanced", "Selenium Certified", "AWS DevOps Professional"],
                "education": "MS Software Engineering ASU, BS Computer Science UCSD",
                "languages": ["English", "Spanish"],
                "location": {"city": "San Diego", "country": "USA", "timezone": "US/Pacific"},
                "salary_range": {"min": 125000, "max": 190000},
                "performance_rating": 4.6,
                "test_frameworks_built": 8,
                "bugs_prevented": 2340
            },
            
            # UX Research & Design Leadership
            {
                "email": "maria.ux.research@company.com",
                "first_name": "Maria", "last_name": "UserCentric", 
                "role": "team_lead", "department": "User Experience Design",
                "job_title": "Head of UX Research",
                "skills": ["User Research", "Design Thinking", "Accessibility", "Prototyping", "A/B Testing", "Service Design"],
                "hourly_rate": 135, "experience_years": 9,
                "bio": "UX research leader championing human-centered design and accessibility in enterprise software experiences",
                "certifications": ["Google UX Design Certificate", "Nielsen Norman Group UX Certification", "WCAG Accessibility Expert"],
                "education": "MS Human-Computer Interaction CMU, BFA Design RISD",
                "languages": ["English", "Spanish", "Italian"],
                "location": {"city": "Portland", "country": "USA", "timezone": "US/Pacific"},
                "salary_range": {"min": 140000, "max": 210000},
                "performance_rating": 4.8,
                "user_studies_conducted": 67,
                "accessibility_improvements": 156
            }
        ]
        
        # Enhanced project templates with comprehensive financial and timeline data
        self.enhanced_project_templates = [
            {
                "name": "AI-Powered Medical Diagnosis Platform - FDA Pathway",
                "description": "Enterprise-grade FDA-compliant AI platform for automated medical image analysis supporting radiology, pathology, and dermatology workflows with real-time diagnostic assistance, explainable AI features, and seamless PACS/RIS integration for healthcare systems.",
                "type": "healthcare_ai_enterprise", 
                "priority": "critical",
                "status": "active",
                "category": "Healthcare AI & Medical Technology",
                "industry": "Healthcare",
                "estimated_hours": 6200,
                "duration_weeks": 36,
                "budget": {
                    "total_budget": 1250000,
                    "development": 650000,
                    "compliance_regulatory": 300000,
                    "clinical_trials": 200000,
                    "infrastructure_cloud": 80000,
                    "qa_testing": 20000
                },
                "financial_tracking": {
                    "billing_method": "time_and_materials",
                    "invoicing_frequency": "monthly", 
                    "payment_terms": "Net 30",
                    "currency": "USD",
                    "tax_rate": 0.0875,
                    "profit_margin": 0.25
                },
                "required_skills": ["TensorFlow", "PyTorch", "Medical Imaging", "DICOM", "HL7 FHIR", "FDA Compliance", "Computer Vision"],
                "tags": ["ai", "healthcare", "fda", "medical-imaging", "compliance", "enterprise"],
                "compliance_requirements": ["HIPAA", "FDA 510k", "ISO 13485", "IEC 62304", "ISO 27001"],
                "stakeholders": ["Radiologists", "Hospital IT Directors", "FDA Regulatory Team", "Clinical Research Coordinators"],
                "risks": [
                    {"description": "FDA approval delays", "probability": 0.4, "impact": "high", "mitigation": "Early FDA pre-submission meetings"},
                    {"description": "Clinical validation challenges", "probability": 0.3, "impact": "high", "mitigation": "Partner with leading medical centers"},
                    {"description": "DICOM integration complexity", "probability": 0.6, "impact": "medium", "mitigation": "Dedicated PACS integration team"}
                ],
                "success_metrics": [
                    {"metric": "FDA 510k Approval", "target": "Q4 2025", "measurement": "regulatory_milestone"},
                    {"metric": "Clinical Accuracy", "target": "> 95%", "measurement": "performance_metric"},  
                    {"metric": "Integration Speed", "target": "< 2 seconds", "measurement": "performance_metric"},
                    {"metric": "Hospital Adoptions", "target": "15 pilot sites", "measurement": "adoption_metric"}
                ],
                "technical_requirements": {
                    "cloud_infrastructure": "AWS/Azure multi-region",
                    "security_compliance": "SOC 2 Type II, HIPAA",
                    "scalability": "1M+ images/day processing",
                    "availability": "99.9% uptime SLA"
                }
            },
            
            {
                "name": "Smart City IoT Traffic Optimization - Metropolitan Scale",
                "description": "Large-scale IoT deployment for intelligent traffic optimization across metropolitan area with 10,000+ connected devices, real-time analytics, predictive modeling, machine learning optimization, and full integration with existing city infrastructure and emergency services.",
                "type": "iot_smart_city_enterprise",
                "priority": "high", 
                "status": "active",
                "category": "Smart Infrastructure & IoT",
                "industry": "Government & Smart Cities", 
                "estimated_hours": 8500,
                "duration_weeks": 48,
                "budget": {
                    "total_budget": 2400000,
                    "hardware_sensors": 1200000,
                    "software_development": 600000, 
                    "deployment_installation": 350000,
                    "project_management": 150000,
                    "contingency": 100000
                },
                "financial_tracking": {
                    "billing_method": "milestone_based",
                    "invoicing_frequency": "per_milestone",
                    "payment_terms": "Net 15",
                    "currency": "USD", 
                    "tax_rate": 0.08,
                    "profit_margin": 0.18
                },
                "required_skills": ["IoT Architecture", "Edge Computing", "5G Networks", "Real-time Analytics", "MQTT", "LoRaWAN", "Machine Learning"],
                "tags": ["iot", "smart-city", "traffic-optimization", "edge-computing", "real-time-analytics", "5g"],
                "compliance_requirements": ["FCC Regulations", "Municipal Data Privacy", "ADA Accessibility", "Environmental Standards"],
                "stakeholders": ["City Traffic Authority", "Municipal IT Department", "Emergency Services", "Public Transportation", "Citizens Advisory Board"],
                "risks": [
                    {"description": "Weather resilience challenges", "probability": 0.5, "impact": "medium", "mitigation": "Ruggedized hardware specifications"},
                    {"description": "Cybersecurity threats", "probability": 0.7, "impact": "high", "mitigation": "Zero-trust security architecture"},
                    {"description": "Public privacy concerns", "probability": 0.4, "impact": "medium", "mitigation": "Privacy-by-design implementation"}
                ],
                "success_metrics": [
                    {"metric": "Traffic Flow Improvement", "target": "25% reduction in congestion", "measurement": "performance_metric"},
                    {"metric": "Emergency Response Time", "target": "15% faster response", "measurement": "operational_metric"},
                    {"metric": "Sensor Network Uptime", "target": "99.5%", "measurement": "reliability_metric"},
                    {"metric": "Energy Efficiency", "target": "20% reduction in traffic light energy", "measurement": "sustainability_metric"}
                ]
            },
            
            {
                "name": "Enterprise Blockchain Supply Chain Transparency Platform",
                "description": "Immutable enterprise supply chain transparency platform using Ethereum smart contracts and IPFS storage, enabling end-to-end traceability from raw materials to consumer delivery with automated ESG compliance reporting, carbon footprint tracking, and real-time sustainability metrics for Fortune 500 companies.",
                "type": "blockchain_supply_chain_enterprise",
                "priority": "high",
                "status": "planning", 
                "category": "Blockchain & Supply Chain",
                "industry": "Manufacturing & Logistics",
                "estimated_hours": 5200,
                "duration_weeks": 32,
                "budget": {
                    "total_budget": 980000,
                    "smart_contract_development": 320000,
                    "integration_apis": 200000,
                    "frontend_development": 180000,
                    "blockchain_infrastructure": 150000,
                    "security_auditing": 80000,
                    "testing_qa": 50000
                },
                "financial_tracking": {
                    "billing_method": "fixed_price",
                    "invoicing_frequency": "monthly",
                    "payment_terms": "Net 45",
                    "currency": "USD",
                    "tax_rate": 0.095,
                    "profit_margin": 0.22
                },
                "required_skills": ["Solidity", "Ethereum", "Smart Contracts", "Web3", "IPFS", "Supply Chain Management", "ESG Reporting"],
                "tags": ["blockchain", "supply-chain", "transparency", "smart-contracts", "sustainability", "esg"],
                "compliance_requirements": ["SOX Compliance", "GDPR", "Import/Export Regulations", "ESG Reporting Standards", "ISO 14001"],
                "stakeholders": ["Supply Chain Directors", "Sustainability Officers", "Compliance Teams", "Manufacturing Partners", "Retail Customers"],
                "success_metrics": [
                    {"metric": "Supply Chain Visibility", "target": "100% end-to-end traceability", "measurement": "coverage_metric"},
                    {"metric": "ESG Compliance Automation", "target": "90% automated reporting", "measurement": "efficiency_metric"},
                    {"metric": "Carbon Footprint Reduction", "target": "15% supply chain emissions", "measurement": "sustainability_metric"},
                    {"metric": "Partner Onboarding", "target": "500+ suppliers integrated", "measurement": "adoption_metric"}
                ]
            },
            
            {
                "name": "Ultra-Low Latency Algorithmic Trading Platform - Multi-Asset",
                "description": "Enterprise algorithmic trading system supporting equities, derivatives, forex, and cryptocurrency markets with microsecond latency, advanced risk management, real-time compliance monitoring, sophisticated market data processing, and AI-powered trading strategies for institutional clients.",
                "type": "fintech_algorithmic_trading",
                "priority": "critical",
                "status": "active",
                "category": "Financial Technology & Trading",
                "industry": "Financial Services",
                "estimated_hours": 9200,
                "duration_weeks": 44,
                "budget": {
                    "total_budget": 3200000,
                    "core_trading_engine": 1200000,
                    "infrastructure_colocation": 800000,
                    "risk_management_system": 500000,
                    "compliance_reporting": 400000,
                    "market_data_feeds": 200000,
                    "testing_simulation": 100000
                },
                "financial_tracking": {
                    "billing_method": "time_and_materials_capped",
                    "invoicing_frequency": "bi_weekly", 
                    "payment_terms": "Net 7",
                    "currency": "USD",
                    "tax_rate": 0.0825,
                    "profit_margin": 0.35
                },
                "required_skills": ["C++", "Low-latency Programming", "Quantitative Analysis", "Risk Management", "Market Microstructure", "FPGA Programming"],
                "tags": ["fintech", "algorithmic-trading", "ultra-low-latency", "risk-management", "quantitative-finance"],
                "compliance_requirements": ["SEC Regulations", "FINRA Rules", "MiFID II", "CFTC Regulations", "Basel III", "SOX Compliance"],
                "stakeholders": ["Quantitative Traders", "Risk Management Team", "Compliance Officers", "Technology Operations", "Regulatory Affairs"],
                "success_metrics": [
                    {"metric": "Order Execution Latency", "target": "< 10 microseconds", "measurement": "performance_metric"},
                    {"metric": "Risk Limit Compliance", "target": "100% real-time monitoring", "measurement": "compliance_metric"},
                    {"metric": "Trading Volume Capacity", "target": "1M orders/second", "measurement": "throughput_metric"},
                    {"metric": "System Uptime", "target": "99.99%", "measurement": "reliability_metric"}
                ]
            },
            
            {
                "name": "Immersive AR/VR Enterprise Training Ecosystem - Multi-Industry",
                "description": "Comprehensive immersive training platform for enterprise skills development using mixed reality technologies, including safety simulations, soft skills training, technical certification programs, collaborative virtual environments with advanced haptic feedback, learning analytics, and AI-powered personalized training paths.",
                "type": "xr_enterprise_training",
                "priority": "medium",
                "status": "planning",
                "category": "Extended Reality & Training",
                "industry": "Corporate Training & Education",
                "estimated_hours": 6800,
                "duration_weeks": 40,
                "budget": {
                    "total_budget": 1450000,
                    "vr_ar_development": 600000,
                    "content_creation": 350000,
                    "hardware_procurement": 200000,
                    "ai_analytics_engine": 150000,
                    "platform_integration": 100000,
                    "deployment_support": 50000
                },
                "financial_tracking": {
                    "billing_method": "milestone_based",
                    "invoicing_frequency": "per_milestone",
                    "payment_terms": "Net 30",
                    "currency": "USD",
                    "tax_rate": 0.0875,
                    "profit_margin": 0.28
                },
                "required_skills": ["Unity", "Unreal Engine", "WebXR", "3D Modeling", "Learning Analytics", "UX Design", "AI/ML"],
                "tags": ["ar", "vr", "xr", "enterprise-training", "simulation", "learning-analytics", "haptic-feedback"],
                "compliance_requirements": ["SCORM", "xAPI", "WCAG Accessibility", "Corporate Training Standards", "GDPR"],
                "stakeholders": ["HR Learning Teams", "Training Managers", "Safety Officers", "IT Infrastructure", "Employee Representatives"],
                "success_metrics": [
                    {"metric": "Training Effectiveness", "target": "40% improvement in skill retention", "measurement": "learning_outcome"},
                    {"metric": "Training Time Reduction", "target": "50% faster completion", "measurement": "efficiency_metric"},
                    {"metric": "Employee Engagement", "target": "85% satisfaction score", "measurement": "engagement_metric"},
                    {"metric": "Safety Incident Reduction", "target": "25% fewer workplace incidents", "measurement": "safety_metric"}
                ]
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
        """Safely cleanup existing demo data while preserving core demo user and organization"""
        logger.info("🧹 Cleaning up existing demo data for enhanced regeneration...")
        
        try:
            # Delete all data except the main demo user and organization
            collections_to_clean = [
                ("users", {"organization_id": self.org_id, "email": {"$ne": "demo@company.com"}}),
                ("teams", {"organization_id": self.org_id}),
                ("projects", {"organization_id": self.org_id}),
                ("tasks", {"project_id": {"$regex": "^proj-"}}),
                ("comments", {"organization_id": self.org_id}),
                ("files", {"organization_id": self.org_id}), 
                ("notifications", {"organization_id": self.org_id}),
                ("timeline_tasks", {"organization_id": self.org_id}),
                ("custom_roles", {"organization_id": self.org_id})
            ]
            
            total_cleaned = 0
            for collection_name, query in collections_to_clean:
                try:
                    result = await self.db[collection_name].delete_many(query)
                    cleaned_count = result.deleted_count
                    total_cleaned += cleaned_count
                    logger.info(f"   Cleaned {cleaned_count} items from {collection_name}")
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
            
            logger.info(f"✅ Cleanup completed - removed {total_cleaned} records")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cleanup failed: {e}")
            return False

    async def create_enhanced_users(self):
        """Create enhanced demo users with comprehensive professional profiles"""
        logger.info("👥 Creating enhanced demo users with comprehensive profiles...")
        
        try:
            users_created = 0
            
            for profile in self.enhanced_user_profiles:
                # Check if user already exists
                existing_user = await self.db.users.find_one({"email": profile["email"]})
                if existing_user:
                    logger.info(f"   User {profile['email']} already exists, skipping")
                    self.generated_data["users"].append(existing_user)
                    continue
                
                user_id = str(uuid.uuid4())
                
                # Create comprehensive user profile
                user_data = {
                    "id": user_id,
                    "email": profile["email"],
                    "username": f"{profile['first_name'].lower()}.{profile['last_name'].lower()}",
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
                    "last_login": datetime.utcnow() - timedelta(days=random.randint(0, 7)),
                    "login_count": random.randint(10, 150),
                    "timezone": profile.get("location", {}).get("timezone", "UTC"),
                    "language": "en",
                    "theme": random.choice(["light", "dark"]),
                    "notifications_enabled": True,
                    "profile_completed": True,
                    "onboarding_completed": True,
                    
                    # Enhanced professional metadata
                    "professional_info": {
                        "job_title": profile.get("job_title", f"{profile['department']} Specialist"),
                        "department": profile["department"],
                        "skills": profile["skills"],
                        "certifications": profile.get("certifications", []),
                        "education": profile.get("education", ""),
                        "languages": profile.get("languages", ["English"]),
                        "experience_years": profile.get("experience_years", 5),
                        "hourly_rate": profile["hourly_rate"],
                        "salary_range": profile.get("salary_range", {"min": 80000, "max": 120000}),
                        "performance_rating": profile.get("performance_rating", round(random.uniform(3.5, 4.9), 1)),
                        "management_level": profile.get("management_level", "Individual Contributor"),
                        "clearance_level": profile.get("clearance_level"),
                        "compliance": profile.get("compliance", [])
                    },
                    
                    # Location and contact info
                    "location_info": profile.get("location", {
                        "city": "Remote",
                        "country": "USA", 
                        "timezone": "UTC"
                    }),
                    
                    # Professional achievements
                    "achievements": {
                        "publications": profile.get("publications", 0),
                        "patents": profile.get("patents", 0),
                        "projects_completed": random.randint(5, 50),
                        "team_members_managed": random.randint(0, 15) if profile["role"] in ["team_lead", "manager"] else 0,
                        "revenue_generated": profile.get("revenue_generated", 0),
                        "cost_savings": random.randint(50000, 500000) if profile["role"] in ["team_lead", "manager"] else 0
                    },
                    
                    # Working preferences
                    "work_preferences": {
                        "availability": "full_time",
                        "remote_work": random.choice([True, False]),
                        "travel_willingness": random.randint(0, 50),  # percentage
                        "preferred_communication": random.choice(["email", "slack", "teams", "phone"]),
                        "working_hours": {
                            "start": "09:00",
                            "end": "17:00",
                            "flexible": random.choice([True, False])
                        }
                    },
                    
                    # Enhanced metadata
                    "metadata": {
                        "hire_date": datetime.utcnow() - timedelta(days=random.randint(90, 1800)),
                        "employee_id": f"EMP{random.randint(1000, 9999)}",
                        "cost_center": profile["department"],
                        "manager_id": None,  # Will be set later based on team structure
                        "security_clearance": profile.get("clearance_level"),
                        "emergency_contact": {
                            "name": f"{random.choice(['John', 'Jane', 'Alex', 'Chris'])} {random.choice(['Smith', 'Johnson', 'Williams'])}",
                            "relationship": random.choice(["Spouse", "Parent", "Sibling"]),
                            "phone": f"+1-555-{random.randint(1000, 9999)}"
                        }
                    },
                    
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 500)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.users.insert_one(user_data)
                self.generated_data["users"].append(user_data)
                users_created += 1
                
            logger.info(f"✅ Created {users_created} enhanced professional user profiles")
            return True
            
        except Exception as e:
            logger.error(f"❌ Enhanced user creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def create_enhanced_teams(self):
        """Create enhanced teams with comprehensive management structure"""
        logger.info("👨‍👩‍👧‍👦 Creating enhanced teams with comprehensive organizational structure...")
        
        try:
            team_configs = [
                {
                    "name": "Executive Leadership Team",
                    "description": "C-level executives providing strategic direction and organizational leadership across all business units and technology initiatives",
                    "type": "operations",
                    "department": "Executive Leadership",
                    "skills_focus": ["Strategic Planning", "Executive Leadership", "Business Development", "Stakeholder Management"],
                    "budget_allocation": 2000000,
                    "performance_targets": {"revenue_growth": 0.25, "market_expansion": 3, "team_satisfaction": 0.9}
                },
                {
                    "name": "AI Research & Development Team",
                    "description": "Advanced AI/ML research and development team specializing in healthcare applications, quantum computing, and next-generation artificial intelligence solutions",
                    "type": "development",
                    "department": "AI Research", 
                    "skills_focus": ["Deep Learning", "Computer Vision", "NLP", "Quantum Computing", "MLOps", "Research"],
                    "budget_allocation": 1500000,
                    "performance_targets": {"research_papers": 12, "patent_applications": 8, "model_accuracy": 0.95}
                },
                {
                    "name": "Blockchain & FinTech Engineering",
                    "description": "Distributed systems and blockchain technology team focused on enterprise financial solutions, DeFi protocols, and secure trading platforms",
                    "type": "development",
                    "department": "Blockchain Engineering",
                    "skills_focus": ["Solidity", "Smart Contracts", "DeFi", "Cryptography", "Financial Systems"],
                    "budget_allocation": 1200000,
                    "performance_targets": {"smart_contracts_deployed": 25, "transaction_volume": 10000000, "security_audits": 15}
                },
                {
                    "name": "Advanced Cybersecurity Operations",
                    "description": "Elite cybersecurity team protecting critical infrastructure with advanced threat detection, incident response, and security architecture capabilities",
                    "type": "operations",
                    "department": "Cybersecurity",
                    "skills_focus": ["Threat Hunting", "SIEM", "Incident Response", "Security Architecture", "AI Security"],
                    "budget_allocation": 1800000,
                    "performance_targets": {"threats_detected": 500, "incident_response_time": 15, "security_score": 98}
                },
                {
                    "name": "IoT & Smart Cities Engineering", 
                    "description": "Internet of Things and edge computing specialists developing smart city solutions, industrial automation, and large-scale sensor networks",
                    "type": "development",
                    "department": "IoT Engineering",
                    "skills_focus": ["IoT Architecture", "Edge Computing", "5G", "Smart Cities", "Industrial IoT"],
                    "budget_allocation": 1000000,
                    "performance_targets": {"sensor_deployments": 10000, "uptime_percentage": 0.995, "energy_efficiency": 0.2}
                },
                {
                    "name": "Quantitative Trading Technology",
                    "description": "High-frequency trading and quantitative finance team developing ultra-low latency trading systems and sophisticated risk management algorithms",
                    "type": "development", 
                    "department": "Financial Technology",
                    "skills_focus": ["HFT", "Quantitative Analysis", "Risk Management", "Low-latency Systems"],
                    "budget_allocation": 2500000,
                    "performance_targets": {"latency_microseconds": 10, "trading_volume": 1000000000, "risk_compliance": 1.0}
                },
                {
                    "name": "Extended Reality Innovation Lab",
                    "description": "AR/VR development team creating immersive training experiences, spatial computing solutions, and next-generation user interfaces",
                    "type": "development",
                    "department": "Extended Reality", 
                    "skills_focus": ["Unity", "Unreal Engine", "WebXR", "Spatial Computing", "3D Graphics"],
                    "budget_allocation": 800000,
                    "performance_targets": {"xr_experiences": 15, "user_engagement": 0.85, "training_effectiveness": 0.4}
                },
                {
                    "name": "Healthcare Technology & Medical AI",
                    "description": "Medical informatics and healthcare AI team ensuring clinical compliance while developing cutting-edge medical technology solutions",
                    "type": "development",
                    "department": "Healthcare Technology",
                    "skills_focus": ["Medical Informatics", "DICOM", "HL7 FHIR", "FDA Compliance", "Clinical AI"],
                    "budget_allocation": 1800000,
                    "performance_targets": {"fda_submissions": 3, "clinical_trials": 5, "accuracy_improvement": 0.15}
                },
                {
                    "name": "Sustainable Energy Systems",
                    "description": "Renewable energy and smart grid technology team developing sustainable energy management and optimization systems",
                    "type": "development",
                    "department": "Sustainable Energy",
                    "skills_focus": ["Smart Grid", "Energy Storage", "Sustainability", "Power Systems"],
                    "budget_allocation": 900000,
                    "performance_targets": {"carbon_reduction": 0.25, "energy_efficiency": 0.3, "grid_stability": 0.999}
                },
                {
                    "name": "Gaming Technology & Entertainment",
                    "description": "Advanced gaming platform and social features development team building next-generation entertainment experiences",
                    "type": "development",
                    "department": "Gaming Technology",
                    "skills_focus": ["Game Engines", "Multiplayer Systems", "Cloud Gaming", "Game AI"],
                    "budget_allocation": 1100000, 
                    "performance_targets": {"games_released": 4, "player_retention": 0.75, "revenue_per_user": 50}
                },
                {
                    "name": "Educational Technology Innovation",
                    "description": "Learning platforms and adaptive education technology team transforming education through AI-powered personalized learning systems",
                    "type": "development",
                    "department": "Educational Technology",
                    "skills_focus": ["Learning Analytics", "Adaptive Learning", "AI in Education", "Pedagogy"],
                    "budget_allocation": 700000,
                    "performance_targets": {"learning_improvement": 0.3, "student_engagement": 0.8, "platform_scalability": 100000}
                },
                {
                    "name": "Platform Engineering & Infrastructure",
                    "description": "Cloud-native platform engineering team handling infrastructure, DevOps, and scalable system architecture for enterprise applications",
                    "type": "development", 
                    "department": "Platform Engineering",
                    "skills_focus": ["Kubernetes", "Microservices", "DevOps", "System Design", "Cloud Native"],
                    "budget_allocation": 1300000,
                    "performance_targets": {"system_uptime": 0.9999, "deployment_frequency": 50, "incident_recovery": 30}
                },
                {
                    "name": "Product Strategy & Management",
                    "description": "Strategic product planning and stakeholder coordination team driving product vision and go-to-market strategies",
                    "type": "operations",
                    "department": "Product Management", 
                    "skills_focus": ["Product Strategy", "Market Analysis", "Roadmap Planning", "Stakeholder Management"],
                    "budget_allocation": 600000,
                    "performance_targets": {"product_launches": 8, "market_share": 0.15, "customer_satisfaction": 0.9}
                },
                {
                    "name": "Quality Engineering & Assurance",
                    "description": "Comprehensive testing and quality assurance team ensuring system reliability through automated testing and quality processes",
                    "type": "operations",
                    "department": "Quality Engineering",
                    "skills_focus": ["Test Automation", "Quality Assurance", "Performance Testing", "CI/CD"],
                    "budget_allocation": 500000,
                    "performance_targets": {"test_coverage": 0.95, "bug_detection_rate": 0.98, "release_quality": 0.99}
                },
                {
                    "name": "User Experience & Design",
                    "description": "User research and design team ensuring accessibility and human-centered design principles across all product experiences",
                    "type": "design",
                    "department": "User Experience Design", 
                    "skills_focus": ["User Research", "Design Thinking", "Accessibility", "Service Design"],
                    "budget_allocation": 450000,
                    "performance_targets": {"user_satisfaction": 0.9, "accessibility_compliance": 1.0, "design_iterations": 25}
                }
            ]
            
            for team_config in team_configs:
                # Find team members by department
                team_members = [user for user in self.generated_data["users"] 
                              if user.get("professional_info", {}).get("department") == team_config["department"]]
                
                if not team_members:
                    logger.info(f"   No members found for {team_config['name']}, skipping")
                    continue
                
                # Find team lead
                team_lead = next((member for member in team_members if member["role"] in ["team_lead", "manager", "super_admin"]), None)
                
                # Create enhanced team member objects 
                members_list = []
                for member in team_members:
                    member_role = "lead" if member["role"] in ["team_lead", "manager", "super_admin"] else "regular"
                    if member["role"] == "member" and random.random() < 0.4:  # 40% chance to be senior
                        member_role = "senior"
                    
                    member_data = {
                        "user_id": member["id"],
                        "role": member_role,
                        "joined_at": datetime.utcnow() - timedelta(days=random.randint(30, 400)),
                        "responsibilities": self._generate_enhanced_responsibilities(team_config["type"], member_role, team_config["department"]),
                        "skills": member.get("professional_info", {}).get("skills", [])[:6],
                        "utilization_percentage": round(random.uniform(0.7, 1.0), 2),
                        "performance_rating": round(random.uniform(3.8, 5.0), 1),
                        "billable_hours_target": random.randint(1600, 2000),
                        "current_projects": random.randint(1, 4)
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
                    
                    # Enhanced team management
                    "team_management": {
                        "budget_allocation": team_config["budget_allocation"],
                        "budget_spent": round(team_config["budget_allocation"] * random.uniform(0.3, 0.8), 2),
                        "performance_targets": team_config["performance_targets"],
                        "current_performance": {
                            metric: target * random.uniform(0.7, 1.2) if isinstance(target, (int, float)) else target
                            for metric, target in team_config["performance_targets"].items()
                        }
                    },
                    
                    # Team capacity and workload
                    "capacity_management": {
                        "total_capacity_hours": len(members_list) * 40 * 52,  # 40 hours/week * 52 weeks
                        "current_utilization": round(random.uniform(0.75, 0.95), 2),
                        "billable_hours_target": sum(member.get("billable_hours_target", 1800) for member in members_list),
                        "non_billable_allocation": round(random.uniform(0.15, 0.25), 2)
                    },
                    
                    # Team settings and preferences
                    "settings": {
                        "default_project_role": "member",
                        "auto_assign_tasks": random.choice([True, False]),
                        "require_approval": random.choice([True, False]),
                        "time_tracking_required": True,
                        "notification_settings": {
                            "email_notifications": True,
                            "slack_notifications": True,
                            "task_updates": True,
                            "milestone_alerts": True,
                            "budget_warnings": True
                        },
                        "meeting_cadence": {
                            "daily_standup": True,
                            "weekly_team_sync": True, 
                            "monthly_retrospective": True,
                            "quarterly_planning": True
                        }
                    },
                    
                    "tags": team_config["skills_focus"][:4],
                    "is_active": True,
                    "member_count": len(members_list),
                    "active_project_count": random.randint(2, 6),
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(60, 300)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.teams.insert_one(team_data)
                self.generated_data["teams"].append(team_data)
                
            logger.info(f"✅ Created {len(self.generated_data['teams'])} enhanced teams with comprehensive management data")
            return True
            
        except Exception as e:
            logger.error(f"❌ Enhanced team creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _generate_enhanced_responsibilities(self, team_type: str, role: str, department: str) -> List[str]:
        """Generate enhanced, department-specific responsibilities"""
        
        responsibilities_map = {
            "Executive Leadership": {
                "lead": ["Strategic planning and vision setting", "Board relations and investor communications", "Organizational leadership and culture", "M&A strategy and execution"],
                "senior": ["Strategic initiative leadership", "Cross-functional coordination", "Executive reporting", "Stakeholder management"],
                "regular": ["Strategic analysis and research", "Executive support", "Board meeting preparation", "Strategic communications"]
            },
            "AI Research": {
                "lead": ["Research strategy and direction", "AI ethics and governance", "Publication and patent oversight", "Industry collaboration"],
                "senior": ["Research project leadership", "Algorithm development", "Model architecture design", "Research mentoring"],
                "regular": ["Model training and optimization", "Data pipeline development", "Research experimentation", "Technical documentation"]
            },
            "Blockchain Engineering": {
                "lead": ["Blockchain architecture strategy", "Smart contract governance", "DeFi protocol design", "Security framework leadership"],
                "senior": ["Smart contract development", "Protocol implementation", "Security auditing", "Integration architecture"],
                "regular": ["Smart contract coding", "Testing and deployment", "Integration development", "Documentation"]
            },
            "Cybersecurity": {
                "lead": ["Security strategy and architecture", "Incident response coordination", "Risk assessment leadership", "Compliance oversight"],
                "senior": ["Threat hunting and analysis", "Security tool implementation", "Incident investigation", "Security architecture design"],
                "regular": ["Security monitoring", "Vulnerability assessment", "Security tool configuration", "Incident documentation"]
            },
            "development": {
                "lead": ["Technical architecture decisions", "Code reviews and mentoring", "Sprint planning and estimation", "Technology strategy"],
                "senior": ["Feature development leadership", "Code reviews", "Junior developer mentoring", "Technical documentation"],
                "regular": ["Feature implementation", "Bug fixes and testing", "Unit testing", "Code documentation"]
            },
            "operations": {
                "lead": ["Process optimization", "Team coordination", "Strategic planning", "Performance monitoring"],
                "senior": ["Project management", "Process improvement", "Quality assurance", "Team support"],
                "regular": ["Task coordination", "Documentation", "Quality checks", "Administrative support"]
            },
            "design": {
                "lead": ["Design system oversight", "Design reviews", "Stakeholder meetings", "Team coordination"],
                "senior": ["UI/UX design", "User research", "Prototyping", "Design reviews"],
                "regular": ["Visual design", "Asset creation", "Design implementation", "User testing"]
            }
        }
        
        # Get department-specific responsibilities if available, otherwise fall back to team type
        dept_responsibilities = responsibilities_map.get(department, responsibilities_map.get(team_type, responsibilities_map["development"]))
        return dept_responsibilities.get(role, ["General responsibilities", "Team collaboration"])

    async def run_complete_enhanced_generation(self):
        """Run the complete enhanced data generation process"""
        logger.info("🚀 Starting Enhanced Comprehensive Demo Data Generation...")
        
        start_time = datetime.utcnow()
        
        try:
            # Connect to database
            await self.connect_database()
            
            # Clean up existing data
            cleanup_success = await self.cleanup_existing_data()
            if not cleanup_success:
                logger.error("❌ Failed to cleanup existing data")
                return False
            
            # Create enhanced users
            users_success = await self.create_enhanced_users()
            if not users_success:
                logger.error("❌ Failed to create enhanced users")
                return False
                
            # Create enhanced teams
            teams_success = await self.create_enhanced_teams() 
            if not teams_success:
                logger.error("❌ Failed to create enhanced teams")
                return False
            
            # Generate comprehensive report
            await self.generate_enhanced_report(start_time)
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"✅ Enhanced Comprehensive Demo Data Generation completed successfully in {duration:.2f} seconds!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Enhanced data generation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def generate_enhanced_report(self, start_time: datetime):
        """Generate comprehensive enhanced data generation report"""
        try:
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            # Calculate comprehensive statistics
            total_users = len(self.generated_data["users"])
            total_teams = len(self.generated_data["teams"])
            
            # Calculate financial metrics
            total_budget_allocation = sum(
                team.get("team_management", {}).get("budget_allocation", 0) 
                for team in self.generated_data["teams"]
            )
            
            total_salary_range = sum(
                user.get("professional_info", {}).get("salary_range", {}).get("max", 0)
                for user in self.generated_data["users"]
            )
            
            # Performance metrics
            avg_performance_rating = sum(
                user.get("professional_info", {}).get("performance_rating", 4.0) 
                for user in self.generated_data["users"]
            ) / max(total_users, 1)
            
            # Generate comprehensive report
            report_data = {
                "generation_info": {
                    "generator_version": "Enhanced Comprehensive v2.0",
                    "generation_date": end_time.isoformat(),
                    "generation_duration_seconds": round(duration, 2),
                    "database_name": "enterprise_portfolio_db",
                    "organization_id": self.org_id
                },
                
                "summary": {
                    "total_enhanced_data_points": total_users + total_teams,
                    "users_created": total_users,
                    "teams_created": total_teams,
                    "projects_planned": len(self.enhanced_project_templates),
                    "departments_covered": len(set(user.get("professional_info", {}).get("department", "") for user in self.generated_data["users"])),
                    "management_levels": len(set(user.get("professional_info", {}).get("management_level", "IC") for user in self.generated_data["users"])),
                    "skill_categories": len(set(skill for user in self.generated_data["users"] for skill in user.get("professional_info", {}).get("skills", [])))
                },
                
                "financial_metrics": {
                    "total_team_budget_allocation": total_budget_allocation,
                    "total_salary_capacity": total_salary_range,
                    "average_hourly_rate": sum(user.get("professional_info", {}).get("hourly_rate", 100) for user in self.generated_data["users"]) / max(total_users, 1),
                    "budget_utilization_range": "30% - 80%",
                    "currency": "USD"
                },
                
                "performance_analytics": {
                    "average_performance_rating": round(avg_performance_rating, 2),
                    "high_performers_count": sum(1 for user in self.generated_data["users"] if user.get("professional_info", {}).get("performance_rating", 4.0) >= 4.5),
                    "management_span_coverage": sum(user.get("achievements", {}).get("team_members_managed", 0) for user in self.generated_data["users"]),
                    "total_experience_years": sum(user.get("professional_info", {}).get("experience_years", 5) for user in self.generated_data["users"])
                },
                
                "organizational_structure": {
                    "c_level_executives": sum(1 for user in self.generated_data["users"] if user.get("professional_info", {}).get("management_level") == "C-Level"),
                    "directors_and_vps": sum(1 for user in self.generated_data["users"] if user.get("professional_info", {}).get("management_level") in ["Director", "VP"]),
                    "team_leads": sum(1 for user in self.generated_data["users"] if user.get("role") == "team_lead"),
                    "individual_contributors": sum(1 for user in self.generated_data["users"] if user.get("role") == "member"),
                    "clearance_levels": len(set(user.get("professional_info", {}).get("clearance_level") for user in self.generated_data["users"] if user.get("professional_info", {}).get("clearance_level")))
                },
                
                "technology_coverage": {
                    "ai_ml_specialists": sum(1 for user in self.generated_data["users"] if "AI Research" in user.get("professional_info", {}).get("department", "")),
                    "blockchain_experts": sum(1 for user in self.generated_data["users"] if "Blockchain" in user.get("professional_info", {}).get("department", "")),
                    "cybersecurity_professionals": sum(1 for user in self.generated_data["users"] if "Cybersecurity" in user.get("professional_info", {}).get("department", "")),
                    "iot_engineers": sum(1 for user in self.generated_data["users"] if "IoT" in user.get("professional_info", {}).get("department", "")),
                    "fintech_specialists": sum(1 for user in self.generated_data["users"] if "Financial Technology" in user.get("professional_info", {}).get("department", ""))
                },
                
                "enhanced_features": [
                    f"🏢 {total_teams} Specialized Teams with Budget Allocation (${'${:,.0f}'.format(total_budget_allocation)} total)",
                    f"👥 {total_users} Professional Users with Comprehensive Profiles",
                    f"💼 Complete Organizational Hierarchy (C-Level to IC)",
                    f"🎯 Performance Management System (Avg Rating: {avg_performance_rating:.1f}/5.0)",
                    f"💰 Financial Planning & Budget Tracking",
                    f"🏆 Professional Achievements & Certifications",
                    f"🌍 Global Team Distribution & Remote Work Capabilities", 
                    f"🔒 Security Clearance & Compliance Tracking",
                    f"📊 Advanced Analytics & Reporting Capabilities",
                    f"🚀 Next-Generation Technology Coverage (AI, Blockchain, IoT, XR)"
                ],
                
                "access_information": {
                    "demo_login": "demo@company.com / demo123456",
                    "frontend_url": "http://localhost:3000",
                    "backend_api": "http://localhost:8001",
                    "api_docs": "http://localhost:8001/docs",
                    "health_check": "http://localhost:8001/api/health"
                }
            }
            
            # Save report to file
            report_filename = f"/app/enhanced_comprehensive_demo_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_filename, 'w') as f:
                json.dump(report_data, f, indent=2, default=str)
            
            logger.info(f"📋 Enhanced comprehensive report saved to: {report_filename}")
            
        except Exception as e:
            logger.error(f"❌ Failed to generate enhanced report: {e}")

# Main execution function for standalone running
async def main():
    """Main function to run the enhanced comprehensive demo data generator"""
    generator = EnhancedComprehensiveDemoDataGenerator()
    success = await generator.run_complete_enhanced_generation()
    return success

if __name__ == "__main__":
    asyncio.run(main())