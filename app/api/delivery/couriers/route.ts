import type { NextRequest } from "next/server"
import { createResource, listResource, resources } from "@/lib/delivery-routes"

export const runtime = "nodejs"

export const GET = (request: NextRequest) => listResource(request, resources.couriers)
export const POST = (request: NextRequest) => createResource(request, resources.couriers)
