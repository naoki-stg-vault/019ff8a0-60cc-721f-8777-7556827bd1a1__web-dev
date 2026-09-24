"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  NAIL_SERVICES,
  NailService,
  PaymentMethod,
  Appointment,
  AppointmentStatus,
  BUSINESS_INFO,
  DEFAULT_NOTIFICATIONS,
  NotificationSettings,
  formatCRC,
  formatTime12h,
  addMinutesToTime,
  createGoogleCalendarUrl,
  createWhatsAppMessageUrl,
  INITIAL_SAMPLE_APPOINTMENTS,
} from "@/lib/nails-data";

export default function NailsPinkPalaceAdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("todas");
  const [adminSearch, setAdminSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"citas" | "configuracion">("citas");
  const [savedFeedback, setSavedFeedback] = useState<string>("");

  // New manual appointment modal state
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newServiceId, setNewServiceId] = useState(NAIL_SERVICES[0].id);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>("sinpe");
  const [newNotes, setNewNotes] = useState("");

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const storedApps = localStorage.getItem("npp_appointments");
      if (storedApps) {
        setAppointments(JSON.parse(storedApps));
      } else {
        setAppointments(INITIAL_SAMPLE_APPOINTMENTS);
        localStorage.setItem(
          "npp_appointments",
          JSON.stringify(INITIAL_SAMPLE_APPOINTMENTS)
        );
      }

      const storedNotifs = localStorage.getItem("npp_notification_settings");
      if (storedNotifs) {
        setNotificationSettings(JSON.parse(storedNotifs));
      }
    } catch {
      setAppointments(INITIAL_SAMPLE_APPOINTMENTS);
    }
  }, []);

  const saveAppointments = (newApps: Appointment[]) => {
    setAppointments(newApps);
    try {
      localStorage.setItem("npp_appointments", JSON.stringify(newApps));
    } catch {
      /* ignore */
    }
  };

  const saveNotificationSettings = (newSettings: NotificationSettings) => {
    setNotificationSettings(newSettings);
    try {
      localStorage.setItem(
        "npp_notification_settings",
        JSON.stringify(newSettings)
      );
      showFeedback("Configuración de notificaciones guardada");
    } catch {
      /* ignore */
    }
  };

  const showFeedback = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => {
      setSavedFeedback("");
    }, 3000);
  };

  const handleStatusChange = (
    id: string,
    newStatus: AppointmentStatus
  ) => {
    const updated = appointments.map((app) =>
      app.id === id ? { ...app, status: newStatus } : app
    );
    saveAppointments(updated);
    showFeedback(`Cita marcada como ${newStatus}`);
  };

  const handleDeleteAppointment = (id: string) => {
    if (confirm("¿Estás segura de eliminar permanentemente esta cita del sistema?")) {
      const updated = appointments.filter((app) => app.id !== id);
      saveAppointments(updated);
      showFeedback("Cita eliminada");
    }
  };

  const handleResetSampleData = () => {
    if (confirm("¿Deseas restaurar las citas de ejemplo originales? Se perderán las citas actuales.")) {
      saveAppointments(INITIAL_SAMPLE_APPOINTMENTS);
      showFeedback("Datos de prueba restaurados");
    }
  };

  const handleCreateManualAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim() || !newDate || !newTime) {
      alert("Por favor completa los campos requeridos (nombre, teléfono, fecha y hora).");
      return;
    }

    const service = NAIL_SERVICES.find((s) => s.id === newServiceId) || NAIL_SERVICES[0];
    const endTime = addMinutesToTime(newTime, service.durationMin);

    const newApp: Appointment = {
      id: `NPP-${Date.now().toString().slice(-4)}`,
      clientName: newClientName.trim(),
      clientPhone: newClientPhone.trim(),
      clientEmail: newClientEmail.trim() || undefined,
      serviceId: service.id,
      serviceName: service.name,
      priceCRC: service.priceCRC,
      durationMin: service.durationMin,
      date: newDate,
      time: newTime,
      endTime,
      paymentMethod: newPaymentMethod,
      status: "confirmada",
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      notificationsSent: {
        whatsapp: notificationSettings.whatsapp,
        calendar: notificationSettings.calendar,
        email: notificationSettings.email,
      },
    };

    saveAppointments([newApp, ...appointments]);
    setIsNewAppointmentOpen(false);
    setNewClientName("");
    setNewClientPhone("");
    setNewClientEmail("");
    setNewNotes("");
    showFeedback("Nueva cita agendada exitosamente");
  };

  // Metrics
  const totalAppointments = appointments.length;
  const confirmedAppointments = appointments.filter(
    (a) => a.status === "confirmada"
  ).length;
  const completedAppointments = appointments.filter(
    (a) => a.status === "completada"
  ).length;
  const cancelledAppointments = appointments.filter(
    (a) => a.status === "cancelada"
  ).length;
  const totalEstimatedRevenue = appointments
    .filter((a) => a.status !== "cancelada")
    .reduce((sum, a) => sum + a.priceCRC, 0);
  const uniqueClients = new Set(appointments.map((a) => a.clientPhone)).size;

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (adminStatusFilter !== "todas" && app.status !== adminStatusFilter) {
        return false;
      }
      if (adminSearch.trim()) {
        const query = adminSearch.toLowerCase().trim();
        const matchName = app.clientName.toLowerCase().includes(query);
        const matchPhone = app.clientPhone.includes(query);
        const matchService = app.serviceName.toLowerCase().includes(query);
        const matchNotes = app.notes?.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchService && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [appointments, adminStatusFilter, adminSearch]);

  const sendWhatsAppReminder = (app: Appointment) => {
    const text = `¡Hola ${app.clientName}! Te saludamos de Nails Pink Palace con Valentina. Te recordamos tu cita para *${app.serviceName}* el día *${app.date}* a las *${formatTime12h(app.time)}*.\n\nMonto: ${formatCRC(app.priceCRC)} (${app.paymentMethod === "sinpe" ? "SINPE Móvil: 8735-7321" : "Efectivo"}).\nUbicación: https://maps.app.goo.gl/BqSg3E39qPKYh9vS6?g_st=ic\n\n¿Nos confirmas tu asistencia? ¡Te esperamos!`;
    const url = createWhatsAppMessageUrl(app.clientPhone, text);
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2B2B2B] font-inter antialiased selection:bg-[#E66C7D] selection:text-white">
      {/* Top Banner with back link */}
      <header className="sticky top-0 z-40 bg-[#2B2B2B] text-white border-b border-white/10 shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/nails-pink-palace"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full"
            >
              <span>←</span>
              <span>Sitio Público</span>
            </Link>
            <div className="hidden sm:block h-5 w-px bg-white/20" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-playfair italic text-lg sm:text-xl text-[#E66C7D] font-bold">
                  Nails Pink Palace
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#E66C7D]/20 text-[#E66C7D] border border-[#E66C7D]/30">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-white/60 hidden md:block">
                Panel de Gestión para Valentina Cobaleda Pallares
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsNewAppointmentOpen(true)}
              className="px-4 py-2 rounded-full bg-[#E66C7D] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#d45668] transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
            >
              <span className="text-sm font-bold">+</span>
              <span className="hidden sm:inline">Nueva Cita</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating feedback alert */}
      {savedFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2B2B2B] text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-medium border border-[#E66C7D]/40 flex items-center gap-2.5 animate-bounce">
          <span className="h-2 w-2 rounded-full bg-[#E66C7D]" />
          <span>{savedFeedback}</span>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2B2B2B]/10 pb-4">
          <div>
            <h1 className="font-playfair text-3xl font-bold tracking-tight text-[#2B2B2B]">
              Panel de Administración
            </h1>
            <p className="text-xs text-[#2B2B2B]/60 mt-1">
              Control de citas, clientas y configuración de notificaciones automáticas.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-[#2B2B2B]/10 shadow-sm self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("citas")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === "citas"
                  ? "bg-[#2B2B2B] text-white shadow-sm"
                  : "text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-gray-100"
              }`}
            >
              Citas ({appointments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("configuracion")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === "configuracion"
                  ? "bg-[#2B2B2B] text-white shadow-sm"
                  : "text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-gray-100"
              }`}
            >
              Configuración
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#2B2B2B]/10 shadow-sm">
            <p className="font-inter text-xs uppercase tracking-wider text-[#2B2B2B]/60 font-semibold">
              Total Citas
            </p>
            <p className="font-playfair text-3xl font-bold text-[#2B2B2B] mt-1">
              {totalAppointments}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#2B2B2B]/10 shadow-sm">
            <p className="font-inter text-xs uppercase tracking-wider text-green-700 font-semibold">
              Confirmadas
            </p>
            <p className="font-playfair text-3xl font-bold text-green-600 mt-1">
              {confirmedAppointments}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#2B2B2B]/10 shadow-sm">
            <p className="font-inter text-xs uppercase tracking-wider text-blue-700 font-semibold">
              Completadas
            </p>
            <p className="font-playfair text-3xl font-bold text-blue-600 mt-1">
              {completedAppointments}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#2B2B2B]/10 shadow-sm">
            <p className="font-inter text-xs uppercase tracking-wider text-[#2B2B2B]/60 font-semibold">
              Clientas Únicas
            </p>
            <p className="font-playfair text-3xl font-bold text-[#2B2B2B] mt-1">
              {uniqueClients}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#2B2B2B]/10 shadow-sm col-span-2 lg:col-span-1">
            <p className="font-inter text-xs uppercase tracking-wider text-[#E66C7D] font-semibold">
              Ingresos Est.
            </p>
            <p className="font-playfair text-2xl font-bold text-[#E66C7D] mt-1">
              {formatCRC(totalEstimatedRevenue)}
            </p>
          </div>
        </div>

        {/* TAB 1: CITAS */}
        {activeTab === "citas" && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#2B2B2B]/60 mr-1">
                  Filtrar:
                </span>
                {(
                  [
                    { id: "todas", label: `Todas (${appointments.length})` },
                    {
                      id: "confirmada",
                      label: `Confirmadas (${confirmedAppointments})`,
                    },
                    {
                      id: "completada",
                      label: `Completadas (${completedAppointments})`,
                    },
                    {
                      id: "cancelada",
                      label: `Canceladas (${cancelledAppointments})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAdminStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      adminStatusFilter === tab.id
                        ? "bg-[#2B2B2B] text-white shadow-sm"
                        : "bg-[#FAF6F0] text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Buscar por clienta, tel, servicio..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#E66C7D] transition-colors"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs">
                    🔍
                  </span>
                </div>

                {adminSearch && (
                  <button
                    type="button"
                    onClick={() => setAdminSearch("")}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white rounded-3xl border border-[#2B2B2B]/10 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF6F1] border-b border-gray-200 text-[#2B2B2B]/70 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Cita / Clienta</th>
                      <th className="p-4">Servicio</th>
                      <th className="p-4">Fecha & Hora</th>
                      <th className="p-4">Monto & Pago</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-gray-500">
                          <p className="font-playfair text-lg text-[#2B2B2B]">
                            No se encontraron citas
                          </p>
                          <p className="text-xs mt-1 text-gray-400">
                            Prueba cambiando el filtro o término de búsqueda.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((app) => (
                        <tr
                          key={app.id}
                          className="hover:bg-gray-50/80 transition-colors"
                        >
                          {/* Client */}
                          <td className="p-4">
                            <div className="font-semibold text-[#2B2B2B] text-sm">
                              {app.clientName}
                            </div>
                            <div className="text-[11px] text-[#2B2B2B]/70 mt-0.5">
                              📞 {app.clientPhone}
                            </div>
                            {app.clientEmail && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                ✉ {app.clientEmail}
                              </div>
                            )}
                            {app.notes && (
                              <div className="mt-1 text-[11px] text-[#E66C7D] bg-[#E66C7D]/10 px-2 py-0.5 rounded-md inline-block">
                                📝 {app.notes}
                              </div>
                            )}
                          </td>

                          {/* Service */}
                          <td className="p-4">
                            <div className="font-medium text-[#2B2B2B]">
                              {app.serviceName}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              ⏱ {app.durationMin} min
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="p-4">
                            <div className="font-medium text-[#2B2B2B]">
                              📅 {app.date}
                            </div>
                            <div className="text-[11px] text-gray-500 font-semibold mt-0.5">
                              {formatTime12h(app.time)} – {formatTime12h(app.endTime)}
                            </div>
                          </td>

                          {/* Price & Payment */}
                          <td className="p-4">
                            <div className="font-bold text-[#E66C7D] text-sm">
                              {formatCRC(app.priceCRC)}
                            </div>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-0.5">
                              {app.paymentMethod === "sinpe"
                                ? "📱 SINPE Móvil"
                                : "💵 Efectivo"}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                app.status === "confirmada"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : app.status === "completada"
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  app.status === "confirmada"
                                    ? "bg-green-600"
                                    : app.status === "completada"
                                    ? "bg-blue-600"
                                    : "bg-red-600"
                                }`}
                              />
                              {app.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              {/* Status select dropdown */}
                              <select
                                value={app.status}
                                onChange={(e) =>
                                  handleStatusChange(
                                    app.id,
                                    e.target.value as AppointmentStatus
                                  )
                                }
                                className="p-1.5 rounded-lg border border-gray-200 text-xs bg-white text-[#2B2B2B] hover:border-gray-400 focus:outline-none"
                              >
                                <option value="confirmada">Confirmada</option>
                                <option value="completada">Completada</option>
                                <option value="cancelada">Cancelada</option>
                              </select>

                              {/* WhatsApp Reminder CTA */}
                              <button
                                type="button"
                                onClick={() => sendWhatsAppReminder(app)}
                                title="Enviar recordatorio por WhatsApp a la clienta"
                                className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200"
                              >
                                💬
                              </button>

                              {/* Google Calendar CTA */}
                              <a
                                href={createGoogleCalendarUrl(app)}
                                target="_blank"
                                rel="noreferrer"
                                title="Agregar a Google Calendar"
                                className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 inline-block"
                              >
                                📅
                              </a>

                              {/* Delete CTA */}
                              <button
                                type="button"
                                onClick={() => handleDeleteAppointment(app.id)}
                                title="Eliminar cita"
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer info in table */}
              <div className="p-4 bg-[#FAF6F1] border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
                <span>
                  Mostrando {filteredAppointments.length} de {appointments.length} citas
                </span>
                <button
                  type="button"
                  onClick={handleResetSampleData}
                  className="text-xs text-gray-500 hover:text-gray-800 underline"
                >
                  Restablecer citas de demostración
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURACIÓN */}
        {activeTab === "configuracion" && (
          <div className="space-y-6 max-w-4xl">
            {/* Notification Integrations */}
            <div className="bg-white p-6 rounded-3xl border border-[#2B2B2B]/10 shadow-sm space-y-6">
              <div>
                <h2 className="font-playfair text-xl font-bold text-[#2B2B2B]">
                  Notificaciones Automáticas
                </h2>
                <p className="text-xs text-[#2B2B2B]/60 mt-1">
                  Configura qué canales enviarán confirmaciones y recordatorios cuando una clienta reserve en la página principal.
                </p>
              </div>

              <div className="space-y-4">
                {/* WhatsApp */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-[#FAF6F1]/50 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💬</span>
                      <strong className="text-sm text-[#2B2B2B]">
                        WhatsApp Business API
                      </strong>
                    </div>
                    <p className="text-xs text-[#2B2B2B]/70">
                      Envío instantáneo de comprobante y recordatorio al número de Valentina ({BUSINESS_INFO.phone}) y a la clienta.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={notificationSettings.whatsapp}
                      onChange={(e) =>
                        saveNotificationSettings({
                          ...notificationSettings,
                          whatsapp: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E66C7D]"></div>
                  </label>
                </div>

                {/* Google Calendar */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-[#FAF6F1]/50 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📅</span>
                      <strong className="text-sm text-[#2B2B2B]">
                        Google Calendar
                      </strong>
                    </div>
                    <p className="text-xs text-[#2B2B2B]/70">
                      Sincronización automática de eventos de citas en el calendario de Valentina ({BUSINESS_INFO.email}).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={notificationSettings.calendar}
                      onChange={(e) =>
                        saveNotificationSettings({
                          ...notificationSettings,
                          calendar: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E66C7D]"></div>
                  </label>
                </div>

                {/* Email */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-[#FAF6F1]/50 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">✉️</span>
                      <strong className="text-sm text-[#2B2B2B]">
                        Correo Electrónico
                      </strong>
                    </div>
                    <p className="text-xs text-[#2B2B2B]/70">
                      Envío de correo de confirmación con detalles del servicio a la clienta cuando proporcione email.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={notificationSettings.email}
                      onChange={(e) =>
                        saveNotificationSettings({
                          ...notificationSettings,
                          email: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E66C7D]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Business Information Summary */}
            <div className="bg-white p-6 rounded-3xl border border-[#2B2B2B]/10 shadow-sm space-y-4">
              <h2 className="font-playfair text-xl font-bold text-[#2B2B2B]">
                Datos del Salón
              </h2>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#FAF6F1]">
                  <span className="text-gray-500 block uppercase tracking-wider text-[10px]">
                    Estilista / Propietaria
                  </span>
                  <span className="font-bold text-[#2B2B2B] text-sm">
                    {BUSINESS_INFO.stylist}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF6F1]">
                  <span className="text-gray-500 block uppercase tracking-wider text-[10px]">
                    Teléfono & WhatsApp
                  </span>
                  <span className="font-bold text-[#2B2B2B] text-sm">
                    +506 {BUSINESS_INFO.phone}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF6F1]">
                  <span className="text-gray-500 block uppercase tracking-wider text-[10px]">
                    SINPE Móvil
                  </span>
                  <span className="font-bold text-[#2B2B2B] text-sm">
                    {BUSINESS_INFO.sinpeNumber} ({BUSINESS_INFO.sinpeOwner})
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF6F1]">
                  <span className="text-gray-500 block uppercase tracking-wider text-[10px]">
                    Horario de Atención
                  </span>
                  <span className="font-bold text-[#2B2B2B] text-sm">
                    Lunes a Sábado, 8:00 AM – 7:00 PM
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manual Appointment Modal */}
      {isNewAppointmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#2B2B2B]/10 overflow-hidden my-8">
            <div className="px-6 py-5 bg-[#2B2B2B] text-white flex items-center justify-between">
              <div>
                <p className="font-playfair text-xl text-[#E66C7D] font-bold">
                  Agendar Cita Manual
                </p>
                <p className="text-[11px] text-white/60">
                  Registra citas recibidas directamente por WhatsApp o presencial
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewAppointmentOpen(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualAppointment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Nombre de la clienta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sofia Herrera"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Teléfono celular *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="8888-8888"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@ejemplo.cr"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Servicio *
                </label>
                <select
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E66C7D]"
                >
                  {NAIL_SERVICES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMin} min) — {formatCRC(s.priceCRC)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Hora inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Método de Pago
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value="sinpe"
                      checked={newPaymentMethod === "sinpe"}
                      onChange={() => setNewPaymentMethod("sinpe")}
                      className="accent-[#E66C7D]"
                    />
                    <span>SINPE Móvil</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value="efectivo"
                      checked={newPaymentMethod === "efectivo"}
                      onChange={() => setNewPaymentMethod("efectivo")}
                      className="accent-[#E66C7D]"
                    />
                    <span>Efectivo</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Notas adicionales
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre diseño o solicitud especial..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewAppointmentOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E66C7D] text-white font-semibold hover:bg-[#d45668]"
                >
                  Guardar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
