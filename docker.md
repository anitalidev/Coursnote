# Docker Notes

## What is Docker?

Docker is a platform for packaging an application together with everything it needs to run (its runtime, libraries, dependencies, configuration, etc.) into a **container**.

The main goal is: **"Run the application the same way on every computer."**

It is a similar concept to jar files.

Unlike virtual machines, docker works at the application level and so is generally smaller in size. It borrows/shares the same kernel as the host.

A VM has to include:
* Linux kernel
* System services
* Bootloader
* Drivers
* Utilities
* Your application

A Docker container only needs:
* Your application
* The libraries it depends on

Thus virtual machines also take longer to start up. But due to not hosting the kernel, the docker image is only compatible with a host of the same type of kernel it was created using. 

## How to use (general)
There are three main ways to use Docker
1. Build Dockerfiles to be your own custom images. Then run those to make containers.
2. Use pre-made images and run those to make containers.
3. Use docker compose (.yml) to build + run a Dockerfile, as well as combine the build + run of multiple Dockerfiles

---

# Why use Docker?

Without Docker:

* You have to install the correct language runtime.
* You have to install dependencies.
* Different developers may have different versions.
* The application may work on one computer but not another.
* Allows to more easily use different versions to run different projects when working on multiple

Docker solves this by giving everyone the exact same environment (aka a container created using Dockerfile and docker-compose).

---

# What is an image?

An **image** is a blueprint for creating containers.

An image is read-only.

Running an image creates one or more containers.

---

# What is a container?

A **container** is a running instance of an image.

---

# Images vs Containers

Image:

* Blueprint
* Read-only
* Built once
* Used to create containers

Container:

* Running application
* Has memory
* Has processes
* Can start and stop

---

# What is a Dockerfile?

A Dockerfile tells Docker how to build an image. You can use a Dockerfile to build an image using `docker build -t coursnote-backend {directory}`, where directory specifies where the ockerfile should be found. This creates an image from the Dockerfile and saves it in the Docker local storage with tag "coursenote-backed". This image can then be run using `docker run coursnote-backend` to build a container.

Example:

```dockerfile
FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
```

Docker executes these instructions from top to bottom.

---

# FROM

Example: `dockerfile
FROM golang:1.26.3`

`FROM` chooses the base image. This base image can be an official image from Docker Hub, one published by someone else, or even yourself.

Think of the example as: `"Start with a computer that already has Go installed."`

---

# WORKDIR

Example: `WORKDIR /app`

Changes the current working directory.

Equivalent to: `cd /app`

Every later command runs from that directory.

---

# COPY

Example:

```dockerfile
COPY . .
```

Meaning:

```
Host machine
        ↓
Current project
        ↓
Container
```

The first `.` means:

> Current directory on your computer.

The second `.` means:

> Current directory inside the container.

---

# RUN

Example:

```dockerfile
RUN npm install
```

`RUN` executes while **building the image**.

This happens once during:

```
docker build
```

It is used for things like:

* installing packages
* downloading dependencies
* compiling code

For Go:

```dockerfile
RUN go mod download
RUN go build -o server .
```

---

# CMD

Example:

```dockerfile
CMD ["npm", "run", "dev"]
```

or

```dockerfile
CMD ["./server"]
```

`CMD` runs **when the container starts**.

Difference:

```
docker build
    ↓
RUN commands

docker run
    ↓
CMD command
```

---

# EXPOSE

Example:

```dockerfile
EXPOSE 3334
```

This documents that the application listens on port 3334.

It does **not** automatically make the port accessible outside the container.

Docker Compose or `docker run -p` does that.

---

# Build Process

```
Dockerfile
      ↓
docker build
      ↓
Image
      ↓
docker run
      ↓
Container
```

---

# Docker Compose

Compose lets you start a container without having to do separate build/run, AND allows you to easily run multiple containers together.

Example:

```yaml
services:

  backend:
    build: ./backend

  frontend:
    build: ./frontend
```

Instead of manually starting each container, you simply run:

```bash
docker compose up
```

Which will build the service images listed, then run them into containers. 
The other option is to run build and then run for each of the containers you want to create. 

---

# Port Mapping

Suppose the frontend listens on:

```
3334
```

Inside the container.

Compose:

```yaml
ports:
  - "3334:3334"
```

Meaning:

```
Host:3334
      ↓
Container:3334
```

The format is:

```
HOST_PORT : CONTAINER_PORT
```

---

# Does the browser know about Docker?

No.

The browser only knows:

```
http://localhost:3334
```

That request goes to your computer.

Docker is running on your computer and sees:

> "Someone connected to port 3334."

Docker checks the port mapping:

```
3334
    ↓
Frontend container
```

and forwards the request.

The browser never knows Docker exists.

---

# Why didn't Vite work?

By default Vite only listens for connections coming from **inside the container**.

Think of it as saying:

> "I'll only talk to programs inside this container."

Your browser is outside.

So:

```
Browser
      ↓
Docker
      ↓
Vite

Vite:
"No."
```

---

# What does `--host` do?

Running:

```bash
vite --host
```

tells Vite:

> "Accept connections coming from outside the container too."

Now:

```
Browser
      ↓
Docker
      ↓
Vite

Vite:
"Sure."
```

Notice:

`--host` changes **Vite**, not Docker.

Docker was already forwarding the request correctly.

---

# Why is localhost confusing?

The meaning of `localhost` depends on where the program is running.

On your computer:

```
localhost
```

means

```
your computer
```

Inside a container:

```
localhost
```

means

```
that container
```

Every container has its own network namespace.

So:

```
Mac localhost
```

and

```
Container localhost
```

are different machines from the perspective of networking.

---

# Complete Frontend Request Flow

```
Browser
    │
http://localhost:3334
    ▼
Your computer
    ▼
Docker
    ▼
Frontend container
    ▼
Vite
```

Without `--host`:

```
Browser
    ▼
Docker
    ▼
Vite

"I only accept connections from inside the container."
```

With `--host`:

```
Browser
    ▼
Docker
    ▼
Vite

"I'll accept outside connections too."
```

---

# Backend Example

```
FROM golang:1.26.3

WORKDIR /backend

COPY . .

RUN go mod download

RUN go build -o server .

CMD ["./server"]
```

Build:

```
docker build
```

During the build:

* Go image is downloaded
* Files are copied
* Dependencies are downloaded
* Server is compiled

Running:

```
docker run
```

executes:

```
./server
```

---

# Frontend Example

```
FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3334

CMD ["npm", "run", "dev", "--", "--host"]
```

During build:

* Node image is downloaded
* Dependencies are installed

When the container starts:

* Vite starts
* Docker forwards requests
* Browser can access the frontend

---

# Summary

* **Image** = blueprint.
* **Container** = running instance of an image.
* **Dockerfile** = instructions for building an image.
* **FROM** = choose the base environment.
* **WORKDIR** = change the working directory.
* **COPY** = copy files into the image.
* **RUN** = execute during image build.
* **CMD** = execute when the container starts.
* **EXPOSE** = document which port the application listens on.
* **docker build** creates an image.
* **docker run** creates and starts a container.
* **docker compose** starts multiple containers together.
* **Port mapping** lets Docker forward traffic from the host to a container.
* The browser never talks directly to a container—it talks to the host, and Docker forwards the request.
* `vite --host` tells Vite to accept requests forwarded by Docker instead of only accepting requests from within its own container.
