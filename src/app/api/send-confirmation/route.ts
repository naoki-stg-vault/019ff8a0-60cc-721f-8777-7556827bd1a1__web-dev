import { NextResponse } from "next/server";
import {
  BUSINESS_INFO,
  Appointment,
  createClientWhatsAppUrl,
  createClientEmailUrl,
  formatAppointmentConfirmationMessage,
  createGoogleCalendarUrl,
  isValidPhoneNumber,
} from "@/lib/nails-data";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const appointment: Appointment = body.appointment;
    const channel = body.channel || "both"; // "whatsapp" | "email" | "both"

    if (!appointment) {
      return NextResponse.json(
        { ok: false, error: "Datos de la cita requeridos" },
        { status: 400 }
      );
    }

    if (!appointment.clientPhone || !isValidPhoneNumber(appointment.clientPhone)) {
      return NextResponse.json(
        { ok: false, error: "El número de WhatsApp o teléfono es obligatorio y debe tener al menos 8 dígitos." },
        { status: 400 }
      );
    }

    const whatsappUrl = createClientWhatsAppUrl(appointment);
    const emailUrl = appointment.clientEmail ? createClientEmailUrl(appointment) : null;
    const calendarUrl = createGoogleCalendarUrl(appointment, true);
    const confirmationText = formatAppointmentConfirmationMessage(appointment);

    return NextResponse.json({
      ok: true,
      message: `Confirmación preparada para enviar a la persona que agendó (${appointment.clientName})`,
      targetCalendar: BUSINESS_INFO.email,
      recipient: {
        name: appointment.clientName,
        phone: appointment.clientPhone,
        email: appointment.clientEmail || null,
      },
      channel,
      whatsappUrl,
      emailUrl,
      calendarUrl,
      confirmationText,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al procesar confirmación";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
