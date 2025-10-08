from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import json
import logging
from datetime import datetime
from io import BytesIO
import asyncio
import os
from dotenv import load_dotenv
import uuid

# Import auth dependencies
from auth.middleware import get_current_user
from models.user import User

# Import database
from database import get_database

# Import emergent integrations
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Load environment variables
load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

class DocumentType(str, Enum):
    PRD = "project_requirements_document"
    TECHNICAL_SPECS = "technical_specifications"
    USER_STORIES = "user_stories"
    PROJECT_CHARTER = "project_charter"
    RISK_ASSESSMENT = "risk_assessment"
    BUSINESS_CASE = "business_case"
    ARCHITECTURE_DOCUMENT = "architecture_document"
    TEST_PLAN = "test_plan"
    DEPLOYMENT_GUIDE = "deployment_guide"
    USER_MANUAL = "user_manual"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ProjectScope(BaseModel):
    # Basic Project Information
    project_name: str = Field(..., min_length=1, max_length=200)
    project_description: str = Field(..., min_length=10, max_length=2000)
    project_objectives: List[str] = Field(..., min_items=1)
    
    # Target audience and stakeholders
    target_audience: str = Field(..., min_length=5, max_length=500)
    stakeholders: List[str] = Field(..., min_items=1)
    
    # Technical requirements and constraints
    technical_requirements: List[str] = Field(default=[])
    technical_constraints: List[str] = Field(default=[])
    technology_stack: List[str] = Field(default=[])
    
    # Timeline and budget
    timeline: str = Field(..., min_length=5, max_length=200)  # e.g., "6 months", "Q1 2024"
    budget_range: Optional[str] = Field(None, max_length=100)
    priority: Priority = Field(default=Priority.MEDIUM)
    
    # Business domain information
    business_domain: str = Field(..., min_length=5, max_length=200)  # e.g., "E-commerce", "Healthcare"
    business_context: Optional[str] = Field(None, max_length=1000)
    
    # Additional context
    success_criteria: List[str] = Field(default=[])
    risks_and_assumptions: List[str] = Field(default=[])
    compliance_requirements: List[str] = Field(default=[])

class DocumentGenerationRequest(BaseModel):
    project_scope: ProjectScope
    document_types: List[DocumentType]
    additional_instructions: Optional[str] = Field(None, max_length=1000)

class GeneratedDocument(BaseModel):
    document_type: DocumentType
    title: str
    content: str
    metadata: Dict[str, Any]

class DocumentGenerationResponse(BaseModel):
    success: bool
    documents: List[GeneratedDocument]
    generation_time: float
    timestamp: datetime

class AIProjectGeneratorService:
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
    
    def _create_document_prompt(self, document_type: DocumentType, scope: ProjectScope, additional_instructions: str = None) -> str:
        """Create a detailed prompt for generating a specific document type."""
        
        base_context = f"""
Project Name: {scope.project_name}
Description: {scope.project_description}
Domain: {scope.business_domain}
Timeline: {scope.timeline}
Priority: {scope.priority}

Objectives:
{chr(10).join(f"• {obj}" for obj in scope.project_objectives)}

Target Audience: {scope.target_audience}

Stakeholders:
{chr(10).join(f"• {stakeholder}" for stakeholder in scope.stakeholders)}

Technology Stack: {', '.join(scope.technology_stack) if scope.technology_stack else 'To be determined'}

Technical Requirements:
{chr(10).join(f"• {req}" for req in scope.technical_requirements) if scope.technical_requirements else '• To be defined based on detailed analysis'}

Technical Constraints:
{chr(10).join(f"• {constraint}" for constraint in scope.technical_constraints) if scope.technical_constraints else '• Standard enterprise constraints apply'}

Success Criteria:
{chr(10).join(f"• {criteria}" for criteria in scope.success_criteria) if scope.success_criteria else '• To be defined based on project objectives'}

Budget: {scope.budget_range or 'To be determined'}
Business Context: {scope.business_context or 'Standard enterprise project'}

Compliance Requirements:
{chr(10).join(f"• {req}" for req in scope.compliance_requirements) if scope.compliance_requirements else '• Standard enterprise compliance'}

Risks and Assumptions:
{chr(10).join(f"• {risk}" for risk in scope.risks_and_assumptions) if scope.risks_and_assumptions else '• To be assessed during planning phase'}
"""

        prompts = {
            DocumentType.PRD: f"""
Create a comprehensive Project Requirements Document (PRD) with the following structure:

1. EXECUTIVE SUMMARY
2. PROJECT OVERVIEW
3. BUSINESS OBJECTIVES AND SUCCESS METRICS
4. TARGET USERS AND PERSONAS
5. FUNCTIONAL REQUIREMENTS
6. NON-FUNCTIONAL REQUIREMENTS
7. USER STORIES AND USE CASES
8. ACCEPTANCE CRITERIA
9. TECHNICAL CONSIDERATIONS
10. CONSTRAINTS AND ASSUMPTIONS
11. RISKS AND MITIGATION STRATEGIES
12. PROJECT TIMELINE AND MILESTONES
13. RESOURCE REQUIREMENTS
14. DEPENDENCIES
15. APPENDICES

Use this project information:
{base_context}

Make it comprehensive, professional, and actionable. Include specific measurable requirements where possible.
""",

            DocumentType.TECHNICAL_SPECS: f"""
Create detailed Technical Specifications with the following structure:

1. ARCHITECTURE OVERVIEW
2. SYSTEM ARCHITECTURE
3. TECHNOLOGY STACK
4. DATABASE DESIGN
5. API SPECIFICATIONS
6. SECURITY REQUIREMENTS
7. PERFORMANCE REQUIREMENTS
8. SCALABILITY CONSIDERATIONS
9. INTEGRATION REQUIREMENTS
10. ERROR HANDLING
11. MONITORING AND LOGGING
12. DEPLOYMENT ARCHITECTURE
13. DATA FLOW DIAGRAMS
14. TECHNICAL CONSTRAINTS
15. DEVELOPMENT STANDARDS

Use this project information:
{base_context}

Include technical diagrams descriptions, code examples where relevant, and specific technical metrics.
""",

            DocumentType.USER_STORIES: f"""
Create comprehensive User Stories with the following structure:

1. USER PERSONAS
2. EPIC STORIES
3. DETAILED USER STORIES
4. ACCEPTANCE CRITERIA
5. STORY MAPPING
6. PRIORITIZATION
7. DEPENDENCIES BETWEEN STORIES
8. DEFINITION OF DONE
9. TESTING SCENARIOS
10. EDGE CASES

Use this project information:
{base_context}

Format each user story as: "As a [user type], I want [goal] so that [benefit]"
Include acceptance criteria for each story and organize by priority/sprints.
""",

            DocumentType.PROJECT_CHARTER: f"""
Create a Project Charter with the following structure:

1. PROJECT TITLE AND OVERVIEW
2. PROJECT PURPOSE AND JUSTIFICATION
3. PROJECT OBJECTIVES AND SUCCESS CRITERIA
4. HIGH-LEVEL REQUIREMENTS
5. PROJECT SCOPE (IN/OUT OF SCOPE)
6. KEY STAKEHOLDERS AND ROLES
7. PROJECT MANAGER AND TEAM STRUCTURE
8. HIGH-LEVEL TIMELINE AND MILESTONES
9. BUDGET AND RESOURCE ALLOCATION
10. RISKS AND ASSUMPTIONS
11. PROJECT CONSTRAINTS
12. APPROVAL AND SIGN-OFF

Use this project information:
{base_context}

Make it executive-level appropriate and include clear authorization and governance structure.
""",

            DocumentType.RISK_ASSESSMENT: f"""
Create a comprehensive Risk Assessment with the following structure:

1. EXECUTIVE SUMMARY
2. RISK ASSESSMENT METHODOLOGY
3. TECHNICAL RISKS
4. BUSINESS RISKS
5. OPERATIONAL RISKS
6. SECURITY RISKS
7. COMPLIANCE AND REGULATORY RISKS
8. EXTERNAL RISKS
9. RISK MATRIX AND PRIORITIZATION
10. MITIGATION STRATEGIES
11. CONTINGENCY PLANS
12. MONITORING AND REVIEW PROCESS
13. RISK OWNERS AND RESPONSIBILITIES
14. ESCALATION PROCEDURES

Use this project information:
{base_context}

Include risk probability, impact ratings, and detailed mitigation plans for each identified risk.
""",

            DocumentType.BUSINESS_CASE: f"""
Create a Business Case with the following structure:

1. EXECUTIVE SUMMARY
2. BUSINESS PROBLEM/OPPORTUNITY
3. PROPOSED SOLUTION
4. BENEFITS ANALYSIS
5. COST-BENEFIT ANALYSIS
6. FINANCIAL PROJECTIONS
7. RETURN ON INVESTMENT (ROI)
8. STRATEGIC ALIGNMENT
9. RISK ANALYSIS
10. IMPLEMENTATION APPROACH
11. SUCCESS METRICS AND KPIs
12. ALTERNATIVE SOLUTIONS CONSIDERED
13. RECOMMENDATION
14. APPROVAL REQUEST

Use this project information:
{base_context}

Include financial models, ROI calculations, and compelling business justification.
""",

            DocumentType.ARCHITECTURE_DOCUMENT: f"""
Create an Architecture Document with the following structure:

1. ARCHITECTURE OVERVIEW
2. ARCHITECTURAL GOALS AND CONSTRAINTS
3. SYSTEM CONTEXT AND SCOPE
4. ARCHITECTURAL PATTERNS
5. SYSTEM ARCHITECTURE
6. COMPONENT ARCHITECTURE
7. DATA ARCHITECTURE
8. SECURITY ARCHITECTURE
9. DEPLOYMENT ARCHITECTURE
10. PERFORMANCE AND SCALABILITY
11. INTEGRATION ARCHITECTURE
12. ARCHITECTURAL DECISIONS AND RATIONALE
13. QUALITY ATTRIBUTES
14. FUTURE CONSIDERATIONS

Use this project information:
{base_context}

Include architectural diagrams descriptions, design patterns, and technical rationale for architectural decisions.
""",

            DocumentType.TEST_PLAN: f"""
Create a comprehensive Test Plan with the following structure:

1. TEST STRATEGY OVERVIEW
2. SCOPE OF TESTING
3. TEST OBJECTIVES
4. TEST APPROACH
5. TESTING TYPES AND LEVELS
6. TEST ENVIRONMENT REQUIREMENTS
7. TEST DATA REQUIREMENTS
8. TEST CASES AND SCENARIOS
9. AUTOMATION STRATEGY
10. PERFORMANCE TESTING APPROACH
11. SECURITY TESTING APPROACH
12. REGRESSION TESTING STRATEGY
13. DEFECT MANAGEMENT PROCESS
14. TEST METRICS AND REPORTING
15. RISK ASSESSMENT AND MITIGATION

Use this project information:
{base_context}

Include specific test cases, automation frameworks, and quality gates.
""",

            DocumentType.DEPLOYMENT_GUIDE: f"""
Create a Deployment Guide with the following structure:

1. DEPLOYMENT OVERVIEW
2. ENVIRONMENT REQUIREMENTS
3. INFRASTRUCTURE SETUP
4. PRE-DEPLOYMENT CHECKLIST
5. DEPLOYMENT PROCESS
6. CONFIGURATION MANAGEMENT
7. DATABASE SETUP AND MIGRATION
8. SECURITY CONFIGURATION
9. MONITORING AND LOGGING SETUP
10. POST-DEPLOYMENT VERIFICATION
11. ROLLBACK PROCEDURES
12. TROUBLESHOOTING GUIDE
13. MAINTENANCE PROCEDURES
14. DISASTER RECOVERY

Use this project information:
{base_context}

Include step-by-step deployment instructions, configuration examples, and troubleshooting procedures.
""",

            DocumentType.USER_MANUAL: f"""
Create a User Manual with the following structure:

1. INTRODUCTION AND OVERVIEW
2. GETTING STARTED
3. USER INTERFACE OVERVIEW
4. BASIC OPERATIONS
5. ADVANCED FEATURES
6. USER ROLES AND PERMISSIONS
7. WORKFLOWS AND PROCESSES
8. CONFIGURATION AND SETTINGS
9. REPORTING AND ANALYTICS
10. TROUBLESHOOTING
11. FREQUENTLY ASKED QUESTIONS
12. GLOSSARY OF TERMS
13. SUPPORT AND CONTACT INFORMATION
14. APPENDICES

Use this project information:
{base_context}

Include screenshots descriptions, step-by-step instructions, and user-friendly explanations.
"""
        }

        prompt = prompts.get(document_type, f"Create a comprehensive {document_type} document for the project.")
        
        if additional_instructions:
            prompt += f"\n\nAdditional Instructions:\n{additional_instructions}"
        
        prompt += "\n\nGenerate a professional, comprehensive, and well-structured document. Use proper formatting with headers, bullet points, and numbered lists where appropriate."
        
        return prompt

    async def generate_document(self, document_type: DocumentType, scope: ProjectScope, additional_instructions: str = None) -> GeneratedDocument:
        """Generate a single document using AI."""
        try:
            # Create chat instance
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"doc_gen_{document_type}_{datetime.now().isoformat()}",
                system_message="You are an expert project management consultant and technical writer specializing in creating comprehensive project documentation. Generate detailed, professional, and actionable documents."
            ).with_model("openai", "gpt-4o")

            # Create prompt
            prompt = self._create_document_prompt(document_type, scope, additional_instructions)

            # Create user message
            user_message = UserMessage(text=prompt)

            # Generate content
            response = await chat.send_message(user_message)

            # Create document title
            title_map = {
                DocumentType.PRD: "Project Requirements Document",
                DocumentType.TECHNICAL_SPECS: "Technical Specifications",
                DocumentType.USER_STORIES: "User Stories and Acceptance Criteria",
                DocumentType.PROJECT_CHARTER: "Project Charter",
                DocumentType.RISK_ASSESSMENT: "Risk Assessment and Mitigation Plan",
                DocumentType.BUSINESS_CASE: "Business Case and ROI Analysis",
                DocumentType.ARCHITECTURE_DOCUMENT: "Architecture Document",
                DocumentType.TEST_PLAN: "Test Plan and Strategy",
                DocumentType.DEPLOYMENT_GUIDE: "Deployment Guide",
                DocumentType.USER_MANUAL: "User Manual and Documentation"
            }

            title = f"{title_map.get(document_type, document_type.replace('_', ' ').title())} - {scope.project_name}"

            return GeneratedDocument(
                document_type=document_type,
                title=title,
                content=response,
                metadata={
                    "project_name": scope.project_name,
                    "generated_at": datetime.now().isoformat(),
                    "domain": scope.business_domain,
                    "priority": scope.priority,
                    "timeline": scope.timeline,
                    "word_count": len(response.split()),
                    "character_count": len(response)
                }
            )

        except Exception as e:
            logger.error(f"Error generating {document_type} document: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate {document_type} document: {str(e)}"
            )

    async def generate_multiple_documents(self, scope: ProjectScope, document_types: List[DocumentType], additional_instructions: str = None) -> List[GeneratedDocument]:
        """Generate multiple documents concurrently."""
        tasks = []
        for doc_type in document_types:
            task = self.generate_document(doc_type, scope, additional_instructions)
            tasks.append(task)

        # Generate documents concurrently with a reasonable limit
        semaphore = asyncio.Semaphore(3)  # Limit concurrent generations
        
        async def limited_generation(task):
            async with semaphore:
                return await task

        results = await asyncio.gather(
            *[limited_generation(task) for task in tasks],
            return_exceptions=True
        )

        documents = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to generate document {document_types[i]}: {str(result)}")
                # Create error document
                documents.append(GeneratedDocument(
                    document_type=document_types[i],
                    title=f"Error - {document_types[i].replace('_', ' ').title()}",
                    content=f"Error generating document: {str(result)}",
                    metadata={"error": True, "error_message": str(result)}
                ))
            else:
                documents.append(result)

        return documents

# Initialize service
ai_service = AIProjectGeneratorService()

@router.post("/generate-documents", response_model=DocumentGenerationResponse)
async def generate_project_documents(
    request: DocumentGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate project documents based on scope and requirements."""
    try:
        start_time = datetime.now()

        if not request.document_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one document type must be specified"
            )

        # Generate documents
        documents = await ai_service.generate_multiple_documents(
            scope=request.project_scope,
            document_types=request.document_types,
            additional_instructions=request.additional_instructions
        )

        generation_time = (datetime.now() - start_time).total_seconds()

        return DocumentGenerationResponse(
            success=True,
            documents=documents,
            generation_time=generation_time,
            timestamp=datetime.now()
        )

    except Exception as e:
        logger.error(f"Error in document generation endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document generation failed: {str(e)}"
        )

@router.get("/document-types")
async def get_available_document_types(current_user: User = Depends(get_current_user)):
    """Get list of available document types."""
    return {
        "document_types": [
            {
                "value": doc_type.value,
                "label": doc_type.value.replace('_', ' ').title(),
                "description": _get_document_description(doc_type)
            }
            for doc_type in DocumentType
        ]
    }

def _get_document_description(doc_type: DocumentType) -> str:
    """Get description for each document type."""
    descriptions = {
        DocumentType.PRD: "Comprehensive project requirements and specifications",
        DocumentType.TECHNICAL_SPECS: "Detailed technical architecture and implementation specifications",
        DocumentType.USER_STORIES: "User-focused stories with acceptance criteria and test scenarios",
        DocumentType.PROJECT_CHARTER: "Executive project authorization and high-level scope definition",
        DocumentType.RISK_ASSESSMENT: "Comprehensive risk analysis with mitigation strategies",
        DocumentType.BUSINESS_CASE: "Financial justification and ROI analysis for the project",
        DocumentType.ARCHITECTURE_DOCUMENT: "System architecture design and technical decisions",
        DocumentType.TEST_PLAN: "Comprehensive testing strategy and execution plan",
        DocumentType.DEPLOYMENT_GUIDE: "Step-by-step deployment and configuration instructions",
        DocumentType.USER_MANUAL: "End-user documentation and operational procedures"
    }
    return descriptions.get(doc_type, "Project documentation")

@router.get("/health")
async def health_check():
    """Health check endpoint for the AI generator service."""
    try:
        # Test if we can create a chat instance
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            return {"status": "unhealthy", "error": "API key not configured"}
        
        return {
            "status": "healthy",
            "service": "AI Project Artifact Generator",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }