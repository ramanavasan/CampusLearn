import { useState } from 'react'
import { X, Upload, FileText, Image as ImageIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Button from './Button'
import { uploadMaterial } from '../../services/materialsService'

const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8']

const CATEGORIES = [
  {
    value: 'notes',
    label: '📒 Lecture Notes',
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt',
    formats: 'PDF, Word, PowerPoint, TXT',
    hint: 'Class notes, handouts, slides',
    maxMB: 50,
  },
  {
    value: 'question_papers',
    label: '📝 Exam Papers / PYQ',
    accept: '.pdf',
    formats: 'PDF only',
    hint: 'Previous year question papers',
    maxMB: 25,
  },
  {
    value: 'images',
    label: '🖼️ Diagrams & Charts',
    accept: '.png,.jpg,.jpeg,.webp',
    formats: 'PNG, JPG, JPEG, WEBP',
    hint: 'Circuit diagrams, mind maps, photos',
    maxMB: 15,
  },
  {
    value: 'study_materials',
    label: '📚 Study Guides & References',
    accept: '.pdf,.doc,.docx,.zip,.txt',
    formats: 'PDF, Word, ZIP, TXT',
    hint: 'Reference books, guides, resources',
    maxMB: 50,
  },
]

export default function UploadModal({ isOpen, onClose, onUploadSuccess, defaultCategory = 'notes' }) {
  const [file, setFile] = useState(null)
  const [subjectCode, setSubjectCode] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [semester, setSemester] = useState('Sem 1')
  const [category, setCategory] = useState(defaultCategory)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen) return null

  // Get the config object for the currently selected category
  const activeCat = CATEGORIES.find((c) => c.value === category) || CATEGORIES[0]

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (!selected) return

    // Validate size against per-category limit
    if (selected.size > activeCat.maxMB * 1024 * 1024) {
      setErrorMsg(`File is too large. Max allowed for "${activeCat.label}" is ${activeCat.maxMB} MB.`)
      return
    }

    // Auto-fill title from file name if empty
    if (!title) {
      const baseName = selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      setTitle(baseName)
    }

    setFile(selected)
    setErrorMsg('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!file) {
      setErrorMsg('Please select a PDF or Image file to upload.')
      return
    }

    if (!subjectCode.trim()) {
      setErrorMsg('Subject Code is required (e.g. CS3401).')
      return
    }

    if (!subjectName.trim()) {
      setErrorMsg('Subject Name is required (e.g. Operating Systems).')
      return
    }

    setLoading(true)
    try {
      const res = await uploadMaterial({
        file,
        subjectCode,
        subjectName,
        semester,
        category,
        title,
        description,
      })

      if (res.success) {
        setSuccessMsg('Material uploaded successfully! It is now available to download.')
        setTimeout(() => {
          if (onUploadSuccess) onUploadSuccess(res.material)
          onClose()
          // Reset form
          setFile(null)
          setSubjectCode('')
          setSubjectName('')
          setTitle('')
          setDescription('')
          setSuccessMsg('')
        }, 1200)
      } else {
        setErrorMsg(res.error || 'Upload failed. Please try again.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during upload.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-concrete-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-sage-50 border-b border-sage-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sage-600 flex items-center justify-center text-white">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-concrete-900 text-lg">Upload Material</h3>
              <p className="text-xs text-concrete-600">Share study resources with the campus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-concrete-400 hover:text-concrete-700 hover:bg-concrete-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* File input box */}
          <div>
            <label className="block text-xs font-semibold text-concrete-700 uppercase tracking-wider mb-1.5">
              Select File <span className="text-amber-600">*</span>
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-concrete-300 rounded-2xl p-4 bg-concrete-50/70 hover:bg-sage-50/50 hover:border-sage-400 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center text-sage-700 flex-shrink-0">
                  {file && file.type.startsWith('image/') ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-concrete-800 truncate">
                    {file ? file.name : `Choose a file to upload`}
                  </p>
                  <p className="text-xs text-concrete-500 mt-0.5">
                    {file
                      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · ${file.name.split('.').pop().toUpperCase()}`
                      : `Accepted: ${activeCat.formats} · Max ${activeCat.maxMB} MB`}
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept={activeCat.accept}
                onChange={handleFileChange}
                className="hidden"
                required
              />
            </label>
            {/* Format pills */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeCat.accept.split(',').map((ext) => (
                <span
                  key={ext}
                  className="text-xs font-semibold bg-sage-100 text-sage-800 px-2 py-0.5 rounded-full border border-sage-200"
                >
                  {ext.replace('.', '').toUpperCase()}
                </span>
              ))}
              <span className="text-xs text-concrete-400 self-center ml-1">accepted</span>
            </div>
          </div>

          {/* Subject Code & Subject Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-concrete-700 uppercase tracking-wider mb-1.5">
                Subject Code <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CS3401"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-concrete-50 border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 text-concrete-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-concrete-700 uppercase tracking-wider mb-1.5">
                Semester <span className="text-amber-600">*</span>
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-concrete-50 border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 text-concrete-900"
              >
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-concrete-700 uppercase tracking-wider mb-1.5">
              Subject Name <span className="text-amber-600">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Database Management Systems"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-concrete-50 border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 text-concrete-900"
            />
          </div>

          {/* Material Category & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-concrete-700 uppercase tracking-wider mb-1.5">
                Category <span className="text-amber-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setFile(null) // reset file when category changes
                  setErrorMsg('')
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-concrete-50 border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 text-concrete-900"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {/* Hint below category */}
              <p className="mt-1.5 text-xs text-concrete-500 flex items-center gap-1">
                <span className="text-amber-500">📌</span>
                {activeCat.hint}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-concrete-700 uppercase tracking-wider mb-1.5">
                Topic / Material Title <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Complete Unit 1-5 Handwritten Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-concrete-50 border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 text-concrete-900"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-concrete-700 uppercase tracking-wider mb-1.5">
              Description <span className="text-concrete-400 text-xs font-normal">(Optional)</span>
            </label>
            <textarea
              rows="2"
              placeholder="Brief summary of topics covered, professor name, or year..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-concrete-50 border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 text-concrete-900"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-concrete-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-semibold text-concrete-600 hover:text-concrete-800 hover:bg-concrete-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              disabled={loading}
              className="flex items-center gap-2 shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload & Publish</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
