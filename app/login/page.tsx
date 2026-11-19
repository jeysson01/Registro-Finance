"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.error === "auth"
      ? "No se pudo completar el inicio de sesión. Inténtalo de nuevo."
      : searchParams.error === "inicia-sesion"
        ? "Inicia sesión para recibir comprobantes compartidos."
        : null
  );
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function google() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (authError) setError(authError.message);
    else setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <section className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-card">
        <Image src="/icons/cf.png" alt="Control de Gastos" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl" />
        <h1 className="mt-4 text-center text-2xl font-bold">Control de Gastos</h1>
        <p className="mt-1 text-center text-sm text-muted">Cada persona entra con su cuenta y ve solo sus gastos.</p>

        {!configured && (
          <p className="mt-4 rounded-xl bg-warning-light p-3 text-sm text-warning-dark">
            Falta Supabase. Copia <code>.env.example</code> a <code>.env.local</code> y completa SUPABASE_URL y SUPABASE_ANON_KEY.
          </p>
        )}

        {configured && (
          <div className="mt-6 space-y-3">
            <Button type="button" className="w-full" disabled={loading} onClick={() => void google()}>
              <GoogleMark /> Continuar con Google
            </Button>
            <button type="button" className="w-full text-sm text-muted underline" onClick={() => setShowEmail((v) => !v)}>
              Entrar con enlace al correo
            </button>
            {showEmail && (
              <form onSubmit={magic} className="space-y-3 border-t border-border pt-3">
                <div>
                  <Label>Correo</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@gmail.com" />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                  Enviar enlace
                </Button>
                {sent && <p className="text-sm text-success-dark">Revisa tu correo y abre el enlace en este navegador.</p>}
              </form>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#fff" d="M21.6 12.23c0-.74-.06-1.28-.2-1.84H12v3.34h5.5c-.11.92-.72 2.3-2.06 3.23l-.02.12 2.98 2.27.21.02c1.9-1.72 3-4.25 3-6.14z" />
      <path fill="#fff" d="M12 22c2.7 0 4.96-.87 6.61-2.37l-3.15-2.4c-.84.58-1.97.98-3.46.98-2.64 0-4.88-1.74-5.68-4.15l-.12.01-3.1 2.36-.04.11C4.7 19.74 8.1 22 12 22z" />
      <path fill="#fff" d="M6.32 14.06A6.1 6.1 0 0 1 6 12c0-.72.12-1.41.31-2.06l-.01-.14-3.14-2.4-.1.05A9.8 9.8 0 0 0 2 12c0 1.59.39 3.09 1.06 4.55l3.26-2.49z" />
      <path fill="#fff" d="M12 5.8c1.87 0 3.13.8 3.85 1.46l2.81-2.7C16.95 2.96 14.7 2 12 2 8.1 2 4.7 4.26 3.06 7.45l3.25 2.49C7.12 7.53 9.36 5.8 12 5.8z" />
    </svg>
  );
}
