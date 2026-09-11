import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    const body = await req.json();
    const { vehicle_id, action, start_date } = body;

    if (!vehicle_id || !action) {
      return new Response(JSON.stringify({ error: "vehicle_id and action are required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { data: vehicle, error: vehicleErr } = await supabase
      .from("vehicles")
      .select("id, plate_number, company_id")
      .eq("id", vehicle_id)
      .single();

    if (vehicleErr || !vehicle) {
      return new Response(JSON.stringify({ error: "Vehicle not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const { data: periods, error: periodsErr } = await supabase
      .from("license_periods")
      .select("*")
      .eq("vehicle_id", vehicle_id)
      .order("period_end", { ascending: false })
      .limit(1);

    if (periodsErr) {
      return new Response(JSON.stringify({ error: periodsErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const latest = periods && periods.length > 0 ? periods[0] : null;
    const isInitial = !latest;

    let periodStart: string;
    if (isInitial) {
      periodStart = start_date || new Date().toISOString().slice(0, 10);
    } else {
      const nextStart = new Date(latest.period_end);
      nextStart.setDate(nextStart.getDate() + 1);
      periodStart = nextStart.toISOString().slice(0, 10);
    }

    const endDateObj = new Date(periodStart);
    endDateObj.setFullYear(endDateObj.getFullYear() + 1);
    endDateObj.setDate(endDateObj.getDate() - 1);
    const periodEnd = endDateObj.toISOString().slice(0, 10);

    const preview = {
      vehicle_id,
      plate_number: vehicle.plate_number,
      is_initial_issuance: isInitial,
      period_start: periodStart,
      period_end: periodEnd,
    };

    if (action === "preview") {
      return new Response(JSON.stringify({ preview }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (action === "confirm") {
      const { data: refData, error: refErr } = await supabase.rpc("next_receipt_reference");
      if (refErr) {
        return new Response(JSON.stringify({ error: refErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
      const receiptReference = refData as unknown as string;

      const { data: inserted, error: insertErr } = await supabase
        .from("license_periods")
        .insert({
          vehicle_id,
          period_start: periodStart,
          period_end: periodEnd,
          issued_date: new Date().toISOString().slice(0, 10),
          receipt_reference: receiptReference,
          is_initial_issuance: isInitial,
          issued_by: userData.user.id,
        })
        .select()
        .single();

      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ license_period: inserted }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
