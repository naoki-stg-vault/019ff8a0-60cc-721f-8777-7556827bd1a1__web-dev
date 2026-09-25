export interface NailService {
  id: string;
  name: string;
  durationMin: number;
  priceCRC: number;
  description: string;
  category: "manicura" | "pedicura" | "cuidado";
  image: string;
  popular?: boolean;
}

export const NAIL_SERVICES: NailService[] = [
  {
    id: "rubber-base",
    name: "Rubber Base",
    durationMin: 90,
    priceCRC: 10000,
    description: "Refuerzo flexible y duradero que nivela y fortalece la uña natural con acabado ultra natural.",
    category: "manicura",
    image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80",
    popular: true,
  },
  {
    id: "polygel",
    name: "Polygel",
    durationMin: 180,
    priceCRC: 18000,
    description: "La perfecta combinación entre acrílico y gel: uñas resistentes, ligeras e inodoras sin dañar la uña.",
    category: "manicura",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80",
    popular: true,
  },
  {
    id: "pedicure-spa",
    name: "Pedicure Spa",
    durationMin: 180,
    priceCRC: 20000,
    description: "Tratamiento intensivo con exfoliación, remoción profunda de callos, mascarilla e hidratación completa.",
    category: "pedicura",
    image: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80",
    popular: true,
  },
  {
    id: "pedicure-ruso",
    name: "Pedicure Ruso",
    durationMin: 180,
    priceCRC: 10000,
    description: "Técnica con torno para una limpieza milimétrica de cutícula y contornos, dejando la piel impecable.",
    category: "pedicura",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "gel-x",
    name: "Gel X",
    durationMin: 90,
    priceCRC: 15000,
    description: "Sistema de extensiones completas en gel suave. Longitud inmediata y aspecto estilizado sin limados agresivos.",
    category: "manicura",
    image: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "gel-calcio-natural",
    name: "Gel de calcio sobre uña natural",
    durationMin: 120,
    priceCRC: 12000,
    description: "Aporte vitamínico y endurecedor ideal para recuperar uñas frágiles, quebradizas o post-retiro.",
    category: "cuidado",
    image: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "gel-calcio-extension",
    name: "Gel de calcio + extensión de uñas",
    durationMin: 120,
    priceCRC: 14000,
    description: "Nutrición con calcio combinada con extensión de longitud elegante para un acabado fuerte y sofisticado.",
    category: "manicura",
    image: "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "exfoliacion-manos",
    name: "Exfoliación e hidratación en manos",
    durationMin: 120,
    priceCRC: 10000,
    description: "Renovación celular profunda, masaje relajante y sellado de hidratación para manos visiblemente rejuvenecidas.",
    category: "cuidado",
    image: "https://images.unsplash.com/photo-1512290900672-1f02e078eb14?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "esmaltado-semipermanente",
    name: "Esmaltado semipermanente sobre uña natural",
    durationMin: 60,
    priceCRC: 8000,
    description: "Color de alto brillo y duración de 2 a 3 semanas sobre tu uña natural con secado en lámpara LED.",
    category: "manicura",
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80",
  },
];

export type PaymentMethod = "sinpe" | "efectivo";

export type AppointmentStatus = "confirmada" | "completada" | "cancelada";

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  serviceName: string;
  priceCRC: number;
  durationMin: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime: string; // HH:mm
  paymentMethod: PaymentMethod;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  notificationsSent: {
    whatsapp: boolean;
    calendar: boolean;
    email: boolean;
  };
}

export interface NotificationSettings {
  whatsapp: boolean;
  calendar: boolean;
  email: boolean;
  valentinaPhone: string;
  valentinaEmail: string;
  googleWebhookUrl?: string;
  calendarAutoSync: boolean;
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  whatsapp: true,
  calendar: true,
  email: true,
  valentinaPhone: "8735-7321",
  valentinaEmail: "vale.coba.vcp@gmail.com",
  googleWebhookUrl: "",
  calendarAutoSync: true,
};

export const BUSINESS_INFO = {
  name: "Nails Pink Palace",
  stylist: "Valentina Cobaleda Pallares",
  phone: "8735-7321",
  whatsappUrl: "https://wa.me/50687357321",
  email: "vale.coba.vcp@gmail.com",
  locationUrl: "https://maps.app.goo.gl/endvYHJ5dbaiz6hV6",
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3924.7539286738665!2d-84.50030562425091!3d10.3615498667077!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8fa06f007e63922d%3A0x2cb0f62f38ee922d!2sNails%20Pink%20Palace!5e0!3m2!1ses-419!2scr!4v1790287161479!5m2!1ses-419!2scr",
  address: "Costa Rica",
  description:
    "Servicio profesional en manicura y pedicura. Trabajamos todas las técnicas de uñas de salón (excepto acrílico), diseños personalizados, esmaltado semipermanente sobre uña natural, pedicure Spa + remoción de callos, limpieza e hidratación.",
  openingHour: 8, // 8:00 am
  closingHour: 19, // 7:00 pm (19:00)
  sinpeNumber: "8735-7321",
  sinpeOwner: "Valentina Cobaleda",
};

export function formatCRC(amount: number): string {
  return "₡" + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMins = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function formatTime12h(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "p.m." : "a.m.";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Checks available slots for a given date and service duration.
 * Adheres to:
 * - Working hours: 8:00 AM - 7:00 PM (Mon-Sat)
 * - Sunday: Closed
 * - 2-hour minimum anticipation relative to current time
 * - Conflicting non-cancelled appointments
 */
export function getAvailableSlots(
  dateStr: string, // YYYY-MM-DD
  durationMin: number,
  existingAppointments: Appointment[],
  holidays: string[] = []
): { time: string; available: boolean; reason?: string }[] {
  if (!dateStr) return [];

  // Parse date
  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay(); // 0 is Sunday

  // Sunday is closed
  if (dayOfWeek === 0) {
    return [];
  }

  // Check if holiday
  if (holidays.includes(dateStr)) {
    return [];
  }

  const slots: { time: string; available: boolean; reason?: string }[] = [];
  const now = new Date();
  const minAnticipationTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours minimum

  const startHour = BUSINESS_INFO.openingHour; // 8
  const endHour = BUSINESS_INFO.closingHour; // 19

  // Filter appointments for this date that are not cancelled
  const dayAppointments = existingAppointments.filter(
    (app) => app.date === dateStr && app.status !== "cancelada"
  );

  // Generate slots in 30-minute increments
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      const slotTimeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const slotEndTimeStr = addMinutesToTime(slotTimeStr, durationMin);

      // Check if service finishes after closing time (19:00)
      const [endH, endM] = slotEndTimeStr.split(":").map(Number);
      if (endH > endHour || (endH === endHour && endM > 0)) {
        continue;
      }

      // Check 2-hour anticipation rule
      const slotDateTime = new Date(year, month - 1, day, h, m, 0);
      if (slotDateTime < minAnticipationTime) {
        slots.push({
          time: slotTimeStr,
          available: false,
          reason: "Requiere mínimo 2 horas de anticipación",
        });
        continue;
      }

      // Check overlap with existing appointments
      const slotStartMinutes = h * 60 + m;
      const slotEndMinutes = endH * 60 + endM;

      const hasConflict = dayAppointments.some((app) => {
        const [appStartH, appStartM] = app.time.split(":").map(Number);
        const [appEndH, appEndM] = app.endTime.split(":").map(Number);
        const appStartMin = appStartH * 60 + appStartM;
        const appEndMin = appEndH * 60 + appEndM;

        // Overlap condition
        return slotStartMinutes < appEndMin && slotEndMinutes > appStartMin;
      });

      if (hasConflict) {
        slots.push({
          time: slotTimeStr,
          available: false,
          reason: "Horario ya reservado",
        });
      } else {
        slots.push({
          time: slotTimeStr,
          available: true,
        });
      }
    }
  }

  return slots;
}

/**
 * Formats a date (YYYY-MM-DD) and time (HH:mm) into Costa Rica ISO timezone (UTC-6)
 */
export function formatCostaRicaIso(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00-06:00`;
}

/**
 * Generate Google Calendar Link for client / Valentina with attendee invitation
 */
export function createGoogleCalendarUrl(app: Appointment, inviteValentina: boolean = true): string {
  const dateCompact = app.date.replace(/-/g, "");
  const [startH, startM] = app.time.split(":");
  const [endH, endM] = app.endTime.split(":");
  const startIso = `${dateCompact}T${startH}${startM}00`;
  const endIso = `${dateCompact}T${endH}${endM}00`;

  const title = encodeURIComponent(`💅 Cita Nails Pink Palace: ${app.serviceName} - ${app.clientName}`);
  const details = encodeURIComponent(
    `💅 SERVICIO: ${app.serviceName}\n👤 CLIENTA: ${app.clientName}\n📞 WHATSAPP: ${app.clientPhone}${
      app.clientEmail ? `\n✉️ CORREO: ${app.clientEmail}` : ""
    }\n💰 MONTO: ${formatCRC(app.priceCRC)} (${
      app.paymentMethod === "sinpe" ? "SINPE Móvil (8735-7321)" : "Efectivo"
    })\n⏱️ DURACIÓN: ${app.durationMin} min${app.notes ? `\n📝 NOTAS: ${app.notes}` : ""}\n\n📍 UBICACIÓN: Nails Pink Palace, Costa Rica\n🔗 GOOGLE MAPS: https://maps.app.goo.gl/endvYHJ5dbaiz6hV6\n👩‍🎨 ESTILISTA: Valentina Cobaleda Pallares`
  );
  const location = encodeURIComponent("Nails Pink Palace, Costa Rica");
  const addParam = inviteValentina ? `&add=${encodeURIComponent(BUSINESS_INFO.email)}` : "";

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}${addParam}`;
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Nails Pink Palace - Conexión Automática a Google Calendar
 * Propietaria: Valentina Cobaleda Pallares (vale.coba.vcp@gmail.com)
 *
 * Instrucciones:
 * 1. Abre https://script.google.com con la cuenta vale.coba.vcp@gmail.com
 * 2. Haz clic en "Nuevo proyecto", borra todo y pega este código completo.
 * 3. Haz clic en "Implementar" -> "Nueva implementación".
 * 4. Tipo: "Aplicación web".
 * 5. Ejecutar como: "Yo (vale.coba.vcp@gmail.com)".
 * 6. Quién tiene acceso: "Cualquier persona" (Anyone).
 * 7. Autoriza los permisos de Google Calendar y copia la URL webapp generada.
 * 8. Pégala en el panel de administración de Nails Pink Palace. ¡Las citas se crearán solitas!
 */

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    // Test de conectividad
    if (data.action === "test") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Conexión exitosa con Google Calendar de vale.coba.vcp@gmail.com",
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Obtener el calendario de Valentina
    var calendar = CalendarApp.getCalendarById("vale.coba.vcp@gmail.com") || CalendarApp.getDefaultCalendar();

    var title = "💅 " + (data.serviceName || "Cita Uñas") + " - " + (data.clientName || "Clienta");
    var startTime = new Date(data.startTimeIso);
    var endTime = new Date(data.endTimeIso);

    var description = 
      "💅 SERVICIO: " + (data.serviceName || "No especificado") + "\\n" +
      "👤 CLIENTA: " + (data.clientName || "No especificado") + "\\n" +
      "📞 WHATSAPP: " + (data.clientPhone || "No especificado") + "\\n" +
      (data.clientEmail ? "✉️ CORREO: " + data.clientEmail + "\\n" : "") +
      "💰 MONTO: ₡" + (data.priceCRC || "") + " (" + (data.paymentMethod === "sinpe" ? "SINPE Móvil: 8735-7321" : "Efectivo") + ")\\n" +
      "⏱️ DURACIÓN: " + (data.durationMin || "") + " min\\n" +
      (data.notes ? "📝 NOTAS: " + data.notes + "\\n" : "") +
      "\\n📍 UBICACIÓN: Nails Pink Palace, Costa Rica\\n" +
      "🔗 MAPS: https://maps.app.goo.gl/endvYHJ5dbaiz6hV6";

    var options = {
      description: description,
      location: "Nails Pink Palace, Costa Rica"
    };

    if (data.clientEmail && data.clientEmail.indexOf("@") !== -1) {
      options.guests = data.clientEmail;
      options.sendInvites = true;
    }

    var event = calendar.createEvent(title, startTime, endTime, options);

    try {
      if (CalendarApp.EventColor && CalendarApp.EventColor.MAUVE) {
        event.setColor(CalendarApp.EventColor.MAUVE);
      }
    } catch(err) {}

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      eventId: event.getId(),
      message: "Cita creada automáticamente en el calendario de vale.coba.vcp@gmail.com"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    email: "vale.coba.vcp@gmail.com",
    service: "Nails Pink Palace Google Calendar Automation"
  })).setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * Generate WhatsApp message URL for client or Valentina
 */
export function createWhatsAppMessageUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("506") ? cleanPhone : `506${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Initial sample appointments
 */
export const INITIAL_SAMPLE_APPOINTMENTS: Appointment[] = [
  {
    id: "NPP-001",
    clientName: "Mariana Rojas Solano",
    clientPhone: "88214532",
    clientEmail: "mariana.rojas@ejemplo.cr",
    serviceId: "rubber-base",
    serviceName: "Rubber Base",
    priceCRC: 10000,
    durationMin: 90,
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "10:00",
    endTime: "11:30",
    paymentMethod: "sinpe",
    status: "confirmada",
    notes: "Diseño minimalista con destellos dorados",
    createdAt: new Date().toISOString(),
    notificationsSent: { whatsapp: true, calendar: true, email: true },
  },
  {
    id: "NPP-002",
    clientName: "Valeria Monge Castro",
    clientPhone: "87129044",
    serviceId: "pedicure-spa",
    serviceName: "Pedicure Spa",
    priceCRC: 20000,
    durationMin: 180,
    date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
    time: "14:00",
    endTime: "17:00",
    paymentMethod: "efectivo",
    status: "confirmada",
    notes: "Pedicure spa completo + hidratación",
    createdAt: new Date().toISOString(),
    notificationsSent: { whatsapp: true, calendar: true, email: false },
  },
];
