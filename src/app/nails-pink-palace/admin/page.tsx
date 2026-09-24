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
  getAvailableSlots,
  createGoogleCalendarUrl,
  createWhatsAppMessageUrl,
  INITIAL_SAMPLE_APPOINTMENTS,
} from "@/lib/nails-data";

const PHOTO_PRESETS = [
  {
    name: "Rubber Base",
    url: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Polygel Elegante",
    url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Pedicure Spa",
    url: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Pedicure Ruso",
    url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Gel X Full Set",
    url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Gel con Calcio",
    url: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Extensión Sofisticada",
    url: "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Exfoliación & Masaje",
    url: "https://images.unsplash.com/photo-1512290900672-1f02e078eb14?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Esmaltado Semipermanente",
    url: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Diseño & Arte Pastel",
    url: "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=800&q=80",
  },
];

export default function NailsPinkPalaceAdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<NailService[]>(NAIL_SERVICES);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("todas");
  const [adminSearch, setAdminSearch] = useState<string>("");
  const [serviceCategoryFilter, setServiceCategoryFilter] =
    useState<string>("todos");
  const [activeTab, setActiveTab] = useState<
    "citas" | "servicios" | "configuracion"
  >("citas");
  const [savedFeedback, setSavedFeedback] = useState<string>("");

  // New manual appointment modal
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newServiceId, setNewServiceId] = useState(NAIL_SERVICES[0].id);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newPaymentMethod, setNewPaymentMethod] =
    useState<PaymentMethod>("sinpe");
  const [newNotes, setNewNotes] = useState("");

  // Reschedule appointment modal
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(
    null
  );
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleServiceId, setRescheduleServiceId] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");

  // Service Edit / Create modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState<
    "manicura" | "pedicura" | "cuidado"
  >("manicura");
  const [serviceDurationMin, setServiceDurationMin] = useState(90);
  const [servicePriceCRC, setServicePriceCRC] = useState(10000);
  const [serviceImage, setServiceImage] = useState(PHOTO_PRESETS[0].url);
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePopular, setServicePopular] = useState(false);

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

      const storedServices = localStorage.getItem("npp_services");
      if (storedServices) {
        try {
          const parsed = JSON.parse(storedServices);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setServices(parsed);
          }
        } catch {
          /* ignore */
        }
      } else {
        localStorage.setItem("npp_services", JSON.stringify(NAIL_SERVICES));
      }

      const storedNotifs = localStorage.getItem("npp_notification_settings");
      if (storedNotifs) {
        setNotificationSettings(JSON.parse(storedNotifs));
      }
    } catch {
      setAppointments(INITIAL_SAMPLE_APPOINTMENTS);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "npp_services" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setServices(parsed);
          }
        } catch {
          /* ignore */
        }
      }
      if (e.key === "npp_appointments" && e.newValue) {
        try {
          setAppointments(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const saveAppointments = (newApps: Appointment[]) => {
    setAppointments(newApps);
    try {
      localStorage.setItem("npp_appointments", JSON.stringify(newApps));
    } catch {
      /* ignore */
    }
  };

  const saveServices = (newServices: NailService[]) => {
    setServices(newServices);
    try {
      localStorage.setItem("npp_services", JSON.stringify(newServices));
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
    }, 3500);
  };

  // Appointment Status Changes
  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    const updated = appointments.map((app) =>
      app.id === id ? { ...app, status: newStatus } : app
    );
    saveAppointments(updated);
    showFeedback(`Cita marcada como ${newStatus}`);
  };

  const handleDeleteAppointment = (id: string) => {
    if (
      confirm("¿Estás segura de eliminar permanentemente esta cita del sistema?")
    ) {
      const updated = appointments.filter((app) => app.id !== id);
      saveAppointments(updated);
      showFeedback("Cita eliminada");
    }
  };

  const handleResetSampleData = () => {
    if (
      confirm(
        "¿Deseas restaurar las citas de ejemplo originales? Se perderán las citas actuales."
      )
    ) {
      saveAppointments(INITIAL_SAMPLE_APPOINTMENTS);
      showFeedback("Datos de citas restaurados");
    }
  };

  // Reschedule logic
  const openRescheduleModal = (app: Appointment) => {
    setRescheduleTarget(app);
    setRescheduleDate(app.date);
    setRescheduleTime(app.time);
    setRescheduleServiceId(app.serviceId);
    setRescheduleNotes(app.notes || "");
  };

  const availableRescheduleSlots = useMemo(() => {
    if (!rescheduleTarget || !rescheduleDate) return [];
    const chosenService =
      services.find((s) => s.id === rescheduleServiceId) ||
      services.find((s) => s.id === rescheduleTarget.serviceId) ||
      services[0];
    const otherApps = appointments.filter((a) => a.id !== rescheduleTarget.id);
    return getAvailableSlots(
      rescheduleDate,
      chosenService.durationMin,
      otherApps
    );
  }, [rescheduleTarget, rescheduleDate, rescheduleServiceId, services, appointments]);

  const handleSaveReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) {
      alert("Por favor selecciona una fecha y una hora.");
      return;
    }

    const srv =
      services.find((s) => s.id === rescheduleServiceId) ||
      services.find((s) => s.id === rescheduleTarget.serviceId) ||
      services[0];
    const endTime = addMinutesToTime(rescheduleTime, srv.durationMin);

    const updated = appointments.map((a) =>
      a.id === rescheduleTarget.id
        ? {
            ...a,
            serviceId: srv.id,
            serviceName: srv.name,
            durationMin: srv.durationMin,
            priceCRC: srv.priceCRC,
            date: rescheduleDate,
            time: rescheduleTime,
            endTime,
            status: "confirmada" as const,
            notes: rescheduleNotes.trim()
              ? `${rescheduleNotes.trim()} [Reagendada para ${rescheduleDate} ${rescheduleTime}]`
              : `Reagendada para ${rescheduleDate} a las ${rescheduleTime}`,
          }
        : a
    );

    saveAppointments(updated);

    // Prepare notification link
    const notifyClient = confirm(
      `¡Cita reagendada exitosamente!\n\n¿Deseas abrir WhatsApp para enviarle la confirmación del nuevo horario a ${rescheduleTarget.clientName}?`
    );

    if (notifyClient) {
      const text = `¡Hola ${rescheduleTarget.clientName}! Te saludamos de Nails Pink Palace con Valentina. Te confirmamos que tu cita para *${srv.name}* ha sido reagendada para el día *${rescheduleDate}* a las *${formatTime12h(rescheduleTime)}*.\n\nMonto: ${formatCRC(srv.priceCRC)} (${rescheduleTarget.paymentMethod === "sinpe" ? "SINPE Móvil: 8735-7321" : "Efectivo"}).\nUbicación: https://maps.app.goo.gl/BqSg3E39qPKYh9vS6?g_st=ic\n\n¡Te esperamos con gusto!`;
      const url = createWhatsAppMessageUrl(rescheduleTarget.clientPhone, text);
      window.open(url, "_blank");
    }

    setRescheduleTarget(null);
    showFeedback("Cita reagendada con éxito");
  };

  // Service Catalog Actions
  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceName("");
    setServiceCategory("manicura");
    setServiceDurationMin(90);
    setServicePriceCRC(12000);
    setServiceImage(PHOTO_PRESETS[0].url);
    setServiceDescription("");
    setServicePopular(false);
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (service: NailService) => {
    setEditingServiceId(service.id);
    setServiceName(service.name);
    setServiceCategory(service.category);
    setServiceDurationMin(service.durationMin);
    setServicePriceCRC(service.priceCRC);
    setServiceImage(service.image);
    setServiceDescription(service.description);
    setServicePopular(Boolean(service.popular));
    setIsServiceModalOpen(true);
  };

  const handleDeleteService = (id: string) => {
    if (services.length <= 1) {
      alert("Debes mantener al menos un servicio en el catálogo.");
      return;
    }
    const target = services.find((s) => s.id === id);
    if (
      confirm(
        `¿Estás segura de eliminar el servicio "${target?.name}" del catálogo público?`
      )
    ) {
      const updated = services.filter((s) => s.id !== id);
      saveServices(updated);
      showFeedback(`Servicio "${target?.name}" eliminado`);
    }
  };

  const handleResetDefaultServices = () => {
    if (
      confirm(
        "¿Deseas restaurar el catálogo predeterminado de 9 servicios originales? Se sobreescribirán los cambios."
      )
    ) {
      saveServices(NAIL_SERVICES);
      showFeedback("Catálogo de servicios restaurado al predeterminado");
    }
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !serviceDescription.trim() || !serviceImage.trim()) {
      alert("Por favor completa el nombre, descripción y URL de foto.");
      return;
    }

    if (editingServiceId) {
      // Update existing
      const updated = services.map((s) =>
        s.id === editingServiceId
          ? {
              ...s,
              name: serviceName.trim(),
              category: serviceCategory,
              durationMin: Number(serviceDurationMin),
              priceCRC: Number(servicePriceCRC),
              image: serviceImage.trim(),
              description: serviceDescription.trim(),
              popular: servicePopular,
            }
          : s
      );
      saveServices(updated);
      showFeedback(`Servicio "${serviceName.trim()}" actualizado`);
    } else {
      // Create new
      const newId =
        serviceName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 30) + `-${Date.now().toString().slice(-4)}`;

      const newSrv: NailService = {
        id: newId,
        name: serviceName.trim(),
        category: serviceCategory,
        durationMin: Number(serviceDurationMin),
        priceCRC: Number(servicePriceCRC),
        image: serviceImage.trim(),
        description: serviceDescription.trim(),
        popular: servicePopular,
      };

      saveServices([...services, newSrv]);
      showFeedback(`Nuevo servicio "${newSrv.name}" agregado al catálogo`);
    }

    setIsServiceModalOpen(false);
  };

  // Manual appointment creation
  const handleCreateManualAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim() || !newDate || !newTime) {
      alert("Por favor completa los campos requeridos (nombre, teléfono, fecha y hora).");
      return;
    }

    const service = services.find((s) => s.id === newServiceId) || services[0];
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

  // Filtered services in catalog
  const filteredServices = useMemo(() => {
    if (serviceCategoryFilter === "todos") return services;
    return services.filter((s) => s.category === serviceCategoryFilter);
  }, [services, serviceCategoryFilter]);

  const sendWhatsAppReminder = (app: Appointment) => {
    const text = `¡Hola ${app.clientName}! Te saludamos de Nails Pink Palace con Valentina. Te recordamos tu cita para *${app.serviceName}* el día *${app.date}* a las *${formatTime12h(app.time)}*.\n\nMonto: ${formatCRC(app.priceCRC)} (${app.paymentMethod === "sinpe" ? "SINPE Móvil: 8735-7321" : "Efectivo"}).\nUbicación: https://maps.app.goo.gl/BqSg3E39qPKYh9vS6?g_st=ic\n\n¿Nos confirmas tu asistencia? ¡Te esperamos!`;
    const url = createWhatsAppMessageUrl(app.clientPhone, text);
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2B2B2B] font-inter antialiased selection:bg-[#E66C7D] selection:text-white pb-20">
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
                  Panel Admin
                </span>
              </div>
              <p className="text-[11px] text-white/60 hidden md:block">
                Gestión de Citas, Reagendación y Catálogo para Valentina Cobaleda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "servicios" ? (
              <button
                type="button"
                onClick={handleOpenAddService}
                className="px-4 py-2 rounded-full bg-[#E66C7D] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#d45668] transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
              >
                <span className="text-sm font-bold">+</span>
                <span>Nuevo Servicio</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsNewAppointmentOpen(true)}
                className="px-4 py-2 rounded-full bg-[#E66C7D] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#d45668] transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
              >
                <span className="text-sm font-bold">+</span>
                <span>Agendar Cita</span>
              </button>
            )}
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
              Control total de citas, reagendaciones y edición del catálogo visible en la web.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#2B2B2B]/10 shadow-sm self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab("citas")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === "citas"
                  ? "bg-[#2B2B2B] text-white shadow-sm"
                  : "text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-gray-100"
              }`}
            >
              📅 Citas ({appointments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("servicios")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === "servicios"
                  ? "bg-[#2B2B2B] text-white shadow-sm"
                  : "text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-gray-100"
              }`}
            >
              💅 Catálogo ({services.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("configuracion")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === "configuracion"
                  ? "bg-[#2B2B2B] text-white shadow-sm"
                  : "text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-gray-100"
              }`}
            >
              ⚙️ Configuración
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: CITAS & REAGENDACIÓN                                         */}
        {/* =================================================================== */}
        {activeTab === "citas" && (
          <div className="space-y-6">
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
                      <th className="p-4 text-right">Acciones & Reagendar</th>
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
                              <div className="mt-1 text-[11px] text-[#E66C7D] bg-[#E66C7D]/10 px-2 py-0.5 rounded-md inline-block max-w-xs truncate">
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
                            <div className="font-semibold text-[#2B2B2B]">
                              📅 {app.date}
                            </div>
                            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
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

                          {/* Actions: Reagendar & Status */}
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2 flex-wrap">
                              {/* REAGENDAR BUTTON */}
                              <button
                                type="button"
                                onClick={() => openRescheduleModal(app)}
                                title="Reagendar fecha u hora de esta cita"
                                className="px-3 py-1.5 rounded-lg bg-[#E66C7D]/10 hover:bg-[#E66C7D]/20 text-[#E66C7D] font-semibold text-xs border border-[#E66C7D]/30 transition-all flex items-center gap-1"
                              >
                                <span>🗓️</span>
                                <span>Reagendar</span>
                              </button>

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

        {/* =================================================================== */}
        {/* TAB 2: CATÁLOGO DE SERVICIOS (EDITABLE EN TODO)                     */}
        {/* =================================================================== */}
        {activeTab === "servicios" && (
          <div className="space-y-6">
            {/* Header / Category Filters for Catalog */}
            <div className="bg-white p-5 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#2B2B2B]/60 mr-1">
                  Categoría:
                </span>
                {[
                  { id: "todos", label: "Todos los servicios" },
                  { id: "manicura", label: "Manicura" },
                  { id: "pedicura", label: "Pedicura" },
                  { id: "cuidado", label: "Cuidado & Spa" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setServiceCategoryFilter(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      serviceCategoryFilter === c.id
                        ? "bg-[#2B2B2B] text-white shadow-sm"
                        : "bg-[#FAF6F0] text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-gray-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddService}
                  className="px-4 py-2 rounded-xl bg-[#E66C7D] text-white text-xs font-semibold hover:bg-[#d45668] transition-all shadow-sm"
                >
                  + Agregar Nuevo Servicio
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaultServices}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Restablecer Predeterminados
                </button>
              </div>
            </div>

            {/* Services Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-3xl border border-[#2B2B2B]/10 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Image with overlay badge */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={service.image}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full font-playfair text-sm font-bold text-[#E66C7D] shadow-sm">
                        {formatCRC(service.priceCRC)}
                      </div>
                      {service.popular && (
                        <div className="absolute top-3 left-3 bg-[#E66C7D] text-white px-2.5 py-0.5 rounded-full font-inter text-[10px] uppercase tracking-wider font-semibold shadow-sm">
                          ⭐ Favorito
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {service.category}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          ⏱ {service.durationMin} min
                        </span>
                      </div>

                      <h3 className="font-playfair text-lg font-bold text-[#2B2B2B] leading-tight">
                        {service.name}
                      </h3>

                      <p className="text-xs text-[#2B2B2B]/70 line-clamp-3 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-5 pt-0 flex items-center justify-between border-t border-gray-100 mt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditService(service)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B2B2B] hover:text-[#E66C7D] transition-colors py-2"
                    >
                      <span>✏️</span>
                      <span>Editar Servicio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteService(service.id)}
                      className="text-xs text-red-500 hover:text-red-700 py-2 transition-colors"
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CONFIGURACIÓN                                                */}
        {/* =================================================================== */}
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

      {/* =================================================================== */}
      {/* MODAL: REAGENDAR CITA                                               */}
      {/* =================================================================== */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#2B2B2B]/10 overflow-hidden my-8">
            <div className="px-6 py-5 bg-[#2B2B2B] text-white flex items-center justify-between">
              <div>
                <p className="font-playfair text-xl text-[#E66C7D] font-bold">
                  Reagendar Cita
                </p>
                <p className="text-[11px] text-white/60">
                  Clienta: {rescheduleTarget.clientName} (📞 {rescheduleTarget.clientPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReschedule} className="p-6 space-y-4 text-xs">
              {/* Current details box */}
              <div className="p-3.5 bg-[#FAF6F1] rounded-2xl border border-[#2B2B2B]/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Horario actual programado:
                </span>
                <p className="font-bold text-[#2B2B2B] text-sm">
                  📅 {rescheduleTarget.date} · ⏱ {formatTime12h(rescheduleTarget.time)} – {formatTime12h(rescheduleTarget.endTime)}
                </p>
                <p className="text-gray-600">
                  Servicio: <strong>{rescheduleTarget.serviceName}</strong> ({formatCRC(rescheduleTarget.priceCRC)})
                </p>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Servicio a realizar
                </label>
                <select
                  value={rescheduleServiceId}
                  onChange={(e) => {
                    setRescheduleServiceId(e.target.value);
                    setRescheduleTime("");
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E66C7D]"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMin} min) — {formatCRC(s.priceCRC)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date selection */}
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Nueva Fecha *
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleTime("");
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              {/* Time selection */}
              {rescheduleDate && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-[#2B2B2B]">
                      Nueva Hora *
                    </label>
                    <span className="text-[10px] text-gray-500">
                      (8:00 AM – 7:00 PM)
                    </span>
                  </div>

                  {availableRescheduleSlots.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      No hay horarios automáticos disponibles para este día (domingo cerrado o agenda llena). Puedes ingresar la hora manual abajo:
                      <input
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="mt-2 w-full p-2 rounded-lg border border-amber-300 bg-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-gray-100 rounded-xl">
                        {availableRescheduleSlots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setRescheduleTime(slot.time)}
                            className={`p-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                              !slot.available
                                ? "opacity-40 bg-gray-100 border-gray-200 cursor-not-allowed text-gray-400"
                                : rescheduleTime === slot.time
                                ? "bg-[#E66C7D] text-white border-[#E66C7D] shadow-sm"
                                : "bg-white text-[#2B2B2B] border-gray-200 hover:border-[#E66C7D]"
                            }`}
                          >
                            {formatTime12h(slot.time)}
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-gray-400 text-[11px]">O especificar hora exacta:</span>
                        <input
                          type="time"
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                          className="p-1 rounded-lg border border-gray-200 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Notas / Motivo de reagendación
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio solicitado por clienta vía WhatsApp"
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRescheduleTarget(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!rescheduleDate || !rescheduleTime}
                  className="px-5 py-2 rounded-xl bg-[#E66C7D] text-white font-semibold hover:bg-[#d45668] disabled:opacity-50 transition-all shadow-sm"
                >
                  Guardar Reagendación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDITAR / CREAR SERVICIO                                      */}
      {/* =================================================================== */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#2B2B2B]/10 overflow-hidden my-8">
            <div className="px-6 py-5 bg-[#2B2B2B] text-white flex items-center justify-between">
              <div>
                <p className="font-playfair text-xl text-[#E66C7D] font-bold">
                  {editingServiceId ? "Editar Servicio" : "Agregar Nuevo Servicio"}
                </p>
                <p className="text-[11px] text-white/60">
                  Los cambios se reflejarán de inmediato en el catálogo y reservas del sitio público.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Nombre del Servicio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Rubber Base Glow"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Categoría *
                  </label>
                  <select
                    value={serviceCategory}
                    onChange={(e) =>
                      setServiceCategory(
                        e.target.value as "manicura" | "pedicura" | "cuidado"
                      )
                    }
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E66C7D]"
                  >
                    <option value="manicura">Manicura</option>
                    <option value="pedicura">Pedicura</option>
                    <option value="cuidado">Cuidado / Spa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Duración (minutos) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      required
                      min={15}
                      step={15}
                      value={serviceDurationMin}
                      onChange={(e) => setServiceDurationMin(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                    />
                    <span className="text-gray-500 whitespace-nowrap">min</span>
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {[60, 90, 120, 180].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setServiceDurationMin(m)}
                        className={`px-2 py-0.5 rounded text-[10px] border ${
                          serviceDurationMin === m
                            ? "bg-[#2B2B2B] text-white"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Precio en Colones (CRC) *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold">₡</span>
                    <input
                      type="number"
                      required
                      min={1000}
                      step={500}
                      value={servicePriceCRC}
                      onChange={(e) => setServicePriceCRC(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                    />
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {[8000, 10000, 12000, 15000, 18000, 20000].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setServicePriceCRC(p)}
                        className={`px-2 py-0.5 rounded text-[10px] border ${
                          servicePriceCRC === p
                            ? "bg-[#2B2B2B] text-white"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        ₡{p / 1000}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo / Image URL with Preview */}
              <div className="space-y-2">
                <label className="block font-semibold text-[#2B2B2B]">
                  Foto del Servicio (URL de imagen) *
                </label>
                <div className="flex gap-4 items-start">
                  <div className="w-28 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={serviceImage}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          PHOTO_PRESETS[0].url;
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="url"
                      required
                      placeholder="https://images.unsplash.com/..."
                      value={serviceImage}
                      onChange={(e) => setServiceImage(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D] text-xs"
                    />
                    <p className="text-[10px] text-gray-500">
                      Pega cualquier URL de imagen o selecciona una foto de nuestra galería predeterminada:
                    </p>
                  </div>
                </div>

                {/* Preset Photo Selectors */}
                <div className="p-2.5 bg-[#FAF6F1] rounded-xl space-y-1.5 border border-[#2B2B2B]/10">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Fotos de Uñas Rápidas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PHOTO_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setServiceImage(preset.url)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                          serviceImage === preset.url
                            ? "bg-[#E66C7D] text-white border-[#E66C7D]"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Descripción del Servicio *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalles sobre beneficios, acabado y técnicas empleadas..."
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              {/* Popular Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="popularCheck"
                  checked={servicePopular}
                  onChange={(e) => setServicePopular(e.target.checked)}
                  className="h-4 w-4 accent-[#E66C7D] rounded cursor-pointer"
                />
                <label
                  htmlFor="popularCheck"
                  className="font-medium text-[#2B2B2B] cursor-pointer"
                >
                  Marcar como servicio &quot;⭐ Favorito / Destacado&quot; en la página principal
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E66C7D] text-white font-semibold hover:bg-[#d45668] transition-all shadow-sm"
                >
                  {editingServiceId ? "Guardar Cambios" : "Crear Servicio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: AGENDAR CITA MANUAL                                          */}
      {/* =================================================================== */}
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

            <form
              onSubmit={handleCreateManualAppointment}
              className="p-6 space-y-4 text-xs"
            >
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
                  {services.map((s) => (
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
