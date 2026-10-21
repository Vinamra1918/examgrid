'use client'

import { useState } from 'react'
import { Calendar, Clock, Edit3, Plus, Trash2, X } from 'lucide-react'
import { Room, RoomUnavailability } from '@/lib/types'

interface RoomUnavailabilityPickerProps {
  room: Room
  onUpdate: (updated: {
    unavailableDates?: string[]
    unavailabilitySlots?: RoomUnavailability[]
  }) => void
}

export function RoomUnavailabilityPicker({ room, onUpdate }: RoomUnavailabilityPickerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [isTextMode, setIsTextMode] = useState(false)

  // Form state
  const [date, setDate] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('13:00')
  const [reason, setReason] = useState('')

  // Gather all active unavailability slots (both from unavailabilitySlots and parsed unavailableDates)
  const slots: RoomUnavailability[] = []
  const seenKeys = new Set<string>()

  if (room.unavailabilitySlots && room.unavailabilitySlots.length > 0) {
    room.unavailabilitySlots.forEach((s) => {
      const key = `${s.date}_${s.startTime || 'all'}_${s.endTime || 'day'}`
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        slots.push(s)
      }
    })
  }

  if (room.unavailableDates && room.unavailableDates.length > 0) {
    room.unavailableDates.forEach((entry) => {
      const trimmed = entry.trim()
      if (!trimmed) return
      const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        const timeMatch = trimmed.match(/(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/)
        const sTime = timeMatch ? timeMatch[1] : undefined
        const eTime = timeMatch ? timeMatch[2] : undefined
        const key = `${dateMatch[1]}_${sTime || 'all'}_${eTime || 'day'}`
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          slots.push({
            date: dateMatch[1],
            startTime: sTime,
            endTime: eTime,
          })
        }
      }
    })
  }

  // Convert structured slots to clean string format for storage in unavailableDates
  const syncUpdates = (newSlots: RoomUnavailability[]) => {
    const stringEntries = newSlots.map((s) => {
      if (s.startTime && s.endTime) {
        return `${s.date} ${s.startTime}-${s.endTime}`
      }
      return s.date
    })
    onUpdate({
      unavailabilitySlots: newSlots.length > 0 ? newSlots : undefined,
      unavailableDates: stringEntries.length > 0 ? stringEntries : undefined,
    })
  }

  const handleAddSlot = () => {
    if (!date) return
    const newSlot: RoomUnavailability = {
      date,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      reason: reason.trim() || undefined,
    }
    const updated = [...slots, newSlot]
    syncUpdates(updated)
    setDate('')
    setReason('')
    setIsAdding(false)
  }

  const handleRemoveSlot = (index: number) => {
    const updated = slots.filter((_, idx) => idx !== index)
    syncUpdates(updated)
  }

  const handleRawTextChange = (text: string) => {
    const entries = text
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)

    const parsedSlots: RoomUnavailability[] = []
    entries.forEach((entry) => {
      const dateMatch = entry.match(/^(\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        const timeMatch = entry.match(/(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/)
        parsedSlots.push({
          date: dateMatch[1],
          startTime: timeMatch ? timeMatch[1] : undefined,
          endTime: timeMatch ? timeMatch[2] : undefined,
        })
      }
    })

    onUpdate({
      unavailableDates: entries.length > 0 ? entries : undefined,
      unavailabilitySlots: parsedSlots.length > 0 ? parsedSlots : undefined,
    })
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
          <Clock className="size-3 text-amber-600" />
          Unavailable Dates & Hours (Blackout Windows)
        </span>
        <button
          type="button"
          onClick={() => setIsTextMode(!isTextMode)}
          className="text-[10px] font-medium text-slate-500 hover:text-slate-800 underline flex items-center gap-1"
        >
          <Edit3 className="size-2.5" />
          {isTextMode ? 'Visual Picker' : 'Text Input'}
        </button>
      </div>

      {isTextMode ? (
        <div className="mt-2">
          <input
            type="text"
            placeholder="e.g. 2026-10-25 09:00-13:00, 2026-10-26"
            value={room.unavailableDates?.join(', ') || ''}
            onChange={(e) => handleRawTextChange(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none placeholder:text-slate-300"
          />
          <p className="mt-1 text-[10px] text-slate-400">
            Format: YYYY-MM-DD or YYYY-MM-DD HH:mm-HH:mm (comma-separated).
          </p>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {/* Active Badges */}
          {slots.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s, idx) => {
                const hasHours = s.startTime && s.endTime
                return (
                  <span
                    key={`${s.date}_${s.startTime}_${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/90 px-2 py-1 text-[11px] font-semibold text-amber-900 shadow-2xs"
                  >
                    <Calendar className="size-3 text-amber-600" />
                    <span>{s.date}</span>
                    <span className="rounded bg-amber-200/70 px-1 py-0.2 text-[10px] font-bold text-amber-950">
                      {hasHours ? `${s.startTime} - ${s.endTime}` : 'All Day'}
                    </span>
                    {s.reason && (
                      <span className="text-[10px] text-amber-700 italic">({s.reason})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(idx)}
                      className="ml-0.5 rounded-full p-0.5 text-amber-700 hover:bg-amber-200 hover:text-amber-950"
                      title="Remove blackout window"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic">
              No blackouts set (room available 100% of time).
            </p>
          )}

          {/* Add Blackout Window Toggle / Form */}
          {isAdding ? (
            <div className="mt-1 rounded-lg border border-amber-200 bg-white p-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase">
                  Add Blackout Window
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <span className="block text-[10px] text-slate-500 font-semibold mb-0.5">Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold">Hours in Day</span>
                    <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={isAllDay}
                        onChange={(e) => setIsAllDay(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600"
                      />
                      <span>All Day</span>
                    </label>
                  </div>

                  {!isAllDay ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">to</span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ) : (
                    <p className="py-1 text-[11px] text-slate-400 italic">
                      Room excluded for all exam shifts on this date.
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Presets & Add */}
              <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAllDay(false)
                      setStartTime('09:00')
                      setEndTime('13:00')
                    }}
                    className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600"
                  >
                    Morning (09-13)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAllDay(false)
                      setStartTime('13:00')
                      setEndTime('17:00')
                    }}
                    className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600"
                  >
                    Afternoon (13-17)
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    disabled={!date}
                    className="rounded bg-amber-600 hover:bg-amber-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Save Window
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1 self-start rounded-md border border-dashed border-amber-300 bg-amber-50/50 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <Plus className="size-3" />
              + Add Date & Hours Blackout Window
            </button>
          )}

          <p className="text-[10px] text-slate-500">
            💡 <span className="font-semibold">Partial hours:</span> During specified hours (e.g. 09:00 to 13:00) this room/lab is excluded. The scheduler automatically utilizes it for the rest of the day.
          </p>
        </div>
      )}
    </div>
  )
}
