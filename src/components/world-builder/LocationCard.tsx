"use client";

import { MapPin, PenLine, Trash2 } from "lucide-react";
import { locationTypeLabels } from "@/lib/worldBuilderLabels";
import type { Location } from "@/types/worldBuilder";

type Props = {
  location: Location;
  onEdit: (location: Location) => void;
  onDelete: (id: string) => void;
};

export function LocationCard({ location, onEdit, onDelete }: Props) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <MapPin size={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold">{location.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{locationTypeLabels[location.type]}</p>
        </div>
      </div>
      <p className="min-h-[72px] text-sm leading-6 text-slate-600">{location.description}</p>
      <div className="mt-5 flex gap-2">
        <button onClick={() => onEdit(location)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          <PenLine size={15} /> 编辑
        </button>
        <button onClick={() => onDelete(location.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
          <Trash2 size={15} /> 删除
        </button>
      </div>
    </article>
  );
}
