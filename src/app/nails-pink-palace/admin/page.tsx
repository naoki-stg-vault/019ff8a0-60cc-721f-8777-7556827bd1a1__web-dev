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
import {
  Search,
  Phone,
  Mail,
  FileText,
  Clock,
  Calendar,
  Smartphone,
  Banknote,
  MessageCircle,
  Trash2,
  Pencil,
  Star,
  X,
  Plus,
  ArrowUpRight,
} from "lucide-react";

const IMAGE_PRESETS = [
  {
    name: "Rubber Base",
    url: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Polygel",
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
    name: "Gel X",
    url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Gel Calcio",
    url: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Extensión",
    url: "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Semipermanente",
    url: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Nail Art",
    url: "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=800&q=80",
  },
];

export default function NailsPinkPalaceAdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<NailService[]>(NAIL_SERVICES);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<"citas" | "servicios" | "configuracion">("citas");
  const [savedFeedback, setSavedFeedback] = useState<string>("");

  // Appointments Filters
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("todas");
  const [adminSearch, setAdminSearch] = useState<string>("");

  // Services Filters
  const [servicesCategoryFilter, setServicesCategoryFilter] = useState<string>("todas");
  const [servicesSearch, setServicesSearch] = useState<string>("");

  // Manual appointment modal
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>("sinpe");
  const [newNotes, setNewNotes] = useState("");

  // Reschedule appointment modal
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleServiceId, setRescheduleServiceId] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");

  // Service Edit / Create modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null); // null = new service
  const [serviceFormName, setServiceFormName] = useState("");
  const [serviceFormCategory, setServiceFormCategory] = useState<"manicura" | "pedicura" | "cuidado">("manicura");
  const [serviceFormDuration, setServiceFormDuration] = useState<number>(90);
  const [serviceFormPrice, setServiceFormPrice] = useState<number>(10000);
  const [serviceFormDescription, setServiceFormDescription] = useState("");
  const [serviceFormImage, setServiceFormImage] = useState(IMAGE_PRESETS[0].url);
  const [serviceFormPopular, setServiceFormPopular] = useState(false);

  // Today string for min dates
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      // 1. Appointments
      const storedApps = localStorage.getItem("npp_appointments");
      if (storedApps) {
        setAppointments(JSON.parse(storedApps));
      } else {
        setAppointments(INITIAL_SAMPLE_APPOINTMENTS);
        localStorage.setItem("npp_appointments", JSON.stringify(INITIAL_SAMPLE_APPOINTMENTS));
      }

      // 2. Services
      const storedServices = localStorage.getItem("npp_services");
      if (storedServices) {
        const parsed = JSON.parse(storedServices);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setServices(parsed);
          setNewServiceId(parsed[0].id);
        }
      } else {
        localStorage.setItem("npp_services", JSON.stringify(NAIL_SERVICES));
        setNewServiceId(NAIL_SERVICES[0].id);
      }

      // 3. Notification settings
      const storedNotifs = localStorage.getItem("npp_notification_settings");
      if (storedNotifs) {
        setNotificationSettings(JSON.parse(storedNotifs));
      }
    } catch {
      setAppointments(INITIAL_SAMPLE_APPOINTMENTS);
      setServices(NAIL_SERVICES);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "npp_services" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setServices(parsed);
          }
        } catch { /* ignore */ }
      }
      if (e.key === "npp_appointments" && e.newValue) {
        try {
          setAppointments(JSON.parse(e.newValue));
        } catch { /* ignore */ }
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
      localStorage.setItem("npp_notification_settings", JSON.stringify(newSettings));
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

  // Appointment Actions
  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
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
      showFeedback("Datos de citas restaurados");
    }
  };

  // Rescheduling logic
  const openRescheduleModal = (app: Appointment) => {
    setRescheduleTarget(app);
    setRescheduleDate(app.date);
    setRescheduleTime(app.time);
    setRescheduleServiceId(app.serviceId);
    setRescheduleNotes(app.notes || "");
  };

  const rescheduleAvailableSlots = useMemo(() => {
    if (!rescheduleTarget || !rescheduleDate) return [];
    const activeSrv = services.find((s) => s.id === rescheduleServiceId) || services[0];
    // Exclude the current appointment from overlap conflict
    const otherAppointments = appointments.filter((a) => a.id !== rescheduleTarget.id);
    return getAvailableSlots(rescheduleDate, activeSrv.durationMin, otherAppointments);
  }, [rescheduleTarget, rescheduleDate, rescheduleServiceId, services, appointments]);

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) {
      alert("Por favor selecciona la nueva fecha y hora.");
      return;
    }

    const service = services.find((s) => s.id === rescheduleServiceId) || services[0];
    const endTime = addMinutesToTime(rescheduleTime, service.durationMin);

    const updated = appointments.map((app) => {
      if (app.id === rescheduleTarget.id) {
        return {
          ...app,
          serviceId: service.id,
          serviceName: service.name,
          priceCRC: service.priceCRC,
          durationMin: service.durationMin,
          date: rescheduleDate,
          time: rescheduleTime,
          endTime,
          status: "confirmada" as const,
          notes: rescheduleNotes.trim()
            ? `${rescheduleNotes.trim()} (Reagendada para el ${rescheduleDate} a las ${formatTime12h(rescheduleTime)})`
            : `Reagendada para el ${rescheduleDate} a las ${formatTime12h(rescheduleTime)}`,
        };
      }
      return app;
    });

    saveAppointments(updated);
    const updatedApp = updated.find((a) => a.id === rescheduleTarget.id)!;
    setRescheduleTarget(null);
    showFeedback(`Cita de ${updatedApp.clientName} reagendada con éxito`);
  };

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

  // Service Management actions
  const openNewServiceModal = () => {
    setEditingServiceId(null);
    setServiceFormName("");
    setServiceFormCategory("manicura");
    setServiceFormDuration(90);
    setServiceFormPrice(12000);
    setServiceFormDescription("");
    setServiceFormImage(IMAGE_PRESETS[0].url);
    setServiceFormPopular(false);
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (service: NailService) => {
    setEditingServiceId(service.id);
    setServiceFormName(service.name);
    setServiceFormCategory(service.category);
    setServiceFormDuration(service.durationMin);
    setServiceFormPrice(service.priceCRC);
    setServiceFormDescription(service.description);
    setServiceFormImage(service.image);
    setServiceFormPopular(Boolean(service.popular));
    setIsServiceModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormName.trim() || !serviceFormImage.trim() || serviceFormPrice <= 0 || serviceFormDuration <= 0) {
      alert("Por favor completa todos los campos del servicio con valores válidos.");
      return;
    }

    if (editingServiceId) {
      // Edit existing
      const updated = services.map((s) =>
        s.id === editingServiceId
          ? {
              ...s,
              name: serviceFormName.trim(),
              category: serviceFormCategory,
              durationMin: Number(serviceFormDuration),
              priceCRC: Number(serviceFormPrice),
              description: serviceFormDescription.trim(),
              image: serviceFormImage.trim(),
              popular: serviceFormPopular,
            }
          : s
      );
      saveServices(updated);
      showFeedback(`Servicio "${serviceFormName}" actualizado con éxito`);
    } else {
      // Create new
      const newId = `srv-${Date.now()}`;
      const newService: NailService = {
        id: newId,
        name: serviceFormName.trim(),
        category: serviceFormCategory,
        durationMin: Number(serviceFormDuration),
        priceCRC: Number(serviceFormPrice),
        description: serviceFormDescription.trim(),
        image: serviceFormImage.trim(),
        popular: serviceFormPopular,
      };
      saveServices([...services, newService]);
      showFeedback(`Servicio "${serviceFormName}" agregado al catálogo`);
    }

    setIsServiceModalOpen(false);
  };

  const handleDeleteService = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    if (confirm(`¿Estás segura de eliminar el servicio "${service.name}" del catálogo? Las clientas ya no podrán reservarlo.`)) {
      const updated = services.filter((s) => s.id !== serviceId);
      saveServices(updated);
      showFeedback(`Servicio "${service.name}" eliminado`);
    }
  };

  const handleResetDefaultServices = () => {
    if (confirm("¿Deseas restablecer el catálogo de servicios a los valores predeterminados originales? Se descartarán las modificaciones personalizadas.")) {
      saveServices(NAIL_SERVICES);
      showFeedback("Catálogo de servicios restablecido a los originales");
    }
  };

  // Metrics
  const totalAppointments = appointments.length;
  const confirmedAppointments = appointments.filter((a) => a.status === "confirmada").length;
  const completedAppointments = appointments.filter((a) => a.status === "completada").length;
  const cancelledAppointments = appointments.filter((a) => a.status === "cancelada").length;
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

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (servicesCategoryFilter !== "todas" && s.category !== servicesCategoryFilter) {
        return false;
      }
      if (servicesSearch.trim()) {
        const query = servicesSearch.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(query);
        const matchDesc = s.description.toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [services, servicesCategoryFilter, servicesSearch]);

  const sendWhatsAppReminder = (app: Appointment) => {
    const text = `¡Hola ${app.clientName}! Te saludamos de Nails Pink Palace con Valentina. Te recordamos tu cita para *${app.serviceName}* el día *${app.date}* a las *${formatTime12h(app.time)}*.\n\nMonto: ${formatCRC(app.priceCRC)} (${app.paymentMethod === "sinpe" ? "SINPE Móvil: 8735-7321" : "Efectivo"}).\nUbicación: https://maps.app.goo.gl/BqSg3E39qPKYh9vS6?g_st=ic\n\n¿Nos confirmas tu asistencia? ¡Te esperamos!`;
    const url = createWhatsAppMessageUrl(app.clientPhone, text);
    window.open(url, "_blank");
  };

  const sendWhatsAppRescheduleConfirmation = (app: Appointment) => {
    const text = `¡Hola ${app.clientName}! Te confirmamos que tu cita en Nails Pink Palace para *${app.serviceName}* ha sido *reagendada* con éxito para el día *${app.date}* a las *${formatTime12h(app.time)}*.\n\nDuración estimada: ${app.durationMin} min.\nMonto: ${formatCRC(app.priceCRC)} (${app.paymentMethod === "sinpe" ? "SINPE Móvil: 8735-7321" : "Efectivo"}).\nUbicación: https://maps.app.goo.gl/BqSg3E39qPKYh9vS6?g_st=ic\n\n¡Cualquier consulta estamos a la orden!`;
    const url = createWhatsAppMessageUrl(app.clientPhone, text);
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2B2B2B] font-inter antialiased selection:bg-[#E66C7D] selection:text-white">
      {/* Top Banner */}
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
                  Panel de Administración
                </span>
              </div>
              <p className="text-[11px] text-white/60 hidden md:block">
                Gestión integral de citas y catálogo para Valentina Cobaleda Pallares
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === "servicios" ? (
              <button
                type="button"
                onClick={openNewServiceModal}
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
                <span>Nueva Cita</span>
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
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2B2B2B]/10 pb-4">
          <div>
            <h1 className="font-playfair text-3xl font-bold tracking-tight text-[#2B2B2B]">
              {activeTab === "citas" && "Gestión de Citas"}
              {activeTab === "servicios" && "Catálogo de Servicios"}
              {activeTab === "configuracion" && "Configuración de Notificaciones"}
            </h1>
            <p className="text-xs text-[#2B2B2B]/60 mt-1">
              {activeTab === "citas" && "Revisa, agenda, reagenda y administra las reservas de tus clientas."}
              {activeTab === "servicios" && "Edita fotos, precios, duración y descripciones que se muestran en el sitio web."}
              {activeTab === "configuracion" && "Ajusta las notificaciones de WhatsApp, Google Calendar y correos."}
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
              onClick={() => setActiveTab("servicios")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === "servicios"
                  ? "bg-[#2B2B2B] text-white shadow-sm"
                  : "text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-gray-100"
              }`}
            >
              Servicios ({services.length})
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

        {/* TAB 1: CITAS */}
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
                    { id: "confirmada", label: `Confirmadas (${confirmedAppointments})` },
                    { id: "completada", label: `Completadas (${completedAppointments})` },
                    { id: "cancelada", label: `Canceladas (${cancelledAppointments})` },
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
                  <span className="absolute left-3 top-2.5 text-gray-400">
                    <Search className="w-4 h-4" />
                  </span>
                </div>

                {adminSearch && (
                  <button
                    type="button"
                    onClick={() => setAdminSearch("")}
                    className="text-xs text-gray-400 hover:text-gray-600 p-1"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
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
                            <div className="text-[11px] text-[#2B2B2B]/70 mt-0.5 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-[#2B2B2B]/60 shrink-0" />
                              <span>{app.clientPhone}</span>
                            </div>
                            {app.clientEmail && (
                              <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                <span>{app.clientEmail}</span>
                              </div>
                            )}
                            {app.notes && (
                              <div className="mt-1 text-[11px] text-[#E66C7D] bg-[#E66C7D]/10 px-2 py-0.5 rounded-md inline-flex items-center gap-1 max-w-xs break-words">
                                <FileText className="w-3 h-3 shrink-0" />
                                <span>{app.notes}</span>
                              </div>
                            )}
                          </td>

                          {/* Service */}
                          <td className="p-4">
                            <div className="font-medium text-[#2B2B2B]">
                              {app.serviceName}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{app.durationMin} min</span>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="p-4">
                            <div className="font-medium text-[#2B2B2B] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#2B2B2B]/70 shrink-0" />
                              <span>{app.date}</span>
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
                              {app.paymentMethod === "sinpe" ? (
                                <span className="inline-flex items-center gap-1">
                                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                                  <span>SINPE Móvil</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Efectivo</span>
                                </span>
                              )}
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
                              {/* Reagendar button */}
                              <button
                                type="button"
                                onClick={() => openRescheduleModal(app)}
                                title="Reagendar fecha u hora de esta cita"
                                className="px-2.5 py-1.5 rounded-lg bg-[#E66C7D]/10 text-[#E66C7D] hover:bg-[#E66C7D] hover:text-white transition-all font-semibold flex items-center gap-1.5 border border-[#E66C7D]/30"
                              >
                                <Calendar className="w-3.5 h-3.5" />
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
                                className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200 flex items-center justify-center"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              {/* Google Calendar CTA */}
                              <a
                                href={createGoogleCalendarUrl(app)}
                                target="_blank"
                                rel="noreferrer"
                                title="Agregar a Google Calendar"
                                className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 inline-flex items-center justify-center"
                              >
                                <Calendar className="w-4 h-4" />
                              </a>

                              {/* Delete CTA */}
                              <button
                                type="button"
                                onClick={() => handleDeleteAppointment(app.id)}
                                title="Eliminar cita"
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
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

        {/* TAB 2: SERVICIOS */}
        {activeTab === "servicios" && (
          <div className="space-y-6">
            {/* Header controls for services */}
            <div className="bg-white p-5 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#2B2B2B]/60 mr-1">
                  Categoría:
                </span>
                {(
                  [
                    { id: "todas", label: `Todos (${services.length})` },
                    { id: "manicura", label: `Manicura (${services.filter((s) => s.category === "manicura").length})` },
                    { id: "pedicura", label: `Pedicura (${services.filter((s) => s.category === "pedicura").length})` },
                    { id: "cuidado", label: `Cuidado (${services.filter((s) => s.category === "cuidado").length})` },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setServicesCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      servicesCategoryFilter === cat.id
                        ? "bg-[#2B2B2B] text-white shadow-sm"
                        : "bg-[#FAF6F0] text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-gray-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Buscar servicio..."
                    value={servicesSearch}
                    onChange={(e) => setServicesSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#E66C7D] transition-colors"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs">
                    <Search className="w-4 h-4" />
                  </span>
                </div>

                <button
                  type="button"
                  onClick={openNewServiceModal}
                  className="px-4 py-2 rounded-xl bg-[#E66C7D] text-white text-xs font-semibold hover:bg-[#d45668] transition-all whitespace-nowrap inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Servicio</span>
                </button>
              </div>
            </div>

            {/* Services Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-3xl overflow-hidden border border-[#2B2B2B]/10 hover:border-[#E66C7D]/40 transition-all shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Image with category & price badge */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={service.image}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full font-playfair text-sm font-bold text-[#E66C7D] shadow-sm">
                        {formatCRC(service.priceCRC)}
                      </div>
                      <div className="absolute top-3 left-3 flex gap-1">
                        <span className="bg-[#2B2B2B]/85 text-white px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
                          {service.category}
                        </span>
                        {service.popular && (
                          <span className="bg-[#E66C7D] text-white px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>Favorito</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-playfair text-lg font-bold text-[#2B2B2B]">
                          {service.name}
                        </h3>
                        <span className="text-xs text-[#2B2B2B]/70 font-medium inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#2B2B2B]/60 shrink-0" />
                          <span>{service.durationMin} min</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#2B2B2B]/70 line-clamp-2">
                        {service.description || "Sin descripción"}
                      </p>
                    </div>
                  </div>

                  {/* Service actions */}
                  <div className="p-5 pt-0 border-t border-gray-100 mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openEditServiceModal(service)}
                      className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-[#E66C7D] hover:text-white transition-colors text-xs font-semibold text-[#2B2B2B] inline-flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar Servicio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service.id)}
                      className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors text-xs font-semibold border border-red-200 flex items-center justify-center"
                      title="Eliminar servicio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Restore defaults button */}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleResetDefaultServices}
                className="text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Restablecer catálogo a los servicios predeterminados
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURACIÓN */}
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
                      <div className="p-1.5 rounded-lg bg-green-100 text-green-700">
                        <MessageCircle className="w-4 h-4" />
                      </div>
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
                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                        <Calendar className="w-4 h-4" />
                      </div>
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
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                        <Mail className="w-4 h-4" />
                      </div>
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

                <div className="p-4 rounded-xl bg-[#FAF6F1]">
                  <span className="text-gray-500 block uppercase tracking-wider text-[10px]">
                    Ubicación Google Maps
                  </span>
                  <a
                    href={BUSINESS_INFO.locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#E66C7D] hover:underline text-sm inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>Abrir en Google Maps</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: REAGENDAR CITA */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#2B2B2B]/10 overflow-hidden my-8">
            <div className="px-6 py-5 bg-[#2B2B2B] text-white flex items-center justify-between">
              <div>
                <p className="font-playfair text-xl text-[#E66C7D] font-bold">
                  Reagendar Cita
                </p>
                <p className="text-[11px] text-white/60 flex items-center gap-1">
                  <span>Clienta: {rescheduleTarget.clientName}</span>
                  <span className="inline-flex items-center gap-0.5 ml-1">
                    (<Phone className="w-3 h-3 inline text-white/60" /> {rescheduleTarget.clientPhone})
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="p-6 space-y-4 text-xs">
              {/* Current schedule banner */}
              <div className="p-3 bg-[#FAF6F1] rounded-2xl border border-gray-200 space-y-1">
                <span className="text-gray-500 font-semibold block uppercase tracking-wider text-[10px]">
                  Horario actual programado:
                </span>
                <p className="text-[#2B2B2B] font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#E66C7D] shrink-0" />
                  <span>{rescheduleTarget.date} · {formatTime12h(rescheduleTarget.time)} – {formatTime12h(rescheduleTarget.endTime)}</span>
                </p>
                <p className="text-[#2B2B2B]/70">
                  Servicio: <strong>{rescheduleTarget.serviceName}</strong> ({formatCRC(rescheduleTarget.priceCRC)})
                </p>
              </div>

              {/* Service selection (optional change) */}
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Servicio a realizar
                </label>
                <select
                  value={rescheduleServiceId}
                  onChange={(e) => setRescheduleServiceId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E66C7D]"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMin} min) — {formatCRC(s.priceCRC)}
                    </option>
                  ))}
                </select>
              </div>

              {/* New Date */}
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Nueva Fecha *
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleTime("");
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              {/* New Time */}
              {rescheduleDate && (
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Nueva Hora Disponible *
                  </label>
                  {rescheduleAvailableSlots.length === 0 ? (
                    <p className="text-xs text-red-500 italic p-3 bg-red-50 rounded-xl">
                      No hay horarios disponibles en esta fecha (domingos cerrado o sin cupo). Elige otra fecha.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 border border-gray-100 rounded-xl">
                      {rescheduleAvailableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setRescheduleTime(slot.time)}
                          className={`p-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                            !slot.available
                              ? "opacity-35 bg-gray-100 border-gray-200 cursor-not-allowed text-gray-400"
                              : rescheduleTime === slot.time
                              ? "bg-[#E66C7D] text-white border-[#E66C7D]"
                              : "bg-white text-[#2B2B2B] border-gray-200 hover:border-[#E66C7D]"
                          }`}
                        >
                          {formatTime12h(slot.time)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Notas / Motivo de Reagendación
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Clienta solicitó mover la cita para la tarde..."
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => sendWhatsAppRescheduleConfirmation(rescheduleTarget)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200 font-semibold flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Notificar por WhatsApp</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR / CREAR SERVICIO */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#2B2B2B]/10 overflow-hidden my-8">
            <div className="px-6 py-5 bg-[#2B2B2B] text-white flex items-center justify-between">
              <div>
                <p className="font-playfair text-xl text-[#E66C7D] font-bold">
                  {editingServiceId ? "Editar Servicio" : "Nuevo Servicio en Catálogo"}
                </p>
                <p className="text-[11px] text-white/60">
                  Los cambios se reflejarán inmediatamente en la página web y en el sistema de reservas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Service Name */}
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Nombre del Servicio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Rubber Base Premium"
                  value={serviceFormName}
                  onChange={(e) => setServiceFormName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              {/* Category & Popular */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Categoría *
                  </label>
                  <select
                    value={serviceFormCategory}
                    onChange={(e) =>
                      setServiceFormCategory(e.target.value as "manicura" | "pedicura" | "cuidado")
                    }
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E66C7D]"
                  >
                    <option value="manicura">Manicura</option>
                    <option value="pedicura">Pedicura</option>
                    <option value="cuidado">Cuidado</option>
                  </select>
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceFormPopular}
                      onChange={(e) => setServiceFormPopular(e.target.checked)}
                      className="h-4 w-4 accent-[#E66C7D] rounded"
                    />
                    <span className="font-semibold text-[#2B2B2B] inline-flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span>Destacar como Favorito</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Duration & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Duración (minutos) *
                  </label>
                  <input
                    type="number"
                    required
                    min={15}
                    step={15}
                    placeholder="90"
                    value={serviceFormDuration}
                    onChange={(e) => setServiceFormDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Ej: 60, 90, 120, 180 min
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Precio en Colones (₡) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={500}
                    placeholder="10000"
                    value={serviceFormPrice}
                    onChange={(e) => setServiceFormPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Se mostrará como {formatCRC(serviceFormPrice || 0)}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Descripción del Servicio *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explica los beneficios, acabado y técnicas utilizadas..."
                  value={serviceFormDescription}
                  onChange={(e) => setServiceFormDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              {/* Image URL & Preset Selection */}
              <div className="space-y-2">
                <label className="block font-semibold text-[#2B2B2B]">
                  Foto del Servicio *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={serviceFormImage}
                  onChange={(e) => setServiceFormImage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />

                {/* Live Preview */}
                {serviceFormImage && (
                  <div className="flex items-center gap-3 p-2.5 bg-[#FAF6F1] rounded-2xl border border-gray-200">
                    <div className="relative h-16 w-24 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={serviceFormImage}
                        alt="Vista previa"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-[#2B2B2B] text-xs">
                        Vista previa de la fotografía
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Asegúrate de que la imagen sea nítida y muestre el trabajo de uñas
                      </p>
                    </div>
                  </div>
                )}

                {/* Presets Gallery */}
                <div>
                  <span className="text-[11px] font-semibold text-[#2B2B2B]/70 block mb-1">
                    O selecciona una foto de nuestra galería predeterminada:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-32 overflow-y-auto p-1">
                    {IMAGE_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setServiceFormImage(preset.url)}
                        className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                          serviceFormImage === preset.url
                            ? "border-[#E66C7D] ring-2 ring-[#E66C7D]/30"
                            : "border-transparent opacity-75 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] py-0.5 text-center truncate px-1">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
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

      {/* MODAL: MANUAL APPOINTMENT */}
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
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
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
                    min={todayStr}
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
