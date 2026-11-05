import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("gdg_session")?.value;

    if (token) {
      destroySession(token);
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.delete("gdg_session");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Logout failed", message: String(error) },
      { status: 500 }
    );
  }
}

