"use client"
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) setErro(error.message);
    else window.location.href = "/dashboard";
  };

  return (
    <div style={{ padding: 50 }}>
      <h1>Login</h1>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} />
      <button onClick={login}>Entrar</button>
      {erro && <p style={{ color: "red" }}>{erro}</p>}
    </div>
  );
}
