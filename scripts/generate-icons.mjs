import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import png2icons from 'png2icons'

const root = path.resolve(import.meta.dirname, '..')
const svgPath = path.join(root, 'public', 'icon.svg')
const iconsetDir = path.join(root, 'public', 'icon.iconset')

const pngSizes = [16, 24, 32, 48, 64, 128, 256]
const icnsSizes = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024],
]

mkdirSync(iconsetDir, { recursive: true })

await sharp(svgPath)
  .resize(1024, 1024)
  .png()
  .toFile(path.join(root, 'public', 'icon.png'))

for (const [filename, size] of icnsSizes) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(path.join(iconsetDir, filename))
}

const icoBuffers = await Promise.all(
  pngSizes.map(size => sharp(svgPath).resize(size, size).png().toBuffer())
)
writeFileSync(path.join(root, 'public', 'icon.ico'), await pngToIco(icoBuffers))

const sourcePng = await sharp(svgPath).resize(1024, 1024).png().toBuffer()
const icns = png2icons.createICNS(sourcePng, png2icons.BILINEAR, 0)
if (!icns) {
  throw new Error('Failed to generate macOS icon')
}
writeFileSync(path.join(root, 'public', 'icon.icns'), icns)
