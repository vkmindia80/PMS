from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

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

# Project Scope Model
class ProjectScope(BaseModel):
    project_name: str = Field(..., min_length=1, max_length=200)
    project_description: str = Field(..., min_length=10, max_length=2000)
    project_objectives: List[str] = Field(..., min_items=1)
    target_audience: str = Field(..., min_length=5, max_length=500)
    stakeholders: List[str] = Field(..., min_items=1)
    technical_requirements: List[str] = Field(default=[])
    technical_constraints: List[str] = Field(default=[])
    technology_stack: List[str] = Field(default=[])
    timeline: str = Field(..., min_length=5, max_length=200)
    budget_range: Optional[str] = Field(None, max_length=100)
    priority: Priority = Field(default=Priority.MEDIUM)
    business_domain: str = Field(..., min_length=5, max_length=200)
    business_context: Optional[str] = Field(None, max_length=1000)
    success_criteria: List[str] = Field(default=[])
    risks_and_assumptions: List[str] = Field(default=[])
    compliance_requirements: List[str] = Field(default=[])

# Generated Document Model
class GeneratedDocument(BaseModel):
    document_type: str
    title: str
    content: str
    metadata: Dict[str, Any]

# Saved Project Model (for database)
class SavedAIProject(BaseModel):
    id: str
    user_id: str
    project_scope: ProjectScope
    generated_documents: List[GeneratedDocument]
    created_at: datetime
    updated_at: datetime
    tags: List[str] = Field(default=[])

# Create Saved Project Request
class CreateSavedProjectRequest(BaseModel):
    project_scope: ProjectScope
    generated_documents: List[GeneratedDocument]
    tags: List[str] = Field(default=[])

# Update Saved Project Request
class UpdateSavedProjectRequest(BaseModel):
    project_scope: Optional[ProjectScope] = None
    generated_documents: Optional[List[GeneratedDocument]] = None
    tags: Optional[List[str]] = None

# Saved Project Response
class SavedProjectResponse(BaseModel):
    id: str
    user_id: str
    project_scope: ProjectScope
    generated_documents: List[GeneratedDocument]
    created_at: datetime
    updated_at: datetime
    tags: List[str]
    document_count: int
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Saved Project List Item (lightweight for list view)
class SavedProjectListItem(BaseModel):
    id: str
    project_name: str
    project_description: str
    business_domain: str
    priority: str
    document_count: int
    created_at: datetime
    updated_at: datetime
    tags: List[str]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Sample Project Model
class SampleProject(BaseModel):
    id: str
    project_scope: ProjectScope
    document_types: List[str]
    description: str = ""
    tags: List[str] = Field(default=[])
