export interface ProjectScope {
  project_name: string
  project_description: string
  project_objectives: string[]
  target_audience: string
  stakeholders: string[]
  technical_requirements: string[]
  technical_constraints: string[]
  technology_stack: string[]
  timeline: string
  budget_range: string
  priority: string
  business_domain: string
  business_context: string
  success_criteria: string[]
  risks_and_assumptions: string[]
  compliance_requirements: string[]
}

export interface GeneratedDocument {
  document_type: string
  title: string
  content: string
  metadata: {
    project_name: string
    generated_at: string
    domain: string
    priority: string
    timeline: string
    word_count: number
    character_count: number
  }
}

export interface SavedProject {
  id: string
  project_name: string
  project_description: string
  business_domain: string
  priority: string
  document_count: number
  created_at: string
  updated_at: string
  tags: string[]
}

export interface FullSavedProject {
  id: string
  user_id: string
  project_scope: ProjectScope
  generated_documents: GeneratedDocument[]
  created_at: string
  updated_at: string
  tags: string[]
  document_count: number
}

export interface SampleProject {
  id: string
  project_scope: ProjectScope
  document_types: string[]
}
