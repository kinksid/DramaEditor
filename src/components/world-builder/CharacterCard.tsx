"use client";

import { PenLine, Trash2, UserRound } from "lucide-react";
import type { Character } from "@/types/worldBuilder";

type Props = {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
};

export function CharacterCard({ character, onEdit, onDelete }: Props) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-orange-50 text-accent">
            <UserRound size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold">{character.name}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {character.role} {character.age ? `· ${character.age} 岁` : ""}
            </p>
          </div>
        </div>
      </div>
      <p className="min-h-[72px] text-sm leading-6 text-slate-600">{character.description}</p>
      <div className="mt-5 flex gap-2">
        <button onClick={() => onEdit(character)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          <PenLine size={15} /> 编辑
        </button>
        <button onClick={() => onDelete(character.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
          <Trash2 size={15} /> 删除
        </button>
      </div>
    </article>
  );
}
