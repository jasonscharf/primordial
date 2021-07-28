# README
Algorithmic Trading Platform.

# Requirements
Node
Yarn
Kubernetes
Minikube:




# Installing
Running `yarn install` should install any dependencies and prepare the software for running.
```
yarn install
```


# Building & Running
To build containers and launch them via Docker Compose:

```
yarn up
```

This should be run anytime dependencies or copied assets (e.g. package.json) are changed.
This command starts the cluster in running in Docker and exposing debug ports.

## Debugging the web app
First, start a watching instance of the TS compiler in a new terminal:

```
yarn dev:watch
```

In another terminal, start the WebPack dev server:
```
yarn wp:serve
```

You can now debug the app over localhost:8080.


# Notes

## Minikube for troubleshooting K8S issues
Minikube can be useful for debugging some Kubernetes issues.

Here's how to install:

```
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-PLATFORM-amd64
sudo install minikube-PLATFORM-amd64 /usr/local/bin/minikube
```

See the commands in package.json prefixed with "kube:".
s