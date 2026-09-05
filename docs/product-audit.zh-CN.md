# 产品与重复性审计

核对日期为 2026-09-06。这是证据边界，不是发布宣传。

## 结论

- **底层痛点真实存在。** 有 DSH 用户报告 Agent 跳过用户要求的分析/确认，直接开始实施；多个独立插件作者也分别描述了反复纠正、遗忘约束和输入不完整的情况。
- **狭义产品位置成立，但效果未证明。** DSH 原生已有交互底座；现有方案主要是提示词改写、明示约束保留、项目初始化、执行中漂移或大型工作流。Ask First 的窄边界是开工前自适应访谈、整理 brief，并通过原生弹窗确认，不改写用户原话。
- **机制已跑通，行为增益尚未证明。** 测试已覆盖提示注入、原生问题路由、最终工具内容、取消、包安装与 Web 启动；这些不能证明指定模型会问得更好或减少返工，仍需按 [评测说明](evaluation.zh-CN.md) 做预注册 A/B。
- **这是软策略。** 模型可能不遵守 system prompt 段。Ask First 不拦截写入、不持久化执行合同，也不取代审批与沙箱策略，不应宣传为硬执行门禁。

## 直接痛点证据

| 证据 | 能证明什么 | 不能证明什么 |
| --- | --- | --- |
| [DSH Discussion #1311](https://github.com/deepseek-ai/deepseek-harness/discussions/1311) | 用户报告 Agent 忽略“先分析或出方案”的要求并直接实施，同一报告还描述了几十次无效搜索。 | 单个报告不能估算普遍程度，也不能证明访谈是最优解。 |
| [Taskify Discussion #2891](https://github.com/deepseek-ai/deepseek-harness/discussions/2891) | 作者报告长 DSH 任务中的范围扩张和约束遗忘，后续将插件收窄为持久 focus/anchor。 | 这是作者自述，不是独立对照评测。 |
| [Tacit Discussion #5061](https://github.com/deepseek-ai/deepseek-harness/discussions/5061) | 另一项目把 Agent 走错后用户的纠正视为反复信号，并明确征集测试者验证学到的指令。 | 它解决犯错后的跨轮学习，不是开工前发现。 |
| 下表的多个生态项目 | 多个独立项目正在投入需求澄清、规格化或对齐。 | 项目供给不等于用户采用、留存或效果。 |

因此，诚实的需求结论是：**痛点真实，特定方案的需求证据中等，Ask First 还没有可量化结果**。

## 原生与生态重叠

| 能力 | 主要边界 | 与 Ask First 的区别 |
| --- | --- | --- |
| 原生 `ask_user_question` 与 `ctx.userQuestions` | 问题传输、答案结构和 UI 呈现。 | 不决定何时应发现、下一个高价值未知项是什么、何时已经足够清楚。 |
| 原生 Plan Mode | 审批实施方案。 | Ask First 覆盖方案之前的意图发现，并把 Plan Mode 最终审批交还 `exit_plan_mode`。 |
| [dsh-prompt-enhancer](https://github.com/yaoshuo530/dsh-prompt-enhancer) | 用户主动点击输入框按钮，改写草稿并可弹出自建澄清卡。 | Ask First 按策略自动生效，不改写原话，使用原生问题弹窗。 |
| [dsh-plan-lattice](https://github.com/1052326311/dsh-plan-lattice) | 持久长任务合同、工作图、澄清与执行门禁。 | Ask First 无状态、轻量，不提供长任务硬执行约束。 |
| [dsh-requirements-alignment](https://github.com/jiezeng2004-design/dsh-requirements-alignment) | 持久 baseline，在执行中处理实质漂移决策。 | Ask First 的所有者边界是实质工作之前的初始发现/brief。 |
| [Taskify](https://github.com/GearVoid/dsh-taskify) | 由用户触发，提取并持久化用户已写在 prompt 中的明示约束。 | Ask First 追问缺失的用户决策，不提供持久 anchor。 |
| [DSH Project Initialization](https://github.com/Lorvaste/DSH-Project-Initialization) | 将项目点子转为需求、技术方案与维护 baseline 的项目启动 preset。 | Ask First 面向任意领域和普通任务，不强制项目启动流水线。 |
| [Ouroboros DSH integration](https://github.com/Q00/ouroboros/tree/main/integrations/dsh-plugin) | 通过 MCP 暴露更大的访谈、执行、评估和演化工作流。 | Ask First 只有两个 DSH 原生表面，无外部服务。 |

最接近的重叠是提示增强和项目初始化工具里的前期澄清。可辩护的收录定位不是“唯一的需求插件”，而是 **使用原生弹窗的自适应开工前发现与 brief 确认**。

## 失败与信任边界

- 原生问题没有内置超时，会等到用户回答或当前轮次被取消。
- 只有根 Agent 能询问人类，子 Agent 必须把未决事项返回根 Agent。
- 没有兼容的 answerer 时，确认弹窗无法完成；目前已验证目标是 Web profile。
- brief 会进入会话/工具历史，但并非插件拥有的持久合同。
- 确认只授权 brief 中的工作。发布、购买、删除、对外发消息、凭据和其他独立受控操作仍需单独授权。
- 在指定模型/版本与基线对比前，模型行为、延迟、打扰率和返工降低都是开放问题。

## 发布标准

Release 描述和目录收录可声明上述已验证机制与范围。在有可归属证据前，不得声称需求误解更少、交付更快、成功率更高、广泛模型兼容或获得维护者背书。
