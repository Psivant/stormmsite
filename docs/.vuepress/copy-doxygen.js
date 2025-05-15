import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Source and destination paths
const sourceDir = path.join(__dirname, '..', 'doxygen')
const distDir = path.join(__dirname, 'dist', 'doxygen')
const devDir = path.join(__dirname, '.temp', 'public', 'doxygen')

// Function to copy files
function copyFiles(src, dest) {
  try {
    fs.ensureDirSync(dest)
    fs.copySync(src, dest)
    console.log(`Successfully copied Doxygen files to ${dest}`)
  } catch (err) {
    console.error('Error copying Doxygen files:', err)
    process.exit(1)
  }
}

// Copy to both development and build directories
copyFiles(sourceDir, distDir)
copyFiles(sourceDir, devDir)
