import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getSupabaseMode,
  readRealityRow,
  readRealityTable,
  SupabaseRealityError,
} from "./supabase-reality";
import { getCamera, getEvents, getState } from "./reality-state";

type Row = Record<string, unknown>;

const serverInfo = {
  name: "Reality",
  version: "0.2.0",
};

function json(value: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    ...(isError ? { isError: true } : {}),
  };
}

function describeError(error: unknown) {
  if (error instanceof SupabaseRealityError) {
    const isUnconfigured =
      error.status === 503 &&
      typeof error.body === "object" &&
      error.body !== null &&
      (error.body as Row).code === "SUPABASE_NOT_CONFIGURED";
    return {
      source: "supabase",
      available: false,
      error: {
        code: isUnconfigured
          ? "SUPABASE_NOT_CONFIGURED"
          : "SUPABASE_QUERY_FAILED",
        status: error.status,
        detail: error.body,
        message: isUnconfigured
          ? "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the API server before using Reality MCP."
          : "Reality could not read its Supabase tables. Apply the Reality schema migration and check the connection permissions.",
      },
    };
  }
  return {
    source: "supabase",
    available: false,
    error: {
      code: "SUPABASE_QUERY_FAILED",
      message:
        error instanceof Error ? error.message : "Unknown Supabase error.",
    },
  };
}

async function withRealityData<T extends Row, F extends Row>(
  operation: () => Promise<T>,
  fallback: (warning?: Row) => F,
): Promise<T | F> {
  if (getSupabaseMode() === "unconfigured") return fallback();
  try {
    return await operation();
  } catch (error) {
    return fallback(describeError(error));
  }
}

function memoryState(warning?: Row) {
  return {
    source: "memory",
    available: true,
    demo_mode: true,
    state: getState(),
    ...(warning ? { warning } : {}),
  };
}

function memoryEvents(
  filters: { query?: string; event_type?: string; limit?: number },
  severity?: string,
) {
  return getEvents(filters).filter(
    (event) => !severity || event.severity === severity,
  );
}

async function currentState(args: { camera_id?: string; zone_id?: string }) {
  const filters: Record<string, string> = {
    select:
      "id,location_id,camera_id,zone_id,captured_at,scene_summary,state,snapshot_url,created_at",
    order: "captured_at.desc",
    limit: "1",
  };
  if (args.camera_id) filters.camera_id = `eq.${args.camera_id}`;
  if (args.zone_id) filters.zone_id = `eq.${args.zone_id}`;
  const row = await readRealityRow<Row>("world_states", filters);
  if (!row) {
    return {
      source: "supabase",
      available: true,
      state: null,
      message: "No analyzed camera frame has been persisted yet.",
    };
  }
  const objects = await readRealityTable<Row>("detected_objects", {
    select:
      "id,raw_label,normalized_label,category,object_count,confidence,attributes,created_at",
    world_state_id: `eq.${String(row.id)}`,
    order: "created_at.asc",
  });
  const state = (row.state ?? {}) as Row;
  return {
    source: "supabase",
    available: true,
    state: {
      id: row.id,
      location_id: row.location_id,
      camera_id: row.camera_id,
      zone_id: row.zone_id,
      captured_at: row.captured_at,
      summary: row.scene_summary,
      people_count:
        typeof state.people_count === "number" ? state.people_count : 0,
      objects: objects.map((object) => ({
        name: object.normalized_label ?? object.raw_label,
        category: object.category,
        count: object.object_count,
        confidence: object.confidence,
        color:
          typeof (object.attributes as Row | null)?.color === "string"
            ? (object.attributes as Row).color
            : null,
      })),
      snapshot_url: row.snapshot_url ?? null,
    },
  };
}

export function createRealityMcpServer() {
  const server = new McpServer(serverInfo, {
    capabilities: { tools: { listChanged: false } },
    instructions:
      "Reality exposes structured physical-world observations from Supabase when configured and a live in-memory demo otherwise. It does not identify people.",
  });

  server.registerTool(
    "get_current_state",
    {
      title: "Get current world state",
      description: "Read the latest world state and detected objects.",
      inputSchema: {
        camera_id: z
          .string()
          .optional()
          .describe("Optional Supabase camera id."),
        zone_id: z.string().optional().describe("Optional Supabase zone id."),
      },
    },
    async (args) => {
      return json(
        await withRealityData(
          () => currentState(args),
          (warning) => memoryState(warning),
        ),
      );
    },
  );

  server.registerTool(
    "inspect_zone",
    {
      title: "Inspect a physical zone",
      description: "Find a zone by id or name and return its latest state.",
      inputSchema: {
        zone_id: z.string().optional().describe("Supabase zone id."),
        zone_name: z.string().optional().describe("Human-readable zone name."),
      },
    },
    async (args) => {
      return json(
        await withRealityData(
          async () => {
            let zone: Row | null = null;
            if (args.zone_id) {
              zone = await readRealityRow<Row>("zones", {
                select: "id,name,zone_type,camera_id,metadata",
                id: `eq.${args.zone_id}`,
              });
            } else if (args.zone_name) {
              zone = await readRealityRow<Row>("zones", {
                select: "id,name,zone_type,camera_id,metadata",
                name: `ilike.*${args.zone_name}*`,
              });
            }
            if (!zone) {
              return {
                source: "supabase",
                available: true,
                zone: null,
                message: "No matching zone was found.",
              };
            }
            return {
              source: "supabase",
              available: true,
              zone,
              state: await currentState({ zone_id: String(zone.id) }),
            };
          },
          (warning) => ({
            source: "memory",
            available: true,
            demo_mode: true,
            zone: {
              id: "demo-zone",
              name: getState().zone,
              zone_type: "current_frame",
              camera_id: "demo-camera",
            },
            state: memoryState(),
            ...(warning ? { warning } : {}),
          }),
        ),
      );
    },
  );

  server.registerTool(
    "find_object",
    {
      title: "Find an observed object",
      description:
        "Search normalized detected-object labels in Reality observations.",
      inputSchema: {
        object_name: z.string().min(1).describe("Object label to search for."),
        zone_id: z.string().optional().describe("Optional Supabase zone id."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum matches."),
      },
    },
    async (args) => {
      return json(
        await withRealityData(
          async () => {
            const params: Record<string, string> = {
              select:
                "id,world_state_id,raw_label,normalized_label,category,object_count,confidence,attributes,created_at",
              normalized_label: `ilike.*${args.object_name}*`,
              order: "created_at.desc",
              limit: String(args.limit ?? 25),
            };
            if (args.zone_id) {
              const states = await readRealityTable<Row>("world_states", {
                select: "id",
                zone_id: `eq.${args.zone_id}`,
                order: "captured_at.desc",
                limit: "250",
              });
              const ids = states.map((row) => String(row.id)).filter(Boolean);
              if (!ids.length) {
                return {
                  source: "supabase",
                  available: true,
                  object_name: args.object_name,
                  matches: [],
                };
              }
              params.world_state_id = `in.(${ids.join(",")})`;
            }
            const rows = await readRealityTable<Row>(
              "detected_objects",
              params,
            );
            return {
              source: "supabase",
              available: true,
              object_name: args.object_name,
              matches: rows,
            };
          },
          (warning) => ({
            source: "memory",
            available: true,
            demo_mode: true,
            object_name: args.object_name,
            matches: getState()
              .objects.filter((object) =>
                object.name
                  .toLowerCase()
                  .includes(args.object_name.toLowerCase()),
              )
              .slice(0, args.limit ?? 25),
            ...(warning ? { warning } : {}),
          }),
        ),
      );
    },
  );

  server.registerTool(
    "count_objects",
    {
      title: "Count observed objects",
      description:
        "Count object detections, optionally filtered by label and category.",
      inputSchema: {
        object_name: z
          .string()
          .optional()
          .describe("Optional normalized label."),
        category: z.string().optional().describe("Optional object category."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Rows to aggregate."),
      },
    },
    async (args) => {
      return json(
        await withRealityData(
          async () => {
            const params: Record<string, string> = {
              select:
                "normalized_label,category,object_count,confidence,created_at",
              order: "created_at.desc",
              limit: String(args.limit ?? 250),
            };
            if (args.object_name)
              params.normalized_label = `ilike.*${args.object_name}*`;
            if (args.category) params.category = `eq.${args.category}`;
            const rows = await readRealityTable<Row>(
              "detected_objects",
              params,
            );
            const total = rows.reduce(
              (sum, row) =>
                sum +
                (typeof row.object_count === "number" ? row.object_count : 0),
              0,
            );
            return {
              source: "supabase",
              available: true,
              total,
              rows,
              truncated: rows.length >= Number(args.limit ?? 250),
            };
          },
          (warning) => {
            const rows = getState().objects.filter(
              (object) =>
                (!args.object_name ||
                  object.name
                    .toLowerCase()
                    .includes(args.object_name.toLowerCase())) &&
                (!args.category || object.category === args.category),
            );
            return {
              source: "memory",
              available: true,
              demo_mode: true,
              total: rows.reduce((sum, object) => sum + object.count, 0),
              rows,
              truncated: false,
              ...(warning ? { warning } : {}),
            };
          },
        ),
      );
    },
  );

  server.registerTool(
    "search_events",
    {
      title: "Search Reality events",
      description: "Search Reality event descriptions and object labels.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Text in an event description or object label."),
        event_type: z.string().optional().describe("Exact event type filter."),
        severity: z.string().optional().describe("Exact severity filter."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum events."),
      },
    },
    async (args) => {
      return json(
        await withRealityData(
          async () => {
            const params: Record<string, string> = {
              select:
                "id,event_type,object_label,description,severity,zone_id,started_at,ended_at,created_at,metadata",
              order: "created_at.desc",
              limit: String(args.limit ?? 25),
            };
            if (args.event_type) params.event_type = `eq.${args.event_type}`;
            if (args.severity) params.severity = `eq.${args.severity}`;
            if (args.query) {
              const text = args.query.replace(/[(),]/g, " ");
              params.or = `(description.ilike.*${text}*,object_label.ilike.*${text}*)`;
            }
            const events = await readRealityTable<Row>("events", params);
            return { source: "supabase", available: true, events };
          },
          (warning) => ({
            source: "memory",
            available: true,
            demo_mode: true,
            events: memoryEvents(args, args.severity),
            ...(warning ? { warning } : {}),
          }),
        ),
      );
    },
  );

  server.registerTool(
    "get_recent_changes",
    {
      title: "Get recent changes",
      description: "Return the most recent physical-world changes.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum events."),
      },
    },
    async (args) => {
      return json(
        await withRealityData(
          async () => ({
            source: "supabase",
            available: true,
            events: await readRealityTable<Row>("events", {
              select:
                "id,event_type,object_label,description,severity,zone_id,started_at,ended_at,created_at",
              order: "created_at.desc",
              limit: String(args.limit ?? 10),
            }),
          }),
          (warning) => ({
            source: "memory",
            available: true,
            demo_mode: true,
            events: memoryEvents({ limit: args.limit ?? 10 }),
            ...(warning ? { warning } : {}),
          }),
        ),
      );
    },
  );

  server.registerTool(
    "get_camera_status",
    {
      title: "Get camera status",
      description: "Read camera status and the latest observation timestamp.",
      inputSchema: {
        camera_id: z
          .string()
          .optional()
          .describe("Optional Supabase camera id."),
      },
    },
    async (args) => {
      return json(
        await withRealityData(
          async () => {
            const camera = await readRealityRow<Row>("cameras", {
              select:
                "id,name,camera_type,status,last_seen_at,settings,created_at,updated_at",
              ...(args.camera_id
                ? { id: `eq.${args.camera_id}` }
                : { order: "created_at.asc" }),
            });
            if (!camera) {
              return {
                source: "supabase",
                available: true,
                camera: null,
                message: "No camera has been registered yet.",
              };
            }
            const latest = await readRealityRow<Row>("world_states", {
              select: "captured_at",
              camera_id: `eq.${String(camera.id)}`,
              order: "captured_at.desc",
            });
            return {
              source: "supabase",
              available: true,
              camera: {
                ...camera,
                latest_observation_at: latest?.captured_at ?? null,
              },
            };
          },
          (warning) => ({
            source: "memory",
            available: true,
            demo_mode: true,
            camera: {
              id: "demo-camera",
              ...getCamera(),
              latest_observation_at: getCamera().last_seen_at,
            },
            ...(warning ? { warning } : {}),
          }),
        ),
      );
    },
  );

  return server;
}

export const realityMcpToolNames = [
  "get_current_state",
  "inspect_zone",
  "find_object",
  "count_objects",
  "search_events",
  "get_recent_changes",
  "get_camera_status",
] as const;
