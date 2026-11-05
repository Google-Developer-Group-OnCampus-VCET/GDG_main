import { NextResponse } from "next/server";
import { getResources, createResourceAdmin, deleteResourceAdmin, logAuditEvent } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const resources = getResources({ search });
    return NextResponse.json({ success: true, resources });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch resources", message: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resource = createResourceAdmin(body);

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "create_resource",
      entityType: "resource",
      entityId: resource.id,
      details: `Published community resource: "${resource.title}" (${resource.category})`,
    });

    return NextResponse.json({ success: true, resource }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create resource", message: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
    }

    const success = deleteResourceAdmin(id);
    if (!success) {
      return NextResponse.json({ error: "Resource not found or could not be deleted" }, { status: 400 });
    }

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "delete_resource",
      entityType: "resource",
      entityId: id,
      details: `Deleted community resource: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Resource ${id} deleted successfully` });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete resource", message: String(error) }, { status: 500 });
  }
}

