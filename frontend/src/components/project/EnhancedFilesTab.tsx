import React, { useState } from 'react'
import { 
  Upload, Search, Filter, Grid, List, Download, Eye, 
  Trash2, Share, Star, Clock, User, File, FileText, 
  Image, Video, Archive, Code, Plus, MoreVertical,
  FolderPlus, Folder, ChevronRight, ArrowUpDown, X
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ProjectFile {
  id: string
  name: string
  type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'other'
  size: number
  url?: string
  uploaded_by: string
  uploaded_at: string
  modified_at: string
  version: number
  description?: string
  tags?: string[]
  folder?: string
  is_public: boolean
  download_count: number
}

interface EnhancedFilesTabProps {
  project: any
  files?: ProjectFile[]
  users: any[]
  onFileUpload?: (files: FileList) => void
  onFileDelete?: (fileId: string) => void
  onFileShare?: (fileId: string) => void
}

const EnhancedFilesTab: React.FC<EnhancedFilesTabProps> = ({
  project,
  files = [],
  users,
  onFileUpload,
  onFileDelete,
  onFileShare
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([])

  // Mock file data for demonstration
  const mockFiles: ProjectFile[] = [
    {
      id: 'file-1',
      name: 'Project Requirements.pdf',
      type: 'document',
      size: 2456789,
      uploaded_by: 'demo-user-001',
      uploaded_at: '2024-12-01T10:30:00Z',
      modified_at: '2024-12-01T10:30:00Z',
      version: 1,
      description: 'Initial project requirements document',
      tags: ['requirements', 'specifications'],
      folder: 'Documents',
      is_public: false,
      download_count: 12
    },
    {
      id: 'file-2',
      name: 'Architecture Diagram.png',
      type: 'image',
      size: 1234567,
      uploaded_by: 'demo-user-001',
      uploaded_at: '2024-12-02T14:15:00Z',
      modified_at: '2024-12-02T14:15:00Z',
      version: 2,
      description: 'System architecture overview',
      tags: ['architecture', 'design'],
      folder: 'Design',
      is_public: true,
      download_count: 8
    },
    {
      id: 'file-3',
      name: 'Demo Presentation.pptx',
      type: 'document',
      size: 5678901,
      uploaded_by: 'demo-user-001',
      uploaded_at: '2024-12-03T09:45:00Z',
      modified_at: '2024-12-03T16:20:00Z',
      version: 3,
      description: 'Client presentation materials',
      tags: ['presentation', 'demo'],
      folder: 'Presentations',
      is_public: false,
      download_count: 25
    },
    {
      id: 'file-4',
      name: 'source-code.zip',
      type: 'archive',
      size: 12345678,
      uploaded_by: 'demo-user-001',
      uploaded_at: '2024-12-04T11:20:00Z',
      modified_at: '2024-12-04T11:20:00Z',
      version: 1,
      description: 'Latest source code backup',
      tags: ['code', 'backup'],
      folder: 'Development',
      is_public: false,
      download_count: 5
    }
  ]

  const allFiles = [...files, ...mockFiles, ...uploadedFiles]

  // Handle file upload
  const handleFileUpload = (fileList: FileList) => {
    const newFiles: ProjectFile[] = Array.from(fileList).map((file, index) => {
      // Determine file type based on extension
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      let fileType: ProjectFile['type'] = 'other'
      
      if (['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx'].includes(extension)) {
        fileType = 'document'
      } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
        fileType = 'image'
      } else if (['mp4', 'avi', 'mov', 'mkv'].includes(extension)) {
        fileType = 'video'
      } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
        fileType = 'audio'
      } else if (['zip', 'rar', 'tar', 'gz'].includes(extension)) {
        fileType = 'archive'
      } else if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(extension)) {
        fileType = 'code'
      }

      return {
        id: `uploaded-${Date.now()}-${index}`,
        name: file.name,
        type: fileType,
        size: file.size,
        uploaded_by: 'current-user',
        uploaded_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
        version: 1,
        description: `Uploaded file: ${file.name}`,
        tags: [],
        folder: selectedFolder || 'Root',
        is_public: false,
        download_count: 0
      }
    })

    setUploadedFiles([...uploadedFiles, ...newFiles])
    setShowUploadModal(false)
    toast.success(`${newFiles.length} file(s) uploaded successfully!`)
    
    if (onFileUpload) {
      onFileUpload(fileList)
    }
  }

  // Handle new folder creation
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }

    toast.success(`Folder "${newFolderName}" created successfully!`)
    setNewFolderName('')
    setShowNewFolderModal(false)
  }

  const getFileIcon = (type: string) => {
    const icons = {
      document: FileText,
      image: Image,
      video: Video,
      audio: File,
      archive: Archive,
      code: Code,
      other: File
    }
    return icons[type as keyof typeof icons] || File
  }

  const getFileTypeColor = (type: string) => {
    const colors = {
      document: 'text-red-600 bg-red-50',
      image: 'text-green-600 bg-green-50',
      video: 'text-purple-600 bg-purple-50',
      audio: 'text-blue-600 bg-blue-50',
      archive: 'text-yellow-600 bg-yellow-50',
      code: 'text-gray-600 bg-gray-50',
      other: 'text-gray-600 bg-gray-50'
    }
    return colors[type as keyof typeof colors] || colors.other
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.name || 'Unknown User'
  }

  const folders = [...new Set(allFiles.map(file => file.folder).filter(Boolean))]

  const filteredFiles = allFiles
    .filter(file => {
      if (searchTerm && !file.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (typeFilter !== 'all' && file.type !== typeFilter) {
        return false
      }
      if (selectedFolder && file.folder !== selectedFolder) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0 && onFileUpload) {
      onFileUpload(droppedFiles)
    }
  }

  const FileCard: React.FC<{ file: ProjectFile }> = ({ file }) => {
    const FileIcon = getFileIcon(file.type)
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-3 rounded-lg ${getFileTypeColor(file.type)}`}>
            <FileIcon className="w-6 h-6" />
          </div>
          
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 hover:bg-gray-100 rounded">
              <Eye className="w-4 h-4 text-gray-500" />
            </button>
            <button className="p-1 hover:bg-gray-100 rounded">
              <Download className="w-4 h-4 text-gray-500" />
            </button>
            <button className="p-1 hover:bg-gray-100 rounded">
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="mb-3">
          <h4 className="font-medium text-gray-900 text-sm mb-1 truncate" title={file.name}>
            {file.name}
          </h4>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        </div>
        
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {getUserName(file.uploaded_by).charAt(0)}
          </div>
          <span className="text-xs text-gray-500 truncate">
            {getUserName(file.uploaded_by)}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatDate(file.uploaded_at)}</span>
          <div className="flex items-center space-x-1">
            {file.is_public && <Share className="w-3 h-3" />}
            <span>v{file.version}</span>
          </div>
        </div>
        
        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {file.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  const FileListItem: React.FC<{ file: ProjectFile }> = ({ file }) => {
    const FileIcon = getFileIcon(file.type)
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={selectedFiles.includes(file.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedFiles([...selectedFiles, file.id])
              } else {
                setSelectedFiles(selectedFiles.filter(id => id !== file.id))
              }
            }}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          
          <div className={`p-2 rounded-lg ${getFileTypeColor(file.type)}`}>
            <FileIcon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
            <p className="text-sm text-gray-500">
              {file.description || 'No description'}
            </p>
          </div>
          
          <div className="text-sm text-gray-500 text-right">
            <div>{formatFileSize(file.size)}</div>
            <div className="text-xs">{formatDate(file.uploaded_at)}</div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>v{file.version}</span>
            <span>•</span>
            <span>{file.download_count} downloads</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Eye className="w-4 h-4 text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-4 h-4 text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Project Files ({filteredFiles.length})
          </h2>
          <p className="text-gray-600 mt-1">Manage project documents and assets</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
          
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Types</option>
              <option value="document">Documents</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="archive">Archives</option>
              <option value="code">Code</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="type">Type</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedFolder('')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
              selectedFolder === '' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>All Files</span>
          </button>
          
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                selectedFolder === folder ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>{folder}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedFiles.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-900">
              {selectedFiles.length} file(s) selected
            </span>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm text-primary-700 hover:text-primary-900 transition-colors">
                Download
              </button>
              <button className="px-3 py-1 text-sm text-primary-700 hover:text-primary-900 transition-colors">
                Move
              </button>
              <button className="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files Content */}
      <div
        className={`${dragOver ? 'border-primary-500 bg-primary-50' : 'border-transparent'} border-2 border-dashed rounded-lg transition-colors`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {filteredFiles.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map(file => (
                <FileCard key={file.id} file={file} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map(file => (
                <FileListItem key={file.id} file={file} />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || typeFilter !== 'all' || selectedFolder
                ? 'No files match your criteria'
                : 'No files uploaded yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {dragOver
                ? 'Drop files here to upload'
                : 'Upload files by clicking the button above or dragging them here'}
            </p>
            {!searchTerm && typeFilter === 'all' && !selectedFolder && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Upload Your First File
              </button>
            )}
          </div>
        )}
      </div>

      {/* File Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {allFiles.length}
          </div>
          <div className="text-sm text-gray-600">Total Files</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {formatFileSize(allFiles.reduce((sum, file) => sum + file.size, 0))}
          </div>
          <div className="text-sm text-gray-600">Total Size</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {allFiles.filter(f => f.is_public).length}
          </div>
          <div className="text-sm text-gray-600">Public Files</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {allFiles.reduce((sum, file) => sum + file.download_count, 0)}
          </div>
          <div className="text-sm text-gray-600">Downloads</div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Files</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Drag and drop files here, or click to select files
              </p>
              <input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files)
                  }
                }}
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors cursor-pointer inline-block"
              >
                Select Files
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedFilesTab