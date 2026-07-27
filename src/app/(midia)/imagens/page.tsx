"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UploadCloud, Image as ImageIcon, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { analyzeImageWithGemini } from "./actions";
import { useTheme } from "@/context/ThemeContext";

type UploadState = {
  file: File | null;
  previewUrl: string;
  mimeType: string;
  base64Data: string;
};

const DEFAULT_PROMPT = [
  "Analise a imagem enviada e descreva o que voce identifica.",
  "Responda em Markdown com secoes curtas:",
  "1) Resumo visual",
  "2) Elementos detectados",
  "3) Possiveis problemas/inconsistencias",
  "4) Recomendacoes praticas",
].join("\n");

const PROMPT_PRESETS = [
  {
    label: "Deteccao de texto",
    prompt: [
      "Extraia todo o texto visivel na imagem.",
      "Responda em Markdown com:",
      "1) Texto completo extraido",
      "2) Trechos incertos",
      "3) Resumo curto do conteudo",
    ].join("\n"),
  },
  {
    label: "Inspecao de qualidade",
    prompt: [
      "Analise a qualidade visual da imagem.",
      "Responda em Markdown com:",
      "1) Nitidez e foco",
      "2) Iluminacao e contraste",
      "3) Ruido, artefatos ou distorcoes",
      "4) Recomendacoes para melhorar a captura",
    ].join("\n"),
  },
  {
    label: "Resumo tecnico",
    prompt: [
      "Descreva tecnicamente o que aparece na imagem.",
      "Responda em Markdown com:",
      "1) Componentes principais",
      "2) Medidas aparentes e proporcoes (estimativas)",
      "3) Pontos de atencao",
      "4) Proximos passos sugeridos",
    ].join("\n"),
  },
];

const INITIAL_UPLOAD_STATE: UploadState = {
  file: null,
  previewUrl: "",
  mimeType: "",
  base64Data: "",
};

function toBase64Data(file: File): Promise<{ base64Data: string; previewUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const [meta, base64Data] = result.split(",");
      if (!meta || !base64Data) {
        reject(new Error("Falha ao converter a imagem."));
        return;
      }

      const mimeMatch = meta.match(/data:(.*?);base64/);
      const mimeType = mimeMatch?.[1] || file.type || "image/png";

      resolve({
        base64Data,
        previewUrl: result,
        mimeType,
      });
    };

    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });
}

export default function ImagensPage() {
  const { theme } = useTheme();

  const [upload, setUpload] = useState<UploadState>(INITIAL_UPLOAD_STATE);
  const [dragActive, setDragActive] = useState(false);
  const [markdownResult, setMarkdownResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);

  const hasImage = Boolean(upload.file && upload.previewUrl);

  const uploadHint = useMemo(() => {
    if (!upload.file) return "PNG, JPG, JPEG ou WEBP";
    const sizeMb = (upload.file.size / (1024 * 1024)).toFixed(2);
    return `${upload.file.name} - ${sizeMb} MB`;
  }, [upload.file]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Arquivo invalido. Envie uma imagem.");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setError("Imagem muito grande. Limite de 12MB.");
      return;
    }

    try {
      setError("");
      const converted = await toBase64Data(file);
      setUpload({
        file,
        previewUrl: converted.previewUrl,
        mimeType: converted.mimeType,
        base64Data: converted.base64Data,
      });
      setMarkdownResult("");
    } catch (conversionError) {
      console.error(conversionError);
      setError("Nao foi possivel preparar a imagem para analise.");
    }
  };

  const onDrop: React.DragEventHandler<HTMLLabelElement> = async (event) => {
    event.preventDefault();
    setDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) await handleFile(droppedFile);
  };

  const onAnalyze = async () => {
    if (!upload.file || !upload.base64Data || !upload.mimeType) {
      setError("Selecione uma imagem antes de analisar.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await analyzeImageWithGemini({
        mimeType: upload.mimeType,
        base64Data: upload.base64Data,
        prompt,
      });
      setMarkdownResult(result);
    } catch (analysisError) {
      const message = analysisError instanceof Error ? analysisError.message : "Erro inesperado na analise.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Leitura Inteligente</p>
                <h1 className="mt-1 text-2xl font-black md:text-3xl" style={{ color: theme.contentTextLightBg }}>
                  Analise de Imagens com Gemini Vision
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  Envie uma imagem, visualize o preview e rode uma analise automatica em Markdown.
                </p>
              </div>
              <button
                onClick={onAnalyze}
                disabled={!hasImage || loading}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: theme.menuBackgroundColor }}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? "Analisando..." : "Analisar"}
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Prompt da Analise</p>
                <button
                  type="button"
                  onClick={() => setPrompt(DEFAULT_PROMPT)}
                  className="text-[11px] font-bold text-gray-500 hover:text-gray-700"
                >
                  Restaurar padrao
                </button>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {PROMPT_PRESETS.map((preset) => {
                  const isActive = prompt.trim() === preset.prompt.trim();
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPrompt(preset.prompt)}
                      className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all ${
                        isActive
                          ? "border-sky-300 bg-sky-50 text-sky-700"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={5}
                className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Descreva o que deseja que o Gemini analise na imagem"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertTriangle className="size-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-400">Upload e Preview</h2>

            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                dragActive ? "border-sky-400 bg-sky-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={async (event) => {
                  const selected = event.target.files?.[0];
                  if (selected) await handleFile(selected);
                }}
              />

              {hasImage ? (
                <img src={upload.previewUrl} alt="Preview da imagem" className="max-h-64 w-auto rounded-xl object-contain shadow" />
              ) : (
                <>
                  <UploadCloud className="mb-3 size-10 text-gray-400" />
                  <p className="text-sm font-bold text-gray-600">Arraste e solte a imagem aqui</p>
                  <p className="text-xs text-gray-400">ou clique para selecionar</p>
                </>
              )}
            </label>

            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">{uploadHint}</div>
          </section>

          <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-400">Resultado em Markdown</h2>
              <ImageIcon className="size-4 text-gray-400" />
            </div>

            <div className="min-h-72 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              {hasImage && (
                <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-gray-400">Imagem enviada</p>
                  <img
                    src={upload.previewUrl}
                    alt="Imagem enviada para analise"
                    className="max-h-56 w-auto rounded-lg object-contain"
                  />
                </div>
              )}

              {!markdownResult && !loading && (
                <p className="text-sm text-gray-400">Clique em Analisar para exibir o resultado aqui.</p>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                  <Loader2 className="size-4 animate-spin" />
                  Processando leitura da imagem...
                </div>
              )}

              {markdownResult && !loading && (
                <article className="prose prose-sm max-w-none prose-headings:mb-2 prose-p:my-2 prose-li:my-0.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownResult}</ReactMarkdown>
                </article>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
