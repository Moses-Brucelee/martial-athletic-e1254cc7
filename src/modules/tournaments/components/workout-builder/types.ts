export interface LocalMovement {
  id: string;
  movement_name: string;
  reps: string;
  weight: string;
  unit: string;
  distance: string;
  calories: string;
  height: string;
  description: string;
  video_url: string;
}

export interface LocalWorkout {
  name: string;
  description: string;
  workout_type: string;
  time_cap_seconds: string;
  scoring_type: string;
  movements: LocalMovement[];
}

export const WORKOUT_FORMATS = [
  { value: "amrap", label: "AMRAP", desc: "As Many Reps As Possible" },
  { value: "for_time", label: "For Time", desc: "Complete work as fast as possible" },
  { value: "max_load", label: "Max Load", desc: "Heaviest weight lifted" },
  { value: "emom", label: "EMOM", desc: "Every Minute On the Minute" },
  { value: "interval", label: "Interval", desc: "Timed work/rest intervals" },
  { value: "chipper", label: "Chipper", desc: "Work through movements in order" },
  { value: "ladder", label: "Ladder", desc: "Ascending or descending scheme" },
  { value: "rounds", label: "Rounds", desc: "Fixed number of rounds" },
  { value: "descending", label: "Descending", desc: "Decreasing rep scheme" },
] as const;

export const SCORING_DEFAULTS: Record<string, string> = {
  amrap: "reps",
  for_time: "time",
  max_load: "load",
  emom: "reps",
  interval: "reps",
  chipper: "time",
  ladder: "reps",
  rounds: "reps",
  descending: "reps",
  custom: "points",
};

export const SCORING_LABELS: Record<string, { label: string; logic: string; tieBreak: string }> = {
  reps: { label: "Total Reps", logic: "Higher reps wins", tieBreak: "Time of last rep completed" },
  time: { label: "Completion Time", logic: "Lower time wins", tieBreak: "Reps completed if time-capped" },
  load: { label: "Max Weight", logic: "Heavier weight wins", tieBreak: "Who achieved weight first" },
  points: { label: "Points", logic: "Higher points wins", tieBreak: "Judge discretion" },
};

export const MOVEMENT_LIBRARY = [
  "Pull-ups", "Toes to Bar", "Wall Ball", "Thruster", "Snatch",
  "Clean & Jerk", "Deadlift", "Box Jump", "Double Unders", "Row",
  "Ski Erg", "Bike", "Burpees", "Muscle-ups", "Handstand Push-ups",
  "Pistol Squats", "Overhead Squat", "Front Squat", "Back Squat",
  "Power Clean", "Hang Clean", "Push Press", "Shoulder to Overhead",
  "Rope Climb", "Chest to Bar Pull-ups", "Ring Dips", "Kettlebell Swing",
  "Turkish Get-up", "Dumbbell Snatch", "Assault Bike", "Echo Bike",
  "Calorie Row", "Wall Walks", "Strict Press", "Bench Press",
];

export const WORKOUT_TEMPLATES: { name: string; workout_type: string; time_cap: string; movements: Omit<LocalMovement, "id">[] }[] = [
  {
    name: "Fran",
    workout_type: "for_time",
    time_cap: "",
    movements: [
      { movement_name: "Thruster", reps: "21", weight: "95", unit: "lb", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Pull-ups", reps: "21", weight: "", unit: "kg", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Thruster", reps: "15", weight: "95", unit: "lb", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Pull-ups", reps: "15", weight: "", unit: "kg", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Thruster", reps: "9", weight: "95", unit: "lb", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Pull-ups", reps: "9", weight: "", unit: "kg", distance: "", calories: "", height: "", description: "", video_url: "" },
    ],
  },
  {
    name: "Grace",
    workout_type: "for_time",
    time_cap: "",
    movements: [
      { movement_name: "Clean & Jerk", reps: "30", weight: "135", unit: "lb", distance: "", calories: "", height: "", description: "", video_url: "" },
    ],
  },
  {
    name: "Murph",
    workout_type: "for_time",
    time_cap: "",
    movements: [
      { movement_name: "Run", reps: "1", weight: "", unit: "m", distance: "1600", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Pull-ups", reps: "100", weight: "", unit: "kg", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Push-ups", reps: "200", weight: "", unit: "kg", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Air Squats", reps: "300", weight: "", unit: "kg", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Run", reps: "1", weight: "", unit: "m", distance: "1600", calories: "", height: "", description: "", video_url: "" },
    ],
  },
  {
    name: "DT",
    workout_type: "for_time",
    time_cap: "",
    movements: [
      { movement_name: "Deadlift", reps: "12", weight: "155", unit: "lb", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Hang Clean", reps: "9", weight: "155", unit: "lb", distance: "", calories: "", height: "", description: "", video_url: "" },
      { movement_name: "Push Press", reps: "6", weight: "155", unit: "lb", distance: "", calories: "", height: "", description: "", video_url: "" },
    ],
  },
  {
    name: "Fight Gone Bad",
    workout_type: "amrap",
    time_cap: "1020",
    movements: [
      { movement_name: "Wall Ball", reps: "1", weight: "20", unit: "lb", distance: "", calories: "", height: "", description: "1 min", video_url: "" },
      { movement_name: "Sumo Deadlift High Pull", reps: "1", weight: "75", unit: "lb", distance: "", calories: "", height: "", description: "1 min", video_url: "" },
      { movement_name: "Box Jump", reps: "1", weight: "", unit: "kg", distance: "", calories: "", height: "20", description: "1 min", video_url: "" },
      { movement_name: "Push Press", reps: "1", weight: "75", unit: "lb", distance: "", calories: "", height: "", description: "1 min", video_url: "" },
      { movement_name: "Row", reps: "1", weight: "", unit: "cal", distance: "", calories: "", height: "", description: "1 min", video_url: "" },
    ],
  },
];

let _movementIdCounter = 0;
export function generateMovementId(): string {
  return `mv_${Date.now()}_${++_movementIdCounter}`;
}

export function emptyMovement(): LocalMovement {
  return {
    id: generateMovementId(),
    movement_name: "",
    reps: "",
    weight: "",
    unit: "kg",
    distance: "",
    calories: "",
    height: "",
    description: "",
    video_url: "",
  };
}

export function emptyWorkout(): LocalWorkout {
  return {
    name: "",
    description: "",
    workout_type: "amrap",
    time_cap_seconds: "",
    scoring_type: "reps",
    movements: [emptyMovement()],
  };
}

export function needsTimeCap(type: string): boolean {
  return ["amrap", "for_time", "emom", "chipper", "interval", "descending"].includes(type);
}

export function calcRepsPerRound(movements: LocalMovement[]): number {
  return movements.reduce((sum, m) => sum + (parseInt(m.reps) || 0), 0);
}
