import { app } from "mu";
import generateRouter from "./generate";
import deltaRouter from "./delta";

app.use(generateRouter);
app.use(deltaRouter);
