import { defaultExamConfigs, defaultMstCourses, defaultMstRooms, defaultMstTeachers, defaultMstTeachingAssistants, defaultStudents } from '../lib/presets'
import { generateSchedule } from '../lib/scheduler-engine'

const config = {
  ...defaultExamConfigs.mst,
  title: 'MST Test',
  startDate: '2026-10-12', // Monday
  endDate: '2026-10-16',
  totalDays: 5,
  slotsPerDay: [
    { id: 's1', label: 'Slot 1', startTime: '09:30', endTime: '10:30' },
    { id: 's2', label: 'Slot 2', startTime: '11:30', endTime: '12:30' },
  ],
}

const result = generateSchedule(
  config,
  defaultStudents,
  defaultMstCourses,
  defaultMstRooms,
  defaultMstTeachers,
  defaultMstTeachingAssistants
)

console.log('Total slots scheduled:', result.slots.length)

// Check Monday Slot 1 (Day 1 Slot 1)
const mondaySlot1 = result.slots.find(
  (s) => s.dayNumber === 1 && (s.slotLabel.includes('Slot 1') || s.timeRange.includes('09:30'))
)

if (!mondaySlot1) {
  console.error('Monday Slot 1 not found!')
  process.exit(1)
}

console.log('Monday Slot 1 courses:', mondaySlot1.scheduledCourses.map((c) => c.code))
console.log('Assigned faculty in Monday Slot 1:', mondaySlot1.assignedFaculty)

const urgitaAssignedInMondaySlot1 = mondaySlot1.assignedFaculty.some(
  (f) => f.teacherName.toLowerCase().includes('urjita')
)

console.log('Was Urjita assigned to Monday 09:30-10:30?', urgitaAssignedInMondaySlot1)

if (urgitaAssignedInMondaySlot1) {
  console.error('FAIL: Urjita was assigned on Monday 9:30-10:30 despite having a conflicting class!')
  process.exit(1)
} else {
  console.log('SUCCESS: Dr. Urjita Thakar was NOT assigned to Monday 9:30-10:30 duty!')
}
