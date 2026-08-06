import { supabase } from "@/integrations/supabase/client";
import type {
  Program,
  ProgramTree,
  ProgramEnrollment,
  WorkoutSession,
  ExerciseResult,
  Movement,
  SessionDetail,
} from "./types";

const asAny = supabase as any;

// ── Library / templates ───────────────────────────────────────────

export async function listPrograms(opts: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Program[]> {
  let q = asAny
    .from("programs")
    .select("*")
    .eq("status", "published")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 12) - 1);

  if (opts.category && opts.category !== "all") q = q.eq("category", opts.category);
  if (opts.search) q = q.ilike("title", `%${opts.search}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Program[];
}

export async function fetchMyAuthoredPrograms(userId: string): Promise<Program[]> {
  const { data, error } = await asAny
    .from("programs")
    .select("*")
    .eq("created_by", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Program[];
}

export async function fetchProgramTree(programId: string): Promise<ProgramTree | null> {
  const { data: program, error } = await asAny
    .from("programs")
    .select("*")
    .eq("id", programId)
    .maybeSingle();
  if (error) throw error;
  if (!program) return null;

  const [weeks, days, workouts, sections, exercises] = await Promise.all([
    asAny.from("program_weeks").select("*").eq("program_id", programId).order("week_number"),
    asAny.from("program_days").select("*").eq("program_id", programId).order("day_number"),
    asAny.from("program_workouts").select("*").eq("program_id", programId).order("display_order"),
    asAny.from("workout_sections").select("*").eq("program_id", programId).order("display_order"),
    asAny.from("section_exercises").select("*").eq("program_id", programId).order("display_order"),
  ]);

  const exBySection = new Map<string, any[]>();
  for (const e of exercises.data ?? []) {
    if (!exBySection.has(e.section_id)) exBySection.set(e.section_id, []);
    exBySection.get(e.section_id)!.push(e);
  }
  const secByWorkout = new Map<string, any[]>();
  for (const s of sections.data ?? []) {
    const row = { ...s, exercises: exBySection.get(s.id) ?? [] };
    if (!secByWorkout.has(s.workout_id)) secByWorkout.set(s.workout_id, []);
    secByWorkout.get(s.workout_id)!.push(row);
  }
  const woByDay = new Map<string, any[]>();
  for (const w of workouts.data ?? []) {
    const row = { ...w, sections: secByWorkout.get(w.id) ?? [] };
    if (!woByDay.has(w.day_id)) woByDay.set(w.day_id, []);
    woByDay.get(w.day_id)!.push(row);
  }
  const dayByWeek = new Map<string, any[]>();
  for (const d of days.data ?? []) {
    const row = { ...d, workouts: woByDay.get(d.id) ?? [] };
    if (!dayByWeek.has(d.week_id)) dayByWeek.set(d.week_id, []);
    dayByWeek.get(d.week_id)!.push(row);
  }

  return {
    ...(program as Program),
    weeks: (weeks.data ?? []).map((w: any) => ({ ...w, days: dayByWeek.get(w.id) ?? [] })),
  } as ProgramTree;
}

/** Create a program shell and auto-generate its week/day skeleton. */
export async function createProgram(input: {
  userId: string;
  title: string;
  description?: string;
  category: string;
  level: string;
  weeks_count: number;
  days_per_week: number;
  gym_id?: string | null;
}): Promise<Program> {
  const { data, error } = await asAny
    .from("programs")
    .insert({
      created_by: input.userId,
      title: input.title,
      description: input.description || null,
      category: input.category,
      level: input.level,
      weeks_count: input.weeks_count,
      days_per_week: input.days_per_week,
      gym_id: input.gym_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const program = data as Program;

  const weekRows = Array.from({ length: input.weeks_count }, (_, i) => ({
    program_id: program.id,
    week_number: i + 1,
  }));
  const { data: weeks, error: wErr } = await asAny.from("program_weeks").insert(weekRows).select();
  if (wErr) throw wErr;

  const dayRows = (weeks ?? []).flatMap((w: any) =>
    Array.from({ length: input.days_per_week }, (_, i) => ({
      program_id: program.id,
      week_id: w.id,
      day_number: i + 1,
    })),
  );
  if (dayRows.length) {
    const { error: dErr } = await asAny.from("program_days").insert(dayRows);
    if (dErr) throw dErr;
  }

  return program;
}

export async function updateProgram(programId: string, updates: Partial<Program>) {
  const { error } = await asAny.from("programs").update(updates).eq("id", programId);
  if (error) throw error;
}

export async function deleteProgram(programId: string) {
  const { error } = await asAny.from("programs").delete().eq("id", programId);
  if (error) throw error;
}

/** Create a workout with its sections + exercises in one go. */
export async function createWorkout(input: {
  programId: string;
  dayId: string;
  name: string;
  description?: string;
  workout_format: string;
  format_config: Record<string, unknown>;
  sections: {
    name: string;
    section_type: string;
    exercises: {
      movement_name: string;
      movement_id?: string | null;
      sets?: number | null;
      reps?: number | null;
      duration_seconds?: number | null;
      distance?: number | null;
      load?: number | null;
      load_unit?: string | null;
      tempo?: string | null;
      rest_seconds?: number | null;
      notes?: string | null;
    }[];
  }[];
}) {
  const { data: workout, error } = await asAny
    .from("program_workouts")
    .insert({
      program_id: input.programId,
      day_id: input.dayId,
      name: input.name,
      description: input.description || null,
      workout_format: input.workout_format,
      format_config: input.format_config,
    })
    .select()
    .single();
  if (error) throw error;

  for (let si = 0; si < input.sections.length; si++) {
    const s = input.sections[si];
    const { data: section, error: sErr } = await asAny
      .from("workout_sections")
      .insert({
        program_id: input.programId,
        workout_id: workout.id,
        name: s.name,
        section_type: s.section_type,
        display_order: si,
      })
      .select()
      .single();
    if (sErr) throw sErr;

    const rows = s.exercises
      .filter((e) => e.movement_name.trim())
      .map((e, i) => ({
        program_id: input.programId,
        section_id: section.id,
        movement_id: e.movement_id ?? null,
        movement_name: e.movement_name,
        sets: e.sets ?? null,
        reps: e.reps ?? null,
        duration_seconds: e.duration_seconds ?? null,
        distance: e.distance ?? null,
        load: e.load ?? null,
        load_unit: e.load_unit ?? "kg",
        tempo: e.tempo ?? null,
        rest_seconds: e.rest_seconds ?? null,
        notes: e.notes ?? null,
        display_order: i,
      }));
    if (rows.length) {
      const { error: eErr } = await asAny.from("section_exercises").insert(rows);
      if (eErr) throw eErr;
    }
  }
  return workout;
}

export async function deleteWorkout(workoutId: string) {
  const { error } = await asAny.from("program_workouts").delete().eq("id", workoutId);
  if (error) throw error;
}

// ── Enrollments ───────────────────────────────────────────────────

export async function fetchEnrollments(userId: string) {
  const { data, error } = await asAny
    .from("program_enrollments")
    .select("*, program:programs(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (ProgramEnrollment & { program: Program | null })[];
}

export async function enrollInProgram(programId: string, userId: string, assignedBy?: string) {
  const { data, error } = await asAny
    .from("program_enrollments")
    .upsert(
      {
        program_id: programId,
        user_id: userId,
        assigned_by: assignedBy ?? null,
        source: assignedBy && assignedBy !== userId ? "coach" : "self",
      },
      { onConflict: "program_id,user_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as ProgramEnrollment;
}

export async function leaveProgram(enrollmentId: string) {
  const { error } = await asAny.from("program_enrollments").delete().eq("id", enrollmentId);
  if (error) throw error;
}

/** Coach view: everyone enrolled in a program the caller authored. */
export async function fetchProgramRoster(programId: string) {
  const { data, error } = await asAny
    .from("program_enrollments")
    .select("*")
    .eq("program_id", programId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as ProgramEnrollment[];
}

export async function fetchProgramSessions(programId: string) {
  const { data, error } = await asAny
    .from("workout_sessions")
    .select("*")
    .eq("program_id", programId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as WorkoutSession[];
}

// ── Sessions (execution records) ──────────────────────────────────

export async function fetchOpenSession(userId: string) {
  const { data, error } = await asAny
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as WorkoutSession | null;
}

export async function fetchRecentSessions(userId: string, limit = 20) {
  const { data, error } = await asAny
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkoutSession[];
}

export async function startSession(input: {
  userId: string;
  title: string;
  programId?: string | null;
  workoutId?: string | null;
  enrollmentId?: string | null;
}): Promise<WorkoutSession> {
  const { data, error } = await asAny
    .from("workout_sessions")
    .insert({
      user_id: input.userId,
      title: input.title,
      program_id: input.programId ?? null,
      workout_id: input.workoutId ?? null,
      enrollment_id: input.enrollmentId ?? null,
      status: "in_progress",
      started_at: new Date().toISOString(),
      scheduled_date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSession;
}

export async function fetchSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const { data: session, error } = await asAny
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;

  let workout: SessionDetail["workout"] = null;
  if (session.workout_id) {
    const { data: w } = await asAny
      .from("program_workouts")
      .select("*")
      .eq("id", session.workout_id)
      .maybeSingle();
    if (w) {
      const [{ data: sections }, { data: exercises }] = await Promise.all([
        asAny.from("workout_sections").select("*").eq("workout_id", w.id).order("display_order"),
        asAny
          .from("section_exercises")
          .select("*")
          .eq("program_id", w.program_id)
          .order("display_order"),
      ]);
      const sectionIds = new Set((sections ?? []).map((s: any) => s.id));
      const exBySection = new Map<string, any[]>();
      for (const e of exercises ?? []) {
        if (!sectionIds.has(e.section_id)) continue;
        if (!exBySection.has(e.section_id)) exBySection.set(e.section_id, []);
        exBySection.get(e.section_id)!.push(e);
      }
      workout = {
        ...w,
        sections: (sections ?? []).map((s: any) => ({ ...s, exercises: exBySection.get(s.id) ?? [] })),
      };
    }
  }

  const { data: results } = await asAny
    .from("exercise_results")
    .select("*")
    .eq("session_id", sessionId)
    .order("performed_at");

  return {
    session: session as WorkoutSession,
    workout,
    results: (results ?? []) as ExerciseResult[],
  };
}

export async function logExerciseResult(input: {
  sessionId: string;
  userId: string;
  exerciseId?: string | null;
  movementName: string;
  setNumber: number;
  reps?: number | null;
  load?: number | null;
  loadUnit?: string | null;
  timeSeconds?: number | null;
  distance?: number | null;
  skipped?: boolean;
  notes?: string | null;
}) {
  const { data, error } = await asAny
    .from("exercise_results")
    .insert({
      session_id: input.sessionId,
      user_id: input.userId,
      exercise_id: input.exerciseId ?? null,
      movement_name: input.movementName,
      set_number: input.setNumber,
      reps: input.reps ?? null,
      load: input.load ?? null,
      load_unit: input.loadUnit ?? "kg",
      time_seconds: input.timeSeconds ?? null,
      distance: input.distance ?? null,
      completed: !input.skipped,
      skipped: !!input.skipped,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ExerciseResult;
}

export async function updateSession(sessionId: string, updates: Partial<WorkoutSession>) {
  const { error } = await asAny.from("workout_sessions").update(updates).eq("id", sessionId);
  if (error) throw error;
}

export async function finishSession(sessionId: string, durationSeconds: number, notes?: string) {
  const { error } = await asAny
    .from("workout_sessions")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      notes: notes ?? null,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function deleteSession(sessionId: string) {
  const { error } = await asAny.from("workout_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

// ── Movements + smart defaults ────────────────────────────────────

export async function fetchMovements(): Promise<Movement[]> {
  const { data, error } = await asAny.from("movements").select("id, name, category").order("name");
  if (error) throw error;
  return (data ?? []) as Movement[];
}

export interface MovementDefault {
  movement_name: string;
  last_load: number | null;
  load_unit: string | null;
  last_reps: number | null;
  best_load: number | null;
  best_reps: number | null;
  last_performed_at: string;
  total_sets: number;
}

/**
 * One query powers both smart defaults and PB highlights:
 * the athlete's own logged results, reduced per movement.
 */
export async function fetchMovementHistory(userId: string): Promise<MovementDefault[]> {
  const { data, error } = await asAny
    .from("exercise_results")
    .select("movement_name, reps, load, load_unit, performed_at, skipped")
    .eq("user_id", userId)
    .eq("skipped", false)
    .order("performed_at", { ascending: false })
    .limit(1000);
  if (error) throw error;

  const map = new Map<string, MovementDefault>();
  for (const r of (data ?? []) as any[]) {
    const key = r.movement_name;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        movement_name: key,
        last_load: r.load ?? null,
        load_unit: r.load_unit ?? "kg",
        last_reps: r.reps ?? null,
        best_load: r.load ?? null,
        best_reps: r.reps ?? null,
        last_performed_at: r.performed_at,
        total_sets: 1,
      });
    } else {
      existing.total_sets += 1;
      if (r.load != null && (existing.best_load == null || r.load > existing.best_load)) {
        existing.best_load = r.load;
      }
      if (r.reps != null && (existing.best_reps == null || r.reps > existing.best_reps)) {
        existing.best_reps = r.reps;
      }
    }
  }
  return Array.from(map.values());
}
