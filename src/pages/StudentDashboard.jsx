import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, FileQuestion, Download, Clock, TrendingUp, Star, ArrowRight, Layers, Upload, Loader2, FileText, Image as ImageIcon } from 'lucide-react'
import StatCard from '../components/common/StatCard'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import UploadModal from '../components/common/UploadModal'
import { getApprovedMaterials, downloadMaterialFile } from '../services/materialsService'
import { getCurrentUser } from '../services/authService'

export default function StudentDashboard() {
  const [currentUser, setCurrentUser] = useState(null)
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const user = await getCurrentUser()
    setCurrentUser(user)

    const { data } = await getApprovedMaterials()
    setMaterials(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const notesCount = materials.filter((m) => m.category === 'notes').length
  const pyqCount = materials.filter((m) => m.category === 'question_papers').length
  const imageCount = materials.filter((m) => m.category === 'images').length
  const totalCount = materials.length

  const stats = [
    { icon: BookOpen, label: 'Available Notes', value: String(notesCount), color: 'sage', trend: `${notesCount} uploaded` },
    { icon: FileQuestion, label: 'Question Papers', value: String(pyqCount), color: 'amber', trend: `${pyqCount} uploaded` },
    { icon: ImageIcon, label: 'Diagrams & Images', value: String(imageCount), color: 'sage', trend: `${imageCount} uploaded` },
    { icon: Layers, label: 'Total Materials', value: String(totalCount), color: 'amber', trend: 'portal resources' },
  ]

  const quickLinks = [
    { icon: BookOpen, label: 'Browse Notes', to: '/notes', color: 'bg-sage-600' },
    { icon: FileQuestion, label: 'Previous Exams', to: '/pyq', color: 'bg-amber-600' },
    { icon: Upload, label: 'Upload Notes', action: () => setIsUploadOpen(true), color: 'bg-amber-500' },
    { icon: Layers, label: 'All Resources', to: '/notes', color: 'bg-concrete-600' },
  ]

  const handleDownload = async (item) => {
    setActionLoadingId(item.id)
    await downloadMaterialFile(item.file_path, item.file_name || `${item.title}.pdf`)
    setActionLoadingId(null)
  }

  const studentName = currentUser?.profile?.full_name || 'Student'
  const regNo = currentUser?.profile?.register_number

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-sage-800 via-sage-700 to-sage-600 rounded-3xl p-7 text-white relative overflow-hidden shadow-md">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <p className="text-sage-200 text-sm font-medium mb-1">
          {regNo ? `Reg No: ${regNo}` : 'College Student Portal'} 👋
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
          Welcome back, {studentName}!
        </h1>
        <p className="text-sage-100 text-sm max-w-md leading-relaxed">
          Access course notes, download past question papers, and share educational materials with your department.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="white"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="shadow-md text-sage-900 font-semibold cursor-pointer"
          >
            <Upload className="w-4 h-4 text-amber-600" />
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
              <span>View PYQ</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-bold text-concrete-900 mb-4 tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickLinks.map(({ icon: Icon, label, to, action, color }) => {
            const content = (
              <div className="bg-white rounded-2xl border border-concrete-200/80 p-5 flex flex-col items-center gap-3 card-hover text-center cursor-pointer h-full">
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-concrete-800">{label}</span>
              </div>
            )

            return action ? (
              <div key={label} onClick={action}>
                {content}
              </div>
            ) : (
              <Link key={label} to={to}>
                {content}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent materials */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-concrete-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-sage-600" />
            Recent Materials Published
          </h2>
          <Link to="/notes">
            <Button variant="ghost" size="sm">
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-concrete-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sage-600" />
            <p className="text-xs">Loading recent materials...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-10 bg-concrete-50/60 rounded-2xl border border-dashed border-concrete-200">
            <BookOpen className="w-8 h-8 text-concrete-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-concrete-700">No materials published yet</p>
            <p className="text-xs text-concrete-500 mt-0.5">Click "Upload Material" above to upload the first resource.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-xl bg-concrete-50/70 border border-concrete-100 hover:bg-sage-50/60 hover:border-sage-200 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.category === 'notes' ? 'bg-sage-100 text-sage-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.mime_type && item.mime_type.startsWith('image/') ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-concrete-900 group-hover:text-sage-800 truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-amber-800 font-medium">{item.subject}</span>
                      <span className="text-concrete-300">·</span>
                      <Badge variant="concrete">{item.semester}</Badge>
                      <span className="text-xs text-concrete-400">By {item.profiles?.full_name || 'Student'}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => handleDownload(item)}
                  disabled={actionLoadingId === item.id}
                  className="ml-3 flex-shrink-0 flex items-center gap-1 cursor-pointer shadow-sm text-xs"
                >
                  {actionLoadingId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download</span>
                </Button>
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
