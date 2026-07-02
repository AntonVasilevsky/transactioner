import fs from 'node:fs'

const packagePath = 'package.json'
const lockPath = 'package-lock.json'

const bumpPatch = (version) => {
  const parts = String(version).split('.').map((part) => Number.parseInt(part, 10))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Unsupported version format: ${version}`)
  }
  parts[2] += 1
  return parts.join('.')
}

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
const nextVersion = bumpPatch(packageJson.version)

packageJson.version = nextVersion
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)

const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
lockJson.version = nextVersion
if (lockJson.packages?.['']) {
  lockJson.packages[''].version = nextVersion
}
fs.writeFileSync(lockPath, `${JSON.stringify(lockJson, null, 2)}\n`)

console.log(`Version bumped to ${nextVersion}`)
