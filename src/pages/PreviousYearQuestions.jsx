import { useState, useEffect } from 'react'
import { Search, Download, FileQuestion, SlidersHorizontal, Upload, Trash2, Loader2, FileText } from 'lucide-react'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import UploadModal from '../components/common/UploadModal'
import { getApprovedMaterials, downloadMaterialFile, deleteMaterial } from '../services/materialsService'
import { getCurrentUser } from '../services/authService'

const SEMESTERS = ['All', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8']

export default function PreviousYearQuestions() {
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [semester, setSemester] = useState('All')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const fetchPapers = async () => {
    setLoading(true)
    const { data } = await getApprovedMaterials({ category: 'question_papers' })
    setPapers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPapers()
    getCurrentUser().then(setCurrentUser)
  }, [])

  const isAdmin = currentUser?.profile?.role === 'admin'

  const filtered = papers.filter((p) => {
    const q = search.toLowerCase()
    return (
      (semester === 'All' || p.semester === semester) &&
      (p.title.toLowerCase().includes(q) || (p.subject && p.subject.toLowerCase().includes(q)))
    )
  })

  const handleDownload = async (paper) => {
    setActionLoadingId(paper.id)
    await downloadMaterialFile(paper.file_path, paper.file_name || `${paper.title}.pdf`)
    setActionLoadingId(null)
  }

  const handleDelete = async (paper) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${paper.title}"?`)) return
    setActionLoadingId(paper.id)
    const res = await deleteMaterial(paper.id, paper.file_path)
    if (res.success) {
      setPapers(papers.filter((p) => p.id !== paper.id))
    } else {
      alert(`Failed to delete: ${res.error}`)
    }
    setActionLoadingId(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-concrete-900 flex items-center gap-2 tracking-tight">
            <FileQuestion className="w-6 h-6 text-amber-600" />
            Previous Year Question Papers
          </h1>
          <p className="text-sm text-concrete-600 mt-1">
            {filtered.length} paper{filtered.length !== 1 ? 's' : ''} available
          </p>
        </div>

        <Button
          variant="accent"
          size="md"
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 shadow-md self-start sm:self-auto cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Question Paper</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-concrete-200/80 shadow-sm p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-concrete-400" />
          <input
            type="text"
            placeholder="Search by subject code, subject name, or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-concrete-50 border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 text-concrete-900 placeholder-concrete-400"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <SlidersHorizontal className="w-4 h-4 text-concrete-400" />
          <span className="text-xs font-semibold text-concrete-600 uppercase tracking-wider">Semester:</span>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="text-xs border border-concrete-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 text-concrete-700 font-medium cursor-pointer"
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-concrete-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-600" />
          <p className="text-sm font-medium text-concrete-600">Loading question papers from database...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-concrete-200 p-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <FileQuestion className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-concrete-800">No question papers uploaded yet</p>
          <p className="text-xs text-concrete-500 mt-1 max-w-sm mx-auto">
            Upload past university or mid-term question papers in PDF format to help fellow students prepare.
          </p>
          <Button
            variant="accent"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="mt-4 inline-flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload the First Paper</span>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((paper) => (
            <div
              key={paper.id}
              className="bg-white rounded-2xl border border-concrete-200/80 shadow-sm p-5 card-hover flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <Badge variant="amber">{paper.semester}</Badge>
                    <Badge variant="concrete">{paper.file_extension?.toUpperCase() || 'PDF'}</Badge>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-concrete-900 leading-snug mb-1">
                  {paper.title}
                </h3>
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  {paper.subject}
                </p>

                {paper.description && (
                  <p className="text-xs text-concrete-600 line-clamp-2 mb-3">
                    {paper.description}
                  </p>
                )}

                <div className="text-xs text-concrete-500 space-y-0.5 mb-4">
                  <p>Uploaded by {paper.profiles?.full_name || 'Student'} · {new Date(paper.created_at).toLocaleDateString()}</p>
                  <p>{paper.file_size_bytes ? `${(paper.file_size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'PDF'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-concrete-100">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => handleDownload(paper)}
                  disabled={actionLoadingId === paper.id}
                  className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {actionLoadingId === paper.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download</span>
                </Button>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(paper)}
                    disabled={actionLoadingId === paper.id}
                    title="Admin Delete"
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultCategory="question_papers"
        onUploadSuccess={() => fetchPapers()}
      />
    </div>
  )
}
