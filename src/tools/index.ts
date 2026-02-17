import type { ComponentType } from "react";
import type { ToolItem } from "@/lib/tools";
import DiffPage from "./diff";
import Base64Tool from "./base64";
import JsonViewerTool from "@/tools/jsonviewer";
import JwtTool from "./jwt";
import UrlTool from "./url";

type ToolComponentProps = {
  tool: ToolItem;
};

export const toolPages: Record<string, ComponentType<ToolComponentProps>> = {
  "json-viewer": JsonViewerTool,
  "base64": Base64Tool,
  "diff": DiffPage,
  "jwt": JwtTool,
  "url": UrlTool
};
