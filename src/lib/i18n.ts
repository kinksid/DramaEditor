"use client";

import { createContext, useContext } from "react";
import { useSettingsStore, type Language } from "@/stores/settingsStore";

export type I18nKey =
  | "app.title"
  | "app.description"
  | "nav.home"
  | "nav.worlds"
  | "nav.storyGraph"
  | "nav.appPreview"
  | "nav.assets"
  | "nav.sd20"
  | "nav.settings"
  | "home.heading"
  | "home.subtitle"
  | "home.createBtn"
  | "home.continueWatching"
  | "home.recommended"
  | "home.forYou"
  | "home.addRef"
  | "home.autoSplit"
  | "home.visualStyle"
  | "home.promptPlaceholder"
  | "home.orStartBlank"
  | "home.endOfList"
  | "home.keepCreating"
  | "home.searchWorlds"
  | "home.hotFirst"
  | "home.completionFirst"
  | "home.interactiveFirst"
  | "home.resumeWork"
  | "home.lastSeen"
  | "home.watchedPercent"
  | "home.tapToContinue"
  | "home.reducedRec"
  | "home.undo"
  | "home.restoreAll"
  | "home.restoreDesc"
  | "home.restoreTitle"
  | "home.allGenres"
  | "home.notInterested"
  | "home.previewNow"
  | "world.worldTitle"
  | "world.editWorld"
  | "world.resetWorld"
  | "world.exportApp"
  | "world.publish"
  | "world.cover"
  | "world.characters"
  | "world.locations"
  | "world.episodes"
  | "world.tabCharacters"
  | "world.tabLocations"
  | "world.tabStorylines"
  | "world.addCharacter"
  | "world.addLocation"
  | "world.save"
  | "world.cancel"
  | "world.characterInfo"
  | "world.locationInfo"
  | "world.characterName"
  | "world.characterAge"
  | "world.characterRole"
  | "world.characterDesc"
  | "world.locationName"
  | "world.locationType"
  | "world.locationDesc"
  | "world.editWorldModal"
  | "world.worldName"
  | "world.worldDescription"
  | "world.storyOutline"
  | "world.branchEpisodes"
  | "world.episode"
  | "editor.appPreview"
  | "editor.appPreviewTitle"
  | "editor.episodeList"
  | "editor.videosReady"
  | "editor.playPath"
  | "editor.branchConnections"
  | "editor.emptyEpisode"
  | "editor.emptyEpisodeDesc"
  | "editor.generateMockVideos"
  | "editor.exportAppData"
  | "editor.restart"
  | "editor.noConnections"
  | "editor.emptyNodes"
  | "editor.selectNode"
  | "editor.selectNodeHint"
  | "assets.title"
  | "assets.heading"
  | "assets.subtitle"
  | "assets.characters"
  | "assets.locations"
  | "assets.videos"
  | "assets.references"
  | "assets.dramaPlay"
  | "assets.generateAllMock"
  | "assets.applyToScene"
  | "assets.localVideo"
  | "assets.worldCover"
  | "assets.charConsistency"
  | "assets.addCharRef"
  | "assets.addLocRef"
  | "assets.addWorldRef"
  | "assets.uploadLocal"
  | "tiers.title"
  | "tiers.heading"
  | "tiers.subtitle"
  | "tiers.current"
  | "tiers.upgrade"
  | "tiers.contact"
  | "tiers.viewDetails"
  | "tiers.currentLevel"
  | "settings.title"
  | "settings.heading"
  | "settings.subtitle"
  | "settings.appTarget"
  | "settings.storyName"
  | "settings.bundleId"
  | "settings.entryMode"
  | "settings.videoStrategy"
  | "settings.actions"
  | "settings.exportApp"
  | "settings.exportBackup"
  | "settings.resetProject"
  | "settings.noticeExported"
  | "settings.noticeBackup"
  | "story.storyGraph"
  | "story.treeStory"
  | "story.saved"
  | "story.episodesCount"
  | "story.nodesCount"
  | "story.videosReadyCount"
  | "story.preview"
  | "story.save"
  | "story.publish"
  | "story.generateVideos"
  | "story.addVideo"
  | "story.addInteraction"
  | "story.addEnding"
  | "story.assets"
  | "story.outline"
  | "story.viewScript"
  | "story.script"
  | "story.fullScript"
  | "story.collab"
  | "story.worldAssets"
  | "story.backToBuilder"
  | "story.nodeVideo"
  | "story.nodeInteraction"
  | "story.nodeEnding"
  | "story.options"
  | "story.addOption"
  | "story.edit"
  | "story.notConnected"
  | "story.publishCheck"
  | "story.canPublish"
  | "story.close"
  | "story.openGraph"
  | "story.validating"
  | "settings.apiKey"
  | "settings.apiKeyDesc"
  | "settings.apiBaseUrl"
  | "settings.apiKeyLabel"
  | "settings.appExport"
  | "settings.appExportDesc"
  | "settings.dataOps"
  | "settings.dataOpsDesc";

type I18nDict = Record<I18nKey, string>;

const zh: I18nDict = {
  "app.title": "互动短剧编辑器 DramaEditor",
  "app.description": "一键生成，可以玩的短剧 One Click, Boundless Stories。",
  "nav.home": "首页",
  "nav.worlds": "世界",
  "nav.storyGraph": "故事图",
  "nav.appPreview": "App 预览",
  "nav.assets": "素材",
  "nav.sd20": "SD 2.0",
  "nav.settings": "设置",
  "home.heading": "一键生成，可以玩的短剧",
  "home.subtitle": "One Click, Boundless Stories。面向 App 的树状分支剧情、互动节点、视频节点和多人协作制作平台。",
  "home.createBtn": "创建",
  "home.continueWatching": "继续工作",
  "home.recommended": "推荐流",
  "home.forYou": "为你推荐",
  "home.addRef": "添加参考",
  "home.autoSplit": "自动拆解",
  "home.visualStyle": "视觉风格",
  "home.promptPlaceholder": "你想创建一个怎样的世界？",
  "home.orStartBlank": "或从空白世界开始",
  "home.endOfList": "已经到底",
  "home.keepCreating": "继续创建你的互动短剧世界。",
  "home.searchWorlds": "搜索世界",
  "home.hotFirst": "热门优先",
  "home.completionFirst": "完播优先",
  "home.interactiveFirst": "互动密度",
  "home.resumeWork": "上次工作到 第 {level} 级",
  "home.lastSeen": "上次看到",
  "home.watchedPercent": "已观看 · 点按继续互动",
  "home.tapToContinue": "已有",
  "home.reducedRec": "已减少推荐",
  "home.undo": "撤销",
  "home.restoreAll": "恢复全部推荐",
  "home.restoreDesc": "恢复推荐后，可以继续按热门、完播或互动密度重新筛选。",
  "home.restoreTitle": "推荐已按你的反馈收起",
  "home.allGenres": "全部类型",
  "home.notInterested": "不感兴趣",
  "home.previewNow": "立即预览",
  "world.worldTitle": "世界",
  "world.editWorld": "编辑世界",
  "world.resetWorld": "重置世界",
  "world.exportApp": "导出 App 数据",
  "world.publish": "发布",
  "world.cover": "世界封面",
  "world.characters": "个角色",
  "world.locations": "个地点",
  "world.episodes": "条故事线",
  "world.tabCharacters": "角色",
  "world.tabLocations": "地点",
  "world.tabStorylines": "故事线",
  "world.addCharacter": "添加角色",
  "world.addLocation": "添加地点",
  "world.save": "保存",
  "world.cancel": "取消",
  "world.characterInfo": "角色信息",
  "world.locationInfo": "地点信息",
  "world.characterName": "角色名",
  "world.characterAge": "年龄",
  "world.characterRole": "身份 / 戏剧功能",
  "world.characterDesc": "角色描述",
  "world.locationName": "地点名",
  "world.locationType": "地点类型",
  "world.locationDesc": "地点描述",
  "world.editWorldModal": "编辑世界",
  "world.worldName": "世界名称",
  "world.worldDescription": "世界描述",
  "world.storyOutline": "故事大纲",
  "world.branchEpisodes": "条分支剧集",
  "world.episode": "第 {index} 集",
  "editor.appPreview": "App 预览",
  "editor.appPreviewTitle": "iOS 互动播放验收",
  "editor.episodeList": "剧集列表",
  "editor.videosReady": "视频就绪",
  "editor.playPath": "播放路径",
  "editor.branchConnections": "分支连接",
  "editor.emptyEpisode": "空剧集",
  "editor.emptyEpisodeDesc": "添加视频节点后即可预览 App 播放效果。",
  "editor.generateMockVideos": "生成模拟视频",
  "editor.exportAppData": "导出 App 数据",
  "editor.restart": "重新开始",
  "editor.noConnections": "还没有连接线。",
  "editor.emptyNodes": "未选择剧集",
  "editor.selectNode": "选择一个节点",
  "editor.selectNodeHint": "点击画布中的视频节点、互动节点或结局节点，即可编辑本地数据。",
  "assets.title": "素材库",
  "assets.heading": "制作素材库",
  "assets.subtitle": "管理角色参考、地点参考、视频节点和世界规则资源。",
  "assets.characters": "角色参考",
  "assets.locations": "地点参考",
  "assets.videos": "视频节点",
  "assets.references": "世界参考",
  "assets.dramaPlay": "Drama Play 素材",
  "assets.generateAllMock": "生成全部模拟视频",
  "assets.applyToScene": "套用到当前视频节点",
  "assets.localVideo": "本地视频",
  "assets.worldCover": "世界封面",
  "assets.charConsistency": "角色一致性参考",
  "assets.addCharRef": "添加角色参考",
  "assets.addLocRef": "添加地点参考",
  "assets.addWorldRef": "添加世界参考",
  "assets.uploadLocal": "上传本地视频并绑定",
  "tiers.title": "制作等级",
  "tiers.heading": "创作者权益",
  "tiers.subtitle": "管理互动短剧编辑器的生成能力、制作额度、团队权限和面向 App 的发布权限。",
  "tiers.current": "当前",
  "tiers.upgrade": "升级",
  "tiers.contact": "联系开通",
  "tiers.viewDetails": "查看详情",
  "tiers.currentLevel": "当前等级",
  "settings.title": "设置",
  "settings.heading": "制作与导出设置",
  "settings.subtitle": "配置导出给 iOS 互动影游 App 的基础参数。",
  "settings.appTarget": "App 目标",
  "settings.storyName": "故事名称",
  "settings.bundleId": "应用包名",
  "settings.entryMode": "App 入口模式",
  "settings.videoStrategy": "视频资源策略",
  "settings.actions": "平台动作",
  "settings.exportApp": "导出 App 数据",
  "settings.exportBackup": "导出制作备份",
  "settings.resetProject": "重置本地项目",
  "settings.noticeExported": "已导出 App 数据",
  "settings.noticeBackup": "已导出制作备份",
  "story.storyGraph": "互动短剧编辑器",
  "story.treeStory": "树状分支剧情",
  "story.saved": "已保存",
  "story.episodesCount": "集",
  "story.nodesCount": "个节点",
  "story.videosReadyCount": "个视频就绪",
  "story.preview": "预览",
  "story.save": "保存",
  "story.publish": "发布",
  "story.generateVideos": "生成全部视频",
  "story.addVideo": "添加视频",
  "story.addInteraction": "添加互动",
  "story.addEnding": "添加结局",
  "story.assets": "素材",
  "story.outline": "大纲",
  "story.viewScript": "查看完整剧本",
  "story.script": "剧本",
  "story.fullScript": "完整剧本",
  "story.collab": "协作工作流",
  "story.worldAssets": "世界资产",
  "story.backToBuilder": "返回世界构建器",
  "story.nodeVideo": "视频节点",
  "story.nodeInteraction": "互动节点",
  "story.nodeEnding": "结局节点",
  "story.options": "选项",
  "story.addOption": "添加选项",
  "story.edit": "编辑",
  "story.notConnected": "未连接",
  "story.publishCheck": "发布检查",
  "story.canPublish": "可以发布",
  "story.close": "关闭",
  "story.openGraph": "打开故事图",
  "story.validating": "发布检查中",
  "settings.apiKey": "API Key",
  "settings.apiKeyDesc": "用于访问 Seedance API 的身份凭证",
  "settings.apiBaseUrl": "API Base URL",
  "settings.apiKeyLabel": "API Key",
  "settings.appExport": "App 导出配置",
  "settings.appExportDesc": "配置导出给 iOS 互动影游 App 的基础参数",
  "settings.dataOps": "数据操作",
  "settings.dataOpsDesc": "导出、备份或重置项目数据",
};

const en: I18nDict = {
  "app.title": "DramaEditor",
  "app.description": "One Click, Boundless Stories. Interactive drama editor for apps.",
  "nav.home": "Home",
  "nav.worlds": "Worlds",
  "nav.storyGraph": "Story Graph",
  "nav.appPreview": "App Preview",
  "nav.assets": "Assets",
  "nav.sd20": "SD 2.0",
  "nav.settings": "Settings",
  "home.heading": "One Click, Boundless Stories",
  "home.subtitle": "Tree-branching narratives, interaction nodes, video nodes, and collaborative production platform for apps.",
  "home.createBtn": "Create",
  "home.continueWatching": "Continue Working",
  "home.recommended": "Recommended",
  "home.forYou": "For You",
  "home.addRef": "Add Reference",
  "home.autoSplit": "Auto Split",
  "home.visualStyle": "Visual Style",
  "home.promptPlaceholder": "What kind of world do you want to create?",
  "home.orStartBlank": "Or start from a blank world",
  "home.endOfList": "You've reached the end",
  "home.keepCreating": "Keep creating your interactive drama worlds.",
  "home.searchWorlds": "Search worlds",
  "home.hotFirst": "Hot First",
  "home.completionFirst": "Completion First",
  "home.interactiveFirst": "Interactive Density",
  "home.resumeWork": "Last worked to level {level}",
  "home.lastSeen": "Last Seen",
  "home.watchedPercent": "Watched · Tap to continue",
  "home.tapToContinue": "watched",
  "home.reducedRec": "Reduced recommendation",
  "home.undo": "Undo",
  "home.restoreAll": "Restore All",
  "home.restoreDesc": "After restoring, you can re-filter by hot, completion, or interactive density.",
  "home.restoreTitle": "Recommendations hidden per your feedback",
  "home.allGenres": "All Genres",
  "home.notInterested": "Not Interested",
  "home.previewNow": "Preview Now",
  "world.worldTitle": "World",
  "world.editWorld": "Edit World",
  "world.resetWorld": "Reset World",
  "world.exportApp": "Export App Data",
  "world.publish": "Publish",
  "world.cover": "World Cover",
  "world.characters": "characters",
  "world.locations": "locations",
  "world.episodes": "storylines",
  "world.tabCharacters": "Characters",
  "world.tabLocations": "Locations",
  "world.tabStorylines": "Storylines",
  "world.addCharacter": "Add Character",
  "world.addLocation": "Add Location",
  "world.save": "Save",
  "world.cancel": "Cancel",
  "world.characterInfo": "Character Info",
  "world.locationInfo": "Location Info",
  "world.characterName": "Name",
  "world.characterAge": "Age",
  "world.characterRole": "Role",
  "world.characterDesc": "Description",
  "world.locationName": "Name",
  "world.locationType": "Type",
  "world.locationDesc": "Description",
  "world.editWorldModal": "Edit World",
  "world.worldName": "World Name",
  "world.worldDescription": "World Description",
  "world.storyOutline": "Story Outline",
  "world.branchEpisodes": "branch episodes",
  "world.episode": "Ep.{index}",
  "editor.appPreview": "App Preview",
  "editor.appPreviewTitle": "iOS Interactive Playback Check",
  "editor.episodeList": "Episode List",
  "editor.videosReady": "videos ready",
  "editor.playPath": "Play Path",
  "editor.branchConnections": "Branch Connections",
  "editor.emptyEpisode": "Empty Episode",
  "editor.emptyEpisodeDesc": "Add video nodes to preview app playback.",
  "editor.generateMockVideos": "Generate Mock Videos",
  "editor.exportAppData": "Export App Data",
  "editor.restart": "Restart",
  "editor.noConnections": "No connections yet.",
  "editor.emptyNodes": "No episode selected",
  "editor.selectNode": "Select a Node",
  "editor.selectNodeHint": "Click a video, interaction, or ending node on the canvas to edit its data.",
  "assets.title": "Assets",
  "assets.heading": "Production Asset Library",
  "assets.subtitle": "Manage character references, location references, video nodes, and world rules.",
  "assets.characters": "Characters",
  "assets.locations": "Locations",
  "assets.videos": "Videos",
  "assets.references": "References",
  "assets.dramaPlay": "Drama Play",
  "assets.generateAllMock": "Generate All Mock Videos",
  "assets.applyToScene": "Apply to Current Video Node",
  "assets.localVideo": "Local Video",
  "assets.worldCover": "World Cover",
  "assets.charConsistency": "Character Consistency Ref",
  "assets.addCharRef": "Add Character Reference",
  "assets.addLocRef": "Add Location Reference",
  "assets.addWorldRef": "Add World Reference",
  "assets.uploadLocal": "Upload Local Video & Bind",
  "tiers.title": "Tiers",
  "tiers.heading": "Creator Benefits",
  "tiers.subtitle": "Manage generation capabilities, production quotas, team permissions, and app publishing rights.",
  "tiers.current": "Current",
  "tiers.upgrade": "Upgrade",
  "tiers.contact": "Contact Us",
  "tiers.viewDetails": "View Details",
  "tiers.currentLevel": "Current Level",
  "settings.title": "Settings",
  "settings.heading": "Production & Export Settings",
  "settings.subtitle": "Configure export parameters for iOS interactive drama apps.",
  "settings.appTarget": "App Target",
  "settings.storyName": "Story Name",
  "settings.bundleId": "App Bundle ID",
  "settings.entryMode": "App Entry Mode",
  "settings.videoStrategy": "Video Resource Strategy",
  "settings.actions": "Platform Actions",
  "settings.exportApp": "Export App Data",
  "settings.exportBackup": "Export Production Backup",
  "settings.resetProject": "Reset Local Project",
  "settings.noticeExported": "App data exported",
  "settings.noticeBackup": "Production backup exported",
  "story.storyGraph": "DramaEditor",
  "story.treeStory": "Tree-branch Story",
  "story.saved": "Saved",
  "story.episodesCount": "episodes",
  "story.nodesCount": "nodes",
  "story.videosReadyCount": "videos ready",
  "story.preview": "Preview",
  "story.save": "Save",
  "story.publish": "Publish",
  "story.generateVideos": "Generate All Videos",
  "story.addVideo": "Add Video",
  "story.addInteraction": "Add Interaction",
  "story.addEnding": "Add Ending",
  "story.assets": "Assets",
  "story.outline": "Outline",
  "story.viewScript": "View Full Script",
  "story.script": "Script",
  "story.fullScript": "Full Script",
  "story.collab": "Collaboration",
  "story.worldAssets": "World Assets",
  "story.backToBuilder": "Back to World Builder",
  "story.nodeVideo": "Video Node",
  "story.nodeInteraction": "Interaction Node",
  "story.nodeEnding": "Ending Node",
  "story.options": "Options",
  "story.addOption": "Add Option",
  "story.edit": "Edit",
  "story.notConnected": "Not Connected",
  "story.publishCheck": "Publish Check",
  "story.canPublish": "Ready to Publish",
  "story.close": "Close",
  "story.openGraph": "Open Story Graph",
  "story.validating": "Validating...",
  "settings.apiKey": "API Key",
  "settings.apiKeyDesc": "Credentials for accessing Seedance API",
  "settings.apiBaseUrl": "API Base URL",
  "settings.apiKeyLabel": "API Key",
  "settings.appExport": "App Export Config",
  "settings.appExportDesc": "Configure export parameters for iOS interactive drama apps",
  "settings.dataOps": "Data Operations",
  "settings.dataOpsDesc": "Export, backup or reset project data",
};

const dicts: Record<Language, I18nDict> = { zh, en };

export const I18nContext = createContext<Language>("zh");

export function useI18n() {
  const language = useSettingsStore((s) => s.language);
  const dict = dicts[language] ?? zh;

  function t(key: I18nKey, params?: Record<string, string | number>): string {
    let text = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }

  return { t, language };
}

export { dicts };
