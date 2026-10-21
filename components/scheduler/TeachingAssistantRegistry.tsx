'use client'

import { useState } from 'react'
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  Search,
  Square,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { Teacher } from '@/lib/types'
import * as XLSX from 'xlsx'

type ExcelMergeMode = 'replace' | 'merge_unique' | 'merge_all'
type ExcelRow = Record<string, unknown>

const taSampleRows = [
  {
    'TA Name': 'Aman Verma',
    'Designation': 'M.Tech Research Scholar / TA',
    'Department': 'CSE',
    'Priority Rank': 2,
    'Max Duties': 6,
  },
  {
    'TA Name': 'Pooja Nair',
    'Designation': 'PhD Research Scholar / TA',
    'Department': 'CSE',
    'Priority Rank': 1,
    'Max Duties': 6,
  },
  {
    'TA Name': 'Vikas Patel',
    'Designation': 'Teaching Assistant',
    'Department': 'IT',
    'Priority Rank': 2,
    'Max Duties': 8,
  },
]

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

function mergeImported<T>(
  current: T[],
  incoming: T[],
  mode: ExcelMergeMode,
  getKey: (item: T) => string
) {
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

interface TeachingAssistantRegistryProps {
  teachingAssistants: Teacher[]
  setTeachingAssistants: React.Dispatch<React.SetStateAction<Teacher[]>>
  isOpen?: boolean
  onToggleOpen?: () => void
  hideSectionHeader?: boolean
  sectionNumber?: string | number
}

export function TeachingAssistantRegistry({
  teachingAssistants,
  setTeachingAssistants,
  isOpen = true,
  onToggleOpen,
  hideSectionHeader = false,
  sectionNumber = '6',
}: TeachingAssistantRegistryProps) {
  const [taSearch, setTaSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [newTA, setNewTA] = useState<Partial<Teacher>>({
    name: '',
    department: 'CSE',
    designation: 'Teaching Assistant',
    priority: 2,
    maxDuties: 6,
  })

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<ExcelMergeMode>('replace')
  const [importMessage, setImportMessage] = useState('')

  const activeTAsCount = teachingAssistants.filter((ta) => ta.included !== false).length
  const uniqueDepartments = [
    'All',
    ...Array.from(new Set(teachingAssistants.map((ta) => ta.department))).filter(Boolean),
  ]

  const filteredTAs = teachingAssistants.filter((ta) => {
    const matchesSearch =
      ta.name.toLowerCase().includes(taSearch.toLowerCase()) ||
      ta.department.toLowerCase().includes(taSearch.toLowerCase()) ||
      (ta.designation || '').toLowerCase().includes(taSearch.toLowerCase())
    const matchesDept = deptFilter === 'All' || ta.department === deptFilter
    return matchesSearch && matchesDept
  })

  const handleAddTA = () => {
    if (!newTA.name?.trim()) return
    const added: Teacher = {
      id: `ta_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newTA.name.trim(),
      department: newTA.department || 'CSE',
      designation: newTA.designation || 'Teaching Assistant',
      priority: Number(newTA.priority) || 2,
      maxDuties: Number(newTA.maxDuties) || 6,
      included: true,
    }
    setTeachingAssistants((prev) => [...prev, added])
    setNewTA({
      name: '',
      department: newTA.department || 'CSE',
      designation: 'Teaching Assistant',
      priority: 2,
      maxDuties: 6,
    })
  }

  const toggleAllTAs = (included: boolean) => {
    setTeachingAssistants((prev) => prev.map((ta) => ({ ...ta, included })))
  }

  const toggleTAInclusion = (id: string) => {
    setTeachingAssistants((prev) =>
      prev.map((ta) => (ta.id === id ? { ...ta, included: ta.included === false } : ta))
    )
  }

  const updateTAPriority = (id: string, newPriority: number | string) => {
    setTeachingAssistants((prev) =>
      prev.map((ta) => (ta.id === id ? { ...ta, priority: newPriority } : ta))
    )
  }

  const updateTAMaxDuties = (id: string, maxDuties: number) => {
    setTeachingAssistants((prev) =>
      prev.map((ta) => (ta.id === id ? { ...ta, maxDuties } : ta))
    )
  }

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(taSampleRows)
    XLSX.utils.book_append_sheet(wb, ws, 'TeachingAssistants')
    XLSX.writeFile(wb, 'teaching_assistants_sample_template.xlsx')
  }

  const handleExcelImport = async () => {
    if (!excelFile) return
    try {
      const workbook = XLSX.read(await excelFile.arrayBuffer(), { type: 'array' })
      const sheetNames = ['tas', 'ta', 'teaching assistants', 'teachingassistant', 'scholars', 'sheet1']
      const target =
        workbook.SheetNames.find((name) =>
          sheetNames.includes(name.trim().toLowerCase())
        ) ||
        workbook.SheetNames.find((name) => {
          const lower = name.trim().toLowerCase()
          return sheetNames.some((sn) => lower.includes(sn))
        }) ||
        workbook.SheetNames[0]

      if (!target) {
        setImportMessage('Workbook contains no usable TA sheet.')
        return
      }

      const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[target], { defval: '' })
      if (!rows.length) {
        setImportMessage('No rows found in the selected sheet.')
        return
      }

      const incoming: Teacher[] = rows
        .filter((row) =>
          getExcelValue(
            row,
            'name',
            'ta name',
            'teaching assistant',
            'ta',
            'assistant name',
            'scholar name',
            'full name',
            'ta_name'
          )
        )
        .map((row, idx) => ({
          id: `excel_ta_${Date.now()}_${idx}`,
          name: getExcelValue(
            row,
            'name',
            'ta name',
            'teaching assistant',
            'ta',
            'assistant name',
            'scholar name',
            'full name'
          ),
          designation:
            getExcelValue(row, 'designation', 'desig', 'role', 'title', 'position') ||
            'Teaching Assistant',
          department:
            getExcelValue(row, 'department', 'dept', 'branch') || 'CSE',
          priority:
            Number(
              getExcelValue(
                row,
                'priority',
                'priority rank',
                'rank',
                'seniority',
                'level'
              )
            ) || 2,
          maxDuties:
            Number(
              getExcelValue(
                row,
                'maxDuties',
                'max duties',
                'duties',
                'max duty',
                'duty limit'
              )
            ) || 6,
          included: true,
        }))

      if (!incoming.length) {
        setImportMessage('No valid TA rows found. TA name is required.')
        return
      }

      setTaSearch('')
      setTeachingAssistants((current) =>
        mergeImported(
          current,
          incoming,
          importMode,
          (ta) => `${ta.name.trim().toLowerCase()}|${ta.department.trim().toLowerCase()}`
        )
      )
      setImportMessage(`Successfully imported ${incoming.length} teaching assistants.`)
    } catch {
      setImportMessage('Could not read file. Please select a valid .xlsx or .xls file.')
    }
  }

  return (
    <section
      id="sec-tas"
      className="scroll-mt-36 rounded-2xl border border-teal-200 bg-white p-6 shadow-sm"
    >
      {!hideSectionHeader && (
        <div className="flex items-center justify-between border-b border-teal-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <Users className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {sectionNumber}. Teaching Assistant (TA) Registry
                </h3>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                  {activeTAsCount} of {teachingAssistants.length} active in duty roster
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {teachingAssistants.length} teaching assistants registered. TAs are allocated to assist examination halls and laboratory evaluation sessions.
              </p>
            </div>
          </div>
          {onToggleOpen && (
            <button
              onClick={onToggleOpen}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Teaching Assistants section"
            >
              {isOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
            </button>
          )}
        </div>
      )}

      {isOpen && (
        <div className="mt-6 flex flex-col gap-6">
          {/* Excel Import Panel for TAs */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                Import TAs from Excel
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-2.5 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100/70 shadow-xs transition-colors"
                title="Download sample Teaching Assistant Excel template (.xlsx)"
              >
                <Download className="size-3.5" /> Sample Template (.xlsx)
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-teal-50">
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
              <select
                aria-label="Teaching Assistant import mode"
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as ExcelMergeMode)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              >
                <option value="replace">Replace current TAs</option>
                <option value="merge_unique">Add and remove duplicates</option>
                <option value="merge_all">Add and keep duplicates</option>
              </select>
              <button
                onClick={handleExcelImport}
                disabled={!excelFile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="size-3.5" /> Import TAs
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Sheet: tas / teaching assistants · Columns: TA Name, Designation, Department, Priority Rank, Max Duties
            </p>
            {importMessage && (
              <p role="status" className="mt-2 text-xs font-medium text-teal-900">
                {importMessage}
              </p>
            )}
          </div>

          {/* Quick Add TA Form */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Add Teaching Assistant (TA)
            </span>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">TA Name</span>
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={newTA.name}
                  onChange={(e) => setNewTA({ ...newTA, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Designation</span>
                <input
                  type="text"
                  placeholder="e.g. Senior Teaching Assistant"
                  value={newTA.designation}
                  onChange={(e) => setNewTA({ ...newTA, designation: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Department</span>
                <input
                  type="text"
                  placeholder="e.g. CSE"
                  value={newTA.department}
                  onChange={(e) => setNewTA({ ...newTA, department: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold">Priority Rank (1 = Top)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newTA.priority}
                  onChange={(e) => setNewTA({ ...newTA, priority: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 font-bold"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddTA}
                  disabled={!newTA.name}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="size-4" />
                  Add TA
                </button>
              </div>
            </div>
          </div>

          {/* TAs Table with Batch Toggles & Filters */}
          <div>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search TA name, dept, desig..."
                    value={taSearch}
                    onChange={(e) => setTaSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                {uniqueDepartments.length > 2 && (
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none"
                  >
                    {uniqueDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d === 'All' ? 'All Departments' : d}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAllTAs(true)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <CheckSquare className="size-3.5 text-teal-600" />
                  Include All TAs
                </button>
                <button
                  onClick={() => toggleAllTAs(false)}
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
                    <th className="py-2.5 px-3">TA Name</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 w-36">Priority Rank (1 = Top)</th>
                    <th className="py-2.5 px-3 w-28">Max Duties</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTAs.map((ta) => {
                    const isIncluded = ta.included !== false
                    return (
                      <tr
                        key={ta.id}
                        className={`transition-colors ${
                          isIncluded ? 'hover:bg-slate-50/80' : 'bg-slate-50/60 opacity-60'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => toggleTAInclusion(ta.id)}
                              className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <span
                              className={`text-[11px] font-bold ${
                                isIncluded ? 'text-teal-700' : 'text-slate-400'
                              }`}
                            >
                              {isIncluded ? 'Included' : 'Excluded'}
                            </span>
                          </label>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {ta.name}
                          {!isIncluded && (
                            <span className="ml-2 text-[10px] text-slate-400 font-normal italic">
                              (Exempt from duties)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="rounded bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                            {ta.designation || 'Teaching Assistant'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{ta.department}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={ta.priority}
                              onChange={(e) => updateTAPriority(ta.id, Number(e.target.value))}
                              className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-teal-700 text-center focus:border-teal-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400">
                              {Number(ta.priority) === 1 ? '🌟 Rank 1' : `Rank ${ta.priority}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={ta.maxDuties}
                            onChange={(e) => updateTAMaxDuties(ta.id, Number(e.target.value))}
                            className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 text-center focus:border-teal-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() =>
                              setTeachingAssistants((prev) => prev.filter((item) => item.id !== ta.id))
                            }
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete TA"
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
  )
}
