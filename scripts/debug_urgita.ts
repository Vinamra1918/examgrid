import { defaultExamConfigs, defaultMstTeachers, defaultTeacherTimetableEntries, defaultClassSuspensionConfig } from '../lib/presets'
import { isTeacherAvailableDuringSlot, isClassSuspended } from '../lib/scheduler-engine'

const teacher = defaultMstTeachers.find((t) => t.name.includes('Urjita'))!
console.log('Teacher found:', teacher.name, teacher.id)
console.log('Suspension config:', defaultExamConfigs.mst.classSuspensionConfig)

const available = isTeacherAvailableDuringSlot(
  teacher,
  '2026-10-12',
  'Monday',
  '09:30',
  '10:30',
  defaultExamConfigs.mst.teacherTimetableEntries,
  defaultExamConfigs.mst.classSuspensionConfig
)

console.log('Result of isTeacherAvailableDuringSlot on Mon 09:30-10:30:', available)

const entries = (defaultExamConfigs.mst.teacherTimetableEntries || []).filter(e => e.teacherName.includes('Urjita'))
console.log('Urjita timetable entries:', entries)
for (const entry of entries) {
  console.log(`Entry ${entry.dayOfWeek} ${entry.startTime}-${entry.endTime} (${entry.program} ${entry.year}): isClassSuspended =`, isClassSuspended(entry, defaultExamConfigs.mst.classSuspensionConfig))
}
