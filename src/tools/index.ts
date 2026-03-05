import type { ComponentType } from "react";
import type { ToolItem } from "@/lib/tools";
import Base64Tool from "./base64";
import CronGenerator from "./cron-generator";
import DiffTool from "./diff";
import JavaMemoryCalculator from "./java-memory-calculator";
import JsonViewerTool from "./jsonviewer";
import JwtTool from "./jwt";
import K6Generator from "./k6-generator";
import UtcCalculator from "./utc-calculator";
import UrlTool from "./url";

type ToolComponentProps = {
  tool: ToolItem;
};

export const toolPages: Record<string, ComponentType<ToolComponentProps>> = {
  "json-viewer": JsonViewerTool,
  base64: Base64Tool,
  diff: DiffTool,
  jwt: JwtTool,
  url: UrlTool,
  "java-memory-calculator": JavaMemoryCalculator,
  "k6-generator": K6Generator,
  "cron-generator": CronGenerator,
  "utc-unix-calculator": UtcCalculator,
};
