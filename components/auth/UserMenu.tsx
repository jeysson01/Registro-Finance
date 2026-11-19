"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({ nombre, avatarUrl }: { nombre: string; avatarUrl: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-3"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={32} height={32} unoptimized className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
            {nombre.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="max-w-[9rem] truncate text-sm font-medium">{nombre}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-border bg-white p-1 shadow-card">
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-background"
            onClick={async () => {
              await createClient().auth.signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
