# dsh-ask-first

**别让 Agent 自信满满地做错东西。**

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-0.1.2--rc.1-4D6BFE)](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-rc.1)
[![CI](https://github.com/1052326311/dsh-ask-first/actions/workflows/ci.yml/badge.svg)](https://github.com/1052326311/dsh-ask-first/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[简体中文](README.zh-CN.md) | [English](README.md)

Ask First 为 DeepSeek Harness 提供自适应的需求发现循环：能自己查到的先查，只就证据无法替用用户决定的事情进行访谈，真正开工前再给出一份简短的需求摘要让用户确认。

它直接复用 DSH 原生的提问弹窗，没有第二套对话 UI，不连外部服务，不建数据库，不收集使用数据。

## 它改变了什么

没有 Ask First：

> “帮我做个后台管理系统。”
>
> Agent 在写代码时顺手猜了使用者、信息层级、权限和验收标准。

装上 Ask First：

1. Agent 先读仓库、看现有产品和可用工具。
2. 它只问少量会真正改变方案的问题。
3. 后一轮根据前一轮的答案继续，不跑固定问卷。
4. 它整理一份短 brief：目标、用户、范围、约束、验收标准和明示假设。
5. 用户在 DSH 原生弹窗中选择“确认并开始”、“修改需求摘要”或“继续问我”。

明确、低风险的小任务仍然直接执行。改一个指定错别字，不该被拉去开产品会。

## 为什么还需要这个插件

DSH `0.1.2-rc.1` 已经有了很好的底层能力：

- `ask_user_question` 支持原生单选、多选、自由输入和批量提问。
- `ctx.userQuestions` 提供与 UI 无关的人机交互能力。
- Plan Mode 会通过 `exit_plan_mode` 请用户审批方案。

但它们不负责判断：什么时候真的需要问，下一个价值最高的问题是什么，答案能否通过环境检查自行获得，以及什么时候已经足够清楚可以开工。Ask First 补上的就是这层产品发现逻辑，外加一个专门的 `ask_first_confirm` 需求确认工具。

详细的原生能力边界和证据见 [DSH 原生能力核对](docs/native-capabilities.zh-CN.md)。

用户痛点证据、与现有插件的重叠以及本版本明确不做的效果声明，见 [产品与重复性审计](docs/product-audit.zh-CN.md)。

## 安装

从 npm 安装：

```sh
dsh plugin --profile default add dsh-ask-first@0.1.1
dsh --profile default --dump-config
```

从本地 checkout 安装：

```sh
dsh plugin --profile default add ./dsh-ask-first
dsh --profile default --dump-config
```

或者锁定已审查的 Git commit：

```sh
dsh plugin --profile default add github:1052326311/dsh-ask-first#<commit>
```

包内直接携带可运行 JavaScript，从 Git 安装时不依赖构建脚本。

## 使用

安装后正常说话即可：

```text
帮我做一个给销售团队用的轻量 CRM。
```

Ask First 默认以 `adaptive` 模式自动判断。也可以明确要求：

```text
先采访我再设计，不要自己猜流程。
```

```text
这是一个可随时回退的小改动，不用访谈，直接做。
```

当 DSH Plan Mode 已开启时，Ask First 仍用原生弹窗做前期澄清，但把最终实施方案审批交给 `exit_plan_mode`，避免同一份方案确认两次。

## 配置

DSH 后续 patch 层会整体替换某一行的 `config`，因此覆盖插件配置时请重写全部字段：

```yaml
- id: 1052326311-ask-first
  name: dsh-ask-first
  config:
    mode: thorough
    maxQuestionsPerRound: 1
    confirmBrief: true
    briefMaxChars: 12000
```

| 配置 | 默认值 | 含义 |
| --- | --- | --- |
| `mode` | `adaptive` | `adaptive` 只在关键模糊时问；`thorough` 对所有实质性任务先访谈；`on-demand` 只在用户明确要求时启动。 |
| `maxQuestionsPerRound` | `3` | 每个原生弹窗最多几个问题，可选 1–3。 |
| `confirmBrief` | `true` | 实质性执行前展示最终 brief 并等待确认；设为 `false` 时也会移除确认工具 schema。 |
| `briefMaxChars` | `12000` | 需求确认工具接受的最大字符数，可选 1,000–30,000。 |

## 产品原则

- **先查再问。** 仓库状态、现有产品行为和权威文档是 Agent 应该自己获取的证据，不是用户作业。
- **问决定，不问琐事。** 用户负责目标、优先级、品味、风险和权限；Agent 负责常规实现选择。
- **深度自适应。** 一个关键答案就可能结束访谈，重要产品也可以进行多轮。
- **问题逐步收敛。** 后一轮必须利用前一轮的答案。
- **假设不隐形。** 用户要求 Agent 自行决定时，未知项应被明确写进 brief。
- **确认范围有限。** 批准 brief 不等于批准发布、购买、删除、对外发消息或其他独立受控操作。

## 兼容性与限制

- 已按 DSH `0.1.2-rc.1` 实际发布的包接口进行验证；peer 范围也支持 `0.1.2-alpha.5` 及之后的 `0.1.2` 预发布版。
- 需要当前 DSH 界面提供活跃的 `UserQuestionProvider`；Web 应用已提供。
- standard、Cordis 和 PTC preset 包含 `ask_user_question`，minimal preset 不包含。使用 minimal preset 时，发现阶段会退化为每轮在对话中只问一个简短问题；只要当前界面有 answerer，最终 brief 确认仍直接使用 `ctx.userQuestions`。
- 由根 Agent 管理的子 Agent 不能直接问人，必须把未决问题返回根 Agent。
- 用户回答或取消当前轮次前，原生问题会阻塞当前工具调用。
- 自适应访谈是模型遵循的指导，不是强制禁止写操作的硬门禁。只有在工具风险分类足够可靠后，才应增加可选强制模式。

## 开发

```sh
npm install
npm test
npm pack --dry-run
```

测试会对运行时模块强制 100% 覆盖率。产品行为场景见 [评测说明](docs/evaluation.zh-CN.md)；在尚未对明确模型和 DSH 版本实测前，本项目不声称任何效果数字。

发布定位、30 秒演示脚本、社区收录文案和指标见 [发布打法](docs/launch.zh-CN.md)。

## 许可证

[MIT](LICENSE)
