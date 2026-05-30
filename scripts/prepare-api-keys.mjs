import { copyFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const sourcePath = process.env.TRANSACTIONER_API_KEYS_PATH || path.join(homedir(), 'dev', 'api-keys.env')
const targetDir = path.join(process.cwd(), 'build', 'private')
const targetPath = path.join(targetDir, 'api-keys.env')

mkdirSync(targetDir, { recursive: true })

if (!existsSync(sourcePath)) {
  console.warn(`API keys file not found at ${sourcePath}; building without packaged transaction lookup keys.`)
  process.exit(0)
}

copyFileSync(sourcePath, targetPath)
chmodSync(targetPath, 0o600)
console.log(`Prepared packaged API keys from ${sourcePath}`)
