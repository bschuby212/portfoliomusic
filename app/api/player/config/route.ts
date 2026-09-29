import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { getPlayerConfig } from "@/lib/player-config";

export const revalidate = 60;

export function OPTIONS(request: Request) {
  return optionsWithCors(request);
}

/** Backend toggle surface for Framer / portfolio host. */
export async function GET(request: Request) {
  return jsonWithCors(request, getPlayerConfig());
}
