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
    sections: string[]
  }[]
}

// ---------------------------------------------------------------------------
// Data Transformation helpers
// ---------------------------------------------------------------------------

function normalizeSectionLabel(value: string): string | undefined {
  const normalized = value.trim().replace(/^(?:section|batch)\s*/i, '')
  const match = normalized.match(/^([ab])\s*\d*$/i)
  return match ? `Section ${match[1].toUpperCase()}` : undefined
}

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
        sections: (c.sections || []).map(normalizeSectionLabel).filter((section): section is string => Boolean(section)),
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

function formatTimetableDate(date: string): string {
  const match = date.match(/^(\w{3}), (\w{3}) (\d{1,2}), (\d{4})$/)
  if (!match) return date
  const [, dayAbbreviation, month, day, year] = match
  const weekdays: Record<string, string> = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
    Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
  }
  return `${day.padStart(2, '0')}-${month}-${year}\n${weekdays[dayAbbreviation] || dayAbbreviation}`
}

function formatYearHeading(year: string): string {
  const romanYear: Record<string, string> = {
    '1st Year': 'I', '2nd Year': 'II', '3rd Year': 'III', '4th Year': 'IV',
  }
  return `B.Tech ${romanYear[year] || year} Year`
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
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginL = 8
  const marginR = 8
  const contentW = pageW - marginL - marginR
  const examTypeLabel =
    config.examType === 'mst'
      ? 'B.Tech. Mid Semester Test (MST)'
      : config.examType === 'quiz'
      ? 'B.Tech. Lab Quiz / Practical Evaluation'
      : 'B.Tech. Examination'
  const sections = ['Section A', 'Section B'] as const

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) doc.addPage('a4', 'landscape')
    const y = 9
    const yearColumns = Array.from(new Set(rows.flatMap((row) => row.courses.map((course) => course.year)))).sort()

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(options.instituteName, pageW / 2, y, { align: 'center' })
    doc.setFontSize(10)
    doc.text(options.departmentName, pageW / 2, y + 6, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Time Table (${options.academicSession}) Section: ${section.slice(-1)}`, pageW / 2, y + 12, { align: 'center' })
    doc.setFontSize(10)
    doc.text(examTypeLabel, pageW / 2, y + 18, { align: 'center' })
    doc.setFontSize(9)
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageW - marginR, y + 25, { align: 'right' })
    doc.setDrawColor(30)
    doc.setLineWidth(0.35)
    doc.line(marginL, y + 28, pageW - marginR, y + 28)

    const body = rows.map((row) => [
      formatTimetableDate(row.date),
      row.timeRange,
      ...yearColumns.map((year) => row.courses
        .filter((course) => course.year === year && course.sections.includes(section))
        .map((course) => [
          course.code,
          course.name,
        ].join('\n'))
        .join('\n\n')),
    ])

    if (yearColumns.length === 0 || body.length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('No timetable entries match the selected year and semester filters.', marginL, y + 38)
    } else {
      autoTable(doc, {
        head: [['Date', 'Time', ...yearColumns.map(formatYearHeading)]],
        body,
        startY: y + 31,
        margin: { left: marginL, right: marginR, bottom: 42 },
        tableWidth: contentW,
        columnStyles: Object.fromEntries([
          [0, { cellWidth: 30, halign: 'center', fontStyle: 'bold' }],
          [1, { cellWidth: 38, halign: 'center', fontStyle: 'bold' }],
          ...yearColumns.map((_, index) => [index + 2, { cellWidth: (contentW - 68) / yearColumns.length, halign: 'center' }]),
        ]),
        headStyles: { fillColor: [205, 205, 205], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9.5, halign: 'center', valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.35 },
        bodyStyles: { fontSize: 9, textColor: [15, 20, 28], lineColor: [70, 70, 70], lineWidth: 0.3, cellPadding: 3, valign: 'middle', overflow: 'linebreak' },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        didDrawPage: () => {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(100)
          doc.text(`${section} Timetable`, marginL, pageH - 5)
          doc.setTextColor(0)
        },
      })
    }

    const lastTableY = (doc as any).lastAutoTable?.finalY || y + 38
    let footerY = Math.min(lastTableY + 6, pageH - 38)
    if (options.notes.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.text('Note:', marginL, footerY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      const notes = options.notes.map((note, index) => `${index + 1}. ${note}`)
      doc.text(doc.splitTextToSize(notes.join('  '), contentW - 12), marginL + 12, footerY)
      footerY += 12
    }
    if (options.copyTo.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('Copy to:', marginL, footerY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text(options.copyTo, marginL, footerY + 4)
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(`${options.headLabel}\n${options.headDeptLabel}`, pageW - marginR, footerY + 8, { align: 'right' })

  })

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100)
    doc.text(`Page ${p} of ${totalPages}`, pageW - marginR, pageH - 5, { align: 'right' })
    doc.setTextColor(0)
  }

  const fileSuffix = options.timetableTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `section-a-and-b-timetable-${fileSuffix || 'schedule'}.pdf`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
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

  const handlePrintPreview = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups to open the timetable print preview.')
      return
    }

    const sectionElements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-timetable-print-section]')
    )
    if (sectionElements.length === 0) {
      printWindow.close()
      alert('The timetable preview is not ready yet.')
      return
    }

    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character] || character)
    const examTypeLabel = config.examType === 'mst'
      ? 'B.Tech. Mid Semester Test (MST)'
      : config.examType === 'quiz'
      ? 'B.Tech. Lab Quiz / Practical Evaluation'
      : 'B.Tech. Examination'
    const sectionPages = sectionElements.map((sectionElement, index) => {
      const section = sectionElement.dataset.timetablePrintSection || `Section ${index === 0 ? 'A' : 'B'}`
      const table = sectionElement.querySelector('table')?.outerHTML || ''
      const notesHtml = notes.trim()
        ? `<div class="notes"><strong>Note:</strong>${notes.split('\n').filter(Boolean).map((line, noteIndex) => `<div>${escapeHtml(/^\d+\./.test(line) ? line : `${noteIndex + 1}. ${line}`)}</div>`).join('')}</div>`
        : ''
      const copyHtml = copyTo.trim()
        ? `<div class="copy"><strong>Copy to:</strong>${copyTo.split('\n').filter(Boolean).map((line) => `<div>${escapeHtml(line)}</div>`).join('')}</div>`
        : ''
      return `<article class="page">
        <header>
          <h1>${escapeHtml(instituteName)}</h1>
          <h2>${escapeHtml(departmentName)}</h2>
          <h3>Time Table (${escapeHtml(academicSession)}) Section: ${section.endsWith('A') ? 'A' : 'B'}</h3>
          <p>${escapeHtml(examTypeLabel)}</p>
          <div class="date">Date: ${new Date().toLocaleDateString('en-GB')}</div>
        </header>
        ${table}
        <footer>${notesHtml}${copyHtml}<div class="signature"><strong>${escapeHtml(headLabel)}</strong><br>${escapeHtml(headDeptLabel)}</div></footer>
      </article>`
    }).join('')

    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Section A and B Timetable</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111; font: 10pt Georgia, 'Times New Roman', serif; }
        .page { min-height: 185mm; page-break-after: always; break-after: page; position: relative; }
        .page:last-child { page-break-after: auto; break-after: auto; }
        header { text-align: center; border-bottom: 1px solid #222; margin-bottom: 8mm; padding-bottom: 4mm; }
        header h1 { font-size: 15pt; margin: 0 0 2mm; }
        header h2 { font-size: 12pt; margin: 0 0 2mm; }
        header h3 { font-size: 12pt; margin: 0 0 2mm; }
        header p { margin: 0; font-weight: bold; }
        .date { text-align: right; font-size: 9pt; margin-top: 2mm; }
        table { border-collapse: collapse; width: 100%; font-size: 9pt; }
        th, td { border: 1px solid #333; padding: 3mm; vertical-align: middle; }
        th { background: #d0d0d0 !important; color: #111 !important; text-align: center; }
        td { text-align: center; white-space: pre-line; }
        td:first-child { font-weight: bold; }
        .notes { margin-top: 6mm; font-size: 9pt; line-height: 1.4; }
        .copy { margin-top: 7mm; font-size: 9pt; line-height: 1.4; }
        footer { position: relative; margin-top: 6mm; min-height: 28mm; }
        .signature { position: absolute; right: 0; bottom: 0; text-align: center; }
        @media screen { body { background: #eee; padding: 12mm; } .page { background: white; padding: 10mm; margin: 0 auto 12mm; max-width: 277mm; box-shadow: 0 1mm 5mm #aaa; } }
      </style></head><body>${sectionPages}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.onafterprint = () => printWindow.close()
    window.setTimeout(() => printWindow.print(), 250)
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
                    One landscape PDF with Section A and Section B on separate pages
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
                      Section A and B on separate pages
                    </span>
                  </div>
                  <div
                    id="student-timetable-print-area"
                    className="overflow-x-auto rounded-xl border border-border bg-white shadow-xs"
                  >
                    <div className="min-w-145 p-6 text-black" style={{ fontFamily: 'serif' }}>
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
                      {(['Section A', 'Section B'] as const).map((section) => (
                        <section key={section} data-timetable-print-section={section} className="mt-5 first:mt-0" style={{ pageBreakBefore: section === 'Section B' ? 'always' : 'auto' }}>
                          <h3 className="mb-2 border-b border-gray-400 pb-1 text-sm font-bold">Time Table ({academicSession}) Section: {section.slice(-1)}</h3>
                          <table className="w-full border-collapse text-[10px]">
                            <thead>
                              <tr style={{ backgroundColor: '#224878', color: '#ffffff' }}>
                                {['Date', 'Time', ...yearColumnsInResult.map(formatYearHeading)].map((heading) => (
                                  <th key={heading} className="border border-gray-600 px-1.5 py-1.5 text-center font-bold">{heading}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {timetableRows.map((row, rowIndex) => (
                                <tr key={rowIndex} style={{ backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f3f7fc' }}>
                                  <td className="whitespace-pre-line border border-gray-400 px-1.5 py-1.5 text-center font-semibold">{formatTimetableDate(row.date)}</td>
                                  <td className="border border-gray-400 px-1.5 py-1.5 text-center font-semibold">{row.timeRange}</td>
                                  {yearColumnsInResult.map((year) => {
                                    const sectionCourses = row.courses.filter((course) => course.year === year && course.sections.includes(section))
                                    return (
                                      <td key={year} className="border border-gray-400 px-2 py-2 text-center align-middle">
                                        {sectionCourses.map((course, index) => (
                                          <div key={course.code} className={index ? 'mt-2 border-t border-gray-300 pt-2' : ''}>
                                            <p className="font-bold leading-tight">{course.code}</p>
                                            <p className="leading-snug">{course.name}</p>
                                          </div>
                                        ))}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </section>
                      ))}
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
                  onClick={handlePrintPreview}
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
                  {isGenerating ? 'Generating PDF\u2026' : 'Download both section pages'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
