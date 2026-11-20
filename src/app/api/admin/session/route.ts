import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSessionPayload } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await getAdminSessionPayload(token);

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      role: null,
      canEdit: false,
      canBroadcast: false,
      canCheckIn: false,
    });
  }

  const isMaster = session.role === "admin";

  return NextResponse.json({
    authenticated: true,
    role: session.role,
    isMaster,
    canEdit: isMaster,
    canBroadcast: isMaster,
    canCheckIn: true,
  });
}

