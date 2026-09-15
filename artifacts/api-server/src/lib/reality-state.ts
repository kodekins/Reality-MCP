import { randomUUID } from "node:crypto";

export type RealityObject = {
  name: string;
  category: string;
  count: number;
  confidence: number;
  color: string | null;
};

export type WorldState = {
  location: string;
  camera: string;
  zone: string;
  captured_at: string;
  summary: string;
  objects: RealityObject[];
  people_count: number;
};

export type RealityEvent = {
  id: string;
  event_type: string;
  object_name: string | null;
  description: string;
  zone: string;
  severity: string;
  created_at: string;
};

export type CameraStatus = {
  name: string;
  type: string;
  status: string;
  last_seen_at: string | null;
  frames_analyzed: number;
  ai_calls: number;
  mode: string;
};

export type RealitySettings = {
  interval_seconds: 5 | 10 | 30 | 3;
  change_detection_enabled: boolean;
  sensitivity: number;
  snapshot_policy: "events_only" | "none";
  vision_provider: string;
};

let state: WorldState = {
  location: "My Office",
  camera: "Phone Camera",
  zone: "Desk",
  captured_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  summary: "A desk with a laptop, mouse, and two beverage cans.",
  objects: [
    { name: "coca cola", category: "beverage", count: 2, confidence: 0.96, color: "red" },
    { name: "laptop", category: "electronics", count: 1, confidence: 0.99, color: "silver" },
    { name: "mouse", category: "electronics", count: 1, confidence: 0.97, color: "black" },
    { name: "water bottle", category: "beverage", count: 1, confidence: 0.92, color: "clear" },
  ],
  people_count: 0,
};

let events: RealityEvent[] = [
  {
    id: randomUUID(),
    event_type: "camera_started",
    object_name: null,
    description: "Monitoring started on Phone Camera.",
    zone: "Desk",
    severity: "info",
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: randomUUID(),
    event_type: "object_appeared",
    object_name: "laptop",
    description: "Laptop appeared on Desk.",
    zone: "Desk",
    severity: "info",
    created_at: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
  },
];

let camera: CameraStatus = {
  name: "Phone Camera",
  type: "mobile",
  status: "online",
  last_seen_at: state.captured_at,
  frames_analyzed: 12,
  ai_calls: 4,
  mode: process.env.OPENAI_API_KEY ? "vision" : "mock",
};

let settings: RealitySettings = {
  interval_seconds: 5,
  change_detection_enabled: true,
  sensitivity: 0.18,
  snapshot_policy: "events_only",
  vision_provider: process.env.OPENAI_API_KEY ? "OpenAI vision" : "Mock mode",
};

export function getOverview() {
  const today = new Date().toDateString();
  return {
    organization: "Demo Workspace",
    location: "My Office",
    zone: "Desk",
    state,
    events: events.slice(0, 8),
    camera,
    metrics: {
      active_cameras: camera.status === "online" ? 1 : 0,
      objects_tracked: state.objects.reduce((total, object) => total + object.count, 0),
      events_today: events.filter((event) => new Date(event.created_at).toDateString() === today).length,
      analyses_today: camera.ai_calls,
    },
    mock_mode: camera.mode === "mock",
  };
}

export function getState() {
  return state;
}

export function getEvents(filters: { query?: string; event_type?: string; limit?: number }) {
  const query = filters.query?.trim().toLowerCase();
  return events
    .filter((event) => !query || `${event.description} ${event.object_name ?? ""}`.toLowerCase().includes(query))
    .filter((event) => !filters.event_type || event.event_type === filters.event_type)
    .slice(0, filters.limit ?? 25);
}

export function getCamera() {
  return camera;
}

export function getSettings() {
  return settings;
}

export function updateSettings(next: Partial<RealitySettings>) {
  settings = { ...settings, ...next };
  return settings;
}

function normalizeLabel(label: string) {
  const normalized = label.toLowerCase().trim().replace(/[^\w\s]/g, "");
  return { coke: "coca cola", "coca cola can": "coca cola", "coca cola": "coca cola" }[normalized] ?? normalized;
}

function detectChange(previous: WorldState, next: WorldState) {
  const previousCounts = new Map(previous.objects.map((object) => [normalizeLabel(object.name), object.count]));
  const nextCounts = new Map(next.objects.map((object) => [normalizeLabel(object.name), object.count]));
  for (const [name, count] of nextCounts) {
    const previousCount = previousCounts.get(name) ?? 0;
    if (count !== previousCount) {
      return {
        event_type: count > previousCount ? "object_count_increased" : "object_count_decreased",
        object_name: name,
        description: `${name[0].toUpperCase()}${name.slice(1)} count ${count > previousCount ? "increased" : "decreased"} from ${previousCount} to ${count}.`,
      };
    }
  }
  for (const [name, previousCount] of previousCounts) {
    if (!nextCounts.has(name)) {
      return { event_type: "object_disappeared", object_name: name, description: `${name[0].toUpperCase()}${name.slice(1)} disappeared from ${next.zone}.` };
    }
  }
  return null;
}

export function analyzeMock() {
  const previous = state;
  const nextHasFewer = previous.objects.find((object) => object.name === "coca cola")?.count === 1;
  const nextObjects = previous.objects.map((object) =>
    object.name === "coca cola" ? { ...object, count: nextHasFewer ? 2 : 1 } : object,
  );
  const next: WorldState = {
    ...previous,
    captured_at: new Date().toISOString(),
    summary: nextHasFewer
      ? "A desk with a laptop, mouse, and two beverage cans."
      : "A desk with a laptop, mouse, and one beverage can.",
    objects: nextObjects,
  };
  const change = detectChange(previous, next);
  state = next;
  camera = {
    ...camera,
    status: "online",
    last_seen_at: next.captured_at,
    frames_analyzed: camera.frames_analyzed + 1,
    ai_calls: camera.ai_calls + 1,
  };
  const event = change
    ? {
        id: randomUUID(),
        event_type: change.event_type,
        object_name: change.object_name,
        description: change.description,
        zone: next.zone,
        severity: "info",
        created_at: next.captured_at,
      }
    : null;
  if (event) events = [event, ...events];
  return {
    analyzed: true,
    changed: Boolean(event),
    message: event ? "Scene analyzed and a meaningful change was recorded." : "Scene analyzed. No meaningful state change detected.",
    state: next,
    event,
  };
}