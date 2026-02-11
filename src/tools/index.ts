import type { ComponentType } from "react";
import DiffPage from "./diff";
import Base64Tool from "./base64";

export const toolPages: Record<string, ComponentType<any>> = {
  diff: DiffPage,
  "base64": Base64Tool,
};
