import { useState } from "react";
import type { ChangeEvent } from "react";
import ExifReader from "exifreader";

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 0.8; // Varies from 0 (most aggressive compression) to 1 (least agressive).

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

// Representa o resultado do processamento de cada imagem para os cards
export interface ProcessedCard {
  originalName: string;
  convertedName: string;
  status: "success" | "error";
  previewUrl?: string;
  errorMessage?: string;
  sizeBytes?: number;
}

// Helper para extrair coordenadas GPS do EXIF
async function extractExifCoords(file: File): Promise<CoordsData | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    const latitude = tags.GPSLatitude?.description;
    const longitude = tags.GPSLongitude?.description;

    if (latitude !== undefined && longitude !== undefined) {
      return {
        filename: file.name,
        lat: parseFloat(latitude),
        lon: parseFloat(longitude),
      };
    }
  } catch (error) {
    console.warn("Nenhum dado EXIF GPS encontrado:", error);
  }

  return null;
}

function convertToWebP(
  file: File,
  options: ConvertOptions = {},
): Promise<Blob> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.7 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

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

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Falha na conversão para WebP."));
          },
          "image/webp",
          quality,
        );
      };

      img.onerror = () =>
        reject(
          new Error(
            "Falha ao carregar a imagem. Talvez o formato não seja compatível. Utilize .jpg, .png ou .webp.",
          ),
        );
    };

    reader.onerror = (error) => reject(error);
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  // Prevent default link navigation behavior and ensure anchor remains unrendered
  anchor.style.display = "none";
  anchor.href = url;
  anchor.download = fileName;
  anchor.target = "_blank"; // Safety fallback to avoid replacing current page

  document.body.appendChild(anchor);
  anchor.click();

  // Defer DOM cleanup and URL revocation so the browser has time to register the download
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function SendRoute() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [coordsList, setCoordsList] = useState<CoordsData[]>([]);
  const [processedCards, setProcessedCards] = useState<ProcessedCard[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      setErrorMessage("Nenhuma imagem válida foi encontrada na seleção.");
      event.target.value = "";
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setCoordsList([]);
      setProcessedCards([]);
      setProgress({ current: 0, total: imageFiles.length });

      const extractedCoords: CoordsData[] = [];
      const cardsResults: ProcessedCard[] = [];
      let completedCount = 0;

      await Promise.all(
        imageFiles.map(async (file) => {
          const originalNameWithoutExt =
            file.name.substring(0, file.name.lastIndexOf(".")) || "imagem";
          const convertedName = `${originalNameWithoutExt}.webp`;

          try {
            // 1. EXTRAIR COORDENADAS EXIF
            const coords = await extractExifCoords(file);
            if (coords) {
              extractedCoords.push(coords);
            }

            // 2. CONVERTER PARA WEBP
            const webpBlob = await convertToWebP(file, {
              maxWidth: MAX_WIDTH,
              maxHeight: MAX_HEIGHT,
              quality: QUALITY,
            });

            // 3. FAZER DOWNLOAD AUTOMÁTICO
            downloadBlob(webpBlob, convertedName);

            // 4. CRIAR PREVIEW EM MEMÓRIA PARA O CARD
            const previewUrl = URL.createObjectURL(webpBlob);

            cardsResults.push({
              originalName: file.name,
              convertedName,
              status: "success",
              previewUrl,
              sizeBytes: webpBlob.size,
            });
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
            setProgress({ current: completedCount, total: imageFiles.length });
          }
        }),
      );

      setCoordsList(extractedCoords);
      setProcessedCards(cardsResults);
    } catch (error) {
      console.error("Erro geral no lote:", error);
      setErrorMessage(
        "Falha ao processar lote de imagens. Verifique se os arquivos são válidos.",
      );
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">
        Processador de imagens e extrator de localização
      </h1>

      <div className="flex gap-4">
        {/* Seleção de múltiplos arquivos */}
        <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-md transition-colors">
          {isProcessing
            ? `Processando (${progress.current}/${progress.total})...`
            : "Selecionar Imagens"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isProcessing}
            className="hidden"
          />
        </label>

        {/* Seleção de pasta inteira */}
        <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-md transition-colors">
          {isProcessing
            ? "Processando Pasta..."
            : "Selecionar Pasta de Imagens"}
          <input
            type="file"
            accept="image/*"
            // @ts-expect-error atributos não padrão para pasta no Chrome/Safari/Firefox
            webkitdirectory=""
            directory=""
            onChange={handleFileChange}
            disabled={isProcessing}
            className="hidden"
          />
        </label>
      </div>

      {errorMessage && (
        <p className="text-red-500 text-sm font-medium">{errorMessage}</p>
      )}

      {/* Tabela de coordenadas EXIF (se houver) */}
      {coordsList.length > 0 && (
        <div className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-mono text-sm">
          <h2 className="font-bold mb-2 text-gray-800">
            Coordenadas extraídas ({coordsList.length} imagens com GPS):
          </h2>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
            {coordsList.map((coords, index) => (
              <div
                key={index}
                className="p-2 bg-white rounded border border-gray-100 flex flex-wrap justify-between"
              >
                <span className="font-semibold text-gray-700">
                  {coords.filename}
                </span>
                <span className="text-gray-600">
                  Lat: {coords.lat} | Lon: {coords.lon}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade de Cards das Imagens Processadas */}
      {processedCards.length > 0 && (
        <div className="w-full">
          <h2 className="text-lg font-bold mb-4 text-gray-800">
            Resultado do Processamento ({processedCards.length} arquivos)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {processedCards.map((card, idx) => (
              <div
                key={idx}
                className={`flex flex-col rounded-xl overflow-hidden border shadow-sm transition-shadow hover:shadow-md ${
                  card.status === "success"
                    ? "bg-white border-gray-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                {/* Preview da Imagem ou Ícone de Erro */}
                <div className="h-32 w-full bg-gray-100 flex items-center justify-center overflow-hidden relative">
                  {card.status === "success" && card.previewUrl ? (
                    <img
                      src={card.previewUrl}
                      alt={card.convertedName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 text-center text-red-500">
                      <span className="text-2xl">⚠️</span>
                      <span className="text-xs font-semibold">
                        Erro na conversão
                      </span>
                    </div>
                  )}
                </div>

                {/* Rodapé do Card com Nome e Status */}
                <div className="p-3 flex flex-col justify-between flex-grow gap-1">
                  <p
                    className="text-sm font-medium text-gray-600 truncate"
                    title={
                      card.status === "success"
                        ? card.convertedName
                        : card.originalName
                    }
                  >
                    {card.status === "success"
                      ? card.convertedName
                      : card.originalName}
                  </p>

                  {card.status === "success" ? (
                    <div className="flex items-center justify-end text-[11px] text-gray-500">
                      {card.sizeBytes && (
                        <span>{formatFileSize(card.sizeBytes)}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[13px] text-red-600">
                      {card.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SendRoute;
