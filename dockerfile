# Build-related manifests, copied to a layer for performance/caching reasons.
#FROM alpine:3.11 as manifests
#RUN apk add coreutils
#WORKDIR /tmp
#COPY ./ ./src
#RUN mkdir manifests && \
#    cd src && \
    # Note: need to exclude `.vscode` directory because the `package.json` file
    # it contains is not a dependency manifest:
#    find . -name 'package.json' \! -path '*\.vscode*' | xargs cp --parents -t ../manifests/ 
    #&& \
    #cp yarn.lock ../manifests/ 
    #&& \
    #cp -r patches ../manifests/


#
# Base images for Node things
#
#FROM node:lts-alpine3.9 as node-base
FROM node:16-alpine3.11 as node-base
RUN mkdir -p /app
#COPY --from=manifests /tmp/manifests/ /app/
COPY ./package.json ./app
COPY ./yarn.lock ./app/yarn.lock
WORKDIR /app
RUN apk add --no-cache --virtual .gyp \
        python \
        make \
        g++
RUN yarn install --frozen-lockfile


#
# Base image for Node images
#
FROM node-base as worker-base
COPY ./dist/common /app/common
COPY ./dist/common-backend /app/common-backend


#
# Backend worker
#
FROM node-base as worker
COPY --from=worker-base /app/ /app/
COPY ./dist/worker /app/worker
CMD ["node", "/app/worker/worker.js"]


#
# Backend API server
#
FROM node-base as api
COPY --from=worker-base /app/ /app/
COPY ./dist/api /app/api
CMD ["node", "/app/api/api.js"]


#
# Frontend server
#
FROM nginx:latest as web
COPY ./src/roles/web/index.html /www/app/index.html
COPY ./src/roles/web/nginx.conf /etc/nginx/nginx.conf


#
# Base images for Python things
#
FROM python:3.8-slim as python-base

RUN apt-get update -y && \
    apt-get install -y python3-pip python3-dev

RUN apt-get install -y \
    nano \
    build-essential procps curl file git \
    python3-dev


#
# Python PoC
#
FROM python-base as tradebot-poc

# Install TA-lib so the Python wrapper package for it runs.
# See https://github.com/mrjbq7/ta-lib for more info
RUN curl -L http://downloads.sourceforge.net/project/ta-lib/ta-lib/0.4.0/ta-lib-0.4.0-src.tar.gz -o ta-lib-0.4.0-src.tar.gz

# TODO: Verify checksum
# like this: RUN shasum ta-lib-0.4.0-src.tar.gz ... but stop the build if the sums don't match

RUN tar -xzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib/ && \
    ./configure --prefix=/usr && \
    make && \
    make install

# Install stonkminer
COPY ./src/roles/tradebot-poc/requirements.txt /app/requirements.txt
WORKDIR /app
RUN pip3 install -r requirements.txt

COPY ./src/roles/tradebot-poc /app
RUN mkdir -p /app/output/bots && \
    mkdir -p /data/symbols

COPY ./src/roles/tradebot-poc/data/currencies.yml /app/data/

CMD [ "python3", "-u", "/app/sm.py" ]
