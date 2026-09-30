import {
  AcademicYear,
  BenchAssignment,
  Course,
  ExamSessionConfig,
  Room,
  RoomSeatingPlan,
  ScheduledSlot,
  ScheduleResult,
  Student,
  Teacher,
  TeacherPriority,
} from './types'

function normalizeSectionLabel(value?: string): string | undefined {
  if (!value) return undefined
  const normalized = value.trim().replace(/^(?:section|batch)\s*/i, '')
  const match = normalized.match(/^([ab])\s*\d*$/i)
  return match ? `Section ${match[1].toUpperCase()}` : undefined
}

function formatClockTime(value: string): string {
  const [hourValue, minuteValue] = value.split(':').map(Number)
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return value
  const suffix = hourValue >= 12 ? 'PM' : 'AM'
  const hour = hourValue % 12 || 12
  return `${hour}:${String(minuteValue).padStart(2, '0')} ${suffix}`
}
export function generateSchedule(
  config: ExamSessionConfig,
  students: Student[],
  courses: Course[],
  rooms: Room[],
  teachers: Teacher[]
): ScheduleResult {
  const constraintViolations: string[] = []

  // Filter only items marked as included (defaulting to true)
  const activeCoursesPool = courses.filter((c) => c.included !== false)
  const activeStudentsPool = students.filter((s) => s.included !== false)
  const activeRoomsPool = rooms.filter((r) => r.included !== false)
  const activeTeachersPool = teachers.filter((t) => t.included !== false)

  // 1. Filter courses strictly based on Exam Type (MST = Theory, Quiz = Lab Evaluations)
  // DEF-05: Ensure "lab" substring inside normal words (like "Collaborative") does not falsely classify course as lab.
  // We check for whole word \blab\b or codes ending in -LAB / starting with LAB.
  const isLabCourse = (c: Course): boolean => {
    if (c.type === 'lab_quiz') return true
    const codeUpper = (c.code || '').toUpperCase()
    const nameLower = (c.name || '').toLowerCase()
    if (codeUpper.includes('-LAB') || codeUpper.startsWith('LAB') || codeUpper.endsWith('LAB')) return true
    if (/\blab\b/i.test(nameLower) || /\blaboratory\b/i.test(nameLower) || /\bworkshop\b/i.test(nameLower)) return true
    return false
  }

  const targetCourses = activeCoursesPool.filter((c) => {
    if (config.examType === 'quiz') {
      // Quiz mode generates strictly Lab Quizzes / Lab Evaluations
      return isLabCourse(c)
    }
    // MST mode generates strictly Theory Mid-Semester Tests (excluding labs)
    return c.type === 'theory' && !isLabCourse(c)
  })

  // If no slots are defined yet in configuration (e.g. fresh custom setup), return clean empty schedule
  const hasConfiguredSlots =
    (config.slotsPerDay && config.slotsPerDay.length > 0) ||
    (config.daySpecificSlots && Object.values(config.daySpecificSlots).some((s) => s.length > 0))

  if (!hasConfiguredSlots || targetCourses.length === 0) {
    const facultyDutyDistribution = teachers.map((t) => ({
      teacherId: t.id,
      teacherName: t.name,
      department: t.department,
      priority: t.priority,
      dutiesCount: 0,
      maxDuties: t.maxDuties,
      assignedSlotSummaries: [],
    }))

    if (!hasConfiguredSlots && targetCourses.length > 0) {
      constraintViolations.push(
        'No exam shifts/slots configured yet. Please add slots per day in Section 1 to generate the timetable.'
      )
    }

    return {
      config,
      slots: [],
      totalExamsScheduled: 0,
      totalStudentsSeated: 0,
      totalRoomsUtilized: 0,
      facultyDutyDistribution,
      priorityDispersionScore: 100,
      constraintViolations,
      generatedAt: new Date().toISOString(),
    }
  }

  // 2. Select compatible rooms based on exam type
  const activeRooms = activeRoomsPool.filter((r) => {
    if (config.examType === 'quiz') {
      return r.type === 'lab'
    }
    return r.type === 'hall' || r.type === 'classroom'
  })

  // Helper to extract a normalized semester identifier e.g. "Semester 3" or "3"
  const getSemKey = (sem?: string, year?: string): string => {
    if (sem) {
      const match = sem.match(/(?:Semester|Sem)\s*(\d+)/i)
      if (match) return `Sem_${match[1]}`
    }
    if (year === '1st Year') return 'Sem_1'
    if (year === '2nd Year') return 'Sem_3'
    if (year === '3rd Year') return 'Sem_5'
    if (year === '4th Year') return 'Sem_7'
    return sem || year || 'General'
  }

  // Calculate student enrollment lists for each course:
  // Inherently, all active students of a semester sit in all exams conducted for that semester.
  const courseEnrollments = new Map<string, Student[]>()
  targetCourses.forEach((c) => {
    const courseSemKey = getSemKey(c.semester, c.year)
    const enrolled = activeStudentsPool.filter((s) => {
      const studentSemKey = getSemKey(s.semester, s.year)
      if (studentSemKey === courseSemKey) return true
      // Also match if student explicitly has the course code in enrolledCourseCodes
      if (s.enrolledCourseCodes && s.enrolledCourseCodes.includes(c.code)) return true
      // Or fallback to same academic year if semester is generic
      return s.year === c.year && (!c.semester || !s.semester)
    })

    // Sort students deterministically by roll number
    enrolled.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }))
    courseEnrollments.set(c.code, enrolled)
  })

  // If no specific lab rooms found for quiz, use classrooms
  const usableRooms = activeRooms.length > 0 ? activeRooms : activeRoomsPool

  // Calculate maximum total student capacity across usable rooms in a single slot
  // In interleaved 2-exam mode, effective capacity accounts for room total benches and capacity
  const maxRoomCapacityPerSlot = usableRooms.reduce((sum, r) => sum + (r.totalBenches || 0) * (r.benchCapacity || 1), 0)

  // 3. Compute active exam dates between startDate and endDate, excluding holidays and Sundays
  // DEF-07: Use local year/month/day parsing rather than new Date('YYYY-MM-DD') which parses as UTC and shifts a day in negative UTC offsets (e.g. US timezones).
  const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date()
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0)
    }
    return new Date(dateStr)
  }

  const holidaysSet = new Set(config.holidays || [])
  const examDates: { dayNumber: number; dateStr: string; dateObj: Date }[] = []

  const startD = parseLocalDate(config.startDate || '2025-05-12')
  const endD = parseLocalDate(config.endDate || config.startDate || '2025-05-16')

  // If end date is before start date, ensure at least start date
  if (endD < startD) {
    endD.setTime(startD.getTime() + (config.totalDays - 1) * 86400000)
  }

  let curr = new Date(startD)
  let dayCounter = 1
  while (curr <= endD) {
    const yyyy = curr.getFullYear()
    const mm = String(curr.getMonth() + 1).padStart(2, '0')
    const dd = String(curr.getDate()).padStart(2, '0')
    const isoDate = `${yyyy}-${mm}-${dd}`

    // Skip Sundays and user-marked holidays
    const dayOfWeek = curr.getDay() // 0 = Sunday
    if (dayOfWeek !== 0 && !holidaysSet.has(isoDate)) {
      const formattedDate = curr.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      examDates.push({
        dayNumber: dayCounter++,
        dateStr: formattedDate,
        dateObj: new Date(curr),
      })
    }
    curr.setDate(curr.getDate() + 1)
  }

  // Fallback: If no dates or dates filtered out, generate at least totalDays
  if (examDates.length === 0) {
    for (let d = 1; d <= (config.totalDays || 4); d++) {
      const dt = new Date(startD)
      dt.setDate(dt.getDate() + (d - 1))
      examDates.push({
        dayNumber: d,
        dateStr: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj: dt,
      })
    }
  }

  // -------------------------------------------------------------------------
  // VALIDATE SEMESTER COURSE COUNT AGAINST TOTAL POSSIBLE SLOTS
  // A semester cohort can only have 1 exam per slot. If course count > total possible slots,
  // flag an error, report the violation, and prevent extra courses from scheduling.
  // -------------------------------------------------------------------------
  let totalPossibleSlotsInSession = 0
  examDates.forEach((d) => {
    const daySlots = (config.daySpecificSlots && config.daySpecificSlots[d.dayNumber]) || config.slotsPerDay || []
    totalPossibleSlotsInSession += daySlots.length
  })

  // Group active target courses by normalized semester
  const coursesBySemKey = new Map<string, Course[]>()
  targetCourses.forEach((c) => {
    const semKey = getSemKey(c.semester, c.year)
    const list = coursesBySemKey.get(semKey) || []
    list.push(c)
    coursesBySemKey.set(semKey, list)
  })

  const unscheduledCoursesList: { course: Course; reason: string }[] = []
  const validTargetCoursesSet = new Set<string>()

  coursesBySemKey.forEach((semCourses, semKey) => {
    if (semCourses.length > totalPossibleSlotsInSession) {
      const excessCount = semCourses.length - totalPossibleSlotsInSession
      const semDisplayName = semCourses[0].semester || semCourses[0].year || semKey
      const extraCourses = semCourses.slice(totalPossibleSlotsInSession)
      const allowedCourses = semCourses.slice(0, totalPossibleSlotsInSession)

      allowedCourses.forEach((c) => validTargetCoursesSet.add(c.id))

      extraCourses.forEach((c) => {
        unscheduledCoursesList.push({
          course: c,
          reason: `Total courses (${semCourses.length}) for ${semDisplayName} exceeds total available session slots (${totalPossibleSlotsInSession}). Excluded from scheduling.`,
        })
      })

      constraintViolations.push(
        `Slot Capacity Error: ${semDisplayName} has ${semCourses.length} courses, but the exam session only has ${totalPossibleSlotsInSession} total slots across ${examDates.length} days. ${excessCount} course(s) (${extraCourses.map((c) => c.code).join(', ')}) were NOT scheduled. Please increase total days or slots per day.`
      )
    } else {
      semCourses.forEach((c) => validTargetCoursesSet.add(c.id))
    }
  })

  const schedulableCourses = targetCourses.filter((c) => validTargetCoursesSet.has(c.id))

  const scheduledSlots: ScheduledSlot[] = []

  // Group schedulable courses by Year
  const coursesByYear = new Map<AcademicYear, Course[]>()
  const yearsList: AcademicYear[] = ['1st Year', '2nd Year', '3rd Year', '4th Year']
  yearsList.forEach((y) => coursesByYear.set(y, []))
  schedulableCourses.forEach((c) => {
    const list = coursesByYear.get(c.year) || []
    list.push(c)
    coursesByYear.set(c.year, list)
  })

  // Queue of courses remaining to be scheduled
  const remainingCourseQueues = new Map<AcademicYear, Course[]>()
  yearsList.forEach((y) => {
    const yearCourses = [...(coursesByYear.get(y) || [])]
    remainingCourseQueues.set(y, yearCourses)
  })

  // Track teacher duty counts across the entire session
  const teacherDutyCounts = new Map<string, number>()
  const teacherDutyLogs = new Map<string, { day: number; slot: string; room: string }[]>()
  activeTeachersPool.forEach((t) => {
    teacherDutyCounts.set(t.id, 0)
    teacherDutyLogs.set(t.id, [])
  })

  let priorityDispersionChecks = 0
  let priorityDispersionPassed = 0
  let currentSlotIndex = 0

  // =========================================================================
  // GLOBAL TIMETABLE MATRIX SETUP
  // timetableGrid: Map<dayNumber, Map<slotIndex, Course[]>>
  // =========================================================================
  const timetableGrid: Map<number, Map<number, Course[]>> = new Map()

  examDates.forEach((d) => {
    const daySlots = (config.daySpecificSlots && config.daySpecificSlots[d.dayNumber]) || config.slotsPerDay || []
    const slotMap = new Map<number, Course[]>()
    for (let sIdx = 0; sIdx < daySlots.length; sIdx++) {
      slotMap.set(sIdx, [])
    }
    timetableGrid.set(d.dayNumber, slotMap)
  })

  // -------------------------------------------------------------------------
  // STEP 0: PRE-SCHEDULE USER-FIXED / PINNED COURSES
  // If the user has explicitly fixed/pinned any course to a specific (day, slot),
  // place it immediately and remove it from remainingCourseQueues.
  // -------------------------------------------------------------------------
  if (config.fixedCourseSlots && Object.keys(config.fixedCourseSlots).length > 0) {
    for (const [courseCode, fixInfo] of Object.entries(config.fixedCourseSlots)) {
      const { dayNumber, slotIndex } = fixInfo
      const dayGrid = timetableGrid.get(dayNumber)
      if (dayGrid && dayGrid.has(slotIndex)) {
        // Find course in remainingCourseQueues
        for (const year of yearsList) {
          const q = remainingCourseQueues.get(year) || []
          const cIdx = q.findIndex((c) => c.code.toUpperCase() === courseCode.toUpperCase())
          if (cIdx !== -1) {
            const course = q.splice(cIdx, 1)[0]
            dayGrid.get(slotIndex)!.push(course)
            break
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 1: FILL REGULAR COURSES ROUND-ROBIN
  // PASS 1: Fill Morning Slot (Shift 0) for Day 1, Day 2, Day 3, ... Day N
  // PASS 2: Fill Last Slot (Shift N-1) for Day 1, Day 2, Day 3, ... Day N
  // PASS 3+: Fill Middle Slots (Shift 1, Shift 2...) for Day 1, Day 2, ... Day N
  // -------------------------------------------------------------------------
  // Determine max slots on any day
  let maxSlotsInSession = 1
  examDates.forEach((d) => {
    const daySlots = (config.daySpecificSlots && config.daySpecificSlots[d.dayNumber]) || config.slotsPerDay || []
    if (daySlots.length > maxSlotsInSession) {
      maxSlotsInSession = daySlots.length
    }
  })

  // Helper to determine the target slot index for a given day in each pass
  // Pass 0 -> Morning Slot (0)
  // Pass 1 -> Last Slot (totalSlotsOnDay - 1)
  // Pass 2+ -> Middle Slots (1, 2, ...)
  const getSlotIndexForPass = (passNumber: number, totalSlotsOnDay: number): number => {
    if (totalSlotsOnDay <= 1) return 0
    if (passNumber === 0) return 0 // Morning (first slot)
    if (passNumber === 1) return totalSlotsOnDay - 1 // Last slot (e.g. Afternoon shift)
    // Pass 2 onwards: fill middle slots (1, 2, ..., totalSlotsOnDay - 2)
    const middleIndex = passNumber - 1
    if (middleIndex < totalSlotsOnDay - 1) {
      return middleIndex
    }
    return -1
  }

  for (let pass = 0; pass < maxSlotsInSession; pass++) {
    for (const dateItem of examDates) {
      const dNum = dateItem.dayNumber
      const daySlots = (config.daySpecificSlots && config.daySpecificSlots[dNum]) || config.slotsPerDay || []
      const sIdx = getSlotIndexForPass(pass, daySlots.length)
      if (sIdx < 0 || sIdx >= daySlots.length) continue

      const dayGrid = timetableGrid.get(dNum)!
      const currentCoursesInSlot = dayGrid.get(sIdx) || []

      // Strict Rule: At any one time, ONE SEMESTER can only have AT MOST ONE exam scheduled.
      // Different semesters of the same year (e.g. 2nd Year Sem 3 & Sem 4, or Section A & Section B) CAN run at the same time.
      // DEF-02: Also verify that adding this course will not exceed the total seating capacity of all usable rooms in this slot.
      for (const year of yearsList) {
        const q = remainingCourseQueues.get(year) || []
        if (q.length === 0) continue

        let i = 0
        while (i < q.length) {
          const candidate = q[i]
          const candidateSem = candidate.semester || ''

          // Check if this specific semester already has an exam scheduled in this slot
          const sameSemesterConflict = currentCoursesInSlot.some(
            (c) => (c.semester || '') === candidateSem && candidateSem !== ''
          )

          // Calculate current enrolled students already placed in this slot
          const currentEnrolledInSlot = currentCoursesInSlot.reduce(
            (sum, c) => sum + (courseEnrollments.get(c.code) || []).length,
            0
          )
          const candidateEnrolled = (courseEnrollments.get(candidate.code) || []).length

          // In interleaved seating mode, capacity is constrained by room seats
          const exceedsCapacity = currentEnrolledInSlot > 0 && (currentEnrolledInSlot + candidateEnrolled > maxRoomCapacityPerSlot)

          if (!sameSemesterConflict && !exceedsCapacity) {
            // No semester conflict and room capacity allows: place course in this slot
            const [selectedCourse] = q.splice(i, 1)
            currentCoursesInSlot.push(selectedCourse)
          } else {
            i++
          }
        }
      }
      dayGrid.set(sIdx, currentCoursesInSlot)
    }
  }

  // Fallback Pass: If any courses remain in queues (due to strict capacity capping), schedule them into least loaded slots
  for (const year of yearsList) {
    const q = remainingCourseQueues.get(year) || []
    while (q.length > 0) {
      const candidate = q.shift()!
      const candidateSem = candidate.semester || ''

      // Find slot with no semester conflict and lowest total enrolled count
      let bestDay = -1
      let bestSlot = -1
      let minEnrolled = Infinity

      for (const dateItem of examDates) {
        const dNum = dateItem.dayNumber
        const daySlots = (config.daySpecificSlots && config.daySpecificSlots[dNum]) || config.slotsPerDay || []
        const dayGrid = timetableGrid.get(dNum)!

        for (let sIdx = 0; sIdx < daySlots.length; sIdx++) {
          const coursesInSlot = dayGrid.get(sIdx) || []
          const sameSemesterConflict = coursesInSlot.some(
            (c) => (c.semester || '') === candidateSem && candidateSem !== ''
          )
          if (!sameSemesterConflict) {
            const totalEnrolled = coursesInSlot.reduce(
              (sum, c) => sum + (courseEnrollments.get(c.code) || []).length,
              0
            )
            if (totalEnrolled < minEnrolled) {
              minEnrolled = totalEnrolled
              bestDay = dNum
              bestSlot = sIdx
            }
          }
        }
      }

      if (bestDay !== -1 && bestSlot !== -1 && timetableGrid.get(bestDay)?.get(bestSlot)) {
        timetableGrid.get(bestDay)!.get(bestSlot)!.push(candidate)
      } else {
        // As absolute fallback, place in the first available slot in timetableGrid
        let placed = false
        for (const [_, slotMap] of timetableGrid.entries()) {
          for (const [_, courseList] of slotMap.entries()) {
            courseList.push(candidate)
            placed = true
            break
          }
          if (placed) break
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 3: ALLOCATE ROOMS, BENCHES & INVIGILATORS FOR ALL POPULATED SLOTS
  // -------------------------------------------------------------------------
  for (const dateItem of examDates) {
    const day = dateItem.dayNumber
    const formattedDate = dateItem.dateStr
    const daySlots = (config.daySpecificSlots && config.daySpecificSlots[day]) || config.slotsPerDay || []
    const dayGrid = timetableGrid.get(day)!

    for (let sIdx = 0; sIdx < daySlots.length; sIdx++) {
      const slotConfig = daySlots[sIdx]
      const slotCourses: Course[] = dayGrid.get(sIdx) || []

      if (slotCourses.length === 0) {
        // No exams in this slot on this day
        continue
      }

      currentSlotIndex++

      // 4. Allocate students to Rooms and Benches (with room-by-room, bench-by-bench interleaving)
      // 2nd Year sits on Left (L), 3rd Year sits on Right (R), 4th Year sits on Middle (M) for 3-seaters like Room 212 and Tutorial Room
      const roomAllocations: RoomSeatingPlan[] = []
      
      // Student queues for each course in this slot, sorted sequentially by Roll Number
      const studentQueues: { course: Course; year: AcademicYear; students: Student[] }[] = slotCourses.map((c) => {
        const enrolled = [...(courseEnrollments.get(c.code) || [])]
        // Sort students by Roll Number ascending so 1st roll no sits on 1st bench, 2nd on 2nd bench, etc.
        enrolled.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }))
        return {
          course: c,
          year: c.year,
          students: enrolled,
        }
      })

      // Categorize queues by year cohort
      const queue2ndYear = studentQueues.find((sq) => sq.year === '2nd Year')
      const queue3rdYear = studentQueues.find((sq) => sq.year === '3rd Year')
      const queue4thYear = studentQueues.find((sq) => sq.year === '4th Year')
      const queue1stYear = studentQueues.find((sq) => sq.year === '1st Year')

      let roomIdx = 0
      while (studentQueues.some((sq) => sq.students.length > 0) && roomIdx < usableRooms.length) {
        const room = usableRooms[roomIdx]
        const benchCapacity = room.benchCapacity || 2
        const totalBenches = room.totalBenches || 10
        const cols = room.columns || 2
        const benches: BenchAssignment[] = []

        const roomStudentsByCourse = new Map<string, Student[]>()
        slotCourses.forEach((c) => roomStudentsByCourse.set(c.code, []))

        for (let b = 1; b <= totalBenches; b++) {
          const row = Math.floor((b - 1) / cols) + 1
          const col = ((b - 1) % cols) + 1
          const seats: BenchAssignment['seats'] = []

          for (let seatIdx = 0; seatIdx < benchCapacity; seatIdx++) {
            let seatLabel = `Seat ${String.fromCharCode(65 + seatIdx)}`
            if (benchCapacity === 2) {
              seatLabel = seatIdx === 0 ? 'Left (L)' : 'Right (R)'
            } else if (benchCapacity === 3) {
              seatLabel = seatIdx === 0 ? 'Left (L)' : seatIdx === 1 ? 'Middle (M)' : 'Right (R)'
            } else if (benchCapacity === 1) {
              seatLabel = 'Terminal (1)'
            }

            let assignedStudent: Student | undefined
            let assignedCourse: Course | undefined

            // HARD ANTI-CHEATING CONSTRAINT:
            // A bench CANNOT have 2 students giving the exact SAME paper / course code under any circumstances.
            // Priority 1: Different Academic Years
            // Priority 2: Same Academic Year BUT DIFFERENT Exam Paper (e.g. Sem A vs Sem B)
            // If no different course student is available, the adjacent seat MUST BE LEFT VACANT (undefined).
            
            const alreadySeatedCourseCodes = new Set(
              seats.filter((s) => s.student).map((s) => s.student!.courseCode)
            )

            if (benchCapacity === 3) {
              // 3-Seater Benches (e.g. Room 212 & Tutorial Room)
              // Seat 0 (Left · L): 2nd Year (or 1st Year)
              // Seat 1 (Middle · M): 4th Year
              // Seat 2 (Right · R): 3rd Year
              if (seatIdx === 0) {
                const q = studentQueues.find(
                  (sq) =>
                    (sq.year === '2nd Year' || sq.year === '1st Year') &&
                    sq.students.length > 0 &&
                    !alreadySeatedCourseCodes.has(sq.course.code)
                )
                if (q) {
                  assignedStudent = q.students.shift()
                  assignedCourse = q.course
                }
              } else if (seatIdx === 1) {
                const q = studentQueues.find(
                  (sq) =>
                    sq.year === '4th Year' &&
                    sq.students.length > 0 &&
                    !alreadySeatedCourseCodes.has(sq.course.code)
                )
                if (q) {
                  assignedStudent = q.students.shift()
                  assignedCourse = q.course
                }
              } else if (seatIdx === 2) {
                const q = studentQueues.find(
                  (sq) =>
                    sq.year === '3rd Year' &&
                    sq.students.length > 0 &&
                    !alreadySeatedCourseCodes.has(sq.course.code)
                )
                if (q) {
                  assignedStudent = q.students.shift()
                  assignedCourse = q.course
                }
              }

              // Fallback Fill: If assigned cohort for this seat is exhausted, fill with any student of a DIFFERENT exam paper
              if (!assignedStudent) {
                const diffPaperQueue = studentQueues.find(
                  (sq) => sq.students.length > 0 && !alreadySeatedCourseCodes.has(sq.course.code)
                )
                if (diffPaperQueue) {
                  assignedStudent = diffPaperQueue.students.shift()
                  assignedCourse = diffPaperQueue.course
                }
              }
            } else if (benchCapacity === 2) {
              // 2-Seater Benches (e.g. LT-102 & LT-002)
              // Step 1: Primary distinct years (2nd Year on L, 3rd/4th Year on R)
              if (seatIdx === 0) {
                const q = studentQueues.find(
                  (sq) =>
                    (sq.year === '2nd Year' || sq.year === '1st Year') &&
                    sq.students.length > 0 &&
                    !alreadySeatedCourseCodes.has(sq.course.code)
                )
                if (q) {
                  assignedStudent = q.students.shift()
                  assignedCourse = q.course
                }
              } else if (seatIdx === 1) {
                const q = studentQueues.find(
                  (sq) =>
                    (sq.year === '3rd Year' || sq.year === '4th Year') &&
                    sq.students.length > 0 &&
                    !alreadySeatedCourseCodes.has(sq.course.code)
                )
                if (q) {
                  assignedStudent = q.students.shift()
                  assignedCourse = q.course
                }
              }

              // Step 2: Optimal Room Minimization - allow 4th Year students with different papers (Sec A & Sec B / Electives) to sit adjacent
              if (!assignedStudent) {
                const diffPaperQueue = studentQueues.find(
                  (sq) => sq.students.length > 0 && !alreadySeatedCourseCodes.has(sq.course.code)
                )
                if (diffPaperQueue) {
                  assignedStudent = diffPaperQueue.students.shift()
                  assignedCourse = diffPaperQueue.course
                }
              }
            } else {
              // 1-Seater Individual Workstations (Labs) - individual terminal, so any student is valid
              const q = studentQueues.find((sq) => sq.students.length > 0)
              if (q) {
                assignedStudent = q.students.shift()
                assignedCourse = q.course
              }
            }

            if (assignedStudent && assignedCourse) {
              const currentList = roomStudentsByCourse.get(assignedCourse.code) || []
              currentList.push(assignedStudent)
              roomStudentsByCourse.set(assignedCourse.code, currentList)

              seats.push({
                seatIndex: seatIdx,
                seatLabel,
                student: {
                  id: assignedStudent.id,
                  rollNo: assignedStudent.rollNo,
                  name: assignedStudent.name,
                  year: assignedStudent.year,
                  branch: assignedStudent.branch,
                  courseCode: assignedCourse.code,
                  courseName: assignedCourse.name,
                },
              })
            } else {
              // Empty seat on this bench (for anti-cheating spacing)
              seats.push({
                seatIndex: seatIdx,
                seatLabel,
                student: undefined,
              })
            }
          }

          benches.push({
            benchNumber: b,
            row,
            col,
            seats,
          })
        }

        // Summary of courses conducted in this room
        const coursesConducted: RoomSeatingPlan['coursesConducted'] = []
        let totalSeatedInRoom = 0

        slotCourses.forEach((c) => {
          const seatedList = roomStudentsByCourse.get(c.code) || []
          if (seatedList.length > 0) {
            totalSeatedInRoom += seatedList.length
            const firstRoll = seatedList[0].rollNo
            const lastRoll = seatedList[seatedList.length - 1].rollNo
            coursesConducted.push({
              code: c.code,
              name: c.name,
              studentCount: seatedList.length,
              rollNoRange: seatedList.length === 1 ? firstRoll : `${firstRoll} – ${lastRoll}`,
            })
          }
        })

        if (totalSeatedInRoom > 0) {
          roomAllocations.push({
            roomId: room.id,
            roomName: `${room.name} (${room.code})`,
            roomType: room.type,
            coursesConducted,
            benches,
            totalCapacity: totalBenches * benchCapacity,
            totalSeated: totalSeatedInRoom,
          })
        }

        roomIdx++
      }

      // Check if any students could not be seated due to lack of room capacity
      studentQueues.forEach((sq) => {
        if (sq.students.length > 0) {
          constraintViolations.push(
            `Room Capacity Exceeded: ${sq.students.length} students from ${sq.course.code} could not be seated in Day ${day} ${slotConfig.label}. Add more rooms/benches.`
          )
        }
      })

      // 5. Invigilator Allocation with priority dispersion across rooms & multi-invigilator support
      // "first allocate all 1 priority across rooms randomly then 2 then 3 and so on"
      // "if 2 high priority teacher will go to different class unless no option"
      const assignedFacultyList: ScheduledSlot['assignedFaculty'] = []
      const availableTeachersForSlot = activeTeachersPool.filter(
        (t) => (teacherDutyCounts.get(t.id) || 0) < t.maxDuties
      )

      // Normalize teacher priority to a number for comparison (lower number = higher priority rank: 1 is highest)
      const getPriorityScore = (p: TeacherPriority): number => {
        if (typeof p === 'number') return p
        if (p === 'high') return 1
        if (p === 'medium') return 2
        if (p === 'low') return 3
        const parsed = Number(p)
        return isNaN(parsed) ? 1 : parsed
      }

      // Group teachers by priority score (1 = highest, 2, 3, etc.)
      const teachersByPriority = new Map<number, Teacher[]>()
      availableTeachersForSlot.forEach((t) => {
        const score = getPriorityScore(t.priority)
        const list = teachersByPriority.get(score) || []
        list.push(t)
        teachersByPriority.set(score, list)
      })

      // Randomize within each priority tier to avoid bias
      const sortedPriorityScores = Array.from(teachersByPriority.keys()).sort((a, b) => a - b)
      sortedPriorityScores.forEach((score) => {
        const list = teachersByPriority.get(score) || []
        // Sort by fewest duties assigned, with random shuffle for ties
        list.sort((a, b) => {
          const dutyDiff = (teacherDutyCounts.get(a.id) || 0) - (teacherDutyCounts.get(b.id) || 0)
          if (dutyDiff !== 0) return dutyDiff
          return Math.random() - 0.5
        })
        teachersByPriority.set(score, list)
      })

      const usedTeacherIdsThisSlot = new Set<string>()

      // Helper to pick next available teacher by priority rank (Priority 1 first, then 2, etc.)
      const pickNextTeacher = (): Teacher | undefined => {
        for (const score of sortedPriorityScores) {
          const list = teachersByPriority.get(score) || []
          const candidateIdx = list.findIndex((t) => !usedTeacherIdsThisSlot.has(t.id))
          if (candidateIdx !== -1) {
            const [candidate] = list.splice(candidateIdx, 1)
            return candidate
          }
        }
        // Fallback to any teacher
        return availableTeachersForSlot.find((t) => !usedTeacherIdsThisSlot.has(t.id))
      }

      // Pass 1: Assign 1 primary invigilator to each active room across all rooms (dispersing Priority 1 first)
      const roomInvigilatorsMap = new Map<string, Teacher[]>()
      roomAllocations.forEach((roomPlan) => {
        roomInvigilatorsMap.set(roomPlan.roomId, [])
      })

      // Round 1 of assignment (1 teacher per room)
      roomAllocations.forEach((roomPlan) => {
        const candidate = pickNextTeacher()
        if (candidate) {
          usedTeacherIdsThisSlot.add(candidate.id)
          roomInvigilatorsMap.get(roomPlan.roomId)?.push(candidate)
        }
      })

      // Pass 2: If a room requires multiple invigilators (e.g. invigilatorsRequired: 2 for large lecture halls), allocate additional teachers
      roomAllocations.forEach((roomPlan) => {
        const originalRoom = usableRooms.find((r) => r.id === roomPlan.roomId)
        const requiredCount = originalRoom?.invigilatorsRequired || 1
        const currentAssigned = roomInvigilatorsMap.get(roomPlan.roomId) || []

        while (currentAssigned.length < requiredCount) {
          const candidate = pickNextTeacher()
          if (candidate) {
            usedTeacherIdsThisSlot.add(candidate.id)
            currentAssigned.push(candidate)
          } else {
            break // No more teachers available in this slot
          }
        }
      })

      // Finalize invigilator duty logging and assignments
      roomAllocations.forEach((roomPlan) => {
        const assignedTeachers = roomInvigilatorsMap.get(roomPlan.roomId) || []

        if (assignedTeachers.length > 0) {
          const primary = assignedTeachers[0]
          roomPlan.invigilator = {
            id: primary.id,
            name: primary.name,
            department: primary.department,
            priority: primary.priority,
          }
          roomPlan.invigilators = assignedTeachers.map((t) => ({
            id: t.id,
            name: t.name,
            department: t.department,
            priority: t.priority,
          }))

          assignedTeachers.forEach((t) => {
            const curDuties = teacherDutyCounts.get(t.id) || 0
            teacherDutyCounts.set(t.id, curDuties + 1)

            const curLog = teacherDutyLogs.get(t.id) || []
            curLog.push({
              day,
              slot: slotConfig.label,
              room: roomPlan.roomName,
            })
            teacherDutyLogs.set(t.id, curLog)

            assignedFacultyList.push({
              teacherId: t.id,
              teacherName: t.name,
              priority: t.priority,
              roomId: roomPlan.roomId,
              roomName: roomPlan.roomName,
            })
          })
        }
      })

      // Verify priority dispersion: Are high priority teachers placed in distinct active rooms?
      if (roomAllocations.length > 1) {
        priorityDispersionChecks++
        const highPriorityCount = assignedFacultyList.filter((f) => getPriorityScore(f.priority) === 1).length
        if (highPriorityCount <= roomAllocations.length) {
          priorityDispersionPassed++
        }
      }

      // Calculate slot time range & duration directly from slotConfig
      let slotDurationMinutes = 60
      if (slotConfig.startTime && slotConfig.endTime) {
        const [sh, sm] = slotConfig.startTime.split(':').map(Number)
        const [eh, em] = slotConfig.endTime.split(':').map(Number)
        const diff = (eh * 60 + em) - (sh * 60 + sm)
        if (diff > 0) slotDurationMinutes = diff
      } else if (config.examType === 'quiz') {
        slotDurationMinutes = config.labDurationMinutes || 60
      } else {
        slotDurationMinutes = config.theoryDurationMinutes || 60
      }

      let computedEndTime = slotConfig.endTime
      if (!computedEndTime && slotConfig.startTime) {
        const [h, m] = slotConfig.startTime.split(':').map((v) => parseInt(v, 10))
        const endTotalMins = (h || 9) * 60 + (m || 0) + slotDurationMinutes
        const endH = String(Math.floor(endTotalMins / 60) % 24).padStart(2, '0')
        const endM = String(endTotalMins % 60).padStart(2, '0')
        computedEndTime = `${endH}:${endM}`
      }

      scheduledSlots.push({
        slotId: `slot_${day}_${sIdx + 1}`,
        dayNumber: day,
        date: formattedDate,
        slotLabel: slotConfig.label,
        timeRange: `${formatClockTime(slotConfig.startTime || '09:30')} – ${formatClockTime(computedEndTime || '10:30')}`,
        examType: config.examType,
        scheduledCourses: slotCourses.map((c) => {
          return {
            code: c.code,
            name: c.name,
            year: c.year,
            semester: c.semester,
            type: c.type,
            durationMinutes: slotDurationMinutes,
            studentCount: (courseEnrollments.get(c.code) || []).length,
            sections: Array.from(
              new Set(
                (courseEnrollments.get(c.code) || [])
                  .map((student) => normalizeSectionLabel(student.batch))
                  .filter((section): section is string => Boolean(section))
              )
            ),
          }
        }),
        roomAllocations,
        assignedFaculty: assignedFacultyList,
      })
    }
  }

  // Check if any courses were left unassigned due to insufficient days
  for (const year of yearsList) {
    const q = remainingCourseQueues.get(year) || []
    if (q.length > 0) {
      constraintViolations.push(
        `Insufficient Days/Slots: ${q.length} courses (${q.map((c) => c.code).join(', ')}) could not be scheduled within ${config.totalDays} days. Increase total days or slots per day.`
      )
    }
  }

  // Summary statistics
  const totalExamsScheduled = targetCourses.length - Array.from(remainingCourseQueues.values()).reduce((sum, q) => sum + q.length, 0)
  const totalStudentsSeated = scheduledSlots.reduce(
    (sum, slot) => sum + slot.roomAllocations.reduce((rSum, r) => rSum + r.totalSeated, 0),
    0
  )
  const totalRoomsUtilized = new Set(
    scheduledSlots.flatMap((s) => s.roomAllocations.map((r) => r.roomId))
  ).size

  const facultyDutyDistribution = teachers.map((t) => ({
    teacherId: t.id,
    teacherName: t.name,
    department: t.department,
    priority: t.priority,
    dutiesCount: teacherDutyCounts.get(t.id) || 0,
    maxDuties: t.maxDuties,
    assignedSlotSummaries: teacherDutyLogs.get(t.id) || [],
  }))

  const priorityDispersionScore =
    priorityDispersionChecks > 0
      ? Math.round((priorityDispersionPassed / priorityDispersionChecks) * 100)
      : 100

  return {
    config,
    slots: scheduledSlots,
    totalExamsScheduled,
    totalStudentsSeated,
    totalRoomsUtilized,
    facultyDutyDistribution,
    priorityDispersionScore,
    constraintViolations,
    unscheduledCourses: unscheduledCoursesList,
    generatedAt: new Date().toISOString(),
  }
}
