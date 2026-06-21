# 项目规则

## 仓库结构

这是江西财经大学自动评教的**正式版仓库**（`wzj1122/jxufe-auto-evaluate`）。

| 文件 | 用途 | 能否修改/删除 |
| :--- | :--- | :--- |
| `auto-evaluate.user.js` | 油猴脚本主文件 | 可修改（仅版本升级时），不可删除 |
| `README.md` | 项目说明文档 | 可修改（功能变化时同步更新），不可删除 |
| `images/alipay.png` | 支付宝收款码 | 不可修改/删除 |
| `images/wechat_pay.png` | 微信收款码 | 不可修改/删除 |
| `LICENSE` | MIT 许可证 | 不可修改/删除 |
| `.github/workflows/sync-to-gitlab.yml` | GitHub → 极狐 GitLab 同步 | 可修改，不可删除 |
| `.gitlab-ci.yml` | 极狐 GitLab Pages 部署 | 可修改，不可删除 |

## 发布规则

### 正式发布流程（本仓库）

1. 将 beta 版本的代码复制到 `auto-evaluate.user.js`
2. 修改版本号（如 `1.1.0` → `1.2.0`）
3. 确保脚本头部包含 Greasy Fork 的 `@updateURL` 和 `@downloadURL`
4. 更新 `README.md` 的更新日志
5. Commit + Push 到 main
6. 创建 GitHub Release（tag 如 `v1.2.0`）

### Beta 测试流程（beta 仓库）

- Beta 仓库 `wzj1122/jxufe-auto-evaluate-beta` 独立于本仓库
- Beta 版本**不要推送到本仓库**
- Beta 版本脚本头部**不包含** Greasy Fork 的 `@updateURL`/`@downloadURL`

## 推送规则

- **只推送必要的 commit**，不要推送包含 beta 代码的 commit 到 main
- 本仓库 main 分支始终是**正式版**
- Greasy Fork Webhook 从 main 分支同步，推送会自动触发

## 禁止操作

- 不要删除 `auto-evaluate.user.js`
- 不要删除 `images/` 目录或其中的图片
- 不要修改 `LICENSE`
- 不要将 beta 版本代码直接推送到 main
- 不要在脚本头部移除 `@updateURL`/`@downloadURL`（Greasy Fork 同步依赖）
