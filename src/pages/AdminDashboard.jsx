import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, FileQuestion, Upload, TrendingUp, AlertCircle, CheckCircle, Clock, ArrowRight, Plus, Trash2, Download, Loader2, FileText, Image as ImageIcon } from 'lucide-react'
import StatCard from '../components/common/StatCard'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import UploadModal from '../components/common/UploadModal'
import { getAllMaterialsAdmin, downloadMaterialFile, deleteMaterial } from '../services/materialsService'
import { supabase } from '../services/supabase'

export default function AdminDashboard() {
  const [materials, setMaterials] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const loadData = async () => {
    setLoading(true)

    // 1. Fetch real materials
    const { data: mats } = await getAllMaterialsAdmin()
    setMaterials(mats || [])

    // 2. Fetch real student count
    if (supabase) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
      setStudentCount(count || 0)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const notesCount = materials.filter((m) => m.category === 'notes').length
  const pyqCount = materials.filter((m) => m.category === 'question_papers').length
  const totalMaterials = materials.length

  const stats = [
    { icon: Users, label: 'Enrolled Students', value: String(studentCount), color: 'sage', trend: 'registered' },
    { icon: BookOpen, label: 'Total Notes', value: String(notesCount), color: 'sage', trend: 'uploaded' },
    { icon: FileQuestion, label: 'Question Papers', value: String(pyqCount), color: 'amber', trend: 'uploaded' },
    { icon: Upload, label: 'All Materials', value: String(totalMaterials), color: 'amber', trend: 'live files' },
  ]

  const handleDownload = async (item) => {
    setActionLoadingId(item.id)
    await downloadMaterialFile(item.file_path, item.file_name || `${item.title}.pdf`)
    setActionLoadingId(null)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Admin Action: Are you sure you want to permanently delete "${item.title}"? This cannot be undone.`)) {
      return
    }

    setActionLoadingId(item.id)
    const res = await deleteMaterial(item.id, item.file_path)
    if (res.success) {
      setMaterials(materials.filter((m) => m.id !== item.id))
    } else {
      alert(`Delete failed: ${res.error}`)
    }
    setActionLoadingId(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-sage-950 via-sage-900 to-sage-800 rounded-3xl p-7 text-white relative overflow-hidden shadow-lg border border-sage-700/60">
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-0.5 rounded-full font-bold uppercase tracking-wider">
            🛡️ Admin Control Panel
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Admin Dashboard</h1>
        <p className="text-sage-200 text-sm max-w-lg leading-relaxed">
          Manage college resources, oversee student uploads, and permanently remove outdated or inappropriate materials.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="accent"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Material</span>
          </Button>
          <Link to="/notes">
            <Button variant="outline-white" size="sm">
              <BookOpen className="w-4 h-4 text-sage-200" />
              <span>Browse Notes</span>
            </Button>
          </Link>
          <Link to="/pyq">
            <Button variant="outline-white" size="sm">
              <FileQuestion className="w-4 h-4 text-amber-300" />
              <span>View PYQs</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Main content: Materials management */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-concrete-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-sage-600" />
              Uploaded Materials Management ({materials.length})
            </h2>
            <p className="text-xs text-concrete-500 mt-0.5">
              Admins can preview, download, or permanently delete any material from the database and storage.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New</span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-concrete-400">
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-sage-600" />
            <p className="text-sm">Loading materials...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12 bg-concrete-50/60 rounded-2xl border border-dashed border-concrete-200">
            <BookOpen className="w-9 h-9 text-concrete-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-concrete-700">No materials uploaded yet</p>
            <p className="text-xs text-concrete-500 mt-0.5">Click "Upload Material" to publish course notes or past exam papers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-concrete-50/70 border border-concrete-100 hover:bg-sage-50/60 hover:border-sage-200 transition-colors gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${item.category === 'notes' ? 'bg-sage-100 text-sage-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.mime_type && item.mime_type.startsWith('image/') ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-concrete-900 truncate">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-amber-700">{item.subject}</span>
                      <span className="text-concrete-300">·</span>
                      <Badge variant="concrete">{item.semester}</Badge>
                      <Badge variant={item.category === 'notes' ? 'sage' : 'amber'}>
                        {item.category.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-concrete-500">
                        by {item.profiles?.full_name || 'User'} · {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleDownload(item)}
                    disabled={actionLoadingId === item.id}
                    className="flex items-center gap-1.5 cursor-pointer text-xs py-1.5"
                  >
                    {actionLoadingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download</span>
                  </Button>

                  <button
                    onClick={() => handleDelete(item)}
                    disabled={actionLoadingId === item.id}
                    title="Delete Material (Admin only)"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultCategory="notes"
        onUploadSuccess={() => loadData()}
      />
    </div>
  )
}
