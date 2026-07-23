# Studio 像素对照基线

Updated: 2026-07-22 Asia/Shanghai  
Sources: https://studio.dreem-world.ai/worlds/019ef8e1-17a3-76d0-b384-6591f50cd2ee（自动化主目标）+ Studio 根壳  
Note: 每轮优先对照该世界详情及其子层级；登录态页面待实机截图补全。

## Design tokens (Studio)

| Token | Studio | Local target |
|-------|--------|--------------|
| Fonts | Public Sans, Instrument Serif, Courier Prime | same via Google Fonts |
| Light chrome | `#ffffff` | stage/panel light |
| Dark chrome | `#0a0a0a` / `#0c0a0f` | charcoal stage |
| Accent | brand rose (not purple) | `--tw-accent` rose |
| Sidebar | `w-20` (~80px) | `w-20` |
| World card | `aspect-[9/16]` portrait | worlds grid |

## Route map

| Studio | Local |
|--------|-------|
| `/` Home | `/world-builder/home` |
| `/worlds` My Worlds | `/world-builder/worlds` (+ rewrite `/worlds`) |
| `/worlds/:worldId` | `/world-builder/worlds/[worldId]` |
| `.../characters\|locations\|storylines` | same under worldId |
| `/stories/:storyId` | `/world-builder/stories/[storyId]` (+ rewrite) |
| `/create` SD 2.0 | `/world-builder/home` / tiers |
| `/insights` | gap (later) |
| `/membership` | `/world-builder/tiers` |

## P0 modules（主目标世界详情）

主靶：`/worlds/019ef8e1-17a3-76d0-b384-6591f50cd2ee`

1. **World detail** — cover hero, breadcrumb My Worlds, URL tabs, Add Character/Location/Story, Publish world  
2. **Subtree** — characters / locations / storylines 及关联故事与画布入口  
3. **Worlds list** — 仅作进入主靶的上下文，非每轮主修复面  

## Story subtree (P0+, 2026-07-22)

| Studio | Local |
|--------|-------|
| `/worlds/:id` (desk) | `/world-builder/stories/:id` |
| `/worlds/:id/characters/:cid` | `/world-builder/stories/:id/characters/:cid` (+ rewrite) |
| `/worlds/:id/locations/:lid` | `/world-builder/stories/:id/locations/:lid` (+ rewrite) |
| Story graph canvas | `/world-builder/story-graph?project=:id` |
| Add node menu | Episode/Highlight on canvas; Video/Interaction inside episode frame |
| Character Studio | Identity→Wardrobe 结构化字段 + Face 3-up turnaround + World builder panel |
| Location Studio | IDENTITY/SETTING/IMAGES + angle strip + World builder panel |

## Gaps deferred to 15-min automation

- Insights page shell  
- Membership full parity  
- Story desk World builder full pipeline vs assistant sidebar (G24)  
- Login-gated pixel diffs on worlds list spacing (G20)  
