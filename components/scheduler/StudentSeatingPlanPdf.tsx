'use client'

import { useState } from 'react'
import {
  Calendar,
  Download,
  FileSpreadsheet,
  Grid,
  Loader2,
  Printer,
  X,
} from 'lucide-react'
import { ExamSessionConfig, ScheduleResult } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

interface SeatingPlanOptions {
  instituteName: string
  departmentName: string
  academicSession: string
  reportTitle: string
  notes: string[]
  headLabel: string
  headDeptLabel: string
}

interface StudentSeatingPlanPdfProps {
  scheduleResult: ScheduleResult
  config: ExamSessionConfig
}

interface MatrixSlotRow {
  slotId: string
  date: string
  timeRange: string
  slotLabel: string
  // Room ID to text summary for that room
  roomSeatingMap: Record<
    string,
    {
      roomName: string
      details: string // e.g. "CS-301\n0801CS231001 – 0801CS231045 (45)"
      studentCount: number
    }
  >
}

// ---------------------------------------------------------------------------
// Transformation Helpers
// ---------------------------------------------------------------------------

function formatSeatingDate(date: string): string {
  const match = date.match(/^(\w{3}), (\w{3}) (\d{1,2}), (\d{4})$/)
  if (!match) return date
  const [, dayAbbreviation, month, day, year] = match
  const weekdays: Record<string, string> = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
    Sun: 'Sunday',
  }
  return `${day.padStart(2, '0')}-${month}-${year}\n${weekdays[dayAbbreviation] || dayAbbreviation}`
}

function buildSeatingMatrix(scheduleResult: ScheduleResult): {
  rooms: { roomId: string; roomName: string }[]
  rows: MatrixSlotRow[]
} {
  // 1. Collect all distinct rooms that are utilized across any slot
  const roomMap = new Map<string, string>()
  scheduleResult.slots.forEach((slot) => {
    slot.roomAllocations.forEach((alloc) => {
      if (!roomMap.has(alloc.roomId)) {
        roomMap.set(alloc.roomId, alloc.roomName)
      }
    })
  })

  // If no room allocations found, fallback to empty
  const rooms = Array.from(roomMap.entries()).map(([roomId, roomName]) => ({
    roomId,
    roomName,
  }))

  // 2. Build row for each slot
  const rows: MatrixSlotRow[] = scheduleResult.slots.map((slot) => {
    const roomSeatingMap: MatrixSlotRow['roomSeatingMap'] = {}

    slot.roomAllocations.forEach((alloc) => {
      const courseSummaries = alloc.coursesConducted.map((c) => {
        return `${c.code}\n${c.rollNoRange} (${c.studentCount})`
      })

      roomSeatingMap[alloc.roomId] = {
        roomName: alloc.roomName,
        details: courseSummaries.join('\n\n'),
        studentCount: alloc.totalSeated,
      }
    })

    return {
      slotId: slot.slotId,
      date: slot.date,
      timeRange: slot.timeRange,
      slotLabel: slot.slotLabel,
      roomSeatingMap,
    }
  })

  return { rooms, rows }
}

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

async function generateSeatingPlanPdf(
  rooms: { roomId: string; roomName: string }[],
  rows: MatrixSlotRow[],
  options: SeatingPlanOptions,
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
      ? 'B.Tech. Mid Semester Test (MST) — Student Seating Arrangement'
      : config.examType === 'quiz'
      ? 'B.Tech. Lab Quiz / Practical Evaluation — Seating Plan'
      : 'B.Tech. Examination — Student Seating Arrangement'

  const y = 9

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(options.instituteName, pageW / 2, y, { align: 'center' })
  doc.setFontSize(10)
  doc.text(options.departmentName, pageW / 2, y + 6, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`${options.reportTitle} (${options.academicSession})`, pageW / 2, y + 12, {
    align: 'center',
  })
  doc.setFontSize(10)
  doc.text(examTypeLabel, pageW / 2, y + 18, { align: 'center' })
  doc.setFontSize(9)
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageW - marginR, y + 25, {
    align: 'right',
  })

  doc.setDrawColor(30)
  doc.setLineWidth(0.35)
  doc.line(marginL, y + 28, pageW - marginR, y + 28)

  if (rooms.length === 0 || rows.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('No seating allocation data found in the generated schedule.', marginL, y + 38)
  } else {
    // Build headers & table body
    const head = [
      [
        'Date & Day',
        'Time Slot',
        ...rooms.map((r) => r.roomName.replace(/\s*\([^)]*\)/g, '')), // short room name
      ],
    ]

    const body = rows.map((row) => [
      formatSeatingDate(row.date),
      `${row.slotLabel}\n${row.timeRange}`,
      ...rooms.map((r) => {
        const alloc = row.roomSeatingMap[r.roomId]
        return alloc && alloc.details ? alloc.details : '—'
      }),
    ])

    const dateColW = 28
    const timeColW = 32
    const remainingW = contentW - dateColW - timeColW
    const roomColW = Math.max(26, remainingW / rooms.length)

    const columnStyles: Record<number, any> = {
      0: { cellWidth: dateColW, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: timeColW, halign: 'center', fontStyle: 'bold' },
    }

    rooms.forEach((_, idx) => {
      columnStyles[idx + 2] = {
        cellWidth: roomColW,
        halign: 'center',
      }
    })

    autoTable(doc, {
      head,
      body,
      startY: y + 31,
      margin: { left: marginL, right: marginR, bottom: 35 },
      tableWidth: contentW,
      columnStyles,
      headStyles: {
        fillColor: [34, 72, 120], // Deep corporate blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
        valign: 'middle',
        lineColor: [20, 50, 90],
        lineWidth: 0.35,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [15, 20, 28],
        lineColor: [70, 70, 70],
        lineWidth: 0.3,
        cellPadding: 2.5,
        valign: 'middle',
        overflow: 'linebreak',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: () => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(100)
        doc.text('Student Seating Plan & Roll Series Matrix', marginL, pageH - 5)
        doc.setTextColor(0)
      },
    })

    const lastTableY = (doc as any).lastAutoTable?.finalY || y + 38
    let footerY = Math.min(lastTableY + 6, pageH - 28)

    if (options.notes.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('Note:', marginL, footerY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      const notesStr = options.notes.map((n, i) => `${i + 1}. ${n}`).join('   ')
      doc.text(doc.splitTextToSize(notesStr, contentW - 15), marginL + 12, footerY)
      footerY += 8
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(`${options.headLabel}\n${options.headDeptLabel}`, pageW - marginR, footerY + 6, {
      align: 'right',
    })
  }

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100)
    doc.text(`Page ${p} of ${totalPages}`, pageW - marginR, pageH - 5, { align: 'right' })
    doc.setTextColor(0)
  }

  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `student-seating-arrangement-${config.examType || 'exam'}.pdf`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentSeatingPlanPdf({ scheduleResult, config }: StudentSeatingPlanPdfProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [instituteName, setInstituteName] = useState(
    'Shri G S Institute of Technology & Science, Indore'
  )
  const [departmentName, setDepartmentName] = useState('Department of Computer Engineering')
  const [academicSession, setAcademicSession] = useState('JULY-DEC 2026-27')
  const [reportTitle, setReportTitle] = useState('Student Seating Plan & Roll No Matrix')
  const [notes, setNotes] = useState(
    '1. Students must occupy seats strictly corresponding to their Roll No range.\n2. In case of duplicate or missing roll numbers, contact Exam Cell Control Room immediately.'
  )
  const [headLabel, setHeadLabel] = useState('Centre Superintendent / Head')
  const [headDeptLabel, setHeadDeptLabel] = useState('Computer Engineering Department')

  const { rooms, rows } = buildSeatingMatrix(scheduleResult)

  const buildOptions = (): SeatingPlanOptions => ({
    instituteName,
    departmentName,
    academicSession,
    reportTitle,
    notes: notes
      .split('\n')
      .map((l) => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean),
    headLabel,
    headDeptLabel,
  })

  const handleDownloadPdf = async () => {
    if (rows.length === 0 || rooms.length === 0) {
      alert('No seating allocation data found in the schedule to generate PDF.')
      return
    }
    setIsGenerating(true)
    try {
      await generateSeatingPlanPdf(rooms, rows, buildOptions(), config)
    } catch (err) {
      console.error('Seating Plan PDF generation error:', err)
      alert('Failed to generate Seating Plan PDF. Please check the browser console.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrintPreview = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups to open the print preview.')
      return
    }

    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c] || c))

    const examTypeLabel =
      config.examType === 'mst'
        ? 'B.Tech. Mid Semester Test (MST) — Student Seating Arrangement'
        : config.examType === 'quiz'
        ? 'B.Tech. Lab Quiz / Practical Evaluation — Seating Plan'
        : 'B.Tech. Examination — Student Seating Arrangement'

    const tableHeaders = `
      <tr>
        <th style="width: 14%;">Date & Day</th>
        <th style="width: 16%;">Time Slot</th>
        ${rooms
          .map(
            (r) =>
              `<th style="width: ${Math.floor(70 / rooms.length)}%;">${escapeHtml(
                r.roomName.replace(/\s*\([^)]*\)/g, '')
              )}</th>`
          )
          .join('')}
      </tr>
    `

    const tableRowsHtml = rows
      .map((row, idx) => {
        const roomTds = rooms
          .map((r) => {
            const alloc = row.roomSeatingMap[r.roomId]
            if (!alloc || !alloc.details) {
              return `<td style="color: #888;">—</td>`
            }
            return `<td style="font-weight: 500;">${escapeHtml(alloc.details).replace(
              /\n/g,
              '<br/>'
            )}</td>`
          })
          .join('')

        return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="font-weight: bold;">${escapeHtml(formatSeatingDate(row.date)).replace(
            /\n/g,
            '<br/>'
          )}</td>
          <td style="font-weight: bold;">${escapeHtml(row.slotLabel)}<br/><span style="font-size: 8pt; color: #555;">${escapeHtml(row.timeRange)}</span></td>
          ${roomTds}
        </tr>
      `
      })
      .join('')

    const notesHtml = notes.trim()
      ? `<div style="margin-top: 6mm; font-size: 8.5pt;"><strong>Note:</strong> ${notes
          .split('\n')
          .filter(Boolean)
          .map((line, i) => `<div>${escapeHtml(/^\d+\./.test(line) ? line : `${i + 1}. ${line}`)}</div>`)
          .join('')}</div>`
      : ''

    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Seating Arrangement Matrix</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111; font: 9.5pt Georgia, 'Times New Roman', serif; }
        .page { min-height: 185mm; position: relative; }
        header { text-align: center; border-bottom: 1px solid #222; margin-bottom: 6mm; padding-bottom: 3mm; }
        header h1 { font-size: 14pt; margin: 0 0 1.5mm; }
        header h2 { font-size: 11pt; margin: 0 0 1.5mm; }
        header h3 { font-size: 11pt; margin: 0 0 1.5mm; }
        header p { margin: 0; font-weight: bold; font-size: 9.5pt; }
        .date { text-align: right; font-size: 8.5pt; margin-top: 1mm; }
        table { border-collapse: collapse; width: 100%; font-size: 8.5pt; margin-top: 2mm; }
        th, td { border: 1px solid #333; padding: 2.5mm; text-align: center; vertical-align: middle; }
        th { background: #224878 !important; color: #ffffff !important; }
        footer { position: relative; margin-top: 6mm; }
        .signature { text-align: right; margin-top: 5mm; }
        @media screen { body { background: #eee; padding: 10mm; } .page { background: white; padding: 10mm; margin: 0 auto; max-width: 277mm; box-shadow: 0 1mm 5mm #aaa; } }
      </style></head><body>
      <div class="page">
        <header>
          <h1>${escapeHtml(instituteName)}</h1>
          <h2>${escapeHtml(departmentName)}</h2>
          <h3>${escapeHtml(reportTitle)} (${escapeHtml(academicSession)})</h3>
          <p>${escapeHtml(examTypeLabel)}</p>
          <div class="date">Date: ${new Date().toLocaleDateString('en-GB')}</div>
        </header>
        <table>
          <thead>${tableHeaders}</thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
        <footer>
          ${notesHtml}
          <div class="signature">
            <strong>${escapeHtml(headLabel)}</strong><br>${escapeHtml(headDeptLabel)}
          </div>
        </footer>
      </div>
      </body></html>`)

    printWindow.document.close()
    printWindow.focus()
    printWindow.onafterprint = () => printWindow.close()
    window.setTimeout(() => printWindow.print(), 250)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        id="btn-seating-arrangement-pdf"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-blue-600/40 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-100 transition-all"
      >
        <Grid className="size-3.5" />
        Seating Arrangement PDF
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
          <div className="relative my-6 w-full max-w-5xl rounded-2xl border border-border bg-background shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Student Seating Arrangement Matrix
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Date & Time in rows, Room numbers in columns, Enrollment series in cells
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
              {/* PDF Header Options */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PDF Header & Institution Info
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Institute Name', value: instituteName, setter: setInstituteName },
                    { label: 'Department', value: departmentName, setter: setDepartmentName },
                    { label: 'Report Title', value: reportTitle, setter: setReportTitle },
                    {
                      label: 'Academic Session (e.g. JULY-DEC 2026-27)',
                      value: academicSession,
                      setter: setAcademicSession,
                    },
                    {
                      label: 'Signatory Authority Label',
                      value: headLabel,
                      setter: setHeadLabel,
                    },
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
                <div className="mt-3 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">
                    Notes & Instructions (one per line)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="resize-none rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">{rows.length}</strong> exam slot
                  {rows.length !== 1 ? 's' : ''} scheduled
                </span>
                <span>
                  <strong className="text-foreground">{rooms.length}</strong> active room
                  {rooms.length !== 1 ? 's' : ''} in matrix
                </span>
              </div>

              {/* Preview */}
              {rows.length === 0 || rooms.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
                  <Calendar className="size-8 text-amber-500" />
                  <p className="text-sm font-bold text-amber-700">No Seating Data Available</p>
                  <p className="text-xs text-amber-600">
                    Please ensure the examination schedule has been generated with room allocations.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Seating Matrix Preview
                    </h3>
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      Landscape Matrix
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-xs">
                    <div className="min-w-160 p-6 text-black" style={{ fontFamily: 'serif' }}>
                      {/* Doc header */}
                      <div className="text-center">
                        <p className="text-sm font-bold">{instituteName}</p>
                        <p className="text-xs font-semibold">{departmentName}</p>
                        <p className="text-xs font-bold text-blue-900">{reportTitle}</p>
                        <p className="text-[11px] text-gray-600">
                          Academic Session: {academicSession}
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

                      <table className="w-full border-collapse text-[10px]">
                        <thead>
                          <tr style={{ backgroundColor: '#224878', color: '#ffffff' }}>
                            <th className="border border-gray-600 px-2 py-2 text-center font-bold">
                              Date & Day
                            </th>
                            <th className="border border-gray-600 px-2 py-2 text-center font-bold">
                              Time Slot
                            </th>
                            {rooms.map((r) => (
                              <th
                                key={r.roomId}
                                className="border border-gray-600 px-2 py-2 text-center font-bold"
                              >
                                {r.roomName.replace(/\s*\([^)]*\)/g, '')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rIdx) => (
                            <tr
                              key={row.slotId}
                              style={{
                                backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                              }}
                            >
                              <td className="whitespace-pre-line border border-gray-400 px-2 py-2 text-center font-bold">
                                {formatSeatingDate(row.date)}
                              </td>
                              <td className="border border-gray-400 px-2 py-2 text-center font-semibold">
                                <div>{row.slotLabel}</div>
                                <div className="text-[9px] text-gray-600">{row.timeRange}</div>
                              </td>
                              {rooms.map((r) => {
                                const alloc = row.roomSeatingMap[r.roomId]
                                return (
                                  <td
                                    key={r.roomId}
                                    className="border border-gray-400 px-2 py-2 text-center align-middle"
                                  >
                                    {alloc && alloc.details ? (
                                      <div className="whitespace-pre-line font-medium leading-tight">
                                        {alloc.details}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">—</span>
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
                      <div className="mt-6 flex justify-end">
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
                  id="btn-download-seating-plan-pdf"
                  onClick={handleDownloadPdf}
                  disabled={isGenerating || rows.length === 0 || rooms.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition-all"
                >
                  {isGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  {isGenerating ? 'Generating PDF\u2026' : 'Download Seating Matrix PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
