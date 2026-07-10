import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface PopupProps {
  isOpen: boolean;
  description: string;
  img: string;
  date: string;
  onClose: () => void;
}

export function Popup({ isOpen, description, img, date, onClose }: PopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const formattedDate = new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 pointer-events-none" />
      <div
        ref={popupRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-2xl p-6 max-w-xl w-11/12 border border-[#ededed] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close popup"
        >
          <X size={24} className="text-gray-600" />
        </button>

        <div>
          <h3 className="text-lg font-semibold text-[#160d44] mb-3 pr-8">
            Descrição da Superfície
          </h3>
          <p className="text-gray-700 leading-relaxed text-sm pr-8">
            {description}
          </p>
          <img src={img} alt={description} className="mt-4 rounded-md" />
          <span className="text-gray-500 text-sm block mt-2">
            data &middot; {formattedDate}
          </span>
        </div>
      </div>
    </>
  );
}
