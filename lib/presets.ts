import {
  AcademicYear,
  Course,
  ExamSessionConfig,
  Room,
  Student,
  Teacher,
} from './types'

import { generateAllStudents } from './students-data'

// Generate full real student cohort for 2nd, 3rd, and 4th Year (Sections A & B)
export const defaultStudents: Student[] = generateAllStudents()

// Comprehensive CSE Subject Catalog (Semester 3 to Semester 8)
export const defaultCourses: Course[] = [
  // =========================================================================
  // Semester 3 (II Year – Semester 'A' / Odd)
  // =========================================================================
  { id: 'c301', code: 'MA-301', name: 'Mathematics-III (BSC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'Applied Mathematics', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c302', code: 'CS-301', name: 'Object Oriented Programming Systems (PCC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c303', code: 'CS-302', name: 'Computer Architecture (PCC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c304', code: 'EC-301', name: 'Microprocessors and Microcontrollers (ESC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'ECE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c305', code: 'HU-301', name: 'Economics for Engineers (HSMC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'Humanities', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c306', code: 'CS-301-LAB', name: 'Object Oriented Programming Lab (LC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c307', code: 'CS-302-LAB', name: 'Computer Architecture Lab (LC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c308', code: 'EC-301-LAB', name: 'Microprocessors and Microcontrollers Lab (ESC-LC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'ECE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c309', code: 'CS-303-LAB', name: 'Design Thinking Lab (LC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c310', code: 'EC-302-LAB', name: 'Electronics Workshop (ESC-LC)', year: '2nd Year', semester: 'Semester 3 (Sem A - Odd)', department: 'ECE', type: 'lab_quiz', durationMinutes: 60, included: true },

  // =========================================================================
  // Semester 4 (II Year – Semester 'B' / Even)
  // =========================================================================
  { id: 'c401', code: 'CS-401', name: 'Discrete Structures (PCC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c402', code: 'MA-401', name: 'Mathematics-IV (BSC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'Applied Mathematics', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c403', code: 'CS-402', name: 'Data Structures (PCC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c404', code: 'CS-403', name: 'Agile Software Methodology (PCC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c405', code: 'EC-401', name: 'Digital Communication (OEC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'ECE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c406', code: 'CS-402-LAB', name: 'Data Structures Lab (LC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c407', code: 'CS-404-LAB', name: 'Software Design Lab (LC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c408', code: 'EC-401-LAB', name: 'Digital Communication Lab (OEC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'ECE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c409', code: 'CS-405-LAB', name: 'Mobile Application Development Lab (LC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c410', code: 'HU-401', name: 'Values, Humanities and Professional Ethics (HSBC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'Humanities', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c411', code: 'MC-401', name: 'Constitution of India (MC)', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'Humanities', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c412', code: 'IN-401-LAB', name: 'Lab: Mandatory 2-Week Internship / Training Evaluation', year: '2nd Year', semester: 'Semester 4 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },

  // =========================================================================
  // Semester 5 (III Year – Semester 'A' / Odd)
  // =========================================================================
  { id: 'c501', code: 'CS-501', name: 'Theory of Computation', year: '3rd Year', semester: 'Semester 5 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c502', code: 'CS-502', name: 'Information Security', year: '3rd Year', semester: 'Semester 5 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c503', code: 'CS-503', name: 'Computer Networks', year: '3rd Year', semester: 'Semester 5 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c504', code: 'CS-504', name: 'Operating Systems', year: '3rd Year', semester: 'Semester 5 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c505', code: 'CS-503-LAB', name: 'Computer Networks Lab', year: '3rd Year', semester: 'Semester 5 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c506', code: 'CS-504-LAB', name: 'Operating Systems Lab', year: '3rd Year', semester: 'Semester 5 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c507', code: 'IN-501-LAB', name: 'Lab: Internship Evaluation - I', year: '3rd Year', semester: 'Semester 5 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c508', code: 'HU-501', name: 'Essence of Indian Knowledge Tradition', year: '3rd Year', semester: 'Semester 5 (Sem A - Odd)', department: 'Humanities', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c509', code: 'PR-501-LAB', name: 'Lab: Mini Project Evaluation', year: '3rd Year', semester: 'Semester 5 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },

  // =========================================================================
  // Semester 6 (III Year – Semester 'B' / Even)
  // =========================================================================
  { id: 'c601', code: 'CS-601', name: 'Machine Learning', year: '3rd Year', semester: 'Semester 6 (Sem B - Even)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c602', code: 'CS-602', name: 'Data Base Management Systems', year: '3rd Year', semester: 'Semester 6 (Sem B - Even)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c603', code: 'CS-603', name: 'Design and Analysis of Algorithms', year: '3rd Year', semester: 'Semester 6 (Sem B - Even)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c604', code: 'CS-604-E1', name: 'Elective-I: Data Science & Engineering / AI / Software Architecture', year: '3rd Year', semester: 'Semester 6 (Sem B - Even)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c605', code: 'CS-601-LAB', name: 'Machine Learning Lab', year: '3rd Year', semester: 'Semester 6 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c606', code: 'CS-603-LAB', name: 'Design and Analysis of Algorithms Lab', year: '3rd Year', semester: 'Semester 6 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c607', code: 'CS-602-LAB', name: 'Data Base Management Systems Lab', year: '3rd Year', semester: 'Semester 6 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c608', code: 'CS-605-LAB', name: 'Internet of Things Workshop', year: '3rd Year', semester: 'Semester 6 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c609', code: 'PR-601-LAB', name: 'Lab: Minor Project Evaluation', year: '3rd Year', semester: 'Semester 6 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },

  // =========================================================================
  // Semester 7 (IV Year – Semester VII / Sem A Odd)
  // =========================================================================
  { id: 'c701', code: 'CS-701-E2', name: 'Elective-II: Computational Intelligence / Adv Data Structures / Cloud Computing', year: '4th Year', semester: 'Semester 7 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c702', code: 'CS-702-E3', name: 'Elective-III: Deep Learning / Advanced Algorithms / Big Data / HCI', year: '4th Year', semester: 'Semester 7 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c703', code: 'CS-703-E4', name: 'Elective-IV: Reinforcement Learning / Advanced Databases / Cyber Security / NLP', year: '4th Year', semester: 'Semester 7 (Sem A - Odd)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c704', code: 'CS-704-LAB', name: 'Product Development & QA Workshop / System Operations Lab', year: '4th Year', semester: 'Semester 7 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c705', code: 'IN-701-LAB', name: 'Lab: Internship Evaluation-II', year: '4th Year', semester: 'Semester 7 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c706', code: 'PR-701-LAB', name: 'Lab: Major Project Phase-I (AB group) / Phase-II (BA group)', year: '4th Year', semester: 'Semester 7 (Sem A - Odd)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },

  // =========================================================================
  // Semester 8 (IV Year – Semester VIII / Sem B Even)
  // =========================================================================
  { id: 'c801', code: 'CS-801-E5', name: 'Elective-V: Bioinformatics / HPC / ML for Security / Game Design / DSP', year: '4th Year', semester: 'Semester 8 (Sem B - Even)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c802', code: 'CS-802-E6', name: 'Elective-VI: Advanced OS / Project Management / Image Processing / Blockchain', year: '4th Year', semester: 'Semester 8 (Sem B - Even)', department: 'CSE', type: 'theory', durationMinutes: 60, included: true },
  { id: 'c803', code: 'IN-801-LAB', name: 'Lab: Internship Evaluation-III', year: '4th Year', semester: 'Semester 8 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
  { id: 'c804', code: 'PR-801-LAB', name: 'Lab: Major Project Phase-II (AB group) / Phase-I (BA group)', year: '4th Year', semester: 'Semester 8 (Sem B - Even)', department: 'CSE', type: 'lab_quiz', durationMinutes: 60, included: true },
]

// Rooms & Laboratories with exact Bench / Workstation capacity
export const defaultRooms: Room[] = [
  // =========================================================================
  // Lecture Theatres & Classrooms
  // =========================================================================
  {
    id: 'r_lt102',
    name: 'LT-102',
    code: 'LT-102',
    type: 'hall',
    building: 'Main Academic Block',
    totalBenches: 60, // 60 benches * 2 seats = 120 seats
    benchCapacity: 2,
    rows: 5,
    columns: 12,
    invigilatorsRequired: 2,
    allowSameCourseOnBench: false,
    included: true,
  },
  {
    id: 'r_lt002',
    name: 'LT-002',
    code: 'LT-002',
    type: 'hall',
    building: 'Main Academic Block',
    totalBenches: 60, // 60 benches * 2 seats = 120 seats
    benchCapacity: 2,
    rows: 5,
    columns: 12,
    invigilatorsRequired: 2,
    allowSameCourseOnBench: false,
    included: true,
  },
  {
    id: 'r_212',
    name: 'Room 212',
    code: '212',
    type: 'classroom',
    building: 'Main Academic Block',
    totalBenches: 30, // 30 benches * 3 seats = 90 seats
    benchCapacity: 3,
    rows: 3,
    columns: 10,
    invigilatorsRequired: 2,
    allowSameCourseOnBench: false,
    included: true,
  },
  {
    id: 'r_tutorial',
    name: 'Tutorial Room',
    code: 'TR-101',
    type: 'classroom',
    building: 'Main Academic Block',
    totalBenches: 20, // 4 rows * 5 benches = 20 benches (3-seater = 60 seats)
    benchCapacity: 3,
    rows: 4,
    columns: 5,
    invigilatorsRequired: 1,
    allowSameCourseOnBench: false,
    included: true,
  },

  // =========================================================================
  // Computer & Specialized Laboratories (Individual Workstation Seats)
  // =========================================================================
  {
    id: 'lab_gcl',
    name: 'GCL (Graphics & Computing Lab)',
    code: 'GCL',
    type: 'lab',
    building: 'Computer Center',
    totalBenches: 60, // 60 individual workstations (1 seat per bench)
    benchCapacity: 1,
    rows: 6,
    columns: 10,
    invigilatorsRequired: 1,
    allowSameCourseOnBench: true,
    included: true,
  },
  {
    id: 'lab_cndc',
    name: 'CNDC (Computer Network & Distributed Computing Lab)',
    code: 'CNDC',
    type: 'lab',
    building: 'Computer Center',
    totalBenches: 30, // 30 individual workstations (1 seat per bench)
    benchCapacity: 1,
    rows: 5,
    columns: 6,
    invigilatorsRequired: 1,
    allowSameCourseOnBench: true,
    included: true,
  },
  {
    id: 'lab_pg',
    name: 'PG Lab',
    code: 'PG',
    type: 'lab',
    building: 'Computer Center',
    totalBenches: 30, // 30 individual workstations (1 seat per bench)
    benchCapacity: 1,
    rows: 5,
    columns: 6,
    invigilatorsRequired: 1,
    allowSameCourseOnBench: true,
    included: true,
  },
  {
    id: 'lab_ai',
    name: 'AI Lab',
    code: 'AI',
    type: 'lab',
    building: 'Computer Center',
    totalBenches: 30, // 30 individual workstations (1 seat per bench)
    benchCapacity: 1,
    rows: 5,
    columns: 6,
    invigilatorsRequired: 1,
    allowSameCourseOnBench: true,
    included: true,
  },
  {
    id: 'lab_cluster',
    name: 'Cluster Lab',
    code: 'CLUSTER',
    type: 'lab',
    building: 'Computer Center',
    totalBenches: 30, // 30 individual workstations (1 seat per bench)
    benchCapacity: 1,
    rows: 5,
    columns: 6,
    invigilatorsRequired: 1,
    allowSameCourseOnBench: true,
    included: true,
  },
  {
    id: 'lab_hardware',
    name: 'Hardware Lab',
    code: 'HARDWARE',
    type: 'lab',
    building: 'Computer Center',
    totalBenches: 30, // 30 individual workstations (1 seat per bench)
    benchCapacity: 1,
    rows: 5,
    columns: 6,
    invigilatorsRequired: 1,
    allowSameCourseOnBench: true,
    included: true,
  },
]

// Faculty / Invigilators with Priority Ranks (Complete 25 Department Faculty Roster)
export const defaultTeachers: Teacher[] = [
  // Professors & Leadership (Priority 1: Senior Leadership)
  { id: 't1', name: 'Dr. Urjita Thakar', designation: 'Professor & Head', department: 'CSE', priority: 1, maxDuties: 4, included: true },
  { id: 't2', name: 'Dr. D. A. Mehta', designation: 'Professor', department: 'CSE', priority: 1, maxDuties: 4, included: true },
  { id: 't3', name: 'Prof. Vandan Tewari', designation: 'Professor', department: 'CSE', priority: 1, maxDuties: 4, included: true },
  { id: 't4', name: 'Dr. Anuradha Purohit', designation: 'Professor', department: 'CSE', priority: 1, maxDuties: 4, included: true },

  // Associate Professors / Senior Faculty (Priority 2: Senior Faculty)
  { id: 't5', name: 'Mr. Surendra Gupta', designation: 'Associate Professor', department: 'CSE', priority: 2, maxDuties: 6, included: true },
  { id: 't6', name: 'Mr. Rajesh Dhakad', designation: 'Associate Professor', department: 'CSE', priority: 2, maxDuties: 6, included: true },

  // Assistant Professors & Faculty Members (Priority 3: Assistant Professors)
  { id: 't7', name: 'Dr. Barkha Sahu', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't8', name: 'Mr. Chandresh Tatawat', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't9', name: 'Mr. Ranjeet Vishwakarma', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't10', name: 'Ms. Ashwini Pahade', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't11', name: 'Ms. Ashwini Sharma', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't12', name: 'Ms. Chetali Neema', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't13', name: 'Ms. Diksha Tatawat', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't14', name: 'Ms. Himani Mishra', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't15', name: 'Ms. Jyoti Chouhan', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't16', name: 'Ms. Kavita Mulchandani', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't17', name: 'Ms. Labdhi Jain', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't18', name: 'Ms. Mamta Gupta', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't19', name: 'Ms. Meghna Chandel', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't20', name: 'Ms. Neha Mehra', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't21', name: 'Ms. Priyanka Bamne', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't22', name: 'Ms. Ritambhara Patidar', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't23', name: 'Ms. Shrena Tiwari', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't24', name: 'Ms. Swati Mishra', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
  { id: 't25', name: 'Ms. Teena Dubey', designation: 'Assistant Professor', department: 'CSE', priority: 3, maxDuties: 6, included: true },
]

// Default Preset Configurations for MST and Quiz Exam Types
export const defaultExamConfigs: Record<'mst' | 'quiz', ExamSessionConfig> = {
  mst: {
    id: 'cfg_mst_2025',
    title: 'Mid-Semester Test (MST) - Spring 2025',
    examType: 'mst',
    startDate: '2025-05-12',
    endDate: '2025-05-16',
    holidays: ['2025-05-14'],
    totalDays: 4,
    theoryDurationMinutes: 60, // MST Theory Exams are 60 mins (1 Hour)
    labDurationMinutes: 60, // Lab Quizzes are 60 mins
    slotsPerDay: [
      { id: 'slot1', label: 'Slot 1 (Morning Shift)', startTime: '09:30', endTime: '10:30' },
      { id: 'slot2', label: 'Slot 2 (Afternoon Shift)', startTime: '14:00', endTime: '15:00' },
    ],
    seatingMode: 'interleave_two_exams',
    allowTwoExamsInOneRoom: true,
  },
  quiz: {
    id: 'cfg_quiz_2025',
    title: 'Department Practical & Lab Evaluations',
    examType: 'quiz',
    startDate: '2025-05-20',
    endDate: '2025-05-22',
    holidays: [],
    totalDays: 3,
    theoryDurationMinutes: 60,
    labDurationMinutes: 60,
    slotsPerDay: [
      { id: 'slot1', label: 'Slot 1 (Batch 1)', startTime: '09:00', endTime: '10:00' },
      { id: 'slot2', label: 'Slot 2 (Batch 2)', startTime: '11:00', endTime: '12:00' },
      { id: 'slot3', label: 'Slot 3 (Batch 3)', startTime: '14:00', endTime: '15:00' },
    ],
    seatingMode: 'single_exam_per_bench',
    allowTwoExamsInOneRoom: false,
  },
}
