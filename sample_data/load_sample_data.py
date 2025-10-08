#!/usr/bin/env python3
"""
Sample Data Loader for AI Project Artifact Generator
Loads pre-generated sample data into the system for demonstration purposes.
"""

import json
import os
from pathlib import Path
from datetime import datetime

class SampleDataLoader:
    def __init__(self):
        self.sample_dir = Path("sample_data")
        self.docs_dir = self.sample_dir / "generated_documents"
        
    def load_sample_projects(self):
        """Load sample project definitions."""
        projects_file = self.sample_dir / "ai_generator_sample_projects.json"
        
        if not projects_file.exists():
            print(f"❌ Sample projects file not found: {projects_file}")
            return None
            
        with open(projects_file, 'r') as f:
            projects = json.load(f)
            
        print(f"✅ Loaded {len(projects)} sample projects")
        return projects
    
    def load_generated_documents(self):
        """Load generated sample documents."""
        docs_file = self.docs_dir / "multi_domain_samples.json"
        
        if not docs_file.exists():
            print(f"❌ Generated documents file not found: {docs_file}")
            return None
            
        with open(docs_file, 'r') as f:
            documents = json.load(f)
            
        print(f"✅ Loaded {len(documents)} generated document samples")
        return documents
    
    def list_available_files(self):
        """List all available sample files."""
        print("📁 Available Sample Files:")
        print("=" * 50)
        
        # Project definitions
        projects_file = self.sample_dir / "ai_generator_sample_projects.json"
        if projects_file.exists():
            size = projects_file.stat().st_size
            print(f"📋 Project Definitions: ai_generator_sample_projects.json ({size} bytes)")
        
        # Generated documents directory
        if self.docs_dir.exists():
            print(f"\\n📄 Generated Documents:")
            for file in sorted(self.docs_dir.glob("*")):
                if file.is_file():
                    size = file.stat().st_size
                    mod_time = datetime.fromtimestamp(file.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
                    print(f"  • {file.name} ({size} bytes, modified: {mod_time})")
        
        # README file
        readme_file = self.sample_dir / "README.md"
        if readme_file.exists():
            size = readme_file.stat().st_size
            print(f"\\n📖 Documentation: README.md ({size} bytes)")
    
    def get_sample_summary(self):
        """Get a summary of available sample data."""
        projects = self.load_sample_projects()
        documents = self.load_generated_documents()
        
        if not projects and not documents:
            return None
            
        summary = {
            "total_projects": len(projects) if projects else 0,
            "total_documents": len(documents) if documents else 0,
            "domains_covered": [],
            "document_types": [],
            "projects": []
        }
        
        if projects:
            for project in projects:
                project_info = {
                    "id": project["id"],
                    "name": project["project_scope"]["project_name"],
                    "domain": project["project_scope"]["business_domain"],
                    "timeline": project["project_scope"]["timeline"],
                    "priority": project["project_scope"]["priority"],
                    "budget": project["project_scope"]["budget_range"],
                    "document_types": project["document_types"]
                }
                summary["projects"].append(project_info)
                
                if project_info["domain"] not in summary["domains_covered"]:
                    summary["domains_covered"].append(project_info["domain"])
                
                for doc_type in project["document_types"]:
                    if doc_type not in summary["document_types"]:
                        summary["document_types"].append(doc_type)
        
        return summary
    
    def print_sample_summary(self):
        """Print a formatted summary of sample data."""
        summary = self.get_sample_summary()
        
        if not summary:
            print("❌ No sample data available")
            return
            
        print("🎯 AI Project Artifact Generator - Sample Data Summary")
        print("=" * 60)
        print(f"📊 Total Projects: {summary['total_projects']}")
        print(f"📄 Total Generated Documents: {summary['total_documents']}")
        print(f"🏢 Business Domains: {len(summary['domains_covered'])}")
        print(f"📋 Document Types: {len(summary['document_types'])}")
        
        print(f"\\n🏢 Domains Covered:")
        for domain in summary['domains_covered']:
            print(f"  • {domain}")
            
        print(f"\\n📋 Document Types Available:")
        for doc_type in summary['document_types']:
            formatted_name = doc_type.replace('_', ' ').title()
            print(f"  • {formatted_name}")
        
        print(f"\\n📂 Sample Projects:")
        for project in summary['projects']:
            print(f"\\n  🚀 {project['name']}")
            print(f"     Domain: {project['domain']}")
            print(f"     Timeline: {project['timeline']} | Priority: {project['priority']}")
            print(f"     Budget: {project['budget']}")
            print(f"     Documents: {', '.join(project['document_types'][:3])}{'...' if len(project['document_types']) > 3 else ''}")
    
    def get_demo_data(self):
        """Get formatted data suitable for frontend demos."""
        projects = self.load_sample_projects()
        
        if not projects:
            return None
            
        demo_data = []
        
        for project in projects[:3]:  # First 3 projects for demo
            scope = project["project_scope"]
            
            demo_project = {
                "id": project["id"],
                "name": scope["project_name"],
                "description": scope["project_description"],
                "domain": scope["business_domain"],
                "timeline": scope["timeline"],
                "priority": scope["priority"],
                "budget": scope["budget_range"],
                "objectives": scope["project_objectives"][:3],  # First 3 objectives
                "stakeholders": scope["stakeholders"][:4],       # First 4 stakeholders
                "tech_stack": scope["technology_stack"][:4],     # First 4 technologies
                "compliance": scope["compliance_requirements"][:3] # First 3 compliance items
            }
            
            demo_data.append(demo_project)
        
        return demo_data
    
    def create_demo_showcase(self):
        """Create a demo showcase file for easy testing."""
        demo_data = self.get_demo_data()
        
        if not demo_data:
            print("❌ No demo data available")
            return
            
        showcase_file = self.sample_dir / "demo_showcase.json"
        
        showcase = {
            "title": "AI Project Artifact Generator - Demo Showcase",
            "description": "Pre-configured project data for quick testing and demonstration",
            "generated_at": datetime.now().isoformat(),
            "projects": demo_data,
            "usage_instructions": {
                "web_ui": "Use these projects as templates in the AI Project Artifact Generator web interface",
                "api": "Send these project scopes to /api/ai-project-generator/generate-documents endpoint",
                "testing": "Perfect for automated testing and QA validation"
            }
        }
        
        with open(showcase_file, 'w', encoding='utf-8') as f:
            json.dump(showcase, f, indent=2)
        
        print(f"✅ Created demo showcase: {showcase_file}")
        print(f"📊 Included {len(demo_data)} demo projects")
        
        return showcase_file

def main():
    loader = SampleDataLoader()
    
    print("🔍 Analyzing available sample data...")
    print()
    
    # List available files
    loader.list_available_files()
    print()
    
    # Print summary
    loader.print_sample_summary()
    print()
    
    # Create demo showcase
    loader.create_demo_showcase()

if __name__ == "__main__":
    main()