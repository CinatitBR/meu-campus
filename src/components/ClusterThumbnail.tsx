// ─── ClusterThumbnail.tsx ─────────────────────────────────────────────────────
// Popup flutuante que exibe um mosaico das fotos de um cluster de surface samples.
// Aparece ancorado ao marcador clicado, acima dele.

import { useEffect, useRef } from "react";
import type { ClusterFeature } from "./useClusters";
import { X } from "lucide-react";

interface Props {
  feature: ClusterFeature;
  baseUrl: string;
  /** Coordenadas em pixels na tela do marcador clicado, para posicionar o popup */
  anchorScreenX: number;
  anchorScreenY: number;
  onClose: () => void;
  /** Abre o painel lateral com o sample individual */
  onSelectSample: (sampleId: string) => void;
}

export function ClusterThumbnail({
  feature,
  baseUrl,
  anchorScreenX,
  anchorScreenY,
  onClose,
  onSelectSample,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const imgUrl = `${baseUrl}images/surface-points/${feature.id}/photo.jpg`;

  // Fecha ao clicar fora
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        // Posiciona acima do marcador clicado, centralizado
        left: anchorScreenX,
        top: anchorScreenY,
        transform: "translate(-50%, calc(-100% - 20px))",
        zIndex: 1000,
        pointerEvents: "auto",
      }}
    >
      {/* Seta apontando para o marcador */}
      <div className="relative">
        <div
          className="bg-white rounded-sm shadow-2xl border border-[#ededed] overflow-hidden"
          style={{ width: 180 }}
        >
          {/* Header */}
          <button
            onClick={onClose}
            className="text-gray-600 text-2xl p-1 bg-white hover:bg-gray-600 hover:text-white rounded-md absolute top-2 right-2 z-10"
          >
            <X size={18} />
          </button>

          {/* Mosaico */}
          <div className="grid gap-[2px] p-[2px]">
            <button
              key={feature.id}
              onClick={() => onSelectSample(feature.id)}
              className="relative overflow-hidden bg-[#f0eeff] hover:brightness-90 transition-all focus:outline-none focus:ring-2 focus:ring-[#917cff]"
              title={feature.properties.description}
            >
              <img
                src={imgUrl}
                alt="Superfície"
                className="w-full h-full object-cover"
              />
            </button>
          </div>

          {/* Footer: descrição (só para sample único) ou dica */}
          <div className="px-3 py-2">
            <p className="text-sm line-clamp-2">
              {feature.properties.description}
            </p>
          </div>
        </div>

        {/* Seta CSS */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: -8,
            width: 0,
            height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderTop: "9px solid #ededed",
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: -7,
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid white",
          }}
        />
      </div>
    </div>
  );
}
