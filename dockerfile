#
# Base images for Node things
#
# Node slim is used here over Alpine due to TALib.
# Moving the base image back to Alpine would be nice, but is low priority at time of writing.
FROM node:14.5-slim as node-base
#RUN apk add --update make g++

# Python is used to build certain NPM dependencies, such as talib.
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y python make build-essential apt-transport-https

RUN mkdir -p /app
COPY ./package.json ./app/
COPY ./yarn.lock ./app/yarn.lock
WORKDIR /app
RUN yarn install --frozen-lockfile
#COPY --from=app-env /code/node_modules/talib /app/node_modules/talib


#
# Base image for Node images
#
FROM node-base as worker-base
COPY ./dist/common /app/common
COPY ./dist/common-backend /app/common-backend


#
# Tests
#
FROM worker-base as tests
COPY --from=worker-base /app/ /app/

# https://stackoverflow.com/questions/51115856/docker-failed-to-export-image-failed-to-create-image-failed-to-get-layer
RUN true

COPY ./dist/tests /app/tests
COPY ./src/roles/tests/intern.json /app/tests/
#RUN yarn install --frozen-lockfile
CMD ["yarn", "role:tests:run"]


#
# Backend worker
#
FROM worker-base as worker
COPY --from=worker-base /app/ /app/
COPY ./dist/worker /app/worker
CMD ["node", "./worker/worker.js"]


#
# Spooler
#
FROM worker-base as spooler
RUN mkdir -p /mnt/secrets-store
RUN yarn install
#RUN apk add --no-cache --upgrade bash
COPY --from=worker-base /app/ /app/
COPY ./dist/spooler /app/spooler
COPY ./src/roles/spooler/primo.sh /app/primo
RUN chmod +x /app/primo && ln -s /app/primo /usr/bin/primo
CMD ["node", "./spooler/spooler.js"]


#
# Backend API server
#
FROM worker-base as api
RUN mkdir -p /mnt/secrets-store
RUN yarn install
COPY --from=worker-base /app/ /app/
COPY ./dist/api /app/api
CMD ["node", "./api/api.js"]


#
# Frontend server
#
FROM nginx:latest as web
COPY ./dist/web /www/app
COPY ./src/roles/web/index.html /www/app/index.html
COPY ./src/roles/web/nginx.conf /etc/nginx/nginx.conf
COPY ./src/roles/web/.htpasswd /etc/apache2/.htpasswd


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
