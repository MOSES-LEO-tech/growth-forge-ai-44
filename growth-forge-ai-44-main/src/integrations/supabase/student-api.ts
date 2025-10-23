import { supabase } from './client';

export type StudentCounts = {
  total_students: number;
  active_students: number;
  inactive_students: number;
};

/**
 * Get the total count of students in the system
 */
export async function getStudentCounts(): Promise<StudentCounts> {
  const { data, error } = await supabase
    .from('student_counts')
    .select('*')
    .single();
  
  if (error) {
    console.error('Error fetching student counts:', error);
    return { total_students: 0, active_students: 0, inactive_students: 0 };
  }
  
  return data as StudentCounts;
}

/**
 * Create a new student record
 */
export async function createStudent(studentData: {
  id: string;
  profile_id?: string;
  grade_level?: string;
  school_name?: string;
  graduation_year?: number;
  major_interest?: string;
}) {
  const { data, error } = await supabase
    .from('students')
    .insert(studentData)
    .select()
    .single();
    
  if (error) {
    console.error('Error creating student:', error);
    throw error;
  }
  
  return data;
}

/**
 * Update a student record
 */
export async function updateStudent(
  id: string,
  updates: {
    grade_level?: string;
    school_name?: string;
    graduation_year?: number;
    major_interest?: string;
    is_active?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating student:', error);
    throw error;
  }
  
  return data;
}