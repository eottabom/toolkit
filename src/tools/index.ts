import type { ComponentType } from "react";
import DiffPage from "./diff";

export const toolPages: Record<string, ComponentType<any>> = {
  diff: DiffPage,
};
