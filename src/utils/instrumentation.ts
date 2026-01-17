import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";
import { env } from "process";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

// ...
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const exporterConfig = {
  url: `https://${env.AXIOM_DOMAIN}/v1/traces`,
  headers: {
    Authorization: `Bearer ${env.AXIOM_TOKEN}`,
    "X-Axiom-Dataset": `${env.AXIOM_DATASET}`,
  },
};

const logExporterConfig = {
  url: `https://${env.AXIOM_DOMAIN}/v1/logs`,
  headers: {
    Authorization: `Bearer ${env.AXIOM_TOKEN}`,
    "X-Axiom-Dataset": `${env.AXIOM_DATASET}`,
  },
};
// -----------------------------

export const traceExporter = new OTLPTraceExporter(exporterConfig);
export const logExporter = new OTLPLogExporter(logExporterConfig);

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "mistybot",
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV || "development",
});

export const batchSpanProcessor = new BatchSpanProcessor(traceExporter, {
  scheduledDelayMillis: 100,
});

export const logRecordProcessor = new BatchLogRecordProcessor(logExporter, {
  scheduledDelayMillis: 100,
});

export const loggerProvider = new LoggerProvider({
  resource,
  processors: [logRecordProcessor],
});

// Register the global logger provider
logs.setGlobalLoggerProvider(loggerProvider);

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
  await logRecordProcessor.forceFlush();
  await loggerProvider.shutdown();
  await sdk.shutdown();
});
