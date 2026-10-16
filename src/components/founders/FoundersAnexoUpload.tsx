"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Paperclip } from "lucide-react";
import { executarAcaoFounders } from "@/lib/founders";
import { supabase } from "@/lib/supabaseClient";
import type { FoundersAnexarContribuicaoPayload } from "@/types/founders";

const BUCKET = "founders-anexos";
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

type MimeAnexo = FoundersAnexarContribuicaoPayload["mime_type"];

const EXTENSOES: Record<MimeAnexo, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

type Feedback = { kind: "success" | "error"; message: string };

function ehMimePermitido(valor: string): valor is MimeAnexo {
  return valor in EXTENSOES;
}

async function assinaturaCompativel(file: File, mime: MimeAnexo) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (inicio: number, fim: number) =>
    String.fromCharCode(...bytes.slice(inicio, fim));

  switch (mime) {
    case "application/pdf":
      return ascii(0, 5) === "%PDF-";
    case "image/png":
      return (
        bytes[0] === 0x89 && ascii(1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a
      );
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  }
}

async function calcularHash(file: File) {
  if (!globalThis.crypto?.subtle) return undefined;
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function nomeSeguro(nome: string, extensao: string) {
  const base = nome
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "anexo"}.${extensao}`;
}

export default function FoundersAnexoUpload({
  empresaId,
  contribuicaoId,
  onUploaded,
}: {
  empresaId: string;
  contribuicaoId: string;
  onUploaded: () => void;
}) {
  const lock = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [inputVersion, setInputVersion] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;

    if (!file) {
      setFeedback({ kind: "error", message: "Selecione um arquivo para anexar." });
      return;
    }
    if (!ehMimePermitido(file.type)) {
      setFeedback({
        kind: "error",
        message: "Formato não permitido. Envie PDF, PNG, JPG ou WebP.",
      });
      return;
    }
    if (file.size < 1 || file.size > MAX_BYTES) {
      setFeedback({
        kind: "error",
        message: "O arquivo deve ter entre 1 byte e 10 MB.",
      });
      return;
    }

    lock.current = true;
    setProcessing(true);
    setFeedback(null);

    let caminhoEnviado: string | null = null;
    try {
      if (!(await assinaturaCompativel(file, file.type))) {
        throw new Error("O conteúdo do arquivo não corresponde ao formato informado.");
      }

      const mime = file.type;
      const nomeArquivo = nomeSeguro(file.name, EXTENSOES[mime]);
      const caminho = `${empresaId}/${contribuicaoId}/${crypto.randomUUID()}-${nomeArquivo}`;

      const upload = await supabase.storage.from(BUCKET).upload(caminho, file, {
        contentType: mime,
        upsert: false,
      });
      if (upload.error) {
        throw new Error(
          "Não foi possível enviar o arquivo. Confira sua conexão e as permissões do Storage."
        );
      }
      caminhoEnviado = caminho;

      await executarAcaoFounders({
        acao: "anexar_contribuicao",
        contribuicao_id: contribuicaoId,
        storage_bucket: BUCKET,
        storage_path: caminho,
        nome_arquivo: nomeArquivo,
        mime_type: mime,
        tamanho_bytes: file.size,
        hash_arquivo: await calcularHash(file),
      });

      caminhoEnviado = null;
      setFile(null);
      setInputVersion((version) => version + 1);
      setFeedback({ kind: "success", message: "Anexo enviado e registrado com sucesso." });
      onUploaded();
    } catch (error) {
      let message =
        error instanceof Error ? error.message : "Não foi possível anexar o arquivo.";

      if (caminhoEnviado) {
        const remocao = await supabase.storage.from(BUCKET).remove([caminhoEnviado]);
        message += remocao.error
          ? " O arquivo enviado não pôde ser removido automaticamente; informe o suporte."
          : " O arquivo enviado foi removido do Storage.";
      }
      setFeedback({ kind: "error", message });
    } finally {
      lock.current = false;
      setProcessing(false);
    }
  }

  return (
    <form className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-end" onSubmit={enviar}>
      <label className="grid min-w-0 gap-1.5 text-xs text-text-secondary sm:flex-1">
        Anexo (PDF, PNG, JPG ou WebP · até 10 MB)
        <input
          accept={ACCEPT}
          className="gc-field text-sm"
          disabled={processing}
          key={inputVersion}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setFeedback(null);
          }}
          type="file"
        />
      </label>
      <button
        className="gc-action gc-secondary"
        disabled={processing || !file}
        type="submit"
      >
        <Paperclip aria-hidden="true" size={15} />
        {processing ? "Enviando anexo..." : "Anexar arquivo"}
      </button>
      {feedback && (
        <p
          aria-live="polite"
          className={`w-full text-xs ${
            feedback.kind === "success" ? "text-success" : "text-danger"
          }`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
    </form>
  );
}
