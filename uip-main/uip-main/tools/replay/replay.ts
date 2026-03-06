
import { readFileSync } from "fs";

export function replay(events: any[]) {
  return events.reduce((state, e) => ({ ...state, ...e.payload }), {});
}
