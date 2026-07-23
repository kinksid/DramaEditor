import assert from "node:assert/strict";
import test from "node:test";
import {
  generateDreemFlowCode,
  understandDreemIntent,
} from "./dreemAutoAgent";

test("understandDreemIntent 识别三类工作流", () => {
  assert.equal(understandDreemIntent("抓取网页标题").blueprintId, "data_harvest");
  assert.equal(
    understandDreemIntent("批量整理目录中的文件").blueprintId,
    "file_orchestrator",
  );
  assert.equal(
    understandDreemIntent("调用多个 API 端点").blueprintId,
    "api_orchestrator",
  );
});

test("understandDreemIntent 对未知意图给出显式默认推荐", () => {
  const intent = understandDreemIntent("帮我完成这个任务");
  assert.equal(intent.blueprintId, "data_harvest");
  assert.equal(intent.usedFallback, true);
  assert.equal(intent.confidence, 0);
});

test("数据采集脚本安全编码用户参数", () => {
  const code = generateDreemFlowCode("data_harvest", {
    url: "https://example.com/news",
    selector: "a[data-title]",
    columnName: '新闻"标题',
  });

  assert.match(code, /URL = "https:\/\/example\.com\/news"/);
  assert.match(code, /COLUMN_NAME = "新闻\\"标题"/);
  assert.match(code, /response\.raise_for_status\(\)/);
});

test("API 编排脚本从环境变量读取密钥", () => {
  const code = generateDreemFlowCode("api_orchestrator", {
    baseUrl: "https://api.example.com",
    endpoints: "/users\n/posts",
    apiKeyEnv: "MY_API_TOKEN",
  });

  assert.match(code, /ENDPOINTS = \["\/users","\/posts"\]/);
  assert.match(code, /os\.environ\.get\(API_KEY_ENV\)/);
  assert.doesNotMatch(code, /API_KEY =/);
});

test("生成器拒绝缺失参数和非 HTTP URL", () => {
  assert.throws(
    () => generateDreemFlowCode("file_orchestrator", {}),
    /缺少参数：源目录/,
  );
  assert.throws(
    () =>
      generateDreemFlowCode("data_harvest", {
        url: "file:///etc/passwd",
        selector: "body",
      }),
    /仅支持 HTTP 或 HTTPS/,
  );
});
