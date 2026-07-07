"use client";

import { useRef, useState } from "react";
import { FileText, Film, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeMedia, uploadReference, uploadTextReference } from "@/lib/worldBuilderApi";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { CreationReference } from "@/types/worldBuilder";

type ReferenceUploadMenuProps = {
  className?: string;
  label?: string;
};

export function ReferenceUploadMenu({ className, label = "添加参考" }: ReferenceUploadMenuProps) {
  const { addReference, updateReference } = useWorldBuilderStore();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File, kind: "image" | "video") => {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadReference(file);
      if (uploaded.kind === "text") return;
      const reference: CreationReference = {
        id: uploaded.id,
        kind: uploaded.kind,
        name: uploaded.name,
        url: uploaded.url,
        mimeType: uploaded.mimeType,
      };
      addReference(reference);
      try {
        const summary = await analyzeMedia({
          kind: uploaded.kind,
          url: uploaded.url,
          name: uploaded.name,
        });
        updateReference(reference.id, { analysisSummary: summary });
      } catch {
        /* ComfyUI optional */
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleTextFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const text = await file.text();
      const uploaded = await uploadTextReference(text, file.name);
      if (uploaded.kind !== "text") return;
      addReference({
        id: uploaded.id,
        kind: "text",
        name: uploaded.name,
        textContent: uploaded.textContent,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "文本上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handlePasteText = async () => {
    const text = window.prompt("粘贴或输入参考文本");
    if (!text?.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadTextReference(text.trim());
      if (uploaded.kind !== "text") return;
      addReference({
        id: uploaded.id,
        kind: "text",
        name: uploaded.name,
        textContent: uploaded.textContent,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "文本添加失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={uploading}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition disabled:opacity-60"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
        {label}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20"
            aria-label="关闭菜单"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 z-30 mb-2 min-w-[180px] overflow-hidden rounded-xl border border-white/15 bg-[#1a0f2e]/95 p-1 shadow-xl backdrop-blur">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
            >
              <ImagePlus size={14} /> 上传图片
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
            >
              <Film size={14} /> 上传视频
            </button>
            <button
              type="button"
              onClick={() => textInputRef.current?.click()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
            >
              <FileText size={14} /> 上传文本文件
            </button>
            <button
              type="button"
              onClick={handlePasteText}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
            >
              <Plus size={14} /> 粘贴文本
            </button>
          </div>
        </>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file, "image");
          e.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file, "video");
          e.target.value = "";
        }}
      />
      <input
        ref={textInputRef}
        type="file"
        accept=".txt,.md,.json,text/plain,text/markdown"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleTextFile(file);
          e.target.value = "";
        }}
      />

      {error && <p className="absolute left-0 top-full mt-1 text-[10px] text-red-300">{error}</p>}
    </div>
  );
}

type ReferenceChipsProps = {
  references: CreationReference[];
  onRemove: (id: string) => void;
};

export function ReferenceChips({ references, onRemove }: ReferenceChipsProps) {
  if (references.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-1 pb-2">
      {references.map((ref) => (
        <span
          key={ref.id}
          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-2 py-1 text-[11px] text-white/80"
        >
          {ref.kind === "image" && ref.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ref.url} alt="" className="size-6 rounded object-cover" />
          ) : ref.kind === "video" ? (
            <Film size={12} />
          ) : (
            <FileText size={12} />
          )}
          <span className="max-w-[140px] truncate">{ref.name}</span>
          <button
            type="button"
            onClick={() => onRemove(ref.id)}
            className="text-white/50 hover:text-white"
            aria-label={`移除 ${ref.name}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}
