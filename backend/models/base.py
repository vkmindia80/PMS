from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

def generate_uuid() -> str:
    """Generate a new UUID string"""
    return str(uuid.uuid4())

class BaseDBModel(BaseModel):
    """Base model for all database entities"""
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2023-01-01T00:00:00Z"
            }
        }
    )
    
    id: str = Field(default_factory=generate_uuid, description="Unique identifier")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")

class BaseCreateModel(BaseModel):
    """Base model for create operations"""
    class Config:
        # Validate assignment
        validate_assignment = True
        # Use enum values
        use_enum_values = True

class BaseUpdateModel(BaseModel):
    """Base model for update operations"""
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    
    class Config:
        # Validate assignment
        validate_assignment = True
        # Use enum values
        use_enum_values = True