import path from "path";
import { createServer } from "./server";

const port = Number(process.env.PORT || 7001);
const openapiPath = path.resolve(__dirname, "../openapi.yaml");

const app = createServer(openapiPath);

app.listen({ port, host: "0.0.0.0" }).then(() => {
  app.log.info("intent engine listening on " + port);
});
