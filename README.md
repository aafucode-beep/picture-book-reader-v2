# 绘本阅读器 V2 - Vercel + COS 部署版本

将 FastAPI 后端重构为 Vercel Serverless Functions（Python），存储迁移至腾讯云 COS。

## 技术栈

- **前端**: React + TypeScript + Tailwind CSS (Vite) → Vercel 静态托管
- **后端**: Vercel Serverless Functions (Python, 放在 api/ 目录)
- **AI 分析**: MiniMax M2.5 (Anthropic 兼容接口)
- **TTS**: 微软 Edge TTS
- **存储**: 腾讯云 COS

## 项目结构

```
picture-book-reader-v2/
├── api/                      # Vercel Serverless Functions
│   ├── analyze.py           # POST /api/analyze - 接收图片，调用 MiniMax 分析
│   ├── synthesize.py        # POST /api/synthesize - 调用 TTS，上传音频到 COS
│   ├── save.py              # POST /api/save - 保存书籍元数据到 COS
│   └── books/
│       ├── index.py         # GET /api/books - 从 COS 列出书库
│       └── [book_id].py     # GET /api/books/{id} - 获取具体书籍
├── src/                      # React 前端
│   ├── components/
│   │   ├── UploadPage.tsx   # 上传页面
│   │   ├── ProcessingPage.tsx # 处理页面
│   │   ├── PlayerPage.tsx   # 播放器页面
│   │   └── LibraryPage.tsx  # 书架页面
│   ├── App.tsx
│   ├── api.ts
│   ├── types.ts
│   ├── main.tsx
│   └── index.css
├── vercel.json              # Vercel 配置
├── requirements.txt         # Python 依赖
├── package.json             # Node.js 依赖
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Vercel 环境变量配置

在 Vercel Dashboard 中，需要配置以下环境变量：

### MiniMax API 配置

| 变量名 | 值 |
|--------|-----|
| `MINIMAX_API_KEY` | `YOUR_MINIMAX_API_KEY` |
| `MINIMAX_BASE_URL` | `https://api.minimaxi.com/anthropic` |
| `MINIMAX_MODEL` | `MiniMax-M2.5` |

### 腾讯云 COS 配置

| 变量名 | 值 |
|--------|-----|
| `COS_SECRET_ID` | `YOUR_COS_SECRET_ID` |
| `COS_SECRET_KEY` | `YOUR_COS_SECRET_KEY` |
| `COS_REGION` | `ap-guangzhou` |
| `COS_BUCKET` | `picture-book-reader-` (需创建) |

## 本地开发

### 1. 安装 Node.js 依赖

```bash
cd picture-book-reader-v2
npm install
```

### 2. 安装 Python 依赖（可选，用于本地测试）

```bash
pip install -r requirements.txt
```

### 3. 启动开发服务器

```bash
npm run dev
```

前端将在 http://localhost:5173 运行。

## 部署到 Vercel

### 方法 1: Vercel CLI 部署

```bash
npm i -g vercel
vercel login
vercel
```

### 方法 2: Git 集成部署

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 在 Vercel Dashboard 中导入项目
3. 配置环境变量（见上文）
4. 点击 Deploy

## COS 存储结构

```
bucket: picture-book-{uid}/
├── books/
│   └── {book_id}/
│       ├── content.json        # 书籍元数据+页面分析结果
│       ├── original_images/    # 原始上传图片
│       │   ├── page_0.jpg
│       │   └── page_1.jpg
│       └── audio/              # 合成的音频
│           ├── page_0.mp3
│           └── page_1.mp3
```

## API 接口

### POST /api/analyze

分析绘本图片，提取文字和对话。

**请求体**:
```json
{
  "images": ["data:image/jpeg;base64,..."]
}
```

**响应**:
```json
{
  "success": true,
  "pages": [
    {
      "narrator": "旁白文字",
      "dialogues": [
        {
          "character": "角色名",
          "text": "对话内容",
          "emotion": "happy"
        }
      ],
      "scene_description": "场景描述"
    }
  ],
  "page_count": 1
}
```

### POST /api/synthesize

将文字转换为语音并上传到 COS。

**请求体**:
```json
{
  "pages": [...],
  "characters": {},
  "book_id": "book_xxx"
}
```

**响应**:
```json
{
  "success": true,
  "book_id": "book_xxx",
  "audio_urls": [
    {
      "narrator": "https://...",
      "dialogues": [...]
    }
  ]
}
```

### GET /api/books

获取书架列表。

**响应**:
```json
{
  "success": true,
  "books": [
    {
      "id": "book_xxx",
      "title": "绘本标题",
      "cover_image": "https://...",
      "page_count": 10,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### GET /api/books/{book_id}

获取单个书籍详情。

### POST /api/save

保存书籍到 COS。

**请求体**:
```json
{
  "book_id": "book_xxx",
  "title": "绘本标题",
  "pages": [...],
  "audio_urls": [...],
  "cover_image": "https://..."
}
```

## TTS 语音映射

| 角色类型 | 语音 |
|----------|------|
| 旁白 | zh-CN-XiaoxiaoNeural |
| 儿童 | zh-CN-XiaoyiNeural |
| 成年男性 | zh-CN-YunxiNeural |
| 成年女性 | zh-CN-XiaochenNeural |

## 功能特性

- **上传**: 支持拖拽上传和相机拍照
- **分析**: 使用 MiniMax M2.5 视觉模型分析图片，提取文字和对话
- **合成**: 使用 Edge TTS 生成自然语音
- **播放**: 逐页播放，支持旁白和对话切换
- **存储**: 云端存储，支持多设备同步

## 注意事项

1. COS Bucket 需要设置为公共读（或配置 CDN）
2. Vercel Serverless Functions 超时限制为 300 秒（5 分钟）
3. 图片建议使用 JPEG 格式，每页不超过 10MB
4. 确保 COS 区域与配置一致

## 许可证

MIT
