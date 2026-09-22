'use client'

import { useState } from 'react'
import {
  BookOpen,
  Building2,
  Calendar,
  Check,
  GraduationCap,
  Layers,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import {
  AcademicYear,
  Course,
  ExamSessionConfig,
  Room,
  RoomType,
  Student,
  Teacher,
  TeacherPriority,
} from '@/lib/types'
import { defaultCourses, defaultExamConfigs, defaultRooms, defaultStudents, defaultTeachers } from '@/lib/presets'

interface InputManagerModalProps {
  isOpen: boolean
  onClose: () => void
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

export function InputManagerModal({
  isOpen,
  onClose,
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
}: InputManagerModalProps) {
  const [activeTab, setActiveTab] = useState<
    'params' | 'students' | 'courses' | 'rooms' | 'teachers'
  >('params')

  // Form states for adding items
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    rollNo: '',
    year: '1st Year',
    branch: 'CSE',
    batch: 'Batch A',
    enrolledCourseCodes: [],
  })
  const [newStudentCourseInput, setNewStudentCourseInput] = useState<string>('')

  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    code: '',
    name: '',
    year: '1st Year',
    department: 'CSE',
    type: 'theory',
    durationMinutes: 90,
  })

  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    name: '',
    code: '',
    building: 'Main Academic Block',
    type: 'classroom',
    totalBenches: 10,
    benchCapacity: 2,
    columns: 2,
    allowSameCourseOnBench: false,
  })

  const [newTeacher, setNewTeacher] = useState<Partial<Teacher>>({
    name: '',
    department: 'CSE',
    priority: 'medium',
    maxDuties: 6,
  })

  if (!isOpen) return null

  // Add Student Handler
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
      branch: newStudent.branch || 'CSE',
      batch: newStudent.batch || 'Batch A',
      enrolledCourseCodes: enrolled,
    }
    setStudents((prev) => [added, ...prev])
    setNewStudent({ name: '', rollNo: '', year: '1st Year', branch: 'CSE', batch: 'Batch A' })
    setNewStudentCourseInput('')
  }

  // Add Course Handler
  const handleAddCourse = () => {
    if (!newCourse.code || !newCourse.name) return
    const added: Course = {
      id: `c_${Date.now()}`,
      code: newCourse.code.toUpperCase(),
      name: newCourse.name,
      year: (newCourse.year as AcademicYear) || '1st Year',
      department: newCourse.department || 'CSE',
      type: newCourse.type || 'theory',
      durationMinutes: Number(newCourse.durationMinutes) || 90,
    }
    setCourses((prev) => [...prev, added])
    setNewCourse({ code: '', name: '', year: '1st Year', department: 'CSE', type: 'theory', durationMinutes: 90 })
  }

  // Add Room Handler
  const handleAddRoom = () => {
    if (!newRoom.name || !newRoom.code) return
    const added: Room = {
      id: `r_${Date.now()}`,
      name: newRoom.name,
      code: newRoom.code.toUpperCase(),
      building: newRoom.building || 'Academic Block',
      type: (newRoom.type as RoomType) || 'classroom',
      totalBenches: Number(newRoom.totalBenches) || 10,
      benchCapacity: Number(newRoom.benchCapacity) || 2,
      columns: Number(newRoom.columns) || 2,
      allowSameCourseOnBench: newRoom.allowSameCourseOnBench || false,
    }
    setRooms((prev) => [...prev, added])
    setNewRoom({ name: '', code: '', building: 'Academic Block', type: 'classroom', totalBenches: 10, benchCapacity: 2 })
  }

  // Add Teacher Handler
  const handleAddTeacher = () => {
    if (!newTeacher.name) return
    const added: Teacher = {
      id: `t_${Date.now()}`,
      name: newTeacher.name,
      department: newTeacher.department || 'CSE',
      priority: (newTeacher.priority as TeacherPriority) || 'medium',
      maxDuties: Number(newTeacher.maxDuties) || 6,
    }
    setTeachers((prev) => [...prev, added])
    setNewTeacher({ name: '', department: 'CSE', priority: 'medium', maxDuties: 6 })
  }

  // Preset switch
  const handleLoadPreset = (type: 'mst' | 'quiz') => {
    setConfig(defaultExamConfigs[type])
    setStudents(defaultStudents)
    setCourses(defaultCourses)
    setRooms(defaultRooms)
    setTeachers(defaultTeachers)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Settings className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Exam & Campus Parameters Management
              </h2>
              <p className="text-xs text-muted-foreground">
                Customize Students, Courses, Rooms, Benches, Faculty Priorities & Exam Rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSaveAndRerun()
                onClose()
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
            >
              <Check className="size-4" />
              Save & Solve Timetable
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-6 py-2 overflow-x-auto">
          {[
            { id: 'params', label: '1. Exam Configuration', icon: Calendar },
            { id: 'students', label: `2. Students Registry (${students.length})`, icon: GraduationCap },
            { id: 'courses', label: `3. Course Catalog (${courses.length})`, icon: BookOpen },
            { id: 'rooms', label: `4. Rooms & Labs (${rooms.length})`, icon: Building2 },
            { id: 'teachers', label: `5. Faculty & Priorities (${teachers.length})`, icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-background text-primary shadow-xs border border-border'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Exam Parameters */}
          {activeTab === 'params' && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-border bg-muted/20 p-5">
                <h3 className="text-sm font-bold text-foreground mb-1">
                  Quick Examination Presets
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Select an examination mode to test with realistic college datasets:
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleLoadPreset('mst')}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-2xs hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    📝 Mid-Semester Test (MST) Timetable
                  </button>
                  <button
                    onClick={() => handleLoadPreset('quiz')}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-2xs hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    🔬 Computer Lab Quizzes & Evaluations
                  </button>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground">Session Title</label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground">Exam Category</label>
                  <select
                    value={config.examType}
                    onChange={(e) =>
                      setConfig({ ...config, examType: e.target.value as any })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="mst">Mid-Semester Test (MST)</option>
                    <option value="end_sem">End-Semester Final Examination</option>
                    <option value="quiz">Lab Quiz / Practical Assessment (By Year Batch)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Available Exam Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={config.totalDays}
                    onChange={(e) =>
                      setConfig({ ...config, totalDays: Number(e.target.value) || 1 })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground">Start Date</label>
                  <input
                    type="date"
                    value={config.startDate}
                    onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-foreground">
                    Bench Seating Arrangement Mode
                  </label>
                  <select
                    value={config.seatingMode}
                    onChange={(e) =>
                      setConfig({ ...config, seatingMode: e.target.value as any })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="interleave_two_exams">
                      Interleave 2 Different Exams on Same Bench (Seat 1 = Course A, Seat 2 = Course B to prevent copying)
                    </option>
                    <option value="single_exam_per_bench">
                      Single Exam per Bench (Standard seating)
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Students Registry */}
          {activeTab === 'students' && (
            <div className="flex flex-col gap-6">
              {/* Add Student Card */}
              <div className="rounded-2xl border border-border bg-muted/20 p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Add New Student</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Full Name (e.g. Aarav Sharma)"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Roll No (e.g. 24CS009)"
                    value={newStudent.rollNo}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <select
                    value={newStudent.year}
                    onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value as any })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Branch (e.g. CSE / ECE)"
                    value={newStudent.branch}
                    onChange={(e) => setNewStudent({ ...newStudent, branch: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Batch (e.g. Batch A)"
                    value={newStudent.batch}
                    onChange={(e) => setNewStudent({ ...newStudent, batch: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Courses (comma-separated, e.g. MATH-101, PHYS-101)"
                    value={newStudentCourseInput}
                    onChange={(e) => setNewStudentCourseInput(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                </div>
                <button
                  onClick={handleAddStudent}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:opacity-90"
                >
                  <Plus className="size-3.5" />
                  Add Student
                </button>
              </div>

              {/* Students List Table */}
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3 w-32">Include in Build</th>
                      <th className="p-3">Roll No</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Year / Batch</th>
                      <th className="p-3">Branch</th>
                      <th className="p-3">Enrolled Courses</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {students.map((s) => {
                      const isIncluded = s.included !== false
                      return (
                        <tr key={s.id} className={`hover:bg-muted/15 ${!isIncluded ? 'opacity-50' : ''}`}>
                          <td className="p-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() =>
                                  setStudents((prev) =>
                                    prev.map((item) =>
                                      item.id === s.id
                                        ? { ...item, included: item.included === false ? true : false }
                                        : item
                                    )
                                  )
                                }
                                className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                              />
                              <span className="text-[10px] font-bold">
                                {isIncluded ? 'Included' : 'Excluded'}
                              </span>
                            </label>
                          </td>
                          <td className="p-3 font-bold text-foreground">{s.rollNo}</td>
                          <td className="p-3 text-foreground">{s.name}</td>
                          <td className="p-3">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">
                              {s.semester || (s.year === '1st Year' ? 'Semester 1 (Sem A - Odd)' : s.year === '2nd Year' ? 'Semester 3 (Sem A - Odd)' : s.year === '3rd Year' ? 'Semester 5 (Sem A - Odd)' : 'Semester 7 (Sem A - Odd)')}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-foreground">{s.branch}</td>
                          <td className="p-3 text-muted-foreground">
                            {s.enrolledCourseCodes.join(', ')}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() =>
                                setStudents((prev) => prev.filter((item) => item.id !== s.id))
                              }
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
          )}

          {/* TAB 3: Course Catalog */}
          {activeTab === 'courses' && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-border bg-muted/20 p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Add New Course</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Course Code (e.g. CS-305)"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Course Name (e.g. Computer Networks)"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <select
                    value={newCourse.year}
                    onChange={(e) => setNewCourse({ ...newCourse, year: e.target.value as any })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                  <select
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value as any })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
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
                  <input
                    type="text"
                    placeholder="Department (e.g. CSE)"
                    value={newCourse.department}
                    onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                </div>
                <button
                  onClick={handleAddCourse}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:opacity-90"
                >
                  <Plus className="size-3.5" />
                  Add Course
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3 w-32">Include in Build</th>
                      <th className="p-3">Course Code</th>
                      <th className="p-3">Course Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Target Year</th>
                      <th className="p-3">Target Sem</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...courses]
                      .sort((a, b) => {
                        const getSemesterOrder = (sem?: string, year?: string): number => {
                          const str = `${sem || ''} ${year || ''}`
                          const match = str.match(/(?:Semester|Sem)\s*(\d+)/i)
                          if (match) return parseInt(match[1], 10)
                          if (str.includes('1st Year')) return 1
                          if (str.includes('2nd Year')) return 3
                          if (str.includes('3rd Year')) return 5
                          if (str.includes('4th Year')) return 7
                          return 99
                        }
                        const semA = getSemesterOrder(a.semester, a.year)
                        const semB = getSemesterOrder(b.semester, b.year)
                        if (semA !== semB) return semA - semB
                        return a.name.localeCompare(b.name)
                      })
                      .map((c) => {
                      const isIncluded = c.included !== false
                      return (
                        <tr key={c.id} className={`hover:bg-muted/15 ${!isIncluded ? 'opacity-50' : ''}`}>
                          <td className="p-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() =>
                                  setCourses((prev) =>
                                    prev.map((item) =>
                                      item.id === c.id
                                        ? { ...item, included: item.included === false ? true : false }
                                        : item
                                    )
                                  )
                                }
                                className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                              />
                              <span className="text-[10px] font-bold">
                                {isIncluded ? 'Included' : 'Excluded'}
                              </span>
                            </label>
                          </td>
                          <td className="p-3 font-bold text-foreground">{c.code}</td>
                          <td className="p-3 font-medium text-foreground">{c.name}</td>
                          <td className="p-3 text-muted-foreground">{c.department}</td>
                          <td className="p-3 text-muted-foreground">{c.year}</td>
                          <td className="p-3">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">
                              {c.semester || (c.year === '1st Year' ? 'Semester 1 (Sem A - Odd)' : c.year === '2nd Year' ? 'Semester 3 (Sem A - Odd)' : c.year === '3rd Year' ? 'Semester 5 (Sem A - Odd)' : 'Semester 7 (Sem A - Odd)')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() =>
                                setCourses((prev) => prev.filter((item) => item.id !== c.id))
                              }
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
          )}

          {/* TAB 4: Rooms & Labs */}
          {activeTab === 'rooms' && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-border bg-muted/20 p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Add Room / Laboratory</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Room Name (e.g. Lecture Hall 103)"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Code (e.g. LH-103)"
                    value={newRoom.code}
                    onChange={(e) => setNewRoom({ ...newRoom, code: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <select
                    value={newRoom.type}
                    onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value as any })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="hall">Lecture Hall</option>
                    <option value="classroom">Classroom</option>
                    <option value="lab">🔬 Computer / Science Lab</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Total Benches / Desks (e.g. 15)"
                    value={newRoom.totalBenches}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, totalBenches: Number(e.target.value) })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <input
                    type="number"
                    placeholder="Seats per Bench (e.g. 1, 2, or 3)"
                    value={newRoom.benchCapacity}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, benchCapacity: Number(e.target.value) })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Building / Location"
                    value={newRoom.building}
                    onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                </div>
                <button
                  onClick={handleAddRoom}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:opacity-90"
                >
                  <Plus className="size-3.5" />
                  Add Room
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3">Room / Code</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Benches</th>
                      <th className="p-3">Bench Capacity</th>
                      <th className="p-3">Total Seats</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rooms.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/15">
                        <td className="p-3">
                          <p className="font-bold text-foreground">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.code} · {r.building}</p>
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground capitalize">
                            {r.type}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{r.totalBenches} benches</td>
                        <td className="p-3 text-muted-foreground">{r.benchCapacity} students / bench</td>
                        <td className="p-3 font-bold text-primary">
                          {r.totalBenches * r.benchCapacity} seats
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              setRooms((prev) => prev.filter((item) => item.id !== r.id))
                            }
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: Faculty & Priorities */}
          {activeTab === 'teachers' && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-border bg-muted/20 p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Add Faculty Member</h3>
                <div className="grid gap-3 sm:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Teacher Name (e.g. Dr. Alok Gupta)"
                    value={newTeacher.name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Department (e.g. CSE / ECE)"
                    value={newTeacher.department}
                    onChange={(e) =>
                      setNewTeacher({ ...newTeacher, department: e.target.value })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                  <select
                    value={newTeacher.priority}
                    onChange={(e) =>
                      setNewTeacher({ ...newTeacher, priority: e.target.value as any })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="high">⭐ High Priority (Senior Faculty)</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Max Duties Limit (e.g. 6)"
                    value={newTeacher.maxDuties}
                    onChange={(e) =>
                      setNewTeacher({ ...newTeacher, maxDuties: Number(e.target.value) })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                </div>
                <button
                  onClick={handleAddTeacher}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:opacity-90"
                >
                  <Plus className="size-3.5" />
                  Add Teacher
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3">Faculty Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Priority Level</th>
                      <th className="p-3">Max Allowed Duties</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...teachers]
                      .sort((a, b) => {
                        const getPriorityScore = (p: any): number => {
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
                          return scoreA - scoreB
                        }
                        return a.name.localeCompare(b.name)
                      })
                      .map((t) => (
                      <tr key={t.id} className="hover:bg-muted/15">
                        <td className="p-3 font-bold text-foreground">{t.name}</td>
                        <td className="p-3 text-muted-foreground">{t.department}</td>
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              t.priority === 'high'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : t.priority === 'medium'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{t.maxDuties} slots</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              setTeachers((prev) => prev.filter((item) => item.id !== t.id))
                            }
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
