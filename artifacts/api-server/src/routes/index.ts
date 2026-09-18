import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import brandRouter from "./brand";
import postsRouter from "./posts";
import schedulesRouter from "./schedules";
import analyticsRouter from "./analytics";
import instagramRouter from "./instagram";
import channelsRouter from "./channels";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(brandRouter);
router.use(postsRouter);
router.use(schedulesRouter);
router.use(analyticsRouter);
router.use(instagramRouter);
router.use(channelsRouter);

export default router;
