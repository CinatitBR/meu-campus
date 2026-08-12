// This page extract the GPS coordinates from imagens and converts them to .webp.

import { useState } from "react";
import type { ChangeEvent } from "react";
import ExifReader from "exifreader";

const MAX_WIDTH = 1000;
const MAX_HEIGHT = 1000;
const QUALITY = 0.7;

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

// Helper to extract GPS coordinates from EXIF metadata
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
    console.warn("No EXIF GPS data found or failed to parse:", error);
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
        reject(new Error("Failed to read file."));
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
          reject(new Error("Could not get 2D canvas context."));
          return;
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("WebP conversion failed."));
          },
          "image/webp",
          quality,
        );
      };

      img.onerror = () => reject(new Error("Failed to load image."));
    };

    reader.onerror = (error) => reject(error);
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function SendRoute() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [coordsList, setCoordsList] = useState<CoordsData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Filter only image files (skips OS metadata files like .DS_Store inside folders)
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
      setProgress({ current: 0, total: imageFiles.length });

      const extractedCoords: CoordsData[] = [];
      let completedCount = 0;

      // Process files concurrently in parallel
      await Promise.all(
        imageFiles.map(async (file) => {
          try {
            // 1. EXTRACT EXIF COORDS
            const coords = await extractExifCoords(file);
            if (coords) {
              extractedCoords.push(coords);
            }

            // 2. CONVERT TO WEBP
            const webpBlob = await convertToWebP(file, {
              maxWidth: MAX_WIDTH,
              maxHeight: MAX_HEIGHT,
              quality: QUALITY,
            });

            // 3. DOWNLOAD CONVERTED FILE
            const originalNameWithoutExt =
              file.name.substring(0, file.name.lastIndexOf(".")) || "image";
            const downloadName = `${originalNameWithoutExt}.webp`;

            downloadBlob(webpBlob, downloadName);
          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
          } finally {
            completedCount += 1;
            setProgress({ current: completedCount, total: imageFiles.length });
          }
        }),
      );

      setCoordsList(extractedCoords);
    } catch (error) {
      console.error("Error processing files:", error);
      setErrorMessage(
        "Falha ao processar imagens. Verifique se os arquivos são .jpg ou .png.",
      );
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">
        Batch Image Converter & EXIF Extractor
      </h1>

      <div className="flex gap-4">
        {/* Multi-file selector */}
        <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors">
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

        {/* Folder selector */}
        <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors">
          {isProcessing
            ? "Processando Pasta..."
            : "Selecionar Pasta de Imagens"}
          <input
            type="file"
            accept="image/*"
            // @ts-expect-error non-standard attributes for folder picking in Chrome/Safari/Firefox
            webkitdirectory=""
            directory=""
            onChange={handleFileChange}
            disabled={isProcessing}
            className="hidden"
          />
        </label>
      </div>

      {/* Render list of extracted GPS coordinates */}
      {coordsList.length > 0 && (
        <div className="w-full max-w-lg p-4 bg-gray-100 rounded-md text-sm border border-gray-300 font-mono">
          <h2 className="font-bold mb-2">
            Coordenadas extraídas ({coordsList.length} imagens com GPS):
          </h2>
          <div className="max-h-60 overflow-y-auto flex flex-col gap-2">
            {coordsList.map((coords, index) => (
              <div key={index} className="p-2 bg-white rounded shadow-sm">
                <p>
                  <strong>Arquivo:</strong> {coords.filename}
                </p>
                <p>
                  <strong>Lat:</strong> {coords.lat} | <strong>Lon:</strong>{" "}
                  {coords.lon}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
      )}
    </div>
  );
}

export default SendRoute;
