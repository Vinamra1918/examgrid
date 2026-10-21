'use client'

import { useState } from 'react'
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  GraduationCap,
  Plus,
  Search,
  Square,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react'
import { Teacher } from '@/lib/types'
import * as XLSX from 'xlsx'

type ExcelMergeMode = 'replace' | 'merge_unique' | 'merge_all'
type ExcelRow = Record<string, unknown>

const facultySampleRows = [
  {
    'Faculty Name': 'Dr. Urjita Thakar',
    'Designation': 'Professor & Head',
    'Department': 'CSE',
    'Priority Rank': 1,
    'Max Duties': 6,
  },
  {
    'Faculty Name': 'Dr. D.A. Mehta',
    'Designation': 'Professor',
    'Department': 'CSE',
    'Priority Rank': 1,
    'Max Duties': 6,
  },
  {
    'Faculty Name': 'Prof. Surendra Gupta',
    'Designation': 'Associate Professor',
    'Department': 'CSE',
    'Priority Rank': 2,
    'Max Duties': 8,
  },
  {
    'Faculty Name': 'Prof. Neha Sharma',
    'Designation': 'Assistant Professor',
    'Department': 'CSE',
    'Priority Rank': 2,
    'Max Duties': 10,
  },
]

const getExcelValue = (row: ExcelRow, ...names: string[]) => {
  const normalized = new Map(
    Object.entries(row).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ''),
      value,
    ])
  )
  for (const name of names) {
    const value = normalized.get(name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function mergeImported<T>(
  current: T[],
  incoming: T[],
  mode: ExcelMergeMode,
  getKey: (item: T) => string
) {
  if (mode === 'replace') return incoming
  if (mode === 'merge_all') return [...current, ...incoming]
  const keys = new Set<string>()
  return [...current, ...incoming].filter((item) => {
    const key = getKey(item)
    if (!key || keys.has(key)) return false
    keys.add(key)
    return true
  })
}

interface FacultyRegistryProps {
  teachers: Teacher[]
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>
  isOpen?: boolean
  onToggleOpen?: () => void
  hideSectionHeader?: boolean
  sectionNumber?: string | number
}

export function FacultyRegistry({
  teachers,
  setTeachers,
  isOpen = true,
  onToggleOpen,
  hideSectionHeader = false,
  sectionNumber = '5',
}: FacultyRegistryProps) {
  const [teacherSearch, setTeacherSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [newTeacher, setNewTeacher] = useState<Partial<Teacher>>({
    name: '',
    department: 'CSE',
    designation: 'Assistant Professor',
    priority: 2,
    maxDuties: 6,
  })

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<ExcelMergeMode>('replace')
  const [importMessage, setImportMessage] = useState('')

  const activeTeachersCount = teachers.filter((t) => t.included !== false).length
  const uniqueDepartments = ['All', ...Array.from(new Set(teachers.map((t) => t.department))).filter(Boolean)]

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.department.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      (t.designation || '').toLowerCase().includes(teacherSearch.toLowerCase())
    const matchesDept = deptFilter === 'All' || t.department === deptFilter
    return matchesSearch && matchesDept
  })

  const handleAddTeacher = () => {
    if (!newTeacher.name?.trim()) return
    const added: Teacher = {
      id: `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newTeacher.name.trim(),
      department: newTeacher.department || 'CSE',
      designation: newTeacher.designation || 'Assistant Professor',
      priority: Number(newTeacher.priority) || 2,
      maxDuties: Number(newTeacher.maxDuties) || 6,
      included: true,
    }
    setTeachers((prev) => [...prev, added])
    setNewTeacher({
      name: '',
      department: newTeacher.department || 'CSE',
      designation: 'Assistant Professor',
      priority: 2,
      maxDuties: 6,
    })
  }

  const toggleAllTeachers = (included: boolean) => {
    setTeachers((prev) => prev.map((t) => ({ ...t, included })))
  }

  const toggleTeacherInclusion = (id: string) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, included: t.included === false } : t))
    )
  }

  const updateTeacherPriority = (id: string, newPriority: number | string) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: newPriority } : t))
    )
  }

  const updateTeacherMaxDuties = (id: string, maxDuties: number) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, maxDuties } : t))
    )
  }

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(facultySampleRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty')
    XLSX.writeFile(wb, 'faculty_sample_template.xlsx')
  }

  const handleExcelImport = async () => {
    if (!excelFile) return
    try {
      const workbook = XLSX.read(await excelFile.arrayBuffer(), { type: 'array' })
      const sheetNames = ['faculty', 'teachers', 'teacher', 'professors', 'staff', 'sheet1']
      const target =
        workbook.SheetNames.find((name) =>
          sheetNames.includes(name.trim().toLowerCase())
        ) ||
        workbook.SheetNames.find((name) => {
          const lower = name.trim().toLowerCase()
          return sheetNames.some((sn) => lower.includes(sn))
        }) ||
        workbook.SheetNames[0]

      if (!target) {
        setImportMessage('Workbook contains no usable faculty sheet.')
        return
      }

      const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[target], { defval: '' })
      if (!rows.length) {
        setImportMessage('No rows found in the selected sheet.')
        return
      }

      const incoming: Teacher[] = rows
        .filter((row) =>
          getExcelValue(
            row,
            'name',
            'faculty name',
            'teacher name',
            'faculty',
            'teacher',
            'professor',
            'prof name',
            'full name',
            'staff name',
            'faculty_name'
          )
        )
        .map((row, idx) => ({
          id: `excel_faculty_${Date.now()}_${idx}`,
          name: getExcelValue(
            row,
            'name',
            'faculty name',
            'teacher name',
            'faculty',
            'teacher',
            'professor',
            'prof name',
            'full name'
          ),
          designation:
            getExcelValue(row, 'designation', 'desig', 'role', 'title', 'position') ||
            'Assistant Professor',
          department:
            getExcelValue(row, 'department', 'dept', 'branch') || 'CSE',
          priority:
            Number(
              getExcelValue(
                row,
                'priority',
                'priority rank',
                'rank',
                'seniority',
                'level'
              )
            ) || 2,
          maxDuties:
            Number(
              getExcelValue(
                row,
                'maxDuties',
                'max duties',
                'duties',
                'max duty',
                'duty limit'
              )
            ) || 6,
          included: true,
        }))

      if (!incoming.length) {
        setImportMessage('No valid faculty rows found. Faculty name is required.')
        return
      }

      setTeacherSearch('')
      setTeachers((current) =>
        mergeImported(
          current,
          incoming,
          importMode,
          (t) => `${t.name.trim().toLowerCase()}|${t.department.trim().toLowerCase()}`
        )
      )
      setImportMessage(`Successfully imported ${incoming.length} faculty members.`)
    } catch {
      setImportMessage('Could not read file. Please select a valid .xlsx or .xls file.')
    }
  }

  return (
    <section
      id="sec-teachers"
      className="scroll-mt-36 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {!hideSectionHeader && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <UserCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {sectionNumber}. Faculty Registry & Priority Dispersal
                </h3>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                  {activeTeachersCount} of {teachers.length} active in duty roster
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {teachers.length} teachers registered. Senior professors (Priority 1) are strategically dispersed across exam rooms.
              </p>
            </div>
          </div>
          {onToggleOpen && (
            <button
              onClick={onToggleOpen}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Faculty section"
            >
              {isOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
            </button>
          )}
        </div>
      )}

      {isOpen && (
        <div className="mt-6 flex flex-col gap-6">
          {/* Excel Import Panel for Faculty */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                Import Faculty from Excel
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-2.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100/70 shadow-xs transition-colors"
                title="Download sample Faculty Excel template (.xlsx)"
              >
                <Download className="size-3.5" /> Sample Template (.xlsx)
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50">
                <Upload className="size-4" />
                {excelFile?.name || 'Choose .xlsx / .xls'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="sr-only"
                  onChange={(e) => {
                    setExcelFile(e.target.files?.[0] || null)
                    setImportMessage('')
                  }}
                />
              </label>
              <select
                aria-label="Faculty import mode"
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as ExcelMergeMode)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              >
                <option value="replace">Replace current faculty</option>
                <option value="merge_unique">Add and remove duplicates</option>
                <option value="merge_all">Add and keep duplicates</option>
              </select>
              <button
                onClick={handleExcelImport}
                disabled={!excelFile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="size-3.5" /> Import Faculty
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Sheet: faculty / teachers · Columns: Faculty Name, Designation, Department, Priority Rank, Max Duties
            </p>
            {importMessage && (
              <p role="status" className="mt-2 text-xs font-medium text-purple-900">
                {importMessage}
              </p>
            )}
          </div>

          {/* Quick Add Teacher Form */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Add Faculty / Teacher
            </span>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Teacher Name</span>
                <input
                  type="text"
                  placeholder="e.g. Dr. Urjita Thakar"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Designation</span>
                <input
                  type="text"
                  placeholder="e.g. Professor & Head"
                  value={newTeacher.designation}
                  onChange={(e) => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Department</span>
                <input
                  type="text"
                  placeholder="e.g. CSE"
                  value={newTeacher.department}
                  onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Priority Rank (1 = Top)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newTeacher.priority}
                  onChange={(e) => setNewTeacher({ ...newTeacher, priority: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-bold"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddTeacher}
                  disabled={!newTeacher.name}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="size-4" />
                  Add Faculty
                </button>
              </div>
            </div>
          </div>

          {/* Teachers Table with Batch Toggles & Filters */}
          <div>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search faculty name, dept, desig..."
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                {uniqueDepartments.length > 2 && (
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none"
                  >
                    {uniqueDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d === 'All' ? 'All Departments' : d}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAllTeachers(true)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <CheckSquare className="size-3.5 text-purple-600" />
                  Include All Faculty
                </button>
                <button
                  onClick={() => toggleAllTeachers(false)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Square className="size-3.5 text-slate-400" />
                  Exclude All
                </button>
              </div>
            </div>

            <div className="mt-3 max-h-[30rem] overflow-y-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-36">Include in Build</th>
                    <th className="py-2.5 px-3">Faculty Name</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 w-36">Priority Rank (1 = Senior)</th>
                    <th className="py-2.5 px-3 w-28">Max Duties</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTeachers.map((t) => {
                    const isIncluded = t.included !== false
                    return (
                      <tr
                        key={t.id}
                        className={`transition-colors ${
                          isIncluded ? 'hover:bg-slate-50/80' : 'bg-slate-50/60 opacity-60'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => toggleTeacherInclusion(t.id)}
                              className="size-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <span
                              className={`text-[11px] font-bold ${
                                isIncluded ? 'text-purple-700' : 'text-slate-400'
                              }`}
                            >
                              {isIncluded ? 'Included' : 'Excluded'}
                            </span>
                          </label>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {t.name}
                          {!isIncluded && (
                            <span className="ml-2 text-[10px] text-slate-400 font-normal italic">
                              (Exempt from duties)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {t.designation || 'Faculty'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{t.department}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={t.priority}
                              onChange={(e) => updateTeacherPriority(t.id, Number(e.target.value))}
                              className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-purple-700 text-center focus:border-purple-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400">
                              {Number(t.priority) === 1 ? '🌟 Senior' : `Rank ${t.priority}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={t.maxDuties}
                            onChange={(e) => updateTeacherMaxDuties(t.id, Number(e.target.value))}
                            className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 text-center focus:border-purple-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setTeachers((prev) => prev.filter((item) => item.id !== t.id))}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete Faculty"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
