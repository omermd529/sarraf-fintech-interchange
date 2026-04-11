"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";

export default function Navbar() {
  const [lang, setLang] = useState("EN");

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center">
          <Image src="/sarraf_logo.svg" alt="Sarraf" width={500} height={250} className="h-36 w-auto" />
        </Link>
        
        <div className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
          <Link href="/" className="hover:text-emerald-500 transition-colors">Dashboard</Link>
          <Link href="/pay" className="hover:text-emerald-500 transition-colors">Pay</Link>
          <Link href="/history" className="hover:text-emerald-500 transition-colors">History</Link>
        </div>
      </div>

      <button 
        onClick={() => setLang(lang === "EN" ? "AR" : "EN")}
        className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-100 border border-zinc-800 px-3 py-1 rounded-md"
      >
        <Globe className="w-3 h-3" />
        {lang === "EN" ? "العربية" : "ENGLISH"}
      </button>
    </nav>
  );
}
