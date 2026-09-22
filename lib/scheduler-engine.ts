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
  const targetCourses = activeCoursesPool.filter((c) => {
    if (config.examType === 'quiz') {
      // Quiz mode generates strictly Lab Quizzes / Lab Evaluations
      return (
        c.type === 'lab_quiz' ||
        c.name.toLowerCase().includes('lab') ||
        c.code.toLowerCase().includes('lab')
      )
    }
    // MST mode generates strictly Theory Mid-Semester Tests (excluding labs)
    return (
      c.type === 'theory' &&
      !c.name.toLowerCase().includes('lab') &&
      !c.code.toLowerCase().includes('lab')
    )
  })

  // Calculate student enrollment lists for each course
  const courseEnrollments = new Map<string, Student[]>()
  targetCourses.forEach((c) => {
    const enrolled = activeStudentsPool.filter((s) => s.enrolledCourseCodes.includes(c.code))
    // Sort students deterministically by roll number
    enrolled.sort((a, b) => a.rollNo.localeCompare(b.rollNo))
    courseEnrollments.set(c.code, enrolled)
  })

  // 2. Select compatible rooms based on exam type
  const activeRooms = activeRoomsPool.filter((r) => {
    if (config.examType === 'quiz') {
      return r.type === 'lab'
    }
    return r.type === 'hall' || r.type === 'classroom'
  })

  // If no specific lab rooms found for quiz, use classrooms
  const usableRooms = activeRooms.length > 0 ? activeRooms : activeRoomsPool

  // 3. Compute active exam dates between startDate and endDate, excluding holidays and Sundays
  const holidaysSet = new Set(config.holidays || [])
  const examDates: { dayNumber: number; dateStr: string; dateObj: Date }[] = []

  const startD = new Date(config.startDate || '2025-05-12')
  const endD = new Date(config.endDate || config.startDate || '2025-05-16')

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

  const scheduledSlots: ScheduledSlot[] = []

  // Group courses by Year and sort each year cohort by priority (lower number = higher priority)
  // When priorities are equal, randomize order
  const coursesByYear = new Map<AcademicYear, Course[]>()
  const yearsList: AcademicYear[] = ['1st Year', '2nd Year', '3rd Year', '4th Year']
  yearsList.forEach((y) => coursesByYear.set(y, []))
  targetCourses.forEach((c) => {
    const list = coursesByYear.get(c.year) || []
    list.push(c)
    coursesByYear.set(c.year, list)
  })

  // Queue of courses remaining to be scheduled, sorted by priority + random tie breaker
  const remainingCourseQueues = new Map<AcademicYear, Course[]>()
  yearsList.forEach((y) => {
    const yearCourses = [...(coursesByYear.get(y) || [])]
    yearCourses.sort((a, b) => {
      const prioA = a.priority !== undefined && a.priority !== null ? a.priority : 999
      const prioB = b.priority !== undefined && b.priority !== null ? b.priority : 999
      if (prioA !== prioB) {
        return prioA - prioB // Higher priority (1, 2, 3...) first
      }
      return Math.random() - 0.5 // Random order if priority is same
    })
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
  // STEP 1: PRE-SCHEDULE BOUND COURSES
  // Search across all days to find the day and slot pair with the MINIMUM time difference
  // -------------------------------------------------------------------------
  for (const year of yearsList) {
    const q = remainingCourseQueues.get(year) || []
    if (q.length === 0) continue

    let idx = 0
    while (idx < q.length) {
      const courseA = q[idx]
      const bNum = courseA.bindingGroup
      let boundIdx = -1

      if (bNum !== undefined && bNum !== null && bNum > 0) {
        boundIdx = q.findIndex(
          (c, i) =>
            i > idx &&
            c.bindingGroup === bNum &&
            (c.semester === courseA.semester || !c.semester || !courseA.semester)
        )
      } else if (courseA.pairedWithCourseCode) {
        boundIdx = q.findIndex((c, i) => i > idx && c.code === courseA.pairedWithCourseCode)
      }

      if (boundIdx > idx) {
        const c1 = q.splice(idx, 1)[0]
        const c2 = q.splice(boundIdx - 1, 1)[0] // adjusted for previous splice

        // Find the BEST day across the entire session that has 2 available slots with MINIMUM time difference
        let bestDay = -1
        let bestSlotA = -1
        let bestSlotB = -1
        let minGapAcrossSession = Infinity

        for (const dateItem of examDates) {
          const dNum = dateItem.dayNumber
          const daySlots = (config.daySpecificSlots && config.daySpecificSlots[dNum]) || config.slotsPerDay || []
          const dayGrid = timetableGrid.get(dNum)!

          // Find empty or non-conflicting slots for this cohort on this day
          for (let sA = 0; sA < daySlots.length; sA++) {
            for (let sB = sA + 1; sB < daySlots.length; sB++) {
              const coursesInSA = dayGrid.get(sA) || []
              const coursesInSB = dayGrid.get(sB) || []

              // Ensure cohort does not already have an exam in sA or sB
              const hasConflictA = coursesInSA.some((c) => c.year === year)
              const hasConflictB = coursesInSB.some((c) => c.year === year)

              if (!hasConflictA && !hasConflictB) {
                const timeA = daySlots[sA].startTime || '09:30'
                const timeB = daySlots[sB].startTime || '14:00'
                const [hA, mA] = timeA.split(':').map(Number)
                const [hB, mB] = timeB.split(':').map(Number)
                const gapMins = (hB * 60 + mB) - (hA * 60 + mA)

                if (gapMins >= 0 && gapMins < minGapAcrossSession) {
                  minGapAcrossSession = gapMins
                  bestDay = dNum
                  bestSlotA = sA
                  bestSlotB = sB
                }
              }
            }
          }
        }

        if (bestDay !== -1 && bestSlotA !== -1 && bestSlotB !== -1) {
          timetableGrid.get(bestDay)!.get(bestSlotA)!.push(c1)
          timetableGrid.get(bestDay)!.get(bestSlotB)!.push(c2)
        } else {
          // If no day had 2 free slots, put them back into regular priority queue
          q.unshift(c2)
          q.unshift(c1)
          idx++
        }
      } else {
        idx++
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 2: FILL REGULAR COURSES ROUND-ROBIN
  // PASS 1: Fill Slot 1 (Shift 0) for Day 1, Day 2, Day 3, ... Day N
  // PASS 2: Return to Day 1, Day 2, ... and Fill Slot 2 (Shift 1)
  // PASS 3: Fill Slot 3, etc.
  // -------------------------------------------------------------------------
  // Determine max slots on any day
  let maxSlotsInSession = 1
  examDates.forEach((d) => {
    const daySlots = (config.daySpecificSlots && config.daySpecificSlots[d.dayNumber]) || config.slotsPerDay || []
    if (daySlots.length > maxSlotsInSession) {
      maxSlotsInSession = daySlots.length
    }
  })

  for (let sIdx = 0; sIdx < maxSlotsInSession; sIdx++) {
    for (const dateItem of examDates) {
      const dNum = dateItem.dayNumber
      const daySlots = (config.daySpecificSlots && config.daySpecificSlots[dNum]) || config.slotsPerDay || []
      if (sIdx >= daySlots.length) continue // this day doesn't have this slot index

      const dayGrid = timetableGrid.get(dNum)!
      const currentCoursesInSlot = dayGrid.get(sIdx) || []

      // Strict Rule: At any one time, ONE SEMESTER can only have AT MOST ONE exam scheduled.
      // Different semesters of the same year (e.g. 2nd Year Sem 3 & Sem 4, or Section A & Section B) CAN run at the same time.
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

          if (!sameSemesterConflict) {
            // No semester conflict: Section A & Section B or different semesters can run simultaneously
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

      // Calculate slot time range
      const maxCourseDuration = Math.max(
        ...slotCourses.map(
          (c) =>
            c.durationMinutes ||
            (c.type === 'lab_quiz'
              ? config.labDurationMinutes || 60
              : config.theoryDurationMinutes || 60)
        ),
        60
      )

      let computedEndTime = slotConfig.endTime
      if (!computedEndTime && slotConfig.startTime) {
        const [h, m] = slotConfig.startTime.split(':').map((v) => parseInt(v, 10))
        const endTotalMins = (h || 9) * 60 + (m || 0) + maxCourseDuration
        const endH = String(Math.floor(endTotalMins / 60) % 24).padStart(2, '0')
        const endM = String(endTotalMins % 60).padStart(2, '0')
        computedEndTime = `${endH}:${endM}`
      }

      scheduledSlots.push({
        slotId: `slot_${day}_${sIdx + 1}`,
        dayNumber: day,
        date: formattedDate,
        slotLabel: slotConfig.label,
        timeRange: `${slotConfig.startTime} – ${computedEndTime || '10:30'}`,
        examType: config.examType,
        scheduledCourses: slotCourses.map((c) => {
          const duration =
            c.durationMinutes ||
            (c.type === 'lab_quiz'
              ? config.labDurationMinutes || 60
              : config.theoryDurationMinutes || 60)
          return {
            code: c.code,
            name: c.name,
            year: c.year,
            semester: c.semester,
            type: c.type,
            durationMinutes: duration,
            studentCount: (courseEnrollments.get(c.code) || []).length,
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
    generatedAt: new Date().toISOString(),
  }
}
