import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { env } from "process";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

// ...
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const exporterConfig = {
  url: `https://${env.AXIOM_DOMAIN}/v1/traces`,
  headers: {
    Authorization: `Bearer ${env.AXIOM_TOKEN}`,
    "X-Axiom-Dataset": `${env.AXIOM_DATASET}`,
  },
};
// -----------------------------

export const traceExporter = new OTLPTraceExporter(exporterConfig);

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "mistybot",
});

export const batchSpanProcessor = new BatchSpanProcessor(traceExporter, {
  scheduledDelayMillis: 100,
});

const sdk = new NodeSDK({
  instrumentations: [],
  resource,
  spanProcessor: batchSpanProcessor,
});

try {
  console.log("Starting OpenTelemetry");

  sdk.start();
} catch (err) {
  console.error("Error starting OpenTelemetry");

  console.error(err);
}

process.on("beforeExit", async () => {
  console.log("Shutting down OpenTelemetry");
  await batchSpanProcessor.forceFlush();
  await sdk.shutdown();
});
