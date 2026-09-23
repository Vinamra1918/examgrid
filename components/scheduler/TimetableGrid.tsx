import { useState } from 'react'
import {
  BookOpen,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Filter,
  GraduationCap,
  Layers,
  LayoutGrid,
  MapPin,
  Printer,
  Sparkles,
  Table,
  UserCheck,
  Users,
} from 'lucide-react'
import { AcademicYear, ExamType, ScheduledSlot } from '@/lib/types'

interface TimetableGridProps {
  slots: ScheduledSlot[]
  onSelectSlotForSeating: (slotId: string) => void
}

export function TimetableGrid({ slots, onSelectSlotForSeating }: TimetableGridProps) {
  const [selectedYear, setSelectedYear] = useState<string>('All')
  const [selectedType, setSelectedType] = useState<string>('All')
  const [viewFormat, setViewFormat] = useState<'table' | 'cards'>('table')

  const years: string[] = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year']
  const types: { label: string; value: string }[] = [
    { label: 'All Exams', value: 'All' },
    { label: 'Theory Only', value: 'theory' },
    { label: 'Lab Quizzes Only', value: 'lab_quiz' },
  ]

  const handlePrint = () => {
    window.print()
  }

  // Filter slots based on selected criteria
  const filteredSlots = slots
    .map((slot) => {
      const matchingCourses = slot.scheduledCourses.filter((c) => {
        const matchYear = selectedYear === 'All' || c.year === selectedYear
        const matchType = selectedType === 'All' || c.type === selectedType
        return matchYear && matchType
      })

      return {
        ...slot,
        visibleCourses: matchingCourses.length > 0 ? matchingCourses : (selectedYear === 'All' && selectedType === 'All' ? slot.scheduledCourses : []),
        isVisible: matchingCourses.length > 0 || (selectedYear === 'All' && selectedType === 'All' && slot.scheduledCourses.length > 0),
      }
    })
    .filter((s) => s.isVisible && s.visibleCourses.length > 0)

  // Group slots by Day Number
  const slotsByDay = new Map<number, typeof filteredSlots>()
  filteredSlots.forEach((slot) => {
    const list = slotsByDay.get(slot.dayNumber) || []
    list.push(slot)
    slotsByDay.set(slot.dayNumber, list)
  })

  // Flattened row list for Master Table
  const tableRows: {
    slotId: string
    dayNumber: number
    date: string
    timeRange: string
    slotLabel: string
    course: (typeof filteredSlots)[0]['scheduledCourses'][0]
    rooms: typeof filteredSlots[0]['roomAllocations']
    facultyList: typeof filteredSlots[0]['assignedFaculty']
    totalSeated: number
  }[] = []

  filteredSlots.forEach((slot) => {
    slot.visibleCourses.forEach((c) => {
      tableRows.push({
        slotId: slot.slotId,
        dayNumber: slot.dayNumber,
        date: slot.date,
        timeRange: slot.timeRange,
        slotLabel: slot.slotLabel,
        course: c,
        rooms: slot.roomAllocations,
        facultyList: slot.assignedFaculty,
        totalSeated: slot.roomAllocations.reduce((sum, r) => sum + r.totalSeated, 0),
      })
    })
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Controls & Filter Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
            <button
              onClick={() => setViewFormat('table')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewFormat === 'table'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table className="size-3.5" />
              Tabular Timetable
            </button>
            <button
              onClick={() => setViewFormat('cards')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewFormat === 'cards'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="size-3.5" />
              Day Schedule Cards
            </button>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
            <Filter className="ml-2 size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground mr-1">Year:</span>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  selectedYear === y
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Exam Type Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
            {types.map((t) => (
              <button
                key={t.value}
                onClick={() => setSelectedType(t.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  selectedType === t.value
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
        >
          <Printer className="size-3.5" />
          Print Timetable
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW FORMAT 1: HIGH CLARITY TABULAR TIMETABLE (Date, Time, Subject, Duty) */}
      {/* ========================================================================= */}
      {viewFormat === 'table' ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="border-b border-border bg-muted/20 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground">Official Examination Timetable & Faculty Duty Roster</h3>
              <p className="text-xs text-muted-foreground">Comprehensive date, slot time, course duration, venue, and invigilation allocation</p>
            </div>
            <span className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-bold text-primary">
              {tableRows.length} Scheduled Exam Entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-foreground font-bold border-b border-border">
                <tr>
                  <th className="py-3.5 px-4 w-28">Date & Day</th>
                  <th className="py-3.5 px-4 w-36">Time & Shift</th>
                  <th className="py-3.5 px-4">Subject & Course Code</th>
                  <th className="py-3.5 px-4 w-32">Cohort / Semester</th>
                  <th className="py-3.5 px-4 w-24 text-center">Duration</th>
                  <th className="py-3.5 px-4">Venue & Invigilators (Duty)</th>
                  <th className="py-3.5 px-4">Roll No Range per Room</th>
                  <th className="py-3.5 px-4 text-right">Seating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-background">
                {tableRows.map((row, idx) => (
                  <tr key={`${row.slotId}_${row.course.code}_${idx}`} className="hover:bg-muted/15 transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-4 align-top">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary text-[11px] block w-fit">
                        Day {row.dayNumber}
                      </span>
                      <p className="mt-1 font-bold text-foreground">{row.date}</p>
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-center gap-1.5 text-foreground font-bold">
                        <Clock className="size-3.5 text-primary" />
                        <span>{row.timeRange}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{row.slotLabel}</span>
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[11px]">
                          {row.course.code}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                            row.course.type === 'lab_quiz'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {row.course.type === 'lab_quiz' ? 'Lab Quiz' : 'Theory'}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-foreground">{row.course.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{row.course.studentCount} Students Enrolled</p>
                    </td>

                    {/* Semester / Cohort */}
                    <td className="py-3.5 px-4 align-top">
                      <span className="font-semibold text-foreground block">{row.course.year}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground mt-0.5 inline-block">
                        {row.course.semester || 'All Cohorts'}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4 align-top text-center">
                      <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-1 font-bold text-blue-800 text-[11px]">
                        {row.course.durationMinutes} mins
                      </span>
                    </td>

                    {/* Duty Roster / Rooms */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {row.rooms
                          .filter((r) => r.coursesConducted.some((c) => c.code === row.course.code))
                          .map((r) => {
                            const teachers =
                              r.invigilators && r.invigilators.length > 0
                                ? r.invigilators
                                : r.invigilator
                                ? [r.invigilator]
                                : []

                            return (
                              <div
                                key={r.roomId}
                                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 shadow-2xs text-[11px]"
                              >
                                <Building2 className="size-3 text-muted-foreground" />
                                <span className="font-bold text-foreground">{r.roomName.split('(')[0]}</span>
                                <span className="text-muted-foreground">·</span>
                                <UserCheck className="size-3 text-emerald-600" />
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {teachers.length > 0
                                    ? teachers.map((t) => t.name).join(' & ')
                                    : 'Unassigned'}
                                </span>
                              </div>
                            )
                          })}
                      </div>
                    </td>

                    {/* Roll No Range per Room Column */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-col gap-1">
                        {row.rooms
                          .filter((r) => r.coursesConducted.some((c) => c.code === row.course.code))
                          .map((r) => {
                            const conducted = r.coursesConducted.find((c) => c.code === row.course.code)
                            const rollRange = conducted ? conducted.rollNoRange : 'None'
                            const count = conducted ? conducted.studentCount : 0

                            return (
                              <div
                                key={r.roomId}
                                className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-0.5 font-mono text-[11px] text-amber-900 shadow-2xs w-fit"
                              >
                                <span className="font-bold text-slate-700 font-sans">{r.roomName.split('(')[0]}:</span>
                                <span className="font-bold text-amber-800">{rollRange}</span>
                                <span className="text-[10px] text-slate-500 font-sans">({count})</span>
                              </div>
                            )
                          })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <button
                        onClick={() => onSelectSlotForSeating(row.slotId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-2xs"
                      >
                        <Layers className="size-3" />
                        Seating Plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW FORMAT 2: GROUPED DAY SCHEDULE CARDS */
        /* ========================================================================= */
        <div className="flex flex-col gap-6">
          {Array.from(slotsByDay.entries()).map(([dayNumber, daySlots]) => {
            const firstSlot = daySlots[0]
          return (
            <div
              key={dayNumber}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                    D{dayNumber}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Day {dayNumber} · {firstSlot?.date}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {daySlots.length} Active Slots Scheduled
                    </p>
                  </div>
                </div>
              </div>

              {/* Slots List inside this Day */}
              <div className="divide-y divide-border">
                {daySlots.map((slot) => (
                  <div
                    key={slot.slotId}
                    className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between hover:bg-muted/10 transition-colors"
                  >
                    {/* Time & Slot Label */}
                    <div className="flex flex-col gap-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        <span className="text-sm font-bold text-foreground">
                          {slot.timeRange}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {slot.slotLabel}
                      </span>
                      <div className="mt-2">
                        <button
                          onClick={() => onSelectSlotForSeating(slot.slotId)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Layers className="size-3.5" />
                          View Bench Seating ({slot.roomAllocations.reduce((sum, r) => sum + r.totalSeated, 0)} Students)
                        </button>
                      </div>
                    </div>

                    {/* Courses in this Slot */}
                    <div className="flex-1">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {slot.visibleCourses.map((c) => (
                          <div
                            key={c.code}
                            className="flex flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-2xs"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                                  {c.code}
                                </span>
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  {c.year}
                                </span>
                                {c.semester && (
                                  <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                                    {c.semester}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  c.type === 'lab_quiz'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                              >
                                {c.type === 'lab_quiz' ? '🔬 Lab Quiz' : '📝 Theory'}
                              </span>
                            </div>

                            <p className="mt-2 text-xs font-semibold text-foreground line-clamp-1">
                              {c.name}
                            </p>

                            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-1.5">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3 text-slate-400" />
                                <span className="font-semibold text-foreground">{c.durationMinutes} mins</span>
                              </span>
                              <span className="font-bold text-foreground">
                                {c.studentCount} Students
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rooms & Invigilator Distribution */}
                    <div className="flex flex-col gap-2 min-w-[260px] border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Allocated Rooms & Invigilators
                      </span>

                      <div className="flex flex-col gap-2">
                        {slot.roomAllocations.map((r) => (
                          <div
                            key={r.roomId}
                            className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-foreground">
                                {r.roomName.split('(')[0]}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {r.invigilator ? r.invigilator.name : 'Unassigned'}
                              </p>
                            </div>
                            <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-bold text-foreground border border-border">
                              {r.totalSeated} / {r.totalCapacity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        </div>
      )}
    </div>
  )
}
