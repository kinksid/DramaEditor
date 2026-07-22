export type DramaPlayAsset = {
  id: string;
  title: string;
  genre: string;
  description: string;
  poster: string;
  video: string;
  source: string;
};

export const dramaPlayAssets: DramaPlayAsset[] = [
  {
    id: "hua-jian-ci",
    title: "花间词",
    genre: "古风",
    description: "宫廷情感与选择分支交织的古风互动短剧，可作为世界库和视频节点素材。",
    poster: "/dramaplay-assets/posters/hua-jian-ci.png",
    video: "/dramaplay-assets/videos/hua-jian-ci-ep01.mp4",
    source: "Drama Play 本地素材",
  },
  {
    id: "xindong-code",
    title: "心动代码：遇见你的青春",
    genre: "恋爱",
    description: "青春恋爱题材竖屏短剧素材，适合作为互动选择与 App 预览测试片段。",
    poster: "/dramaplay-assets/posters/xindong-code.png",
    video: "/dramaplay-assets/videos/xindong-code-ep01.mp4",
    source: "Drama Play 本地素材",
  },
  {
    id: "yuan-qi-qing-gong",
    title: "缘起清宫",
    genre: "古风",
    description: "清宫题材互动短剧素材，可用于世界封面、素材库预览与视频节点绑定。",
    poster: "/dramaplay-assets/posters/yuan-qi-qing-gong.png",
    video: "/dramaplay-assets/videos/yuan-qi-qing-gong-ep01.mp4",
    source: "Drama Play 本地素材",
  },
];
