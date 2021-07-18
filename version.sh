#!/usr/bin/env bash
TAG=$1
ID=$2

BUILD_SOURCEBRANCHNAME="${BUILD_SOURCEBRANCHNAME:-$(git branch --show-current)}"
BUILD_BUILDNUMBER="${BUILD_BUILDNUMBER:-000000}"
BUILD_SOURCEVERSION=$(echo "${BUILD_SOURCEVERSION:-$(git rev-parse --short HEAD)}" | cut -c1-6)


#if [ -z "$TAG" ]
#then
# Note: If you're changing this format, be sure to update any "docker tag" pipeline commands
TAG="$BUILD_SOURCEBRANCHNAME-$BUILD_SOURCEVERSION-$BUILD_BUILDNUMBER"
#fi

echo "Tagging build on branch '${BUILD_SOURCEBRANCHNAME}' as ${TAG}"


if [ -z "$ID" ]
then
    # Note: If you're changing this format, be sure to update any "docker tag" pipeline commands
    ID=$BUILD_SOURCEVERSION
fi

#
# Stamp in built code
#
VERSION_FILE="./dist/common/version.js";

if [ "$TAG" != "--" ]; then
    echo "Stamping version TAG: $TAG"
    sed -i 's/!VERSION\.FULL!/'"$TAG"'/g' $VERSION_FILE
else
    echo "Version TAG not set"
fi


#
# Stamp in built config
#
if [ -z "$ID" ]
then
    echo "Version ID not set";
else
    echo "Stamping Version ID: $ID"
    sed -i 's/!VERSION\.ID!/'"$ID"'/g' $VERSION_FILE
fi

# Replace image tag placeholders in compose and k8s files
find . -type f -name "*.yml" -print0 |  xargs -0 sed -i -e's/\:latest[[:space:]]*\#[[:space:]]*TAGPLACEHOLDER/'":$TAG"'/g'

echo "##vso[task.setvariable variable=tag]$TAG"
