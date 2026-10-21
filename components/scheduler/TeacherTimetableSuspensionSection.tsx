'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  Filter,
  GraduationCap,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import {
  ClassSuspensionConfig,
  ExamSessionConfig,
  Teacher,
  TeacherScheduleEntry,
} from '@/lib/types'
import { isClassSuspended } from '@/lib/scheduler-engine'
import * as XLSX from 'xlsx'

type ExcelMergeMode = 'replace' | 'merge_unique' | 'merge_all'
type ExcelRow = Record<string, unknown>

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

const ALL_COHORTS = [
  'B.Tech - 1st Year',
  'B.Tech - 2nd Year',
  'B.Tech - 3rd Year',
  'B.Tech - 4th Year',
  'M.Tech - 1st Year',
  'M.Tech - 2nd Year',
]

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const sampleTimetableRows = [
  {
    'Teacher / TA Name': 'Dr. Urjita Thakar',
    'Day': 'Monday',
    'Start Time': '09:30',
    'End Time': '10:30',
    'Program': 'B.Tech',
    'Year': '3rd Year',
    'Course Code': 'CS-501',
    'Course Name': 'Theory of Computation',
    'Room / Lab': 'LT-101',
  },
  {
    'Teacher / TA Name': 'Dr. Urjita Thakar',
    'Day': 'Tuesday',
    'Start Time': '11:30',
    'End Time': '12:30',
    'Program': 'B.Tech',
    'Year': '1st Year',
    'Course Code': 'CS-101',
    'Course Name': 'Programming Fundamentals',
    'Room / Lab': 'LT-102',
  },
  {
    'Teacher / TA Name': 'Dr. D. A. Mehta',
    'Day': 'Monday',
    'Start Time': '11:30',
    'End Time': '12:30',
    'Program': 'B.Tech',
    'Year': '4th Year',
    'Course Code': 'CS-701-E2',
    'Course Name': 'Computational Intelligence',
    'Room / Lab': 'LT-201',
  },
  {
    'Teacher / TA Name': 'Mr. Surendra Gupta',
    'Day': 'Wednesday',
    'Start Time': '09:30',
    'End Time': '10:30',
    'Program': 'B.Tech',
    'Year': '2nd Year',
    'Course Code': 'CS-301',
    'Course Name': 'OOPS',
    'Room / Lab': 'LT-103',
  },
  {
    'Teacher / TA Name': 'Aarav Sharma',
    'Day': 'Monday',
    'Start Time': '09:30',
    'End Time': '11:30',
    'Program': 'B.Tech',
    'Year': '3rd Year',
    'Course Code': 'CS-504-LAB',
    'Course Name': 'Operating Systems Lab',
    'Room / Lab': 'GCL',
  },
  {
    'Teacher / TA Name': 'Pooja Verma',
    'Day': 'Thursday',
    'Start Time': '14:00',
    'End Time': '16:00',
    'Program': 'B.Tech',
    'Year': '1st Year',
    'Course Code': 'CS-102-LAB',
    'Course Name': 'Programming Lab',
    'Room / Lab': 'SWL',
  },
]

export function TeacherTimetableSuspensionSection({
  config,
  setConfig,
  teachers,
  teachingAssistants,
  isOpen = true,
  onToggleOpen,
  sectionNumber = '7',
}: {
  config: ExamSessionConfig
  setConfig: React.Dispatch<React.SetStateAction<ExamSessionConfig>>
  teachers: Teacher[]
  teachingAssistants: Teacher[]
  isOpen?: boolean
  onToggleOpen?: () => void
  sectionNumber?: string
}) {
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<ExcelMergeMode>('merge_unique')
  const [importMessage, setImportMessage] = useState('')

  // Search & filter states for routine timetable directory
  const [searchQuery, setSearchQuery] = useState('')
  const [dayFilter, setDayFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<'All' | 'suspended' | 'active'>('All')

  // Quick-add state for a single routine entry
  const [newEntry, setNewEntry] = useState<Partial<TeacherScheduleEntry>>({
    teacherName: '',
    dayOfWeek: 'Monday',
    startTime: '09:30',
    endTime: '10:30',
    program: 'B.Tech',
    year: '3rd Year',
    courseCode: '',
    courseName: '',
    room: '',
  })
  const [newCourseCodeToSuspend, setNewCourseCodeToSuspend] = useState('')

  const timetableEntries = config.teacherTimetableEntries || []
  const suspensionConfig = config.classSuspensionConfig || {
    suspendedCohorts: [],
    suspendedCourses: [],
  }

  // Combine teachers and TAs for easy dropdown selection
  const allStaff = useMemo(() => {
    const list: { id: string; name: string; role: 'teacher' | 'ta'; department: string }[] = []
    teachers.forEach((t) => list.push({ id: t.id, name: t.name, role: 'teacher', department: t.department }))
    teachingAssistants.forEach((ta) => list.push({ id: ta.id, name: ta.name, role: 'ta', department: ta.department }))
    return list
  }, [teachers, teachingAssistants])

  // Toggle a cohort suspension
  const toggleCohortSuspension = (cohort: string) => {
    const current = suspensionConfig.suspendedCohorts || []
    const updated = current.includes(cohort)
      ? current.filter((c) => c !== cohort)
      : [...current, cohort]

    setConfig((prev) => ({
      ...prev,
      classSuspensionConfig: {
        ...suspensionConfig,
        suspendedCohorts: updated,
      },
    }))
  }

  // Bulk cohort toggles
  const suspendAllBTech = () => {
    const btechCohorts = ALL_COHORTS.filter((c) => c.startsWith('B.Tech'))
    const merged = Array.from(new Set([...(suspensionConfig.suspendedCohorts || []), ...btechCohorts]))
    setConfig((prev) => ({
      ...prev,
      classSuspensionConfig: { ...suspensionConfig, suspendedCohorts: merged },
    }))
  }

  const suspendExamCohorts = () => {
    const examYears = ['B.Tech - 2nd Year', 'B.Tech - 3rd Year', 'B.Tech - 4th Year', 'M.Tech - 1st Year']
    const merged = Array.from(new Set([...(suspensionConfig.suspendedCohorts || []), ...examYears]))
    setConfig((prev) => ({
      ...prev,
      classSuspensionConfig: { ...suspensionConfig, suspendedCohorts: merged },
    }))
  }

  const resumeAllClasses = () => {
    setConfig((prev) => ({
      ...prev,
      classSuspensionConfig: { ...suspensionConfig, suspendedCohorts: [] },
    }))
  }

  // Add / remove specific course code from suspension
  const addCourseSuspension = () => {
    const code = newCourseCodeToSuspend.trim().toUpperCase()
    if (!code) return
    const current = suspensionConfig.suspendedCourses || []
    if (!current.includes(code)) {
      setConfig((prev) => ({
        ...prev,
        classSuspensionConfig: {
          ...suspensionConfig,
          suspendedCourses: [...current, code],
        },
      }))
    }
    setNewCourseCodeToSuspend('')
  }

  const removeCourseSuspension = (code: string) => {
    setConfig((prev) => ({
      ...prev,
      classSuspensionConfig: {
        ...suspensionConfig,
        suspendedCourses: (suspensionConfig.suspendedCourses || []).filter((c) => c !== code),
      },
    }))
  }

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(sampleTimetableRows)
    XLSX.utils.book_append_sheet(wb, ws, 'RoutineTimetable')
    XLSX.writeFile(wb, 'teacher_routine_timetable_template.xlsx')
  }

  // Excel Import for Routine Timetable
  const handleExcelImport = async () => {
    if (!excelFile) return
    try {
      const workbook = XLSX.read(await excelFile.arrayBuffer(), { type: 'array' })
      const sheetNames = ['timetable', 'routine', 'classes', 'schedule', 'teaching', 'sheet1']
      const target =
        workbook.SheetNames.find((name) => sheetNames.includes(name.trim().toLowerCase())) ||
        workbook.SheetNames.find((name) => {
          const lower = name.trim().toLowerCase()
          return sheetNames.some((sn) => lower.includes(sn))
        }) ||
        workbook.SheetNames[0]

      if (!target) {
        setImportMessage('Workbook contains no usable timetable sheet.')
        return
      }

      const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[target], { defval: '' })
      if (!rows.length) {
        setImportMessage('No rows found in the selected sheet.')
        return
      }

      const incoming: TeacherScheduleEntry[] = rows
        .filter((row) =>
          getExcelValue(
            row,
            'teacherName',
            'teacher / ta name',
            'faculty name',
            'ta name',
            'teacher',
            'faculty',
            'name',
            'instructor'
          )
        )
        .map((row, idx) => {
          const tName = getExcelValue(
            row,
            'teacherName',
            'teacher / ta name',
            'faculty name',
            'ta name',
            'teacher',
            'faculty',
            'name',
            'instructor'
          )
          const matchedStaff = allStaff.find(
            (s) => s.name.trim().toLowerCase() === tName.trim().toLowerCase()
          )

          const progRaw = getExcelValue(row, 'program', 'degree', 'stream', 'prog').trim() || 'B.Tech'
          const yearRaw = getExcelValue(row, 'year', 'academic year', 'yr', 'class year').trim() || '3rd Year'

          return {
            id: `tt_excel_${Date.now()}_${idx}`,
            teacherName: matchedStaff?.name || tName,
            teacherId: matchedStaff?.id,
            role: matchedStaff?.role || (tName.toLowerCase().includes('ta') ? 'ta' : 'teacher'),
            dayOfWeek: getExcelValue(row, 'dayOfWeek', 'day', 'day of week', 'weekday') || 'Monday',
            startTime: getExcelValue(row, 'startTime', 'start time', 'from', 'start', 'time from') || '09:30',
            endTime: getExcelValue(row, 'endTime', 'end time', 'to', 'end', 'time to') || '10:30',
            program: progRaw,
            year: yearRaw.includes('Year') ? yearRaw : `${yearRaw} Year`,
            courseCode: getExcelValue(row, 'courseCode', 'course code', 'course', 'subject code', 'code').toUpperCase(),
            courseName: getExcelValue(row, 'courseName', 'course name', 'subject', 'title'),
            room: getExcelValue(row, 'room', 'room / lab', 'venue', 'hall', 'lab'),
          }
        })

      if (!incoming.length) {
        setImportMessage('No valid timetable rows found. Teacher name is required.')
        return
      }

      setConfig((prev) => {
        let updated: TeacherScheduleEntry[] = []
        if (importMode === 'replace') {
          updated = incoming
        } else if (importMode === 'merge_unique') {
          const existingKeys = new Set(
            (prev.teacherTimetableEntries || []).map(
              (e) => `${e.teacherName.toLowerCase()}|${e.dayOfWeek.toLowerCase()}|${e.startTime}`
            )
          )
          const filteredIncoming = incoming.filter(
            (e) => !existingKeys.has(`${e.teacherName.toLowerCase()}|${e.dayOfWeek.toLowerCase()}|${e.startTime}`)
          )
          updated = [...(prev.teacherTimetableEntries || []), ...filteredIncoming]
        } else {
          updated = [...(prev.teacherTimetableEntries || []), ...incoming]
        }
        return {
          ...prev,
          teacherTimetableEntries: updated,
        }
      })

      setImportMessage(`Successfully imported ${incoming.length} routine class rows.`)
    } catch {
      setImportMessage('Could not read file. Please select a valid .xlsx or .xls file.')
    }
  }

  // Quick add single class
  const handleAddSingleEntry = () => {
    if (!newEntry.teacherName) {
      alert('Please select or specify a teacher or teaching assistant name.')
      return
    }

    const matchedStaff = allStaff.find(
      (s) => s.name.trim().toLowerCase() === newEntry.teacherName?.trim().toLowerCase()
    )

    const entryToAdd: TeacherScheduleEntry = {
      id: `tt_${Date.now()}`,
      teacherName: newEntry.teacherName.trim(),
      teacherId: matchedStaff?.id,
      role: matchedStaff?.role || (newEntry.role || 'teacher'),
      dayOfWeek: newEntry.dayOfWeek || 'Monday',
      startTime: newEntry.startTime || '09:30',
      endTime: newEntry.endTime || '10:30',
      program: newEntry.program || 'B.Tech',
      year: newEntry.year || '3rd Year',
      courseCode: (newEntry.courseCode || '').toUpperCase().trim(),
      courseName: newEntry.courseName || '',
      room: newEntry.room || '',
    }

    setConfig((prev) => ({
      ...prev,
      teacherTimetableEntries: [...(prev.teacherTimetableEntries || []), entryToAdd],
    }))

    // Reset some fields for quick repeated entry
    setNewEntry((prev) => ({
      ...prev,
      courseCode: '',
      courseName: '',
      room: '',
    }))
  }

  // Delete entry
  const handleDeleteEntry = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      teacherTimetableEntries: (prev.teacherTimetableEntries || []).filter((e) => e.id !== id),
    }))
  }

  // Clear all
  const handleClearAllEntries = () => {
    if (confirm('Are you sure you want to remove all uploaded routine timetable entries?')) {
      setConfig((prev) => ({
        ...prev,
        teacherTimetableEntries: [],
      }))
    }
  }

  // Filtered entries for the directory view
  const filteredEntries = useMemo(() => {
    return timetableEntries.filter((entry) => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = entry.teacherName.toLowerCase().includes(q)
        const matchCourse = (entry.courseCode || '').toLowerCase().includes(q) || (entry.courseName || '').toLowerCase().includes(q)
        const matchRoom = (entry.room || '').toLowerCase().includes(q)
        if (!matchName && !matchCourse && !matchRoom) return false
      }

      // Day filter
      if (dayFilter !== 'All') {
        if (!entry.dayOfWeek.toLowerCase().startsWith(dayFilter.toLowerCase().slice(0, 3))) {
          return false
        }
      }

      // Suspension status filter
      if (statusFilter !== 'All') {
        const isSusp = isClassSuspended(entry, suspensionConfig)
        if (statusFilter === 'suspended' && !isSusp) return false
        if (statusFilter === 'active' && isSusp) return false
      }

      return true
    })
  }, [timetableEntries, searchQuery, dayFilter, statusFilter, suspensionConfig])

  // Count suspended vs active classes
  const suspendedCount = timetableEntries.filter((e) => isClassSuspended(e, suspensionConfig)).length
  const activeClassCount = timetableEntries.length - suspendedCount

  return (
    <section
      id="sec-routine-timetable"
      className="scroll-mt-36 rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Clock3 className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {sectionNumber}. Faculty & TA Routine Timetable & Class Suspension Matrix
              </h3>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                {timetableEntries.length} classes registered
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                {suspendedCount} suspended (free for duty)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Upload teacher & TA timetables in Excel format. Choose which academic years have classes suspended during exams. Teachers are allocated invigilation duty when they have no classes or their class cohort is suspended.
            </p>
          </div>
        </div>
        {onToggleOpen && (
          <button
            onClick={onToggleOpen}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Timetable & Suspension section"
          >
            {isOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-6 flex flex-col gap-6">
          {/* ========================================================================= */}
          {/* PART 1: CLASS SUSPENSION MATRIX (COHORTS & YEARS) */}
          {/* ========================================================================= */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-indigo-600" />
                  Program & Academic Year Class Suspension Controls
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select which cohort classes are suspended during this exam session. Teachers teaching suspended classes become eligible for invigilation duties.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={suspendExamCohorts}
                  className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-2xs"
                >
                  Suspend Exam Cohorts (2nd–4th Yr)
                </button>
                <button
                  type="button"
                  onClick={suspendAllBTech}
                  className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-2xs"
                >
                  Suspend All B.Tech
                </button>
                <button
                  type="button"
                  onClick={resumeAllClasses}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  Resume All
                </button>
              </div>
            </div>

            {/* Cohorts Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {ALL_COHORTS.map((cohort) => {
                const isSuspended = (suspensionConfig.suspendedCohorts || []).includes(cohort)
                return (
                  <button
                    key={cohort}
                    type="button"
                    onClick={() => toggleCohortSuspension(cohort)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isSuspended
                        ? 'border-emerald-300 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-400/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-slate-900">{cohort}</span>
                      <div
                        className={`size-4 rounded-md flex items-center justify-center border transition-colors ${
                          isSuspended
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSuspended && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="mt-2">
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="size-3 text-emerald-600" /> Classes Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
                          <Clock3 className="size-3 text-amber-500" /> Active Regular Classes
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Optional Specific Course Suspension */}
            <div className="mt-4 border-t border-slate-200/80 pt-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Specific Course Suspensions (Optional):
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(suspensionConfig.suspendedCourses || []).map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800 border border-purple-200"
                  >
                    {code} (Suspended)
                    <button
                      type="button"
                      onClick={() => removeCourseSuspension(code)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. CS-301"
                    value={newCourseCodeToSuspend}
                    onChange={(e) => setNewCourseCodeToSuspend(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCourseSuspension()}
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addCourseSuspension}
                    className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PART 2: EXCEL ROUTINE TIMETABLE IMPORT */}
          {/* ========================================================================= */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                Import Timetable from Excel
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-2.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/70 shadow-xs transition-colors"
                title="Download sample Routine Timetable Excel template (.xlsx)"
              >
                <Download className="size-3.5" /> Sample Template (.xlsx)
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50">
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
                aria-label="Timetable import mode"
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as ExcelMergeMode)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              >
                <option value="merge_unique">Add new entries (skip duplicates)</option>
                <option value="replace">Replace all routine timetable</option>
                <option value="merge_all">Add all entries</option>
              </select>
              <button
                onClick={handleExcelImport}
                disabled={!excelFile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="size-3.5" /> Import Timetable
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Columns: Teacher / TA Name, Day (e.g. Monday), Start Time, End Time, Program (B.Tech / M.Tech), Year (1st, 2nd, 3rd, 4th), Course Code, Room
            </p>
            {importMessage && (
              <p role="status" className="mt-2 text-xs font-medium text-indigo-900">
                {importMessage}
              </p>
            )}
          </div>

          {/* ========================================================================= */}
          {/* PART 3: QUICK ADD SINGLE ROUTINE CLASS */}
          {/* ========================================================================= */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Add Single Routine Class
            </span>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
              <div className="lg:col-span-2">
                <span className="text-[10px] text-slate-500 font-semibold">Teacher / TA</span>
                <input
                  type="text"
                  list="staff-list"
                  placeholder="Select or type teacher name"
                  value={newEntry.teacherName}
                  onChange={(e) => setNewEntry({ ...newEntry, teacherName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <datalist id="staff-list">
                  {allStaff.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.role.toUpperCase()} - {s.department})
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Day of Week</span>
                <select
                  value={newEntry.dayOfWeek}
                  onChange={(e) => setNewEntry({ ...newEntry, dayOfWeek: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Start Time</span>
                <input
                  type="time"
                  value={newEntry.startTime}
                  onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold">End Time</span>
                <input
                  type="time"
                  value={newEntry.endTime}
                  onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Program</span>
                <select
                  value={newEntry.program}
                  onChange={(e) => setNewEntry({ ...newEntry, program: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="MCA">MCA</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Year</span>
                <select
                  value={newEntry.year}
                  onChange={(e) => setNewEntry({ ...newEntry, year: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddSingleEntry}
                  className="w-full flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
                >
                  <Plus className="size-4" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PART 4: ROUTINE TIMETABLE DIRECTORY & DIRECT FILTER */}
          {/* ========================================================================= */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search teacher, course, room..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <select
                  aria-label="Filter by day"
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                >
                  <option value="All">All Days</option>
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by suspension status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'All' | 'suspended' | 'active')}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                >
                  <option value="All">All Statuses ({timetableEntries.length})</option>
                  <option value="suspended">Suspended - Free for Exam Duty ({suspendedCount})</option>
                  <option value="active">Active Class - Busy Teaching ({activeClassCount})</option>
                </select>
              </div>

              {timetableEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllEntries}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                >
                  <Trash2 className="size-3.5" /> Clear All Timetable
                </button>
              )}
            </div>

            {/* Entries Table */}
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No routine timetable entries match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs text-[11px] font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Teacher / TA</th>
                      <th className="px-4 py-2.5">Day & Time</th>
                      <th className="px-4 py-2.5">Program & Year</th>
                      <th className="px-4 py-2.5">Subject / Room</th>
                      <th className="px-4 py-2.5">Exam Duty Allocation Status</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredEntries.map((entry) => {
                      const isSusp = isClassSuspended(entry, suspensionConfig)
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{entry.teacherName}</span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                                  entry.role === 'ta'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {entry.role === 'ta' ? 'TA' : 'Faculty'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-slate-800">{entry.dayOfWeek}</span>
                            <span className="text-slate-400 ml-1.5 text-[11px]">
                              {entry.startTime} – {entry.endTime}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                              {entry.program} · {entry.year}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-slate-800">{entry.courseCode || '—'}</span>
                            {entry.room && <span className="text-slate-400 ml-1">({entry.room})</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {isSusp ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="size-3 text-emerald-600" />
                                Class Suspended (Available for Exam Duty)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                <Clock3 className="size-3 text-amber-600" />
                                Active Class (Busy Teaching · No Duty)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete entry"
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
            )}
          </div>
        </div>
      )}
    </section>
  )
}
