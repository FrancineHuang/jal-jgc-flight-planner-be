# JGC Flight Planner · Backend

面向日本航空（JAL）JGC「修行僧」的航班规划工具后端，用于估算行程的 Life Status Points（LSP）以及每点获取成本，让不同航线、航段组合和机票预算更容易比较。

## 项目背景

对以加入 JAL Global Club（JGC）为目标、或希望持续积累 LSP 的飞行爱好者来说，规划一次「修行」往往需要同时考虑机票价格、飞行航段和积分获取效率。

JAL 的 Life Status Program 根据符合条件的搭乘及生活服务使用情况累计 Life Status Points；达到相应积分并满足其他条件后，可以获得对应权益或 JGC 入会资格。制度背景可参考 [JAL 官方 Life Status Program 介绍](https://www.jal.co.jp/jp/ja/jmb/jmbapp/tips/23/index.html)。

这个项目希望回答一个具体的问题：**给定一组航段和总票价，这次行程预计能获得多少 LSP，每个 LSP 需要花多少钱？** 后端负责输入校验、政策计算及结果明细，为前端提供统一的 API。

当前处于原型阶段，已经实现第一个 LSP 估算接口。**每个符合条件的国内航段计 5 LSP 仅为未经核实的演示数据，不代表已经实现或验证 JAL 官方规则。** 航段资格由调用方手动提供，项目不验证实际入账资格，与 JAL 无官方关联。

## 当前功能

- 接收日元总票价和航段信息，估算总 LSP 与每点成本（JPY/LSP）。
- 支持 `eligible`、`ineligible`、`unknown` 三种手动资格状态。
- 返回逐航段计算明细、政策标识、版本和核实状态。
- 使用独立、可配置的政策引擎，便于后续维护不同版本的规则。
- 提供健康检查、请求校验和 JSON 错误响应。

当前通过手动输入票价和航段完成估算，尚未接入数据库、用户认证或外部票价服务。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| Node.js + npm | 后端运行环境及依赖管理 |
| TypeScript | 严格类型检查，使用 ESM / NodeNext 模块配置 |
| Express 5 | HTTP 服务与路由 |
| Zod | 请求参数及政策配置校验 |
| cors | 前端跨域配置 |
| dotenv | 从 `.env` 加载本地环境变量 |
| tsx | 开发时运行 TypeScript，监听文件变化 |
| Vitest + Supertest | 政策引擎单元测试及 HTTP API 测试 |

具体依赖版本以 `package.json` 和 `package-lock.json` 为准。

## 本地环境搭建

### 1. 准备工具

安装 Node.js（可使用 22.x 或 24.x）及其附带的 npm。手动调用 API 时还可以使用 curl。

```sh
node --version
npm --version
```

本地运行无需数据库、JAL 账号或第三方 API Key。

### 2. 安装依赖

拉取项目后，在后端目录执行：

```sh
cd jal-jgc-flight-planner-be
npm ci
```

如果终端已经位于后端目录，直接执行 `npm ci` 即可。该命令会按 lockfile 安装依赖。

### 3. 配置环境变量（可选）

在后端根目录新建 `.env` 文件：

```dotenv
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
```

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `4000` | 后端监听端口 |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS 允许的前端来源，包含协议及端口 |

不创建 `.env` 也可以使用默认值启动。`.env` 已加入 `.gitignore`。

### 4. 启动开发服务

```sh
npm run dev
```

默认服务地址为 `http://localhost:4000`。开发模式会监听源文件变化并自动重启。

在另一个终端确认服务正常：

```sh
curl http://localhost:4000/api/health
```

预期响应：

```json
{ "status": "ok", "service": "JGC Flight Planner API" }
```

### 5. 构建和运行编译产物

```sh
npm run build
npm start
```

构建产物位于 `dist/`。先停止开发服务再运行 `npm start`，或配置不同的 `PORT`，以免端口冲突。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm ci` | 按 lockfile 安装依赖 |
| `npm run dev` | 启动开发服务，监听文件变化 |
| `npm run typecheck` | 检查源代码和测试代码的类型 |
| `npm run build` | 编译源代码到 `dist/` |
| `npm start` | 运行编译后的服务 |
| `npm test` | 执行全部 Vitest 测试 |

提交变更前可以运行：

```sh
npm run typecheck
npm run build
npm test
```

HTTP 测试通过 Supertest 使用本地临时端口，无需提前启动开发服务。

## API 使用

### 健康检查

`GET /api/health`

返回服务状态，示例见上方启动步骤。

### 估算 LSP

`POST /api/v1/lsp/estimates`

请求使用 `Content-Type: application/json`。以下示例为羽田 → 那霸 → 羽田、总票价 ¥35,000、两个手动标记符合条件的航段：

```sh
curl -i -X POST http://localhost:4000/api/v1/lsp/estimates \
  -H 'Content-Type: application/json' \
  -d '{
    "totalAirfareJpy": 35000,
    "segments": [
      { "origin": "HND", "destination": "OKA", "departureDate": "2026-11-01", "marketingCarrier": "JL", "eligibility": "eligible" },
      { "origin": "OKA", "destination": "HND", "departureDate": "2026-11-03", "marketingCarrier": "JL", "eligibility": "eligible" }
    ]
  }'
```

预期 HTTP 200，结果为 **10 demo LSP、¥3,500/LSP**：

```json
{
  "totalAirfareJpy": 35000,
  "estimatedTotalLsp": 10,
  "jpyPerLsp": 3500,
  "breakdown": [
    {
      "origin": "HND", "destination": "OKA", "departureDate": "2026-11-01",
      "marketingCarrier": "JL", "eligibility": "eligible", "segmentIndex": 0,
      "estimatedLsp": 5, "reason": "eligible_domestic_demo"
    },
    {
      "origin": "OKA", "destination": "HND", "departureDate": "2026-11-03",
      "marketingCarrier": "JL", "eligibility": "eligible", "segmentIndex": 1,
      "estimatedLsp": 5, "reason": "eligible_domestic_demo"
    }
  ],
  "policy": {
    "id": "jgc-domestic-demo",
    "version": "1.0.0",
    "verificationStatus": "unverified",
    "usage": "demonstration_only",
    "lspPerEligibleDomesticSegment": 5,
    "domesticAirports": ["HND", "NRT", "OKA", "ITM", "KIX", "CTS", "FUK", "NGO"]
  },
  "warnings": [
    "Unverified demonstration data only. This estimate does not represent verified JAL LSP rules. Eligibility is supplied manually and is not verified."
  ]
}
```

#### 请求字段

| 字段 | 要求 |
| --- | --- |
| `totalAirfareJpy` | 日元总票价；非负整数，不超过 `Number.MAX_SAFE_INTEGER` |
| `segments` | 1–100 个航段，每段必须包含下列五个字段 |
| `segments[].origin` | 三位大写 IATA 机场代码，例如 `HND` |
| `segments[].destination` | 三位大写 IATA 机场代码，不能与出发地相同 |
| `segments[].departureDate` | 有效的 `YYYY-MM-DD` 日历日期 |
| `segments[].marketingCarrier` | 两位大写字母或数字组成的营销承运人 IATA 代码，例如 `JL` |
| `segments[].eligibility` | `eligible`、`ineligible` 或 `unknown`，由调用方手动提供 |

请求体上限为 100kb，多余字段会被拒绝。机场及航司代码只校验格式，不连接真实代码库。
日期和航司会保留在明细中，当前演示政策没有按日期或航司区分的计算规则。

#### 计算行为

| 航段情况 | 航段 LSP | 明细原因 |
| --- | --- | --- |
| `eligible`，且两个机场均在政策范围内 | 默认 5 | `eligible_domestic_demo` |
| `ineligible` | 0 | `ineligible` |
| `unknown` | `null` | `eligibility_unknown` |
| `eligible`，但任一机场不在政策范围内 | `null` | `route_outside_policy_scope` |

只要任一航段估算为 `null`，**`estimatedTotalLsp` 和 `jpyPerLsp` 均返回 `null`**，已知航段的结果仍会保留。默认机场列表只覆盖演示范围，范围外的机场不会被直接判定为国际机场或零积分。

全部航段为 `ineligible` 时，总 LSP 为 0，每点成本为 `null`。总票价允许为 0；总 LSP 为正时，每点成本按完整票价除以总 LSP 计算，不作展示舍入。`segmentIndex` 从 0 开始，与请求航段顺序一致。

#### 错误响应

错误使用 JSON 返回，包含 `error.code` 和 `error.message`。

| HTTP 状态 | 错误代码 | 含义 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 请求字段不合法，`error.issues` 提供字段路径和原因 |
| 400 | `INVALID_JSON` | 请求体不是合法 JSON |
| 413 | `PAYLOAD_TOO_LARGE` | 请求体超过 100kb |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 需要使用 `application/json` |
| 500 | `INTERNAL_ERROR` | 未预期的服务端错误，不向客户端返回内部细节 |

手动验证时，可以将任一段资格改为 `unknown`、将两段均改为 `ineligible`，或将票价改为负数，分别查看未知估算、零积分和校验失败的响应。

## 目录结构

```text
src/
  index.ts                 # 加载环境变量并启动服务
  app.ts                   # 创建 Express app，注册路由及错误处理中间件
  lsp/
    schema.ts              # 请求校验及请求类型
    policy.ts              # 演示政策配置、版本及校验
    engine.ts              # 独立的 LSP 计算函数
    routes.ts              # LSP API 路由
tests/
  fixtures.ts              # 共用的演示请求
  lsp-engine.test.ts        # 政策引擎测试
  lsp-api.test.ts           # HTTP API 及健康检查测试
tsconfig.json              # 源代码编译配置
tsconfig.test.json         # 包含测试代码的类型检查配置
```

`app.ts` 不监听端口，测试可以直接创建 app；`index.ts` 负责实际启动服务。

## 政策配置与版本

默认政策定义在 `src/lsp/policy.ts`。使用 `createLspPolicy` 创建政策后，可以通过 `createApp({ policy })` 注入不同的每段积分及机场范围。工厂会校验并冻结配置，计算逻辑位于独立的 `src/lsp/engine.ts`。

修改规则或支持的机场范围时，应更新政策版本；如果创建不同政策，应使用可区分的 ID，使返回结果能够追溯到对应配置。当前所有政策均限定为 `unverified` / `demonstration_only`，更改配置不会使其成为已经核实的官方规则。
