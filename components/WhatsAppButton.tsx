"use client";

import { FaWhatsapp } from "react-icons/fa";
import { WHATSAPP_URL } from "@/lib/contact";

export default function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with UstaadHub on WhatsApp"
      className="whatsapp-button fixed right-6 md:right-8 z-40 flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ease-out hover:scale-110 active:scale-95"
    >
      <FaWhatsapp className="w-7 h-7 md:w-8 md:h-8 text-white" />
    </a>
  );
}
