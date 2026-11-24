import { cpSync } from 'node:fs'

cpSync('飞象星球.html', 'dist/飞象星球.html')
cpSync('飞象星球_files', 'dist/飞象星球_files', { recursive: true })
