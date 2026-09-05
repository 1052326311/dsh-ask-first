# DSH 原生能力核对

核对日期为 2026-09-06，同时覆盖 npm 上最新可安装版 `dsh-v0.1.2-rc.1`（`a66e4702047846cdaa10c66c9d3df3951f5ea70d`）和上游最新源码 tag `dsh-v0.1.3-alpha.1`（`d347e703908d0406b7a7ef80e3a0e594d86b2215`）。本文严格区分 DSH 原生行为与 Ask First 新增行为。

逐文件比较了 `UserQuestionService`、问题类型、`ask_user_question`、Web 问题卡和方案审核卡、system prompt 组装与 Plan Mode 七个所有者文件，两个版本之间没有需求发现或确认行为变化。唯一差异是 `/plan off` 从只拒绝图片扩展为拒绝任意附件。RC.1 仍是安装兼容目标；对 alpha 源码的核对用于避免把已有的新上游能力误判成缺口。

## 原生能力

| 界面 | DSH 原生行为 | Ask First 的选择 |
| --- | --- | --- |
| `ctx.userQuestions` | 与 UI 无关的 `ask()` 服务，可一次提交多个带 id 的问题，并通过 Agent 作用域内的 answerer waterfall 等待结构化答案。 | 直接调用服务，不依赖某一个 UI。 |
| 问题项 | 支持 `header`、`detail`、带描述的选项、单选和多选。 | 最终需求 brief 可作为辅助详情放在同一个原生弹窗中。 |
| 答案项 | 返回所选标签和可选的自由文本答案。 | 确认、修改、自由文本反馈仍保持结构化。 |
| `ask_user_question` | 模型可见的 Consumer 暴露 id、问题、标题、选项和 `multi_select`。 | 用它做逐轮发现。它目前不暴露 `detail` 和展示 intent。 |
| Web answerer | Web bundle 会加载 `@deepseek-ai/dsh-client-ui-user-questions`。它会接管输入框，逐题展示进度导航、推荐标记、选项、自由输入、跳过与取消；`detail` 使用通用 GFM Markdown 渲染，长内容在限高卡片内滚动。 | Web 用户直接获得内置问题界面，插件无需写 UI。 |
| Plan Mode | `exit_plan_mode` 通过 `plan-review` intent 提交 Markdown 方案，只在用户批准后退出。 | Plan Mode 中由它负责最终方案审批，不再额外弹一次 Ask First 确认。 |
| System prompt | 插件可通过 `ctx.systemPrompt.section()` 注册有序规则段。 | 无需改 agent loop 或部署 persona，就能注入自适应访谈策略。 |

## 原生限制

- 一个待回答问题会一直等到用户回答或所属轮次被取消，没有独立的超时策略。
- 归属于根 Agent 的子 Agent 会收到 `DELEGATED_CALLER`，必须把未决问题返回根 Agent。
- `ask_user_question` 向模型返回的是紧凑 JSON 文本，虽然服务层的值本身是结构化的。
- answerer 通过按作用域筛选的 `user-questions/request` waterfall 组合；某个 answerer 返回答案即接管请求，调用 `next()` 则交给下一个，无人接受时返回 `NO_PROVIDER`。
- standard、Cordis 和 PTC preset 暴露 `ask_user_question`，minimal preset 不暴露。
- 当前唯一声明的专用 intent 是 `plan-review`，它的语义要求详情是实施方案 Markdown。因此 Ask First 用带 `detail` 的通用问题审核需求 brief，不把 brief 错报成实施方案。
- Plan Mode 是软指导；sandbox 和 approval policy 仍然独立。

## Web 提问弹窗的实际行为

- 请求待回答时，对话输入框会变成问题界面。
- 一批问题每次展示一题，可上一题/下一题导航。
- 一组问题中，单选后会自动进到下一题；多选会保留多个标签。
- 单选题的自由答案会替代已选项，多选题的自由答案可与选中标签并存。
- 中英文“推荐”后缀都会渲染为本地化 badge，但结果返回的仍是原始完整标签。
- 用户可跳过单题、取消整组、收起卡片，并在每题已回答或跳过后提交。
- 只要当前页面中的 Session 作用域仍然存在，切换 Session 后未提交草稿会恢复；整页刷新或 Session 被清理后不保留。
- 同一时间只有一个待回答请求占用输入框，后续请求会留在 Session snapshot 中等待。
- 符合条件的单题 `plan-review` intent 会切换为专用的“去聊天里说 / 拒绝 / 确认执行”卡片。Ask First 的需求 brief 有意保持为通用问题卡。

## Ask First 填补的空缺

DSH 原生提供了交互机制，没有规定产品发现方法。Ask First 新增：

1. 实质性模糊判定，让明确可回退的工作仍然保持快速。
2. 提问前先进行只读证据搜集。
3. 逐步收敛的高价值问题，而非固定收集表。
4. 根据“下一个答案是否还会改变结果”判断访谈是否完成。
5. 简短需求 brief，以及原生的确认/修改/继续访谈决定。
6. 对 Plan Mode 和子 Agent 提问限制的明确协同。

## 一手资料

- [DSH `0.1.2-rc.1` release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-rc.1)
- [DSH `0.1.3-alpha.1` 源码 tag](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.3-alpha.1)
- [`dsh-user-questions` 类型](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/interaction/user-questions/src/types.ts)
- [`UserQuestionService`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/interaction/user-questions/src/index.ts)
- [`ask_user_question` Consumer](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/interaction/tool-ask-user/src/index.ts)
- [Plan Mode](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/plan/plan-mode/README.md)
- [Base bundle 组合](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/bundle/base/cordis.patch.yml)
- [Web bundle 问题 provider](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/bundle/web-app/cordis.patch.yml)
- [Web 问题 UI 行为](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/client/ui-user-questions/README.zh.md)
