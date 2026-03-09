import express from "express";
import { router } from "./routes/index";

export function createApp() {
    const app = express();

    app.use(express.json());

    app.use("/api/v1", router);

    return app;
}