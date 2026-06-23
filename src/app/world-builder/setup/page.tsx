"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ImagePlus, Plus, Trash2 } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { cn } from "@/lib/utils";
import { locationTypeLabels } from "@/lib/worldBuilderLabels";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Character, Location } from "@/types/worldBuilder";

const steps = ["世界设定", "确认角色地点", "剧本确认", "生成世界"];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const {
    setupDraft,
    updateSetupDraft,
    characters,
    locations,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useWorldBuilderStore();

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  return (
    <WorldBuilderLayout agentMode="setup">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                世界创建流程
              </p>
              <h1 className="mt-2 text-3xl font-semibold">搭建互动短剧世界</h1>
            </div>
            <div className="h-2 w-56 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {steps.map((item, index) => (
              <button
                key={item}
                onClick={() => setStep(index)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left text-sm",
                  index === step
                    ? "border-orange-200 bg-orange-50 text-accent"
                    : "border-slate-200 bg-slate-50 text-slate-500",
                )}
              >
                <span className="block text-xs">步骤 {index + 1}</span>
                <span className="font-semibold">{item}</span>
              </button>
            ))}
          </div>
        </div>

        {step === 0 && (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="世界标题" value={setupDraft.worldTitle} onChange={(value) => updateSetupDraft({ worldTitle: value })} />
              <Field label="类型" value={setupDraft.genre} onChange={(value) => updateSetupDraft({ genre: value })} />
              <Field label="标签" value={setupDraft.tags} onChange={(value) => updateSetupDraft({ tags: value })} />
              <Field label="情绪基调" value={setupDraft.tone} onChange={(value) => updateSetupDraft({ tone: value })} />
              <Field label="视觉风格" value={setupDraft.visualStyle} onChange={(value) => updateSetupDraft({ visualStyle: value })} />
              <label className="md:col-span-2">
                <span className="text-sm font-medium">世界描述</span>
                <textarea className="mt-2 min-h-36 w-full rounded-2xl border border-slate-200 px-4 py-3" value={setupDraft.worldDescription} onChange={(e) => updateSetupDraft({ worldDescription: e.target.value })} />
              </label>
            </div>
            <Footer onBack={undefined} onNext={() => setStep(1)} nextLabel="继续确认角色地点" />
          </section>
        )}

        {step === 1 && (
          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <EditableList
              title="角色"
              items={characters}
              kind="character"
              onAdd={() => addCharacter({ name: "新角色", role: "配角", description: "描述角色的身份、动机和关系。", age: undefined })}
              onDelete={deleteCharacter}
              onUpdate={(id, patch) => updateCharacter(id, patch as Partial<Character>)}
            />
            <EditableList
              title="地点"
              items={locations}
              kind="location"
              onAdd={() => addLocation({ name: "新地点", type: "Temporary", description: "描述地点的视觉特征和剧情用途。" })}
              onDelete={deleteLocation}
              onUpdate={(id, patch) => updateLocation(id, patch as Partial<Location>)}
            />
            <div className="lg:col-span-2">
              <Footer onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="继续剧本确认" />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <label>
              <span className="text-sm font-semibold">剧本确认</span>
              <textarea className="mt-3 min-h-[520px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-sm leading-6" value={setupDraft.script} onChange={(e) => updateSetupDraft({ script: e.target.value })} />
            </label>
            <Footer onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="确认并生成世界" />
          </section>
        )}

        {step === 3 && (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
            <h2 className="text-2xl font-semibold">故事图已准备完成</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              所有数据会自动保存在本地浏览器。现在可以打开故事图，检查剧集、节点、分支连接和预览播放。
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => setStep(2)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">
                返回剧本
              </button>
              <button onClick={() => router.push("/world-builder/story-graph")} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white">
                打开故事图
              </button>
            </div>
          </section>
        )}
      </div>
    </WorldBuilderLayout>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-sm font-medium">{label}</span>
      <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Footer({ onBack, onNext, nextLabel }: { onBack?: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      {onBack && <button onClick={onBack} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">上一步</button>}
      <button onClick={onNext} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white">{nextLabel}</button>
    </div>
  );
}

function EditableList({
  title,
  items,
  kind,
  onAdd,
  onDelete,
  onUpdate,
}: {
  title: string;
  items: Array<Character | Location>;
  kind: "character" | "location";
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Character> | Partial<Location>) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white">
          <Plus size={15} /> 添加
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3">
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={item.name} onChange={(e) => onUpdate(item.id, { name: e.target.value })} />
              {kind === "character" ? (
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={(item as Character).role} onChange={(e) => onUpdate(item.id, { role: e.target.value } as Partial<Character>)} />
              ) : (
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={(item as Location).type} onChange={(e) => onUpdate(item.id, { type: e.target.value as Location["type"] } as Partial<Location>)}>
                  {Object.entries(locationTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              <textarea className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={item.description} onChange={(e) => onUpdate(item.id, { description: e.target.value })} />
            </div>
            <div className="mt-3 flex justify-between">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                <ImagePlus size={14} /> 参考图
              </button>
              <div className="flex gap-2">
                <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500">
                  <ChevronDown size={16} />
                </button>
                <button onClick={() => onDelete(item.id)} className="rounded-xl border border-red-100 bg-white p-2 text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
