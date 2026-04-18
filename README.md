# MedAnalyzer — 医疗数据自动分析仪表盘

基于课程 **Week03 Python과 Colab 기초** 改写的纯前端 Web 版本，无需服务器，直接在浏览器中运行。

## 功能

- 拖入 / 点击上传多个 CSV 文件，一键完成分析
- 数据总览：文件数、总行数、总列数、缺失率
- 每个文件独立 Tab，包含：
  - 数值列统计摘要（均值、中位数、标准差、最大最小值、缺失数）
  - 分布直方图（最多 8 列）
  - 类别列横向柱状图（最多 4 列）
  - 相关系数矩阵热图（最多 10×10）
- 支持的数据类型：基础体测、日常活动、运动、用药、满意度、治疗记录、生命体征、睡眠质量、疼痛评估

## 文件结构

```
medical-analyzer/
├── index.html   # 主页面
├── style.css    # 样式
├── app.js       # 分析逻辑
└── README.md
```

## 部署到 GitHub Pages

### 方法一：直接上传

1. 在 GitHub 新建仓库（如 `medical-analyzer`）
2. 把 `index.html` / `style.css` / `app.js` 上传到仓库根目录
3. 进入仓库 **Settings → Pages**
4. Source 选择 `main` 分支 / `root` 目录，点击 Save
5. 几秒后访问 `https://<你的用户名>.github.io/medical-analyzer/`

### 方法二：Git 命令行

```bash
git init
git add .
git commit -m "init: medical data analyzer"
git branch -M main
git remote add origin https://github.com/<你的用户名>/medical-analyzer.git
git push -u origin main
```

然后在 GitHub 仓库 Settings → Pages 中启用即可。

## 技术栈

- 纯 HTML / CSS / JavaScript（无框架）
- [PapaParse](https://www.papaparse.com/) — CSV 解析
- [Chart.js](https://www.chartjs.org/) — 图表绘制
- [Google Fonts](https://fonts.google.com/) — DM Mono + Noto Sans SC

## 原始课程

```
3주차: Python과 Colab 기초
Digital Health — input_path 전체 자동 분석
```
