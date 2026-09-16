import { ReplitConnectors } from "@replit/connectors-sdk";

type JsonRecord = Record<string, unknown>;
type SupabaseRequestInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export type SupabaseRealityContext = {
  organizationId: string;
  locationId: string;
  cameraId: string;
  zoneId: string;
};

export class SupabaseRealityError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "SupabaseRealityError";
  }
}

function directSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_KEY;
  return url && key ? { url, key } : null;
}

export function getSupabaseMode() {
  if (directSupabaseConfig()) return "direct" as const;
  if (process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT)
    return "replit-connector" as const;
  return "unconfigured" as const;
}

async function supabaseFetch(
  pathname: string,
  init: SupabaseRequestInit,
): Promise<Response> {
  const config = directSupabaseConfig();
  if (config) {
    return fetch(`${config.url}${pathname}`, {
      ...init,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        ...init.headers,
      },
    });
  }

  if (process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT) {
    return new ReplitConnectors().proxy("supabase", pathname, init);
  }

  throw new SupabaseRealityError(
    "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    503,
    { code: "SUPABASE_NOT_CONFIGURED" },
  );
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<T>(
  table: string,
  searchParams: Record<string, string> = {},
): Promise<T[]> {
  const query = new URLSearchParams(searchParams);
  const response = await supabaseFetch(
    `/rest/v1/${table}?${query.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );
  const body = await readBody(response);
  if (!response.ok) {
    throw new SupabaseRealityError(
      `Supabase query failed for ${table}.`,
      response.status,
      body,
    );
  }
  return Array.isArray(body) ? (body as T[]) : [];
}

async function insert<T extends JsonRecord>(
  table: string,
  rows: T | T[],
): Promise<JsonRecord[]> {
  const response = await supabaseFetch(`/rest/v1/${table}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });
  const body = await readBody(response);
  if (!response.ok) {
    throw new SupabaseRealityError(
      `Supabase insert failed for ${table}.`,
      response.status,
      body,
    );
  }
  return Array.isArray(body) ? (body as JsonRecord[]) : [];
}

async function update(
  table: string,
  searchParams: Record<string, string>,
  values: JsonRecord,
): Promise<void> {
  const query = new URLSearchParams(searchParams);
  const response = await supabaseFetch(
    `/rest/v1/${table}?${query.toString()}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(values),
    },
  );
  if (!response.ok) {
    const body = await readBody(response);
    throw new SupabaseRealityError(
      `Supabase update failed for ${table}.`,
      response.status,
      body,
    );
  }
}

async function first<T>(
  table: string,
  searchParams: Record<string, string>,
): Promise<T | null> {
  const rows = await request<T>(table, { ...searchParams, limit: "1" });
  return rows[0] ?? null;
}

async function getOrCreate(
  table: string,
  searchParams: Record<string, string>,
  values: JsonRecord,
): Promise<JsonRecord> {
  const existing = await first<JsonRecord>(table, searchParams);
  if (existing?.id) return existing;
  const created = (await insert(table, values))[0];
  if (!created?.id) {
    throw new Error(`Supabase did not return an id for ${table}.`);
  }
  return created;
}

export async function getRealityContext(): Promise<SupabaseRealityContext> {
  const organization = await getOrCreate(
    "organizations",
    { select: "id", name: "eq.Reality Workspace" },
    { name: "Reality Workspace" },
  );
  const location = await getOrCreate(
    "locations",
    {
      select: "id",
      organization_id: `eq.${String(organization.id)}`,
      name: "eq.Live Location",
    },
    {
      organization_id: organization.id,
      name: "Live Location",
      description: "Location observed by the Reality device camera.",
      timezone: "UTC",
    },
  );
  const camera = await getOrCreate(
    "cameras",
    {
      select: "id",
      organization_id: `eq.${String(organization.id)}`,
      name: "eq.Device Camera",
    },
    {
      organization_id: organization.id,
      location_id: location.id,
      name: "Device Camera",
      camera_type: "mobile",
      status: "online",
    },
  );
  const zone = await getOrCreate(
    "zones",
    {
      select: "id",
      organization_id: `eq.${String(organization.id)}`,
      camera_id: `eq.${String(camera.id)}`,
      name: "eq.Current Frame",
    },
    {
      organization_id: organization.id,
      camera_id: camera.id,
      name: "Current Frame",
      zone_type: "desk",
    },
  );
  return {
    organizationId: String(organization.id),
    locationId: String(location.id),
    cameraId: String(camera.id),
    zoneId: String(zone.id),
  };
}

export async function persistRealityObservation(
  observation: {
    captured_at: string;
    summary: string;
    objects: Array<{
      name: string;
      category: string;
      count: number;
      confidence: number;
      color: string | null;
    }>;
    people_count: number;
  },
  event: {
    event_type: string;
    object_name: string | null;
    description: string;
    zone: string;
    severity: string;
    created_at: string;
  } | null,
): Promise<SupabaseRealityContext> {
  const context = await getRealityContext();
  const worldState = (
    await insert("world_states", {
      organization_id: context.organizationId,
      location_id: context.locationId,
      camera_id: context.cameraId,
      zone_id: context.zoneId,
      captured_at: observation.captured_at,
      scene_summary: observation.summary,
      state: {
        people_count: observation.people_count,
        objects: observation.objects,
      },
    })
  )[0];
  if (!worldState?.id) {
    throw new Error("Supabase did not return the persisted world state.");
  }
  if (observation.objects.length) {
    await insert(
      "detected_objects",
      observation.objects.map((object) => ({
        world_state_id: worldState.id,
        raw_label: object.name,
        normalized_label: object.name,
        category: object.category,
        object_count: object.count,
        confidence: object.confidence,
        attributes: object.color ? { color: object.color } : {},
      })),
    );
  }
  if (event) {
    await insert("events", {
      organization_id: context.organizationId,
      location_id: context.locationId,
      camera_id: context.cameraId,
      zone_id: context.zoneId,
      event_type: event.event_type,
      object_label: event.object_name,
      description: event.description,
      severity: event.severity,
      current_state: {
        people_count: observation.people_count,
        objects: observation.objects,
      },
      started_at: event.created_at,
      created_at: event.created_at,
    });
  }
  await update(
    "cameras",
    { id: `eq.${context.cameraId}` },
    {
      status: "online",
      last_seen_at: observation.captured_at,
      updated_at: observation.captured_at,
    },
  );
  return context;
}

export async function readRealityTable<T>(
  table: string,
  searchParams: Record<string, string>,
): Promise<T[]> {
  return request<T>(table, searchParams);
}

export async function readRealityRow<T>(
  table: string,
  searchParams: Record<string, string>,
): Promise<T | null> {
  return first<T>(table, searchParams);
}
