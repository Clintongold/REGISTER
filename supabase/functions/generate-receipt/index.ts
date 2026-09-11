import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const { license_period_id } = await req.json();
    if (!license_period_id) {
      return new Response(JSON.stringify({ error: "license_period_id is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { data: period, error: periodErr } = await supabase
      .from("license_periods")
      .select("*, vehicles(plate_number, make, model, year, company_id, companies(name, registration_number))")
      .eq("id", license_period_id)
      .single();

    if (periodErr || !period) {
      return new Response(JSON.stringify({ error: "License period not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const vehicle: any = (period as any).vehicles;
    const company: any = vehicle?.companies;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { height } = page.getSize();
    let y = height - 60;

    page.drawText("VEHICLE LICENSE RENEWAL RECEIPT", { x: 50, y, size: 16, font, color: rgb(0.1, 0.1, 0.4) });
    y -= 20;
    page.drawText("[Agency Name / Logo Placeholder]", { x: 50, y, size: 10, font: regular, color: rgb(0.4, 0.4, 0.4) });
    y -= 40;

    const line = (label: string, value: string) => {
      page.drawText(`${label}:`, { x: 50, y, size: 11, font });
      page.drawText(value ?? "-", { x: 220, y, size: 11, font: regular });
      y -= 24;
    };

    line("Receipt Reference", (period as any).receipt_reference);
    line("Issued Date", (period as any).issued_date);
    line("Company", company?.name);
    line("Registration No.", company?.registration_number);
    line("Vehicle Plate Number", vehicle?.plate_number);
    line("Make / Model", `${vehicle?.make ?? ""} ${vehicle?.model ?? ""}`);
    line("Year", String(vehicle?.year ?? "-"));
    line("License Period", `${(period as any).period_start} to ${(period as any).period_end}`);
    line("Type", (period as any).is_initial_issuance ? "Initial Issuance" : "Renewal");

    y -= 60;
    page.drawText("_________________________", { x: 50, y, size: 11, font: regular });
    y -= 16;
    page.drawText("Authorized Signature", { x: 50, y, size: 10, font: regular });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt-${(period as any).receipt_reference}.pdf"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
