<template><div><h1 id="alternate-installation-instructions-docker" tabindex="-1"><a class="header-anchor" href="#alternate-installation-instructions-docker"><span>Alternate Installation Instructions: Docker</span></a></h1>
<p>You can also install STORMM using Docker as an alternative method. This allows you to run STORMM in
a containerized environment without needing to set up your local environment.
Follow the steps below to build and run the Docker container for STORMM.</p>
<h2 id="prerequisites" tabindex="-1"><a class="header-anchor" href="#prerequisites"><span>Prerequisites</span></a></h2>
<ul>
<li>Ensure you have Docker installed on your machine.
You can download it from <a href="https://www.docker.com/get-started" target="_blank" rel="noopener noreferrer">Docker's official website</a>.</li>
</ul>
<h2 id="building-the-docker-image" tabindex="-1"><a class="header-anchor" href="#building-the-docker-image"><span>Building the Docker Image</span></a></h2>
<ol>
<li>Download the file named &quot;Dockerfile&quot; under ~/docker in this repository.</li>
</ol>
<p>If you have a compatible GPU, please download the <code v-pre>Dockerfile</code> under <code v-pre>STORMM-CONFIG</code>.</p>
<p>If you do not have a compatible GPU, you can run STORMM on CPU only. Please download the
<code v-pre>Dockerfile</code> under <code v-pre>STORMM-CPU-ONLY-CONFIG</code>.</p>
<p>You only need the relevant Dockerfile for this method, and do not need to clone
the entire repository.</p>
<ol start="2">
<li>
<p>Navigate to the directory with the Dockerfile, and build a container:</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> build <span class="token parameter variable">-t</span> stormm-docker <span class="token builtin class-name">.</span></span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
</ol>
<h2 id="running-the-docker-container" tabindex="-1"><a class="header-anchor" href="#running-the-docker-container"><span>Running the Docker Container</span></a></h2>
<ol start="3">
<li>
<p>Once the image is built, you can run the container:</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> run <span class="token parameter variable">--gpus</span> all <span class="token parameter variable">-it</span> stormm-docker</span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div><ul>
<li>The <code v-pre>--gpus all</code> flag enables GPU access.</li>
<li>The <code v-pre>-it</code> flag allows you to interact with the container.</li>
</ul>
</li>
</ol>
<p>Note: Once you exit an active Docker session, the container is stopped.
However, it is still in memory.</p>
<p>If <code v-pre>docker run</code> is executed, a new container (clone) will be created.
Please follow the steps below to reuse the same container, instead of creating a new one.</p>
<h1 id="managing-docker-containers" tabindex="-1"><a class="header-anchor" href="#managing-docker-containers"><span>Managing Docker Containers</span></a></h1>
<p>Docker provides a way to reuse an existing container without creating a new one each time.
Below are several methods to manage your Docker containers effectively:</p>
<h2 id="_1-reuse-an-existing-stopped-container" tabindex="-1"><a class="header-anchor" href="#_1-reuse-an-existing-stopped-container"><span>1. Reuse an Existing Stopped Container</span></a></h2>
<p>If you want to run a stopped container without creating a new one, you can restart
the existing container.</p>
<p><strong>Steps:</strong></p>
<ul>
<li>
<p>List all containers (including stopped ones):</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> <span class="token function">ps</span> <span class="token parameter variable">-a</span></span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
<li>
<p>Find the container ID of the container that you want to reuse, and then start it.
Container IDs are the first column, container name is the second
(&quot;stormm-docker&quot;, from the steps above):</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> start <span class="token operator">&lt;</span>container_id<span class="token operator">></span></span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
<li>
<p>Attach your CLI to the running container to interact with it:</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> <span class="token builtin class-name">exec</span> <span class="token parameter variable">-it</span> <span class="token operator">&lt;</span>container_id<span class="token operator">></span> /bin/bash</span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
</ul>
<h2 id="_2-optional-using-the-name-option" tabindex="-1"><a class="header-anchor" href="#_2-optional-using-the-name-option"><span>2. [Optional] Using the <code v-pre>--name</code> Option</span></a></h2>
<p>When you create a container with the <code v-pre>--name</code> flag, Docker assigns a specific name to the
container.  You can use that name to start and reuse the container.</p>
<p><strong>Example:</strong></p>
<ul>
<li>
<p>Create the container with a specific name:</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> run <span class="token parameter variable">--gpus</span> all <span class="token parameter variable">-it</span> <span class="token parameter variable">--name</span> stormm-container stormm-docker</span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
<li>
<p>When you want to reuse the container, restart it:</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> start stormm-container</span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
<li>
<p>Attach to it:</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> <span class="token builtin class-name">exec</span> <span class="token parameter variable">-it</span> stormm-container /bin/bash</span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
</ul>
<h2 id="_3-optional-automatically-remove-containers-after-execution" tabindex="-1"><a class="header-anchor" href="#_3-optional-automatically-remove-containers-after-execution"><span>3. [Optional] Automatically Remove Containers After Execution</span></a></h2>
<p>If you want to run a temporary container and automatically remove it after it finishes, you can
use the <code v-pre>--rm</code> flag:</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> run <span class="token parameter variable">--rm</span> <span class="token parameter variable">--gpus</span> all <span class="token parameter variable">-it</span> stormm-docker</span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div><p>This won't reuse the same container but ensures no leftover containers after running the command.</p>
<h2 id="_4-optional-restart-policy-for-automatic-restarts" tabindex="-1"><a class="header-anchor" href="#_4-optional-restart-policy-for-automatic-restarts"><span>4. [Optional] Restart Policy for Automatic Restarts</span></a></h2>
<p>You can set a restart policy to automatically start containers when they stop:</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> run <span class="token parameter variable">-dit</span> <span class="token parameter variable">--restart</span> unless-stopped <span class="token parameter variable">--name</span> stormm-container stormm-docker</span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div><p>This ensures the container stays running, and you can attach to it as needed.</p>
<p>This Docker setup allows you to easily build and run STORMM in a containerized environment with
GPU support, while also managing and maintaining your containers effectively.</p>
<h2 id="_5-removing-unused-containers" tabindex="-1"><a class="header-anchor" href="#_5-removing-unused-containers"><span>5. Removing Unused Containers</span></a></h2>
<p>To remove containers that are not currently in use, you can follow these steps:</p>
<p>As mentioned above, please use <code v-pre>sudo docker ps -a</code> to get the CONTAINER ID for
your desired container.</p>
<ol>
<li><strong>Stop any running containers (if needed):</strong><div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> stop <span class="token operator">&lt;</span>container_name_or_id<span class="token operator">></span></span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
</ol>
<p>The containers are configured to stop automatically when you exit them, unless the steps under
&quot;Restart policy for Automatic Restarts&quot; were followed.</p>
<p>Hence, this command is not required for graceful exits on the default config.</p>
<ol start="2">
<li>
<p><strong>Remove a specific stopped container:</strong></p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> <span class="token function">rm</span> <span class="token operator">&lt;</span>container_name_or_id<span class="token operator">></span></span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
</ol>
<p>Note: While this command is useful in removing old or duplicate containers, if all containers
have been removed, STORMM will have to be built in a new container from scratch.</p>
<ol start="3">
<li>
<p><strong>Remove all stopped containers at once:</strong></p>
<p>To clean up your system by removing all stopped containers, you can use:</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line"><span class="token function">sudo</span> <span class="token function">docker</span> container prune</span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
</ol>
<p>This command will prompt you for confirmation before removing all stopped containers,
helping you to reclaim space on your system.</p>
<p>However, this would require a new STORMM container to be built from scratch.</p>
</div></template>


