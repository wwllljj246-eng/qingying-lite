# 轻盈 Lite — 单服务部署镜像（前端静态 + 后端 API 同源）
# 构建阶段已在本地完成（npx expo export --platform web -> dist-web-showcase）
FROM node:20-alpine

WORKDIR /app

# 后端（零依赖 Node）
COPY server/ ./server/

# 前端生产构建产物
COPY dist-web-showcase/ ./dist-web-showcase/

WORKDIR /app/server
ENV WEB_DIR=/app/dist-web-showcase
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000
CMD ["node", "index.mjs"]
