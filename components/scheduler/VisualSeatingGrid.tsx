import { useState } from 'react'
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Info,
  Layers,
  LayoutGrid,
  MapPin,
  Maximize2,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Tv,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { RoomSeatingPlan, ScheduledSlot } from '@/lib/types'

interface VisualSeatingGridProps {
  slots: ScheduledSlot[]
  selectedSlotId?: string
  onSlotChange?: (slotId: string) => void
}

export function VisualSeatingGrid({
  slots,
  selectedSlotId,
  onSlotChange,
}: VisualSeatingGridProps) {
  const [activeSlotId, setActiveSlotId] = useState<string>(
    selectedSlotId || slots[0]?.slotId || ''
  )
  const [activeRoomIndex, setActiveRoomIndex] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [printMode, setPrintMode] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'benches' | 'theater'>('theater')
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false)
  const [hoveredSeat, setHoveredSeat] = useState<any>(null)

  const currentSlot = slots.find((s) => s.slotId === (selectedSlotId || activeSlotId)) || slots[0]

  if (!currentSlot || currentSlot.roomAllocations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
        <MapPin className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-base font-semibold text-foreground">No Room Allocations</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No exams or seating plans generated for this slot yet. Run the scheduler to see bench seating.
        </p>
      </div>
    )
  }

  const currentRoom: RoomSeatingPlan =
    currentSlot.roomAllocations[activeRoomIndex] || currentSlot.roomAllocations[0]

  const handlePrint = () => {
    window.print()
  }

  // Course color palette for distinct visual interleaving
  const courseColorPalette = [
    {
      bg: 'bg-blue-500/10 dark:bg-blue-950/40',
      border: 'border-blue-500/30 dark:border-blue-500/50',
      text: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-600 text-white',
      accent: 'border-l-4 border-l-blue-500',
    },
    {
      bg: 'bg-amber-500/10 dark:bg-amber-950/40',
      border: 'border-amber-500/30 dark:border-amber-500/50',
      text: 'text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-600 text-white',
      accent: 'border-l-4 border-l-amber-500',
    },
    {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      border: 'border-emerald-500/30 dark:border-emerald-500/50',
      text: 'text-emerald-700 dark:text-emerald-300',
      badge: 'bg-emerald-600 text-white',
      accent: 'border-l-4 border-l-emerald-500',
    },
    {
      bg: 'bg-purple-500/10 dark:bg-purple-950/40',
      border: 'border-purple-500/30 dark:border-purple-500/50',
      text: 'text-purple-700 dark:text-purple-300',
      badge: 'bg-purple-600 text-white',
      accent: 'border-l-4 border-l-purple-500',
    },
  ]

  const getCourseStyle = (courseCode?: string) => {
    if (!courseCode) return null
    const index = currentRoom.coursesConducted.findIndex((c) => c.code === courseCode)
    return courseColorPalette[index >= 0 ? index % courseColorPalette.length : 0]
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Controls: Slot Selector & Room Navigator */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Slot:
            </span>
            <select
              value={currentSlot.slotId}
              onChange={(e) => {
                const newId = e.target.value
                setActiveSlotId(newId)
                setActiveRoomIndex(0)
                if (onSlotChange) onSlotChange(newId)
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
            >
              {slots.map((s) => (
                <option key={s.slotId} value={s.slotId}>
                  Day {s.dayNumber} · {s.slotLabel} ({s.timeRange})
                </option>
              ))}
            </select>
          </div>

          {/* Room Selector Pill Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
            {currentSlot.roomAllocations.map((r, idx) => (
              <button
                key={r.roomId}
                onClick={() => setActiveRoomIndex(idx)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeRoomIndex === idx
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground'
                }`}
              >
                <Building2 className="size-3.5" />
                {r.roomName.split('(')[0]}
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeRoomIndex === idx
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {r.totalSeated}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Student, View Switcher, Info Button & Print */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher Pill (Theater / Cinema Matrix vs Bench Cards) */}
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1">
            <button
              onClick={() => setViewMode('theater')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === 'theater'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="BookMyShow Theater Style Room Layout Matrix (Left / Right / Middle Seats)"
            >
              <Tv className="size-3.5" />
              Theater Grid
            </button>
            <button
              onClick={() => setViewMode('benches')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === 'benches'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Individual Bench Cards Layout"
            >
              <LayoutGrid className="size-3.5" />
              Bench Cards
            </button>
          </div>

          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Highlight Roll No / Name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 rounded-lg border border-border bg-background py-1.5 pr-3 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-hidden sm:w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Room Architecture & Blueprint Info Button */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100 transition-colors"
            title="View Room Layout Blueprint, Rows, Columns, and Capacity Info"
          >
            <Info className="size-3.5 text-amber-600" />
            Room Info
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
          >
            <Printer className="size-3.5" />
            Print Seating
          </button>
        </div>
      </div>

      {/* Main Room Layout Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm print:border-none print:shadow-none">
        {/* Room Header Information */}
        <div className="border-b border-border bg-muted/25 p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {currentRoom.roomType === 'lab' ? '🔬 Practical Lab' : '🏛️ Examination Hall'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Day {currentSlot.dayNumber} · {currentSlot.date} · {currentSlot.timeRange}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {currentRoom.roomName}
                </h2>
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="rounded-full bg-muted p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  title="Room Layout Info"
                >
                  <Info className="size-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Total Capacity: {currentRoom.totalCapacity} seats ({currentRoom.benches.length} benches) · Occupancy:{' '}
                <span className="font-semibold text-foreground">
                  {currentRoom.totalSeated} / {currentRoom.totalCapacity} (
                  {Math.round((currentRoom.totalSeated / currentRoom.totalCapacity) * 100)}%)
                </span>
              </p>
            </div>

            {/* Room Invigilator Badge */}
            {currentRoom.invigilator && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/80 p-3 shadow-xs">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${
                    currentRoom.invigilator.priority === 'high'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                      : currentRoom.invigilator.priority === 'medium'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {currentRoom.invigilator.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                        currentRoom.invigilator.priority === 'high'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : currentRoom.invigilator.priority === 'medium'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {currentRoom.invigilator.priority} Priority
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hall Invigilator · Dept. of {currentRoom.invigilator.department}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Conducted Courses Banner with Roll Number Ranges */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentRoom.coursesConducted.map((course, idx) => {
              const style = courseColorPalette[idx % courseColorPalette.length]
              return (
                <div
                  key={course.code}
                  className={`flex flex-col justify-between rounded-xl border p-3 ${style.bg} ${style.border}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${style.badge}`}>
                        {course.code}
                      </span>
                      <p className="mt-1 text-xs font-semibold text-foreground line-clamp-1">
                        {course.name}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {course.studentCount} Students
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-muted-foreground">
                    Roll Nos: <span className="font-semibold text-foreground">{course.rollNoRange}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Anti-Cheating Interleaving Banner */}
          {currentRoom.coursesConducted.length >= 2 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Interleaved Bench Arrangement Active:</strong> Students from different courses sit side-by-side on each bench to prevent copying.
              </span>
            </div>
          )}
        </div>

        {/* 2D Bench Seating Visualizer */}
        <div className="p-5 md:p-8">
          {/* Blackboard / Teacher Stage */}
          <div className="mb-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl rounded-t-2xl border-2 border-dashed border-primary/40 bg-gradient-to-b from-primary/10 to-transparent py-2.5 text-center text-xs font-bold tracking-widest text-primary uppercase shadow-inner">
              SCREEN / BLACKBOARD / INVIGILATOR PODIUM
            </div>
            <div className="h-1 w-full max-w-2xl bg-primary/30 rounded-full" />
            <p className="mt-1 text-[11px] text-muted-foreground">Front of Room</p>
          </div>

          {/* ========================================================================= */}
          {/* THEATER / BOOKMYSHOW STYLE SEAT MATRIX VIEW (90-DEGREE ROTATED AUDITORIUM) */}
          {/* ========================================================================= */}
          {viewMode === 'theater' ? (
            <div className="flex flex-col gap-6 overflow-x-auto pb-4">
              {/* Legend & Orientation Notice */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary text-[11px]">
                    🔄 90° Clockwise Auditorium Orientation
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    Columns run horizontally as rows, Rows run vertically.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 font-medium">
                  <div className="flex items-center gap-1.5">
                    <div className="size-3.5 rounded border border-border bg-muted/40" />
                    <span className="text-muted-foreground">Vacant Seat</span>
                  </div>
                  {currentRoom.coursesConducted.map((c, i) => {
                    const style = courseColorPalette[i % courseColorPalette.length]
                    return (
                      <div key={c.code} className="flex items-center gap-1.5">
                        <div className={`size-3.5 rounded border ${style.bg} ${style.border}`} />
                        <span className="font-semibold text-foreground">{c.code}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 90-Degree Rotated Grid */}
              {(() => {
                // Find all unique columns (aisles) and rows
                const maxCol = Math.max(...currentRoom.benches.map((b) => b.col), 1)
                const maxRow = Math.max(...currentRoom.benches.map((b) => b.row), 1)
                const isThreeSeater = currentRoom.benches[0]?.seats.length === 3

                // Map bench by row and col
                const benchMap = new Map<string, (typeof currentRoom.benches)[0]>()
                currentRoom.benches.forEach((b) => {
                  benchMap.set(`${b.row}_${b.col}`, b)
                })

                // In 90 degree clockwise rotation:
                // New horizontal rows = Old Columns (Col 1 to maxCol)
                // New vertical columns = Old Rows in reverse (Row maxRow down to 1) or 1 to maxRow
                const colIndexes = Array.from({ length: maxCol }, (_, i) => i + 1)
                const rowIndexes = Array.from({ length: maxRow }, (_, i) => i + 1)

                return (
                  <div className="flex flex-col gap-4 min-w-[760px] p-2">
                    {/* Top Row Header (Row Numbers R1, R2, R3... from left to right) */}
                    <div className="flex items-center gap-2 pl-16">
                      {rowIndexes.map((rNum) => (
                        <div
                          key={rNum}
                          className="flex-1 text-center font-bold text-primary text-xs py-1 rounded-md bg-primary/10"
                        >
                          Row {rNum}
                        </div>
                      ))}
                    </div>

                    {/* Columns Grid (Each column is a horizontal line of desks across rows) */}
                    {colIndexes.map((colNum) => (
                      <div key={colNum} className="flex items-center gap-2">
                        {/* Column Identifier Badge */}
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-xs font-bold text-foreground border border-border shadow-2xs">
                          Col {colNum}
                        </div>

                        {/* Desks across Rows */}
                        <div className="flex flex-1 items-center gap-2">
                          {rowIndexes.map((rowNum) => {
                            const bench = benchMap.get(`${rowNum}_${colNum}`)

                            if (!bench) {
                              return (
                                <div
                                  key={`empty_${rowNum}_${colNum}`}
                                  className="flex-1 h-16 rounded-xl border border-dashed border-border/40 bg-muted/10"
                                />
                              )
                            }

                            return (
                              <div
                                key={bench.benchNumber}
                                className="group relative flex-1 flex flex-col items-center justify-between rounded-xl border border-border bg-card p-2 shadow-2xs hover:border-primary/60 hover:shadow-md transition-all"
                              >
                                {/* Bench Header */}
                                <div className="flex w-full items-center justify-between text-[9px] font-bold text-muted-foreground border-b border-border/40 pb-1 mb-1">
                                  <span>B#{bench.benchNumber}</span>
                                  <span className="text-[8px] text-muted-foreground/80">
                                    R{bench.row}·C{bench.col}
                                  </span>
                                </div>

                                {/* Seats: Left / Right or Left / Middle / Right */}
                                <div className="flex w-full items-center justify-center gap-1.5">
                                  {bench.seats.map((seat, seatIdx) => {
                                    const style = getCourseStyle(seat.student?.courseCode)
                                    const posLabel = isThreeSeater
                                      ? seatIdx === 0 ? 'L' : seatIdx === 1 ? 'M' : 'R'
                                      : bench.seats.length === 1 ? '1' : seatIdx === 0 ? 'L' : 'R'

                                    const isMatch =
                                      seat.student &&
                                      searchQuery &&
                                      (seat.student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        seat.student.name.toLowerCase().includes(searchQuery.toLowerCase()))

                                    if (!seat.student) {
                                      return (
                                        <div
                                          key={seat.seatIndex}
                                          className="relative group/seat flex flex-1 size-8 max-w-[36px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-[10px] font-bold text-muted-foreground/40 cursor-default hover:border-primary/40"
                                        >
                                          {posLabel}
                                          {/* Mini Tooltip */}
                                          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/seat:flex whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow-md z-30">
                                            Vacant ({posLabel})
                                          </div>
                                        </div>
                                      )
                                    }

                                    return (
                                      <div
                                        key={seat.seatIndex}
                                        onMouseEnter={() =>
                                          setHoveredSeat({
                                            ...seat,
                                            benchNumber: bench.benchNumber,
                                            row: bench.row,
                                            col: bench.col,
                                            posLabel,
                                          })
                                        }
                                        onMouseLeave={() => setHoveredSeat(null)}
                                        className={`group/seat relative flex flex-1 size-8 max-w-[36px] items-center justify-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all hover:scale-115 hover:z-20 shadow-2xs ${
                                          style?.bg || 'bg-muted'
                                        } ${style?.border || 'border-border'} ${
                                          isMatch
                                            ? 'ring-2 ring-primary scale-115 font-extrabold animate-pulse'
                                            : ''
                                        }`}
                                      >
                                        {posLabel}

                                        {/* Dynamic Instant Hover Popover on Seat */}
                                        <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/seat:flex flex-col items-center rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-white shadow-xl z-50 min-w-[160px] backdrop-blur-xs animate-in zoom-in-95">
                                          <div className="flex items-center gap-1.5 w-full justify-between">
                                            <span className="font-mono text-[11px] font-bold text-amber-300">
                                              {seat.student.rollNo}
                                            </span>
                                            <span className="rounded bg-primary px-1.5 py-0.2 text-[9px] font-bold text-primary-foreground">
                                              {seat.student.courseCode}
                                            </span>
                                          </div>
                                          <p className="mt-1 text-xs font-bold text-slate-100 text-center line-clamp-1 w-full">
                                            {seat.student.name}
                                          </p>
                                          <div className="mt-1 pt-1 border-t border-slate-700 w-full flex items-center justify-between text-[9px] text-slate-300">
                                            <span>Bench #{bench.benchNumber} ({posLabel === 'L' ? 'Left' : posLabel === 'M' ? 'Middle' : posLabel === 'R' ? 'Right' : 'Single'})</span>
                                            <span>Row {bench.row}</span>
                                          </div>
                                          {/* Triangle notch */}
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Bottom Sticky Detail Banner when Hovering */}
              {hoveredSeat && hoveredSeat.student && (
                <div className="sticky bottom-2 mx-auto flex items-center gap-4 rounded-2xl border-2 border-primary bg-card p-3.5 shadow-xl ring-2 ring-primary/20 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-xs">
                    {hoveredSeat.posLabel}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {hoveredSeat.student.rollNo}
                      </span>
                      <span className="rounded-md bg-primary/15 border border-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                        {hoveredSeat.student.courseCode}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {hoveredSeat.student.year} · {hoveredSeat.student.branch}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {hoveredSeat.student.name}
                    </p>
                  </div>
                  <div className="border-l border-border pl-4 text-right text-xs text-muted-foreground">
                    <p className="font-bold text-foreground">Bench #{hoveredSeat.benchNumber}</p>
                    <p>
                      Row {hoveredSeat.row}, Col {hoveredSeat.col} ·{' '}
                      <strong className="text-foreground">
                        {hoveredSeat.posLabel === 'L'
                          ? 'Left Seat (L)'
                          : hoveredSeat.posLabel === 'M'
                          ? 'Middle Seat (M)'
                          : hoveredSeat.posLabel === 'R'
                          ? 'Right Seat (R)'
                          : 'Individual Terminal'}
                      </strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* BENCH CARDS GRID VIEW */
            /* ========================================================================= */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {currentRoom.benches.map((bench) => {
                const hasMatchingStudent = bench.seats.some(
                  (s) =>
                    s.student &&
                    searchQuery &&
                    (s.student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.student.name.toLowerCase().includes(searchQuery.toLowerCase()))
                )

                return (
                  <div
                    key={bench.benchNumber}
                    className={`group relative flex flex-col rounded-xl border p-4 transition-all ${
                      hasMatchingStudent
                        ? 'border-primary ring-3 ring-primary/30 bg-primary/5 shadow-md scale-[1.02]'
                        : 'border-border bg-card hover:border-primary/40 hover:shadow-xs'
                    }`}
                  >
                    {/* Bench Header */}
                    <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                          {bench.benchNumber}
                        </span>
                        Bench #{bench.benchNumber}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                          {bench.seats.length} Seater
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Row {bench.row}, Col {bench.col}
                        </span>
                      </div>
                    </div>

                    {/* Bench Worktop Visual Line */}
                    <div className="mb-3 h-1.5 w-full rounded-full bg-muted shadow-inner" />

                    {/* Seats on this Bench */}
                    <div
                      className={`grid gap-2.5 ${
                        bench.seats.length === 1
                          ? 'grid-cols-1'
                          : bench.seats.length >= 3
                          ? 'grid-cols-3'
                          : 'grid-cols-2'
                      }`}
                    >
                      {bench.seats.map((seat) => {
                        const style = getCourseStyle(seat.student?.courseCode)
                        const isHighlighted =
                          seat.student &&
                          searchQuery &&
                          (seat.student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            seat.student.name.toLowerCase().includes(searchQuery.toLowerCase()))

                        if (!seat.student) {
                          return (
                            <div
                              key={seat.seatIndex}
                              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-center"
                            >
                              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase">
                                {seat.seatLabel}
                              </span>
                              <span className="mt-1 text-[11px] text-muted-foreground/50">
                                Vacant
                              </span>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={seat.seatIndex}
                            className={`flex flex-col justify-between rounded-lg border p-2.5 transition-all ${
                              style?.bg || 'bg-muted/30'
                            } ${style?.border || 'border-border'} ${
                              isHighlighted ? 'ring-2 ring-primary font-bold shadow-xs' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="rounded bg-background/80 px-1.5 py-0.2 text-[9px] font-bold text-foreground shadow-2xs">
                                {seat.seatLabel}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                  style?.badge || 'bg-muted text-foreground'
                                }`}
                              >
                                {seat.student.courseCode}
                              </span>
                            </div>

                            <div className="mt-2">
                              <p className="text-xs font-bold text-foreground">
                                {seat.student.rollNo}
                              </p>
                              <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">
                                {seat.student.name}
                              </p>
                            </div>

                            <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground border-t border-border/40 pt-1">
                              <span>{seat.student.year}</span>
                              <span className="font-semibold">{seat.student.branch}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Printable Door Notice Footer (Always visible in clean format) */}
        <div className="border-t border-border bg-muted/15 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">Door Notice Summary:</span>{' '}
              {currentRoom.coursesConducted.map((c) => `${c.code}: ${c.rollNoRange} (${c.studentCount})`).join(' | ')}
            </div>
            <div>
              Generated by <span className="font-semibold text-foreground">ExamGrid Scheduler</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROOM ARCHITECTURE & LAYOUT BLUEPRINT INFO MODAL */}
      {/* ========================================================================= */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{currentRoom.roomName}</h3>
                  <p className="text-xs text-muted-foreground">Architectural Layout & Seat Matrix Specs</p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Capacity</span>
                  <p className="mt-1 text-lg font-bold text-foreground">{currentRoom.totalCapacity}</p>
                  <span className="text-[10px] text-muted-foreground">Seats</span>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Benches / Desks</span>
                  <p className="mt-1 text-lg font-bold text-foreground">{currentRoom.benches.length}</p>
                  <span className="text-[10px] text-muted-foreground">Units</span>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Bench Capacity</span>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {currentRoom.benches[0]?.seats.length || 2}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Per Bench</span>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Occupancy</span>
                  <p className="mt-1 text-lg font-bold text-emerald-600">{currentRoom.totalSeated}</p>
                  <span className="text-[10px] text-muted-foreground">Seated</span>
                </div>
              </div>

              {/* Layout Matrix Breakdown */}
              <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Auditorium Blueprint Matrix
                </span>
                <ul className="mt-2 space-y-1.5 text-muted-foreground">
                  <li className="flex items-center justify-between">
                    <span>Row Division:</span>
                    <strong className="text-foreground">
                      {Math.max(...currentRoom.benches.map((b) => b.row), 1)} Rows
                    </strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Columns per Row:</span>
                    <strong className="text-foreground">
                      {Math.max(...currentRoom.benches.map((b) => b.col), 1)} Columns
                    </strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Position Labeling:</span>
                    <strong className="text-foreground">
                      {currentRoom.benches[0]?.seats.length === 3
                        ? 'Left (L) · Middle (M) · Right (R)'
                        : currentRoom.benches[0]?.seats.length === 2
                        ? 'Left (L) · Right (R)'
                        : 'Individual Workstation (1)'}
                    </strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Cheating Prevention Strategy:</span>
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      Multi-Subject Interleaving Active
                    </strong>
                  </li>
                </ul>
              </div>

              {/* Specific Hall Blueprint Notes */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-blue-900">
                <span className="font-bold">Hall Details:</span>
                <p className="mt-1">
                  {currentRoom.roomName.includes('LT-102') || currentRoom.roomName.includes('LT-002')
                    ? '120-seat Lecture Theater configured with 5 tiered rows and 12 two-seater benches per row (Left & Right).'
                    : currentRoom.roomName.includes('212')
                    ? '90-seat Examination Room arranged in 3 tiered rows and 10 three-seater benches per row (Left, Middle & Right).'
                    : 'Specialized Computer / Science Laboratory equipped with individual workstation terminals.'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Close Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
