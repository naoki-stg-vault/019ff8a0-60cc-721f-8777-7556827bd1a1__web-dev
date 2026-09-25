import { NextResponse } from "next/server";
import { BUSINESS_INFO, formatCostaRicaIso, createGoogleCalendarUrl, Appointment } from "@/lib/nails-data";

export async function GET() {
  const envWebhook =
    process.env.GOOGLE_CALENDAR_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_WEBHOOK_URL ||
    "";

  return NextResponse.json({
    status: "ok",
    targetCalendar: BUSINESS_INFO.email, // vale.coba.vcp@gmail.com
    isConfigured: Boolean(envWebhook),
    webhookSource: envWebhook ? "environment" : "none",
    instructions:
      "Usa la integración de Google Apps Script o Zapier para sincronizar automáticamente las citas con el Google Calendar de Valentina.",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "sync";
    const webhookUrl =
      body.webhookUrl ||
      process.env.GOOGLE_CALENDAR_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_WEBHOOK_URL ||
      "";

    // Action 1: Test connectivity with the Google Calendar webhook
    if (action === "test") {
      if (!webhookUrl) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No se ha configurado ninguna URL de webhook. Pega la URL generada en Google Apps Script para vale.coba.vcp@gmail.com.",
          },
          { status: 400 }
        );
      }

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "test",
            targetEmail: BUSINESS_INFO.email,
            timestamp: new Date().toISOString(),
          }),
          redirect: "follow",
        });

        const textResult = await response.text();
        let jsonResult: Record<string, unknown> | null = null;
        try {
          jsonResult = JSON.parse(textResult);
        } catch {
          // not json
        }

        if (response.ok) {
          return NextResponse.json({
            ok: true,
            message: `Conexión verificada exitosamente con el Google Calendar de ${BUSINESS_INFO.email}`,
            details: jsonResult || textResult,
          });
        } else {
          return NextResponse.json(
            {
              ok: false,
              error: `El webhook respondió con código ${response.status}`,
              details: textResult,
            },
            { status: 502 }
          );
        }
      } catch (fetchErr: unknown) {
        const errMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        return NextResponse.json(
          {
            ok: false,
            error: `Error al conectar con la URL del webhook: ${errMessage}`,
          },
          { status: 502 }
        );
      }
    }

    // Action 2: Sync an appointment
    const appointment: Appointment = body.appointment;
    if (!appointment) {
      return NextResponse.json(
        { ok: false, error: "Datos de cita no proporcionados" },
        { status: 400 }
      );
    }

    const startTimeIso = formatCostaRicaIso(appointment.date, appointment.time);
    const endTimeIso = formatCostaRicaIso(appointment.date, appointment.endTime);
    const manualCalendarUrl = createGoogleCalendarUrl(appointment, true);

    const payload = {
      action: "create_event",
      summary: `💅 Cita Nails Pink Palace: ${appointment.serviceName} - ${appointment.clientName}`,
      serviceName: appointment.serviceName,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      clientEmail: appointment.clientEmail || null,
      priceCRC: appointment.priceCRC,
      paymentMethod: appointment.paymentMethod,
      durationMin: appointment.durationMin,
      notes: appointment.notes || "",
      date: appointment.date,
      time: appointment.time,
      endTime: appointment.endTime,
      startTimeIso,
      endTimeIso,
      targetCalendar: BUSINESS_INFO.email, // vale.coba.vcp@gmail.com
      source: "web-booking-nails-pink-palace",
    };

    // If webhook is provided, send automatically
    if (webhookUrl) {
      try {
        const syncRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          redirect: "follow",
        });

        const syncText = await syncRes.text();
        let syncJson: Record<string, unknown> | null = null;
        try {
          syncJson = JSON.parse(syncText);
        } catch {
          // not json
        }

        if (syncRes.ok) {
          return NextResponse.json({
            ok: true,
            synced: true,
            message: `Cita creada y sincronizada automáticamente en el Google Calendar de ${BUSINESS_INFO.email}`,
            calendarUrl: manualCalendarUrl,
            details: syncJson || syncText,
          });
        } else {
          return NextResponse.json({
            ok: true,
            synced: false,
            warning: `El webhook devolvió código ${syncRes.status}. Se mantiene enlace directo como respaldo.`,
            calendarUrl: manualCalendarUrl,
          });
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          ok: true,
          synced: false,
          warning: `Fallo al invocar webhook: ${errMessage}. Se provee enlace directo.`,
          calendarUrl: manualCalendarUrl,
        });
      }
    }

    // No webhook configured: return ready-to-use direct calendar URL and notification indicator
    return NextResponse.json({
      ok: true,
      synced: false,
      reason: "no_webhook_configured",
      targetCalendar: BUSINESS_INFO.email,
      message: `Cita registrada para ${BUSINESS_INFO.email}. Para creación automática 100% desatendida, conecta la URL de Google Apps Script en /nails-pink-palace/admin.`,
      calendarUrl: manualCalendarUrl,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
