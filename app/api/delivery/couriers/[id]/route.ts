import type { NextRequest } from "next/server"
import { deleteResource, resources, updateResource } from "@/lib/delivery-routes"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

export const PUT = async (request: NextRequest, { params }: Context) => updateResource(request, resources.couriers, (await params).id)
export const DELETE = async (request: NextRequest, { params }: Context) => deleteResource(request, resources.couriers, (await params).id)
