import { spyOn } from "bun:test";

type FetchImplementation = (...args: never[]) => Response | Promise<Response>;

export function stubFetch(implementation: FetchImplementation): void {
  spyOn(globalThis, "fetch").mockImplementation(implementation as typeof fetch);
}
