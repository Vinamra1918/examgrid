'use client'

import { useState } from 'react'
import {
  AcademicSemester,
  AcademicYear,
  Course,
  ExamSessionConfig,
  Room,
  RoomType,
  Student,
  Teacher,
  TeacherPriority,
} from '@/lib/types'
import {
  defaultCourses,
  defaultExamConfigs,
  defaultRooms,
  defaultStudents,
  defaultTeachers,
} from '@/lib/presets'
import {
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  FlaskConical,
  GraduationCap,
  Layers,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sliders,
  Sparkles,
  Square,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react'
import * as XLSX from 'xlsx'

type ExcelMergeMode = 'replace' | 'merge_unique' | 'merge_all'
type ExcelRow = Record<string, unknown>

const getExcelValue = (row: ExcelRow, ...names: string[]) => {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), value]))
  for (const name of names) {
    const value = normalized.get(name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

const normalizeAcademicYear = (value: string): AcademicYear => {
  const match = value.match(/\b([1-4])(?:st|nd|rd|th)?(?:\s*year)?\b/i)
  if (!match) return (value || '1st Year') as AcademicYear
  return `${match[1]}${match[1] === '1' ? 'st' : match[1] === '2' ? 'nd' : match[1] === '3' ? 'rd' : 'th'} Year` as AcademicYear
}

const normalizeSemester = (value: string) => {
  const match = value.match(/(?:semester|sem)?\s*([1-8])\b/i)
  if (!match) return value || 'Semester 1 (Sem A - Odd)'
  const semesterNumber = Number(match[1])
  const half = semesterNumber % 2 === 1 ? 'A - Odd' : 'B - Even'
  return `Semester ${semesterNumber} (Sem ${half})`
}

function mergeImported<T>(current: T[], incoming: T[], mode: ExcelMergeMode, getKey: (item: T) => string) {
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

function ExcelImportPanel({
  title,
  sheetNames,
  columns,
  onImport,
}: {
  title: string
  sheetNames: string[]
  columns: string
  onImport: (rows: ExcelRow[], mode: ExcelMergeMode) => string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<ExcelMergeMode>('replace')
  const [message, setMessage] = useState('')

  const importFile = async () => {
    if (!file) return
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const target = workbook.SheetNames.find((name) => sheetNames.includes(name.trim().toLowerCase()))
      if (!target) {
        setMessage(`Workbook needs a ${title} sheet.`)
        return
      }
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[target], { defval: '' })
      if (!rows.length) {
        setMessage(`No ${title.toLowerCase()} rows found in that sheet.`)
        return
      }
      setMessage(onImport(rows, mode))
    } catch {
      setMessage('Could not read this workbook. Choose a valid .xlsx or .xls file.')
    }
  }

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-900">Import {title} from Excel</span>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50">
          <Upload className="size-4" />
          {file?.name || 'Choose .xlsx / .xls'}
          <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(event) => {
            setFile(event.target.files?.[0] || null)
            setMessage('')
          }} />
        </label>
        <select aria-label={`${title} import mode`} value={mode} onChange={(event) => setMode(event.target.value as ExcelMergeMode)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
          <option value="replace">Replace current {title.toLowerCase()}</option>
          <option value="merge_unique">Add and remove duplicates</option>
          <option value="merge_all">Add and keep duplicates</option>
        </select>
        <button onClick={importFile} disabled={!file} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">
          <Upload className="size-3.5" /> Import {title}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Sheet: {sheetNames[0]} · Columns: {columns}</p>
      {message && <p role="status" className="mt-2 text-xs font-medium text-sky-900">{message}</p>}
    </div>
  )
}

interface InputsManagementViewProps {
  students: Student[]
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>
  courses: Course[]
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>
  rooms: Room[]
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>
  teachers: Teacher[]
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>
  config: ExamSessionConfig
  setConfig: React.Dispatch<React.SetStateAction<ExamSessionConfig>>
  onSaveAndRerun: () => void
}

export function InputsManagementView({
  students,
  setStudents,
  courses,
  setCourses,
  rooms,
  setRooms,
  teachers,
  setTeachers,
  config,
  setConfig,
  onSaveAndRerun,
}: InputsManagementViewProps) {
  // Search filters
  const [studentSearch, setStudentSearch] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [roomSearch, setRoomSearch] = useState('')
  const [teacherSearch, setTeacherSearch] = useState('')

  // Course Specific Filter states
  const [courseSemFilter, setCourseSemFilter] = useState<string>('All')
  const [courseYearFilter, setCourseYearFilter] = useState<string>('All')
  const [courseDeptFilter, setCourseDeptFilter] = useState<string>('All')

  // Student Specific Filter states
  const [studentSemFilter, setStudentSemFilter] = useState<string>('All')
  const [studentYearFilter, setStudentYearFilter] = useState<string>('All')
  const [studentSectionFilter, setStudentSectionFilter] = useState<string>('All')

  // Section collapse state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    config: true,
    students: true,
    courses: true,
    rooms: true,
    teachers: true,
  })

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Quick jump helper
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Toggle individual inclusion
  const toggleCourseInclusion = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, included: c.included === false ? true : false } : c))
    )
  }

  const toggleAllCourses = (included: boolean) => {
    setCourses((prev) => prev.map((c) => ({ ...c, included })))
  }

  // Batch toggle courses matching specific criteria (Semester, Year, or Department)
  const toggleCoursesByCriterion = (
    criterion: 'semester' | 'year' | 'department',
    value: string,
    included: boolean
  ) => {
    setCourses((prev) =>
      prev.map((c) => {
        let match = false
        if (criterion === 'semester') {
          match = (c.semester || '').toLowerCase().includes(value.toLowerCase())
        } else if (criterion === 'year') {
          match = c.year === value
        } else if (criterion === 'department') {
          match = c.department.toLowerCase() === value.toLowerCase()
        }
        return match ? { ...c, included } : c
      })
    )
  }

  // Toggle all currently filtered courses in or out of the build
  const toggleFilteredCourses = (courseList: Course[], included: boolean) => {
    const ids = new Set(courseList.map((c) => c.id))
    setCourses((prev) =>
      prev.map((c) => (ids.has(c.id) ? { ...c, included } : c))
    )
  }

  // Toggle all courses that have 'lab' in their name or course code or type === 'lab_quiz'
  const toggleLabCourses = (included: boolean) => {
    setCourses((prev) =>
      prev.map((c) => {
        const isLab =
          c.name.toLowerCase().includes('lab') ||
          c.code.toLowerCase().includes('lab') ||
          c.type === 'lab_quiz'
        return isLab ? { ...c, included } : c
      })
    )
  }

  const toggleStudentInclusion = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, included: s.included === false ? true : false } : s))
    )
  }

  const toggleAllStudents = (included: boolean) => {
    setStudents((prev) => prev.map((s) => ({ ...s, included })))
  }

  // Batch toggle students by criterion (Semester, Year, or Section)
  const toggleStudentsByCriterion = (
    criterion: 'semester' | 'year' | 'section',
    value: string,
    included: boolean
  ) => {
    setStudents((prev) =>
      prev.map((s) => {
        let match = false
        if (criterion === 'semester') {
          match = (s.semester || '').toLowerCase().includes(value.toLowerCase())
        } else if (criterion === 'year') {
          match = s.year === value
        } else if (criterion === 'section') {
          match = (s.batch || '').toLowerCase().includes(value.toLowerCase())
        }
        return match ? { ...s, included } : s
      })
    )
  }

  // Toggle all currently filtered students in or out of the build
  const toggleFilteredStudents = (studentList: Student[], included: boolean) => {
    const ids = new Set(studentList.map((s) => s.id))
    setStudents((prev) =>
      prev.map((s) => (ids.has(s.id) ? { ...s, included } : s))
    )
  }

  const toggleRoomInclusion = (id: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, included: r.included === false ? true : false } : r))
    )
  }

  const toggleAllRooms = (included: boolean) => {
    setRooms((prev) => prev.map((r) => ({ ...r, included })))
  }

  const toggleTeacherInclusion = (id: string) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, included: t.included === false ? true : false } : t))
    )
  }

  const toggleAllTeachers = (included: boolean) => {
    setTeachers((prev) => prev.map((t) => ({ ...t, included })))
  }

  // New Student Form
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    rollNo: '',
    year: '1st Year',
    semester: 'Semester 1',
    branch: 'CSE',
    batch: 'Batch A',
    included: true,
  })
  const [newStudentCourseInput, setNewStudentCourseInput] = useState<string>('MATH-101, PHYS-101')

  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.rollNo) return
    const enrolled = newStudentCourseInput
      ? newStudentCourseInput.split(',').map((s) => s.trim().toUpperCase())
      : ['MATH-101', 'PHYS-101']
    const added: Student = {
      id: `s_${Date.now()}`,
      name: newStudent.name,
      rollNo: newStudent.rollNo,
      year: (newStudent.year as AcademicYear) || '1st Year',
      semester: (newStudent.semester as AcademicSemester) || 'Semester 1',
      branch: newStudent.branch || 'CSE',
      batch: newStudent.batch || 'Batch A',
      enrolledCourseCodes: enrolled,
      included: true,
    }
    setStudents((prev) => [added, ...prev])
    setNewStudent({ name: '', rollNo: '', year: '1st Year', semester: 'Semester 1', branch: 'CSE', batch: 'Batch A', included: true })
    setNewStudentCourseInput('MATH-101, PHYS-101')
  }

  // New Course Form
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    code: '',
    name: '',
    year: '1st Year',
    semester: 'Semester 1',
    department: 'CSE',
    type: 'theory',
    priority: 1,
    durationMinutes: 60,
    included: true,
  })

  const handleAddCourse = () => {
    if (!newCourse.code || !newCourse.name) return
    const added: Course = {
      id: `c_${Date.now()}`,
      code: newCourse.code.toUpperCase(),
      name: newCourse.name,
      year: (newCourse.year as AcademicYear) || '1st Year',
      semester: (newCourse.semester as AcademicSemester) || 'Semester 1',
      department: newCourse.department || 'CSE',
      type: newCourse.type || 'theory',
      priority: newCourse.priority || 1,
      durationMinutes: newCourse.durationMinutes || 60,
      included: true,
    }
    setCourses((prev) => [...prev, added])
    setNewCourse({
      code: '',
      name: '',
      year: '1st Year',
      semester: 'Semester 1',
      department: 'CSE',
      type: 'theory',
      priority: 1,
      durationMinutes: 60,
      included: true,
    })
  }

  // New Room Form
  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    name: '',
    code: '',
    building: 'Main Academic Block',
    type: 'classroom',
    totalBenches: 12,
    benchCapacity: 2,
    columns: 2,
    invigilatorsRequired: 1,
    allowSameCourseOnBench: false,
    included: true,
  })

  const handleAddRoom = () => {
    if (!newRoom.name || !newRoom.code) return
    const added: Room = {
      id: `r_${Date.now()}`,
      name: newRoom.name,
      code: newRoom.code.toUpperCase(),
      building: newRoom.building || 'Main Academic Block',
      type: (newRoom.type as RoomType) || 'classroom',
      totalBenches: Number(newRoom.totalBenches) || 12,
      benchCapacity: Number(newRoom.benchCapacity) || 2,
      columns: Number(newRoom.columns) || 2,
      invigilatorsRequired: Number(newRoom.invigilatorsRequired) || 1,
      allowSameCourseOnBench: newRoom.allowSameCourseOnBench || false,
      included: true,
    }
    setRooms((prev) => [...prev, added])
    setNewRoom({
      name: '',
      code: '',
      building: 'Main Academic Block',
      type: 'classroom',
      totalBenches: 12,
      benchCapacity: 2,
      columns: 2,
      invigilatorsRequired: 1,
      allowSameCourseOnBench: false,
      included: true,
    })
  }

  // New Teacher Form
  const [newTeacher, setNewTeacher] = useState<Partial<Teacher>>({
    name: '',
    designation: 'Assistant Professor',
    department: 'CSE',
    priority: 1,
    maxDuties: 6,
    included: true,
  })

  const handleAddTeacher = () => {
    if (!newTeacher.name) return
    const added: Teacher = {
      id: `t_${Date.now()}`,
      name: newTeacher.name,
      designation: newTeacher.designation || 'Assistant Professor',
      department: newTeacher.department || 'CSE',
      priority: Number(newTeacher.priority) || 1,
      maxDuties: Number(newTeacher.maxDuties) || 6,
      included: true,
    }
    setTeachers((prev) => [...prev, added])
    setNewTeacher({
      name: '',
      designation: 'Assistant Professor',
      department: 'CSE',
      priority: 1,
      maxDuties: 6,
      included: true,
    })
  }

  const importStudentRows = (rows: ExcelRow[], mode: ExcelMergeMode) => {
    const incoming: Student[] = rows
      .filter((row) => getExcelValue(row, 'name', 'full name') && getExcelValue(row, 'rollNo', 'roll number', 'roll'))
      .map((row, index) => ({
        id: `s_excel_${Date.now()}_${index}`,
        name: getExcelValue(row, 'name', 'full name'),
        rollNo: getExcelValue(row, 'rollNo', 'roll number', 'roll'),
        year: normalizeAcademicYear(getExcelValue(row, 'year', 'academic year')),
        semester: normalizeSemester(getExcelValue(row, 'semester', 'sem')),
        branch: getExcelValue(row, 'branch', 'department') || 'CSE',
        batch: getExcelValue(row, 'batch', 'section') || 'Batch A',
        enrolledCourseCodes: getExcelValue(row, 'enrolledCourseCodes', 'enrolled courses', 'course codes', 'courses').split(/[,;|]/).map((code) => code.trim().toUpperCase()).filter(Boolean),
        included: true,
      }))
    if (!incoming.length) return 'No valid students found. Name and roll number are required.'
    setStudentSearch('')
    setStudentSemFilter('All')
    setStudentYearFilter('All')
    setStudents((current) => mergeImported(current, incoming, mode, (student) => student.rollNo.trim().toLowerCase()))
    return `Imported ${incoming.length} student row${incoming.length === 1 ? '' : 's'}.`
  }

  const importCourseRows = (rows: ExcelRow[], mode: ExcelMergeMode) => {
    const incoming: Course[] = rows
      .filter((row) => getExcelValue(row, 'code', 'course code') && getExcelValue(row, 'name', 'course name'))
      .map((row, index) => ({
        id: `c_excel_${Date.now()}_${index}`,
        code: getExcelValue(row, 'code', 'course code').toUpperCase(),
        name: getExcelValue(row, 'name', 'course name'),
        year: normalizeAcademicYear(getExcelValue(row, 'year', 'target year')),
        semester: normalizeSemester(getExcelValue(row, 'semester', 'sem', 'target semester', 'target sem')),
        department: getExcelValue(row, 'department', 'dept') || 'CSE',
        type: getExcelValue(row, 'type', 'course type').toLowerCase() === 'lab_quiz' ? 'lab_quiz' : 'theory',
        priority: Number(getExcelValue(row, 'priority')) || 1,
        durationMinutes: Number(getExcelValue(row, 'durationMinutes', 'duration')) || 60,
        included: true,
      }))
    if (!incoming.length) return 'No valid courses found. Course code and name are required.'
    setCourseSearch('')
    setCourseSemFilter('All')
    setCourseYearFilter('All')
    setCourseDeptFilter('All')
    setCourses((current) => mergeImported(current, incoming, mode, (course) => course.code.trim().toLowerCase()))
    return `Imported ${incoming.length} course row${incoming.length === 1 ? '' : 's'}.`
  }

  const importRoomRows = (rows: ExcelRow[], mode: ExcelMergeMode) => {
    const incoming: Room[] = rows
      .filter((row) => getExcelValue(row, 'code', 'room code') && getExcelValue(row, 'name', 'room name'))
      .map((row, index) => {
        const type = getExcelValue(row, 'type', 'room type').toLowerCase()
        return {
          id: `r_excel_${Date.now()}_${index}`,
          code: getExcelValue(row, 'code', 'room code').toUpperCase(),
          name: getExcelValue(row, 'name', 'room name'),
          building: getExcelValue(row, 'building', 'location') || 'Main Academic Block',
          type: (['hall', 'classroom', 'lab'].includes(type) ? type : 'classroom') as RoomType,
          totalBenches: Number(getExcelValue(row, 'totalBenches', 'benches')) || 12,
          benchCapacity: Number(getExcelValue(row, 'benchCapacity', 'seats per bench')) || 2,
          columns: Number(getExcelValue(row, 'columns')) || 2,
          invigilatorsRequired: Number(getExcelValue(row, 'invigilatorsRequired', 'invigilators required')) || 1,
          allowSameCourseOnBench: getExcelValue(row, 'allowSameCourseOnBench').toLowerCase() === 'true',
          included: true,
        }
      })
    if (!incoming.length) return 'No valid rooms found. Room code and name are required.'
    setRoomSearch('')
    setRooms((current) => mergeImported(current, incoming, mode, (room) => room.code.trim().toLowerCase()))
    return `Imported ${incoming.length} room row${incoming.length === 1 ? '' : 's'}.`
  }

  const importTeacherRows = (rows: ExcelRow[], mode: ExcelMergeMode) => {
    const incoming: Teacher[] = rows
      .filter((row) => getExcelValue(row, 'name', 'teacher name', 'faculty name'))
      .map((row, index) => ({
        id: `t_excel_${Date.now()}_${index}`,
        name: getExcelValue(row, 'name', 'teacher name', 'faculty name'),
        designation: getExcelValue(row, 'designation', 'title') || 'Assistant Professor',
        department: getExcelValue(row, 'department', 'dept') || 'CSE',
        priority: Number(getExcelValue(row, 'priority', 'priority rank')) || 1,
        maxDuties: Number(getExcelValue(row, 'maxDuties', 'max duties')) || 6,
        included: true,
      }))
    if (!incoming.length) return 'No valid faculty rows found. Faculty name is required.'
    setTeacherSearch('')
    setTeachers((current) => mergeImported(current, incoming, mode, (teacher) => `${teacher.name.trim().toLowerCase()}|${teacher.department.trim().toLowerCase()}`))
    return `Imported ${incoming.length} faculty row${incoming.length === 1 ? '' : 's'}.`
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

  // Preset switch
  const handleLoadPreset = (type: 'mst' | 'quiz') => {
    setConfig(defaultExamConfigs[type])
    setStudents(defaultStudents.map((s) => ({ ...s, included: true })))
    setCourses(defaultCourses.map((c) => ({ ...c, included: true })))
    setRooms(defaultRooms.map((r) => ({ ...r, included: true })))
    setTeachers(defaultTeachers.map((t) => ({ ...t, included: true })))
  }

  const getSemesterOrder = (sem?: string, year?: string): number => {
    if (!sem && !year) return 99
    const str = `${sem || ''} ${year || ''}`
    const match = str.match(/(?:Semester|Sem)\s*(\d+)/i)
    if (match) return parseInt(match[1], 10)
    if (str.includes('1st Year')) return 1
    if (str.includes('2nd Year')) return 3
    if (str.includes('3rd Year')) return 5
    if (str.includes('4th Year')) return 7
    return 99
  }

  const uniqueStudentSemesters = Array.from(
    new Set(students.map((s) => s.semester || (s.year === '1st Year' ? 'Semester 1' : s.year === '2nd Year' ? 'Semester 3' : s.year === '3rd Year' ? 'Semester 5' : 'Semester 7')))
  ).sort((a, b) => getSemesterOrder(a) - getSemesterOrder(b))

  const uniqueStudentYears = Array.from(new Set(students.map((s) => s.year))).sort()
  const uniqueStudentSections = ['Section A', 'Section B']

  // Filtered lists with Included items first, Excluded items moved to bottom
  const filteredStudents = students
    .filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.branch.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.enrolledCourseCodes.some((c) => c.toLowerCase().includes(studentSearch.toLowerCase()))

      const sSem = s.semester || (s.year === '1st Year' ? 'Semester 1' : s.year === '2nd Year' ? 'Semester 3' : s.year === '3rd Year' ? 'Semester 5' : 'Semester 7')
      const matchSem = studentSemFilter === 'All' || sSem === studentSemFilter
      const matchYear = studentYearFilter === 'All' || s.year === studentYearFilter

      return matchSearch && matchSem && matchYear
    })
    .sort((a, b) => {
      const incA = a.included !== false ? 0 : 1
      const incB = b.included !== false ? 0 : 1
      if (incA !== incB) return incA - incB // Included on top, excluded at bottom

      const semA = getSemesterOrder(a.semester, a.year)
      const semB = getSemesterOrder(b.semester, b.year)
      if (semA !== semB) return semA - semB
      return a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
    })

  const uniqueSemesters = Array.from(
    new Set(courses.map((c) => c.semester || (c.year === '1st Year' ? 'Semester 1' : c.year === '2nd Year' ? 'Semester 3' : c.year === '3rd Year' ? 'Semester 5' : 'Semester 7')))
  ).sort((a, b) => getSemesterOrder(a) - getSemesterOrder(b))

  const uniqueYears = Array.from(new Set(courses.map((c) => c.year))).sort()
  const uniqueDepartments = Array.from(new Set(courses.map((c) => c.department))).sort()

  const filteredCourses = courses
    .filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.department.toLowerCase().includes(courseSearch.toLowerCase()) ||
        (c.semester && c.semester.toLowerCase().includes(courseSearch.toLowerCase())) ||
        (c.year && c.year.toLowerCase().includes(courseSearch.toLowerCase()))

      const cSem = c.semester || (c.year === '1st Year' ? 'Semester 1' : c.year === '2nd Year' ? 'Semester 3' : c.year === '3rd Year' ? 'Semester 5' : 'Semester 7')
      const matchSem = courseSemFilter === 'All' || cSem === courseSemFilter
      const matchYear = courseYearFilter === 'All' || c.year === courseYearFilter
      const matchDept = courseDeptFilter === 'All' || c.department.toLowerCase() === courseDeptFilter.toLowerCase()

      return matchSearch && matchSem && matchYear && matchDept
    })
    .sort((a, b) => {
      const incA = a.included !== false ? 0 : 1
      const incB = b.included !== false ? 0 : 1
      if (incA !== incB) return incA - incB // Included on top, excluded at bottom

      const semA = getSemesterOrder(a.semester, a.year)
      const semB = getSemesterOrder(b.semester, b.year)
      if (semA !== semB) {
        return semA - semB // Sort by semester ascending (Sem 1 -> Sem 8)
      }
      return a.name.localeCompare(b.name) // Secondary sort alphabetically by course name
    })

  const filteredRooms = rooms
    .filter(
      (r) =>
        r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
        r.code.toLowerCase().includes(roomSearch.toLowerCase()) ||
        r.building.toLowerCase().includes(roomSearch.toLowerCase())
    )
    .sort((a, b) => {
      const incA = a.included !== false ? 0 : 1
      const incB = b.included !== false ? 0 : 1
      if (incA !== incB) return incA - incB
      return a.code.localeCompare(b.code)
    })

  const filteredTeachers = teachers
    .filter(
      (t) =>
        t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        t.department.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        String(t.priority).toLowerCase().includes(teacherSearch.toLowerCase()) ||
        (t.designation && t.designation.toLowerCase().includes(teacherSearch.toLowerCase()))
    )
    .sort((a, b) => {
      const incA = a.included !== false ? 0 : 1
      const incB = b.included !== false ? 0 : 1
      if (incA !== incB) return incA - incB // Included on top, excluded at bottom

      const getPriorityScore = (p: number | string): number => {
        if (typeof p === 'number') return p
        if (p === 'high') return 1
        if (p === 'medium') return 2
        if (p === 'low') return 3
        const parsed = parseInt(p, 10)
        return isNaN(parsed) ? 999 : parsed
      }
      const scoreA = getPriorityScore(a.priority)
      const scoreB = getPriorityScore(b.priority)
      if (scoreA !== scoreB) {
        return scoreA - scoreB // Priority 1 (highest) first
      }
      return a.name.localeCompare(b.name) // Secondary sort by name
    })

  const activeCoursesCount = courses.filter((c) => c.included !== false).length
  const activeStudentsCount = students.filter((s) => s.included !== false).length
  const activeRoomsCount = rooms.filter((r) => r.included !== false).length
  const activeTeachersCount = teachers.filter((t) => t.included !== false).length

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Top Banner & Fast Actions */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
              Unified Data Center
            </span>
            <span className="text-xs text-slate-500 font-medium">All inputs on one screen</span>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Campus & Exam Input Parameters
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage your inputs. You can use the <span className="font-semibold text-blue-600">"Include in Build"</span> checkbox on any course, student, room, or faculty member to keep them in memory while excluding them from the generated timetable.
          </p>

          {/* Quick Active Count Pills */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 border border-amber-200">
              Courses in Build: {activeCoursesCount}/{courses.length}
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-800 border border-indigo-200">
              Students in Build: {activeStudentsCount}/{students.length}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 border border-emerald-200">
              Rooms in Build: {activeRoomsCount}/{rooms.length}
            </span>
            <span className="rounded-full bg-purple-50 px-2.5 py-1 font-semibold text-purple-800 border border-purple-200">
              Faculty in Build: {activeTeachersCount}/{teachers.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleLoadPreset('mst')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <RotateCcw className="size-3.5 text-slate-500" />
            Reset to Sample Data
          </button>
          <button
            onClick={onSaveAndRerun}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Sparkles className="size-4" />
            Save & Run Scheduler Engine
          </button>
        </div>
      </div>

      {/* Quick Navigation Sticky Bar */}
      <div className="sticky top-20 z-20 flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-2 shadow-xs backdrop-blur-md">
        <span className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Jump to:
        </span>
        {[
          { id: 'sec-config', label: '1. Exam Setup', icon: Calendar },
          { id: 'sec-courses', label: `2. Courses (${activeCoursesCount}/${courses.length} active)`, icon: BookOpen },
          { id: 'sec-students', label: `3. Students (${activeStudentsCount}/${students.length} active)`, icon: GraduationCap },
          { id: 'sec-rooms', label: `4. Rooms & Labs (${activeRoomsCount}/${rooms.length} active)`, icon: Building2 },
          { id: 'sec-teachers', label: `5. Faculty (${activeTeachersCount}/${teachers.length} active)`, icon: UserCheck },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all"
            >
              <Icon className="size-3.5 text-slate-500" />
              {item.label}
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: EXAM SESSION & TIMETABLE RULES */}
      {/* ========================================================================= */}
      <section id="sec-config" className="scroll-mt-36 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Calendar className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">1. Exam Session Rules & Slots</h3>
              <p className="text-xs text-slate-500">
                Define session title, dates, available shifts per day, and seating heuristics
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSection('config')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {openSections.config ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>
        </div>

        {openSections.config && (
          <div className="mt-6 flex flex-col gap-6">
            {/* Presets Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Apply Preset Configuration Template
              </label>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    type: 'mst',
                    label: 'Mid-Sem Test (MST) Timetable',
                    desc: 'Theory Exams (60 mins), 2-4 days, cross-year interleaved bench seating',
                    icon: '📝',
                  },
                  {
                    type: 'quiz',
                    label: 'Practical Lab Evaluations / Quizzes',
                    desc: 'Lab Sessions (60 mins), Computer Labs, individual workstations',
                    icon: '🔬',
                  },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleLoadPreset(item.type as 'mst' | 'quiz')}
                    className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                      config.examType === item.type
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-bold text-slate-900">{item.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Grid: Start Date, End Date, Holidays & Seating Strategy */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Exam Title / Label</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Exam Start Date</label>
                <input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Exam End Date</label>
                <input
                  type="date"
                  value={config.endDate || config.startDate}
                  onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Seating Strategy</label>
                <select
                  value={config.seatingMode}
                  onChange={(e) => setConfig({ ...config, seatingMode: e.target.value as any })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="interleave_two_exams">Interleave 2 Courses (Anti-Cheating)</option>
                  <option value="single_exam_per_bench">Single Course per Bench</option>
                </select>
              </div>
            </div>

            {/* Multiple Holidays & Non-Exam Days Picker */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Excluded Holidays & Off-Days (Between Start & End Dates)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Add any number of holidays, festival breaks, or preparation leaves. The scheduler will automatically skip these dates (and Sundays).
                  </p>
                </div>

                {/* Add Holiday Control */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    id="new-holiday-input"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('new-holiday-input') as HTMLInputElement
                      if (input && input.value) {
                        const existing = config.holidays || []
                        if (!existing.includes(input.value)) {
                          setConfig({ ...config, holidays: [...existing, input.value].sort() })
                        }
                        input.value = ''
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition-colors shadow-2xs"
                  >
                    <Plus className="size-3.5" />
                    Add Holiday
                  </button>
                </div>
              </div>

              {/* Holiday Badges */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(!config.holidays || config.holidays.length === 0) ? (
                  <span className="text-xs text-slate-400 italic">No custom holidays added (Sundays are skipped automatically).</span>
                ) : (
                  config.holidays.map((hDate) => (
                    <span
                      key={hDate}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 shadow-2xs"
                    >
                      <span>🏖️ {new Date(hDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <button
                        onClick={() => {
                          setConfig({
                            ...config,
                            holidays: (config.holidays || []).filter((d) => d !== hDate),
                          })
                        }}
                        className="rounded hover:bg-red-200 p-0.5 text-red-800"
                        title="Remove Holiday"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Default Daily Shift Slots Setup */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Default Daily Slots Template (Applies to All Days)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Set the default baseline slots per day. You can also customize slots for specific days below.
                  </p>
                </div>

                {/* Slot Count Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Default Slots:</span>
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          const currentSlots = [...config.slotsPerDay]
                          const defaultTimes = ['09:30', '11:30', '14:00', '16:30']
                          let newSlots: any[] = []
                          for (let i = 0; i < num; i++) {
                            if (currentSlots[i]) {
                              newSlots.push(currentSlots[i])
                            } else {
                              newSlots.push({
                                id: `slot_${i + 1}`,
                                label: `Slot ${i + 1}`,
                                startTime: defaultTimes[i] || '09:30',
                              })
                            }
                          }
                          setConfig({ ...config, slotsPerDay: newSlots })
                        }}
                        className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                          config.slotsPerDay.length === num
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {num} {num === 1 ? 'Slot' : 'Slots'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Slot Cards with Time Pickers */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {config.slotsPerDay.map((slot, idx) => (
                  <div
                    key={slot.id || idx}
                    className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900">
                        Default Shift #{idx + 1}
                      </span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                        Template
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500">Slot Label</span>
                        <input
                          type="text"
                          value={slot.label}
                          onChange={(e) => {
                            const updated = [...config.slotsPerDay]
                            updated[idx].label = e.target.value
                            setConfig({ ...config, slotsPerDay: updated })
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500">Clock Start Time</span>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => {
                            const updated = [...config.slotsPerDay]
                            updated[idx].startTime = e.target.value
                            setConfig({ ...config, slotsPerDay: updated })
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual Day-by-Day Slot Customizer */}
            {(() => {
              // Compute active days list safely avoiding UTC shift
              const parseLocal = (s: string) => {
                const parts = s.split('-').map(Number)
                return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0) : new Date(s)
              }
              const sDate = parseLocal(config.startDate || '2025-05-12')
              const eDate = parseLocal(config.endDate || config.startDate || '2025-05-16')
              const holidaysSet = new Set(config.holidays || [])
              const computedDays: { dayNumber: number; dateStr: string }[] = []
              let cur = new Date(sDate)
              let dNum = 1

              while (cur <= eDate) {
                const y = cur.getFullYear()
                const m = String(cur.getMonth() + 1).padStart(2, '0')
                const d = String(cur.getDate()).padStart(2, '0')
                const iso = `${y}-${m}-${d}`
                if (cur.getDay() !== 0 && !holidaysSet.has(iso)) {
                  computedDays.push({
                    dayNumber: dNum++,
                    dateStr: cur.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                  })
                }
                cur.setDate(cur.getDate() + 1)
              }

              if (computedDays.length === 0) {
                for (let i = 1; i <= (config.totalDays || 4); i++) {
                  computedDays.push({ dayNumber: i, dateStr: `Day ${i}` })
                }
              }

              return (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Calendar className="size-4 text-blue-600" />
                        Customize Slots for Specific Exam Days
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Need 1 slot on Day 1, 3 slots on Day 2, or different start times? Add or remove slots for any specific date below.
                      </p>
                    </div>

                    {config.daySpecificSlots && Object.keys(config.daySpecificSlots).length > 0 && (
                      <button
                        onClick={() => setConfig({ ...config, daySpecificSlots: {} })}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Reset All Days to Default Template
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {computedDays.map((d) => {
                      const isCustomized = Boolean(config.daySpecificSlots && config.daySpecificSlots[d.dayNumber])
                      const activeSlotsForThisDay =
                        (config.daySpecificSlots && config.daySpecificSlots[d.dayNumber]) ||
                        config.slotsPerDay ||
                        []

                      return (
                        <div
                          key={d.dayNumber}
                          className={`flex flex-col gap-3 rounded-xl border p-3.5 transition-all ${
                            isCustomized
                              ? 'border-blue-400 bg-white ring-1 ring-blue-300 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-2xs">
                                D{d.dayNumber}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">
                                  Day {d.dayNumber} · {d.dateStr}
                                </h4>
                                <span className="text-[10px] text-slate-500">
                                  {activeSlotsForThisDay.length} {activeSlotsForThisDay.length === 1 ? 'Slot' : 'Slots'} Scheduled {isCustomized ? '(Custom)' : '(Default)'}
                                </span>
                              </div>
                            </div>

                            {/* Slot Increment / Decrement Stepper */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  if (activeSlotsForThisDay.length <= 1) return
                                  const updatedSlots = activeSlotsForThisDay.slice(0, -1)
                                  const customMap = { ...(config.daySpecificSlots || {}) }
                                  customMap[d.dayNumber] = updatedSlots
                                  setConfig({ ...config, daySpecificSlots: customMap })
                                }}
                                disabled={activeSlotsForThisDay.length <= 1}
                                className="flex size-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                title="Decrease slots for this day"
                              >
                                –
                              </button>

                              <span className="text-xs font-bold text-slate-800 px-1">
                                {activeSlotsForThisDay.length}
                              </span>

                              <button
                                onClick={() => {
                                  if (activeSlotsForThisDay.length >= 4) return
                                  const defaultTimes = ['09:30', '11:30', '14:00', '16:30']
                                  const nextSlotNum = activeSlotsForThisDay.length + 1
                                  const updatedSlots = [
                                    ...activeSlotsForThisDay,
                                    {
                                      id: `d${d.dayNumber}_slot_${nextSlotNum}`,
                                      label: `Slot ${nextSlotNum}`,
                                      startTime: defaultTimes[nextSlotNum - 1] || '14:00',
                                    },
                                  ]
                                  const customMap = { ...(config.daySpecificSlots || {}) }
                                  customMap[d.dayNumber] = updatedSlots
                                  setConfig({ ...config, daySpecificSlots: customMap })
                                }}
                                disabled={activeSlotsForThisDay.length >= 4}
                                className="flex size-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                                title="Add slot for this day"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Render Clock Inputs for this Day's Slots */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            {activeSlotsForThisDay.map((slot, sIdx) => (
                              <div
                                key={slot.id || sIdx}
                                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 p-2"
                              >
                                <div>
                                  <span className="text-[10px] font-bold text-slate-700 block">
                                    {slot.label}
                                  </span>
                                  <span className="text-[9px] text-slate-400">Start Time:</span>
                                </div>
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => {
                                    const updated = [...activeSlotsForThisDay]
                                    updated[sIdx] = { ...updated[sIdx], startTime: e.target.value }
                                    const customMap = { ...(config.daySpecificSlots || {}) }
                                    customMap[d.dayNumber] = updated
                                    setConfig({ ...config, daySpecificSlots: customMap })
                                  }}
                                  className="w-24 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: COURSE CATALOG WITH INCLUDE IN BUILD CHECKBOX */}
      {/* ========================================================================= */}
      <section id="sec-courses" className="scroll-mt-36 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <BookOpen className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">2. Course Catalog</h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {activeCoursesCount} of {courses.length} included in build
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Uncheck the box next to any course to exclude it from schedule generation while keeping it in catalog memory.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSection('courses')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {openSections.courses ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>
        </div>

        {openSections.courses && (
          <div className="mt-6 flex flex-col gap-6">
            <ExcelImportPanel title="Courses" sheetNames={['courses', 'course']} columns="Course Code, Course Name, Department, Target Year, Target Semester" onImport={importCourseRows} />
            {/* Quick Add Course Form */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Add New Subject / Course
              </span>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Course Code</span>
                  <input
                    type="text"
                    placeholder="e.g. CS-301"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Course Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Operating Systems"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Department</span>
                  <input
                    type="text"
                    placeholder="e.g. CSE"
                    value={newCourse.department}
                    onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Target Year</span>
                  <select
                    value={newCourse.year}
                    onChange={(e) => setNewCourse({ ...newCourse, year: e.target.value as AcademicYear })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Target Semester (Sem A/B)</span>
                  <select
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value as AcademicSemester })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="Semester 1 (Sem A - Odd)">Semester 1 (Sem A · Odd)</option>
                    <option value="Semester 2 (Sem B - Even)">Semester 2 (Sem B · Even)</option>
                    <option value="Semester 3 (Sem A - Odd)">Semester 3 (Sem A · Odd)</option>
                    <option value="Semester 4 (Sem B - Even)">Semester 4 (Sem B · Even)</option>
                    <option value="Semester 5 (Sem A - Odd)">Semester 5 (Sem A · Odd)</option>
                    <option value="Semester 6 (Sem B - Even)">Semester 6 (Sem B · Even)</option>
                    <option value="Semester 7 (Sem A - Odd)">Semester 7 (Sem A · Odd)</option>
                    <option value="Semester 8 (Sem B - Even)">Semester 8 (Sem B · Even)</option>
                  </select>
                </div>
                <div className="flex items-end sm:col-span-2">
                  <button
                    onClick={handleAddCourse}
                    disabled={!newCourse.code || !newCourse.name}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="size-4" />
                    Add Course
                  </button>
                </div>
              </div>
            </div>

            {/* Courses Filter Bar & Batch Selectors */}
            <div className="flex flex-col gap-3">
              {/* Filter Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Target Semester Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Semester:</span>
                    <select
                      value={courseSemFilter}
                      onChange={(e) => setCourseSemFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="All">All Semesters</option>
                      {uniqueSemesters.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Year Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Year:</span>
                    <select
                      value={courseYearFilter}
                      onChange={(e) => setCourseYearFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="All">All Years</option>
                      {uniqueYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Dept:</span>
                    <select
                      value={courseDeptFilter}
                      onChange={(e) => setCourseDeptFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="All">All Departments</option>
                      {uniqueDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(courseSemFilter !== 'All' || courseYearFilter !== 'All' || courseDeptFilter !== 'All' || courseSearch) && (
                    <button
                      onClick={() => {
                        setCourseSemFilter('All')
                        setCourseYearFilter('All')
                        setCourseDeptFilter('All')
                        setCourseSearch('')
                      }}
                      className="text-xs font-bold text-amber-700 hover:underline"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Batch Actions for Currently Visible/Filtered Items */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Showing {filteredCourses.length} of {courses.length} courses:
                  </span>
                  <button
                    onClick={() => toggleFilteredCourses(filteredCourses, true)}
                    className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs"
                    title="Include all courses currently matching the active filter into build"
                  >
                    <CheckSquare className="size-3.5 text-emerald-600" />
                    Select Filtered ({filteredCourses.length})
                  </button>
                  <button
                    onClick={() => toggleFilteredCourses(filteredCourses, false)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors shadow-2xs"
                    title="Deselect / Exclude all courses currently matching the active filter"
                  >
                    <Square className="size-3.5 text-slate-400" />
                    Deselect Filtered
                  </button>
                </div>
              </div>

              {/* Quick Preset Filter & Batch Toggle Cards */}
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Semester Quick Select & Mass Toggle
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      (Filter view or toggle all courses in a semester into build)
                    </span>
                  </div>
                  {courseSemFilter !== 'All' && (
                    <button
                      onClick={() => setCourseSemFilter('All')}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                    >
                      Show All Semesters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {uniqueSemesters.map((sem) => {
                    const semCourses = courses.filter((c) => (c.semester || '').includes(sem))
                    const activeCount = semCourses.filter((c) => c.included !== false).length
                    const allIncluded = semCourses.length > 0 && activeCount === semCourses.length
                    const noneIncluded = semCourses.length > 0 && activeCount === 0
                    const isSelected = courseSemFilter === sem

                    const shortLabel = sem
                      .replace('Semester ', 'Sem ')
                      .replace(' (Sem A - Odd)', ' · A (Odd)')
                      .replace(' (Sem B - Even)', ' · B (Even)')

                    return (
                      <div
                        key={sem}
                        className={`group relative flex flex-col justify-between rounded-xl border p-2.5 transition-all duration-200 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-400/40'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-2xs'
                        }`}
                      >
                        {/* Header: Click to Filter Table */}
                        <div
                          onClick={() => setCourseSemFilter(isSelected ? 'All' : sem)}
                          className="cursor-pointer select-none"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                              {shortLabel}
                            </span>
                            <span
                              className={`size-2 rounded-full ${
                                allIncluded
                                  ? 'bg-emerald-500'
                                  : noneIncluded
                                  ? 'bg-slate-300'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 font-medium">
                            <span className={activeCount > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}>
                              {activeCount}
                            </span>
                            <span className="text-slate-400">/{semCourses.length} courses active</span>
                          </p>
                        </div>

                        {/* Footer Action: Toggle Whole Semester */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCourseSemFilter(isSelected ? 'All' : sem)
                            }}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-all ${
                              isSelected
                                ? 'bg-amber-200 text-amber-900 font-extrabold'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {isSelected ? 'Viewing' : 'Filter'}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCoursesByCriterion('semester', sem, !allIncluded)
                            }}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition-all shadow-2xs ${
                              allIncluded
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : noneIncluded
                                ? 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title={`Toggle build inclusion for all ${semCourses.length} courses in ${sem}`}
                          >
                            {allIncluded ? '✓ All In' : noneIncluded ? '✗ None In' : '◐ Partial'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Search Bar + Global Batch Toggles */}
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search courses by code, title, semester, year..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Global Batch Toggles + Lab Toggle Button */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Dedicated Lab Subjects Selector Button */}
                  {(() => {
                    const labCourses = courses.filter(
                      (c) =>
                        c.name.toLowerCase().includes('lab') ||
                        c.code.toLowerCase().includes('lab') ||
                        c.type === 'lab_quiz'
                    )
                    const allLabsIncluded =
                      labCourses.length > 0 && labCourses.every((c) => c.included !== false)
                    const someLabsIncluded =
                      labCourses.some((c) => c.included !== false)

                    return (
                      <button
                        onClick={() => toggleLabCourses(!allLabsIncluded)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                          allLabsIncluded
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : someLabsIncluded
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                        title="Click to select or deselect all subjects containing 'Lab' in their name/code"
                      >
                        <FlaskConical className="size-3.5" />
                        <span>{allLabsIncluded ? '✓ Deselect All Labs' : 'Select All Lab Subjects'}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            allLabsIncluded
                              ? 'bg-amber-800 text-white'
                              : 'bg-amber-200/80 text-amber-900'
                          }`}
                        >
                          {labCourses.filter((c) => c.included !== false).length}/{labCourses.length}
                        </span>
                      </button>
                    )
                  })()}

                  <button
                    onClick={() => toggleAllCourses(true)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <CheckSquare className="size-3.5 text-blue-600" />
                    Include All
                  </button>
                  <button
                    onClick={() => toggleAllCourses(false)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Square className="size-3.5 text-slate-400" />
                    Exclude All
                  </button>
                </div>
              </div>

              <div className="mt-1 max-h-[30rem] overflow-y-auto rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-36">Include in Build</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Course Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Target Year</th>
                      <th className="py-2.5 px-3">Target Sem</th>
                      <th className="py-2.5 px-3 w-20 text-center">Priority</th>
                      <th className="py-2.5 px-3 w-40">Bind / Pair Subject (Same Day)</th>
                      <th className="py-2.5 px-3 w-28">Exam Duration</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCourses.map((c) => {
                      const isIncluded = c.included !== false
                      const defaultDuration =
                        c.durationMinutes ||
                        (c.type === 'lab_quiz'
                          ? config.labDurationMinutes || 60
                          : config.theoryDurationMinutes || 60)

                      // Available same-semester courses for pairing
                      const sameSemCourses = courses.filter(
                        (other) =>
                          other.id !== c.id &&
                          other.year === c.year &&
                          (other.semester === c.semester || !c.semester || !other.semester) &&
                          other.included !== false
                      )

                      return (
                        <tr
                          key={c.id}
                          className={`transition-colors ${
                            isIncluded ? 'hover:bg-slate-50/80' : 'bg-slate-50/60 opacity-60'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => toggleCourseInclusion(c.id)}
                                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span
                                className={`text-[11px] font-bold ${
                                  isIncluded ? 'text-blue-700' : 'text-slate-400'
                                }`}
                              >
                                {isIncluded ? 'Included' : 'Excluded'}
                              </span>
                            </label>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                            <span
                              className={`rounded px-2 py-0.5 border ${
                                isIncluded
                                  ? 'bg-amber-50 border-amber-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                              }`}
                            >
                              {c.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {c.name}
                            {!isIncluded && (
                              <span className="ml-2 text-[10px] text-slate-400 font-normal italic">
                                (Skipped during timetable generation)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{c.department}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">{c.year}</td>
                          <td className="py-2.5 px-3">
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700 border border-slate-200 text-[11px]">
                              {c.semester || (c.year === '1st Year' ? 'Semester 1 (Sem A - Odd)' : c.year === '2nd Year' ? 'Semester 3 (Sem A - Odd)' : c.year === '3rd Year' ? 'Semester 5 (Sem A - Odd)' : 'Semester 7 (Sem A - Odd)')}
                            </span>
                          </td>
                          {/* Priority Column */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={c.priority !== undefined ? c.priority : 1}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                setCourses((prev) =>
                                  prev.map((item) =>
                                    item.id === c.id ? { ...item, priority: val } : item
                                  )
                                )
                              }}
                              className="w-12 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs font-bold text-blue-700 text-center focus:border-blue-500 focus:outline-none"
                              title="Lower number = Higher Priority (Scheduled earlier in the exam session)"
                            />
                          </td>
                          {/* Binding Group Number Column */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                max={99}
                                placeholder="None"
                                value={c.bindingGroup !== undefined && c.bindingGroup > 0 ? c.bindingGroup : ''}
                                onChange={(e) => {
                                  const val = e.target.value ? Number(e.target.value) : undefined
                                  setCourses((prev) =>
                                    prev.map((item) =>
                                      item.id === c.id ? { ...item, bindingGroup: val } : item
                                    )
                                  )
                                }}
                                className={`w-14 rounded-md border px-2 py-1 text-xs font-bold text-center focus:outline-none ${
                                  c.bindingGroup
                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-300'
                                    : 'border-slate-300 bg-white text-slate-700'
                                }`}
                                title="Enter matching number on 2 courses of the same semester (e.g. 1 & 1) to bind them on the same day"
                              />
                              {c.bindingGroup && (
                                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                                  🔗 Group #{c.bindingGroup}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={15}
                                max={360}
                                step={15}
                                value={c.durationMinutes !== undefined ? c.durationMinutes : defaultDuration}
                                onChange={(e) => {
                                  const val = Number(e.target.value)
                                  setCourses((prev) =>
                                    prev.map((item) =>
                                      item.id === c.id ? { ...item, durationMinutes: val } : item
                                    )
                                  )
                                }}
                                className="w-16 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs font-bold text-slate-800 text-center focus:border-amber-500 focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400 font-medium">min</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setCourses((prev) => prev.filter((item) => item.id !== c.id))}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Delete Course"
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

      {/* ========================================================================= */}
      {/* SECTION 3: STUDENTS REGISTRY WITH INCLUDE IN BUILD CHECKBOX */}
      {/* ========================================================================= */}
      <section id="sec-students" className="scroll-mt-36 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">3. Students Registry & Enrollments</h3>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                  {activeStudentsCount} of {students.length} included in build
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage student records. Toggle "Include in Build" to seat specific students or exclude on-leave/exempt students.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSection('students')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {openSections.students ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>
        </div>

        {openSections.students && (
          <div className="mt-6 flex flex-col gap-6">
            <ExcelImportPanel title="Students" sheetNames={['students', 'student']} columns="Full Name, Roll No, Year, Semester, Branch, Batch, Course Codes" onImport={importStudentRows} />
            {/* Quick Add Student Form */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Add New Student
              </span>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Full Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Roll Number</span>
                  <input
                    type="text"
                    placeholder="e.g. 23CSE045"
                    value={newStudent.rollNo}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Target Year</span>
                  <select
                    value={newStudent.year}
                    onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value as AcademicYear })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Target Semester (Sem A/B)</span>
                  <select
                    value={newStudent.semester}
                    onChange={(e) => setNewStudent({ ...newStudent, semester: e.target.value as AcademicSemester })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Semester 1 (Sem A - Odd)">Semester 1 (Sem A · Odd)</option>
                    <option value="Semester 2 (Sem B - Even)">Semester 2 (Sem B · Even)</option>
                    <option value="Semester 3 (Sem A - Odd)">Semester 3 (Sem A · Odd)</option>
                    <option value="Semester 4 (Sem B - Even)">Semester 4 (Sem B · Even)</option>
                    <option value="Semester 5 (Sem A - Odd)">Semester 5 (Sem A · Odd)</option>
                    <option value="Semester 6 (Sem B - Even)">Semester 6 (Sem B · Even)</option>
                    <option value="Semester 7 (Sem A - Odd)">Semester 7 (Sem A · Odd)</option>
                    <option value="Semester 8 (Sem B - Even)">Semester 8 (Sem B · Even)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Branch</span>
                  <input
                    type="text"
                    placeholder="e.g. CSE"
                    value={newStudent.branch}
                    onChange={(e) => setNewStudent({ ...newStudent, branch: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Course Codes (comma separated)</span>
                  <input
                    type="text"
                    placeholder="e.g. MATH-101, PHYS-101"
                    value={newStudentCourseInput}
                    onChange={(e) => setNewStudentCourseInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddStudent}
                    disabled={!newStudent.name || !newStudent.rollNo}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="size-4" />
                    Add Student
                  </button>
                </div>
              </div>
            </div>

            {/* Students Filter Bar & Batch Selectors */}
            <div className="flex flex-col gap-3">
              {/* Filter Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Target Semester Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Semester:</span>
                    <select
                      value={studentSemFilter}
                      onChange={(e) => setStudentSemFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="All">All Semesters</option>
                      {uniqueStudentSemesters.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Year Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Year:</span>
                    <select
                      value={studentYearFilter}
                      onChange={(e) => setStudentYearFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="All">All Years</option>
                      {uniqueStudentYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(studentSemFilter !== 'All' || studentYearFilter !== 'All' || studentSearch) && (
                    <button
                      onClick={() => {
                        setStudentSemFilter('All')
                        setStudentYearFilter('All')
                        setStudentSearch('')
                      }}
                      className="text-xs font-bold text-indigo-700 hover:underline"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Batch Actions for Filtered Students */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Showing {filteredStudents.length} of {students.length} students:
                  </span>
                  <button
                    onClick={() => toggleFilteredStudents(filteredStudents, true)}
                    className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs"
                    title="Include all students matching active filter into seating build"
                  >
                    <CheckSquare className="size-3.5 text-emerald-600" />
                    Select Filtered ({filteredStudents.length})
                  </button>
                  <button
                    onClick={() => toggleFilteredStudents(filteredStudents, false)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors shadow-2xs"
                    title="Deselect / Exclude all students currently matching active filter"
                  >
                    <Square className="size-3.5 text-slate-400" />
                    Deselect Filtered
                  </button>
                </div>
              </div>

              {/* Quick Preset Filter & Batch Toggle Cards for Students */}
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Semester Quick Select & Mass Toggle
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      (Filter view or mass toggle whole semester cohorts into exam seating)
                    </span>
                  </div>
                  {studentSemFilter !== 'All' && (
                    <button
                      onClick={() => setStudentSemFilter('All')}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      Show All Semesters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {uniqueStudentSemesters.map((sem) => {
                    const semStudents = students.filter((s) => (s.semester || '').includes(sem))
                    const activeCount = semStudents.filter((s) => s.included !== false).length
                    const allIncluded = semStudents.length > 0 && activeCount === semStudents.length
                    const noneIncluded = semStudents.length > 0 && activeCount === 0
                    const isSelected = studentSemFilter === sem

                    const shortLabel = sem
                      .replace('Semester ', 'Sem ')
                      .replace(' (Sem A - Odd)', ' · A (Odd)')
                      .replace(' (Sem B - Even)', ' · B (Even)')

                    return (
                      <div
                        key={sem}
                        className={`group relative flex flex-col justify-between rounded-xl border p-2.5 transition-all duration-200 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-400/40'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-2xs'
                        }`}
                      >
                        {/* Header: Click to Filter Table */}
                        <div
                          onClick={() => setStudentSemFilter(isSelected ? 'All' : sem)}
                          className="cursor-pointer select-none"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                              {shortLabel}
                            </span>
                            <span
                              className={`size-2 rounded-full ${
                                allIncluded
                                  ? 'bg-emerald-500'
                                  : noneIncluded
                                  ? 'bg-slate-300'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 font-medium">
                            <span className={activeCount > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}>
                              {activeCount}
                            </span>
                            <span className="text-slate-400">/{semStudents.length} students</span>
                          </p>
                        </div>

                        {/* Footer Action: Toggle Whole Cohort */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setStudentSemFilter(isSelected ? 'All' : sem)
                            }}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-all ${
                              isSelected
                                ? 'bg-indigo-200 text-indigo-900 font-extrabold'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {isSelected ? 'Viewing' : 'Filter'}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleStudentsByCriterion('semester', sem, !allIncluded)
                            }}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition-all shadow-2xs ${
                              allIncluded
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : noneIncluded
                                ? 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title={`Toggle seating build inclusion for all ${semStudents.length} students in ${sem}`}
                          >
                            {allIncluded ? '✓ All In' : noneIncluded ? '✗ None In' : '◐ Partial'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Search Bar + Global Batch Toggles */}
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, roll no, branch, semester, course..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAllStudents(true)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <CheckSquare className="size-3.5 text-indigo-600" />
                    Include All Students
                  </button>
                  <button
                    onClick={() => toggleAllStudents(false)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Square className="size-3.5 text-slate-400" />
                    Exclude All
                  </button>
                </div>
              </div>

              <div className="mt-1 max-h-[30rem] overflow-y-auto rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-36">Include in Build</th>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Year / Branch</th>
                      <th className="py-2.5 px-3">Target Sem</th>
                      <th className="py-2.5 px-3">Enrolled Course Codes</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredStudents.map((st) => {
                      const isIncluded = st.included !== false
                      return (
                        <tr
                          key={st.id}
                          className={`transition-colors ${
                            isIncluded ? 'hover:bg-slate-50/80' : 'bg-slate-50/60 opacity-60'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => toggleStudentInclusion(st.id)}
                                className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span
                                className={`text-[11px] font-bold ${
                                  isIncluded ? 'text-indigo-700' : 'text-slate-400'
                                }`}
                              >
                                {isIncluded ? 'Included' : 'Excluded'}
                              </span>
                            </label>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{st.rollNo}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{st.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {st.year} · <span className="font-semibold text-slate-800">{st.branch}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="rounded bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 border border-indigo-100 text-[11px]">
                              {st.semester || (st.year === '1st Year' ? 'Semester 1 (Sem A - Odd)' : st.year === '2nd Year' ? 'Semester 3 (Sem A - Odd)' : st.year === '3rd Year' ? 'Semester 5 (Sem A - Odd)' : 'Semester 7 (Sem A - Odd)')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {st.enrolledCourseCodes.map((code) => (
                                <span
                                  key={code}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setStudents((prev) => prev.filter((s) => s.id !== st.id))}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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

      {/* ========================================================================= */}
      {/* SECTION 4: ROOMS & SEATING CAPACITY WITH INCLUDE IN BUILD CHECKBOX */}
      {/* ========================================================================= */}
      <section id="sec-rooms" className="scroll-mt-36 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">4. Rooms, Labs & Bench Configurations</h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  {activeRoomsCount} of {rooms.length} rooms in build
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Active usable exam seating capacity:{' '}
                <span className="font-bold text-emerald-700">
                  {rooms
                    .filter((r) => r.included !== false)
                    .reduce((acc, r) => acc + r.totalBenches * r.benchCapacity, 0)}{' '}
                  seats
                </span>{' '}
                (across {activeRoomsCount} active halls)
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSection('rooms')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {openSections.rooms ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>
        </div>

        {openSections.rooms && (
          <div className="mt-6 flex flex-col gap-6">
            <ExcelImportPanel title="Rooms" sheetNames={['rooms', 'room', 'labs']} columns="Room Code, Room Name, Building, Type, Benches, Seats per Bench, Columns" onImport={importRoomRows} />
            {/* Quick Add Room Form */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Add Exam Room / Lab
              </span>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Room Code</span>
                  <input
                    type="text"
                    placeholder="e.g. LH-101"
                    value={newRoom.code}
                    onChange={(e) => setNewRoom({ ...newRoom, code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Room Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Lecture Hall 1"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Building</span>
                  <input
                    type="text"
                    placeholder="e.g. Block A"
                    value={newRoom.building}
                    onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Benches</span>
                  <input
                    type="number"
                    value={newRoom.totalBenches}
                    onChange={(e) => setNewRoom({ ...newRoom, totalBenches: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Seats / Bench</span>
                  <input
                    type="number"
                    value={newRoom.benchCapacity}
                    onChange={(e) => setNewRoom({ ...newRoom, benchCapacity: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Columns</span>
                  <input
                    type="number"
                    value={newRoom.columns}
                    onChange={(e) => setNewRoom({ ...newRoom, columns: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Invigilators Req.</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newRoom.invigilatorsRequired || 1}
                    onChange={(e) => setNewRoom({ ...newRoom, invigilatorsRequired: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-bold text-emerald-700"
                  />
                </div>
                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <button
                    onClick={handleAddRoom}
                    disabled={!newRoom.name || !newRoom.code}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="size-4" />
                    Add Room
                  </button>
                </div>
              </div>
            </div>

            {/* Rooms Cards & Table */}
            <div>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search rooms by code, building, name..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAllRooms(true)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <CheckSquare className="size-3.5 text-emerald-600" />
                    Include All Rooms
                  </button>
                  <button
                    onClick={() => toggleAllRooms(false)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Square className="size-3.5 text-slate-400" />
                    Exclude All
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRooms.map((r) => {
                  const isIncluded = r.included !== false
                  const capacity = r.totalBenches * r.benchCapacity
                  return (
                    <div
                      key={r.id}
                      className={`flex flex-col justify-between rounded-xl border p-4 transition-all shadow-2xs ${
                        isIncluded
                          ? 'border-slate-200 bg-white hover:border-slate-300'
                          : 'border-slate-200 bg-slate-50/70 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => toggleRoomInclusion(r.id)}
                              className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span
                              className={`rounded px-2 py-0.5 font-mono text-xs font-bold border ${
                                isIncluded
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-200 text-slate-500 border-slate-300'
                              }`}
                            >
                              {r.code}
                            </span>
                          </label>

                          <button
                            onClick={() => setRooms((prev) => prev.filter((item) => item.id !== r.id))}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete Room"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        <h4 className="mt-2 text-sm font-bold text-slate-900">{r.name}</h4>
                        <p className="text-xs text-slate-500">
                          {r.building} {!isIncluded && '· Excluded from scheduler'}
                        </p>
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-3 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-lg bg-slate-50 p-2">
                          <span className="block text-[10px] text-slate-500">
                            {r.type === 'lab' ? 'Workstations' : 'Benches'}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={300}
                            value={r.totalBenches}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value))
                              setRooms((prev) =>
                                prev.map((item) =>
                                  item.id === r.id ? { ...item, totalBenches: val } : item
                                )
                              )
                            }}
                            className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs font-bold text-slate-800 text-center mx-auto block focus:border-emerald-500 focus:outline-none"
                            title="Total desks or computer workstations in this venue"
                          />
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2">
                          <span className="block text-[10px] text-slate-500">Seats/Desk</span>
                          <span className="font-bold text-slate-800">{r.benchCapacity}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2">
                          <span className="block text-[10px] text-slate-500">Invigilators</span>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={r.invigilatorsRequired || 1}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setRooms((prev) =>
                                prev.map((item) =>
                                  item.id === r.id ? { ...item, invigilatorsRequired: val } : item
                                )
                              )
                            }}
                            className="w-10 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs font-bold text-emerald-700 text-center mx-auto block focus:border-emerald-500 focus:outline-none"
                            title="Number of invigilators / teachers required in this room"
                          />
                        </div>
                        <div
                          className={`rounded-lg p-2 border ${
                            isIncluded
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span className="block text-[10px] font-semibold">Total Seats</span>
                          <span className="font-bold">{capacity}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: FACULTY & INVIGILATOR PRIORITIES WITH INCLUDE IN BUILD CHECKBOX */}
      {/* ========================================================================= */}
      <section id="sec-teachers" className="scroll-mt-36 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <UserCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">5. Faculty Registry & Priority Dispersal</h3>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800">
                  {activeTeachersCount} of {teachers.length} active in duty roster
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {teachers.length} invigilators registered. Toggle "Include in Build" to assign or exempt individual faculty members.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSection('teachers')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {openSections.teachers ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>
        </div>

        {openSections.teachers && (
          <div className="mt-6 flex flex-col gap-6">
            <ExcelImportPanel title="Faculty" sheetNames={['faculty', 'teachers', 'teacher']} columns="Faculty Name, Designation, Department, Priority Rank, Max Duties" onImport={importTeacherRows} />
            {/* Quick Add Teacher Form */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Add Faculty / Invigilator
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

            {/* Teachers Table with Batch Toggles */}
            <div>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search faculty by name, department, designation..."
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                  />
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
                      <th className="py-2.5 px-3 w-32">Priority Rank (Customizable)</th>
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
                                {t.priority === 1 ? '🌟 Rank 1' : `Rank ${t.priority}`}
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

      {/* Floating Action Bar at bottom */}
      <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/90 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Sparkles className="size-5 text-blue-600" />
          <p className="text-xs text-blue-900 font-medium">
            Generating schedule using <span className="font-bold">{activeCoursesCount} courses</span>,{' '}
            <span className="font-bold">{activeStudentsCount} students</span>,{' '}
            <span className="font-bold">{activeRoomsCount} rooms</span>, and{' '}
            <span className="font-bold">{activeTeachersCount} invigilators</span>.
          </p>
        </div>
        <button
          onClick={onSaveAndRerun}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
        >
          Solve & Generate Schedule →
        </button>
      </div>
    </div>
  )
}
