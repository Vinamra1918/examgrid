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
} from './types'
import { isRoomUnavailable, isTeacherAvailableDuringSlot } from './scheduler-engine'

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

function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  const parts = dateStr.split('-').map(Number)
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0)
  }
  return new Date(dateStr)
}

function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  const h = parts[0] || 0
  const m = parts[1] || 0
  return h * 60 + m
}

function minutesToTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Dedicated Lab Quiz Scheduling Algorithm
 * 
 * Key Principles:
 * 1. User configures which year(s) to conduct the quiz (Yes/No for 1st, 2nd, 3rd, 4th Year).
 * 2. For each enabled year, user specifies the Quiz Date and Start Time.
 * 3. Simultaneous Semesters (Sem A and Sem B):
 *    - For an academic year (e.g. 2nd Year), we have courses for Sem A (e.g. Courses a,b,c,d) and Sem B (e.g. Courses x,y,z).
 *    - In a given slot, 1 course from Sem A (e.g. Course a) and 1 course from Sem B (e.g. Course x) CAN RUN SIMULTANEOUSLY at the exact same time.
 *    - We have enough laboratory capacity to seat the entire year (both cohorts) simultaneously across lab workstations (each computer is 1 single-seater terminal).
 * 4. Subsequent slots run the next pair of courses (e.g. Course b + Course y at 4:15 PM, Course c + Course z at 4:30 PM, Course d at 4:45 PM).
 * 5. Overlap resolution between different years:
 *    - If 2 selected years are scheduled on the same date and their time windows overlap:
 *      * Flag a constraint violation / notification.
 *      * Schedule the year with the earlier start time completely first.
 *      * The overlapping year begins immediately after the first year completes.
 */
export function generateLabQuizSchedule(
  config: ExamSessionConfig,
  students: Student[],
  courses: Course[],
  rooms: Room[],
  teachers: Teacher[],
  teachingAssistants: Teacher[] = []
): ScheduleResult {
  const constraintViolations: string[] = []

  const activeCoursesPool = courses.filter((c) => c.included !== false)
  const activeStudentsPool = students.filter((s) => s.included !== false)
  const activeRoomsPool = rooms.filter((r) => r.included !== false)
  const activeTeachersPool = teachers.filter((t) => t.included !== false)
  const activeTAsPool = (teachingAssistants || []).filter((ta) => ta.included !== false)

  const isLabCourse = (c: Course): boolean => {
    if (c.type === 'lab_quiz') return true
    const codeUpper = (c.code || '').toUpperCase()
    const nameLower = (c.name || '').toLowerCase()
    if (codeUpper.includes('-LAB') || codeUpper.startsWith('LAB') || codeUpper.endsWith('LAB')) return true
    if (/\blab\b/i.test(nameLower) || /\blaboratory\b/i.test(nameLower) || /\bworkshop\b/i.test(nameLower)) return true
    return false
  }

  const allLabCourses = activeCoursesPool.filter(isLabCourse)

  // Determine which years are selected
  const allYears: AcademicYear[] = ['1st Year', '2nd Year', '3rd Year', '4th Year']
  const yearConfigs = config.quizYearConfigs || {
    '1st Year': { enabled: false, date: '', startTime: '16:00' },
    '2nd Year': { enabled: true, date: config.startDate || '', startTime: '16:00' },
    '3rd Year': { enabled: false, date: '', startTime: '16:00' },
    '4th Year': { enabled: false, date: '', startTime: '16:00' },
  }

  // Filter years marked as Yes / enabled
  let selectedYears = allYears.filter((y) => yearConfigs[y]?.enabled)

  // Fallback: If no year is explicitly enabled via quizYearConfigs, fallback to active lab course years
  if (selectedYears.length === 0) {
    selectedYears = allYears.filter((y) => allLabCourses.some((c) => c.year === y))
  }

  const targetCourses = allLabCourses.filter((c) => selectedYears.includes(c.year))

  if (targetCourses.length === 0 || selectedYears.length === 0) {
    const facultyDutyDistribution = teachers.map((t) => ({
      teacherId: t.id,
      teacherName: t.name,
      department: t.department,
      priority: t.priority,
      dutiesCount: 0,
      maxDuties: t.maxDuties,
      assignedSlotSummaries: [],
    }))

    if (selectedYears.length === 0) {
      constraintViolations.push(
        'No academic year selected for lab quizzes. Please enable at least one year (1st, 2nd, 3rd, or 4th Year) in Section 1.'
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

  // Compatible lab rooms (fallback to classrooms if no labs marked)
  const labRooms = activeRoomsPool.filter((r) => r.type === 'lab')
  const usableRooms = labRooms.length > 0 ? labRooms : activeRoomsPool

  // Helper to extract a normalized semester identifier
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

  // Compute student enrollments for each lab quiz (honoring courseStudentOverrides if specified)
  const courseEnrollments = new Map<string, Student[]>()
  targetCourses.forEach((c) => {
    const overrideRolls = config.courseStudentOverrides?.[c.code]
    if (overrideRolls && overrideRolls.length > 0) {
      const overrideSet = new Set(overrideRolls.map((r) => r.trim().toLowerCase()))
      const enrolled = activeStudentsPool.filter(
        (s) =>
          overrideSet.has(s.rollNo.trim().toLowerCase()) ||
          overrideSet.has(s.id.trim().toLowerCase())
      )
      enrolled.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }))
      courseEnrollments.set(c.code, enrolled)
    } else {
      const courseSemKey = getSemKey(c.semester, c.year)
      const enrolled = activeStudentsPool.filter((s) => {
        const studentSemKey = getSemKey(s.semester, s.year)
        if (studentSemKey === courseSemKey) return true
        if (s.enrolledCourseCodes && s.enrolledCourseCodes.includes(c.code)) return true
        return s.year === c.year && (!c.semester || !s.semester)
      })
      enrolled.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }))
      courseEnrollments.set(c.code, enrolled)
    }
  })

  // Track teacher and TA duties
  const teacherDutyCounts = new Map<string, number>()
  const teacherDutyLogs = new Map<string, { day: number; slot: string; room: string }[]>()
  activeTeachersPool.forEach((t) => {
    teacherDutyCounts.set(t.id, 0)
    teacherDutyLogs.set(t.id, [])
  })

  const taDutyCounts = new Map<string, number>()
  const taDutyLogs = new Map<string, { day: number; slot: string; room: string }[]>()
  activeTAsPool.forEach((ta) => {
    taDutyCounts.set(ta.id, 0)
    taDutyLogs.set(ta.id, [])
  })

  // Default quiz duration (15 minutes if not specified or default is >=60)
  const quizStepMinutes =
    config.labDurationMinutes && config.labDurationMinutes > 0 && config.labDurationMinutes <= 30
      ? config.labDurationMinutes
      : 15

  // Prepare simultaneous course pairs per slot for each academic year
  // Group courses by semester (Sem A / Odd Sem vs Sem B / Even Sem)
  interface YearQuizPlan {
    year: AcademicYear
    dateIso: string
    dateFormatted: string
    startTime: string
    initialStartMinutes: number
    slotCourseGroups: Course[][] // Each item is an array of courses running simultaneously in that slot (e.g. [SemA Course 1, SemB Course 1])
    totalDurationMinutes: number
  }

  const yearPlans: YearQuizPlan[] = []

  selectedYears.forEach((year, yIdx) => {
    const yCfg = yearConfigs[year]
    const yearCourses = targetCourses.filter((c) => c.year === year)
    if (yearCourses.length === 0) return

    let dateIso = yCfg?.date || config.startDate || ''
    if (!dateIso) {
      const d = new Date()
      d.setDate(d.getDate() + yIdx)
      dateIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    const dObj = parseLocalDate(dateIso)
    const dateFormatted = dObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    const startTime = yCfg?.startTime || '16:00'
    const startMinutes = timeStringToMinutes(startTime)

    // Separate year courses into distinct semesters (Sem A vs Sem B)
    const coursesBySemester = new Map<string, Course[]>()
    yearCourses.forEach((c) => {
      const semKey = getSemKey(c.semester, c.year)
      const list = coursesBySemester.get(semKey) || []
      list.push(c)
      coursesBySemester.set(semKey, list)
    })

    // Create parallel slot groups (combining 1 course from Sem A and 1 course from Sem B per slot)
    const semKeys = Array.from(coursesBySemester.keys())
    const maxCoursesInAnySem = Math.max(...semKeys.map((k) => coursesBySemester.get(k)!.length), 0)

    const slotCourseGroups: Course[][] = []
    for (let slotIdx = 0; slotIdx < maxCoursesInAnySem; slotIdx++) {
      const coursesInThisSlot: Course[] = []
      semKeys.forEach((semKey) => {
        const list = coursesBySemester.get(semKey) || []
        if (list[slotIdx]) {
          coursesInThisSlot.push(list[slotIdx])
        }
      })
      if (coursesInThisSlot.length > 0) {
        slotCourseGroups.push(coursesInThisSlot)
      }
    }

    const totalDuration = slotCourseGroups.length * quizStepMinutes

    yearPlans.push({
      year,
      dateIso,
      dateFormatted,
      startTime,
      initialStartMinutes: startMinutes,
      slotCourseGroups,
      totalDurationMinutes: totalDuration,
    })
  })

  // Group year plans by Date to detect and resolve timing overlaps
  const plansByDate = new Map<string, YearQuizPlan[]>()
  yearPlans.forEach((plan) => {
    const list = plansByDate.get(plan.dateIso) || []
    list.push(plan)
    plansByDate.set(plan.dateIso, list)
  })

  // Process schedule sequentially per date
  const scheduledSlots: ScheduledSlot[] = []
  const uniqueDates = Array.from(plansByDate.keys()).sort()
  const dateDayNumberMap = new Map<string, number>()
  uniqueDates.forEach((dt, idx) => {
    dateDayNumberMap.set(dt, idx + 1)
  })

  uniqueDates.forEach((dateIso) => {
    const dayPlans = plansByDate.get(dateIso)!
    const dayNumber = dateDayNumberMap.get(dateIso) || 1

    // Sort by requested startTime ascending
    dayPlans.sort((a, b) => a.initialStartMinutes - b.initialStartMinutes)

    let currentAvailableMinutes = 0

    dayPlans.forEach((plan, pIdx) => {
      let actualStartMinutes = plan.initialStartMinutes

      if (pIdx > 0) {
        const prevPlan = dayPlans[pIdx - 1]
        const prevEndMinutes = currentAvailableMinutes

        if (actualStartMinutes < prevEndMinutes) {
          // Overlap detected!
          const requestedTimeStr = formatClockTime(plan.startTime)
          const newTimeStr = formatClockTime(minutesToTimeString(prevEndMinutes))

          constraintViolations.push(
            `Timing Overlap Detected on ${plan.dateFormatted}: ${plan.year} was requested at ${requestedTimeStr}, but ${prevPlan.year} is in session until ${formatClockTime(minutesToTimeString(prevEndMinutes))}. Per lab seating rules, ${prevPlan.year} will complete first, and ${plan.year} is rescheduled to start immediately at ${newTimeStr}.`
          )

          actualStartMinutes = prevEndMinutes
        }
      }

      // Schedule course groups for this year consecutively
      let currentSlotTimeMinutes = actualStartMinutes

      plan.slotCourseGroups.forEach((coursesInSlot, slotIdx) => {
        const slotStartTime = minutesToTimeString(currentSlotTimeMinutes)
        const slotDuration = quizStepMinutes
        const slotEndTime = minutesToTimeString(currentSlotTimeMinutes + slotDuration)
        currentSlotTimeMinutes += slotDuration

        const courseCodesStr = coursesInSlot.map((c) => c.code).join(' + ')
        const slotLabel = `Quiz Slot ${slotIdx + 1} (${courseCodesStr})`
        const timeRange = `${formatClockTime(slotStartTime)} – ${formatClockTime(slotEndTime)}`

        // Collect all students taking the parallel courses in this slot
        // Group by course
        const studentQueuesByCourse = coursesInSlot.map((course) => ({
          course,
          students: [...(courseEnrollments.get(course.code) || [])],
        }))

        const totalStudentsInSlot = studentQueuesByCourse.reduce((sum, q) => sum + q.students.length, 0)

        // Seating: Treat every computer terminal as a 1-seater workstation
        // Distribute both course cohorts across available lab rooms/terminals
        const roomAllocations: RoomSeatingPlan[] = []

        let roomIdx = 0
        while (studentQueuesByCourse.some((q) => q.students.length > 0) && roomIdx < usableRooms.length) {
          const room = usableRooms[roomIdx++]
          
          if (isRoomUnavailable(room, plan.dateIso, slotStartTime, slotEndTime)) {
            continue
          }
          
          const totalTerminals = room.totalBenches || 30
          const cols = room.columns || Math.min(10, totalTerminals)
          const benches: BenchAssignment[] = []
          const roomStudentsByCourse = new Map<string, Student[]>()
          coursesInSlot.forEach((c) => roomStudentsByCourse.set(c.code, []))

          for (let b = 1; b <= totalTerminals; b++) {
            const row = Math.floor((b - 1) / cols) + 1
            const col = ((b - 1) % cols) + 1

            // Pick next available student from any active course queue
            let assignedStudent: Student | undefined
            let assignedCourse: Course | undefined

            const activeQueue = studentQueuesByCourse.find((q) => q.students.length > 0)
            if (activeQueue) {
              assignedStudent = activeQueue.students.shift()
              assignedCourse = activeQueue.course
              const list = roomStudentsByCourse.get(assignedCourse.code) || []
              list.push(assignedStudent!)
              roomStudentsByCourse.set(assignedCourse.code, list)
            }

            benches.push({
              benchNumber: b,
              row,
              col,
              seats: [
                {
                  seatIndex: 0,
                  seatLabel: `Terminal ${b}`,
                  student: assignedStudent && assignedCourse
                    ? {
                        id: assignedStudent.id,
                        rollNo: assignedStudent.rollNo,
                        name: assignedStudent.name,
                        year: assignedStudent.year,
                        branch: assignedStudent.branch,
                        courseCode: assignedCourse.code,
                        courseName: assignedCourse.name,
                      }
                    : undefined,
                },
              ],
            })
          }

          const seatedCountInThisRoom = Array.from(roomStudentsByCourse.values()).reduce(
            (sum, list) => sum + list.length,
            0
          )

          if (seatedCountInThisRoom > 0 || roomAllocations.length === 0) {
            // Courses conducted in this room summary
            const coursesConductedList: RoomSeatingPlan['coursesConducted'] = []
            coursesInSlot.forEach((c) => {
              const seatedList = roomStudentsByCourse.get(c.code) || []
              if (seatedList.length > 0) {
                const rollNumbers = seatedList.map((s) => s.rollNo)
                coursesConductedList.push({
                  code: c.code,
                  name: c.name,
                  studentCount: seatedList.length,
                  rollNoRange: `${rollNumbers[0]} – ${rollNumbers[rollNumbers.length - 1]} (${seatedList.length} Students)`,
                })
              }
            })

            // Teacher (Faculty) assignment based on room.teachersRequired and timetable suspension availability
            const examDateObj = parseLocalDate(plan.dateIso)
            const examDayOfWeek = examDateObj.toLocaleDateString('en-US', { weekday: 'long' })
            const reqTeachers = room.teachersRequired ?? room.invigilatorsRequired ?? 1
            const assignedTeachersList: Teacher[] = []
            if (activeTeachersPool.length > 0 && reqTeachers > 0) {
              for (let tIdx = 0; tIdx < reqTeachers; tIdx++) {
                const availableTeachers = activeTeachersPool.filter(
                  (t) =>
                    (teacherDutyCounts.get(t.id) || 0) < t.maxDuties &&
                    !assignedTeachersList.some((at) => at.id === t.id) &&
                    isTeacherAvailableDuringSlot(
                      t,
                      plan.dateIso,
                      examDayOfWeek,
                      slotStartTime,
                      slotEndTime,
                      config.teacherTimetableEntries,
                      config.classSuspensionConfig
                    )
                )
                if (availableTeachers.length === 0) break
                availableTeachers.sort(
                  (a, b) => (teacherDutyCounts.get(a.id) || 0) - (teacherDutyCounts.get(b.id) || 0)
                )
                const pickedTeacher = availableTeachers[0]
                assignedTeachersList.push(pickedTeacher)
                teacherDutyCounts.set(pickedTeacher.id, (teacherDutyCounts.get(pickedTeacher.id) || 0) + 1)
                const logs = teacherDutyLogs.get(pickedTeacher.id) || []
                logs.push({ day: dayNumber, slot: `${slotLabel} (${timeRange})`, room: room.name })
                teacherDutyLogs.set(pickedTeacher.id, logs)
              }
            }

            // Teaching Assistant assignment based on room.teachingAssistantsRequired and timetable availability
            const reqTAs = room.teachingAssistantsRequired ?? 1
            const assignedTAListForRoom: Teacher[] = []
            if (activeTAsPool.length > 0 && reqTAs > 0) {
              for (let taIdx = 0; taIdx < reqTAs; taIdx++) {
                const availableTAs = activeTAsPool.filter(
                  (ta) =>
                    (taDutyCounts.get(ta.id) || 0) < ta.maxDuties &&
                    !assignedTAListForRoom.some((aTa) => aTa.id === ta.id) &&
                    isTeacherAvailableDuringSlot(
                      ta,
                      plan.dateIso,
                      examDayOfWeek,
                      slotStartTime,
                      slotEndTime,
                      config.teacherTimetableEntries,
                      config.classSuspensionConfig
                    )
                )
                if (availableTAs.length === 0) break
                availableTAs.sort(
                  (a, b) => (taDutyCounts.get(a.id) || 0) - (taDutyCounts.get(b.id) || 0)
                )
                const pickedTA = availableTAs[0]
                assignedTAListForRoom.push(pickedTA)
                taDutyCounts.set(pickedTA.id, (taDutyCounts.get(pickedTA.id) || 0) + 1)
                const logs = taDutyLogs.get(pickedTA.id) || []
                logs.push({ day: dayNumber, slot: `${slotLabel} (${timeRange})`, room: room.name })
                taDutyLogs.set(pickedTA.id, logs)
              }
            }

            const primaryInvigilator = assignedTeachersList[0]
            roomAllocations.push({
              roomId: room.id,
              roomName: room.name,
              roomType: 'lab',
              totalCapacity: totalTerminals,
              totalSeated: seatedCountInThisRoom,
              invigilator: primaryInvigilator
                ? {
                    id: primaryInvigilator.id,
                    name: primaryInvigilator.name,
                    department: primaryInvigilator.department,
                    priority: primaryInvigilator.priority,
                  }
                : undefined,
              invigilators: assignedTeachersList.map((t) => ({
                id: t.id,
                name: t.name,
                department: t.department,
                priority: t.priority,
              })),
              teachingAssistants: assignedTAListForRoom.length > 0
                ? assignedTAListForRoom.map((ta) => ({
                    id: ta.id,
                    name: ta.name,
                    department: ta.department,
                    priority: ta.priority,
                  }))
                : undefined,
              coursesConducted: coursesConductedList,
              benches,
            })
          }
        }

        const assignedFacultyList: ScheduledSlot['assignedFaculty'] = []
        roomAllocations.forEach((r) => {
          const list = r.invigilators && r.invigilators.length > 0
            ? r.invigilators
            : r.invigilator ? [r.invigilator] : []
          list.forEach((f) => {
            assignedFacultyList.push({
              teacherId: f.id,
              teacherName: f.name,
              department: f.department,
              priority: f.priority,
              roomId: r.roomId,
              roomName: r.roomName,
            })
          })
        })

        const assignedTAList: ScheduledSlot['assignedTAs'] = []
        roomAllocations.forEach((r) => {
          (r.teachingAssistants || []).forEach((ta) => {
            assignedTAList.push({
              taId: ta.id,
              taName: ta.name,
              priority: ta.priority,
              roomId: r.roomId,
              roomName: r.roomName,
            })
          })
        })

        scheduledSlots.push({
          slotId: `quiz_slot_d${dayNumber}_${plan.year.replace(/\s+/g, '_')}_slot${slotIdx + 1}`,
          dayNumber,
          date: plan.dateFormatted,
          slotLabel: `${plan.year} · ${slotLabel}`,
          timeRange,
          examType: 'quiz',
          scheduledCourses: coursesInSlot.map((course) => {
            const enrolled = courseEnrollments.get(course.code) || []
            return {
              code: course.code,
              name: course.name,
              year: course.year,
              semester: course.semester,
              type: 'lab_quiz',
              durationMinutes: slotDuration,
              studentCount: enrolled.length,
              sections: Array.from(
                new Set(
                  enrolled
                    .map((s) => normalizeSectionLabel(s.batch))
                    .filter((sec): sec is string => Boolean(sec))
                )
              ),
            }
          }),
          roomAllocations,
          assignedFaculty: assignedFacultyList,
          assignedTAs: assignedTAList,
        })
      })

      currentAvailableMinutes = currentSlotTimeMinutes
    })
  })

  const totalExamsScheduled = targetCourses.length
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

  const taDutyDistribution = (teachingAssistants || []).map((ta) => ({
    taId: ta.id,
    taName: ta.name,
    department: ta.department,
    priority: ta.priority,
    dutiesCount: taDutyCounts.get(ta.id) || 0,
    maxDuties: ta.maxDuties,
    assignedSlotSummaries: taDutyLogs.get(ta.id) || [],
  }))

  return {
    config,
    slots: scheduledSlots,
    totalExamsScheduled,
    totalStudentsSeated,
    totalRoomsUtilized,
    facultyDutyDistribution,
    taDutyDistribution,
    priorityDispersionScore: 100,
    constraintViolations,
    unscheduledCourses: [],
    generatedAt: new Date().toISOString(),
  }
}
