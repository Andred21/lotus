#!/usr/bin/env node
import fs from 'fs'

const esCL = JSON.parse(fs.readFileSync('./es-CL.json', 'utf8'))
const ptBR = JSON.parse(fs.readFileSync('./pt-BR.json', 'utf8'))
const en = JSON.parse(fs.readFileSync('./en.json', 'utf8'))

function getKeys(obj, prefix = '') {
  const keys = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

const esKeys = new Set(getKeys(esCL))
const ptKeys = new Set(getKeys(ptBR))
const enKeys = new Set(getKeys(en))

const diff = (a, b) => Array.from(a).filter(k => !b.has(k)).sort()

const esPt = diff(esKeys, ptKeys)
const ptEs = diff(ptKeys, esKeys)
const esEn = diff(esKeys, enKeys)
const enEs = diff(enKeys, esKeys)

const allDiffs = [...new Set([...esPt, ...ptEs, ...esEn, ...enEs])]

console.log('es-pt:', JSON.stringify(esPt.length === 0 && ptEs.length === 0 ? [] : allDiffs))
console.log('es-en:', JSON.stringify(esEn.length === 0 && enEs.length === 0 ? [] : allDiffs))
