FROM node:22-alpine

ARG BUILD_REF=main
WORKDIR /app

RUN apk add --no-cache curl tar \
  && curl -fsSL "https://github.com/gnacho/soliscloud-scraper/archive/refs/heads/${BUILD_REF}.tar.gz" \
     | tar xz --strip-components=1 \
  && npm install --omit=dev

COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 5561
CMD ["/run.sh"]
