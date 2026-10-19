# JGC Flight Planner · Backend

[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

日本航空（JAL）のJGC「修行僧」に向けたフライト計画ツールのバックエンドです。旅程で獲得できるLife Status ポイント（LSP）と1ポイントあたりの費用を試算し、路線、区間の組み合わせ、航空券の予算を比較しやすくします。

## プロジェクトの背景

JALグローバルクラブ（JGC）への入会を目指す方や、継続してLSPを積み上げたい方にとって、「修行」の旅程を組む際には、航空券の価格、搭乗区間、ポイント獲得効率をあわせて考える必要があります。

JAL Life Status プログラムでは、対象となる搭乗やライフスタイルサービスの利用に応じてLife Status ポイントがたまります。所定のポイント数に到達し、その他の条件を満たすと、特典やJGCへの入会資格を得られます。制度の概要は[JAL公式のLife Status プログラム紹介](https://www.jal.co.jp/jp/ja/jmb/jmbapp/tips/23/index.html)をご覧ください。

このプロジェクトが答えたいのは、**指定した搭乗区間と航空券の総額から、何LSPを獲得できそうか、1 LSPあたりの費用はいくらになるか**という問いです。バックエンドは入力検証、計算ポリシーの適用、区間別の明細作成を担当し、フロントエンドに共通のAPIを提供します。

現在はプロトタイプの段階で、最初のLSP試算APIを実装しています。**対象の国内線1区間につき5 LSPという値は、未検証のデモデータに限った設定です。JALの公式ルールを実装・検証したものではありません。** 各区間の積算対象ステータスは呼び出し側が手動で指定します。実際の積算可否は確認しません。本プロジェクトはJALの公式サービスではなく、JALとの提携関係もありません。

## 現在の機能

- 円建ての航空券総額と搭乗区間を受け取り、合計LSPと1 LSPあたりの費用（JPY/LSP）を試算します。
- 手動指定の積算対象ステータスとして、`eligible`、`ineligible`、`unknown`の3種類に対応します。
- 区間別の計算明細、ポリシーID、バージョン、検証状態を返します。
- 計算ポリシーを独立した設定可能なエンジンで管理します。
- ヘルスチェック、リクエスト検証、JSON形式のエラー応答を提供します。

現在は航空券の価格と搭乗区間を手動入力して試算します。データベース、ユーザー認証、外部の航空券価格サービスはまだ導入していません。

## 技術スタック

| 技術 | 用途 |
| --- | --- |
| Node.js + npm | バックエンドの実行環境と依存関係の管理 |
| TypeScript | ESM / NodeNext構成による厳密な型チェック |
| Express 5 | HTTPサーバーとルーティング |
| Zod | リクエストとポリシー設定の検証 |
| cors | フロントエンドのクロスオリジン設定 |
| dotenv | `.env`からローカル環境変数を読み込み |
| tsx | 開発時のTypeScript実行とファイル変更の監視 |
| Vitest + Supertest | ポリシーエンジンの単体テストとHTTP APIテスト |

依存パッケージのバージョンは`package.json`と`package-lock.json`を参照してください。

## ローカル環境の構築

### 1. 必要なツール

Node.js（22.xまたは24.xを利用できます）と、付属のnpmをインストールしてください。APIを手動で呼び出す場合はcurlも利用できます。

```sh
node --version
npm --version
```

ローカルでの実行にデータベース、JALアカウント、外部サービスのAPIキーは不要です。

### 2. 依存パッケージのインストール

プロジェクトを取得したら、バックエンドディレクトリの親ディレクトリで次を実行します。

```sh
cd jal-jgc-flight-planner-be
npm ci
```

すでにバックエンドディレクトリ内にいる場合は、`npm ci`のみを実行してください。lockfileに従って依存パッケージをインストールします。

### 3. 環境変数の設定（任意）

バックエンドのルートに`.env`ファイルを作成します。

```dotenv
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
```

| 変数 | デフォルト値 | 説明 |
| --- | --- | --- |
| `PORT` | `4000` | バックエンドの待ち受けポート |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORSで許可するフロントエンドのオリジン。プロトコルとポートを含みます |

`.env`を作成しなくても、上記のデフォルト値で起動できます。`.env`は`.gitignore`に登録されています。

### 4. 開発サーバーの起動

```sh
npm run dev
```

デフォルトのサーバーアドレスは`http://localhost:4000`です。開発モードではソースファイルの変更を監視し、自動で再起動します。

別のターミナルで動作を確認します。

```sh
curl http://localhost:4000/api/health
```

期待するレスポンス：

```json
{ "status": "ok", "service": "JGC Flight Planner API" }
```

### 5. ビルドとコンパイル済みサーバーの起動

```sh
npm run build
npm start
```

ビルド結果は`dist/`に出力されます。ポートの競合を避けるため、開発サーバーを停止してから`npm start`を実行するか、異なる`PORT`を設定してください。

## よく使うコマンド

| コマンド | 用途 |
| --- | --- |
| `npm ci` | lockfileに従って依存パッケージをインストール |
| `npm run dev` | 開発サーバーを起動し、ファイル変更を監視 |
| `npm run typecheck` | ソースコードとテストコードの型チェック |
| `npm run build` | ソースコードを`dist/`へコンパイル |
| `npm start` | コンパイル済みサーバーを起動 |
| `npm test` | Vitestの全テストを実行 |

変更を提出する前に、次のコマンドを実行できます。

```sh
npm run typecheck
npm run build
npm test
```

HTTPテストはSupertest経由でローカルの一時ポートを使用します。事前に開発サーバーを起動する必要はありません。

## APIの使い方

### ヘルスチェック

`GET /api/health`

サービスの状態を返します。レスポンス例は上記の起動手順を参照してください。

### LSPの試算

`POST /api/v1/lsp/estimates`

`Content-Type: application/json`を指定して送信します。以下は羽田 → 那覇 → 羽田、航空券総額35,000円、2区間を手動で積算対象に指定した例です。

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

期待するレスポンスはHTTP 200で、**デモLSPは10、単価は3,500円/LSP**です。

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

#### リクエストの項目

| 項目 | 条件 |
| --- | --- |
| `totalAirfareJpy` | 円建ての航空券総額。0以上、`Number.MAX_SAFE_INTEGER`以下の整数 |
| `segments` | 1〜100区間。各区間には以下の5項目が必要 |
| `segments[].origin` | `HND`など、大文字3文字のIATA空港コード |
| `segments[].destination` | 大文字3文字のIATA空港コード。出発地とは異なること |
| `segments[].departureDate` | `YYYY-MM-DD`形式の有効な日付 |
| `segments[].marketingCarrier` | `JL`など、大文字英数字2文字の販売航空会社のIATAコード |
| `segments[].eligibility` | `eligible`、`ineligible`、`unknown`のいずれか。呼び出し側が手動で指定 |

リクエストボディの上限は100kbで、定義外の項目は拒否されます。空港コードと航空会社コードは形式のみを検証し、実在するコードのデータベースには照会しません。日付と航空会社は明細に保持しますが、現在のデモポリシーには日付別・航空会社別の計算ルールはありません。

#### 計算の動作

| 区間の状態 | 区間のLSP | 明細の理由 |
| --- | --- | --- |
| `eligible`で、両空港がポリシーの対象範囲内 | デフォルトで5 | `eligible_domestic_demo` |
| `ineligible` | 0 | `ineligible` |
| `unknown` | `null` | `eligibility_unknown` |
| `eligible`だが、いずれかの空港がポリシーの対象範囲外 | `null` | `route_outside_policy_scope` |

いずれかの区間の試算値が`null`の場合、**`estimatedTotalLsp`と`jpyPerLsp`は両方とも`null`**になります。計算できた区間の結果は明細に残ります。デフォルトの空港リストはデモの対象範囲のみを示し、範囲外の空港を国際線や0ポイントと自動判定することはありません。

全区間が`ineligible`の場合、合計LSPは0、単価は`null`です。航空券総額が0の入力も受け付けます。合計LSPが正の場合、単価は航空券総額を合計LSPで割った値とし、表示用の丸めは行いません。`segmentIndex`は0から始まり、リクエスト内の区間順に対応します。

#### エラーレスポンス

エラーは`error.code`と`error.message`を含むJSONで返します。

| HTTPステータス | エラーコード | 内容 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | リクエストの項目が不正。`error.issues`に項目のパスと理由を含む |
| 400 | `INVALID_JSON` | リクエストボディが有効なJSONではない |
| 413 | `PAYLOAD_TOO_LARGE` | リクエストボディが100kbを超えている |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `application/json`の指定が必要 |
| 500 | `INTERNAL_ERROR` | 想定外のサーバーエラー。内部の詳細はクライアントに返さない |

手動で確認する場合は、いずれかの区間を`unknown`にする、両区間を`ineligible`にする、航空券総額を負の値にすることで、それぞれ未確定の試算、0ポイント、入力検証エラーを確認できます。

## ディレクトリ構成

```text
src/
  index.ts                 # 環境変数の読み込みとサーバー起動
  app.ts                   # Expressアプリ、ルート、エラーミドルウェアの設定
  lsp/
    schema.ts              # リクエストの検証と型定義
    policy.ts              # デモポリシーの設定、バージョン管理、検証
    engine.ts              # 独立したLSP計算関数
    routes.ts              # LSP APIのルート
tests/
  fixtures.ts              # 共通のデモリクエスト
  lsp-engine.test.ts        # ポリシーエンジンのテスト
  lsp-api.test.ts           # HTTP APIとヘルスチェックのテスト
tsconfig.json              # ソースコードのコンパイル設定
tsconfig.test.json         # テストを含む型チェック設定
```

`app.ts`はポートを開かないため、テストから直接アプリを作成できます。実際のサーバー起動は`index.ts`が担当します。

## ポリシー設定とバージョン管理

デフォルトのポリシーは`src/lsp/policy.ts`に定義しています。`createLspPolicy`でポリシーを作成し、`createApp({ policy })`で注入することで、区間あたりのポイント数や対象空港を設定できます。ファクトリーは設定を検証して凍結します。計算ロジックは独立した`src/lsp/engine.ts`にあります。

ルールや対象空港を変更する場合は、ポリシーのバージョンを更新してください。別のポリシーを作成する場合は区別できるIDを使い、試算結果から適用した設定を追跡できるようにします。現在のポリシーはすべて`unverified` / `demonstration_only`に限定され、設定を変更しても検証済みの公式ルールにはなりません。
