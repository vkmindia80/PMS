from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from enum import Enum
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class OrganizationType(str, Enum):
    STARTUP = "startup"
    SMALL_BUSINESS = "small_business"
    MEDIUM_ENTERPRISE = "medium_enterprise"
    LARGE_ENTERPRISE = "large_enterprise"
    NON_PROFIT = "non_profit"
    GOVERNMENT = "government"
    EDUCATION = "education"

class OrganizationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRIAL = "trial"
    SUSPENDED = "suspended"

class OrganizationSettings(BaseModel):
    """Organization configuration settings"""
    timezone: str = Field(default="UTC", description="Organization default timezone")
    date_format: str = Field(default="YYYY-MM-DD", description="Preferred date format")
    time_format: str = Field(default="24h", description="Preferred time format (12h/24h)")
    currency: str = Field(default="USD", description="Default currency")
    language: str = Field(default="en", description="Default language")
    
    # Feature flags
    features: Dict[str, bool] = Field(default_factory=dict, description="Enabled features")
    
    # Branding
    logo_url: Optional[str] = Field(None, description="Organization logo URL")
    primary_color: Optional[str] = Field(None, description="Primary brand color")
    secondary_color: Optional[str] = Field(None, description="Secondary brand color")
    
    # Limits and quotas
    max_users: Optional[int] = Field(None, description="Maximum number of users")
    max_projects: Optional[int] = Field(None, description="Maximum number of projects")
    storage_limit_gb: Optional[float] = Field(None, description="Storage limit in GB")

class OrganizationBase(BaseModel):
    """Base organization model"""
    name: str = Field(..., min_length=1, max_length=200, description="Organization name")
    slug: str = Field(..., min_length=3, max_length=100, description="URL-friendly organization identifier")
    description: Optional[str] = Field(None, max_length=1000, description="Organization description")
    type: OrganizationType = Field(default=OrganizationType.SMALL_BUSINESS, description="Organization type")
    status: OrganizationStatus = Field(default=OrganizationStatus.ACTIVE, description="Organization status")
    
    # Contact information
    website: Optional[str] = Field(None, description="Organization website")
    email: Optional[str] = Field(None, description="Organization contact email")
    phone: Optional[str] = Field(None, description="Organization contact phone")
    
    # Address
    address: Optional[Dict[str, str]] = Field(None, description="Organization address")
    
    # Settings
    settings: OrganizationSettings = Field(default_factory=OrganizationSettings, description="Organization settings")
    
    # Metadata
    industry: Optional[str] = Field(None, description="Industry sector")
    size: Optional[str] = Field(None, description="Organization size category")
    founded_year: Optional[int] = Field(None, description="Year organization was founded")

class OrganizationCreate(BaseCreateModel, OrganizationBase):
    """Organization creation model"""
    owner_id: str = Field(..., description="ID of the user creating the organization")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Acme Corporation",
                "slug": "acme-corp",
                "description": "A leading technology company",
                "type": "medium_enterprise",
                "website": "https://acme.com",
                "email": "contact@acme.com",
                "phone": "+1234567890",
                "industry": "Technology",
                "size": "100-500 employees",
                "founded_year": 2010,
                "owner_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }

class OrganizationUpdate(BaseUpdateModel):
    """Organization update model"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    type: Optional[OrganizationType] = None
    status: Optional[OrganizationStatus] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[Dict[str, str]] = None
    settings: Optional[OrganizationSettings] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    founded_year: Optional[int] = None

class Organization(BaseDBModel, OrganizationBase):
    """Organization response model"""
    owner_id: str = Field(..., description="ID of the organization owner")
    member_count: int = Field(default=0, description="Number of organization members")
    project_count: int = Field(default=0, description="Number of organization projects")
    
class OrganizationInDB(Organization):
    """Organization model as stored in database"""
    # Additional fields for database storage
    api_keys: List[str] = Field(default_factory=list, description="API keys for organization")
    webhooks: List[Dict] = Field(default_factory=list, description="Configured webhooks")
    integrations: Dict[str, Dict] = Field(default_factory=dict, description="Third-party integrations")

class OrganizationSummary(BaseModel):
    """Lightweight organization model for lists"""
    id: str
    name: str
    slug: str
    type: OrganizationType
    status: OrganizationStatus
    member_count: int
    project_count: int
    logo_url: Optional[str] = None