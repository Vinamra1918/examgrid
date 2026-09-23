import { Student, AcademicYear } from './types'

export interface RawStudentTemplate {
  rollNo: string
  name: string
  section: string // 'A1' | 'A2' | 'B1' | 'B2'
}

export const rawStudentsTemplate: RawStudentTemplate[] = [
  { rollNo: '0801CS211085', name: 'Sneha Mandloi', section: 'A1' },
  { rollNo: '0801CS221031', name: 'ANUJAY SAH', section: 'A1' },
  { rollNo: '0801CS221033', name: 'ARCHANA UIKEY', section: 'A1' },
  { rollNo: '0801CS221061', name: 'HARIOM RATHORE', section: 'A1' },
  { rollNo: '0801CS221091', name: 'Mithilesh Uikey', section: 'A1' },
  { rollNo: '0801CS221097', name: 'NAVIN YOUNATI', section: 'A1' },
  { rollNo: '0801CS221106', name: 'PARTH PODDAR', section: 'A1' },
  { rollNo: '0801CS231001', name: 'AAYUSH BABEL', section: 'A1' },
  { rollNo: '0801CS231002', name: 'AAYUSH MANDLOI', section: 'A1' },
  { rollNo: '0801CS231003', name: 'AAYUSHI VERMA', section: 'A1' },
  { rollNo: '0801CS231004', name: 'Abeer Sharma', section: 'A1' },
  { rollNo: '0801CS231005', name: 'ABHAY RANDA', section: 'A1' },
  { rollNo: '0801CS231006', name: 'ABHISHEK LIMODIYA', section: 'A1' },
  { rollNo: '0801CS231007', name: 'ABHISHEK MEHTA', section: 'A1' },
  { rollNo: '0801CS231008', name: 'ADARSH DWIVEDI', section: 'A1' },
  { rollNo: '0801CS231009', name: 'ADITYA SALVE', section: 'A1' },
  { rollNo: '0801CS231010', name: 'ADITYA SAXENA', section: 'A1' },
  { rollNo: '0801CS231011', name: 'ADITYA TARE', section: 'A1' },
  { rollNo: '0801CS231012', name: 'AKSHAR PATIDAR', section: 'A1' },
  { rollNo: '0801CS231013', name: 'AKSHAT JAIN', section: 'A1' },
  { rollNo: '0801CS231014', name: 'AKSHAT PANDEY', section: 'A1' },
  { rollNo: '0801CS231015', name: 'Akshay Dawar', section: 'A1' },
  { rollNo: '0801CS231016', name: 'ALI ASGAR ATTAR', section: 'A1' },
  { rollNo: '0801CS231017', name: 'ALOK AHIRWAR', section: 'A1' },
  { rollNo: '0801CS231018', name: 'AMAN PRAJAPATI', section: 'A1' },
  { rollNo: '0801CS231020', name: 'AMRIT JAISWAR', section: 'A1' },
  { rollNo: '0801CS231022', name: 'ANIKET SINGH', section: 'A1' },
  { rollNo: '0801CS231023', name: 'ANIL', section: 'A1' },
  { rollNo: '0801CS231024', name: 'ANIRUDDH PYASI', section: 'A1' },
  { rollNo: '0801CS231026', name: 'ANUJ BILLIORE', section: 'A1' },
  { rollNo: '0801CS231027', name: 'ANUSHKA PARIHAR', section: 'A1' },
  { rollNo: '0801CS231028', name: 'APARNA BHARGAVA', section: 'A1' },
  { rollNo: '0801CS231029', name: 'ARPITA JAIN', section: 'A1' },
  { rollNo: '0801CS231030', name: 'ARUNESH GEDA', section: 'A1' },
  { rollNo: '0801CS231031', name: 'ARYAN AGRAWAL', section: 'A1' },
  { rollNo: '0801CS231032', name: 'ASHISH ARMO', section: 'A1' },
  { rollNo: '0801CS231033', name: 'ASHU MITTAL', section: 'A1' },
  { rollNo: '0801CS231035', name: 'ASTITVA BANDIL', section: 'A1' },
  { rollNo: '0801CS231036', name: 'AYUSHI KANOJE', section: 'A1' },
  { rollNo: '0801CS231038', name: 'BISHAL DAS', section: 'A1' },
  { rollNo: '0801CS231039', name: 'CHETAN KHAIRNAR', section: 'A1' },
  { rollNo: '0801CS231040', name: 'DESHNA SANGHVI', section: 'A2' },
  { rollNo: '0801CS231041', name: 'DEVRAT SHARMA', section: 'A2' },
  { rollNo: '0801CS231042', name: 'DHRUV PATIDAR', section: 'A2' },
  { rollNo: '0801CS231043', name: 'DINESH KUMAR SINGH', section: 'A2' },
  { rollNo: '0801CS231044', name: 'DIYA MOHE', section: 'A2' },
  { rollNo: '0801CS231045', name: 'DURVA JAIN', section: 'A2' },
  { rollNo: '0801CS231046', name: 'GOUTAM RAJ DEORA', section: 'A2' },
  { rollNo: '0801CS231047', name: 'Hanshika Verma', section: 'A2' },
  { rollNo: '0801CS231048', name: 'HARSH SONKER', section: 'A2' },
  { rollNo: '0801CS231049', name: 'HARSHIT GOYAL', section: 'A2' },
  { rollNo: '0801CS231050', name: 'HARSHITA BALCHANDANI', section: 'A2' },
  { rollNo: '0801CS231051', name: 'HARSHITA PARTE', section: 'A2' },
  { rollNo: '0801CS231052', name: 'HARSHRAJ SINGH CHOUHAN', section: 'A2' },
  { rollNo: '0801CS231053', name: 'HARSHVARDHAN SALVE', section: 'A2' },
  { rollNo: '0801CS231054', name: 'ISHAN PATHAK', section: 'A2' },
  { rollNo: '0801CS231055', name: 'JATIN KUMAWAT', section: 'A2' },
  { rollNo: '0801CS231057', name: 'JAYANT PATIDAR', section: 'A2' },
  { rollNo: '0801CS231058', name: 'KANAK GUPTA', section: 'A2' },
  { rollNo: '0801CS231059', name: 'KANHA JHALANI', section: 'A2' },
  { rollNo: '0801CS231060', name: 'KANIKA VERMA', section: 'A2' },
  { rollNo: '0801CS231061', name: 'KANISHQ VERMA', section: 'A2' },
  { rollNo: '0801CS231062', name: 'KARTIK BOBDE', section: 'A2' },
  { rollNo: '0801CS231063', name: 'KAVYA JAIN', section: 'A2' },
  { rollNo: '0801CS231064', name: 'KHUSHI BANSAL', section: 'A2' },
  { rollNo: '0801CS231065', name: 'KRATIKA DALODIA', section: 'A2' },
  { rollNo: '0801CS231066', name: 'KRISHNA SONKER', section: 'A2' },
  { rollNo: '0801CS231067', name: 'KUNAL BUNKAR', section: 'A2' },
  { rollNo: '0801CS231068', name: 'KUNAL KOKOTE', section: 'A2' },
  { rollNo: '0801CS231069', name: 'KUSHAGRA AGRAWAL', section: 'A2' },
  { rollNo: '0801CS231070', name: 'LOKESH BHLALSE', section: 'A2' },
  { rollNo: '0801CS231071', name: 'MAHAK TYAGI', section: 'A2' },
  { rollNo: '0801CS231072', name: 'MAHENDRA MUZALDA', section: 'A2' },
  { rollNo: '0801CS231073', name: 'MANAN AJMERA', section: 'A2' },
  { rollNo: '0801CS231074', name: 'MANAN WAKODE', section: 'A2' },
  { rollNo: '0801CS231075', name: 'MANSI KUNDLE', section: 'A2' },
  { rollNo: '0801CS231076', name: 'MANU RAJ CHANDEL', section: 'A2' },
  { rollNo: '0801CS231077', name: 'MANVENDRA SINGH RAGHUVANSHI', section: 'A2' },
  { rollNo: '0801CS231078', name: 'MERLYN ANN MATHEW', section: 'A2' },
  { rollNo: '0801CS231079', name: 'MOHAMMED LAKHRAWALA', section: 'A2' },
  { rollNo: '0801CS233D10', name: 'SUSHANT BHOURJAR', section: 'A2' },
  { rollNo: '0801CS231081', name: 'Mohit Dangi', section: 'B1' },
  { rollNo: '0801CS231082', name: 'Mohit Rajput', section: 'B1' },
  { rollNo: '0801CS231083', name: 'Muskan Dohare', section: 'B1' },
  { rollNo: '0801CS231084', name: 'Nayan Mittal', section: 'B1' },
  { rollNo: '0801CS231085', name: 'Nayan Patidar', section: 'B1' },
  { rollNo: '0801CS231086', name: 'Nisarg Singh', section: 'B1' },
  { rollNo: '0801CS231087', name: 'Nishith Dubey', section: 'B1' },
  { rollNo: '0801CS231088', name: 'Nitya Pahwa', section: 'B1' },
  { rollNo: '0801CS231089', name: 'Ohil Shahi', section: 'B1' },
  { rollNo: '0801CS231090', name: 'Om Mehra', section: 'B1' },
  { rollNo: '0801CS231091', name: 'Om Prakash', section: 'B1' },
  { rollNo: '0801CS231093', name: 'Pari Chhajed', section: 'B1' },
  { rollNo: '0801CS231094', name: 'Parth Dubey', section: 'B1' },
  { rollNo: '0801CS231095', name: 'Parth Gupta', section: 'B1' },
  { rollNo: '0801CS231096', name: 'Parv Tiwari', section: 'B1' },
  { rollNo: '0801CS231097', name: 'Piyush Kodape', section: 'B1' },
  { rollNo: '0801CS231099', name: 'Pranjal Kanojiya', section: 'B1' },
  { rollNo: '0801CS231100', name: 'Prathmesh Sangale', section: 'B1' },
  { rollNo: '0801CS231102', name: 'Prince Kumar', section: 'B1' },
  { rollNo: '0801CS231103', name: 'Priyank Jain', section: 'B1' },
  { rollNo: '0801CS231104', name: 'Priyanshu Jain', section: 'B1' },
  { rollNo: '0801CS231106', name: 'Raj Singh', section: 'B1' },
  { rollNo: '0801CS231107', name: 'Rajkaran Gond', section: 'B1' },
  { rollNo: '0801CS231108', name: 'Rajshree Ranawat', section: 'B1' },
  { rollNo: '0801CS231109', name: 'Raksha Verma', section: 'B1' },
  { rollNo: '0801CS231111', name: 'Rimjhim Kesharwani', section: 'B1' },
  { rollNo: '0801CS231113', name: 'Rohit Sastia', section: 'B1' },
  { rollNo: '0801CS231114', name: 'Ruchika Kohad', section: 'B1' },
  { rollNo: '0801CS231115', name: 'Sachin Sharma', section: 'B1' },
  { rollNo: '0801CS231116', name: 'Sahaj Gupta', section: 'B1' },
  { rollNo: '0801CS231117', name: 'Saksham Vyalsa', section: 'B1' },
  { rollNo: '0801CS231118', name: 'Salil Gupta', section: 'B1' },
  { rollNo: '0801CS231119', name: 'Samarth Laddha', section: 'B1' },
  { rollNo: '0801CS231120', name: 'Sambhav Jain', section: 'B1' },
  { rollNo: '0801CS231122', name: 'Sanjeet Kumar', section: 'B1' },
  { rollNo: '0801CS231123', name: 'Sarthak Baraskar', section: 'B1' },
  { rollNo: '0801CS231125', name: 'Shami Dubey', section: 'B1' },
  { rollNo: '0801CS231126', name: 'Shantanu Shukla', section: 'B1' },
  { rollNo: '0801CS231128', name: 'Shashwat Trivedi', section: 'B1' },
  { rollNo: '0801CS231129', name: 'Shaurya Mishra', section: 'B1' },
  { rollNo: '0801CS231130', name: 'Shivam Gupta', section: 'B1' },
  { rollNo: '0801CS231131', name: 'Shubham Pandey', section: 'B1' },
  { rollNo: '0801CS231132', name: 'Shyam Patidar', section: 'B1' },
  { rollNo: '0801CS231134', name: 'Sneha Dodiyar', section: 'B2' },
  { rollNo: '0801CS231135', name: 'Sneha Pal', section: 'B2' },
  { rollNo: '0801CS231136', name: 'Sorabh Bhardwaj', section: 'B2' },
  { rollNo: '0801CS231137', name: 'Sourabh Vaskale', section: 'B2' },
  { rollNo: '0801CS231138', name: 'Suhani Biyala', section: 'B2' },
  { rollNo: '0801CS231142', name: 'Tanisha Jain', section: 'B2' },
  { rollNo: '0801CS231143', name: 'Tanishq Vishwakarma', section: 'B2' },
  { rollNo: '0801CS231144', name: 'Tarandeep Singh', section: 'B2' },
  { rollNo: '0801CS231145', name: 'Tarang Sharma', section: 'B2' },
  { rollNo: '0801CS231146', name: 'Tashvi Gangrade', section: 'B2' },
  { rollNo: '0801CS231147', name: 'Tilakraj Singh', section: 'B2' },
  { rollNo: '0801CS231151', name: 'Vaidic Paliwal', section: 'B2' },
  { rollNo: '0801CS231152', name: 'Vansh Agrawal', section: 'B2' },
  { rollNo: '0801CS231153', name: 'Vanshika Anand', section: 'B2' },
  { rollNo: '0801CS231154', name: 'Varun Panwar', section: 'B2' },
  { rollNo: '0801CS231155', name: 'Varun Porwal', section: 'B2' },
  { rollNo: '0801CS231156', name: 'Vedant Singh', section: 'B2' },
  { rollNo: '0801CS231157', name: 'Vikram', section: 'B2' },
  { rollNo: '0801CS231158', name: 'Vinamra Sharma', section: 'B2' },
  { rollNo: '0801CS231159', name: 'Vipra', section: 'B2' },
  { rollNo: '0801CS231161', name: 'Vishuddha Jatale', section: 'B2' },
  { rollNo: '0801CS231162', name: 'Vivek Kumar', section: 'B2' },
  { rollNo: '0801CS231164', name: 'Yashasvini Maraskole', section: 'B2' },
  { rollNo: '0801CS231165', name: 'Yatharth Urmaliya', section: 'B2' },
  { rollNo: '0801CS243D01', name: 'Ayushi Jaiswal', section: 'B2' },
  { rollNo: '0801CS243D04', name: 'Ansh Dubey', section: 'B2' },
  { rollNo: '0801CS243D05', name: 'Divya Parmar', section: 'B2' },
  { rollNo: '0801CS243D06', name: 'Harshita Pandey', section: 'B2' },
  { rollNo: '0801CS243D07', name: 'Lavaniya Jain', section: 'B2' },
  { rollNo: '0801CS243D08', name: 'Mohan Chouksey', section: 'B2' },
  { rollNo: '0801CS243D09', name: 'Mrignayni Chouhan', section: 'B2' },
  { rollNo: '0801CS243D10', name: 'Rimzhim Gupta', section: 'B2' },
  { rollNo: '0801CS243D11', name: 'Sonam Kol', section: 'B2' },
  { rollNo: '0801CS243D12', name: 'Sweta Ahirwar', section: 'B2' },
  { rollNo: '0801EE231080', name: 'Reshma Gond', section: 'B2' },
  { rollNo: '0801IT231129', name: 'Somil Vasvani', section: 'B2' },
  { rollNo: '0801ME231032', name: 'Bhumika Gothwal', section: 'B2' },
  { rollNo: '0801CS231150', name: 'Vaibhav Tore', section: 'B2' },
  { rollNo: '0801CS231127', name: 'Shardul Sonwane', section: 'B2' },
  { rollNo: '0801CS231148', name: 'Utsav Patidar', section: 'B2' },
  { rollNo: '0801CS231098', name: 'Poonam Chouhan', section: 'B2' },
  { rollNo: '0801CS221127', name: 'Shailendra Golsar', section: 'B2' },
]

// Semester 3 (2nd Year – Sem A Odd) Course Codes
const sem3Courses = ['MA-301', 'CS-301', 'CS-302', 'EC-301', 'HU-301', 'CS-301-LAB', 'CS-302-LAB', 'EC-301-LAB', 'CS-303-LAB', 'EC-302-LAB']
// Semester 4 (2nd Year – Sem B Even) Course Codes
const sem4Courses = ['CS-401', 'MA-401', 'CS-402', 'CS-403', 'EC-401', 'CS-402-LAB', 'CS-404-LAB', 'EC-401-LAB', 'CS-405-LAB', 'HU-401', 'MC-401', 'IN-401-LAB']

// Semester 5 (3rd Year – Sem A Odd) Course Codes
const sem5Courses = ['CS-501', 'CS-502', 'CS-503', 'CS-504', 'CS-503-LAB', 'CS-504-LAB', 'IN-501-LAB', 'HU-501', 'PR-501-LAB']
// Semester 6 (3rd Year – Sem B Even) Course Codes
const sem6Courses = ['CS-601', 'CS-602', 'CS-603', 'CS-604-E1', 'CS-601-LAB', 'CS-603-LAB', 'CS-602-LAB', 'CS-605-LAB', 'PR-601-LAB']

// Semester 7 (4th Year – Sem A Odd) Course Codes
const sem7Courses = ['CS-701-E2', 'CS-702-E3', 'CS-703-E4', 'CS-704-LAB', 'IN-701-LAB', 'PR-701-LAB']
// Semester 8 (4th Year – Sem B Even) Course Codes
const sem8Courses = ['CS-801-E5', 'CS-802-E6', 'IN-801-LAB', 'PR-801-LAB']

export function generateAllStudents(): Student[] {
  const result: Student[] = []

  // Helper to map roll numbers cleanly for a given year prefix without corrupting branch or lateral-entry codes
  // e.g. 0801CS231001 -> 0801CS251001 for 2nd year (2025 batch), 0801EE231080 -> 0801EE251080
  const transformRollNo = (rawRoll: string, targetYearDigits: string, itemIdx: number): string => {
    // Pattern: (prefix 0801 + branch + digits/D + roll sequence)
    // Match 0801 followed by 2 letters (CS, EE, IT, ME) followed by 2 admission digits (21/22/23/24)
    const match = rawRoll.match(/^(0801[A-Z]{2})(\d{2})(.*)$/)
    if (match) {
      let suffix = match[3]
      // Fix duplicate lateral entry / regular collisions in raw data by appending unique index if duplicate base
      // Specific duplicates in template: 0801CS233D10 vs 0801CS243D10 etc.
      // Or 0801CS221031 (item 11) & 0801CS231031 (item 44) -> when replacing with targetYearDigits they both become 0801CS251031.
      // To ensure strictly unique roll numbers across all students in cohort:
      const baseSequence = match[1] + targetYearDigits + suffix
      return baseSequence
    }
    return rawRoll
  }

  // Generate unique roll number cohort per academic year
  const generateCohort = (
    yearLabel: AcademicYear,
    yearPrefix: string,
    semA: string,
    semB: string,
    coursesA: string[],
    coursesB: string[],
    idPrefix: string
  ) => {
    const seenRolls = new Set<string>()

    rawStudentsTemplate.forEach((item, index) => {
      let rollNo = transformRollNo(item.rollNo, yearPrefix, index)

      // Handle duplicate roll numbers when mapping different year batches to same targetYearDigits
      if (seenRolls.has(rollNo)) {
        // Disambiguate with unique sequential offset or index padding
        const padSeq = String(index + 1).padStart(3, '0')
        const branchMatch = item.rollNo.match(/^(0801[A-Z]{2})/)
        const branchPrefix = branchMatch ? branchMatch[1] : '0801CS'
        rollNo = `${branchPrefix}${yearPrefix}9${padSeq.slice(-3)}`
      }
      seenRolls.add(rollNo)

      const isSemA = item.section.startsWith('A')
      const semester = isSemA ? semA : semB
      const courses = isSemA ? coursesA : coursesB

      result.push({
        id: `s_${idPrefix}_${index + 1}`,
        rollNo,
        name: item.name,
        year: yearLabel,
        semester,
        branch: 'CSE',
        enrolledCourseCodes: courses,
        included: true,
      })
    })
  }

  // 1. 2nd Year Students (Admission year 25)
  generateCohort(
    '2nd Year',
    '25',
    'Semester 3 (Sem A - Odd)',
    'Semester 4 (Sem B - Even)',
    sem3Courses,
    sem4Courses,
    '2nd'
  )

  // 2. 3rd Year Students (Admission year 24)
  generateCohort(
    '3rd Year',
    '24',
    'Semester 5 (Sem A - Odd)',
    'Semester 6 (Sem B - Even)',
    sem5Courses,
    sem6Courses,
    '3rd'
  )

  // 3. 4th Year Students (Admission year 23)
  generateCohort(
    '4th Year',
    '23',
    'Semester 7 (Sem A - Odd)',
    'Semester 8 (Sem B - Even)',
    sem7Courses,
    sem8Courses,
    '4th'
  )

  return result
}
