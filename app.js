import { app, errorHandler } from "mu";
import generateRouter from "./generate";
import deltaRouter from "./delta";

app.use(errorHandler);
app.use(generateRouter);
app.use(deltaRouter);
