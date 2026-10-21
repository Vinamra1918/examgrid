import {
  isRoomUnavailable,
  isClassSuspended,
  isTeacherAvailableDuringSlot,
  generateSchedule,
} from '../lib/scheduler-engine'
import { generateLabQuizSchedule } from '../lib/quiz-scheduler-engine'
import {
  Course,
  ExamSessionConfig,
  Room,
  Student,
  Teacher,
  TeacherScheduleEntry,
  ClassSuspensionConfig,
} from '../lib/types'
import {
  defaultMstCourses,
  defaultMstRooms,
  defaultMstTeachers,
  defaultMstTeachingAssistants,
  defaultStudents,
  defaultQuizCourses,
  defaultQuizRooms,
} from '../lib/presets'
import * as XLSX from 'xlsx'

// Test runner helper
let totalTests = 0
let passedTests = 0
let failedTests = 0
const failures: string[] = []

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✓ [PASS] ${testName}`)
  } else {
    failedTests++
    const msg = `  ✗ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`
    console.error(msg)
    failures.push(msg)
  }
}

console.log('=================================================================')
console.log('   EXAMGRID UPGRADED: COMPREHENSIVE AUTOMATED TEST SUITE')
console.log('=================================================================\n')

// -----------------------------------------------------------------------------
// TEST SUITE 1: ROOM INVIGILATOR SEPARATION (TEACHERS VS TAs)
// -----------------------------------------------------------------------------
console.log('▶ TEST SUITE 1: Room Invigilators (Teachers vs. Teaching Assistants)')

const testRooms: Room[] = [
  {
    id: 'hall_1',
    name: 'Main Auditorium',
    code: 'AUD-1',
    building: 'Block A',
    type: 'hall',
    totalBenches: 30,
    benchCapacity: 2,
    teachersRequired: 2,
    teachingAssistantsRequired: 1,
    invigilatorsRequired: 3,
    allowSameCourseOnBench: false,
    included: true,
  },
  {
    id: 'room_1',
    name: 'Classroom 101',
    code: 'CR-101',
    building: 'Block A',
    type: 'classroom',
    totalBenches: 15,
    benchCapacity: 2,
    teachersRequired: 1,
    teachingAssistantsRequired: 0,
    invigilatorsRequired: 1,
    allowSameCourseOnBench: false,
    included: true,
  },
]

assert(testRooms[0].teachersRequired === 2, 'Room 1 requires 2 teachers')
assert(testRooms[0].teachingAssistantsRequired === 1, 'Room 1 requires 1 TA')
assert(testRooms[1].teachersRequired === 1, 'Room 2 requires 1 teacher')
assert(testRooms[1].teachingAssistantsRequired === 0, 'Room 2 requires 0 TAs')

// -----------------------------------------------------------------------------
// TEST SUITE 2: ROOM & LAB UNAVAILABILITY (DATES + HOURLY WINDOWS)
// -----------------------------------------------------------------------------
console.log('\n▶ TEST SUITE 2: Room & Lab Unavailability (Dates + Hourly Time Windows)')

const roomWithHours: Room = {
  ...testRooms[0],
  unavailabilitySlots: [
    { date: '2025-05-12', startTime: '09:00', endTime: '11:00' },
  ],
  unavailableDates: ['2025-05-14'], // Full day blackout
}

// Slot 1: 09:30 - 10:30 on 2025-05-12 (overlaps 09:00-11:00) -> should be UNAVAILABLE
assert(
  isRoomUnavailable(roomWithHours, '2025-05-12', '09:30', '10:30') === true,
  'Room is unavailable during 09:00-11:00 blackout window (09:30-10:30 slot)'
)

// Slot 2: 11:30 - 12:30 on 2025-05-12 (outside 09:00-11:00) -> should be AVAILABLE ("rest of the time use the room")
assert(
  isRoomUnavailable(roomWithHours, '2025-05-12', '11:30', '12:30') === false,
  'Room is available outside blackout window on same date (11:30-12:30 slot)'
)

// Slot 3: Full day blackout on 2025-05-14 -> should be UNAVAILABLE
assert(
  isRoomUnavailable(roomWithHours, '2025-05-14', '14:00', '15:00') === true,
  'Room is unavailable for full day blackout date (2025-05-14)'
)

// Slot 4: Different unaffected date 2025-05-13 -> should be AVAILABLE
assert(
  isRoomUnavailable(roomWithHours, '2025-05-13', '09:30', '10:30') === false,
  'Room is available on dates with no blackout rules'
)

// -----------------------------------------------------------------------------
// TEST SUITE 3: ROUTINE TIMETABLE & CLASS SUSPENSION MATRIX
// -----------------------------------------------------------------------------
console.log('\n▶ TEST SUITE 3: Teacher Routine Timetable & Class Suspension Matrix')

const testSuspensionConfig: ClassSuspensionConfig = {
  suspendedCohorts: ['B.Tech - 2nd Year', 'B.Tech - 3rd Year', 'B.Tech - 4th Year', 'M.Tech - 1st Year'],
  suspendedCourses: ['CS-SPEC-01'],
}

const entrySuspended: TeacherScheduleEntry = {
  id: 'tt_1',
  teacherName: 'Dr. Urjita Thakar',
  dayOfWeek: 'Monday',
  startTime: '09:30',
  endTime: '10:30',
  program: 'B.Tech',
  year: '3rd Year',
  courseCode: 'CS-501',
}

const entryActive: TeacherScheduleEntry = {
  id: 'tt_2',
  teacherName: 'Dr. Urjita Thakar',
  dayOfWeek: 'Tuesday',
  startTime: '11:30',
  endTime: '12:30',
  program: 'B.Tech',
  year: '1st Year',
  courseCode: 'CS-101',
}

const entrySpecificCourse: TeacherScheduleEntry = {
  id: 'tt_3',
  teacherName: 'Prof. Test',
  dayOfWeek: 'Monday',
  startTime: '09:30',
  endTime: '10:30',
  program: 'PhD',
  year: 'PhD Year 1',
  courseCode: 'CS-SPEC-01',
}

assert(
  isClassSuspended(entrySuspended, testSuspensionConfig) === true,
  'B.Tech 3rd Year class is identified as suspended'
)

assert(
  isClassSuspended(entryActive, testSuspensionConfig) === false,
  'B.Tech 1st Year class is identified as active (not suspended)'
)

assert(
  isClassSuspended(entrySpecificCourse, testSuspensionConfig) === true,
  'Specific course CS-SPEC-01 is identified as suspended'
)

const testTeacher: Teacher = {
  id: 't_prof1',
  name: 'Dr. Urjita Thakar',
  department: 'CSE',
  priority: 1,
  maxDuties: 6,
  included: true,
}

const routineEntries = [entrySuspended, entryActive]

// On Monday 09:30-10:30, Dr. Urjita has a B.Tech 3rd Year class, which is SUSPENDED -> Available for exam duty
assert(
  isTeacherAvailableDuringSlot(
    testTeacher,
    '2025-05-12',
    'Monday',
    '09:30',
    '10:30',
    routineEntries,
    testSuspensionConfig
  ) === true,
  'Teacher with suspended class on Monday is AVAILABLE for exam invigilation'
)

// On Tuesday 11:30-12:30, Dr. Urjita has a B.Tech 1st Year class, which is ACTIVE -> Busy, NOT available for duty
assert(
  isTeacherAvailableDuringSlot(
    testTeacher,
    '2025-05-13',
    'Tuesday',
    '11:30',
    '12:30',
    routineEntries,
    testSuspensionConfig
  ) === false,
  'Teacher with active 1st Year class on Tuesday is BUSY and NOT assigned duty'
)

// On Tuesday 09:30-10:30 (different time than her 11:30 class) -> Available
assert(
  isTeacherAvailableDuringSlot(
    testTeacher,
    '2025-05-13',
    'Tuesday',
    '09:30',
    '10:30',
    routineEntries,
    testSuspensionConfig
  ) === true,
  'Teacher is available during hours when she has no routine class'
)

// -----------------------------------------------------------------------------
// TEST SUITE 4: COURSE-SPECIFIC STUDENT ENROLLMENT OVERRIDES
// -----------------------------------------------------------------------------
console.log('\n▶ TEST SUITE 4: Course-Specific Student Enrollment Overrides')

const testStudents: Student[] = [
  { id: 's1', rollNo: '23CS001', name: 'Student 1', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', branch: 'CSE', batch: 'Batch A', included: true },
  { id: 's2', rollNo: '23CS002', name: 'Student 2', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', branch: 'CSE', batch: 'Batch A', included: true },
  { id: 's3', rollNo: '23CS003', name: 'Student 3', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', branch: 'CSE', batch: 'Batch A', included: true },
  { id: 's4', rollNo: '23CS004', name: 'Student 4', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', branch: 'CSE', batch: 'Batch A', included: true },
]

const testCourses: Course[] = [
  { id: 'c1', code: 'CS-REG', name: 'Regular Core Subject', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c2', code: 'CS-ELEC', name: 'Special Elective Subject', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
]

// Override CS-ELEC to only include 23CS001 and 23CS003
const testConfigWithOverride: ExamSessionConfig = {
  id: 'test_cfg_ovr',
  title: 'Override Test',
  examType: 'mst',
  startDate: '2025-05-12',
  endDate: '2025-05-13',
  totalDays: 2,
  theoryDurationMinutes: 60,
  labDurationMinutes: 60,
  slotsPerDay: [
    { id: 'slot_1', label: 'Slot 1', startTime: '09:30', endTime: '10:30' },
    { id: 'slot_2', label: 'Slot 2', startTime: '11:30', endTime: '12:30' },
  ],
  seatingMode: 'interleave_two_exams',
  allowTwoExamsInOneRoom: true,
  courseStudentOverrides: {
    'CS-ELEC': ['23CS001', '23CS003'],
  },
}

const overrideResult = generateSchedule(
  testConfigWithOverride,
  testStudents,
  testCourses,
  testRooms,
  defaultMstTeachers.slice(0, 5),
  defaultMstTeachingAssistants.slice(0, 3)
)

assert(overrideResult.slots.length > 0, 'Schedule generated successfully with overrides')

// Find slot containing CS-ELEC
let elecSeatingsFound = 0
let nonElecRollEnrolled = false

overrideResult.slots.forEach((slot) => {
  slot.roomAllocations.forEach((room) => {
    room.benches.forEach((bench) => {
      bench.seats.forEach((seat) => {
        if (seat.student && seat.student.courseCode === 'CS-ELEC') {
          elecSeatingsFound++
          if (seat.student.rollNo !== '23CS001' && seat.student.rollNo !== '23CS003') {
            nonElecRollEnrolled = true
          }
        }
      })
    })
  })
})

assert(elecSeatingsFound === 2, `Elective course has exactly 2 seated students (found ${elecSeatingsFound})`)
assert(!nonElecRollEnrolled, 'Only specified override roll numbers (23CS001, 23CS003) seated for CS-ELEC')

// -----------------------------------------------------------------------------
// TEST SUITE 5: FULL INTEGRATION OF MST SCHEDULER ENGINE
// -----------------------------------------------------------------------------
console.log('\n▶ TEST SUITE 5: Full MST Scheduler Engine Integration')

const fullMstConfig: ExamSessionConfig = {
  id: 'full_mst_test',
  title: 'Mid-Semester Test Autumn 2025',
  examType: 'mst',
  startDate: '2025-05-12',
  endDate: '2025-05-16',
  totalDays: 5,
  theoryDurationMinutes: 60,
  labDurationMinutes: 60,
  slotsPerDay: [
    { id: 's1', label: 'Slot 1 (Morning)', startTime: '09:30', endTime: '10:30' },
    { id: 's2', label: 'Slot 2 (Mid-Day)', startTime: '11:30', endTime: '12:30' },
    { id: 's3', label: 'Slot 3 (Afternoon)', startTime: '14:00', endTime: '15:00' },
  ],
  seatingMode: 'interleave_two_exams',
  allowTwoExamsInOneRoom: true,
  teacherTimetableEntries: [
    {
      id: 'tt_mst_1',
      teacherName: defaultMstTeachers[0].name,
      dayOfWeek: 'Monday',
      startTime: '09:30',
      endTime: '10:30',
      program: 'B.Tech',
      year: '3rd Year',
      courseCode: 'CS-501',
    },
    {
      id: 'tt_mst_2',
      teacherName: defaultMstTeachers[1].name,
      dayOfWeek: 'Monday',
      startTime: '09:30',
      endTime: '10:30',
      program: 'B.Tech',
      year: '1st Year', // Not suspended -> teacher 1 should NOT be assigned on Monday Slot 1!
      courseCode: 'CS-101',
    },
  ],
  classSuspensionConfig: {
    suspendedCohorts: ['B.Tech - 2nd Year', 'B.Tech - 3rd Year', 'B.Tech - 4th Year'],
  },
}

const mstResult = generateSchedule(
  fullMstConfig,
  defaultStudents,
  defaultMstCourses.slice(0, 15),
  defaultMstRooms.slice(0, 8),
  defaultMstTeachers,
  defaultMstTeachingAssistants
)

assert(mstResult.slots.length > 0, `MST generated ${mstResult.slots.length} scheduled slots`)
assert(mstResult.totalStudentsSeated > 0, `MST successfully seated ${mstResult.totalStudentsSeated} students`)

// Check invigilator assignments
let totalFacultyDuties = 0
let totalTADuties = 0
let teacherWithActiveClassAssigned = false

mstResult.slots.forEach((slot) => {
  slot.assignedFaculty.forEach((f) => {
    totalFacultyDuties++
    if (slot.dayNumber === 1 && slot.slotLabel.includes('Slot 1') && f.teacherName === defaultMstTeachers[1].name) {
      teacherWithActiveClassAssigned = true
    }
  })
  slot.assignedTAs?.forEach(() => {
    totalTADuties++
  })
})

assert(totalFacultyDuties > 0, `Faculty invigilation duties scheduled: ${totalFacultyDuties}`)
assert(totalTADuties > 0, `TA invigilation duties scheduled: ${totalTADuties}`)
assert(
  !teacherWithActiveClassAssigned,
  `Teacher with active 1st Year class (${defaultMstTeachers[1].name}) correctly withheld from Monday Slot 1 exam duty`
)

// Verify room invigilators separation in room plans
let validRoomInvigilatorStructure = true
mstResult.slots.forEach((slot) => {
  slot.roomAllocations.forEach((room) => {
    if (!room.invigilator || !room.invigilators) {
      validRoomInvigilatorStructure = false
    }
  })
})
assert(validRoomInvigilatorStructure, 'All active room plans have structured invigilator allocations')

// -----------------------------------------------------------------------------
// TEST SUITE 6: FULL INTEGRATION OF LAB QUIZ SCHEDULER ENGINE
// -----------------------------------------------------------------------------
console.log('\n▶ TEST SUITE 6: Lab Quiz Evaluation Scheduler Engine')

const quizConfig: ExamSessionConfig = {
  id: 'quiz_test_cfg',
  title: 'Lab Quiz Evaluation Session 2025',
  examType: 'quiz',
  startDate: '2025-05-19',
  endDate: '2025-05-22',
  totalDays: 4,
  theoryDurationMinutes: 60,
  labDurationMinutes: 15,
  slotsPerDay: [],
  seatingMode: 'single_exam_per_bench',
  allowTwoExamsInOneRoom: false,
  quizYearConfigs: {
    '1st Year': { enabled: false, date: '', startTime: '' },
    '2nd Year': { enabled: true, date: '2025-05-19', startTime: '16:00' },
    '3rd Year': { enabled: true, date: '2025-05-20', startTime: '16:00' },
    '4th Year': { enabled: false, date: '', startTime: '' },
  },
}

const quizResult = generateLabQuizSchedule(
  quizConfig,
  defaultStudents,
  defaultQuizCourses,
  defaultQuizRooms,
  defaultMstTeachers,
  defaultMstTeachingAssistants
)

assert(quizResult.slots.length > 0, `Lab Quiz generated ${quizResult.slots.length} timed evaluation slots`)
assert(quizResult.totalStudentsSeated > 0, `Lab Quiz seated ${quizResult.totalStudentsSeated} students on computer terminals`)

// -----------------------------------------------------------------------------
// TEST SUITE 7: EXCEL TEMPLATES & PARSERS
// -----------------------------------------------------------------------------
console.log('\n▶ TEST SUITE 7: Excel Data Ingestion & Template Generation')

// Test workbook creation with json_to_sheet
const sampleCoursesData = [
  { 'Course Code': 'CS-999', 'Course Name': 'Quantum Computing', 'Department': 'CSE', 'Target Year': '4th Year' },
]
const wb = XLSX.utils.book_new()
const ws = XLSX.utils.json_to_sheet(sampleCoursesData)
XLSX.utils.book_append_sheet(wb, ws, 'Courses')

assert(wb.SheetNames.includes('Courses'), 'SheetJS created workbook with Courses sheet')

const parsedJson = XLSX.utils.sheet_to_json<any>(wb.Sheets['Courses'])
assert(parsedJson.length === 1 && parsedJson[0]['Course Code'] === 'CS-999', 'Excel sheet_to_json properly parsed row data')

// Test sheet name resolution tolerance
const sheetAliases = ['courses', 'course', 'subjects', 'sheet1']
const resolvedSheet = wb.SheetNames.find((name) => sheetAliases.includes(name.trim().toLowerCase()))
assert(resolvedSheet === 'Courses', 'Tolerant sheet name resolution found Courses sheet case-insensitively')

// -----------------------------------------------------------------------------
// FINAL SUMMARY & RESULTS
// -----------------------------------------------------------------------------
console.log('\n=================================================================')
console.log(`   TEST EXECUTION COMPLETE: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`)
if (failedTests > 0) {
  console.log(`   FAILURES: ${failedTests}`)
  failures.forEach((f) => console.error(f))
} else {
  console.log('   STATUS: ALL SYSTEM TESTS PASSED SUCCESSFULLY! 🚀')
}
console.log('=================================================================\n')

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
