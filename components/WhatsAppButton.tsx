"use client";

import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton() {
  const whatsappNumber = "918445245865";
  const whatsappMessage = "Hello%20I%20want%20to%20know%20more%20about%20UstaadHub.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with UstaadHub on WhatsApp"
      className="whatsapp-button fixed right-6 md:right-8 z-40 flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ease-out hover:scale-110 active:scale-95"
    >
      <FaWhatsapp className="w-7 h-7 md:w-8 md:h-8 text-white" />
    </a>
  );
}
