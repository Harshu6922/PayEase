import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

// Indigo color block #4F46E5
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#4F46E5"/>
  <text x="256" y="310" font-size="260" font-family="system-ui,sans-serif" text-anchor="middle" fill="white">P</text>
</svg>`

const svgBuf = Buffer.from(svg)

async function run() {
  await sharp(svgBuf).resize(192, 192).toFile('public/icons/icon-192.png')
  await sharp(svgBuf).resize(512, 512).toFile('public/icons/icon-512.png')
  await sharp(svgBuf).resize(180, 180).toFile('src/app/apple-icon.png')
  console.log('Icons generated.')
}

run()
