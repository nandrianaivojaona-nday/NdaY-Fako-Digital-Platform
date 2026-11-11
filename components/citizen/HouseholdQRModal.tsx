"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function HouseholdQRModal({
  payload,
  onClose,
}: {
  payload: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(payload, {
      width: 400,
      margin: 2,
      color: { dark: "#0b1220", light: "#ffffff" },
    }).then(setDataUrl);
  }, [payload]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-widest text-gray-500">
          NdaY'Fako · Household
        </p>
        <h3 className="mt-1 text-lg font-bold text-gray-900">
          Show this to your collector
        </h3>

        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Household QR"
            className="mx-auto mt-5 w-64 h-64"
          />
        ) : (
          <div className="mx-auto mt-5 h-64 w-64 animate-pulse rounded-xl bg-gray-100" />
        )}

        <p className="mt-4 font-mono text-xs text-gray-500 break-all">
          {payload}
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
