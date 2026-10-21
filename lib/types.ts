export type AcademicYear = '1st Year' | '2nd Year' | '3rd Year' | '4th Year'

export type AcademicSemester =
  | 'Semester 1 (Sem A - Odd)'
  | 'Semester 2 (Sem B - Even)'
  | 'Semester 3 (Sem A - Odd)'
  | 'Semester 4 (Sem B - Even)'
  | 'Semester 5 (Sem A - Odd)'
  | 'Semester 6 (Sem B - Even)'
  | 'Semester 7 (Sem A - Odd)'
  | 'Semester 8 (Sem B - Even)'
  | string

export type ExamType = 'mst' | 'quiz'

export type RoomType = 'classroom' | 'hall' | 'lab'

export type TeacherPriority = 'high' | 'medium' | 'low' | number | string

export type SeatingMode = 'interleave_two_exams' | 'single_exam_per_bench'

export interface Student {
  id: string
  rollNo: string
  name: string
  year: AcademicYear
  semester?: AcademicSemester | string
  branch: string
  batch?: string // e.g. 'Batch A', 'Batch B'
  enrolledCourseCodes?: string[]
  included?: boolean // When false, omitted from schedule generation
}

export interface Course {
  id: string
  code: string
  name: string
  year: AcademicYear
  semester?: AcademicSemester | string
  department: string
  type: 'theory' | 'lab_quiz'
  durationMinutes?: number
  enrolledStudentCount?: number
  included?: boolean // When false, course is preserved in memory/list but not scheduled
}

export interface RoomBenchLayout {
  rows: number
  columns: number
  seatsPerBench: number // 1, 2, or 3
}

export interface RoomUnavailability {
  date: string // 'YYYY-MM-DD'
  startTime?: string // 'HH:mm' e.g. '09:00' (if omitted, full day)
  endTime?: string // 'HH:mm' e.g. '13:00' (if omitted, full day)
  reason?: string // e.g. 'Department Practical Lab', 'Seminar', 'Maintenance'
}

export interface Room {
  id: string
  name: string
  code: string
  type: RoomType
  building: string
  totalBenches: number
  benchCapacity: number // 1, 2, or 3
  rows?: number
  columns?: number
  invigilatorsRequired?: number // Total staff or legacy fallback
  teachersRequired?: number // Number of teachers / faculty required for this room (e.g. 1, 2)
  teachingAssistantsRequired?: number // Number of teaching assistants (TAs) required for this room (e.g. 0, 1, 2)
  allowSameCourseOnBench: boolean
  included?: boolean // When false, room is omitted from timetable room allocation
  unavailableDates?: string[] // array of 'YYYY-MM-DD' dates or 'YYYY-MM-DD HH:mm-HH:mm' strings when room is excluded
  unavailabilitySlots?: RoomUnavailability[] // detailed date and hours within dates when room/lab is excluded
}

export interface Teacher {
  id: string
  name: string
  department: string
  designation?: string // e.g. 'Professor & Head', 'Associate Professor', 'Assistant Professor'
  priority: number | string // e.g. 1 (highest), 2, 3 etc. or 'high', 'medium', 'low'
  maxDuties: number
  assignedDutiesCount?: number
  included?: boolean // When false, teacher is omitted from faculty duty roster assignment
}

export interface TeachingAssistant {
  id: string
  name: string
  department: string
  designation?: string // e.g. 'Teaching Assistant', 'Research Scholar (TA)', 'Lab Assistant'
  priority: number | string // e.g. 1 (highest), 2, 3 etc.
  maxDuties: number
  assignedDutiesCount?: number
  included?: boolean // When false, TA is omitted from duty roster assignment
}

export interface TeacherScheduleEntry {
  id: string
  teacherName: string
  teacherId?: string
  role?: 'teacher' | 'ta'
  dayOfWeek: string // e.g., 'Monday', 'Tuesday', ..., or 'YYYY-MM-DD'
  startTime: string // '09:30'
  endTime: string // '10:30'
  program: string // e.g. 'B.Tech', 'M.Tech', 'MCA', etc.
  year: string // e.g. '1st Year', '2nd Year', '3rd Year', '4th Year' or '1', '2', '3', '4'
  courseCode?: string // e.g. 'CS-301'
  courseName?: string // e.g. 'Data Structures'
  room?: string // e.g. 'LT-101'
}

export interface ClassSuspensionConfig {
  suspendedCohorts: string[] // e.g. ['B.Tech - 2nd Year', 'B.Tech - 3rd Year', 'B.Tech - 4th Year', 'M.Tech - 1st Year']
  suspendedCourses?: string[] // optional specific course codes whose regular classes are suspended
}

export interface ExamSlotConfig {
  id: string
  label: string // e.g., 'Slot 1'
  startTime: string // '09:30' (Clock time picker)
  endTime?: string // calculated or optional
}

export interface ExamSessionConfig {
  id: string
  title: string
  examType: ExamType
  startDate: string // 'YYYY-MM-DD'
  endDate: string // 'YYYY-MM-DD'
  holidays?: string[] // array of 'YYYY-MM-DD' holiday dates excluded from exams
  totalDays: number // active exam days (excluding holidays/Sundays)
  theoryDurationMinutes: number // default fallback duration e.g., 60 mins for MST
  labDurationMinutes: number // default fallback duration e.g., 60 mins for Lab Quiz
  slotsPerDay: ExamSlotConfig[] // Default template applied to all days
  daySpecificSlots?: Record<number, ExamSlotConfig[]> // Custom slot overrides per day (Day 1, Day 2, Day 3, etc.)
  fixedCourseSlots?: Record<string, { dayNumber: number; slotIndex: number }> // User-defined pinned courses (courseCode -> { dayNumber, slotIndex })
  seatingMode: SeatingMode
  allowTwoExamsInOneRoom: boolean
  quizYearConfigs?: Record<
    AcademicYear,
    {
      enabled: boolean
      date?: string // 'YYYY-MM-DD'
      startTime?: string // '16:00'
    }
  >
  teacherTimetableEntries?: TeacherScheduleEntry[] // Routine weekly/teaching timetable for teachers & TAs
  classSuspensionConfig?: ClassSuspensionConfig // Classes of specific programs & years suspended during exams
  courseStudentOverrides?: Record<string, string[]> // courseCode -> array of student roll numbers/IDs
}

export interface BenchSeatAssignment {
  seatIndex: number // 0 (Left), 1 (Right/Middle), 2 (Right)
  seatLabel: string // 'Seat A', 'Seat B', etc.
  student?: {
    id: string
    rollNo: string
    name: string
    year: AcademicYear
    branch: string
    courseCode: string
    courseName: string
  }
}

export interface BenchAssignment {
  benchNumber: number
  row: number
  col: number
  seats: BenchSeatAssignment[]
}

export interface RoomSeatingPlan {
  roomId: string
  roomName: string
  roomType: RoomType
  invigilator?: {
    id: string
    name: string
    department: string
    priority: TeacherPriority
  }
  invigilators?: {
    id: string
    name: string
    department: string
    priority: TeacherPriority
  }[]
  teachingAssistants?: {
    id: string
    name: string
    department: string
    priority: TeacherPriority
  }[]
  coursesConducted: {
    code: string
    name: string
    studentCount: number
    rollNoRange: string
  }[]
  benches: BenchAssignment[]
  totalCapacity: number
  totalSeated: number
}

export interface ScheduledSlot {
  slotId: string
  dayNumber: number
  date: string
  slotLabel: string
  timeRange: string
  examType: ExamType
  scheduledCourses: {
    code: string
    name: string
    year: AcademicYear
    semester?: AcademicSemester | string
    type: 'theory' | 'lab_quiz'
    durationMinutes: number
    studentCount: number
    sections: string[]
  }[]
  roomAllocations: RoomSeatingPlan[]
  assignedFaculty: {
    teacherId: string
    teacherName: string
    department?: string
    priority: TeacherPriority
    roomId: string
    roomName: string
  }[]
  assignedTAs?: {
    taId: string
    taName: string
    department?: string
    priority: TeacherPriority
    roomId: string
    roomName: string
  }[]
  warnings?: string[]
}

export interface ScheduleResult {
  config: ExamSessionConfig
  slots: ScheduledSlot[]
  totalExamsScheduled: number
  totalStudentsSeated: number
  totalRoomsUtilized: number
  facultyDutyDistribution: {
    teacherId: string
    teacherName: string
    department: string
    priority: TeacherPriority
    dutiesCount: number
    maxDuties: number
    assignedSlotSummaries: { day: number; slot: string; room: string }[]
  }[]
  taDutyDistribution?: {
    taId: string
    taName: string
    department: string
    priority: TeacherPriority
    dutiesCount: number
    maxDuties: number
    assignedSlotSummaries: { day: number; slot: string; room: string }[]
  }[]
  priorityDispersionScore: number // percentage of slots where high-priority faculty were isolated in separate rooms
  constraintViolations: string[]
  unscheduledCourses?: {
    course: Course
    reason: string
  }[]
  generatedAt: string
}
