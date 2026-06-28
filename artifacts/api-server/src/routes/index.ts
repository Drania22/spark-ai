import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import transcribeRouter from "./transcribe";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/transcribe", transcribeRouter);

export default router;
