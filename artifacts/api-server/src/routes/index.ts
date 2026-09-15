import { Router, type IRouter } from "express";
import healthRouter from "./health";
import realityRouter from "./reality";

const router: IRouter = Router();

router.use(healthRouter);
router.use(realityRouter);

export default router;
