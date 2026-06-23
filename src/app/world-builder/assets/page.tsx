"use client";

import { useState } from "react";
import { Film, ImagePlus, MapPin, Plus, UserRound, Wand2 } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { cn } from "@/lib/utils";
import { locationTypeLabels, statusLabels } from "@/lib/worldBuilderLabels";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { ReactNode } from "react";

type AssetTab = "characters" | "locations" | "videos" | "references" | "dramaPlay";

const tabLabels: Record<AssetTab, string> = {
  characters: "角色参考",
  locations: "地点参考",
  videos: "视频节点",
  references: "世界参考",
  dramaPlay: "Drama Play 素材",
};

export default function AssetsPage() {
  const [tab, setTab] = useState<AssetTab>("characters");
  const [notice, setNotice] = useState<string | null>(null);
  const { characters, locations, nodes, selectedNodeId, updateNode, generateAllMockVideos } = useWorldBuilderStore();
  const scenes = nodes.filter((node) => node.kind === "scene");
  const selectedScene = scenes.find((scene) => scene.id === selectedNodeId) ?? scenes[0];

  const applyVideoToScene = (asset: (typeof dramaPlayAssets)[number]) => {
    if (!selectedScene) {
      setNotice("请先创建一个视频节点。");
      return;
    }
    updateNode(selectedScene.id, {
      title: selectedScene.data.title === "未命名视频节点" ? asset.title : selectedScene.data.title,
      videoUrl: asset.video,
      firstFrameRef: asset.poster,
      status: "ready",
    });
    setNotice(`已将《${asset.title}》视频套用到「${selectedScene.data.title}」`);
  };

  const uploadLocalVideo = (file: File) => {
    if (!selectedScene) {
      setNotice("请先创建一个视频节点。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      updateNode(selectedScene.id, {
        videoUrl: reader.result,
        status: "ready",
      });
      setNotice(`已上传并绑定到「${selectedScene.data.title}」`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <WorldBuilderLayout>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                素材库
              </p>
              <h1 className="mt-2 text-3xl font-semibold">制作素材库</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                管理角色参考、地点参考、视频节点和世界规则资源。已接入 Drama Play 本地视频与海报素材，可直接套用到当前故事节点。
              </p>
            </div>
            <button
              onClick={generateAllMockVideos}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              <Wand2 size={16} /> 生成全部模拟视频
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {(Object.keys(tabLabels) as AssetTab[]).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium",
                  tab === item
                    ? "border-ink bg-ink text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                {tabLabels[item]}
              </button>
            ))}
          </div>
        </section>

        {tab === "characters" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => (
              <AssetCard
                key={character.id}
                icon={<UserRound size={20} />}
                title={character.name}
                meta={`${character.role}${character.age ? ` · ${character.age} 岁` : ""}`}
                description={character.description}
              />
            ))}
            <AddAssetCard label="添加角色参考" />
          </div>
        )}

        {tab === "locations" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {locations.map((location) => (
              <AssetCard
                key={location.id}
                icon={<MapPin size={20} />}
                title={location.name}
                meta={locationTypeLabels[location.type]}
                description={location.description}
              />
            ))}
            <AddAssetCard label="添加地点参考" />
          </div>
        )}

        {tab === "videos" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scenes.map((scene) => (
              <AssetCard
                key={scene.id}
                icon={<Film size={20} />}
                title={scene.data.title}
                meta={statusLabels[scene.data.status]}
                description={scene.data.prompt}
                videoUrl={scene.data.videoUrl}
              />
            ))}
          </div>
        )}

        {tab === "dramaPlay" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dramaPlayAssets.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
                <video src={asset.video} poster={asset.poster} controls className="aspect-video w-full bg-black object-cover" />
                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{asset.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">{asset.genre} · {asset.source}</p>
                    </div>
                    <span className="rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-semibold text-accent">本地视频</span>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-slate-500">{asset.description}</p>
                  <button onClick={() => applyVideoToScene(asset)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
                    <Film size={16} /> 套用到当前视频节点
                  </button>
                </div>
              </article>
            ))}
            <UploadAssetCard onUpload={uploadLocalVideo} />
          </div>
        )}

        {tab === "references" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AssetCard
              icon={<ImagePlus size={20} />}
              title="世界封面"
              meta="本地占位"
              description="可用于 App 首页、故事详情页和分享卡片。后续可接入真实图片生成。"
              imageUrl={dramaPlayAssets[0]?.poster}
            />
            <AssetCard
              icon={<ImagePlus size={20} />}
              title="角色一致性参考"
              meta="待接入"
              description="为每个角色绑定 reference image，保证视频生成时外观一致。"
            />
            <AddAssetCard label="添加世界参考" />
          </div>
        )}
        {notice && (
          <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-700 shadow-soft">
            {notice}
          </div>
        )}
      </div>
    </WorldBuilderLayout>
  );
}

function AssetCard({
  icon,
  title,
  meta,
  description,
  imageUrl,
  videoUrl,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      {videoUrl ? (
        <video src={videoUrl} controls className="aspect-video w-full bg-black object-cover" />
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={title} className="aspect-video w-full object-cover" />
      ) : (
        <div className="aspect-video bg-[linear-gradient(135deg,#090d16,#283244_45%,#f27d3d)]" />
      )}
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-orange-50 text-accent">{icon}</div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">{meta}</p>
          </div>
        </div>
        <p className="line-clamp-4 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </article>
  );
}

function AddAssetCard({ label }: { label: string }) {
  return (
    <button className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50">
      <span className="flex flex-col items-center gap-3 text-sm font-medium">
        <Plus size={22} />
        {label}
      </span>
    </button>
  );
}

function UploadAssetCard({ onUpload }: { onUpload: (file: File) => void }) {
  return (
    <label className="grid min-h-64 cursor-pointer place-items-center rounded-3xl border border-dashed border-slate-300 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50">
      <input
        className="hidden"
        type="file"
        accept="video/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = "";
        }}
      />
      <span className="flex flex-col items-center gap-3 text-sm font-medium">
        <Plus size={22} />
        上传本地视频并绑定
      </span>
    </label>
  );
}
