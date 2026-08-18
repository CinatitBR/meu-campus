import { useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import ExifReader from "exifreader";
import { heicTo } from "heic-to";
import { encode as encodeToWebp } from "@jsquash/webp";

import { BUILDINGS } from "./utils";

const MAX_WIDTH = 1000;
const MAX_HEIGHT = 1000;
const QUALITY = 80;
const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
const allowedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/heif",
  "image/heic",
];

interface ConvertOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface CoordsData {
  filename: string;
  lat: number;
  lon: number;
}

export interface StepItem {
  id: string;
  blob: Blob;
  originalName: string;
  convertedName: string;
  previewUrl: string;
  sizeBytes: number;
  description: string;
  coords: CoordsData | null;
}

export interface ProcessedCard {
  originalName: string;
  convertedName: string;
  status: "success" | "error";
  previewUrl?: string;
  errorMessage?: string;
  sizeBytes?: number;
}

// Helper to check if a file is HEIC
function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

// Helper to extract GPS coordinates from EXIF metadata
async function extractExifCoords(
  file: File | Blob,
  filename: string,
): Promise<CoordsData | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer, { expanded: true });

    const lon = tags.gps?.Longitude;
    const lat = tags.gps?.Latitude;

    if (lon !== undefined && lat !== undefined) {
      return {
        filename,
        lon,
        lat,
      };
    } else {
      console.log("Exif coords not valid.");
    }
  } catch (error) {
    console.warn("Nenhum dado EXIF GPS encontrado:", error);
  }

  return null;
}

// Converts standard images or HEIC Blobs to WebP via Canvas
function convertToWebP(
  fileOrBlob: File | Blob,
  options: ConvertOptions = {},
): Promise<Blob> {
  const {
    maxWidth = MAX_WIDTH,
    maxHeight = MAX_HEIGHT,
    quality = QUALITY,
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(fileOrBlob);

    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao ler arquivo."));
        return;
      }

      const img = new Image();
      img.src = result;

      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        // Create canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível obter contexto 2D."));
          return;
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const rawImageData = ctx.getImageData(0, 0, width, height);
        encodeToWebp(rawImageData, { quality }).then(
          // Called when conversion is successfull
          (webpBuffer) => {
            const webpBlob = new Blob([webpBuffer], { type: "image/webp" });
            resolve(webpBlob);
          },
          // Called when conversion failed
          () => {
            reject(new Error("Falha na conversão para WebP."));
          },
        );
      };

      img.onerror = () =>
        reject(new Error("Falha ao carregar a imagem no Canvas."));
    };

    reader.onerror = (error) => reject(error);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function SendRoute() {
  // Image Processing State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [coordsList, setCoordsList] = useState<CoordsData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Visual Route Metadata State
  const [routeTitle, setRouteTitle] = useState<string>("");
  const [buildingId, setBuildingId] = useState<string>("");
  const [status, setStatus] = useState<"published" | "hidden">("published");
  const [steps, setSteps] = useState<StepItem[]>([]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // 1. Process files locally (EXIF + HEIC conversion + WebP conversion)
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files)
      .filter((file) => {
        return allowedMimeTypes.includes(file.type);
      })
      // 2. Sort in ascending order by name (natural numeric order)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

    if (validFiles.length === 0) {
      setErrorMessage(
        "Nenhuma imagem válida (.png, .jpg, .heic) foi encontrada.",
      );
      event.target.value = "";
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setSubmitFeedback(null);
      setCoordsList([]);
      setProgress({ current: 0, total: validFiles.length });

      const extractedCoords: CoordsData[] = [];
      const cardsResults: ProcessedCard[] = [];
      const generatedSteps: StepItem[] = new Array(validFiles.length);
      let completedCount = 0;

      await Promise.all(
        validFiles.map(async (file, index) => {
          const originalNameWithoutExt =
            file.name.substring(0, file.name.lastIndexOf(".")) || "imagem";
          const convertedName = `${originalNameWithoutExt}.webp`;

          try {
            let processedBlob: Blob | File = file;

            // 1. Extrai dados EXIF do arquivo original
            const coords = await extractExifCoords(file, file.name);
            if (coords) {
              extractedCoords.push(coords);
            }

            // 2. Converte HEIC para jpeg se necessário
            if (isHeicFile(file)) {
              const convertedHeic = await heicTo({
                blob: file,
                type: "image/jpeg",
                quality: 1,
              });
              processedBlob = convertedHeic;
            }

            // 3. Converte para WebP.
            // processedBlob: é png ou jpeg.
            const webpBlob = await convertToWebP(processedBlob, {
              maxWidth: MAX_WIDTH,
              maxHeight: MAX_HEIGHT,
              quality: QUALITY,
            });

            // 4. Cria preview URL em memória
            const previewUrl = URL.createObjectURL(webpBlob);

            cardsResults.push({
              originalName: file.name,
              convertedName,
              status: "success",
              previewUrl,
              sizeBytes: webpBlob.size,
            });

            // 5. Adiciona ao conjunto de passos para o formulário da rota
            generatedSteps[index] = {
              id: crypto.randomUUID(),
              blob: webpBlob,
              originalName: file.name,
              convertedName,
              previewUrl,
              sizeBytes: webpBlob.size,
              description: "",
              coords,
            };
          } catch (fileError) {
            console.error(`Erro ao processar ${file.name}:`, fileError);
            cardsResults.push({
              originalName: file.name,
              convertedName,
              status: "error",
              errorMessage:
                fileError instanceof Error
                  ? fileError.message
                  : "Falha ao converter arquivo.",
            });
          } finally {
            completedCount += 1;
            setProgress({ current: completedCount, total: validFiles.length });
          }
        }),
      );

      setCoordsList(extractedCoords);
      setSteps((prev) => [...prev, ...generatedSteps]);
    } catch (error) {
      console.error("Erro geral no lote:", error);
      setErrorMessage("Falha ao processar lote de imagens.");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  // Step List Controls
  const handleDescriptionChange = (index: number, value: string) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index].description = value;
      return updated;
    });
  };

  const moveStepUp = (index: number) => {
    if (index === 0) return;
    setSteps((prev) => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };

  const moveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    setSteps((prev) => {
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };

  const removeStep = (index: number) => {
    setSteps((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  // 2. Submit everything to Cloudflare backend
  const handleFinalSubmit = async (e: SubmitEvent) => {
    e.preventDefault();

    if (!routeTitle.trim() || !buildingId.trim()) {
      alert("Por favor, preencha o Título da Rota e o ID do Edifício.");
      return;
    }
    if (steps.length === 0) {
      alert("Nenhum passo de imagem disponível para salvar a rota.");
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      const formData = new FormData();
      formData.append("title", routeTitle.trim());
      formData.append("building_id", buildingId.trim());
      formData.append("status", status);

      // Prepara o array de metadados com ordem e coordenadas extraídas
      const stepsMetadata = steps.map((step, index) => ({
        step_order: index,
        description: step.description.trim(),
        lon: step.coords?.lon || null,
        lat: step.coords?.lat || null,
      }));
      formData.append("steps_metadata", JSON.stringify(stepsMetadata));

      // Anexa os blobs WebP convertidos
      steps.forEach((step, index) => {
        formData.append(`step_image_${index}`, step.blob, step.convertedName);
      });

      const response = await fetch(`${API_BASE_URL}/api/visual-route`, {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error || json.details || "Falha ao salvar a rota visual.",
        );
      }

      console.log(json);
      setSubmitFeedback({
        type: "success",
        message: `Rota visual salva com sucesso! ID da Rota: ${json.data.route_id}`,
      });

      // Limpa formulário
      setRouteTitle("");
      setBuildingId("");
      steps.forEach((s) => URL.revokeObjectURL(s.previewUrl));
      setSteps([]);
      setCoordsList([]);
    } catch (err: any) {
      console.error("Erro no envio:", err);
      setSubmitFeedback({
        type: "error",
        message: err.message || "Erro desconhecido ao salvar rota.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 p-6 max-w-4xl mx-auto font-sans">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Criar Rota Visual</h1>
        <ul className="text-sm text-slate-500 mt-1 max-w-[75ch] text-left">
          <li>
            • As imagens chegam ordenadas em
            <strong> ordem crescente do nome</strong>.
          </li>
          <li>
            • Antes de fazer o upload é recomendado
            <strong>
              {" "}
              nomea-las de forma que fiquem na ordem desejada
            </strong>{" "}
            (para acelerar seu trabalho).
          </li>
        </ul>
      </header>

      {/* Upload & Conversion Section */}
      <div className="w-fullflex flex-col items-center justify-center">
        <input
          type="file"
          id="fileInput"
          className="hidden"
          multiple
          // accept="image/png, image/jpeg, image/heic, image/heif, .heic, .heif"
          disabled={isProcessing || isSubmitting}
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="cursor-pointer bg-[#2b2b30] text-white font-semibold py-3.5 px-7 rounded-xl text-base shadow-md transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => document.getElementById("fileInput")!.click()}
          disabled={isProcessing || isSubmitting}
        >
          {isProcessing
            ? `Processando imagens (${progress.current}/${progress.total})...`
            : "📁 Selecionar Fotos da Rota (.jpg, .png, .heic)"}
        </button>
      </div>

      {errorMessage && (
        <p className="w-full text-center text-red-600 text-sm font-semibold">
          {errorMessage}
        </p>
      )}

      {submitFeedback && (
        <div
          className={`w-full p-4 rounded-xl font-medium text-sm border ${
            submitFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {submitFeedback.message}
        </div>
      )}

      {/* EXIF GPS Table if any coordinates were extracted */}
      {coordsList.length > 0 && (
        <div className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs">
          <h2 className="font-bold mb-2 text-slate-800">
            📍 Coordenadas GPS detectadas ({coordsList.length} imagens):
          </h2>
          <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {coordsList.map((coords, index) => (
              <div
                key={index}
                className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between items-center"
              >
                <span className="font-semibold text-slate-700 truncate max-w-[50%]">
                  {coords.filename}
                </span>
                <span className="text-slate-500">
                  Lat: {coords.lat.toFixed(6)} | Lon: {coords.lon.toFixed(6)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Route Details & Step Ordering (Renders once images exist) */}
      {steps.length > 0 && (
        <form
          onSubmit={handleFinalSubmit}
          className="w-full flex flex-col gap-6"
        >
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Informações da Rota
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="route-title"
                  className="text-xs font-bold text-slate-700 uppercase"
                >
                  Título da Rota *
                </label>
                <input
                  id="route-title"
                  type="text"
                  placeholder="ex: Entrada Acessível ao Elevador do Bloco A"
                  value={routeTitle}
                  onChange={(e) => setRouteTitle(e.target.value)}
                  required
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="building-id"
                  className="text-xs font-bold text-slate-700 uppercase"
                >
                  Edifício / Instituto *
                </label>
                <select
                  id="building-id"
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  required
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="" disabled>
                    Selecione o instituto/prédio...
                  </option>
                  {BUILDINGS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label
                  htmlFor="route-status"
                  className="text-xs font-bold text-slate-700 uppercase"
                >
                  Status de Publicação
                </label>
                <select
                  id="route-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "published" | "hidden")
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="published">Publicado (Visível no App)</option>
                  <option value="hidden">Oculto (Rascunho)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Steps Sequencing and Descriptions */}
          <div className="flex flex-col gap-4">
            <h3 className="flex flex-col text-lg font-bold text-slate-800">
              Passos da Rota ({steps.length})
              <span className="text-xs font-normal text-slate-500">
                Reordene conforme o fluxo do trajeto e descreva cada etapa
              </span>
            </h3>

            <div className="flex flex-col gap-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="relative pt-[40px] flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-slate-300"
                >
                  {/* Step Order Buttons */}
                  <div className="flex min-w-[36px] flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveStepUp(index)}
                      disabled={index === 0}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:cursor-not-allowed"
                      title="Mover para cima"
                    >
                      ▲
                    </button>
                    <span className="font-mono text-sm font-bold text-indigo-600">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveStepDown(index)}
                      disabled={index === steps.length - 1}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:cursor-not-allowed"
                      title="Mover para baixo"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Thumbnail Preview */}
                  <div className="relative w-[150px] h-[150px] mx-auto flex-shrink-0 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                    <img
                      src={step.previewUrl}
                      alt={step.convertedName}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 bg-black/60 px-1 text-[9px] text-white font-mono">
                      {formatFileSize(step.sizeBytes)}
                    </div>
                  </div>

                  {/* Description Input */}
                  <div className="flex flex-1 min-w-[300px] flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        Descrição do Passo #{index + 1}
                      </label>
                      {step.coords && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                          GPS: {step.coords.lat.toFixed(4)},{" "}
                          {step.coords.lon.toFixed(4)}
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="ex: Siga reto pelo corredor e vire à esquerda junto à rampa..."
                      value={step.description}
                      onChange={(e) =>
                        handleDescriptionChange(index, e.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Delete Step */}
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="absolute top-[10px] right-[10px] w-[30px] h-[30px] rounded-lg bg-rose-50 p-2 font-medium text-rose-600 hover:bg-rose-100 transition"
                    title="Remover passo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting || steps.length === 0}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSubmitting
              ? "Enviando..."
              : `Salvar Rota (${steps.length} passos)`}
          </button>
        </form>
      )}
    </div>
  );
}

export default SendRoute;
