from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

class CustomerRequest(BaseModel):
    customer_id: str = Field(..., description="Unique identifier for the customer")
    features: Dict[str, Any] = Field(..., description="Dictionary of customer features matching the dataset")

class PolicyQARequest(BaseModel):
    question: str = Field(..., description="Policy question to ask the Copilot")

class CombinedAnalysisRequest(BaseModel):
    customer_id: str = Field(..., description="Unique identifier for the customer")
    features: Dict[str, Any] = Field(..., description="Dictionary of customer features")
    question: str = Field(..., description="Question combining risk and policy analysis")
