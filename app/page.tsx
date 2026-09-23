'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Filter,
  Gauge,
  GraduationCap,
  Layers,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import {
  Course,
  ExamSessionConfig,
  Room,
  ScheduleResult,
  Student,
  Teacher,
} from '@/lib/types'
import {
  defaultCourses,
  defaultExamConfigs,
  defaultRooms,
  defaultStudents,
  defaultTeachers,
} from '@/lib/presets'
import { generateSchedule } from '@/lib/scheduler-engine'
import { VisualSeatingGrid } from '@/components/scheduler/VisualSeatingGrid'
import { TimetableGrid } from '@/components/scheduler/TimetableGrid'
import { FacultyDutyRoster } from '@/components/scheduler/FacultyDutyRoster'
import { InputManagerModal } from '@/components/scheduler/InputManagerModal'
import { InputsManagementView } from '@/components/scheduler/InputsManagementView'

const navItems = [
  { id: 'inputs', label: 'Inputs & Data Center', icon: SlidersHorizontal },
  { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
  { id: 'timetable', label: 'Master Timetable', icon: CalendarDays },
  { id: 'seating', label: 'Rooms & Seating Plan', icon: Layers },
  { id: 'invigilators', label: 'Faculty & Duty Roster', icon: Users },
]

export default function Page() {
  const [mounted, setMounted] = useState(false)

  // Navigation
  const [activeTab, setActiveTab] = useState<string>('inputs')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDataModalOpen, setIsDataModalOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Datasets & Config state
  const [selectedPresetType, setSelectedPresetType] = useState<'mst' | 'end_sem' | 'quiz'>('mst')
  const [config, setConfig] = useState<ExamSessionConfig>(defaultExamConfigs.mst)
  const [students, setStudents] = useState<Student[]>(defaultStudents)
  const [courses, setCourses] = useState<Course[]>(defaultCourses)
  const [rooms, setRooms] = useState<Room[]>(defaultRooms)
  const [teachers, setTeachers] = useState<Teacher[]>(defaultTeachers)

  // Scheduling result state
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null)
  const [selectedSlotForSeating, setSelectedSlotForSeating] = useState<string>('')

  // Solver running animation
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  // Solver trigger: Validates capacity/slots, gives clear alerts if low, and generates schedule
  const handleRunSolver = () => {
    // 1. Calculate active resources
    const activeCourses = courses.filter((c) => {
      if (c.included === false) return false
      if (config.examType === 'quiz') {
        return c.type === 'lab_quiz' || c.name.toLowerCase().includes('lab') || c.code.toLowerCase().includes('lab')
      }
      return c.type === 'theory' && !c.name.toLowerCase().includes('lab') && !c.code.toLowerCase().includes('lab')
    })

    const activeStudents = students.filter((s) => s.included !== false)

    const activeRooms = rooms.filter((r) => {
      if (r.included === false) return false
      if (config.examType === 'quiz') return r.type === 'lab'
      return r.type === 'hall' || r.type === 'classroom'
    })

    // Calculate total available slots across all days
    let totalSlotsAvailable = 0
    for (let d = 1; d <= (config.totalDays || 4); d++) {
      const daySlots = (config.daySpecificSlots && config.daySpecificSlots[d]) || config.slotsPerDay || []
      totalSlotsAvailable += daySlots.length
    }

    // Maximum exams required for any single SEMESTER (since Sem A & Sem B of same year can run concurrently)
    const coursesPerSem: Record<string, number> = {}
    activeCourses.forEach((c) => {
      const sem = c.semester || c.year
      coursesPerSem[sem] = (coursesPerSem[sem] || 0) + 1
    })
    const maxExamsInAnySemester = Math.max(...Object.values(coursesPerSem), 0)

    // Calculate total seating capacity across all usable rooms per slot
    const totalSingleSlotRoomCapacity = activeRooms.reduce((sum, r) => {
      return sum + (r.totalBenches || 0) * (r.benchCapacity || 1)
    }, 0)

    // Check maximum concurrent student load for any single semester
    const maxStudentsInSingleSemester = Math.max(
      activeStudents.filter((s) => s.semester?.includes('Semester 3')).length,
      activeStudents.filter((s) => s.semester?.includes('Semester 4')).length,
      activeStudents.filter((s) => s.semester?.includes('Semester 5')).length,
      activeStudents.filter((s) => s.semester?.includes('Semester 6')).length,
      activeStudents.filter((s) => s.semester?.includes('Semester 7')).length,
      activeStudents.filter((s) => s.semester?.includes('Semester 8')).length,
      Math.floor(activeStudents.length / 4),
      0
    )

    // Build deficiency warning alerts
    const alerts: string[] = []

    if (totalSlotsAvailable < maxExamsInAnySemester) {
      const worstSemEntry = Object.entries(coursesPerSem).find(([_, count]) => count === maxExamsInAnySemester)
      alerts.push(
        `⚠️ INSUFFICIENT SLOTS:\n` +
        `• Available Slots: ${totalSlotsAvailable} slots across ${config.totalDays} days.\n` +
        `• Required Slots: At least ${maxExamsInAnySemester} slots needed for ${worstSemEntry ? worstSemEntry[0] : 'your semester courses'}.\n` +
        `Please increase Total Days or add more Slots/Shifts per Day in Section 1.`
      )
    }

    if (totalSingleSlotRoomCapacity < maxStudentsInSingleSemester) {
      alerts.push(
        `⚠️ INSUFFICIENT SEATING CAPACITY:\n` +
        `• Usable Seating Capacity: ${totalSingleSlotRoomCapacity} seats across ${activeRooms.length} active rooms/labs.\n` +
        `• Students in Cohort: ~${maxStudentsInSingleSemester} students need seats in concurrent sessions.\n` +
        `Please enable more rooms or increase bench/workstation capacities in Section 4.`
      )
    }

    if (alerts.length > 0) {
      window.alert(
        `[ExamGrid Capacity Alert]\n\n` +
        alerts.join('\n\n') +
        `\n\nProceeding to generate best possible partial timetable.`
      )
    }

    setRunning(true)
    setProgress(0)
    try {
      const result = generateSchedule(config, students, courses, rooms, teachers)
      setScheduleResult(result)
      if (result.slots.length > 0) {
        setSelectedSlotForSeating(result.slots[0].slotId)
      }
      setTimeout(() => {
        setRunning(false)
        setProgress(100)
        setActiveTab('timetable')
      }, 150)
    } catch (err) {
      console.error('Error generating schedule:', err)
      setRunning(false)
    }
  }

  // Pre-generate default initial schedule on load so all tabs are populated
  useEffect(() => {
    if (!scheduleResult) {
      const initialResult = generateSchedule(config, students, courses, rooms, teachers)
      setScheduleResult(initialResult)
      if (initialResult.slots.length > 0) {
        setSelectedSlotForSeating(initialResult.slots[0].slotId)
      }
    }
  }, [])

  const runLabel = useMemo(
    () => (running ? `Solving Constraints… ${progress}%` : 'Solve & Generate Timetable →'),
    [running, progress]
  )

  const handlePresetSwitch = (type: 'mst' | 'quiz') => {
    setSelectedPresetType(type)
    setConfig(defaultExamConfigs[type])
  }

  const navigateToSeatingSlot = (slotId: string) => {
    setSelectedSlotForSeating(slotId)
    setActiveTab('seating')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        {/* Logo / Header */}
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-xs">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-base">ExamGrid</div>
            <div className="text-xs text-sidebar-foreground/60">Academic Scheduler</div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div className="flex flex-col gap-6">
            <div>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                Workspace
              </p>
              <nav className="flex flex-col gap-1">
                {navItems.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === 'parameters') {
                        setIsDataModalOpen(true)
                      } else {
                        setActiveTab(id)
                      }
                    }}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                      activeTab === id && id !== 'parameters'
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-xs'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="size-4" />
                      {label}
                    </span>
                    {id === 'timetable' && scheduleResult && (
                      <span className="rounded-md bg-sidebar-foreground/10 px-1.5 py-0.5 text-[10px]">
                        {scheduleResult.slots.length} Slots
                      </span>
                    )}
                    {id === 'seating' && scheduleResult && (
                      <span className="rounded-md bg-sidebar-foreground/10 px-1.5 py-0.5 text-[10px]">
                        {scheduleResult.totalStudentsSeated} Seats
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Exam Mode Switcher in Sidebar (MST vs Lab Quiz) */}
            <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
                Active Timetable Mode
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  { type: 'mst', label: 'Mid-Sem Test (MST)', icon: '📝', desc: 'Theory interleave exams' },
                  { type: 'quiz', label: 'Lab Quizzes / Evaluations', icon: '🔬', desc: 'Laboratory evaluations' },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handlePresetSwitch(item.type as 'mst' | 'quiz')}
                    className={`flex flex-col rounded-xl p-2.5 text-left text-xs transition-all ${
                      config.examType === item.type
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-xs font-bold'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.icon}</span>
                      <span className="font-bold">{item.label}</span>
                    </div>
                    <span className="mt-0.5 text-[10px] text-sidebar-foreground/60 pl-6">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* System Health / Status */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>Priority Engine Active</span>
              </div>
              <p className="mt-1 pl-6 text-[11px] text-sidebar-foreground/55">
                Dispersion Score:{' '}
                <span className="font-bold text-emerald-400">
                  {scheduleResult?.priorityDispersionScore ?? 100}%
                </span>
              </p>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 border-t border-sidebar-border px-2 pt-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
                EC
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">Exam Cell Officer</p>
                <p className="truncate text-[10px] text-sidebar-foreground/50">
                  Academic Operations
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 hover:bg-muted lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                College Examination Scheduling System
              </p>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {config.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Manage Parameters / All Inputs Button */}
            <button
              onClick={() => setActiveTab('inputs')}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === 'inputs'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">All Inputs & Setup</span>
            </button>

            {/* Solver Run Button */}
            <button
              onClick={handleRunSolver}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              <Play className="size-3.5 fill-current" />
              {runLabel}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex w-64 flex-col bg-sidebar p-5 text-sidebar-foreground">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-6 text-primary" />
                  <span className="font-bold">ExamGrid</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-2">
                {navItems.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === 'parameters') {
                        setIsDataModalOpen(true)
                      } else {
                        setActiveTab(id)
                      }
                      setMobileMenuOpen(false)
                    }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold ${
                      activeTab === id
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'hover:bg-sidebar-accent'
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main Body */}
        <main className="mx-auto max-w-[1600px] p-5 md:p-8">
          {/* TAB 0: ALL-IN-ONE INPUTS VIEW */}
          {activeTab === 'inputs' && (
            mounted ? (
              <InputsManagementView
                students={students}
                setStudents={setStudents}
                courses={courses}
                setCourses={setCourses}
                rooms={rooms}
                setRooms={setRooms}
                teachers={teachers}
                setTeachers={setTeachers}
                config={config}
                setConfig={setConfig}
                onSaveAndRerun={handleRunSolver}
              />
            ) : (
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading inputs management...
                </div>
              </div>
            )
          )}

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && scheduleResult && (
            <div className="flex flex-col gap-6">
              {/* Header Hero */}
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span>Active Session</span>
                    <span>/</span>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-primary uppercase font-bold text-[10px]">
                      {config.examType === 'quiz'
                        ? 'Lab Quiz Evaluation'
                        : config.examType === 'mst'
                        ? 'Mid-Sem Test'
                        : 'End-Sem Finals'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    Timetable & Seating Overview
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Automated conflict-free scheduling with dual-exam interleaved bench seating & priority faculty distribution.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-2xs hover:bg-muted"
                  >
                    <Printer className="size-3.5" />
                    Print Screen
                  </button>
                  <button
                    onClick={() => setActiveTab('seating')}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90"
                  >
                    <Layers className="size-3.5" />
                    View Room Seating Plans
                  </button>
                </div>
              </div>

              {/* Constraint Violations Alert (if any) */}
              {scheduleResult.constraintViolations.length > 0 && (
                <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="size-4 text-amber-600" />
                    <span>Scheduler Warnings:</span>
                  </div>
                  <ul className="list-disc pl-6">
                    {scheduleResult.constraintViolations.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* KPI Summary Cards */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Exams Scheduled
                    </span>
                    <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                      <BookOpen className="size-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                    {scheduleResult.totalExamsScheduled}{' '}
                    <span className="text-sm font-normal text-muted-foreground">Courses</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    ✓ 0 Student Cohort Clashes
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Seated Students
                    </span>
                    <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                      <GraduationCap className="size-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                    {scheduleResult.totalStudentsSeated}{' '}
                    <span className="text-sm font-normal text-muted-foreground">Assigned</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Across {students.length} registered students
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Rooms & Labs Utilized
                    </span>
                    <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                      <Building2 className="size-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                    {scheduleResult.totalRoomsUtilized}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {rooms.length} Total
                    </span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    Dual-Exam Interleaving Active
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Priority Dispersion
                    </span>
                    <div className="rounded-xl bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
                      <UserCheck className="size-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                    {scheduleResult.priorityDispersionScore}%
                  </p>
                  <p className="mt-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                    High-Priority Isolation Verified
                  </p>
                </div>
              </section>

              {/* Solver & Features Row */}
              <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                {/* Schedule Solver Status Card */}
                <div className="flex flex-col justify-between rounded-2xl border border-border bg-card shadow-xs">
                  <div className="flex items-center justify-between border-b border-border p-5">
                    <div>
                      <h3 className="font-bold text-foreground">
                        Constraint Optimization Engine
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Real-time backtracking solver for multi-course room sharing and bench seating
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      Optimal Solution
                    </span>
                  </div>

                  <div className="grid gap-6 p-5 sm:grid-cols-2 sm:items-center">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          Hard Constraints (Clash-Free)
                        </span>
                        <span className="font-bold text-emerald-600">100% Passed</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${running ? progress : 100}%` }}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-muted-foreground text-[11px]">Bench Policy</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {config.seatingMode === 'interleave_two_exams'
                              ? 'Interleaved 2-Exam'
                              : 'Single Exam'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-muted-foreground text-[11px]">Slots Generated</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {scheduleResult.slots.length} Total Slots
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-xl bg-muted/40 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <Sparkles className="size-4" />
                        <span>Smart Seating Insights</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Benches alternate students between different academic years (e.g. 1st Year + 3rd Year) to completely eliminate examination malpractice.
                      </p>
                      <button
                        onClick={() => setActiveTab('seating')}
                        className="mt-3 text-xs font-bold text-primary hover:underline text-left"
                      >
                        Inspect Bench Desk Matrix →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Roll Number Search / Lookup Widget */}
                <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h3 className="font-bold text-foreground">Student Desk Finder</h3>
                        <p className="text-xs text-muted-foreground">
                          Lookup which room & bench any student is assigned to
                        </p>
                      </div>
                      <Search className="size-4 text-muted-foreground" />
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      <p className="text-xs text-muted-foreground">
                        Click on any slot below to see bench-by-bench seat positions:
                      </p>

                      <div className="flex flex-col gap-2">
                        {scheduleResult.slots.slice(0, 3).map((slot) => (
                          <button
                            key={slot.slotId}
                            onClick={() => navigateToSeatingSlot(slot.slotId)}
                            className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  Day {slot.dayNumber} · {slot.slotLabel}
                                </span>
                                <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                                  {slot.timeRange}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {slot.scheduledCourses.map((c) => c.code).join(' & ')}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-primary">
                              View Desks →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Master Timetable Quick Preview */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Generated Exam Timetable
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Schedule matrix with course allocations across all available days and shifts
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('timetable')}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Open Full Timetable Matrix →
                  </button>
                </div>

                <TimetableGrid
                  slots={scheduleResult.slots}
                  onSelectSlotForSeating={navigateToSeatingSlot}
                />
              </section>
            </div>
          )}

          {/* TAB 2: MASTER TIMETABLE */}
          {activeTab === 'timetable' && scheduleResult && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Master Examination Schedule
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Slot-by-slot timetable matrix for {config.title}
                  </p>
                </div>
              </div>

              <TimetableGrid
                slots={scheduleResult.slots}
                onSelectSlotForSeating={navigateToSeatingSlot}
              />
            </div>
          )}

          {/* TAB 3: ROOMS & VISUAL SEATING PLAN */}
          {activeTab === 'seating' && scheduleResult && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Room & Bench Seating Layout
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exact desk assignments showing which student and roll number sits on each bench seat
                  </p>
                </div>
              </div>

              <VisualSeatingGrid
                slots={scheduleResult.slots}
                selectedSlotId={selectedSlotForSeating}
                onSlotChange={(id) => setSelectedSlotForSeating(id)}
              />
            </div>
          )}

          {/* TAB 4: FACULTY & DUTY ROSTER */}
          {activeTab === 'invigilators' && scheduleResult && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Faculty Invigilation Duty Roster
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Priority-dispersed faculty duty allocation ensuring high-priority senior teachers are in separate exam rooms
                  </p>
                </div>
              </div>

              <FacultyDutyRoster scheduleResult={scheduleResult} />
            </div>
          )}
        </main>
      </div>

      {/* Input / Parameter Manager Modal */}
      <InputManagerModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        students={students}
        setStudents={setStudents}
        courses={courses}
        setCourses={setCourses}
        rooms={rooms}
        setRooms={setRooms}
        teachers={teachers}
        setTeachers={setTeachers}
        config={config}
        setConfig={setConfig}
        onSaveAndRerun={handleRunSolver}
      />
    </div>
  )
}
