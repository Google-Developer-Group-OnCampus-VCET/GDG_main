import { NextResponse } from "next/server";
import { getAllRegistrationsAdmin } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requirePermission("manage_registrations");
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const eventSlug = searchParams.get("eventSlug") || undefined;
    const status = searchParams.get("status") || undefined;
    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const checkedIn = searchParams.get("checkedIn") || undefined;
    const exportFormat = searchParams.get("export");

    const registrations = getAllRegistrationsAdmin({
      search,
      eventSlug,
      status,
      paymentStatus,
      checkedIn,
    });

    if (exportFormat === "csv") {
      const headers = [
        "Registration ID",
        "Reference ID",
        "Event Slug",
        "Full Name",
        "Email",
        "Phone",
        "College",
        "Department",
        "Year of Study",
        "Track",
        "Status",
        "Payment Status",
        "Checked In",
        "Checked In At",
        "Registration Date",
      ];

      const csvRows = [headers.join(",")];

      for (const r of registrations) {
        const row = [
          r.id,
          r.referenceId,
          r.eventSlug,
          `"${r.fullName.replace(/"/g, '""')}"`,
          r.email,
          `"${r.phone}"`,
          `"${r.college.replace(/"/g, '""')}"`,
          `"${r.department.replace(/"/g, '""')}"`,
          `"${r.yearOfStudy}"`,
          `"${r.track.replace(/"/g, '""')}"`,
          r.status,
          r.paymentStatus || "not-required",
          r.checkedIn ? "Yes" : "No",
          r.checkedInAt || "",
          r.createdAt,
        ];
        csvRows.push(row.join(","));
      }

      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=gdg-registrations-${Date.now()}.csv`,
        },
      });
    }

    return NextResponse.json({ success: true, count: registrations.length, registrations });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/registrations failed:", error);
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
  }
}
