'use client'

import { useState } from 'react'
import {
  Calendar,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  Printer,
  X,
} from 'lucide-react'
import { ExamSessionConfig, ScheduleResult, ScheduledSlot } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StudentTimetableOptions {
  instituteName: string
  departmentName: string
  academicSession: string
  timetableTitle: string
  notes: string[]
  copyTo: string[]
  headLabel: string
  headDeptLabel: string
}

interface StudentTimetablePdfProps {
  scheduleResult: ScheduleResult
  config: ExamSessionConfig
}

interface TimetableRow {
  date: string
  timeRange: string
  slotLabel: string
  courses: {
    code: string
    name: string
    year: string
    semester: string
  }[]
}

// ---------------------------------------------------------------------------
// Data Transformation helpers
// ---------------------------------------------------------------------------

function formatStudentTimetable(
  slots: ScheduledSlot[],
  yearFilter: string,
  semesterFilter: string
): TimetableRow[] {
  const filtered = slots
    .map((slot) => {
      const matchingCourses = slot.scheduledCourses.filter((c) => {
        const matchYear = yearFilter === 'All' || c.year === yearFilter
        const matchSem =
          semesterFilter === 'All' ||
          !semesterFilter ||
          (c.semester || '') === semesterFilter
        return matchYear && matchSem
      })
      return { ...slot, matchingCourses }
    })
    .filter((s) => s.matchingCourses.length > 0)

  return filtered.map((slot) => ({
    date: slot.date,
    timeRange: slot.timeRange,
    slotLabel: slot.slotLabel,
    courses: slot.matchingCourses.map((c) => ({
      code: c.code,
      name: c.name,
      year: c.year,
      semester: c.semester || '',
    })),
  }))
}

function getUniqueYears(slots: ScheduledSlot[]): string[] {
  const years = new Set<string>()
  slots.forEach((s) => s.scheduledCourses.forEach((c) => years.add(c.year)))
  return ['All', ...Array.from(years).sort()]
}

function getUniqueSemesters(slots: ScheduledSlot[], yearFilter: string): string[] {
  const sems = new Set<string>()
  slots.forEach((s) =>
    s.scheduledCourses.forEach((c) => {
      if (yearFilter === 'All' || c.year === yearFilter) {
        if (c.semester) sems.add(c.semester)
      }
    })
  )
  return ['All', ...Array.from(sems).sort()]
}

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

async function generateStudentTimetablePdf(
  rows: TimetableRow[],
  options: StudentTimetableOptions,
  config: ExamSessionConfig
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginL = 18
  const marginR = 18
  const contentW = pageW - marginL - marginR
  let y = 15

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(options.instituteName, pageW / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(11)
  doc.text(options.departmentName, pageW / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(10)
  const titleLines = doc.splitTextToSize(options.timetableTitle, contentW)
  doc.text(titleLines, pageW / 2, y, { align: 'center' })
  y += titleLines.length * 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text('Academic Session: ' + options.academicSession, pageW / 2, y, { align: 'center' })
  y += 8

  const examTypeLabel =
    config.examType === 'mst'
      ? 'B.Tech. Mid Semester Test (MST)'
      : config.examType === 'quiz'
      ? 'B.Tech. Lab Quiz / Practical Evaluation'
      : 'B.Tech. Examination'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(examTypeLabel, pageW / 2, y, { align: 'center' })
  y += 6

  const today = new Date()
  const dateStr =
    'Date: ' +
    String(today.getDate()).padStart(2, '0') +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    today.getFullYear()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(dateStr, pageW - marginR, y, { align: 'right' })
  y += 6

  doc.setDrawColor(0)
  doc.setLineWidth(0.4)
  doc.line(marginL, y, pageW - marginR, y)
  y += 4

  if (rows.length === 0) {
    doc.text('No timetable data for the selected filters.', marginL, y + 10)
    doc.save('student-timetable.pdf')
    return
  }

  // Distinct year columns
  const yearSet = new Set<string>()
  rows.forEach((r) => r.courses.forEach((c) => yearSet.add(c.year)))
  const yearColumns = Array.from(yearSet).sort()

  const tableHead = [['Date', 'Time', ...yearColumns]]
  const tableBody = rows.map((row) => {
    const yearCells = yearColumns.map((yr) => {
      const cs = row.courses.filter((c) => c.year === yr)
      if (cs.length === 0) return '\u2014'
      return cs.map((c) => c.code + '\n' + c.name).join('\n\n')
    })
    return [row.date, row.timeRange, ...yearCells]
  })

  const yearColW = (contentW - 38 - 36) / Math.max(yearColumns.length, 1)
  const colStyles: Record<number, object> = {
    0: { halign: 'center', fontStyle: 'bold', cellWidth: 38 },
    1: { halign: 'center', cellWidth: 36 },
  }
  yearColumns.forEach((_, i) => {
    colStyles[i + 2] = { halign: 'center', cellWidth: yearColW }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(doc as any).autoTable({
    head: tableHead,
    body: tableBody,
    startY: y,
    margin: { left: marginL, right: marginR },
    tableWidth: contentW,
    columnStyles: colStyles,
    headStyles: {
      fillColor: [200, 210, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [0, 0, 0],
      lineColor: [120, 120, 120],
      lineWidth: 0.2,
      cellPadding: 2.5,
      valign: 'middle',
      overflow: 'linebreak',
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY: number = (doc as any).lastAutoTable.finalY || y + 40
  let noteY = finalY + 8

  if (options.notes.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Note:', marginL, noteY)
    noteY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    options.notes.forEach((note, i) => {
      const lines = doc.splitTextToSize((i + 1) + '. ' + note, contentW - 5)
      doc.text(lines, marginL + 3, noteY)
      noteY += lines.length * 4.5
    })
  }

  noteY += 6
  if (options.copyTo.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Copy to:', marginL, noteY)
    noteY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    options.copyTo.forEach((c) => {
      doc.text(c, marginL + 3, noteY)
      noteY += 4.5
    })
  }

  // Signature block
  const sigX = pageW - marginR - 30
  const sigBaseY = finalY + 25
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(options.headLabel, sigX, sigBaseY, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.text(options.headDeptLabel, sigX, sigBaseY + 5, { align: 'center' })

  // Page numbers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPages = (doc.internal as any).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(
      'Page ' + p + ' of ' + totalPages,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
    doc.text(
      'Generated by ExamGrid \u00b7 ' + new Date().toLocaleDateString(),
      marginL,
      doc.internal.pageSize.getHeight() - 8
    )
    doc.setTextColor(0)
  }

  doc.save('student-timetable.pdf')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentTimetablePdf({ scheduleResult, config }: StudentTimetablePdfProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [selectedYear, setSelectedYear] = useState('All')
  const [selectedSemester, setSelectedSemester] = useState('All')

  const [instituteName, setInstituteName] = useState(
    'Shri G S Institute of Technology & Science, Indore'
  )
  const [departmentName, setDepartmentName] = useState('Department of Computer Engineering')
  const [academicSession, setAcademicSession] = useState('JULY-DEC 2026-27')
  const [notes, setNotes] = useState(
    '1. All the students are required to carefully note the timetable and seating plan.\n2. No regular classes will be held during the examination period.'
  )
  const [copyTo, setCopyTo] = useState(
    'Head, E&TC Deptt.\nHead, Applied Mathematics Deptt.\nHead, Humanities & Social Sciences Deptt.'
  )
  const [headLabel, setHeadLabel] = useState('Head')
  const [headDeptLabel, setHeadDeptLabel] = useState('Computer Engineering Department')

  const uniqueYears = getUniqueYears(scheduleResult.slots)
  const uniqueSemesters = getUniqueSemesters(scheduleResult.slots, selectedYear)

  const timetableRows = formatStudentTimetable(
    scheduleResult.slots,
    selectedYear,
    selectedSemester
  )

  const handleYearChange = (y: string) => {
    setSelectedYear(y)
    setSelectedSemester('All')
  }

  const timetableTitle =
    config.title +
    (selectedSemester !== 'All' ? ' \u2013 ' + selectedSemester : '')

  const buildOptions = (): StudentTimetableOptions => ({
    instituteName,
    departmentName,
    academicSession,
    timetableTitle,
    notes: notes
      .split('\n')
      .map((l) => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean),
    copyTo: copyTo.split('\n').map((l) => l.trim()).filter(Boolean),
    headLabel,
    headDeptLabel,
  })

  const handleDownloadPdf = async () => {
    if (timetableRows.length === 0) {
      alert('No timetable data for the selected filters. Please adjust filters.')
      return
    }
    setIsGenerating(true)
    try {
      await generateStudentTimetablePdf(timetableRows, buildOptions(), config)
    } catch (err) {
      console.error('PDF generation error:', err)
      alert('Failed to generate PDF. Please check the browser console for details.')
    } finally {
      setIsGenerating(false)
    }
  }

  const yearColumnsInResult = Array.from(
    new Set(timetableRows.flatMap((r) => r.courses.map((c) => c.year)))
  ).sort()

  return (
    <>
      {/* Trigger button */}
      <button
        id="btn-student-timetable-pdf"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-100 transition-all"
      >
        <GraduationCap className="size-3.5" />
        Student Timetable PDF
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
          <div className="relative my-6 w-full max-w-5xl rounded-2xl border border-border bg-background shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Generate Student Timetable</h2>
                  <p className="text-xs text-muted-foreground">
                    Official A4 PDF from existing generated timetable data
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-6 p-6">
              {/* Filters */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Filter Timetable Data
                </h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">Academic Year</label>
                    <div className="flex flex-wrap gap-1.5">
                      {uniqueYears.map((y) => (
                        <button
                          key={y}
                          onClick={() => handleYearChange(y)}
                          className={
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ' +
                            (selectedYear === y
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground')
                          }
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>

                  {uniqueSemesters.length > 1 && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground">Semester</label>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueSemesters.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSelectedSemester(s)}
                            className={
                              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ' +
                              (selectedSemester === s
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground')
                            }
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{timetableRows.length}</strong> exam slot
                    {timetableRows.length !== 1 ? 's' : ''} matched
                  </span>
                  <span>
                    <strong className="text-foreground">{yearColumnsInResult.length}</strong> year
                    column{yearColumnsInResult.length !== 1 ? 's' : ''} in PDF
                  </span>
                </div>
              </div>

              {/* PDF header options */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PDF Header Information
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Institute Name', value: instituteName, setter: setInstituteName },
                    { label: 'Department', value: departmentName, setter: setDepartmentName },
                    {
                      label: 'Academic Session (e.g. JULY-DEC 2026-27)',
                      value: academicSession,
                      setter: setAcademicSession,
                    },
                    { label: 'Head / Signatory Label', value: headLabel, setter: setHeadLabel },
                    {
                      label: 'Department (Signatory line)',
                      value: headDeptLabel,
                      setter: setHeadDeptLabel,
                    },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-foreground">{label}</label>
                      <input
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground">
                      Notes (one per line; numbers auto-added)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="resize-none rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground">
                      Copy to (one per line)
                    </label>
                    <textarea
                      value={copyTo}
                      onChange={(e) => setCopyTo(e.target.value)}
                      rows={4}
                      className="resize-none rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {timetableRows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
                  <Calendar className="size-8 text-amber-500" />
                  <p className="text-sm font-bold text-amber-700">No timetable data for selected filters</p>
                  <p className="text-xs text-amber-600">
                    Please select a different Year or Semester combination.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Timetable Preview
                    </h3>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Matches PDF layout
                    </span>
                  </div>
                  <div
                    id="student-timetable-print-area"
                    className="overflow-x-auto rounded-xl border border-border bg-white shadow-xs"
                  >
                    <div className="min-w-[580px] p-6 text-black" style={{ fontFamily: 'serif' }}>
                      {/* Doc header */}
                      <div className="text-center">
                        <p className="text-sm font-bold">{instituteName}</p>
                        <p className="text-xs font-semibold">{departmentName}</p>
                        <p className="text-xs">{timetableTitle}</p>
                        <p className="text-[11px] text-gray-600">Academic Session: {academicSession}</p>
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-xs font-bold">
                          {config.examType === 'mst'
                            ? 'B.Tech. Mid Semester Test (MST)'
                            : config.examType === 'quiz'
                            ? 'B.Tech. Lab Quiz / Practical Evaluation'
                            : 'B.Tech. Examination'}
                        </p>
                      </div>
                      <div className="mt-1 text-right">
                        <p className="text-[11px]">
                          {'Date: ' +
                            String(new Date().getDate()).padStart(2, '0') +
                            '-' +
                            String(new Date().getMonth() + 1).padStart(2, '0') +
                            '-' +
                            new Date().getFullYear()}
                        </p>
                      </div>
                      <hr className="my-2 border-black" />
                      {/* Table */}
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr style={{ backgroundColor: '#c8d2e6' }}>
                            <th className="border border-gray-600 px-2 py-1.5 text-center font-bold">Date</th>
                            <th className="border border-gray-600 px-2 py-1.5 text-center font-bold">Time</th>
                            {yearColumnsInResult.map((y) => (
                              <th key={y} className="border border-gray-600 px-2 py-1.5 text-center font-bold">
                                {y}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {timetableRows.map((row, idx) => (
                            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                              <td className="border border-gray-400 px-2 py-2 text-center font-semibold align-top">
                                {row.date}
                              </td>
                              <td className="border border-gray-400 px-2 py-2 text-center align-top">
                                {row.timeRange}
                              </td>
                              {yearColumnsInResult.map((yr) => {
                                const courses = row.courses.filter((c) => c.year === yr)
                                return (
                                  <td key={yr} className="border border-gray-400 px-2 py-2 text-center align-top">
                                    {courses.length === 0 ? (
                                      <span className="text-gray-400">&mdash;</span>
                                    ) : (
                                      courses.map((c, ci) => (
                                        <div key={ci} className={ci > 0 ? 'mt-2' : ''}>
                                          <p className="font-bold leading-tight">{c.code}</p>
                                          <p className="text-gray-700 leading-snug">{c.name}</p>
                                        </div>
                                      ))
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {/* Notes */}
                      {notes.trim() && (
                        <div className="mt-4">
                          <p className="text-xs font-bold">Note:</p>
                          {notes
                            .split('\n')
                            .filter(Boolean)
                            .map((line, i) => (
                              <p key={i} className="text-[11px]">
                                {/^\d+\./.test(line) ? line : i + 1 + '. ' + line}
                              </p>
                            ))}
                        </div>
                      )}
                      {/* Footer */}
                      <div className="mt-6 flex justify-between">
                        <div>
                          {copyTo.trim() && (
                            <>
                              <p className="text-[11px] font-bold">Copy to:</p>
                              {copyTo
                                .split('\n')
                                .filter(Boolean)
                                .map((line, i) => (
                                  <p key={i} className="text-[11px]">{line}</p>
                                ))}
                            </>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="h-8" />
                          <p className="text-[11px] font-bold">{headLabel}</p>
                          <p className="text-[11px] font-semibold">{headDeptLabel}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  <Printer className="size-3.5" />
                  Print Preview
                </button>
                <button
                  id="btn-download-student-timetable-pdf"
                  onClick={handleDownloadPdf}
                  disabled={isGenerating || timetableRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60 transition-all"
                >
                  {isGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  {isGenerating ? 'Generating PDF\u2026' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
