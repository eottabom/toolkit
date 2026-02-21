import type { ComponentType } from "react";
import type { ToolItem } from "@/lib/tools";
import Base64Tool from "./base64";
import DiffTool from "./diff";
import JsonViewerTool from "@/tools/jsonviewer";
import JwtTool from "./jwt";
import UrlTool from "./url";
import JavaMemoryCalculator from "@/tools/java-memory-calculator";
import K6Generator from "@/tools/k6-generator";
import CronGenerator from "@/tools/cron-generator";

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
};
