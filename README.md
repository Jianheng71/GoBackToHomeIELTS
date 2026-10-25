# GoBackToHomeIELTS

中文雅思备考工具，只练**句子级**学术写作：每次 1–2 句英文，大约 50 词。

流程是：AI 动态出题 → 你写英文 → 按 Task 2 的 TR / CC / LR / GRA 看这一两句，并在原句上标出可升级处、语法和拼写 → 只给一句基于原句的进阶改写 → 必须重写 → 生成 1–3 张词伙 / 句型卡 → 按简化 SM-2 间隔复习。

这不是整篇作文批改，也不是翻译器。项目里**没有**分享卡、二维码或打卡图片导出。

## Demo / 演示

Online demo: [https://gobacktohome-ielts.vercel.app](https://gobacktohome-ielts.vercel.app)

在线演示：[https://gobacktohome-ielts.vercel.app](https://gobacktohome-ielts.vercel.app)

## 运行

```bash
npm install
npm run dev
```

开发服务器在 <http://localhost:43123>。`package.json` 里的 `dev` 脚本固定使用端口 `43123`。

```bash
npm test
npm run build
npm start
```

`npm test` 跑 schema、mock 出题、去重和 SM-2 的基础测试。`npm start` 要先完成 `npm run build`。

## 环境变量

复制 `.env.example` 为 `.env.local`：

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | OpenAI 或兼容网关的 API Key。留空则走程序化 mock |
| `OPENAI_BASE_URL` | 可选。兼容端点的 Base URL |
| `OPENAI_MODEL` | 可选。默认 `gpt-4o-mini` |

密钥只在服务端 API 路由里使用，不会写进浏览器。没有 Key 时，`/api/generate-question` 和 `/api/review` 返回 `is_mock: true`。题目由话题池和功能模板当场组合，仓库里没有固定种子题库文件。

## 无 Key 时怎么用

1. 打开 `/practice`。话题域、句子功能和难度可以指定，也可以「全部随机」。
2. 写 1–2 句英文。底部会显示词数和建议词数。
3. 提交评阅。先看 TR、CC、LR、GRA 四张卡（判定、加减分点、可改建议），再看标亮的原句，最后只有一句「基于你的原句 · 进阶」。没有第二稿，也不是雅思分数。
4. 重写之后才会生成词伙卡，并写入本机 `localStorage`。
5. `/review` 复习到期卡片。题型有挖空、再写一句、判断是否适合 Task 2。
6. `/progress` 看完成句数、重写完成率、复习完成率。这里不显示雅思分数。
7. `/settings` 可以改出题范围、关闭动态效果、查看 API 说明和声明，或清除本机数据。练习页不放密钥说明，也不放长段免责声明。

出题会对照最近 50 题。句子功能相同，且话题标签重合或意思过于接近时，会再试一次。仍然重复就提示「换一题」。

## 部署

不需要数据库或登录。卡片、进度和设置都在浏览器 `localStorage`。

在 Node 主机上：

```bash
npm install
npm run build
npm start
```

在 Vercel 上导入仓库即可。把 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL` 配到项目环境变量。不配 Key 时，线上同样是演示题。

## AI Prompt

出题和评阅都在服务端，用 `createOpenAI({ apiKey, baseURL })` 和 `generateObject`。模型输出用 Zod 校验。失败会重试一次，再失败就回退到程序化 mock。

出题约束：

- 只出句子题，用户写 1–2 句、大约 50 词，不是整篇作文，也不是翻译题。
- `meaning_zh` 是一个需要论证的观点，不是让用户逐字翻译的中文句子。
- `suggested_words` 靠向 50。`style` 固定 `academic`。
- 不重复最近题目的功能和意思。不涉及明星、歌词或媒体原句。

评阅约束：

- `scores` 只有 `tr`、`cc`、`lr`、`gra`。每项有 `signal`（plus / mixed / minus）、`judgment`、`points`、`suggestion`。四项同等看待这一两句。不给雅思 0–9 档，也不给总分。
- TR 看是否回应题目、立场是否清楚、句内有没有理由或因果。CC 看衔接是否自然，并扣机械套话。LR 看用词、搭配、词级和拼写。GRA 看句式是否用对。
- `upgrade` 只有一句进阶版，必须改写用户原句：保留原意和主要结构，只做最小润色。没有稳妥版，也没有第二稿。
- `spans` 标在原句上，`kind` 为 `upgrade`、`grammar` 或 `spelling`。模型交 `quote`，服务器按原文算出 `start` / `end`。
- 词伙卡 1–3 张，`exam_safe` 为 true，`style` 为 `academic`。
- 不编造数据，不生成歌词、语录或媒体原句。

## 界面

背景是自写的「紫光书房」：CSS 径向渐变加上 Canvas 2D 的慢速光斑。练习页漂移最慢。系统「减少动态效果」、设置里的开关，或 CPU 核心数不超过 4 时，背景停在一帧。前景卡片保持高对比，写作区不跟背景一起动。

## 截图占位

![练习页占位](docs/screenshots/practice.svg)

![复习页占位](docs/screenshots/review.svg)

动图占位：把练习录屏保存为 `docs/screenshots/practice.gif` 后，替换上面的练习页图片链接。

## 主要路径

- `app/practice` — 练习闭环
- `app/review` — SM-2 复习
- `app/progress` — 进度
- `app/settings` — 出题范围、动态效果、API 说明、声明、清除数据
- `app/api/generate-question` — 出题
- `app/api/review` — 评阅
- `components/PurpleBackground.tsx` — 紫光背景
- `lib/schema.ts` — Zod 模型
- `lib/dedupe.ts` — 最近 50 题去重
- `lib/srs.ts` — supermemo SM-2

## 合规

非官方学习工具，与任何明星、工作室、媒体机构无关联；不使用其肖像、语录、歌词或原句。

本项目与《解解》无关：不使用该项目的姓名、肖像、语录、歌词、色板语义或素材。题目和反馈只用抽象的学术话题，由模型或程序当场生成。

许可见 [LICENSE](LICENSE)（MIT）。
