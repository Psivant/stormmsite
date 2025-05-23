# StormmSite: Documentation Website for STORMM

The following repository holds the source code for the [STORMM](https://github.com/psivant/stormm) [Website].

Similar to STORMM, the code herein is also licensed under MIT, and we welcome all contributions from the Open Source community. Please note that direct contributions and access will not be granted. We encourage you to create your own forks, and submit any changes as Pull Requests using GitHub.

Please refrain from making any changes to ```docs/.vuepress```, as it contains scripts and workflows to ensure the site works properly (alongside the CSS for styling purposes).

## Installation Instructions

To get started with editing and suggesting changes to the STORMM website, first fork and clone the website on your local machine. Afterwards, we will need to install NVM, Node, and NPM to compile the website from Markdown pages to html.

### Prerequisites

Before installing NVM, ensure you have the following:

* **A terminal application:** Such as Bash, Zsh, or similar.
* **curl or wget:** For downloading the NVM installation script. Most Unix-like systems have these pre-installed. You can check if they are installed by typing `curl --version` or `wget --version` in your terminal. If not installed, you can install them using your system's package manager. For example, on Debian/Ubuntu: `sudo apt install curl` or `sudo apt install wget`. On Fedora/CentOS/RHEL: `sudo dnf install curl` or `sudo yum install wget`.
* **Git:** To clone the repository. Check with `git --version`. Install if necessary (e.g., `sudo apt install git` on Debian/Ubuntu, `sudo dnf install git` on Fedora).

## Linux/UNIX systems (macOS, BSD)

Firstly, we need to install Node Version Manager:

1.  **Install NVM:**
    * Open your terminal.
    * Run the following command to download and install NVM:

        ```bash
        curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh) | bash
        ```
        (Note: Check the NVM repository for the latest version and replace `v0.39.1` if necessary.)
    * Alternatively, you can use `wget`:

        ```bash
        wget -qO- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh) | bash
        ```

2.  **Source NVM:**
    * After the installation script finishes, you need to source your shell's configuration file to make the `nvm` command available. The installation script usually adds the necessary lines to your `~/.bashrc`, `~/.zshrc`, or `~/.profile` file.
    * Run the following command, or open a new terminal:

        ```bash
        source ~/.bashrc  # If you use Bash
        source ~/.zshrc  # If you use Zsh
        source ~/.profile # If you use a generic profile
        ```

3.  **Install Node.js:**
    * Use NVM to install a specific version of Node.js. It's generally recommended to use an LTS (Long Term Support) version. To find the latest LTS version, you can check the [Node.js website](https://nodejs.org/).
    * To install the latest LTS version:

        ```bash
        nvm install --lts
        ```
    * To install a specific version (e.g., 18.17.1):

        ```bash
        nvm install 18.17.1
        ```

4.  **Set the Default Node.js Version (Optional):**

    * If you have multiple Node.js versions installed, you can set a default:

        ```bash
        nvm alias default <version>  # Replace <version> with the desired version (e.g., "lts", "18.17.1")
        ```

5.  **Verify Installation:**

    * Check that NVM is installed correctly:

        ```bash
        nvm --version
        ```

    * Check that Node.js and npm (Node Package Manager) are installed correctly:

        ```bash
        node -v
        npm -v
        ```

## Windows Systems

For Windows, you'll need to use [NVM for Windows](https://github.com/coreybutler/nvm-windows), which is a different project from the NVM used on Linux/macOS.

1.  **Install NVM for Windows:**
    * Go to the [NVM for Windows](https://github.com/coreybutler/nvm-windows/releases) releases page.
    * Download the latest `nvm-setup.exe` executable.
    * Run the installer. Follow the on-screen instructions. You'll typically accept the license agreement, choose an installation location, and set the Node.js symlink.

2.  **Open a Command Prompt as Administrator:**
    * After installation, you'll need to use a Command Prompt or PowerShell with administrator privileges. Right-click on "Command Prompt" or "PowerShell" in the Start Menu and select "Run as administrator".

3.  **Install Node.js:**
    * Use NVM for Windows to install a specific version of Node.js. As with Linux/macOS, it's recommended to use an LTS version.
    * To install the latest LTS version:

        ```bash
        nvm install --lts
        ```
    * To install a specific version (e.g., 18.17.1):

        ```bash
        nvm install 18.17.1
        ```

4.  **Use a Node.js Version:**
     * To use an installed version of Node.js:
        ```bash
        nvm use <version>
        ```

5.  **Set the Default Node.js Version (Optional):**
        ```bash
        nvm alias default <version>
        ```

6.  **Verify Installation:**

    * Check that NVM for Windows is installed correctly:

        ```bash
        nvm --version
        ```

    * Check that Node.js and npm are installed correctly:

        ```bash
        node -v
        npm -v
        ```
