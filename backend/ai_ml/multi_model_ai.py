"""
Multi-Model AI Integration Service
Supports GPT-4o, Claude 3.5 Sonnet, and Gemini 2.0 Pro
"""
import os
import asyncio
import json
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import logging
from emergentintegrations import use_openai, use_anthropic, use_google

logger = logging.getLogger(__name__)

class MultiModelAIService:
    """Advanced AI service supporting multiple LLM providers"""
    
    def __init__(self):
        self.models = {
            "gpt-4o": {
                "provider": "openai",
                "model_id": "gpt-4o",
                "capabilities": ["text", "vision", "code", "reasoning"],
                "max_tokens": 128000,
                "cost_per_token": 0.00001
            },
            "claude-3.5-sonnet": {
                "provider": "anthropic", 
                "model_id": "claude-3-5-sonnet-20241022",
                "capabilities": ["text", "vision", "code", "analysis"],
                "max_tokens": 200000,
                "cost_per_token": 0.000003
            },
            "gemini-2.0-pro": {
                "provider": "google",
                "model_id": "gemini-2.0-flash-exp",
                "capabilities": ["text", "vision", "multimodal", "reasoning"],
                "max_tokens": 1000000,
                "cost_per_token": 0.000002
            }
        }
        self.session_cache = {}
    
    async def generate_response(
        self,
        prompt: str,
        model: str = "gpt-4o",
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generate AI response using specified model"""
        try:
            if model not in self.models:
                raise ValueError(f"Unsupported model: {model}")
            
            model_config = self.models[model]
            provider = model_config["provider"]
            
            # Enhance prompt with context
            enhanced_prompt = self._enhance_prompt(prompt, context, model)
            
            if provider == "openai":
                return await self._generate_openai(enhanced_prompt, model_config, temperature, max_tokens)
            elif provider == "anthropic":
                return await self._generate_anthropic(enhanced_prompt, model_config, temperature, max_tokens)
            elif provider == "google":
                return await self._generate_google(enhanced_prompt, model_config, temperature, max_tokens)
                
        except Exception as e:
            logger.error(f"AI generation error for {model}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "model": model,
                "timestamp": datetime.now().isoformat()
            }
    
    async def _generate_openai(self, prompt: str, config: Dict, temperature: float, max_tokens: Optional[int]) -> Dict[str, Any]:
        """Generate response using OpenAI GPT-4o"""
        client = use_openai()
        
        response = await client.chat.completions.create(
            model=config["model_id"],
            messages=[{
                "role": "system",
                "content": "You are an advanced AI assistant specializing in enterprise portfolio management and resource optimization."
            }, {
                "role": "user", 
                "content": prompt
            }],
            temperature=temperature,
            max_tokens=max_tokens or 4000
        )
        
        return {
            "success": True,
            "content": response.choices[0].message.content,
            "model": config["model_id"],
            "provider": "openai",
            "tokens_used": response.usage.total_tokens,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _generate_anthropic(self, prompt: str, config: Dict, temperature: float, max_tokens: Optional[int]) -> Dict[str, Any]:
        """Generate response using Claude 3.5 Sonnet"""
        client = use_anthropic()
        
        response = await client.messages.create(
            model=config["model_id"],
            max_tokens=max_tokens or 4000,
            temperature=temperature,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        return {
            "success": True,
            "content": response.content[0].text,
            "model": config["model_id"],
            "provider": "anthropic",
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _generate_google(self, prompt: str, config: Dict, temperature: float, max_tokens: Optional[int]) -> Dict[str, Any]:
        """Generate response using Gemini 2.0 Pro"""
        client = use_google()
        model = client.GenerativeModel(config["model_id"])
        
        response = await model.generate_content_async(
            prompt,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens or 4000
            }
        )
        
        return {
            "success": True,
            "content": response.text,
            "model": config["model_id"],
            "provider": "google",
            "tokens_used": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0,
            "timestamp": datetime.now().isoformat()
        }
    
    def _enhance_prompt(self, prompt: str, context: Optional[Dict[str, Any]], model: str) -> str:
        """Enhance prompt with context and model-specific optimizations"""
        if not context:
            return prompt
        
        enhanced_prompt = f"""
Context Information:
{json.dumps(context, indent=2) if context else 'No additional context'}

User Request:
{prompt}

Please provide a comprehensive response considering the context above. Focus on actionable insights and specific recommendations for enterprise portfolio management.
"""
        
        # Model-specific prompt enhancements
        if model == "claude-3.5-sonnet":
            enhanced_prompt += "\n\nPlease structure your response with clear headings and bullet points for easy reading."
        elif model == "gpt-4o":
            enhanced_prompt += "\n\nProvide data-driven insights and quantifiable recommendations where possible."
        elif model == "gemini-2.0-pro":
            enhanced_prompt += "\n\nConsider multiple perspectives and provide balanced analysis."
        
        return enhanced_prompt
    
    async def compare_models_response(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        models: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Compare responses from multiple AI models"""
        if not models:
            models = ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-pro"]
        
        tasks = []
        for model in models:
            if model in self.models:
                tasks.append(self.generate_response(prompt, model, context))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        comparison = {
            "prompt": prompt,
            "context": context,
            "models_compared": len(models),
            "responses": {},
            "summary": {
                "best_model": None,
                "avg_response_time": 0,
                "total_tokens": 0
            },
            "timestamp": datetime.now().isoformat()
        }
        
        for model, response in zip(models, responses):
            if isinstance(response, Exception):
                comparison["responses"][model] = {
                    "success": False,
                    "error": str(response)
                }
            else:
                comparison["responses"][model] = response
        
        return comparison
    
    async def get_optimal_model_for_task(self, task_type: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Determine optimal AI model based on task type"""
        task_model_mapping = {
            "resource_allocation": "gpt-4o",  # Best for data analysis and optimization
            "strategic_planning": "claude-3.5-sonnet",  # Best for long-form analysis
            "risk_assessment": "gemini-2.0-pro",  # Best for multi-perspective analysis
            "code_analysis": "gpt-4o",  # Best for technical tasks
            "creative_solutions": "gemini-2.0-pro",  # Best for creative thinking
            "data_interpretation": "gpt-4o",  # Best for quantitative analysis
            "process_optimization": "claude-3.5-sonnet",  # Best for systematic analysis
            "trend_prediction": "gemini-2.0-pro"  # Best for pattern recognition
        }
        
        return task_model_mapping.get(task_type, "gpt-4o")
    
    def get_model_capabilities(self, model: str) -> Dict[str, Any]:
        """Get detailed information about model capabilities"""
        if model not in self.models:
            return {"error": f"Model {model} not supported"}
        
        return self.models[model]
    
    def list_available_models(self) -> List[Dict[str, Any]]:
        """List all available AI models with their capabilities"""
        return [
            {
                "model": model_name,
                **config
            }
            for model_name, config in self.models.items()
        ]