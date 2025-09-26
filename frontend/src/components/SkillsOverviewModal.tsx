import React from 'react'
import { X, Users, TrendingUp, Award, Star } from 'lucide-react'

interface SkillData {
  skill: string
  count: number
  percentage: number
}

interface SkillsOverviewModalProps {
  skillsData: {
    organization_id: string
    total_members_with_skills: number
    unique_skills_count: number
    top_skills: SkillData[]
  }
  onClose: () => void
}

const SkillsOverviewModal: React.FC<SkillsOverviewModalProps> = ({ skillsData, onClose }) => {
  const getSkillColor = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800',
      'bg-gray-100 text-gray-800'
    ]
    return colors[index % colors.length]
  }

  const getProgressWidth = (percentage: number) => {
    return Math.max(percentage, 5) // Minimum width for visibility
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Organization Skills Overview</h2>
                <p className="text-sm text-gray-600">
                  Skills distribution across your organization's teams
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{skillsData.total_members_with_skills}</p>
              <p className="text-sm text-blue-800">Team Members with Skills</p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{skillsData.unique_skills_count}</p>
              <p className="text-sm text-green-800">Unique Skills</p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg text-center">
              <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                {skillsData.top_skills.length > 0 ? skillsData.top_skills[0].count : 0}
              </p>
              <p className="text-sm text-purple-800">
                Most Common Skill
                {skillsData.top_skills.length > 0 && (
                  <span className="block font-medium">{skillsData.top_skills[0].skill}</span>
                )}
              </p>
            </div>
          </div>

          {/* Top Skills */}
          {skillsData.top_skills.length > 0 ? (
            <div>
              <div className="flex items-center mb-6">
                <Star className="h-5 w-5 text-yellow-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Top Skills in Organization</h3>
              </div>

              <div className="space-y-4">
                {skillsData.top_skills.map((skill, index) => (
                  <div key={skill.skill} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-sm font-medium mr-3">
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{skill.skill}</span>
                        <span className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSkillColor(index)}`}>
                          {skill.count} {skill.count === 1 ? 'person' : 'people'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 font-medium">{skill.percentage}%</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressWidth(skill.percentage)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Skill Categories */}
              <div className="mt-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Skills by Category</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {skillsData.top_skills.map((skill, index) => (
                    <div
                      key={skill.skill}
                      className={`p-3 rounded-lg text-center ${getSkillColor(index)}`}
                    >
                      <p className="font-medium text-sm">{skill.skill}</p>
                      <p className="text-xs opacity-75">{skill.count} members</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights */}
              <div className="mt-8 bg-blue-50 p-6 rounded-lg">
                <h4 className="text-md font-semibold text-blue-900 mb-3">Skills Insights</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                  <div>
                    <p className="font-medium mb-1">Coverage:</p>
                    <p>
                      {((skillsData.total_members_with_skills / Math.max(skillsData.total_members_with_skills, 1)) * 100).toFixed(1)}% 
                      of team members have documented skills
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Diversity:</p>
                    <p>
                      {(skillsData.unique_skills_count / Math.max(skillsData.total_members_with_skills, 1)).toFixed(1)} 
                      average skills per member
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Specialization:</p>
                    <p>
                      {skillsData.top_skills.filter(s => s.count === 1).length} unique specialized skills
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Common Skills:</p>
                    <p>
                      {skillsData.top_skills.filter(s => s.percentage > 20).length} skills shared by 20%+ of members
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Skills Data</h3>
              <p className="text-gray-600">
                Start adding skills to team members to see insights here.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Data reflects skills documented in team member profiles
            </p>
            <button
              onClick={onClose}
              className="btn-outline text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SkillsOverviewModal