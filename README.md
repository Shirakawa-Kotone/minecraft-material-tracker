# Minecraft Material Tracker 🏗️

Minecraft 建材清单 - 上传材料清单，自动分解至基础材料，支持收集进度追踪、合成指导与多格式导入。

## ✨ 功能

- **📂 多格式导入** — 支持 JSON、CSV、TXT 格式的材料清单
- **🔍 自动分解** — 将合成品递归分解至基础材料，精确计算总需求量
- **✅ 收集追踪** — 点击卡片标记已收集的材料，进度一目了然
- **🧭 合成指导** — 查看每个材料的完整合成路径与配方
- **🏷️ 分类筛选** — 按材料大类快速筛选，支持搜索
- **📇 多视图** — 卡片视图、列表视图、基础材料视图自由切换
- **💾 持久化存储** — 数据自动保存在浏览器本地

## 🖼️ 截图

![screenshot](https://via.placeholder.com/800x450/1a1a2e/e0a832?text=Minecraft+Material+Tracker)

## 🚀 使用

1. 打开 [GitHub Pages 地址]（待配置）
2. 上传你的材料清单文件，或点击「加载示例」体验
3. 查看材料列表，点击方块标记已收集的材料

### 数据格式

**JSON 格式：**
```json
{
  "items": [
    { "id": "minecraft:stone", "count": 64 },
    { "id": "minecraft:oak_planks", "count": 128 }
  ]
}
```

**CSV 格式：**
```csv
id,count
minecraft:stone,64
minecraft:oak_planks,128
```

**TXT 格式（每行一个）：**
```
minecraft:stone 64
minecraft:oak_planks 128
```

## 🛠️ 技术栈

- 纯前端单页应用（HTML + CSS + JavaScript）
- 无外部依赖，零构建步骤
- 遵循 Minecraft Java Edition 合成配方
- 图标来源：Minecraft Wiki / PrismarineJS

## 📄 许可

MIT
