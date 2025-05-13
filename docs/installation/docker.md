# Alternate Installation Instructions: Docker

You can also install STORMM using Docker as an alternative method. This allows you to run STORMM in
a containerized environment without needing to set up your local environment. 
Follow the steps below to build and run the Docker container for STORMM.

## Prerequisites

- Ensure you have Docker installed on your machine. 
You can download it from [Docker's official website](https://www.docker.com/get-started).

## Building the Docker Image

1. Download the file named "Dockerfile" under ~/docker in this repository.

If you have a compatible GPU, please download the ```Dockerfile``` under ```STORMM-CONFIG```.

If you do not have a compatible GPU, you can run STORMM on CPU only. Please download the
```Dockerfile``` under ```STORMM-CPU-ONLY-CONFIG```.

You only need the relevant Dockerfile for this method, and do not need to clone 
the entire repository.

2. Navigate to the directory with the Dockerfile, and build a container:

   ```bash
   sudo docker build -t stormm-docker .
   ```

## Running the Docker Container

3. Once the image is built, you can run the container:

   ```bash
   sudo docker run --gpus all -it stormm-docker
   ```
   - The `--gpus all` flag enables GPU access.
   - The `-it` flag allows you to interact with the container.

Note: Once you exit an active Docker session, the container is stopped.
However, it is still in memory. 

If ```docker run``` is executed, a new container (clone) will be created.
Please follow the steps below to reuse the same container, instead of creating a new one.

# Managing Docker Containers

Docker provides a way to reuse an existing container without creating a new one each time. 
Below are several methods to manage your Docker containers effectively:

## 1. Reuse an Existing Stopped Container

If you want to run a stopped container without creating a new one, you can restart 
the existing container.

**Steps:**
- List all containers (including stopped ones):

    ```bash
    sudo docker ps -a
    ```

- Find the container ID of the container that you want to reuse, and then start it. 
Container IDs are the first column, container name is the second
("stormm-docker", from the steps above):

    ```bash
    sudo docker start <container_id>
    ```

- Attach your CLI to the running container to interact with it:

    ```bash
    sudo docker exec -it <container_id> /bin/bash
    ```

## 2. [Optional] Using the `--name` Option

When you create a container with the `--name` flag, Docker assigns a specific name to the
container.  You can use that name to start and reuse the container.

**Example:**
- Create the container with a specific name:
    ```bash
    sudo docker run --gpus all -it --name stormm-container stormm-docker
    ```

- When you want to reuse the container, restart it:
    ```bash
    sudo docker start stormm-container
    ```

- Attach to it:
    ```bash
    sudo docker exec -it stormm-container /bin/bash
    ```

## 3. [Optional] Automatically Remove Containers After Execution

If you want to run a temporary container and automatically remove it after it finishes, you can
use the `--rm` flag:

```bash
sudo docker run --rm --gpus all -it stormm-docker
```

This won't reuse the same container but ensures no leftover containers after running the command.

## 4. [Optional] Restart Policy for Automatic Restarts
You can set a restart policy to automatically start containers when they stop:

```bash
sudo docker run -dit --restart unless-stopped --name stormm-container stormm-docker
```

This ensures the container stays running, and you can attach to it as needed.

This Docker setup allows you to easily build and run STORMM in a containerized environment with
GPU support, while also managing and maintaining your containers effectively.

## 5. Removing Unused Containers

To remove containers that are not currently in use, you can follow these steps:

As mentioned above, please use ```sudo docker ps -a``` to get the CONTAINER ID for
your desired container. 

1. **Stop any running containers (if needed):**
   ```bash
   sudo docker stop <container_name_or_id>
   ```

The containers are configured to stop automatically when you exit them, unless the steps under 
"Restart policy for Automatic Restarts" were followed.

Hence, this command is not required for graceful exits on the default config.

2. **Remove a specific stopped container:**

   ```bash
   sudo docker rm <container_name_or_id>
   ```

Note: While this command is useful in removing old or duplicate containers, if all containers
have been removed, STORMM will have to be built in a new container from scratch.

3. **Remove all stopped containers at once:**

   To clean up your system by removing all stopped containers, you can use:
   ```bash
   sudo docker container prune
   ```
This command will prompt you for confirmation before removing all stopped containers, 
helping you to reclaim space on your system.

However, this would require a new STORMM container to be built from scratch. 
