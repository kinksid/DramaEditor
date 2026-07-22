"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Keyboard, LifeBuoy, MessageSquareWarning, BookOpen } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

type Section = "contact" | "guide" | "shortcuts" | "feedback";

export default function HelpCenterPage() {
  return (
    <Suspense
      fallback={
        <WorldBuilderLayout agentMode="none">
          <div className="grid min-h-[40vh] place-items-center text-sm text-ink-muted">Loading…</div>
        </WorldBuilderLayout>
      }
    >
      <HelpCenterInner />
    </Suspense>
  );
}

function HelpCenterInner() {
  const language = useSettingsStore((s) => s.language);
  const zh = language === "zh";
  const search = useSearchParams();
  const initial = (search.get("section") as Section) || "guide";
  const [section, setSection] = useState<Section>(
    ["contact", "guide", "shortcuts", "feedback"].includes(initial) ? initial : "guide",
  );

  const tabs = useMemo(
    () =>
      [
        { id: "contact" as const, label: zh ? "联系我们" : "Contact Us", icon: LifeBuoy },
        { id: "guide" as const, label: zh ? "使用教程" : "User Guide", icon: BookOpen },
        { id: "shortcuts" as const, label: zh ? "快捷键" : "Keyboard Shortcuts", icon: Keyboard },
        {
          id: "feedback" as const,
          label: zh ? "反馈问题" : "Report an Issue",
          icon: MessageSquareWarning,
        },
      ] as const,
    [zh],
  );

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-strong">
          {zh ? "帮助中心" : "Help Center"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {zh ? "查找教程、快捷键，或向我们反馈问题。" : "Guides, shortcuts, and support."}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
                section === tab.id
                  ? "border-ink-strong/20 bg-ink-strong text-white dark:bg-white dark:text-black"
                  : "border-card-border bg-card text-ink-muted hover:text-ink-strong",
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-card-border bg-card p-5 text-sm leading-7 text-ink">
          {section === "contact" && (
            <div className="space-y-2">
              <p className="font-medium text-ink-strong">{zh ? "联系我们" : "Contact Us"}</p>
              <p className="text-ink-muted">
                {zh
                  ? "本地演示环境：请通过项目仓库 Issues 或内部群反馈。邮箱：support@dramaeditor.local"
                  : "Local demo: reach us via repo Issues. Email: support@dramaeditor.local"}
              </p>
            </div>
          )}
          {section === "guide" && (
            <ol className="list-decimal space-y-2 pl-5 text-ink-muted">
              <li>{zh ? "点「免费体验」登录本地会话。" : "Click Get Started to sign in locally."}</li>
              <li>{zh ? "在主页创建世界与故事。" : "Create worlds and stories from Home."}</li>
              <li>
                {zh ? "在账户管理修改昵称与语言。" : "Update nickname and language in My Account."}
              </li>
              <li>
                {zh
                  ? "在设置页配置 LLM / 图像 / 视频供应商。"
                  : "Configure LLM / image / video providers in Settings."}
              </li>
            </ol>
          )}
          {section === "shortcuts" && (
            <div className="space-y-2 text-ink-muted">
              <p>
                <kbd className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">⌘ / Ctrl + K</kbd>{" "}
                {zh ? "打开命令面板（占位）" : "Command palette (placeholder)"}
              </p>
              <p>
                <kbd className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">Esc</kbd>{" "}
                {zh ? "关闭弹窗" : "Close modal"}
              </p>
            </div>
          )}
          {section === "feedback" && <FeedbackForm zh={zh} />}
        </div>
      </div>
    </WorldBuilderLayout>
  );
}

function FeedbackForm({ zh }: { zh: boolean }) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        try {
          const key = "dramaeditor-feedback";
          const prev = JSON.parse(window.localStorage.getItem(key) || "[]") as string[];
          prev.unshift(`${new Date().toISOString()} · ${text.trim()}`);
          window.localStorage.setItem(key, JSON.stringify(prev.slice(0, 20)));
        } catch {
          // ignore
        }
        setText("");
        setDone(true);
      }}
    >
      <p className="font-medium text-ink-strong">{zh ? "反馈问题" : "Report an Issue"}</p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDone(false);
        }}
        rows={5}
        placeholder={
          zh ? "告诉我们你遇到了什么问题或建议…" : "Tell us what went wrong or what you'd like…"
        }
        className="w-full rounded-2xl border border-card-border bg-stage px-4 py-3 text-sm outline-none focus:border-ink-strong/25"
      />
      <button
        type="submit"
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
      >
        {done ? (zh ? "已提交（本地）" : "Submitted (local)") : zh ? "提交反馈" : "Submit"}
      </button>
    </form>
  );
}
