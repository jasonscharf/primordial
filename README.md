# README
Algorithmic Trading Platform.

# Requirements
Node
Yarn
Kubernetes
Minikube:

## Minikube
A local Minikube cluster and basic knowledge of how to operate Minikube is required.
Installing:
```
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-PLATFORM-amd64
sudo install minikube-PLATFORM-amd64 /usr/local/bin/minikube
```


# Installing
Running `yarn install` should install any dependencies and prepare the software for running.
```
yarn install
```


# Building & Running
The platform runs as a Kubernetes cluster in development.
You can build and run the cluster via:


```
yarn build
yarn up
```
