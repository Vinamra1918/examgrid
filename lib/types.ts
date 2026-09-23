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
  enrolledCourseCodes: string[]
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
  priority?: number // Higher priority (e.g. 1, 2, 3...) or custom priority scheduled early
  durationMinutes?: number // Optional override, defaults to exam session duration
  enrolledStudentCount?: number
  bindingGroup?: number // Courses with the same binding number within a semester are bound to happen on the same day with minimum time difference
  pairedWithCourseCode?: string // Legacy fallback
  included?: boolean // When false, course is preserved in memory/list but not scheduled
}

export interface RoomBenchLayout {
  rows: number
  columns: number
  seatsPerBench: number // 1, 2, or 3
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
  invigilatorsRequired?: number // Number of teachers needed for this room (e.g. 2 for big halls like LT, 1 for regular rooms/labs)
  allowSameCourseOnBench: boolean
  included?: boolean // When false, room is omitted from timetable room allocation
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
  seatingMode: SeatingMode
  allowTwoExamsInOneRoom: boolean
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
  }[]
  roomAllocations: RoomSeatingPlan[]
  assignedFaculty: {
    teacherId: string
    teacherName: string
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
  priorityDispersionScore: number // percentage of slots where high-priority faculty were isolated in separate rooms
  constraintViolations: string[]
  generatedAt: string
}
