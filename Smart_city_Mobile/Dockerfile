FROM node:22

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libnspr4 \
  && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm install

EXPOSE 8081

CMD ["npm", "start", "--", "--host", "0.0.0.0"]
