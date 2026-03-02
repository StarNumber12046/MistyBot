FROM node:22-bookworm
WORKDIR /app
RUN apt-get update --allow-releaseinfo-change && apt-get install -y ffmpeg
RUN mkdir src assets dist
COPY src src
COPY assets assets
COPY tsconfig.json .
COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
COPY eslint.config.mjs .
RUN npm install -g pnpm
RUN pnpm install
RUN ls
RUN pnpm tsc
#ENTRYPOINT ["/bin/bash"]
ENTRYPOINT ["node", "dist/src/main.js"]
