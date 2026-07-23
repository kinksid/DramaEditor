"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Plus, Trash2, Wand2 } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { cn } from "@/lib/utils";
import { locationTypeLabels } from "@/lib/worldBuilderLabels";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Character, Location } from "@/types/worldBuilder";

const steps = ["世界设定", "确认角色地点", "剧本确认", "生成世界"];

const panelClass =
  "rounded-2xl border border-white/[0.06] bg-[#121214] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]";
const inputClass =
  "mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-[border-color] duration-press ease-de-out placeholder:text-white/30 focus:border-white/25";
const labelClass = "text-sm font-medium text-white/85";

export default function SetupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") ?? undefined;
  const [step, setStep] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    ensureProjectLoaded,
    commitSetupToWorld,
    activeProjectId,
    markProjectOpened,
    submitReferenceImageGeneration,
  } = useWorldBuilderStore();

  useEffect(() => {
    const loaded = ensureProjectLoaded(projectId);
    if (!loaded) {
      setLoadError("未找到对应项目，请从首页重新创建。");
      return;
    }
    markProjectOpened(projectId || activeProjectId);
    return () => {
      markProjectOpened(projectId || activeProjectId);
    };
  }, [projectId, activeProjectId, ensureProjectLoaded, markProjectOpened]);

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  const handleOpenStoryGraph = () => {
    commitSetupToWorld();
    router.push(`/world-builder/story-graph?project=${activeProjectId}`);
  };

  return (
    <WorldBuilderLayout agentMode="setup">
      <div className="mx-auto max-w-6xl px-6 py-6 text-white">
        {loadError && (
          <div className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {loadError}
          </div>
        )}
        <div className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                世界创建流程
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight text-white">
                搭建互动短剧世界
              </h1>
              {activeProjectId && (
                <p className="mt-1 text-xs text-white/40">项目 ID：{activeProjectId}</p>
              )}
            </div>
            <div className="h-2 w-56 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-white/80 transition-[width] duration-popover ease-de-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="mt-6 grid gap-2.5 md:grid-cols-4">
            {steps.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  "btn-press rounded-xl border px-4 py-3 text-left text-sm transition-[border-color,background-color,color,transform] duration-press ease-de-out",
                  index === step
                    ? "border-white/[0.1] bg-[#2a2a2a] text-white"
                    : "border-transparent bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white/75",
                )}
              >
                <span className="block text-[11px] text-white/40">步骤 {index + 1}</span>
                <span className="mt-0.5 block font-semibold text-inherit">{item}</span>
              </button>
            ))}
          </div>
        </div>

        {step === 0 && (
          <section className={cn("mt-5", panelClass)}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="世界标题"
                value={setupDraft.worldTitle}
                onChange={(value) => updateSetupDraft({ worldTitle: value })}
              />
              <Field
                label="类型"
                value={setupDraft.genre}
                onChange={(value) => updateSetupDraft({ genre: value })}
              />
              <Field
                label="标签"
                value={setupDraft.tags}
                onChange={(value) => updateSetupDraft({ tags: value })}
              />
              <Field
                label="情绪基调"
                value={setupDraft.tone}
                onChange={(value) => updateSetupDraft({ tone: value })}
              />
              <Field
                label="视觉风格"
                value={setupDraft.visualStyle}
                onChange={(value) => updateSetupDraft({ visualStyle: value })}
              />
              <label className="md:col-span-2">
                <span className={labelClass}>世界描述</span>
                <textarea
                  className={cn(inputClass, "min-h-36 leading-6")}
                  value={setupDraft.worldDescription}
                  onChange={(e) => updateSetupDraft({ worldDescription: e.target.value })}
                />
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
              onAdd={() =>
                addCharacter({
                  name: "新角色",
                  role: "配角",
                  description: "描述角色的身份、动机和关系。",
                  age: undefined,
                })
              }
              onDelete={deleteCharacter}
              onUpdate={(id, patch) => updateCharacter(id, patch as Partial<Character>)}
              onGenerateReference={(item) =>
                submitReferenceImageGeneration(
                  "character",
                  item.id,
                  `${item.name}，${(item as Character).role} ${item.description}`,
                )
              }
            />
            <EditableList
              title="地点"
              items={locations}
              kind="location"
              onAdd={() =>
                addLocation({
                  name: "新地点",
                  type: "Temporary",
                  description: "描述地点的视觉特征和剧情用途。",
                })
              }
              onDelete={deleteLocation}
              onUpdate={(id, patch) => updateLocation(id, patch as Partial<Location>)}
              onGenerateReference={(item) =>
                submitReferenceImageGeneration(
                  "location",
                  item.id,
                  `${item.name}，${item.description}`,
                )
              }
            />
            <div className="lg:col-span-2">
              <Footer onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="继续剧本确认" />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className={cn("mt-5", panelClass)}>
            <label>
              <span className="text-sm font-semibold text-white/80">剧本确认</span>
              <textarea
                className={cn(inputClass, "mt-3 min-h-[520px] font-mono leading-6")}
                value={setupDraft.script}
                onChange={(e) => updateSetupDraft({ script: e.target.value })}
              />
            </label>
            <Footer onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="确认并生成世界" />
          </section>
        )}

        {step === 3 && (
          <section className={cn("mt-5 text-center", panelClass, "p-8")}>
            <h2 className="font-display text-2xl tracking-tight text-white">故事图已准备完成</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">
              世界设定、角色地点与剧本已保存到当前项目。现在可以打开故事图，检查剧集、节点、分支连接和预览播放。
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-press rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.08]"
              >
                返回剧本
              </button>
              <button
                type="button"
                onClick={handleOpenStoryGraph}
                className="btn-cta btn-press rounded-xl px-5 py-2 text-sm font-semibold"
              >
                打开故事图
              </button>
            </div>
          </section>
        )}
      </div>
    </WorldBuilderLayout>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Footer({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="btn-press rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.08]"
        >
          上一步
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        className="btn-cta btn-press rounded-xl px-5 py-2 text-sm font-semibold"
      >
        {nextLabel}
      </button>
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
  onGenerateReference,
}: {
  title: string;
  items: Array<Character | Location>;
  kind: "character" | "location";
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Character> | Partial<Location>) => void;
  onGenerateReference: (item: Character | Location) => void | Promise<string | null>;
}) {
  return (
    <div className={cn(panelClass, "p-5")}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-white">{title}</h2>
        <button
          type="button"
          onClick={onAdd}
          className="btn-press inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.1]"
        >
          <Plus size={15} /> 添加
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <div className="grid gap-3">
              <input
                className={cn(inputClass, "mt-0")}
                value={item.name}
                onChange={(e) => onUpdate(item.id, { name: e.target.value })}
              />
              {kind === "character" ? (
                <input
                  className={cn(inputClass, "mt-0")}
                  value={(item as Character).role}
                  onChange={(e) =>
                    onUpdate(item.id, { role: e.target.value } as Partial<Character>)
                  }
                />
              ) : (
                <select
                  className={cn(inputClass, "mt-0")}
                  value={(item as Location).type}
                  onChange={(e) =>
                    onUpdate(item.id, {
                      type: e.target.value as Location["type"],
                    } as Partial<Location>)
                  }
                >
                  {Object.entries(locationTypeLabels).map(([value, label]) => (
                    <option key={value} value={value} className="bg-[#121214] text-white">
                      {label}
                    </option>
                  ))}
                </select>
              )}
              <textarea
                className={cn(inputClass, "mt-0 min-h-24 leading-6")}
                value={item.description}
                onChange={(e) => onUpdate(item.id, { description: e.target.value })}
              />
            </div>
            <div className="mt-3 flex justify-between">
              <button
                type="button"
                onClick={() => void onGenerateReference(item)}
                className="btn-press inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/70 hover:bg-white/[0.08] hover:text-white"
              >
                <Wand2 size={14} /> 生成参考图
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-press rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-white/50 hover:text-white/80"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="btn-press rounded-xl border border-red-400/25 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                >
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
