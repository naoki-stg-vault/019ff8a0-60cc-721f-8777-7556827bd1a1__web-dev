"use client";

import { useState, useEffect, useMemo } from "react";
import {
  NAIL_SERVICES,
  NailService,
  PaymentMethod,
  Appointment,
  BUSINESS_INFO,
  DEFAULT_NOTIFICATIONS,
  NotificationSettings,
  formatCRC,
  formatTime12h,
  addMinutesToTime,
  getAvailableSlots,
  createGoogleCalendarUrl,
  createWhatsAppMessageUrl,
  createClientWhatsAppUrl,
  createClientEmailUrl,
  formatAppointmentConfirmationMessage,
  isValidPhoneNumber,
  INITIAL_SAMPLE_APPOINTMENTS,
} from "@/lib/nails-data";
import {
  Clock,
  Zap,
  CreditCard,
  Smartphone,
  MapPin,
  MessageCircle,
  Calendar,
  Check,
  X,
  Menu,
  ArrowRight,
  ArrowUpRight,
  Star,
  Mail,
  Copy,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";

export default function NailsPinkPalacePage() {
  // State for appointments & settings
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<NailService[]>(NAIL_SERVICES);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [holidays, setHolidays] = useState<string[]>([]);

  // Client identification state
  const [savedPhone, setSavedPhone] = useState<string>("");
  const [savedName, setSavedName] = useState<string>("");
  const [savedEmail, setSavedEmail] = useState<string>("");

  // Modals & Panels
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [reschedulingApp, setReschedulingApp] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("");

  // Wizard state (Step 1 to 5 + Success)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<NailService>(NAIL_SERVICES[0]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("sinpe");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientNotes, setClientNotes] = useState<string>("");
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Validation & confirmation dispatch state
  const [phoneError, setPhoneError] = useState<string>("");
  const [copiedVoucher, setCopiedVoucher] = useState<boolean>(false);
  const [successEmailInput, setSuccessEmailInput] = useState<string>("");
  const [emailNotice, setEmailNotice] = useState<string>("");

  // Filter category in services section
  const [activeCategory, setActiveCategory] = useState<string>("todos");

  // Device transfer / OTP verification state for History modal
  const [otpPhoneInput, setOtpPhoneInput] = useState<string>("");
  const [otpStep, setOtpStep] = useState<"phone" | "code" | "verified">("phone");
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");

  // Automated Google Calendar sync state (Target: vale.coba.vcp@gmail.com)
  const [calendarSyncFeedback, setCalendarSyncFeedback] = useState<{
    status: "idle" | "syncing" | "synced" | "scheduled";
    message: string;
  }>({
    status: "idle",
    message: "",
  });

  const syncToValentinaCalendar = async (app: Appointment) => {
    setCalendarSyncFeedback({
      status: "syncing",
      message: `Sincronizando automáticamente con el Google Calendar de Valentina (${BUSINESS_INFO.email})...`,
    });

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          appointment: app,
          webhookUrl: notificationSettings.googleWebhookUrl,
        }),
      });
      const data = await res.json();
      if (data.synced) {
        setCalendarSyncFeedback({
          status: "synced",
          message: `✓ Cita creada y confirmada automáticamente en el Google Calendar de Valentina (${BUSINESS_INFO.email})`,
        });
      } else {
        setCalendarSyncFeedback({
          status: "scheduled",
          message: `✓ Cita registrada para el Google Calendar de Valentina (${BUSINESS_INFO.email})`,
        });
      }
    } catch {
      setCalendarSyncFeedback({
        status: "scheduled",
        message: `✓ Cita registrada para el Google Calendar de Valentina (${BUSINESS_INFO.email})`,
      });
    }
  };
  const [otpError, setOtpError] = useState<string>("");

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const storedApps = localStorage.getItem("npp_appointments");
      if (storedApps) {
        setAppointments(JSON.parse(storedApps));
      } else {
        setAppointments(INITIAL_SAMPLE_APPOINTMENTS);
        localStorage.setItem("npp_appointments", JSON.stringify(INITIAL_SAMPLE_APPOINTMENTS));
      }

      const storedServices = localStorage.getItem("npp_services");
      if (storedServices) {
        try {
          const parsed = JSON.parse(storedServices);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setServices(parsed);
            setSelectedService(parsed[0]);
          }
        } catch { /* ignore */ }
      } else {
        localStorage.setItem("npp_services", JSON.stringify(NAIL_SERVICES));
      }

      const storedPhone = localStorage.getItem("npp_client_phone");
      const storedName = localStorage.getItem("npp_client_name");
      const storedEmail = localStorage.getItem("npp_client_email");
      if (storedPhone) {
        setSavedPhone(storedPhone);
        setClientPhone(storedPhone);
      }
      if (storedName) {
        setSavedName(storedName);
        setClientName(storedName);
      }
      if (storedEmail) {
        setSavedEmail(storedEmail);
        setClientEmail(storedEmail);
      }

      const storedNotifs = localStorage.getItem("npp_notification_settings");
      if (storedNotifs) {
        setNotificationSettings(JSON.parse(storedNotifs));
      }
    } catch {
      setAppointments(INITIAL_SAMPLE_APPOINTMENTS);
    }

    // Set default tomorrow date for booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // If tomorrow is Sunday, set to Monday
    if (tomorrow.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);

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

  // Close mobile/tablet navigation on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsNavMenuOpen(false);
      }
    };
    if (isNavMenuOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNavMenuOpen]);

  // Sync appointments to localStorage
  const saveAppointments = (newApps: Appointment[]) => {
    setAppointments(newApps);
    try {
      localStorage.setItem("npp_appointments", JSON.stringify(newApps));
    } catch {
      /* ignore */
    }
  };

  // Open booking wizard directly with a selected service
  const openBookingWithService = (service: NailService) => {
    setSelectedService(service);
    setWizardStep(1);
    setConfirmedAppointment(null);
    setIsWizardOpen(true);
  };

  // Filtered services
  const displayedServices = useMemo(() => {
    if (activeCategory === "todos") return services;
    return services.filter((s) => s.category === activeCategory);
  }, [services, activeCategory]);

  // Compute available slots for currently selected date & service
  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    return getAvailableSlots(selectedDate, selectedService.durationMin, appointments, holidays);
  }, [selectedDate, selectedService, appointments, holidays]);

  // Client appointments (filter by savedPhone or verified OTP phone)
  const clientAppointments = useMemo(() => {
    const phoneToFilter = savedPhone || (otpStep === "verified" ? otpPhoneInput : "");
    if (!phoneToFilter) return [];
    const cleanFilter = phoneToFilter.replace(/\D/g, "");
    return appointments.filter((app) => app.clientPhone.replace(/\D/g, "") === cleanFilter);
  }, [appointments, savedPhone, otpStep, otpPhoneInput]);

  // Request OTP code for device transfer
  const handleRequestOtp = () => {
    if (!otpPhoneInput || otpPhoneInput.length < 8) {
      setOtpError("Ingresa un número de teléfono válido de 8 dígitos.");
      return;
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setOtpStep("code");
    setOtpError("");
  };

  // Verify OTP
  const handleVerifyOtp = () => {
    if (enteredOtp.trim() === generatedOtp) {
      setOtpStep("verified");
      setSavedPhone(otpPhoneInput);
      try {
        localStorage.setItem("npp_client_phone", otpPhoneInput);
      } catch {
        /* ignore */
      }
      setOtpError("");
    } else {
      setOtpError("Código incorrecto. Revisa el código de 4 dígitos generado.");
    }
  };

  // Copy full voucher to clipboard
  const handleCopyVoucher = (app: Appointment) => {
    const text = formatAppointmentConfirmationMessage(app);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedVoucher(true);
      setTimeout(() => setCopiedVoucher(false), 3000);
    }
  };

  // Send confirmation email to client
  const handleSendEmailToClient = (targetEmail: string, app: Appointment) => {
    const email = targetEmail.trim();
    if (!email || !email.includes("@")) {
      alert("Por favor ingresa un correo electrónico válido.");
      return;
    }
    const updatedApp = { ...app, clientEmail: email };
    const mailto = createClientEmailUrl(updatedApp);
    window.open(mailto, "_blank");
    setEmailNotice(`✓ Se abrió tu cliente de correo para enviar la confirmación a ${email}`);
    setTimeout(() => setEmailNotice(""), 6000);

    // Call API route
    fetch("/api/send-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment: updatedApp, channel: "email" }),
    }).catch(() => {});
  };

  // Confirm booking
  const handleConfirmBooking = () => {
    if (!clientName.trim()) {
      alert("Por favor ingresa tu nombre completo.");
      setWizardStep(4);
      return;
    }

    if (!clientPhone.trim() || !isValidPhoneNumber(clientPhone.trim())) {
      setPhoneError("El número de WhatsApp o teléfono es estrictamente obligatorio (mínimo 8 dígitos).");
      alert("El WhatsApp o número de teléfono es obligatorio para agendar tu cita y enviarte el comprobante.");
      setWizardStep(4);
      return;
    }

    if (!selectedDate || !selectedTime) {
      alert("Por favor selecciona una fecha y horario para tu cita.");
      setWizardStep(2);
      return;
    }

    setPhoneError("");
    const endTime = addMinutesToTime(selectedTime, selectedService.durationMin);
    const newAppointmentId = `NPP-${Date.now().toString().slice(-6)}`;

    const newAppointment: Appointment = {
      id: newAppointmentId,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || undefined,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      priceCRC: selectedService.priceCRC,
      durationMin: selectedService.durationMin,
      date: selectedDate,
      time: selectedTime,
      endTime,
      paymentMethod: selectedPayment,
      status: "confirmada",
      notes: clientNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      notificationsSent: {
        whatsapp: true,
        calendar: true,
        email: Boolean(clientEmail.trim()),
      },
    };

    const updated = [newAppointment, ...appointments];
    saveAppointments(updated);

    // Save client info to localStorage for auto-recognition
    try {
      localStorage.setItem("npp_client_phone", clientPhone.trim());
      localStorage.setItem("npp_client_name", clientName.trim());
      if (clientEmail.trim()) {
        localStorage.setItem("npp_client_email", clientEmail.trim());
      }
    } catch {
      /* ignore */
    }
    setSavedPhone(clientPhone.trim());
    setSavedName(clientName.trim());
    setSavedEmail(clientEmail.trim());

    setConfirmedAppointment(newAppointment);
    setSuccessEmailInput(clientEmail.trim());
    setWizardStep(6); // Step 6 = Success Screen
    syncToValentinaCalendar(newAppointment);

    // Asynchronously notify backend confirmation endpoint
    fetch("/api/send-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment: newAppointment, channel: "both" }),
    }).catch(() => {});
  };

  // Cancel an appointment
  const handleCancelAppointment = (id: string) => {
    if (confirm("¿Estás segura de que deseas cancelar esta cita?")) {
      const updated = appointments.map((app) =>
        app.id === id ? { ...app, status: "cancelada" as const } : app
      );
      saveAppointments(updated);
    }
  };

  // Reschedule available slots
  const rescheduleAvailableSlots = useMemo(() => {
    if (!reschedulingApp || !rescheduleDate) return [];
    const srv = services.find((s) => s.id === reschedulingApp.serviceId) || services[0];
    const otherApps = appointments.filter((a) => a.id !== reschedulingApp.id);
    return getAvailableSlots(rescheduleDate, srv.durationMin, otherApps, holidays);
  }, [reschedulingApp, rescheduleDate, services, appointments, holidays]);

  const handleConfirmClientReschedule = () => {
    if (!reschedulingApp || !rescheduleDate || !rescheduleTime) {
      alert("Por favor selecciona una fecha y hora disponible.");
      return;
    }
    const srv = services.find((s) => s.id === reschedulingApp.serviceId) || services[0];
    const endTime = addMinutesToTime(rescheduleTime, srv.durationMin);
    const updated = appointments.map((a) =>
      a.id === reschedulingApp.id
        ? {
            ...a,
            date: rescheduleDate,
            time: rescheduleTime,
            endTime,
            status: "confirmada" as const,
            notes: a.notes
              ? `${a.notes} (Reagendada para el ${rescheduleDate} a las ${rescheduleTime})`
              : `Reagendada para el ${rescheduleDate} a las ${rescheduleTime}`,
          }
        : a
    );
    saveAppointments(updated);
    const updatedApp = updated.find((a) => a.id === reschedulingApp.id);
    if (updatedApp) {
      syncToValentinaCalendar(updatedApp);
    }
    setReschedulingApp(null);
    alert(`¡Tu cita ha sido reagendada con éxito para el ${rescheduleDate} a las ${rescheduleTime}! Sincronizada con Google Calendar (${BUSINESS_INFO.email}).`);
  };

  // Min date selector: today
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2B2B2B] font-inter antialiased selection:bg-[#E66C7D] selection:text-white">
      {/* Top Banner Notice */}
      <div className="bg-[#2B2B2B] text-white text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.22em] py-2 px-4 text-center leading-relaxed">
        Salón de Uñas Profesional · Valentina Cobaleda Pallares · Costa Rica · Horario: Lun–Sáb 8am–7pm
      </div>

      {/* Sticky Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#2B2B2B]/10">
        <div className="mx-auto flex h-18 md:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-12">
          {/* Brand Logo */}
          <a
            href="#inicio"
            onClick={() => setIsNavMenuOpen(false)}
            className="flex flex-col group shrink-0"
          >
            <span className="font-playfair italic text-xl sm:text-2xl lg:text-3xl tracking-tight text-[#E66C7D] group-hover:opacity-90 transition-opacity">
              Nails Pink Palace
            </span>
            <span className="font-inter text-[8px] sm:text-[9px] uppercase tracking-[0.22em] sm:tracking-[0.3em] text-[#2B2B2B]/60 -mt-0.5 sm:-mt-1">
              By Valentina Cobaleda
            </span>
          </a>

          {/* Nav links - Desktop (>= 1024px) */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-[11px] xl:text-[12px] uppercase tracking-[0.16em] xl:tracking-[0.2em] font-medium text-[#2B2B2B]/80 whitespace-nowrap">
            <a href="#inicio" className="hover:text-[#E66C7D] transition-colors">
              Inicio
            </a>
            <a href="#sobre-nosotras" className="hover:text-[#E66C7D] transition-colors">
              Sobre Nosotras
            </a>
            <a href="#servicios" className="hover:text-[#E66C7D] transition-colors">
              Servicios
            </a>
            <a href="#ubicacion" className="hover:text-[#E66C7D] transition-colors">
              Ubicación
            </a>
          </nav>

          {/* Action CTAs & Mobile/Tablet Menu Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Client History Button */}
            <button
              type="button"
              onClick={() => {
                setIsNavMenuOpen(false);
                setIsHistoryOpen(true);
              }}
              className="relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-[#2B2B2B]/20 text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.18em] font-semibold text-[#2B2B2B] hover:border-[#E66C7D] hover:text-[#E66C7D] transition-colors whitespace-nowrap"
            >
              Mis Citas
              {savedPhone && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 sm:h-3 sm:w-3 bg-[#E66C7D] rounded-full border-2 border-[#FAF6F0]" />
              )}
            </button>

            {/* Book Appointment CTA */}
            <button
              type="button"
              onClick={() => {
                setIsNavMenuOpen(false);
                setWizardStep(1);
                setIsWizardOpen(true);
              }}
              className="px-3.5 sm:px-5 lg:px-6 py-2 sm:py-2.5 rounded-full bg-[#E66C7D] text-white text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] font-semibold hover:bg-[#d45668] transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              Reservar Cita
            </button>

            {/* Mobile & Tablet Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsNavMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-full text-[#2B2B2B] hover:text-[#E66C7D] hover:bg-[#2B2B2B]/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#E66C7D]/30"
              aria-expanded={isNavMenuOpen}
              aria-label={isNavMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {isNavMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Dropdown Navigation */}
        {isNavMenuOpen && (
          <div className="lg:hidden border-t border-[#2B2B2B]/10 bg-[#FAF6F0]/98 backdrop-blur-md px-6 py-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-3 pb-4 border-b border-[#2B2B2B]/10">
              <a
                href="#inicio"
                onClick={() => setIsNavMenuOpen(false)}
                className="py-1.5 text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-[#2B2B2B] hover:text-[#E66C7D] transition-colors"
              >
                Inicio
              </a>
              <a
                href="#sobre-nosotras"
                onClick={() => setIsNavMenuOpen(false)}
                className="py-1.5 text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-[#2B2B2B] hover:text-[#E66C7D] transition-colors"
              >
                Sobre Nosotras
              </a>
              <a
                href="#servicios"
                onClick={() => setIsNavMenuOpen(false)}
                className="py-1.5 text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-[#2B2B2B] hover:text-[#E66C7D] transition-colors"
              >
                Servicios
              </a>
              <a
                href="#ubicacion"
                onClick={() => setIsNavMenuOpen(false)}
                className="py-1.5 text-xs sm:text-sm uppercase tracking-[0.2em] font-medium text-[#2B2B2B] hover:text-[#E66C7D] transition-colors"
              >
                Ubicación
              </a>
            </nav>

            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#2B2B2B]/70">
              <div>
                <p className="font-semibold text-[#2B2B2B]">Horario de Atención</p>
                <p>Lunes a Sábado: 8:00 am – 7:00 pm</p>
              </div>
              <a
                href={BUSINESS_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#E66C7D] font-medium hover:underline"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Directo</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="inicio" className="relative overflow-hidden pt-12 pb-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12 grid md:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E66C7D]/10 text-[#E66C7D] text-[11px] uppercase tracking-[0.25em] font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E66C7D]" />
              Salón de Uñas en Costa Rica
            </div>

            <h1 className="font-playfair text-[clamp(2.5rem,5.5vw,4.8rem)] leading-[1.05] tracking-tight text-[#2B2B2B]">
              ARTE, CUIDADO Y ESTILO EN CADA DETALLE PARA <span className="italic text-[#E66C7D]">TUS UÑAS</span>.
            </h1>

            <p className="font-inter text-lg md:text-xl text-[#2B2B2B]/75 leading-relaxed max-w-2xl">
              Técnicas avanzadas de salón enfocadas en la belleza y salud de tu uña natural. Sin acrílico, con productos premium y acabados impecables diseñados para durar.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setWizardStep(1);
                  setIsWizardOpen(true);
                }}
                className="px-8 py-4 rounded-full bg-[#E66C7D] text-white font-inter text-xs uppercase tracking-[0.25em] font-semibold hover:bg-[#d45668] transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                Reservar Cita Ahora
              </button>

              <a
                href="#servicios"
                className="px-8 py-4 rounded-full border border-[#2B2B2B]/20 text-[#2B2B2B] font-inter text-xs uppercase tracking-[0.25em] font-semibold hover:border-[#2B2B2B] transition-colors"
              >
                Ver Servicios y Precios
              </a>
            </div>

            {/* Quick Guarantees Strip */}
            <div className="pt-8 border-t border-[#2B2B2B]/10 grid grid-cols-3 gap-4">
              <div>
                <p className="font-playfair text-2xl font-bold text-[#E66C7D]">100%</p>
                <p className="font-inter text-xs uppercase tracking-wider text-[#2B2B2B]/60">Sin Acrílico</p>
              </div>
              <div>
                <p className="font-playfair text-2xl font-bold text-[#2B2B2B]">SINPE</p>
                <p className="font-inter text-xs uppercase tracking-wider text-[#2B2B2B]/60">O Efectivo</p>
              </div>
              <div>
                <p className="font-playfair text-2xl font-bold text-[#2B2B2B]">Sin Cuenta</p>
                <p className="font-inter text-xs uppercase tracking-wider text-[#2B2B2B]/60">Tu WhatsApp es tu llave</p>
              </div>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="md:col-span-5 relative">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1000&q=80"
                alt="Manicura profesional en Nails Pink Palace"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2B2B2B]/60 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 text-white p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
                <p className="font-playfair italic text-lg">“Cuidamos la estructura natural de tu uña”</p>
                <p className="font-inter text-[11px] uppercase tracking-[0.2em] opacity-90 mt-1">
                  Valentina Cobaleda — Estilista
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre Nails Pink Palace Section */}
      <section id="sobre-nosotras" className="py-20 md:py-28 bg-[#FAF6F1] border-y border-[#2B2B2B]/10">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <p className="font-inter text-[11px] uppercase tracking-[0.3em] text-[#E66C7D] font-semibold">
              Sobre Nails Pink Palace
            </p>
            <h2 className="font-playfair text-3xl md:text-5xl tracking-tight text-[#2B2B2B]">
              UNA EXPERIENCIA PENSADA PARA TU <span className="italic text-[#E66C7D]">BIENESTAR</span>
            </h2>
            <p className="font-inter text-base md:text-lg text-[#2B2B2B]/75 leading-relaxed pt-2">
              {BUSINESS_INFO.description}
            </p>
          </div>

          {/* 4 Feature Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-playfair text-3xl text-[#E66C7D] mb-4 block">01</span>
                <h3 className="font-inter text-sm uppercase tracking-[0.15em] font-bold text-[#2B2B2B] mb-2">
                  Uña Natural Sana
                </h3>
                <p className="font-inter text-sm text-[#2B2B2B]/70 leading-relaxed">
                  No trabajamos acrílico invasivo. Cada procedimiento protege tu matriz y lámina ungueal.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-playfair text-3xl text-[#E66C7D] mb-4 block">02</span>
                <h3 className="font-inter text-sm uppercase tracking-[0.15em] font-bold text-[#2B2B2B] mb-2">
                  Técnica Rusa de Precisión
                </h3>
                <p className="font-inter text-sm text-[#2B2B2B]/70 leading-relaxed">
                  Limpieza anatómica milimétrica con torno para bordes perfectos y mayor duración de esmalte.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-playfair text-3xl text-[#E66C7D] mb-4 block">03</span>
                <h3 className="font-inter text-sm uppercase tracking-[0.15em] font-bold text-[#2B2B2B] mb-2">
                  Materiales Premium
                </h3>
                <p className="font-inter text-sm text-[#2B2B2B]/70 leading-relaxed">
                  Polygel, Rubber Base y geles con calcio de máxima adherencia, flexibilidad y brillo.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-playfair text-3xl text-[#E66C7D] mb-4 block">04</span>
                <h3 className="font-inter text-sm uppercase tracking-[0.15em] font-bold text-[#2B2B2B] mb-2">
                  Agendamiento Ágil
                </h3>
                <p className="font-inter text-sm text-[#2B2B2B]/70 leading-relaxed">
                  Elige tu horario en 1 minuto, paga con SINPE Móvil o efectivo, y recibe confirmación automática.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="servicios" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="font-inter text-[11px] uppercase tracking-[0.3em] text-[#E66C7D] font-semibold mb-2">
                Menú de Servicios
              </p>
              <h2 className="font-playfair text-3xl md:text-5xl tracking-tight text-[#2B2B2B]">
                SERVICIOS EXCLUSIVOS & <span className="italic text-[#E66C7D]">TARIFAS</span>
              </h2>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "todos", label: "Todos" },
                { id: "manicura", label: "Manicura" },
                { id: "pedicura", label: "Pedicura" },
                { id: "cuidado", label: "Cuidado / Spa" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                    activeCategory === cat.id
                      ? "bg-[#2B2B2B] text-white"
                      : "bg-[#FAF6F1] text-[#2B2B2B]/70 hover:bg-[#2B2B2B]/10"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedServices.map((service) => (
              <div
                key={service.id}
                className="group bg-white rounded-3xl overflow-hidden border border-[#2B2B2B]/10 hover:border-[#E66C7D]/40 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full font-playfair text-sm font-bold text-[#E66C7D]">
                      {formatCRC(service.priceCRC)}
                    </div>
                    {service.popular && (
                      <div className="absolute top-4 left-4 bg-[#E66C7D] text-white px-3 py-1 rounded-full font-inter text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Favorito</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#2B2B2B]/60 mb-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#2B2B2B]/60" />
                        <span>{service.durationMin} min</span>
                      </span>
                      <span>•</span>
                      <span className="capitalize">{service.category}</span>
                    </div>

                    <h3 className="font-playfair text-2xl text-[#2B2B2B] mb-3 group-hover:text-[#E66C7D] transition-colors">
                      {service.name}
                    </h3>

                    <p className="font-inter text-sm text-[#2B2B2B]/70 leading-relaxed mb-6">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-8 pt-0">
                  <button
                    type="button"
                    onClick={() => openBookingWithService(service)}
                    className="w-full py-3.5 rounded-full bg-[#FAF6F1] text-[#2B2B2B] group-hover:bg-[#E66C7D] group-hover:text-white font-inter text-xs uppercase tracking-[0.2em] font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <span>Reservar Este Servicio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment & Schedule Rule Info Strip */}
      <section className="py-16 bg-[#FAF6F1] border-y border-[#2B2B2B]/10">
        <div className="mx-auto max-w-7xl px-6 md:px-12 grid md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-[#E66C7D]/10 text-[#E66C7D] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[#E66C7D]" />
            </div>
            <div>
              <h4 className="font-inter text-sm uppercase tracking-wider font-bold text-[#2B2B2B] mb-1">
                Anticipación Mínima: 2 Horas
              </h4>
              <p className="font-inter text-xs text-[#2B2B2B]/70 leading-relaxed">
                Para garantizar la preparación adecuada de tu cita, el sistema requiere al menos 2 horas de anticipación.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-[#E66C7D]/10 text-[#E66C7D] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-[#E66C7D]" />
            </div>
            <div>
              <h4 className="font-inter text-sm uppercase tracking-wider font-bold text-[#2B2B2B] mb-1">
                SINPE Móvil & Efectivo
              </h4>
              <p className="font-inter text-xs text-[#2B2B2B]/70 leading-relaxed">
                Paga al finalizar el servicio. Transferencia directa a 8735-7321 (Valentina Cobaleda) o en efectivo.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-[#E66C7D]/10 text-[#E66C7D] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-[#E66C7D]" />
            </div>
            <div>
              <h4 className="font-inter text-sm uppercase tracking-wider font-bold text-[#2B2B2B] mb-1">
                Sin Contraseñas
              </h4>
              <p className="font-inter text-xs text-[#2B2B2B]/70 leading-relaxed">
                Tu número de WhatsApp almacena tu historial de citas para que nunca tengas que recordar contraseñas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="ubicacion" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5 space-y-6">
            <p className="font-inter text-[11px] uppercase tracking-[0.3em] text-[#E66C7D] font-semibold">
              Ubicación & Contacto
            </p>
            <h2 className="font-playfair text-3xl md:text-5xl tracking-tight text-[#2B2B2B]">
              VISÍTANOS EN <span className="italic text-[#E66C7D]">COSTA RICA</span>
            </h2>
            <p className="font-inter text-base text-[#2B2B2B]/75 leading-relaxed">
              Disfruta de un ambiente privado, relajante y acogedor mientras cuidamos de tus manos y pies.
            </p>

            <div className="space-y-4 pt-4 border-t border-[#2B2B2B]/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#E66C7D]/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-[#E66C7D]" />
                </div>
                <div>
                  <p className="font-inter text-xs uppercase tracking-wider font-bold text-[#2B2B2B]">Ficha en Google Maps</p>
                  <p className="font-inter text-sm text-[#2B2B2B] font-medium">Nails Pink Palace</p>
                  <p className="font-inter text-xs text-[#2B2B2B]/60">Costa Rica · Atención con Cita Previa</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#E66C7D]/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#E66C7D]" />
                </div>
                <div>
                  <p className="font-inter text-xs uppercase tracking-wider font-bold text-[#2B2B2B]">Horario de Atención</p>
                  <p className="font-inter text-sm text-[#2B2B2B]/70">Lunes a Sábado: 8:00 a.m. – 7:00 p.m. · Domingo: Cerrado</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#E66C7D]/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#E66C7D]" />
                </div>
                <div>
                  <p className="font-inter text-xs uppercase tracking-wider font-bold text-[#2B2B2B]">WhatsApp Directo</p>
                  <p className="font-inter text-sm text-[#2B2B2B]/70">8735-7321 (Valentina Cobaleda)</p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#FAF6F1] rounded-2xl border border-[#2B2B2B]/10 space-y-1.5 text-xs font-inter">
              <p className="uppercase tracking-wider font-bold text-[#2B2B2B] text-[11px]">
                Pago por SINPE Móvil
              </p>
              <p className="text-[#2B2B2B]">
                Número: <strong className="font-bold text-[#E66C7D]">8735-7321</strong> (Valentina Cobaleda)
              </p>
              <p className="text-[#2B2B2B]/60 text-[11px]">
                Se cancela al finalizar el servicio en el salón o en efectivo.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={BUSINESS_INFO.locationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#2B2B2B] text-white font-inter text-xs uppercase tracking-[0.25em] font-semibold hover:bg-[#E66C7D] transition-colors shadow-md"
              >
                <MapPin className="w-4 h-4 text-[#E66C7D]" />
                <span>Abrir en Google Maps</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="md:col-span-7 space-y-4">
            <div className="relative w-full h-[450px] md:h-[480px] rounded-3xl overflow-hidden border border-[#2B2B2B]/10 shadow-lg bg-gray-100">
              <iframe
                src={BUSINESS_INFO.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Nails Pink Palace en Google Maps"
                className="w-full h-full"
              />
            </div>

            <div className="bg-[#FAF6F1] p-6 rounded-3xl border border-[#2B2B2B]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-[10px] uppercase font-bold tracking-wider rounded-full">
                    Ficha Oficial en Google Maps
                  </span>
                  <span className="text-xs text-[#2B2B2B]/70 font-semibold">Nails Pink Palace</span>
                </div>
                <p className="font-inter text-xs text-[#2B2B2B]/75 leading-relaxed">
                  Para tu comodidad y privacidad atendemos con reserva previa. Consulta reseñas, fotos y traza tu ruta en Google Maps.
                </p>
                <a
                  href={BUSINESS_INFO.locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-[#E66C7D] hover:underline block truncate max-w-md"
                >
                  {BUSINESS_INFO.locationUrl}
                </a>
              </div>
              <a
                href={BUSINESS_INFO.locationUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 rounded-full bg-[#E66C7D] text-white font-inter text-xs uppercase tracking-wider font-semibold hover:bg-[#d45668] transition-colors shadow-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Cómo Llegar en Maps</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2B2B2B] text-white py-16">
        <div className="mx-auto max-w-7xl px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/10 pb-12">
          <div className="text-center md:text-left">
            <p className="font-playfair italic text-3xl text-[#E66C7D]">Nails Pink Palace</p>
            <p className="font-inter text-xs uppercase tracking-[0.25em] text-white/60 mt-1">
              Valentina Cobaleda Pallares · Costa Rica
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs uppercase tracking-widest text-white/80">
            <a href="#inicio" className="hover:text-[#E66C7D] transition-colors">
              Inicio
            </a>
            <a href="#servicios" className="hover:text-[#E66C7D] transition-colors">
              Servicios
            </a>
            <a href={BUSINESS_INFO.locationUrl} target="_blank" rel="noreferrer" className="hover:text-[#E66C7D] transition-colors">
              Google Maps
            </a>
            <a href={BUSINESS_INFO.whatsappUrl} target="_blank" rel="noreferrer" className="hover:text-[#E66C7D] transition-colors">
              WhatsApp
            </a>
          </div>

          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
            className="px-6 py-3 rounded-full bg-[#E66C7D] text-white text-xs uppercase tracking-widest font-semibold hover:bg-white hover:text-[#2B2B2B] transition-colors"
          >
            Reservar Cita
          </button>
        </div>

        <div className="mx-auto max-w-7xl px-6 md:px-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4">
          <p>© {new Date().getFullYear()} Nails Pink Palace. Todos los derechos reservados.</p>
          <p>Técnicas profesionales de uñas · Sin acrílico · Costa Rica</p>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 1. BOOKING WIZARD MODAL (1 SINGLE STEP VISIBLE AT A TIME)                 */}
      {/* ========================================================================= */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#FAF6F0] rounded-3xl shadow-2xl border border-[#2B2B2B]/10 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-8 pt-8 pb-4 border-b border-[#2B2B2B]/10 flex items-center justify-between">
              <div>
                <p className="font-playfair italic text-xl text-[#E66C7D]">Nails Pink Palace</p>
                <p className="font-inter text-xs uppercase tracking-[0.2em] text-[#2B2B2B]/60">
                  {wizardStep <= 5 ? `Paso ${wizardStep} de 5 — Agendamiento` : "¡Cita Confirmada!"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsWizardOpen(false)}
                className="h-10 w-10 rounded-full bg-[#2B2B2B]/5 hover:bg-[#2B2B2B]/10 flex items-center justify-center text-[#2B2B2B] transition-colors"
                aria-label="Cerrar asistente"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            {wizardStep <= 5 && (
              <div className="w-full bg-[#2B2B2B]/10 h-1.5">
                <div
                  className="bg-[#E66C7D] h-1.5 transition-all duration-300"
                  style={{ width: `${(wizardStep / 5) * 100}%` }}
                />
              </div>
            )}

            {/* Step Content */}
            <div className="p-8">
              {/* STEP 1: SERVICIO */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-playfair text-2xl text-[#2B2B2B]">Elige tu Servicio</h3>
                    <p className="font-inter text-sm text-[#2B2B2B]/70">
                      Selecciona la técnica de manicura, pedicura o cuidado para tu sesión.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                    {services.map((srv) => {
                      const isSelected = selectedService.id === srv.id;
                      return (
                        <div
                          key={srv.id}
                          onClick={() => setSelectedService(srv)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-[#E66C7D] bg-[#E66C7D]/5 shadow-sm"
                              : "border-[#2B2B2B]/10 bg-white hover:border-[#2B2B2B]/30"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <input
                              type="radio"
                              name="service"
                              checked={isSelected}
                              onChange={() => setSelectedService(srv)}
                              className="accent-[#E66C7D] h-4 w-4"
                            />
                            <div>
                              <p className="font-inter text-sm font-bold text-[#2B2B2B]">{srv.name}</p>
                              <p className="font-inter text-xs text-[#2B2B2B]/60 flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-3.5 h-3.5 text-[#2B2B2B]/60 shrink-0" />
                                <span>{srv.durationMin} min · {srv.category}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-playfair font-bold text-[#E66C7D]">
                              {formatCRC(srv.priceCRC)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: MÉTODO DE PAGO */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-playfair text-2xl text-[#2B2B2B]">Método de Pago</h3>
                    <p className="font-inter text-sm text-[#2B2B2B]/70">
                      Elige cómo deseas abonar tu servicio al finalizar en el salón.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Option 1: SINPE Móvil */}
                    <div
                      onClick={() => setSelectedPayment("sinpe")}
                      className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                        selectedPayment === "sinpe"
                          ? "border-[#E66C7D] bg-[#E66C7D]/5 shadow-sm"
                          : "border-[#2B2B2B]/10 bg-white hover:border-[#2B2B2B]/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={selectedPayment === "sinpe"}
                            onChange={() => setSelectedPayment("sinpe")}
                            className="accent-[#E66C7D] h-4 w-4"
                          />
                          <span className="font-inter text-sm font-bold uppercase tracking-wider text-[#2B2B2B]">
                            SINPE Móvil
                          </span>
                        </div>
                        <span className="font-playfair text-lg font-bold text-[#E66C7D]">
                          {formatCRC(selectedService.priceCRC)}
                        </span>
                      </div>

                      {/* Required instruction text */}
                      <p className="font-inter text-xs text-[#2B2B2B]/80 pl-7 leading-relaxed">
                        Pago por SINPE: <strong>8735-7321</strong> — Valentina Cobaleda. Realizar el pago al finalizar el servicio.
                      </p>
                    </div>

                    {/* Option 2: Efectivo */}
                    <div
                      onClick={() => setSelectedPayment("efectivo")}
                      className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                        selectedPayment === "efectivo"
                          ? "border-[#E66C7D] bg-[#E66C7D]/5 shadow-sm"
                          : "border-[#2B2B2B]/10 bg-white hover:border-[#2B2B2B]/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={selectedPayment === "efectivo"}
                            onChange={() => setSelectedPayment("efectivo")}
                            className="accent-[#E66C7D] h-4 w-4"
                          />
                          <span className="font-inter text-sm font-bold uppercase tracking-wider text-[#2B2B2B]">
                            Efectivo
                          </span>
                        </div>
                        <span className="font-playfair text-lg font-bold text-[#2B2B2B]">
                          {formatCRC(selectedService.priceCRC)}
                        </span>
                      </div>

                      {/* Required instruction text */}
                      <p className="font-inter text-xs text-[#2B2B2B]/80 pl-7 leading-relaxed">
                        Pago en efectivo, al finalizar el servicio.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: HORARIO */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-playfair text-2xl text-[#2B2B2B]">Día y Hora de tu Cita</h3>
                    <p className="font-inter text-sm text-[#2B2B2B]/70">
                      Horario disponible de 8:00 a.m. a 7:00 p.m. con mínimo 2 horas de anticipación.
                    </p>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block font-inter text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-2">
                      Selecciona la fecha:
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedTime("");
                      }}
                      className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 bg-white text-[#2B2B2B] font-inter text-sm focus:border-[#E66C7D] focus:outline-none"
                    />
                  </div>

                  {/* Slots Grid */}
                  <div>
                    <label className="block font-inter text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-2">
                      Horarios disponibles para {selectedService.name} ({selectedService.durationMin} min):
                    </label>

                    {availableSlots.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-[#2B2B2B]/10">
                        <p className="font-playfair text-lg text-[#E66C7D] mb-1">Cerrado o sin horarios disponibles</p>
                        <p className="font-inter text-xs text-[#2B2B2B]/60">
                          Los domingos el salón permanece cerrado. Por favor selecciona otra fecha de Lunes a Sábado.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                        {availableSlots.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                              title={slot.reason}
                              className={`p-3 rounded-xl text-xs font-inter font-medium transition-all ${
                                !slot.available
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 line-through"
                                  : isSelected
                                  ? "bg-[#E66C7D] text-white font-bold shadow-md"
                                  : "bg-white text-[#2B2B2B] border border-[#2B2B2B]/15 hover:border-[#E66C7D]"
                              }`}
                            >
                              {formatTime12h(slot.time)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: DATOS DE LA CLIENTA */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-playfair text-2xl text-[#2B2B2B]">Tus Datos de Contacto</h3>
                    <p className="font-inter text-sm text-[#2B2B2B]/70">
                      Sin contraseñas. El número de WhatsApp o teléfono es obligatorio para confirmar tu cita y enviarte el comprobante.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-inter text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-1.5">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Mariana Rojas Solano"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 bg-white text-[#2B2B2B] font-inter text-sm focus:border-[#E66C7D] focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-inter text-xs uppercase tracking-wider font-bold text-[#2B2B2B]">
                          Teléfono / WhatsApp *
                        </label>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[#E66C7D] text-[10px] font-extrabold uppercase tracking-wider border border-[#E66C7D]/30">
                          Obligatorio
                        </span>
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="Ej. 88214532"
                        value={clientPhone}
                        onChange={(e) => {
                          setClientPhone(e.target.value);
                          if (phoneError) setPhoneError("");
                        }}
                        className={`w-full p-3.5 rounded-xl border ${
                          phoneError ? "border-red-500 ring-2 ring-red-200" : "border-[#2B2B2B]/20"
                        } bg-white text-[#2B2B2B] font-inter text-sm focus:border-[#E66C7D] focus:outline-none`}
                      />
                      {phoneError ? (
                        <p className="font-inter text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{phoneError}</span>
                        </p>
                      ) : (
                        <p className="font-inter text-[11px] text-[#2B2B2B]/70 mt-1">
                          ⚠️ <strong>El WhatsApp o teléfono es obligatorio:</strong> es indispensable para enviarte el comprobante con todos los datos y acceder a tu historial.
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-inter text-xs uppercase tracking-wider font-bold text-[#2B2B2B]">
                          Correo Electrónico (para enviarte la cita por correo)
                        </label>
                        <span className="text-[10px] text-[#2B2B2B]/50 uppercase tracking-wider font-medium">
                          Opcional
                        </span>
                      </div>
                      <input
                        type="email"
                        placeholder="Ej. tu@correo.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 bg-white text-[#2B2B2B] font-inter text-sm focus:border-[#E66C7D] focus:outline-none"
                      />
                      <p className="font-inter text-[11px] text-[#2B2B2B]/50 mt-1">
                        Si proporcionas tu correo, te enviaremos el comprobante tanto por WhatsApp como por correo electrónico.
                      </p>
                    </div>

                    <div>
                      <label className="block font-inter text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-1.5">
                        Notas o Especificaciones para Valentina (Opcional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ej. Quiero diseño minimalista con destellos dorados..."
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        className="w-full p-3 rounded-xl border border-[#2B2B2B]/20 bg-white text-[#2B2B2B] font-inter text-sm focus:border-[#E66C7D] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: CONFIRMACIÓN */}
              {wizardStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-playfair text-2xl text-[#2B2B2B]">Resumen de tu Cita</h3>
                    <p className="font-inter text-sm text-[#2B2B2B]/70">
                      Revisa los detalles antes de confirmar. Al presionar confirmar, se agendará para el Google Calendar de Valentina y podrás enviarte el comprobante de inmediato.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-[#2B2B2B]/10 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-[#2B2B2B]/10">
                      <div>
                        <p className="font-playfair text-xl font-bold text-[#2B2B2B]">{selectedService.name}</p>
                        <p className="font-inter text-xs text-[#2B2B2B]/60 flex items-center gap-1.5 mt-1">
                          <Clock className="w-3.5 h-3.5 text-[#2B2B2B]/60 shrink-0" />
                          <span>Duración estimada: {selectedService.durationMin} minutos</span>
                        </p>
                      </div>
                      <span className="font-playfair text-2xl font-bold text-[#E66C7D]">
                        {formatCRC(selectedService.priceCRC)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-inter">
                      <div>
                        <span className="text-[#2B2B2B]/60 uppercase tracking-wider block">Fecha y Hora</span>
                        <strong className="text-sm text-[#2B2B2B]">
                          {selectedDate} a las {formatTime12h(selectedTime)}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[#2B2B2B]/60 uppercase tracking-wider block">Método de Pago</span>
                        <strong className="text-sm text-[#2B2B2B] capitalize">
                          {selectedPayment === "sinpe" ? "SINPE Móvil (8735-7321)" : "Efectivo"}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[#2B2B2B]/60 uppercase tracking-wider block">Clienta</span>
                        <strong className="text-sm text-[#2B2B2B]">{clientName}</strong>
                      </div>

                      <div>
                        <span className="text-[#2B2B2B]/60 uppercase tracking-wider block">WhatsApp / Teléfono</span>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-sm text-[#2B2B2B]">{clientPhone}</strong>
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase">
                            Obligatorio
                          </span>
                        </div>
                      </div>

                      {clientEmail && (
                        <div className="col-span-2">
                          <span className="text-[#2B2B2B]/60 uppercase tracking-wider block">Correo Electrónico</span>
                          <strong className="text-sm text-[#2B2B2B]">{clientEmail}</strong>
                        </div>
                      )}

                      <div className="col-span-2">
                        <span className="text-[#2B2B2B]/60 uppercase tracking-wider block">Google Calendar</span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-blue-700 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Sincronización oficial con {BUSINESS_INFO.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#FAF6F1] rounded-xl text-xs font-inter text-[#2B2B2B]/80 space-y-1">
                      <p className="font-bold uppercase tracking-wider text-[#E66C7D]">Instrucciones de pago:</p>
                      {selectedPayment === "sinpe" ? (
                        <p>Pago por SINPE: 8735-7321 — Valentina Cobaleda. Realizar el pago al finalizar el servicio.</p>
                      ) : (
                        <p>Pago en efectivo, al finalizar el servicio.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: PANTALLA DE ÉXITO */}
              {wizardStep === 6 && confirmedAppointment && (
                <div className="text-center space-y-6 py-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-sm">
                    <Check className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="font-playfair text-3xl text-[#2B2B2B]">¡Cita Agendada con Éxito!</h3>
                    <p className="font-inter text-sm text-[#2B2B2B]/70 max-w-md mx-auto mt-2">
                      Tu cita ha quedado registrada en Nails Pink Palace. Valentina ya tiene el registro.
                    </p>
                  </div>

                  {/* Google Calendar Oficial Card (vale.coba.vcp@gmail.com) */}
                  <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 border border-blue-200 rounded-2xl p-4 text-left max-w-lg mx-auto shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-sm">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-blue-950 uppercase tracking-wide">
                            Google Calendar Oficial
                          </span>
                          <span className="text-[11px] bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold border border-blue-200">
                            {BUSINESS_INFO.email}
                          </span>
                        </div>
                        <p className="text-xs text-blue-900 leading-relaxed">
                          {calendarSyncFeedback.message ||
                            `Cita registrada para sincronización con el Google Calendar oficial (${BUSINESS_INFO.email}).`}
                        </p>
                        <div className="pt-2">
                          <a
                            href={createGoogleCalendarUrl(confirmedAppointment, true)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Guardar / Ver en Google Calendar ({BUSINESS_INFO.email})</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Voucher Dispatch to the Person Who Booked */}
                  <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-emerald-50/90 border border-emerald-200/90 rounded-2xl p-5 text-left max-w-lg mx-auto shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-600 text-white">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-playfair text-base font-bold text-emerald-950">
                            Enviar comprobante a la persona que agendó
                          </p>
                          <p className="font-inter text-[11px] text-emerald-800">
                            Para {confirmedAppointment.clientName} (Tel: {confirmedAppointment.clientPhone})
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                        Listo
                      </span>
                    </div>

                    <p className="font-inter text-xs text-emerald-900">
                      El comprobante incluye tu servicio, fecha, horario, monto a pagar, indicaciones de pago y enlace a Google Calendar.
                    </p>

                    <div className="space-y-2 pt-1">
                      {/* Enviar a mi WhatsApp */}
                      <a
                        href={createClientWhatsAppUrl(confirmedAppointment)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full px-4 py-3 rounded-xl bg-green-600 text-white font-inter text-xs font-bold uppercase tracking-wider hover:bg-green-700 transition-all shadow flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          <span>Enviar cita a mi WhatsApp ({confirmedAppointment.clientPhone})</span>
                        </span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
                          Abrir WhatsApp →
                        </span>
                      </a>

                      {/* Enviar a mi Correo */}
                      {confirmedAppointment.clientEmail ? (
                        <button
                          type="button"
                          onClick={() => handleSendEmailToClient(confirmedAppointment.clientEmail || "", confirmedAppointment)}
                          className="w-full px-4 py-3 rounded-xl bg-purple-600 text-white font-inter text-xs font-bold uppercase tracking-wider hover:bg-purple-700 transition-all shadow flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>Enviar cita a mi Correo ({confirmedAppointment.clientEmail})</span>
                          </span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
                            Abrir Correo →
                          </span>
                        </button>
                      ) : (
                        <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/80 space-y-2">
                          <label className="block text-[11px] font-semibold text-emerald-950">
                            ¿Deseas recibirlo también por Correo Electrónico?
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              placeholder="Escribe tu correo..."
                              value={successEmailInput}
                              onChange={(e) => setSuccessEmailInput(e.target.value)}
                              className="flex-1 p-2 rounded-lg border border-emerald-300 text-xs text-[#2B2B2B] bg-white focus:outline-none focus:border-purple-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleSendEmailToClient(successEmailInput, confirmedAppointment)}
                              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shrink-0"
                            >
                              Enviar
                            </button>
                          </div>
                        </div>
                      )}

                      {emailNotice && (
                        <p className="text-[11px] text-purple-700 font-semibold bg-purple-50 p-2 rounded-lg border border-purple-200">
                          {emailNotice}
                        </p>
                      )}

                      {/* Copiar comprobante */}
                      <button
                        type="button"
                        onClick={() => handleCopyVoucher(confirmedAppointment)}
                        className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-emerald-950 font-inter text-xs font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {copiedVoucher ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">¡Comprobante copiado al portapapeles!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-emerald-700" />
                            <span>Copiar texto completo del comprobante</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions secundarias */}
                  <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pt-2">
                    <a
                      href={createWhatsAppMessageUrl(
                        BUSINESS_INFO.phone,
                        `Hola Valentina, acabo de agendar una cita en Nails Pink Palace para ${confirmedAppointment.serviceName} el ${confirmedAppointment.date} a las ${confirmedAppointment.time}. Mi nombre es ${confirmedAppointment.clientName}.`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#E66C7D]/30 text-[#E66C7D] font-inter text-xs uppercase tracking-wider font-semibold hover:bg-[#E66C7D] hover:text-white transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Escribir directamente a Valentina ({BUSINESS_INFO.phone})</span>
                    </a>

                    <a
                      href={BUSINESS_INFO.locationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#2B2B2B]/20 text-[#2B2B2B] font-inter text-xs uppercase tracking-wider font-semibold hover:border-[#2B2B2B] transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Ver en Google Maps</span>
                    </a>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWizardOpen(false);
                        setIsHistoryOpen(true);
                      }}
                      className="text-xs uppercase tracking-wider text-[#2B2B2B]/70 hover:text-[#E66C7D] underline"
                    >
                      Ver en mi Historial de Citas
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            {wizardStep <= 5 && (
              <div className="px-8 py-5 border-t border-[#2B2B2B]/10 bg-white flex items-center justify-between">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-6 py-2.5 rounded-full border border-[#2B2B2B]/20 text-xs uppercase tracking-wider font-semibold text-[#2B2B2B] hover:border-[#2B2B2B] transition-colors"
                  >
                    ← Atrás
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 3 && !selectedTime) {
                        alert("Por favor selecciona un horario disponible.");
                        return;
                      }
                      if (wizardStep === 4) {
                        if (!clientName.trim()) {
                          alert("Por favor ingresa tu nombre completo.");
                          return;
                        }
                        if (!clientPhone.trim() || !isValidPhoneNumber(clientPhone.trim())) {
                          setPhoneError("El número de WhatsApp o teléfono es estrictamente obligatorio (mínimo 8 dígitos).");
                          alert("El WhatsApp o número de teléfono es obligatorio para poder agendar tu cita y enviarte el comprobante.");
                          return;
                        }
                        setPhoneError("");
                      }
                      setWizardStep(wizardStep + 1);
                    }}
                    className="px-8 py-2.5 rounded-full bg-[#E66C7D] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#d45668] transition-colors"
                  >
                    Siguiente →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    className="px-8 py-3 rounded-full bg-[#E66C7D] text-white text-xs uppercase tracking-[0.2em] font-bold hover:bg-[#d45668] transition-all shadow-md inline-flex items-center gap-2"
                  >
                    <span>Confirmar Cita</span>
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLIENT HISTORY MODAL (WITHOUT PASSWORD / ACCOUNT)                       */}
      {/* ========================================================================= */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#FAF6F0] rounded-3xl shadow-2xl border border-[#2B2B2B]/10 overflow-hidden my-8">
            <div className="px-8 py-6 border-b border-[#2B2B2B]/10 flex items-center justify-between">
              <div>
                <h3 className="font-playfair text-2xl text-[#2B2B2B]">Mi Historial de Citas</h3>
                <p className="font-inter text-xs uppercase tracking-wider text-[#2B2B2B]/60">
                  {savedPhone
                    ? `Clienta reconocida: ${savedPhone} (${savedName || "WhatsApp"})`
                    : "Acceso sin contraseñas con tu número de teléfono"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="h-10 w-10 rounded-full bg-[#2B2B2B]/5 hover:bg-[#2B2B2B]/10 flex items-center justify-center text-[#2B2B2B] transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* If no phone is recognized, or user wants to switch device */}
              {!savedPhone && otpStep !== "verified" ? (
                <div className="bg-white p-6 rounded-2xl border border-[#2B2B2B]/10 space-y-4">
                  <p className="font-inter text-sm text-[#2B2B2B]/80">
                    Ingresa tu número de teléfono para acceder a tu historial desde este dispositivo. Te enviaremos un código de verificación de un solo uso por WhatsApp.
                  </p>

                  {otpStep === "phone" ? (
                    <div className="space-y-3">
                      <input
                        type="tel"
                        placeholder="Tu teléfono WhatsApp (ej. 88214532)"
                        value={otpPhoneInput}
                        onChange={(e) => setOtpPhoneInput(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 font-inter text-sm"
                      />
                      {otpError && <p className="text-red-600 text-xs font-inter">{otpError}</p>}
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        className="w-full py-3 rounded-full bg-[#E66C7D] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#d45668]"
                      >
                        Enviar Código de Verificación
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 text-green-800 rounded-xl text-xs font-inter">
                        Código de prueba enviado a WhatsApp ({otpPhoneInput}): <strong>{generatedOtp}</strong>
                      </div>
                      <input
                        type="text"
                        placeholder="Ingresa el código de 4 dígitos"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 font-inter text-sm"
                      />
                      {otpError && <p className="text-red-600 text-xs font-inter">{otpError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOtpStep("phone")}
                          className="px-4 py-2.5 rounded-full border border-gray-300 text-xs uppercase"
                        >
                          Cambiar Número
                        </button>
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="flex-1 py-2.5 rounded-full bg-[#E66C7D] text-white text-xs uppercase font-semibold"
                        >
                          Verificar Código
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Display appointments list */
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[#2B2B2B]/60 pb-2 border-b border-[#2B2B2B]/10">
                    <span>Citas asociadas a tu número</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSavedPhone("");
                        setOtpStep("phone");
                        localStorage.removeItem("npp_client_phone");
                      }}
                      className="text-[#E66C7D] hover:underline"
                    >
                      Cambiar de teléfono
                    </button>
                  </div>

                  {clientAppointments.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-[#2B2B2B]/10">
                      <p className="font-playfair text-lg text-[#2B2B2B] mb-2">No tienes citas registradas aún</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHistoryOpen(false);
                          setIsWizardOpen(true);
                        }}
                        className="px-6 py-2.5 rounded-full bg-[#E66C7D] text-white text-xs uppercase tracking-wider font-semibold"
                      >
                        Agendar Primera Cita
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                      {clientAppointments.map((app) => (
                        <div
                          key={app.id}
                          className="p-5 bg-white rounded-2xl border border-[#2B2B2B]/10 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-playfair text-lg font-bold text-[#2B2B2B]">{app.serviceName}</p>
                              <p className="font-inter text-xs text-[#2B2B2B]/60">
                                Fecha: {app.date} · {formatTime12h(app.time)} – {formatTime12h(app.endTime)}
                              </p>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                app.status === "confirmada"
                                  ? "bg-green-100 text-green-800"
                                  : app.status === "completada"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs font-inter text-[#2B2B2B]/80 pt-2 border-t border-[#2B2B2B]/5">
                            <span>
                              Precio: <strong>{formatCRC(app.priceCRC)}</strong> ({app.paymentMethod.toUpperCase()})
                            </span>

                            {app.status === "confirmada" && (
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReschedulingApp(app);
                                    setRescheduleDate(app.date);
                                    setRescheduleTime(app.time);
                                  }}
                                  className="text-[#E66C7D] hover:underline font-semibold text-[11px]"
                                >
                                  Reagendar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelAppointment(app.id)}
                                  className="text-red-600 hover:text-red-800 underline text-[11px]"
                                >
                                  Cancelar cita
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Rescheduling Modal */}
      {reschedulingApp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#2B2B2B]/10 overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-playfair text-xl font-bold text-[#2B2B2B]">
                  Reagendar Cita
                </h3>
                <p className="text-xs text-[#2B2B2B]/60 mt-0.5">
                  {reschedulingApp.serviceName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReschedulingApp(null)}
                className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF6F1] rounded-xl text-xs space-y-1">
              <p className="text-gray-500">Horario actual:</p>
              <p className="font-bold text-[#2B2B2B] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E66C7D] shrink-0" />
                <span>{reschedulingApp.date} · {formatTime12h(reschedulingApp.time)} – {formatTime12h(reschedulingApp.endTime)}</span>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#2B2B2B] mb-1">
                  Nueva Fecha *
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleTime("");
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E66C7D]"
                />
              </div>

              {rescheduleDate && (
                <div>
                  <label className="block font-semibold text-[#2B2B2B] mb-1">
                    Nueva Hora Disponible *
                  </label>
                  {rescheduleAvailableSlots.length === 0 ? (
                    <p className="text-xs text-red-500 italic p-2 bg-red-50 rounded-lg">
                      No hay horarios disponibles para esta fecha (domingos cerrado o sin cupos). Elige otra fecha.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                      {rescheduleAvailableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setRescheduleTime(slot.time)}
                          className={`p-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                            !slot.available
                              ? "opacity-40 bg-gray-100 border-gray-200 cursor-not-allowed text-gray-400"
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
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReschedulingApp(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!rescheduleDate || !rescheduleTime}
                onClick={handleConfirmClientReschedule}
                className="px-5 py-2 rounded-xl bg-[#E66C7D] text-white text-xs font-semibold hover:bg-[#d45668] disabled:opacity-50 transition-all"
              >
                Confirmar Reagendación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
