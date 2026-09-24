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
  INITIAL_SAMPLE_APPOINTMENTS,
} from "@/lib/nails-data";

export default function NailsPinkPalacePage() {
  // State for appointments & settings
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [holidays, setHolidays] = useState<string[]>([]);

  // Client identification state
  const [savedPhone, setSavedPhone] = useState<string>("");
  const [savedName, setSavedName] = useState<string>("");
  const [savedEmail, setSavedEmail] = useState<string>("");

  // Modals & Panels
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

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

  // Filter category in services section
  const [activeCategory, setActiveCategory] = useState<string>("todos");

  // Device transfer / OTP verification state for History modal
  const [otpPhoneInput, setOtpPhoneInput] = useState<string>("");
  const [otpStep, setOtpStep] = useState<"phone" | "code" | "verified">("phone");
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [otpError, setOtpError] = useState<string>("");

  // Admin filter
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("todas");
  const [adminSearch, setAdminSearch] = useState<string>("");

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
  }, []);

  // Sync appointments to localStorage
  const saveAppointments = (newApps: Appointment[]) => {
    setAppointments(newApps);
    try {
      localStorage.setItem("npp_appointments", JSON.stringify(newApps));
    } catch {
      /* ignore */
    }
  };

  // Sync notifications
  const saveNotificationSettings = (newSettings: NotificationSettings) => {
    setNotificationSettings(newSettings);
    try {
      localStorage.setItem("npp_notification_settings", JSON.stringify(newSettings));
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
    if (activeCategory === "todos") return NAIL_SERVICES;
    return NAIL_SERVICES.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

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

  // Confirm booking
  const handleConfirmBooking = () => {
    if (!clientName.trim() || !clientPhone.trim() || !selectedDate || !selectedTime) {
      alert("Por favor completa todos los datos obligatorios.");
      return;
    }

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
        whatsapp: notificationSettings.whatsapp,
        calendar: notificationSettings.calendar,
        email: notificationSettings.email,
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
    setWizardStep(6); // Step 6 = Success Screen
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

  // Admin: update status
  const handleAdminStatusChange = (id: string, newStatus: "confirmada" | "completada" | "cancelada") => {
    const updated = appointments.map((app) =>
      app.id === id ? { ...app, status: newStatus } : app
    );
    saveAppointments(updated);
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
    <div className="min-h-screen bg-[#FAF6F0] text-[#2B2B2B] font-sans antialiased selection:bg-[#E66C7D] selection:text-white">
      {/* Top Banner Notice */}
      <div className="bg-[#2B2B2B] text-white text-[11px] uppercase tracking-[0.22em] py-2 px-4 text-center">
        Salón de Uñas Profesional · Valentina Cobaleda Pallares · Costa Rica · Horario: Lun–Sáb 8am–7pm
      </div>

      {/* Sticky Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#2B2B2B]/10">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-12">
          {/* Brand Logo */}
          <a href="#inicio" className="flex flex-col group">
            <span className="font-serif italic text-2xl md:text-3xl tracking-tight text-[#E66C7D] group-hover:opacity-90 transition-opacity">
              Nails Pink Palace
            </span>
            <span className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#2B2B2B]/60 -mt-1">
              By Valentina Cobaleda
            </span>
          </a>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-[12px] uppercase tracking-[0.2em] font-medium text-[#2B2B2B]/80">
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

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {/* Client History Button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="relative px-4 py-2.5 rounded-full border border-[#2B2B2B]/20 text-[11px] uppercase tracking-[0.18em] font-semibold text-[#2B2B2B] hover:border-[#E66C7D] hover:text-[#E66C7D] transition-colors"
            >
              Mis Citas
              {savedPhone && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-[#E66C7D] rounded-full border-2 border-[#FAF6F0]" />
              )}
            </button>

            {/* Book Appointment CTA */}
            <button
              type="button"
              onClick={() => {
                setWizardStep(1);
                setIsWizardOpen(true);
              }}
              className="px-6 py-2.5 rounded-full bg-[#E66C7D] text-white text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-[#d45668] transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              Reservar Cita
            </button>

            {/* Admin Toggle */}
            <button
              type="button"
              onClick={() => setIsAdminOpen(true)}
              title="Panel de Administración para Valentina"
              className="p-2 text-[#2B2B2B]/40 hover:text-[#2B2B2B] transition-colors rounded-full text-xs"
            >
              ⚙
            </button>
          </div>
        </div>
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

            <h1 className="font-serif text-[clamp(2.5rem,5.5vw,4.8rem)] leading-[1.05] tracking-tight text-[#2B2B2B]">
              ARTE, CUIDADO Y ESTILO EN CADA DETALLE PARA <span className="italic text-[#E66C7D]">TUS UÑAS</span>.
            </h1>

            <p className="font-sans text-lg md:text-xl text-[#2B2B2B]/75 leading-relaxed max-w-2xl">
              Técnicas avanzadas de salón enfocadas en la belleza y salud de tu uña natural. Sin acrílico, con productos premium y acabados impecables diseñados para durar.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setWizardStep(1);
                  setIsWizardOpen(true);
                }}
                className="px-8 py-4 rounded-full bg-[#E66C7D] text-white font-sans text-xs uppercase tracking-[0.25em] font-semibold hover:bg-[#d45668] transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                Reservar Cita Ahora
              </button>

              <a
                href="#servicios"
                className="px-8 py-4 rounded-full border border-[#2B2B2B]/20 text-[#2B2B2B] font-sans text-xs uppercase tracking-[0.25em] font-semibold hover:border-[#2B2B2B] transition-colors"
              >
                Ver Servicios y Precios
              </a>
            </div>

            {/* Quick Guarantees Strip */}
            <div className="pt-8 border-t border-[#2B2B2B]/10 grid grid-cols-3 gap-4">
              <div>
                <p className="font-serif text-2xl font-bold text-[#E66C7D]">100%</p>
                <p className="font-sans text-xs uppercase tracking-wider text-[#2B2B2B]/60">Sin Acrílico</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-[#2B2B2B]">SINPE</p>
                <p className="font-sans text-xs uppercase tracking-wider text-[#2B2B2B]/60">O Efectivo</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-[#2B2B2B]">Sin Cuenta</p>
                <p className="font-sans text-xs uppercase tracking-wider text-[#2B2B2B]/60">Tu WhatsApp es tu llave</p>
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
                <p className="font-serif italic text-lg">“Cuidamos la estructura natural de tu uña”</p>
                <p className="font-sans text-[11px] uppercase tracking-[0.2em] opacity-90 mt-1">
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
            <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-[#E66C7D] font-semibold">
              Sobre Nails Pink Palace
            </p>
            <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-[#2B2B2B]">
              UNA EXPERIENCIA PENSADA PARA TU <span className="italic text-[#E66C7D]">BIENESTAR</span>
            </h2>
            <p className="font-sans text-base md:text-lg text-[#2B2B2B]/75 leading-relaxed pt-2">
              {BUSINESS_INFO.description}
            </p>
          </div>

          {/* 4 Feature Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-serif text-3xl text-[#E66C7D] mb-4 block">01</span>
                <h3 className="font-sans text-sm uppercase tracking-[0.15em] font-bold text-[#2B2B2B] mb-2">
                  Uña Natural Sana
                </h3>
                <p className="font-sans text-sm text-[#2B2B2B]/70 leading-relaxed">
                  No trabajamos acrílico invasivo. Cada procedimiento protege tu matriz y lámina ungueal.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-serif text-3xl text-[#E66C7D] mb-4 block">02</span>
                <h3 className="font-sans text-sm uppercase tracking-[0.15em] font-bold text-[#2B2B2B] mb-2">
                  Técnica Rusa de Precisión
                </h3>
                <p className="font-sans text-sm text-[#2B2B2B]/70 leading-relaxed">
                  Limpieza anatómica milimétrica con torno para bordes perfectos y mayor duración de esmalte.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-serif text-3xl text-[#E66C7D] mb-4 block">03</span>
                <h3 className="font-sans text-sm uppercase tracking-[0.15em] font-bold text-[#2B2B2B] mb-2">
                  Materiales Premium
                </h3>
                <p className="font-sans text-sm text-[#2B2B2B]/70 leading-relaxed">
                  Polygel, Rubber Base y geles con calcio de máxima adherencia, flexibilidad y brillo.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#2B2B2B]/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-serif text-3xl text-[#E66C7D] mb-4 block">04</span>
                <h3 className="font-sans text-sm uppercase tracking-[0.15em] font-bold text-[#2B2B2B] mb-2">
                  Agendamiento Ágil
                </h3>
                <p className="font-sans text-sm text-[#2B2B2B]/70 leading-relaxed">
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
              <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-[#E66C7D] font-semibold mb-2">
                Menú de Servicios
              </p>
              <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-[#2B2B2B]">
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
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full font-serif text-sm font-bold text-[#E66C7D]">
                      {formatCRC(service.priceCRC)}
                    </div>
                    {service.popular && (
                      <div className="absolute top-4 left-4 bg-[#E66C7D] text-white px-3 py-1 rounded-full font-sans text-[10px] uppercase tracking-[0.2em] font-semibold">
                        Favorito
                      </div>
                    )}
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#2B2B2B]/60 mb-2">
                      <span>⏱ {service.durationMin} min</span>
                      <span>•</span>
                      <span className="capitalize">{service.category}</span>
                    </div>

                    <h3 className="font-serif text-2xl text-[#2B2B2B] mb-3 group-hover:text-[#E66C7D] transition-colors">
                      {service.name}
                    </h3>

                    <p className="font-sans text-sm text-[#2B2B2B]/70 leading-relaxed mb-6">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-8 pt-0">
                  <button
                    type="button"
                    onClick={() => openBookingWithService(service)}
                    className="w-full py-3.5 rounded-full bg-[#FAF6F1] text-[#2B2B2B] group-hover:bg-[#E66C7D] group-hover:text-white font-sans text-xs uppercase tracking-[0.2em] font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <span>Reservar Este Servicio</span>
                    <span>→</span>
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
            <div className="h-10 w-10 rounded-full bg-[#E66C7D]/10 text-[#E66C7D] flex items-center justify-center font-bold text-lg shrink-0">
              ⚡
            </div>
            <div>
              <h4 className="font-sans text-sm uppercase tracking-wider font-bold text-[#2B2B2B] mb-1">
                Anticipación Mínima: 2 Horas
              </h4>
              <p className="font-sans text-xs text-[#2B2B2B]/70 leading-relaxed">
                Para garantizar la preparación adecuada de tu cita, el sistema requiere al menos 2 horas de anticipación.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-[#E66C7D]/10 text-[#E66C7D] flex items-center justify-center font-bold text-lg shrink-0">
              💳
            </div>
            <div>
              <h4 className="font-sans text-sm uppercase tracking-wider font-bold text-[#2B2B2B] mb-1">
                SINPE Móvil & Efectivo
              </h4>
              <p className="font-sans text-xs text-[#2B2B2B]/70 leading-relaxed">
                Paga al finalizar el servicio. Transferencia directa a 8735-7321 (Valentina Cobaleda) o en efectivo.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-[#E66C7D]/10 text-[#E66C7D] flex items-center justify-center font-bold text-lg shrink-0">
              📱
            </div>
            <div>
              <h4 className="font-sans text-sm uppercase tracking-wider font-bold text-[#2B2B2B] mb-1">
                Sin Contraseñas
              </h4>
              <p className="font-sans text-xs text-[#2B2B2B]/70 leading-relaxed">
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
            <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-[#E66C7D] font-semibold">
              Ubicación & Contacto
            </p>
            <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-[#2B2B2B]">
              VISÍTANOS EN <span className="italic text-[#E66C7D]">COSTA RICA</span>
            </h2>
            <p className="font-sans text-base text-[#2B2B2B]/75 leading-relaxed">
              Disfruta de un ambiente privado, relajante y acogedor mientras cuidamos de tus manos y pies.
            </p>

            <div className="space-y-4 pt-4 border-t border-[#2B2B2B]/10">
              <div className="flex items-center gap-3">
                <span className="text-[#E66C7D] text-lg">📍</span>
                <div>
                  <p className="font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B]">Ubicación</p>
                  <p className="font-sans text-sm text-[#2B2B2B]/70">Costa Rica</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[#E66C7D] text-lg">🕒</span>
                <div>
                  <p className="font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B]">Horario de Atención</p>
                  <p className="font-sans text-sm text-[#2B2B2B]/70">Lunes a Sábado: 8:00 a.m. – 7:00 p.m. · Domingo: Cerrado</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[#E66C7D] text-lg">💬</span>
                <div>
                  <p className="font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B]">WhatsApp Directo</p>
                  <p className="font-sans text-sm text-[#2B2B2B]/70">8735-7321 (Valentina Cobaleda)</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <a
                href={BUSINESS_INFO.locationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#2B2B2B] text-white font-sans text-xs uppercase tracking-[0.25em] font-semibold hover:bg-[#E66C7D] transition-colors shadow-md"
              >
                <span>Abrir en Google Maps</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="bg-[#FAF6F1] p-8 md:p-12 rounded-3xl border border-[#2B2B2B]/10 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-serif italic text-2xl text-[#E66C7D]">Nails Pink Palace</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-[10px] uppercase font-bold tracking-wider rounded-full">
                    Abierto Lun–Sáb
                  </span>
                </div>
                <p className="font-sans text-sm text-[#2B2B2B]/80 leading-relaxed">
                  Para tu comodidad y privacidad, atendemos únicamente con cita previa. Al agendar en nuestro sistema, reservamos el tiempo exclusivo para ti.
                </p>
                <div className="p-5 bg-white rounded-2xl border border-[#2B2B2B]/10 space-y-2">
                  <p className="font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B]">
                    Información para pago SINPE Móvil
                  </p>
                  <p className="font-sans text-sm text-[#2B2B2B]">
                    Número: <strong className="font-bold text-[#E66C7D]">8735-7321</strong>
                  </p>
                  <p className="font-sans text-xs text-[#2B2B2B]/60">
                    A nombre de: Valentina Cobaleda (se cancela al finalizar el servicio).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2B2B2B] text-white py-16">
        <div className="mx-auto max-w-7xl px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/10 pb-12">
          <div className="text-center md:text-left">
            <p className="font-serif italic text-3xl text-[#E66C7D]">Nails Pink Palace</p>
            <p className="font-sans text-xs uppercase tracking-[0.25em] text-white/60 mt-1">
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
                <p className="font-serif italic text-xl text-[#E66C7D]">Nails Pink Palace</p>
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#2B2B2B]/60">
                  {wizardStep <= 5 ? `Paso ${wizardStep} de 5 — Agendamiento` : "¡Cita Confirmada!"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsWizardOpen(false)}
                className="h-10 w-10 rounded-full bg-[#2B2B2B]/5 hover:bg-[#2B2B2B]/10 flex items-center justify-center text-[#2B2B2B] text-lg transition-colors"
                aria-label="Cerrar asistente"
              >
                ✕
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
                    <h3 className="font-serif text-2xl text-[#2B2B2B]">Elige tu Servicio</h3>
                    <p className="font-sans text-sm text-[#2B2B2B]/70">
                      Selecciona la técnica de manicura, pedicura o cuidado para tu sesión.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                    {NAIL_SERVICES.map((srv) => {
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
                              <p className="font-sans text-sm font-bold text-[#2B2B2B]">{srv.name}</p>
                              <p className="font-sans text-xs text-[#2B2B2B]/60">
                                ⏱ {srv.durationMin} min · {srv.category}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-serif font-bold text-[#E66C7D]">
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
                    <h3 className="font-serif text-2xl text-[#2B2B2B]">Método de Pago</h3>
                    <p className="font-sans text-sm text-[#2B2B2B]/70">
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
                          <span className="font-sans text-sm font-bold uppercase tracking-wider text-[#2B2B2B]">
                            SINPE Móvil
                          </span>
                        </div>
                        <span className="font-serif text-lg font-bold text-[#E66C7D]">
                          {formatCRC(selectedService.priceCRC)}
                        </span>
                      </div>

                      {/* Required instruction text */}
                      <p className="font-sans text-xs text-[#2B2B2B]/80 pl-7 leading-relaxed">
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
                          <span className="font-sans text-sm font-bold uppercase tracking-wider text-[#2B2B2B]">
                            Efectivo
                          </span>
                        </div>
                        <span className="font-serif text-lg font-bold text-[#2B2B2B]">
                          {formatCRC(selectedService.priceCRC)}
                        </span>
                      </div>

                      {/* Required instruction text */}
                      <p className="font-sans text-xs text-[#2B2B2B]/80 pl-7 leading-relaxed">
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
                    <h3 className="font-serif text-2xl text-[#2B2B2B]">Día y Hora de tu Cita</h3>
                    <p className="font-sans text-sm text-[#2B2B2B]/70">
                      Horario disponible de 8:00 a.m. a 7:00 p.m. con mínimo 2 horas de anticipación.
                    </p>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-2">
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
                      className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 bg-white text-[#2B2B2B] font-sans text-sm focus:border-[#E66C7D] focus:outline-none"
                    />
                  </div>

                  {/* Slots Grid */}
                  <div>
                    <label className="block font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-2">
                      Horarios disponibles para {selectedService.name} ({selectedService.durationMin} min):
                    </label>

                    {availableSlots.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-[#2B2B2B]/10">
                        <p className="font-serif text-lg text-[#E66C7D] mb-1">Cerrado o sin horarios disponibles</p>
                        <p className="font-sans text-xs text-[#2B2B2B]/60">
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
                              className={`p-3 rounded-xl text-xs font-sans font-medium transition-all ${
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
                    <h3 className="font-serif text-2xl text-[#2B2B2B]">Tus Datos de Contacto</h3>
                    <p className="font-sans text-sm text-[#2B2B2B]/70">
                      Sin contraseñas. Tu teléfono WhatsApp sirve para identificarte y enviarte la confirmación.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-1.5">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Mariana Rojas Solano"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 bg-white text-[#2B2B2B] font-sans text-sm focus:border-[#E66C7D] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-1.5">
                        Teléfono (WhatsApp) *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej. 88214532"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 bg-white text-[#2B2B2B] font-sans text-sm focus:border-[#E66C7D] focus:outline-none"
                      />
                      <p className="font-sans text-[11px] text-[#2B2B2B]/50 mt-1">
                        Se guardará en este dispositivo para que en tus próximas visitas reconozca tu historial.
                      </p>
                    </div>

                    <div>
                      <label className="block font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-1.5">
                        Correo Electrónico (Opcional)
                      </label>
                      <input
                        type="email"
                        placeholder="Ej. tu@correo.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 bg-white text-[#2B2B2B] font-sans text-sm focus:border-[#E66C7D] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-xs uppercase tracking-wider font-bold text-[#2B2B2B] mb-1.5">
                        Notas o Especificaciones para Valentina (Opcional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ej. Quiero diseño minimalista con destellos dorados..."
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        className="w-full p-3 rounded-xl border border-[#2B2B2B]/20 bg-white text-[#2B2B2B] font-sans text-sm focus:border-[#E66C7D] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: CONFIRMACIÓN */}
              {wizardStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-serif text-2xl text-[#2B2B2B]">Resumen de tu Cita</h3>
                    <p className="font-sans text-sm text-[#2B2B2B]/70">
                      Revisa los detalles antes de confirmar. Al presionar confirmar, se notificará a Valentina.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-[#2B2B2B]/10 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-[#2B2B2B]/10">
                      <div>
                        <p className="font-serif text-xl font-bold text-[#2B2B2B]">{selectedService.name}</p>
                        <p className="font-sans text-xs text-[#2B2B2B]/60">
                          ⏱ Duración estimada: {selectedService.durationMin} minutos
                        </p>
                      </div>
                      <span className="font-serif text-2xl font-bold text-[#E66C7D]">
                        {formatCRC(selectedService.priceCRC)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-sans">
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
                        <span className="text-[#2B2B2B]/60 uppercase tracking-wider block">WhatsApp</span>
                        <strong className="text-sm text-[#2B2B2B]">{clientPhone}</strong>
                      </div>
                    </div>

                    <div className="p-4 bg-[#FAF6F1] rounded-xl text-xs font-sans text-[#2B2B2B]/80 space-y-1">
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
                  <div className="h-16 w-16 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl">
                    ✓
                  </div>

                  <div>
                    <h3 className="font-serif text-3xl text-[#2B2B2B]">¡Cita Agendada con Éxito!</h3>
                    <p className="font-sans text-sm text-[#2B2B2B]/70 max-w-md mx-auto mt-2">
                      Tu cita ha quedado registrada en el sistema de Nails Pink Palace. Valentina ya ha sido notificada.
                    </p>
                  </div>

                  {/* Notification dispatch badges */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-semibold border border-green-200">
                      ✓ WhatsApp Disparado
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                      ✓ Google Calendar ({DEFAULT_NOTIFICATIONS.valentinaEmail})
                    </span>
                    {confirmedAppointment.clientEmail && (
                      <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-200">
                        ✓ Correo Enviado
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <a
                      href={createGoogleCalendarUrl(confirmedAppointment)}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-6 py-3 rounded-full border border-[#2B2B2B]/20 text-[#2B2B2B] font-sans text-xs uppercase tracking-wider font-semibold hover:border-[#2B2B2B] transition-colors"
                    >
                      📅 Agregar a mi Google Calendar
                    </a>

                    <a
                      href={createWhatsAppMessageUrl(
                        BUSINESS_INFO.phone,
                        `Hola Valentina, acabo de agendar una cita en Nails Pink Palace para ${confirmedAppointment.serviceName} el ${confirmedAppointment.date} a las ${confirmedAppointment.time}. Mi nombre es ${confirmedAppointment.clientName}.`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#E66C7D] text-white font-sans text-xs uppercase tracking-wider font-semibold hover:bg-[#d45668] transition-colors"
                    >
                      💬 Escribir a Valentina por WhatsApp
                    </a>
                  </div>

                  <div className="pt-4">
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
                      if (wizardStep === 4 && (!clientName.trim() || !clientPhone.trim())) {
                        alert("Por favor ingresa tu nombre y teléfono.");
                        return;
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
                    className="px-8 py-3 rounded-full bg-[#E66C7D] text-white text-xs uppercase tracking-[0.2em] font-bold hover:bg-[#d45668] transition-all shadow-md"
                  >
                    Confirmar Cita ✓
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
                <h3 className="font-serif text-2xl text-[#2B2B2B]">Mi Historial de Citas</h3>
                <p className="font-sans text-xs uppercase tracking-wider text-[#2B2B2B]/60">
                  {savedPhone
                    ? `Clienta reconocida: ${savedPhone} (${savedName || "WhatsApp"})`
                    : "Acceso sin contraseñas con tu número de teléfono"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="h-10 w-10 rounded-full bg-[#2B2B2B]/5 hover:bg-[#2B2B2B]/10 flex items-center justify-center text-[#2B2B2B] text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* If no phone is recognized, or user wants to switch device */}
              {!savedPhone && otpStep !== "verified" ? (
                <div className="bg-white p-6 rounded-2xl border border-[#2B2B2B]/10 space-y-4">
                  <p className="font-sans text-sm text-[#2B2B2B]/80">
                    Ingresa tu número de teléfono para acceder a tu historial desde este dispositivo. Te enviaremos un código de verificación de un solo uso por WhatsApp.
                  </p>

                  {otpStep === "phone" ? (
                    <div className="space-y-3">
                      <input
                        type="tel"
                        placeholder="Tu teléfono WhatsApp (ej. 88214532)"
                        value={otpPhoneInput}
                        onChange={(e) => setOtpPhoneInput(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 font-sans text-sm"
                      />
                      {otpError && <p className="text-red-600 text-xs font-sans">{otpError}</p>}
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
                      <div className="p-3 bg-green-50 text-green-800 rounded-xl text-xs font-sans">
                        Código de prueba enviado a WhatsApp ({otpPhoneInput}): <strong>{generatedOtp}</strong>
                      </div>
                      <input
                        type="text"
                        placeholder="Ingresa el código de 4 dígitos"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-[#2B2B2B]/20 font-sans text-sm"
                      />
                      {otpError && <p className="text-red-600 text-xs font-sans">{otpError}</p>}
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
                      <p className="font-serif text-lg text-[#2B2B2B] mb-2">No tienes citas registradas aún</p>
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
                              <p className="font-serif text-lg font-bold text-[#2B2B2B]">{app.serviceName}</p>
                              <p className="font-sans text-xs text-[#2B2B2B]/60">
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

                          <div className="flex items-center justify-between text-xs font-sans text-[#2B2B2B]/80 pt-2 border-t border-[#2B2B2B]/5">
                            <span>
                              Precio: <strong>{formatCRC(app.priceCRC)}</strong> ({app.paymentMethod.toUpperCase()})
                            </span>

                            {app.status === "confirmada" && (
                              <button
                                type="button"
                                onClick={() => handleCancelAppointment(app.id)}
                                className="text-red-600 hover:text-red-800 underline text-[11px]"
                              >
                                Cancelar cita
                              </button>
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

      {/* ========================================================================= */}
      {/* 3. ADMIN PANEL FOR VALENTINA                                              */}
      {/* ========================================================================= */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#2B2B2B]/10 overflow-hidden my-8">
            <div className="px-8 py-6 bg-[#2B2B2B] text-white flex items-center justify-between">
              <div>
                <p className="font-serif italic text-2xl text-[#E66C7D]">Nails Pink Palace</p>
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-white/60">
                  Panel de Gestión para Valentina Cobaleda Pallares
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAdminOpen(false)}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#FAF6F1] border border-[#2B2B2B]/10">
                  <p className="font-sans text-xs uppercase tracking-wider text-[#2B2B2B]/60">Total Citas</p>
                  <p className="font-serif text-3xl font-bold text-[#2B2B2B] mt-1">{appointments.length}</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF6F1] border border-[#2B2B2B]/10">
                  <p className="font-sans text-xs uppercase tracking-wider text-[#2B2B2B]/60">Confirmadas</p>
                  <p className="font-serif text-3xl font-bold text-[#E66C7D] mt-1">
                    {appointments.filter((a) => a.status === "confirmada").length}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF6F1] border border-[#2B2B2B]/10">
                  <p className="font-sans text-xs uppercase tracking-wider text-[#2B2B2B]/60">Ingresos Est.</p>
                  <p className="font-serif text-2xl font-bold text-[#2B2B2B] mt-1">
                    {formatCRC(
                      appointments
                        .filter((a) => a.status !== "cancelada")
                        .reduce((sum, a) => sum + a.priceCRC, 0)
                    )}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF6F1] border border-[#2B2B2B]/10">
                  <p className="font-sans text-xs uppercase tracking-wider text-[#2B2B2B]/60">Clientas</p>
                  <p className="font-serif text-3xl font-bold text-[#2B2B2B] mt-1">
                    {new Set(appointments.map((a) => a.clientPhone)).size}
                  </p>
                </div>
              </div>

              {/* Notification Integrations Configuration */}
              <div className="p-6 rounded-2xl bg-[#FAF6F1] border border-[#2B2B2B]/10 space-y-4">
                <h4 className="font-sans text-sm uppercase tracking-wider font-bold text-[#2B2B2B]">
                  Configuración de Notificaciones Automáticas
                </h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.whatsapp}
                      onChange={(e) =>
                        saveNotificationSettings({
                          ...notificationSettings,
                          whatsapp: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-[#E66C7D]"
                    />
                    <div className="text-xs">
                      <strong className="block text-[#2B2B2B]">WhatsApp Business API</strong>
                      <span className="text-[#2B2B2B]/60">A Valentina ({BUSINESS_INFO.phone}) y clienta</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.calendar}
                      onChange={(e) =>
                        saveNotificationSettings({
                          ...notificationSettings,
                          calendar: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-[#E66C7D]"
                    />
                    <div className="text-xs">
                      <strong className="block text-[#2B2B2B]">Google Calendar</strong>
                      <span className="text-[#2B2B2B]/60">{BUSINESS_INFO.email}</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.email}
                      onChange={(e) =>
                        saveNotificationSettings({
                          ...notificationSettings,
                          email: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-[#E66C7D]"
                    />
                    <div className="text-xs">
                      <strong className="block text-[#2B2B2B]">Correo Electrónico</strong>
                      <span className="text-[#2B2B2B]/60">Confirmación y recordatorio</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Appointments Manager Table */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h4 className="font-sans text-sm uppercase tracking-wider font-bold text-[#2B2B2B]">
                    Gestión de Citas
                  </h4>

                  <div className="flex items-center gap-2">
                    <select
                      value={adminStatusFilter}
                      onChange={(e) => setAdminStatusFilter(e.target.value)}
                      className="p-2 rounded-lg border border-gray-200 text-xs"
                    >
                      <option value="todas">Todas las citas</option>
                      <option value="confirmada">Confirmadas</option>
                      <option value="completada">Completadas</option>
                      <option value="cancelada">Canceladas</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Buscar por clienta o tel..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="p-2 rounded-lg border border-gray-200 text-xs w-48"
                    />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF6F1] border-b border-gray-200 text-[#2B2B2B]/60 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Clienta</th>
                        <th className="p-3">Servicio</th>
                        <th className="p-3">Fecha & Hora</th>
                        <th className="p-3">Monto & Pago</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {appointments
                        .filter((app) => {
                          if (adminStatusFilter !== "todas" && app.status !== adminStatusFilter) return false;
                          if (
                            adminSearch &&
                            !app.clientName.toLowerCase().includes(adminSearch.toLowerCase()) &&
                            !app.clientPhone.includes(adminSearch)
                          ) {
                            return false;
                          }
                          return true;
                        })
                        .map((app) => (
                          <tr key={app.id} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-[#2B2B2B]">
                              <div>{app.clientName}</div>
                              <div className="text-[10px] text-gray-500">{app.clientPhone}</div>
                            </td>
                            <td className="p-3">{app.serviceName}</td>
                            <td className="p-3">
                              <div>{app.date}</div>
                              <div className="text-[10px] text-gray-500">
                                {formatTime12h(app.time)} – {formatTime12h(app.endTime)}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-[#E66C7D]">{formatCRC(app.priceCRC)}</span>
                              <div className="text-[10px] uppercase text-gray-500">{app.paymentMethod}</div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  app.status === "confirmada"
                                    ? "bg-green-100 text-green-800"
                                    : app.status === "completada"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {app.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <select
                                value={app.status}
                                onChange={(e) =>
                                  handleAdminStatusChange(
                                    app.id,
                                    e.target.value as "confirmada" | "completada" | "cancelada"
                                  )
                                }
                                className="p-1.5 rounded border border-gray-200 text-xs bg-white"
                              >
                                <option value="confirmada">Confirmada</option>
                                <option value="completada">Completada</option>
                                <option value="cancelada">Cancelada</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
