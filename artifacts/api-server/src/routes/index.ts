import { Router, type IRouter } from "express";
import healthRouter from "./health";
import listingsRouter from "./listings";
import leadsRouter from "./leads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(listingsRouter);
router.use(leadsRouter);

export default router;
