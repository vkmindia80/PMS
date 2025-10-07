import React, { useState, useEffect } from 'react'
import { 
  Upload, Search, Filter, Grid, List, Download, Eye, 
  Trash2, Share, Star, Clock, User, File, FileText, 
  Image, Video, Archive, Code, Plus, MoreVertical,
  FolderPlus, Folder, ChevronRight, ArrowUpDown, X, Loader
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { API_ENDPOINTS } from '../../utils/config'

interface ProjectFile {
  id: string
  name: string
  description?: string
  file_type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'other'
  mime_type: string
  size: number
  uploaded_by: string
  download_count: number
  created_at: string
  updated_at: string
}

interface FileStats {
  project_id: string
  total_files: number
  total_size: number
  total_size_mb: number
  file_type_breakdown: Record<string, { count: number; size: number }>
}

interface EnhancedFilesTabProps {
  project: any
  users: any[]
  onFileUpload?: (files: FileList) => void
  onFileDelete?: (fileId: string) => void
  onFileShare?: (fileId: string) => void
}

const EnhancedFilesTab: React.FC<EnhancedFilesTabProps> = ({
  project,
  users,
  onFileUpload,
  onFileDelete,
  onFileShare
}) => {
  const { tokens } = useAuth()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // Real data state
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [stats, setStats] = useState<FileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch files from API
  const fetchFiles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        skip: ((page - 1) * 20).toString(),
        limit: '20'
      })
      
      if (typeFilter !== 'all') {
        params.append('file_type', typeFilter)
      }
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`${API_ENDPOINTS.files.list(project.id)}?${params}`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch files')
      }

      const data = await response.json()
      setFiles(data.files || [])
      setTotalPages(data.total_pages || 1)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
      console.error('Failed to fetch files:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch file statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.files.stats(project.id), {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch file stats:', err)
    }
  }

  useEffect(() => {
    if (project?.id && tokens?.access_token) {
      fetchFiles()
      fetchStats()
    }
  }, [project?.id, tokens?.access_token, page, typeFilter, searchTerm])

  // Handle file upload
  const handleFileUpload = async (fileList: FileList) => {
    if (!fileList.length) return

    setUploading(true)
    const uploadPromises = Array.from(fileList).map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('description', `Uploaded file: ${file.name}`)

      try {
        const response = await fetch(API_ENDPOINTS.files.upload(project.id), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Upload failed')
        }

        return await response.json()
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        throw error
      }
    })

    try {
      await Promise.all(uploadPromises)
      toast.success(`${fileList.length} file(s) uploaded successfully!`)
      setShowUploadModal(false)
      fetchFiles()
      fetchStats()
      
      if (onFileUpload) {
        onFileUpload(fileList)
      }
    } catch (error) {
      toast.error('Some files failed to upload')
    } finally {
      setUploading(false)
    }
  }

  // Handle file deletion
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return
    }

    try {
      const response = await fetch(API_ENDPOINTS.files.delete(project.id, fileId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Delete failed')
      }

      toast.success('File deleted successfully')
      fetchFiles()
      fetchStats()
      
      if (onFileDelete) {
        onFileDelete(fileId)
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
      toast.error('Failed to delete file')
    }
  }

  // Handle file download
  const handleDownloadFile = (fileId: string, fileName: string) => {
    const downloadUrl = API_ENDPOINTS.files.download(project.id, fileId)
    
    // Create a temporary link and click it
    const link = document.createElement('a')
    link.href = `${downloadUrl}?Authorization=${encodeURIComponent(`Bearer ${tokens?.access_token}`)}`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
    return user?.name || user?.first_name + ' ' + user?.last_name || 'Unknown User'
  }

  // Sort and filter files
  const filteredFiles = files
    .filter(file => {
      if (searchTerm && !file.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (typeFilter !== 'all' && file.file_type !== typeFilter) {
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
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'type':
          comparison = a.file_type.localeCompare(b.file_type)
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
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles)
    }
  }

  const FileCard: React.FC<{ file: ProjectFile }> = ({ file }) => {
    const FileIcon = getFileIcon(file.file_type)
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-3 rounded-lg ${getFileTypeColor(file.file_type)}`}>
            <FileIcon className="w-6 h-6" />
          </div>
          
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => handleDownloadFile(file.id, file.name)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Download"
            >
              <Download className="w-4 h-4 text-gray-500" />
            </button>
            <button 
              onClick={() => handleDeleteFile(file.id, file.name)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
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
          <span>{formatDate(file.created_at)}</span>
          <div className="flex items-center space-x-1">
            <span>{file.download_count} downloads</span>
          </div>
        </div>
        
        {file.description && (
          <div className="mt-2">
            <p className="text-xs text-gray-600 truncate" title={file.description}>
              {file.description}
            </p>
          </div>
        )}
      </div>
    )
  }

  const FileListItem: React.FC<{ file: ProjectFile }> = ({ file }) => {
    const FileIcon = getFileIcon(file.file_type)
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
          
          <div className={`p-2 rounded-lg ${getFileTypeColor(file.file_type)}`}>
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
            <div className="text-xs">{formatDate(file.created_at)}</div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{file.download_count} downloads</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => handleDownloadFile(file.id, file.name)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4 text-gray-500" />
            </button>
            <button 
              onClick={() => handleDeleteFile(file.id, file.name)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <X className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Files</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchFiles}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
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
            Project Files ({stats?.total_files || 0})
          </h2>
          <p className="text-gray-600 mt-1">
            Manage project documents and assets
            {stats && ` • ${formatFileSize(stats.total_size)} total`}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={uploading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
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

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <Loader className="w-8 h-8 animate-spin mx-auto text-primary-600 mb-4" />
          <p className="text-gray-600">Loading files...</p>
        </div>
      )}

      {/* Files Content */}
      {!loading && (
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
                {searchTerm || typeFilter !== 'all'
                  ? 'No files match your criteria'
                  : 'No files uploaded yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {dragOver
                  ? 'Drop files here to upload'
                  : 'Upload files by clicking the button above or dragging them here'}
              </p>
              {!searchTerm && typeFilter === 'all' && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  disabled={uploading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  Upload Your First File
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* File Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stats.total_files}
            </div>
            <div className="text-sm text-gray-600">Total Files</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {stats.total_size_mb}MB
            </div>
            <div className="text-sm text-gray-600">Total Size</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {Object.values(stats.file_type_breakdown).reduce((sum, type) => sum + type.count, 0)}
            </div>
            <div className="text-sm text-gray-600">File Types</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {files.reduce((sum, file) => sum + file.download_count, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Downloads</div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Files</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
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
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className={`px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors cursor-pointer inline-block ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? 'Uploading...' : 'Select Files'}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedFilesTab