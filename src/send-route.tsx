import { useState } from "react";
import type { ChangeEvent } from "react";
import ExifReader from "exifreader";
import { heicTo } from "heic-to";

const MAX_WIDTH = 1000;
const MAX_HEIGHT = 1000;
const QUALITY = 0.8;

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
    const tags = ExifReader.load(arrayBuffer);

    const latitude = tags.GPSLatitude?.description;
    const longitude = tags.GPSLongitude?.description;

    if (latitude !== undefined && longitude !== undefined) {
      return {
        filename,
        lat: parseFloat(latitude),
        lon: parseFloat(longitude),
      };
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
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.7 } = options;

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
        reject(new Error("Falha ao carregar a imagem no Canvas."));
    };

    reader.onerror = (error) => reject(error);
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.style.display = "none";
  anchor.href = url;
  anchor.download = fileName;

  document.body.appendChild(anchor);
  anchor.click();

  // Buffer de 1s para garantir o handoff no Firefox sem abrir novas abas
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);
}

async function uploadImage(
  blob: Blob,
  lon: number,
  lat: number,
): Promise<void> {
  const formData = new FormData();

  formData.append("image", blob);
  formData.append("lon", lon.toString());
  formData.append("lat", lat.toString());
  formData.append("folder", "routes");

  try {
    const localApi = "http://localhost:8787/api/images/upload";
    const response = await fetch(localApi, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      console.log(response);
    } else {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error) {
    console.log("Error uploading image: ", error);
  }
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

    // Filtra arquivos aceitando .png, .jpg, .jpeg, .heic e .heif
    const validFiles = Array.from(files).filter((file) => {
      const name = file.name.toLowerCase();
      console.log(file.type);
      return (
        file.type.startsWith("image/") ||
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        name.endsWith(".heic") ||
        name.endsWith(".heif")
      );
    });

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
      setCoordsList([]);
      setProcessedCards([]);
      setProgress({ current: 0, total: validFiles.length });

      const extractedCoords: CoordsData[] = [];
      const cardsResults: ProcessedCard[] = [];
      let completedCount = 0;

      await Promise.all(
        validFiles.map(async (file) => {
          const originalNameWithoutExt =
            file.name.substring(0, file.name.lastIndexOf(".")) || "imagem";
          const convertedName = `${originalNameWithoutExt}.webp`;

          try {
            let processedBlob: Blob | File = file;

            // 1. SE FOR HEIC, EXTRAI DADOS EXIF DO ARQUIVO BRUTO PRIMEIRO
            const coords = await extractExifCoords(file, file.name);
            if (coords) {
              extractedCoords.push(coords);
            }

            // 2. CONVERTE HEIC PARA UM BLOB DE IMAGEM INTERMEDIÁRIO SE NECESSÁRIO
            if (isHeicFile(file)) {
              const convertedHeic = await heicTo({
                blob: file,
                type: "image/jpeg",
                quality: 0.9,
              });

              processedBlob = convertedHeic;
            }

            // 3. CONVERTE PARA WEBP
            const webpBlob = await convertToWebP(processedBlob, {
              maxWidth: MAX_WIDTH,
              maxHeight: MAX_HEIGHT,
              quality: QUALITY,
            });

            // 4. FAZER DOWNLOAD AUTOMÁTICO
            // downloadBlob(webpBlob, convertedName);

            // 4. FAZ UPLOAD DA IMAGEM
            console.log(webpBlob);
            uploadImage(webpBlob, coords?.lon || 0, coords?.lat || 0);

            // 5. PREVIEW EM MEMÓRIA PARA O CARD
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
            setProgress({ current: completedCount, total: validFiles.length });
          }
        }),
      );

      setCoordsList(extractedCoords);
      setProcessedCards(cardsResults);
    } catch (error) {
      console.error("Erro geral no lote:", error);
      setErrorMessage("Falha ao processar lote de imagens.");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold">Processador de imagens</h1>
        <p>Extrai coordenadas e converte</p>
      </header>

      <div className="w-full flex flex-col items-center p-10" id="uploadArea">
        <input
          type="file"
          id="fileInput"
          className="file-input hidden"
          accept="image/png, image/jpeg, image/heic, image/heif, .heic, .heif"
          disabled={isProcessing}
          onChange={handleFileChange}
        />

        <button
          className="bg-gradient-to-tr from-indigo-600 to-violet-600 text-white border-none py-[15px] px-[30px] rounded-lg text-lg cursor-pointer font-bold"
          onClick={() => document.getElementById("fileInput")!.click()}
          disabled={isProcessing}
        >
          {isProcessing
            ? `Processando (${progress.current}/${progress.total})...`
            : "📁 Selecionar imagens (.jpg, .png, .heic)"}
        </button>
      </div>

      {errorMessage && (
        <p className="text-red-500 text-sm font-medium">{errorMessage}</p>
      )}

      {/* Tabela de coordenadas EXIF */}
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

                <div className="p-3 flex flex-col justify-between flex-grow gap-1">
                  <p
                    className="text-xs font-medium text-gray-800 truncate"
                    title={card.convertedName}
                  >
                    {card.convertedName}
                  </p>

                  {card.status === "success" ? (
                    <div className="flex items-center justify-end text-[11px] text-gray-500">
                      {card.sizeBytes && (
                        <span>{formatFileSize(card.sizeBytes)}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-red-600 line-clamp-2">
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
