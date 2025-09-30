import React from 'react'
import ProjectFilter from './ProjectFilter'
import { useProjectFilterContext } from '../../contexts/ProjectFilterContext'

interface GlobalProjectFilterProps {
  className?: string
  placeholder?: string
  label?: string
  multiSelect?: boolean
  showAllOption?: boolean
  disabled?: boolean
}

/**
 * Global Project Filter Component
 * Uses the ProjectFilterContext to manage selected projects across the entire application
 */
const GlobalProjectFilter: React.FC<GlobalProjectFilterProps> = ({
  className = '',
  placeholder = 'All Projects',
  label = 'Filter by Project',
  multiSelect = false,
  showAllOption = true,
  disabled = false
}) => {
  const { 
    selectedProject, 
    setSelectedProject, 
    error 
  } = useProjectFilterContext()

  return (
    <ProjectFilter
      selectedProject={selectedProject}
      onProjectChange={setSelectedProject}
      showAllOption={showAllOption}
      placeholder={placeholder}
      className={className}
      label={label}
      multiSelect={multiSelect}
      disabled={disabled}
      error={error}
    />
  )
}

export default GlobalProjectFilter