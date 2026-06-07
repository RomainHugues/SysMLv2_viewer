// Intermediate representation for the Gantt (schedule) view: activities with a
// duration and resource, wired by dependencies, scheduled and with a critical path.

export interface GanttTask {
  /** Render-safe id (t0, t1, …). */
  id: string;
  name: string;
  /** Duration in days (>= 1). */
  duration: number;
  /** Resource name (drives the colour); "" when unassigned. */
  resource: string;
  /** Ids of the tasks this one depends on (its predecessors). */
  deps: string[];
  /** Earliest start, in days from the project start (filled by scheduling). */
  start: number;
  /** On the critical path (zero slack). */
  critical: boolean;
}

export interface GanttModel {
  tasks: GanttTask[];
  /** Resource name -> colour. */
  resourceColors: Record<string, string>;
}
