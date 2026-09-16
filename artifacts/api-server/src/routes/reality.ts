import { Router, type IRouter } from "express";
import {
  AnalyzeRealityFrameBody,
  GetCurrentRealityStateResponse,
  GetRealityCameraStatusResponse,
  GetRealityOverviewResponse,
  GetRealitySettingsResponse,
  ListRealityEventsQueryParams,
  ListRealityEventsResponse,
  UpdateRealitySettingsBody,
  UpdateRealitySettingsResponse,
} from "@workspace/api-zod";
import {
  analyzeFrame,
  getCamera,
  getEvents,
  getOverview,
  getSettings,
  getState,
  updateSettings,
} from "../lib/reality-state";

const router: IRouter = Router();

router.get("/overview", (_req, res) => {
  res.json(GetRealityOverviewResponse.parse(getOverview()));
});

router.get("/state", (_req, res) => {
  res.json(GetCurrentRealityStateResponse.parse(getState()));
});

router.get("/events", (req, res) => {
  const parsed = ListRealityEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(ListRealityEventsResponse.parse(getEvents(parsed.data)));
});

router.get("/camera/status", (_req, res) => {
  res.json(GetRealityCameraStatusResponse.parse(getCamera()));
});

router.get("/settings", (_req, res) => {
  res.json(GetRealitySettingsResponse.parse(getSettings()));
});

router.patch("/settings", (req, res) => {
  const parsed = UpdateRealitySettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(UpdateRealitySettingsResponse.parse(updateSettings(parsed.data)));
});

router.post("/analyze", (req, res) => {
  const parsed = AnalyzeRealityFrameBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!parsed.data.image_data) {
    res.status(400).json({ error: "A live camera image is required. Mock analysis is disabled." });
    return;
  }
  void analyzeFrame(parsed.data.image_data)
    .then((result) => res.json(result))
    .catch((error: unknown) => {
      res.status(503).json({
        error: error instanceof Error ? error.message : "Live vision analysis failed.",
      });
    });
});

export default router;