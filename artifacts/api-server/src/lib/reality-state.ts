import { randomUUID } from "node:crypto";
import {
  getSupabaseMode,
  persistRealityObservation,
  readRealityRow,
  readRealityTable,
} from "./supabase-reality";

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

const demoStartedAt = new Date().toISOString();

let state: WorldState = {
  location: "Live Location",
  camera: "Device Camera",
  zone: "Current Frame",
  captured_at: demoStartedAt,
  summary:
    "Demo desk ready. Run an analysis or connect a camera to create the first observation.",
  objects: [
    {
      name: "laptop",
      category: "electronics",
      count: 1,
      confidence: 0.98,
      color: "silver",
    },
    {
      name: "mouse",
      category: "electronics",
      count: 1,
      confidence: 0.96,
      color: "black",
    },
    {
      name: "coca cola",
      category: "beverage",
      count: 2,
      confidence: 0.94,
      color: "red",
    },
  ],
  people_count: 0,
};

let events: RealityEvent[] = [
  {
    id: "demo-object-count",
    event_type: "object_count_increased",
    object_name: "coca cola",
    description: "Coca cola count increased from 1 to 2.",
    zone: "Current Frame",
    severity: "info",
    created_at: demoStartedAt,
  },
];

let camera: CameraStatus = {
  name: "Phone Camera",
  type: "mobile",
  status: "online",
  last_seen_at: demoStartedAt,
  frames_analyzed: 1,
  ai_calls: 1,
  mode: process.env.GEMINI_API_KEY ? "vision" : "mock",
};

let settings: RealitySettings = {
  interval_seconds: 5,
  change_detection_enabled: true,
  sensitivity: 0.18,
  snapshot_policy: "events_only",
  vision_provider: process.env.GEMINI_API_KEY ? "Gemini vision" : "Mock vision",
};

type PersistedRow = Record<string, unknown>;

let initializationPromise: Promise<boolean> | undefined;

export function initializeRealityStateOnce() {
  if (!initializationPromise) {
    initializationPromise = initializeRealityState().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }
  return initializationPromise;
}

export async function initializeRealityState() {
  if (getSupabaseMode() === "unconfigured") return false;

  const persisted = await readRealityRow<PersistedRow>("world_states", {
    select:
      "id,location_id,camera_id,zone_id,captured_at,scene_summary,state,created_at",
    order: "captured_at.desc",
  });
  if (!persisted) return false;

  const [objects, persistedEvents, location, persistedCamera, zone] =
    await Promise.all([
      readRealityTable<PersistedRow>("detected_objects", {
        select:
          "raw_label,normalized_label,category,object_count,confidence,attributes",
        world_state_id: `eq.${String(persisted.id)}`,
        order: "created_at.asc",
      }),
      readRealityTable<PersistedRow>("events", {
        select:
          "id,event_type,object_label,description,severity,started_at,created_at",
        order: "created_at.desc",
        limit: "100",
      }),
      readRealityRow<PersistedRow>("locations", {
        select: "name",
        id: `eq.${String(persisted.location_id)}`,
      }),
      readRealityRow<PersistedRow>("cameras", {
        select: "name,camera_type,status,last_seen_at,settings",
        id: `eq.${String(persisted.camera_id)}`,
      }),
      readRealityRow<PersistedRow>("zones", {
        select: "name",
        id: `eq.${String(persisted.zone_id)}`,
      }),
    ]);

  const storedState = (persisted.state ?? {}) as PersistedRow;
  state = {
    location:
      typeof location?.name === "string" ? location.name : state.location,
    camera:
      typeof persistedCamera?.name === "string"
        ? persistedCamera.name
        : state.camera,
    zone: typeof zone?.name === "string" ? zone.name : state.zone,
    captured_at: String(persisted.captured_at ?? ""),
    summary: String(persisted.scene_summary ?? state.summary),
    people_count:
      typeof storedState.people_count === "number"
        ? storedState.people_count
        : 0,
    objects: objects.map((object) => ({
      name: String(object.normalized_label ?? object.raw_label ?? "object"),
      category: String(object.category ?? "other"),
      count: typeof object.object_count === "number" ? object.object_count : 1,
      confidence:
        typeof object.confidence === "number"
          ? object.confidence
          : Number(object.confidence ?? 0.5),
      color:
        typeof (object.attributes as PersistedRow | null)?.color === "string"
          ? String((object.attributes as PersistedRow).color)
          : null,
    })),
  };
  events = persistedEvents.map((event) => ({
    id: String(event.id),
    event_type: String(event.event_type),
    object_name:
      typeof event.object_label === "string" ? event.object_label : null,
    description: String(event.description),
    zone: state.zone,
    severity: String(event.severity ?? "info"),
    created_at: String(event.created_at ?? event.started_at),
  }));
  camera = {
    ...camera,
    name: String(persistedCamera?.name ?? camera.name),
    type: String(persistedCamera?.camera_type ?? camera.type),
    status: String(persistedCamera?.status ?? "online"),
    last_seen_at:
      typeof persistedCamera?.last_seen_at === "string"
        ? persistedCamera.last_seen_at
        : state.captured_at,
    mode: process.env.GEMINI_API_KEY ? "vision" : "mock",
  };
  return true;
}

export function getOverview() {
  const today = new Date().toDateString();
  return {
    organization: "Reality Demo Workspace",
    location: state.location,
    zone: state.zone,
    state,
    events: events.slice(0, 8),
    camera,
    metrics: {
      active_cameras: camera.status === "online" ? 1 : 0,
      objects_tracked: state.objects.reduce(
        (total, object) => total + object.count,
        0,
      ),
      events_today: events.filter(
        (event) => new Date(event.created_at).toDateString() === today,
      ).length,
      analyses_today: camera.ai_calls,
    },
    mock_mode: camera.mode === "mock",
  };
}

export function getState() {
  return state;
}

export function getEvents(filters: {
  query?: string;
  event_type?: string;
  limit?: number;
}) {
  const query = filters.query?.trim().toLowerCase();
  return events
    .filter(
      (event) =>
        !query ||
        `${event.description} ${event.object_name ?? ""}`
          .toLowerCase()
          .includes(query),
    )
    .filter(
      (event) => !filters.event_type || event.event_type === filters.event_type,
    )
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
  const normalized = label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "");
  return (
    {
      coke: "coca cola",
      "coca cola can": "coca cola",
      "coca cola": "coca cola",
    }[normalized] ?? normalized
  );
}

function cleanModelJson(text: string) {
  const withoutFence = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  return start >= 0 && end > start
    ? withoutFence.slice(start, end + 1)
    : withoutFence;
}

function clampConfidence(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.min(1, Math.max(0, numeric)) : 0.5;
}

async function analyzeWithGemini(imageData: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Live vision is not configured. Set GEMINI_API_KEY in your environment.",
    );
  }
  const match = imageData.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match)
    throw new Error("The camera frame must be a base64 image data URL.");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: { mime_type: match[1], data: match[2] },
              },
              {
                text: 'Analyze this camera frame for a physical-world monitoring system. Return only JSON with this exact shape: {"summary":"short factual scene description","people_count":0,"objects":[{"name":"normalized object label","category":"category","count":1,"confidence":0.0,"color":"optional color or null"}]}. Do not identify people or infer identity. Only include visible objects and use confidence from 0 to 1.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Gemini vision request failed with status ${response.status}.`,
    );
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";
  const parsed = JSON.parse(cleanModelJson(text)) as {
    summary?: unknown;
    people_count?: unknown;
    objects?: Array<Record<string, unknown>>;
  };
  return {
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary.slice(0, 500)
        : "Visible scene analyzed.",
    people_count:
      typeof parsed.people_count === "number" && parsed.people_count >= 0
        ? Math.floor(parsed.people_count)
        : 0,
    objects: Array.isArray(parsed.objects)
      ? parsed.objects
          .filter(
            (object) => typeof object.name === "string" && object.name.trim(),
          )
          .slice(0, 50)
          .map((object) => ({
            name: normalizeLabel(String(object.name)),
            category:
              typeof object.category === "string" ? object.category : "other",
            count:
              typeof object.count === "number" && object.count > 0
                ? Math.floor(object.count)
                : 1,
            confidence: clampConfidence(object.confidence),
            color: typeof object.color === "string" ? object.color : null,
          }))
      : [],
  };
}

function detectChange(previous: WorldState, next: WorldState) {
  const previousCounts = new Map(
    previous.objects.map((object) => [
      normalizeLabel(object.name),
      object.count,
    ]),
  );
  const nextCounts = new Map(
    next.objects.map((object) => [normalizeLabel(object.name), object.count]),
  );
  for (const [name, count] of nextCounts) {
    const previousCount = previousCounts.get(name) ?? 0;
    if (count !== previousCount) {
      return {
        event_type:
          count > previousCount
            ? "object_count_increased"
            : "object_count_decreased",
        object_name: name,
        description: `${name[0].toUpperCase()}${name.slice(1)} count ${count > previousCount ? "increased" : "decreased"} from ${previousCount} to ${count}.`,
      };
    }
  }
  for (const [name, previousCount] of previousCounts) {
    if (!nextCounts.has(name)) {
      return {
        event_type: "object_disappeared",
        object_name: name,
        description: `${name[0].toUpperCase()}${name.slice(1)} disappeared from ${next.zone}.`,
      };
    }
  }
  return null;
}

export async function analyzeMock() {
  const previous = state;
  const nextHasFewer =
    previous.objects.find((object) => object.name === "coca cola")?.count === 1;
  const nextObjects = previous.objects.map((object) =>
    object.name === "coca cola"
      ? { ...object, count: nextHasFewer ? 2 : 1 }
      : object,
  );
  const next: WorldState = {
    ...previous,
    captured_at: new Date().toISOString(),
    summary: nextHasFewer
      ? "A desk with a laptop, mouse, and two beverage cans."
      : "A desk with a laptop, mouse, and one beverage can.",
    objects: nextObjects,
  };
  const change = settings.change_detection_enabled
    ? detectChange(previous, next)
    : null;
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
  let persisted = false;
  if (getSupabaseMode() !== "unconfigured") {
    try {
      await persistRealityObservation(next, event);
      persisted = true;
    } catch {
      // Demo mode must remain usable when Supabase is temporarily unavailable
      // or the migration has not been applied yet.
    }
  }
  return {
    analyzed: true,
    changed: Boolean(event),
    persisted,
    message: event
      ? "Scene analyzed and a meaningful change was recorded."
      : "Scene analyzed. No meaningful state change detected.",
    state: next,
    event,
  };
}

export async function analyzeFrame(imageData: string) {
  const previous = state;
  const vision = await analyzeWithGemini(imageData);
  const next: WorldState = {
    ...previous,
    captured_at: new Date().toISOString(),
    summary: vision.summary,
    objects: vision.objects,
    people_count: vision.people_count,
  };
  const change = settings.change_detection_enabled
    ? detectChange(previous, next)
    : null;
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
  let persisted = false;
  if (getSupabaseMode() !== "unconfigured") {
    try {
      await persistRealityObservation(next, event);
      persisted = true;
    } catch {
      // The live result is still useful for a demo even if persistence fails.
    }
  }
  state = next;
  camera = {
    ...camera,
    status: "online",
    last_seen_at: next.captured_at,
    frames_analyzed: camera.frames_analyzed + 1,
    ai_calls: camera.ai_calls + 1,
    mode: "vision",
  };
  if (event) events = [event, ...events];
  return {
    analyzed: true,
    changed: Boolean(event),
    persisted,
    message: event
      ? "Live camera frame analyzed and a meaningful change was recorded."
      : "Live camera frame analyzed. No meaningful state change detected.",
    state: next,
    event,
  };
}
