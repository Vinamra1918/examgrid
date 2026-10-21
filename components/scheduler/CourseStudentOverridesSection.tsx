'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  GraduationCap,
  Layers,
  ListFilter,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { Course, ExamSessionConfig, Student } from '@/lib/types'
import * as XLSX from 'xlsx'

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

const sampleOverrideRows = [
  { 'Course Code': 'CS-604-E1', 'Roll No': '23CS001', 'Student Name': 'Aarav Sharma' },
  { 'Course Code': 'CS-604-E1', 'Roll No': '23CS002', 'Student Name': 'Diya Patel' },
  { 'Course Code': 'CS-604-E1', 'Roll No': '23CS015', 'Student Name': 'Rohan Gupta' },
  { 'Course Code': 'CS-701-E2', 'Roll No': '22CS005', 'Student Name': 'Vikram Rathore' },
  { 'Course Code': 'CS-701-E2', 'Roll No': '22CS010', 'Student Name': 'Neha Sharma' },
]

export function CourseStudentOverridesSection({
  courses,
  students,
  config,
  setConfig,
  isOpen = true,
  onToggleOpen,
  sectionNumber = '8',
}: {
  courses: Course[]
  students: Student[]
  config: ExamSessionConfig
  setConfig: React.Dispatch<React.SetStateAction<ExamSessionConfig>>
  isOpen?: boolean
  onToggleOpen?: () => void
  sectionNumber?: string
}) {
  const activeCourses = useMemo(() => courses.filter((c) => c.included !== false), [courses])
  const activeStudents = useMemo(() => students.filter((s) => s.included !== false), [students])

  // Selected course for override editing
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(activeCourses[0]?.code || '')
  const [courseSearch, setCourseSearch] = useState('')

  // Textarea input for roll numbers
  const [manualRollNumbersText, setManualRollNumbersText] = useState('')

  // Excel state
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [importMessage, setImportMessage] = useState('')

  const courseOverrides = config.courseStudentOverrides || {}
  const overriddenCourseCodes = Object.keys(courseOverrides).filter(
    (code) => (courseOverrides[code] || []).length > 0
  )

  const selectedCourse = activeCourses.find((c) => c.code === selectedCourseCode) || activeCourses[0]

  // Default eligible students for selected course (standard semester cohort)
  const defaultStudentsForSelectedCourse = useMemo(() => {
    if (!selectedCourse) return []
    const c = selectedCourse
    return activeStudents.filter((s) => {
      if (c.semester && s.semester) {
        const cSem = c.semester.replace(/[^0-9]/g, '')
        const sSem = s.semester.replace(/[^0-9]/g, '')
        if (cSem && sSem && cSem === sSem) return true
      }
      if (s.enrolledCourseCodes && s.enrolledCourseCodes.includes(c.code)) return true
      return s.year === c.year && (!c.semester || !s.semester)
    })
  }, [selectedCourse, activeStudents])

  const currentOverrideForSelected = selectedCourse ? courseOverrides[selectedCourse.code] : undefined
  const isSelectedOverridden = Boolean(currentOverrideForSelected && currentOverrideForSelected.length > 0)

  // Download sample template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(sampleOverrideRows)
    XLSX.utils.book_append_sheet(wb, ws, 'CourseOverrides')
    XLSX.writeFile(wb, 'course_student_override_template.xlsx')
  }

  // Parse roll numbers from raw text (comma, newline, or space separated)
  const parseRollNumbers = (text: string): string[] => {
    return Array.from(
      new Set(
        text
          .split(/[\s,;\n]+/)
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      )
    )
  }

  // Apply manual text roll numbers to selected course
  const handleApplyManualOverride = () => {
    if (!selectedCourse) return
    const rolls = parseRollNumbers(manualRollNumbersText)
    if (rolls.length === 0) {
      alert('Please enter at least one student roll number to apply an override.')
      return
    }

    setConfig((prev) => ({
      ...prev,
      courseStudentOverrides: {
        ...(prev.courseStudentOverrides || {}),
        [selectedCourse.code]: rolls,
      },
    }))
    setManualRollNumbersText('')
    setImportMessage(`Applied custom override: ${rolls.length} students assigned to ${selectedCourse.code}.`)
  }

  // Remove override for a course (reverts to default semester cohort)
  const handleRemoveOverride = (courseCode: string) => {
    setConfig((prev) => {
      const updated = { ...(prev.courseStudentOverrides || {}) }
      delete updated[courseCode]
      return {
        ...prev,
        courseStudentOverrides: updated,
      }
    })
    setImportMessage(`Reset ${courseCode} to standard semester enrollment.`)
  }

  // Clear all overrides
  const handleClearAllOverrides = () => {
    if (confirm('Are you sure you want to revert all courses back to standard semester enrollment?')) {
      setConfig((prev) => ({
        ...prev,
        courseStudentOverrides: {},
      }))
      setImportMessage('All courses reverted to standard semester cohort enrollment.')
    }
  }

  // Excel Import (supports both single course file and multi-course batch file)
  const handleExcelImport = async () => {
    if (!excelFile) return
    try {
      const workbook = XLSX.read(await excelFile.arrayBuffer(), { type: 'array' })
      const sheetNames = ['courseoverrides', 'overrides', 'students', 'enrollment', 'sheet1']
      const target =
        workbook.SheetNames.find((name) => sheetNames.includes(name.trim().toLowerCase())) ||
        workbook.SheetNames.find((name) => {
          const lower = name.trim().toLowerCase()
          return sheetNames.some((sn) => lower.includes(sn))
        }) ||
        workbook.SheetNames[0]

      if (!target) {
        setImportMessage('Workbook contains no usable student sheet.')
        return
      }

      const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[target], { defval: '' })
      if (!rows.length) {
        setImportMessage('No rows found in the selected sheet.')
        return
      }

      // Check if rows have Course Code column (batch override mode)
      const hasCourseCodeColumn = rows.some((row) =>
        getExcelValue(row, 'courseCode', 'course code', 'course', 'subject code')
      )

      if (hasCourseCodeColumn) {
        // Group roll numbers by course code
        const batchMap: Record<string, string[]> = { ...(config.courseStudentOverrides || {}) }
        let totalAssigned = 0

        rows.forEach((row) => {
          const cCode = getExcelValue(row, 'courseCode', 'course code', 'course', 'subject code').toUpperCase().trim()
          const roll = getExcelValue(row, 'rollNo', 'roll no', 'roll', 'enrollment', 'student id', 'roll_no').toUpperCase().trim()
          if (cCode && roll) {
            if (!batchMap[cCode]) batchMap[cCode] = []
            if (!batchMap[cCode].includes(roll)) {
              batchMap[cCode].push(roll)
              totalAssigned++
            }
          }
        })

        setConfig((prev) => ({
          ...prev,
          courseStudentOverrides: batchMap,
        }))
        setImportMessage(`Batch imported ${totalAssigned} student enrollments across courses.`)
      } else {
        // Single course override mode -> assign to selectedCourse
        if (!selectedCourse) {
          setImportMessage('Please select a course to apply the uploaded student list to.')
          return
        }

        const rolls: string[] = []
        rows.forEach((row) => {
          const roll = getExcelValue(row, 'rollNo', 'roll no', 'roll', 'enrollment', 'student id', 'roll_no').toUpperCase().trim()
          if (roll && !rolls.includes(roll)) {
            rolls.push(roll)
          }
        })

        if (rolls.length === 0) {
          setImportMessage('No valid student roll numbers found in Excel file.')
          return
        }

        setConfig((prev) => ({
          ...prev,
          courseStudentOverrides: {
            ...(prev.courseStudentOverrides || {}),
            [selectedCourse.code]: rolls,
          },
        }))
        setImportMessage(`Successfully assigned ${rolls.length} students to ${selectedCourse.code}.`)
      }
    } catch {
      setImportMessage('Could not read file. Please select a valid .xlsx or .xls file.')
    }
  }

  // Filter courses for dropdown / selector
  const filteredCourses = useMemo(() => {
    if (!courseSearch) return activeCourses
    const q = courseSearch.toLowerCase()
    return activeCourses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.semester || '').toLowerCase().includes(q)
    )
  }, [activeCourses, courseSearch])

  return (
    <section
      id="sec-course-overrides"
      className="scroll-mt-36 rounded-2xl border border-sky-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-sky-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
            <Users className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {sectionNumber}. Course-Specific Student Enrollment Overrides
              </h3>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                {overriddenCourseCodes.length} courses overridden
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Normally all students in a semester take that semester's exams. Use this section to designate specific student lists for electives, re-evaluations, or special cohorts via Excel or Roll Numbers.
            </p>
          </div>
        </div>
        {onToggleOpen && (
          <button
            onClick={onToggleOpen}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Course Overrides section"
          >
            {isOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-6 flex flex-col gap-6">
          {/* ========================================================================= */}
          {/* PART 1: COURSE SELECTOR & ENROLLMENT STATUS BANNER */}
          {/* ========================================================================= */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="size-4 text-sky-600" />
                  Select Course to Configure Student List
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pick a subject to view its default semester enrollment or provide a custom student roster.
                </p>
              </div>

              {overriddenCourseCodes.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllOverrides}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                >
                  <Trash2 className="size-3.5" /> Revert All Courses to Default
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search course code or name..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <select
                  aria-label="Select course"
                  value={selectedCourse?.code || ''}
                  onChange={(e) => setSelectedCourseCode(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                >
                  {filteredCourses.map((c) => {
                    const hasOvr = (courseOverrides[c.code] || []).length > 0
                    return (
                      <option key={c.code} value={c.code}>
                        {c.code} – {c.name} {hasOvr ? '(Custom Override Active)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Status Badge Card */}
              {selectedCourse && (
                <div
                  className={`rounded-xl border p-3 flex items-center justify-between ${
                    isSelectedOverridden
                      ? 'border-sky-300 bg-sky-50/80'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Enrollment Mode
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isSelectedOverridden ? (
                        <>
                          <CheckCircle2 className="size-4 text-sky-600" />
                          <span className="text-xs font-bold text-sky-900">
                            Custom Override ({currentOverrideForSelected?.length} Students)
                          </span>
                        </>
                      ) : (
                        <>
                          <Users className="size-4 text-slate-500" />
                          <span className="text-xs font-semibold text-slate-700">
                            Default ({defaultStudentsForSelectedCourse.length} Students)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {isSelectedOverridden && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOverride(selectedCourse.code)}
                      className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PART 2 & 3: EXCEL UPLOAD & MANUAL ROLL NUMBER INPUT */}
          {/* ========================================================================= */}
          {selectedCourse && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Option A: Excel Import Panel */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-950 flex items-center gap-1.5">
                      <Upload className="size-3.5 text-sky-600" />
                      Option 1: Upload Excel Roster for {selectedCourse.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-white px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100/70 shadow-2xs transition-colors"
                      title="Download sample template (.xlsx)"
                    >
                      <Download className="size-3" /> Sample Template
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Upload an Excel file with a <b>Roll No</b> column. If a <b>Course Code</b> column is present, it will batch override all matching courses in one go!
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50">
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

                    <button
                      type="button"
                      onClick={handleExcelImport}
                      disabled={!excelFile}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs"
                    >
                      <Upload className="size-3.5" /> Apply from Excel
                    </button>
                  </div>
                </div>

                {importMessage && (
                  <p role="status" className="mt-3 text-xs font-medium text-sky-900 border-t border-sky-200/60 pt-2">
                    {importMessage}
                  </p>
                )}
              </div>

              {/* Option B: Manual Roll Number Input */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
                    <GraduationCap className="size-3.5 text-slate-500" />
                    Option 2: Paste or Type Roll Numbers for {selectedCourse.code}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Enter student roll numbers separated by commas, spaces, or lines (e.g. <code>23CS001, 23CS002, 23CS015</code>).
                  </p>
                  <textarea
                    rows={3}
                    placeholder="e.g. 23CS001, 23CS002, 23CS003..."
                    value={manualRollNumbersText}
                    onChange={(e) => setManualRollNumbersText(e.target.value)}
                    className="mt-2.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {parseRollNumbers(manualRollNumbersText).length} roll numbers entered
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyManualOverride}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                  >
                    <Check className="size-3.5" /> Apply Student Override
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PART 4: DIRECTORY CARDS OF ALL CONFIGURED OVERRIDES */}
          {/* ========================================================================= */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ListFilter className="size-4 text-sky-600" />
                Active Course Overrides Directory ({overriddenCourseCodes.length} Courses)
              </span>
              <span className="text-xs text-slate-500">
                All unlisted courses will use their standard semester cohort enrollment automatically.
              </span>
            </div>

            {overriddenCourseCodes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No custom course overrides active yet. All courses are currently scheduled with their default semester cohorts.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {overriddenCourseCodes.map((cCode) => {
                  const courseObj = courses.find((c) => c.code === cCode)
                  const rolls = courseOverrides[cCode] || []
                  return (
                    <div
                      key={cCode}
                      className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/40 to-white p-3.5 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-900">
                              {cCode}
                            </span>
                            <h4 className="mt-1 text-xs font-bold text-slate-900 line-clamp-1">
                              {courseObj?.name || cCode}
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              {courseObj?.year || 'General'} · {courseObj?.semester || ''}
                            </span>
                          </div>

                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            {rolls.length} Students
                          </span>
                        </div>

                        {/* Roll numbers chips preview */}
                        <div className="mt-3 flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                          {rolls.slice(0, 8).map((roll) => (
                            <span
                              key={roll}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-slate-700"
                            >
                              {roll}
                            </span>
                          ))}
                          {rolls.length > 8 && (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                              +{rolls.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedCourseCode(cCode)}
                          className="text-[11px] font-semibold text-sky-700 hover:text-sky-900"
                        >
                          Edit Override
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOverride(cCode)}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
