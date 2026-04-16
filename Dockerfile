FROM node:22-bookworm

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY python-requirements.txt ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
  && python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/venv/bin/pip install --no-cache-dir -r python-requirements.txt \
  && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV BACKEND_PORT=4000
ENV PATH="/opt/venv/bin:${PATH}"
ENV PYTHON_EXECUTABLE=python3

EXPOSE 4000

CMD ["node", "backend/server.js"]
