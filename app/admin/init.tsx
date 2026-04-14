"use client";

import { initMVP } from "@/scripts/initMVP";

export default function InitPage() {

  return (
    <button onClick={() => initMVP()}>
      Init MVP Data
    </button>
  );

}