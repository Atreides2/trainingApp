export interface Exercise {
  id: string;
  name: string;
  notes: string | null;
  is_bodyweight: boolean;
}

export interface TrainingDay {
  id: string;
  name: string;
  sort_order: number;
}

export interface DayExercise {
  id: string;
  training_day_id: string;
  exercise_id: string;
  sort_order: number;
  planned_sets: number;
  planned_reps: number;
  planned_weight: number;
  exercise: Exercise;
}

export interface WorkoutSession {
  id: string;
  training_day_id: string;
  date: string;
  status: 'active' | 'done' | 'cancelled';
  completed_at: string | null;
  training_day?: TrainingDay;
}

export interface SessionSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  planned_reps: number;
  planned_weight: number;
  actual_reps: number | null;
  actual_weight: number | null;
  completed: boolean;
  is_planned: boolean;
}

export interface SessionExercise {
  exercise_id: string;
  exercise_name: string;
  is_bodyweight: boolean;
  sets: SessionSet[];
}

export interface VolumeDataPoint {
  date: string;
  total_volume: number;
  session_id: string;
}

export interface MuscleGroup {
  id: string;
  name: string;
  slug: string;
}

export interface ExerciseWithMuscles extends Exercise {
  primary_muscles: MuscleGroup[];
  secondary_muscles: MuscleGroup[];
}

export interface SimilarExercise extends ExerciseWithMuscles {
  similarity_score: number;
}

export interface RecentSessionSet {
  id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  completed: boolean;
  workout_sessions: { date: string } | null;
}
