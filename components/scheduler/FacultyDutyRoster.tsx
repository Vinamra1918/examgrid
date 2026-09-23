'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  GraduationCap,
  Printer,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'
import { ScheduleResult, TeacherPriority } from '@/lib/types'

interface FacultyDutyRosterProps {
  scheduleResult: ScheduleResult
}

export function FacultyDutyRoster({ scheduleResult }: FacultyDutyRosterProps) {
  const [selectedPriority, setSelectedPriority] = useState<string>('All')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All')

  const { facultyDutyDistribution, priorityDispersionScore, slots } = scheduleResult

  const departments = ['All', ...Array.from(new Set(facultyDutyDistribution.map((f) => f.department)))]
  const uniquePriorities = Array.from(new Set(facultyDutyDistribution.map((f) => String(f.priority))))
  const priorities = [
    { label: 'All Priorities', value: 'All' },
    ...uniquePriorities.map((p) => ({
      label: `Rank ${p}`,
      value: p,
    })),
  ]

  const handlePrint = () => {
    window.print()
  }

  const filteredFaculty = facultyDutyDistribution
    .filter((f) => {
      const matchPri = selectedPriority === 'All' || String(f.priority) === selectedPriority
      const matchDept = selectedDepartment === 'All' || f.department === selectedDepartment
      return matchPri && matchDept
    })
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
        return scoreA - scoreB // Priority 1 (highest) first
      }
      return a.teacherName.localeCompare(b.teacherName) // Secondary sort by name
    })

  return (
    <div className="flex flex-col gap-6">
      {/* Priority Dispersion Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Priority Invigilator Dispersion Engine
              </h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                priorityDispersionScore >= 80
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : priorityDispersionScore > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  : 'bg-red-500/15 text-red-700 dark:text-red-400'
              }`}>
                {priorityDispersionScore}% {priorityDispersionScore >= 80 ? 'Verified' : 'Dispersion Score'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Constraint Guarantee: High-priority senior faculty members are strategically isolated across different examination halls in each slot.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
        >
          <Printer className="size-3.5" />
          Print Invigilation Roster
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
          <Filter className="ml-2 size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground mr-1">Priority:</span>
          {priorities.map((p) => (
            <button
              key={p.value}
              onClick={() => setSelectedPriority(p.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedPriority === p.value
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
          <span className="text-xs font-semibold text-muted-foreground ml-2 mr-1">Dept:</span>
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDepartment(d)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedDepartment === d
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFaculty.map((faculty) => {
          const isAtMax = faculty.dutiesCount >= faculty.maxDuties
          const dutyPercent = Math.round((faculty.dutiesCount / faculty.maxDuties) * 100)

          return (
            <div
              key={faculty.teacherId}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
            >
              {/* Top Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl font-bold text-xs ${
                        faculty.priority === 'high'
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                          : faculty.priority === 'medium'
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {faculty.teacherName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {faculty.teacherName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Dept. of {faculty.department}
                      </p>
                    </div>
                  </div>

                  <span
                    className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200"
                  >
                    Priority Rank {faculty.priority}
                  </span>
                </div>

                {/* Duty Load Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Duties Allocated:</span>
                    <span className="font-bold text-foreground">
                      {faculty.dutiesCount} / {faculty.maxDuties} slots ({dutyPercent}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isAtMax
                          ? 'bg-amber-500'
                          : faculty.priority === 'high'
                          ? 'bg-purple-600'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(dutyPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Assigned Duties List */}
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Assigned Sessions:
                  </p>
                  {faculty.assignedSlotSummaries.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground/70">
                      No duties assigned in this session.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {faculty.assignedSlotSummaries.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">Day {s.day}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-foreground">{s.slot.split('(')[0]}</span>
                          </div>
                          <span className="font-medium text-muted-foreground">
                            {s.room.split('(')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
