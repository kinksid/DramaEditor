"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type HomeFeedCard = {
  id: string;
  title: string;
  genre: string;
  poster?: string;
  author: string;
  stars: number;
  href?: string;
};

export function HomeFeedSection({
  title,
  description,
  moreHref,
  moreLabel = "查看全部",
  cards,
}: {
  title: string;
  description?: string;
  moreHref?: string;
  moreLabel?: string;
  cards: HomeFeedCard[];
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink-strong">{title}</h2>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
        </div>
        {moreHref ? (
          <Link
            href={moreHref}
            className="shrink-0 text-sm text-ink-muted transition hover:text-ink-strong"
          >
            {moreLabel} →
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <HomeFeedCardView key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}

function HomeFeedCardView({ card }: { card: HomeFeedCard }) {
  const href = card.href ?? "/world-builder/app-preview";

  return (
    <Link
      href={href}
      className={cn(
        "group relative isolate aspect-[9/16] w-full overflow-hidden rounded-[16px] border border-transparent bg-[#18181B] transition",
        "hover:border-white/30",
      )}
    >
      {card.poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.poster}
          alt=""
          className="pointer-events-none absolute inset-0 z-0 size-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="de-project-matrix absolute inset-0 z-0 size-full">
          <div className="de-project-matrix-shine absolute inset-0" aria-hidden />
        </div>
      )}

      <span className="absolute left-2.5 top-2.5 z-20 rounded-md bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
        {card.genre}
      </span>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[42%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-ink-muted">@{card.author}</p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5 text-white">{card.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs text-ink-muted">
          <Star size={13} className="fill-white/20" />
          <span>{card.stars}</span>
        </div>
      </div>
    </Link>
  );
}
