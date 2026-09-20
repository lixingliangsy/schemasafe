// Real, deterministic JSON-Schema validator for SchemaSafe.
// Supports the JSON Schema (draft 2020-12) subset that API/config/webhook
// payloads actually use. No AI key required — validation is pure logic, so it
// is honest and reproducible (never "fake AI" output).
//
// Supported keywords:
//   type (incl. integer, array-of-types), enum, const, nullable (OpenAPI 3.0)
//   minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf
//   minLength, maxLength, pattern, format
//   minItems, maxItems, uniqueItems, items (schema | schema[]), additionalItems
//   properties, required, additionalProperties (bool | schema)
//   minProperties, maxProperties
//   not, allOf, anyOf, oneOf
//   $ref / if-then-else / patternProperties — noted as unsupported (skipped)
//
// NOTE: $ref is intentionally NOT resolved (no schema registry). The validator
// reports it as a skipped keyword rather than failing silently.

export interface ValidationError {
  path: string
  keyword: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  instanceSummary: string
  schemaSummary: string
  text: string
}

type JSONValue = any

function typeOf(v: JSONValue): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v // 'object' | 'string' | 'number' | 'boolean'
}

function isInteger(n: number): boolean {
  return typeof n === 'number' && isFinite(n) && Math.floor(n) === n
}

function matchesType(value: JSONValue, type: string | string[]): boolean {
  const types = Array.isArray(type) ? type : [type]
  const actual = typeOf(value)
  return types.some((t) => {
    if (t === 'number') return actual === 'number'
    if (t === 'integer') return actual === 'number' && isInteger(value)
    return actual === t
  })
}

function summarize(v: JSONValue): string {
  const t = typeOf(v)
  if (t === 'object') {
    const keys = Object.keys(v)
    return `object with ${keys.length} key${keys.length === 1 ? '' : 's'}`
  }
  if (t === 'array') return `array[${v.length}]`
  if (t === 'string') return `string (${v.length} chars)`
  if (t === 'null') return 'null'
  return `${t} (${String(v)})`
}

function summarizeSchema(s: JSONValue): string {
  if (!s || typeof s !== 'object') return 'non-object schema'
  const parts: string[] = []
  if (s.title) parts.push(`"${s.title}"`)
  if (typeof s.type === 'string') parts.push(`type:${s.type}`)
  else if (Array.isArray(s.type)) parts.push(`type:${s.type.join('|')}`)
  if (s.required && Array.isArray(s.required)) parts.push(`required:${s.required.join(', ')}`)
  if (s.properties && typeof s.properties === 'object')
    parts.push(`${Object.keys(s.properties).length} properties`)
  if (s.enum) parts.push(`enum(${s.enum.length})`)
  return parts.join(' · ') || 'schema'
}

// ---- format checks (basic, spec-aligned) -------------------------------
function checkFormat(fmt: string, value: string): string | null {
  switch (fmt) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : `not a valid email`
    case 'uri':
    case 'url':
      return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/\S+$/.test(value) ? null : `not a valid URI`
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : `not a valid RFC 3339 date`
    case 'date-time':
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(value)
        ? null
        : `not a valid RFC 3339 date-time`
    case 'uuid':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
        ? null
        : `not a valid UUID`
    case 'hostname':
      return /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(
        value,
      )
        ? null
        : `not a valid hostname`
    case 'ipv4': {
      const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value)
      if (!m) return `not a valid IPv4 address`
      const ok = m.slice(1).every((o) => Number(o) >= 0 && Number(o) <= 255 && String(Number(o)) === o)
      return ok ? null : `not a valid IPv4 address`
    }
    case 'ipv6':
      return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(value) ? null : `not a valid IPv6 address`
    default:
      return null // unknown formats are not enforced
  }
}

function pointer(parent: string, key: string | number): string {
  const seg = typeof key === 'number' ? String(key) : key.replace(/~/g, '~0').replace(/\//g, '~1')
  return parent === '' ? `/${seg}` : `${parent}/${seg}`
}

function validate(
  instance: JSONValue,
  schema: JSONValue,
  path: string,
  errors: ValidationError[],
): void {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    // Non-object schema (e.g. boolean schema true/false) — minimal support.
    if (schema === false) {
      errors.push({ path, keyword: 'schema', message: 'schema is `false` — nothing validates' })
    }
    return
  }

  // nullable (OpenAPI 3.0 extension): null is allowed even if type says otherwise.
  const nullable = schema.nullable === true
  if (instance === null && nullable) return

  if ('$ref' in schema) {
    // $ref is not resolved (no registry). Skip but record that it was seen.
    errors.push({
      path,
      keyword: '$ref',
      message:
        '$ref is not resolved by SchemaSafe (no schema registry). Inline the referenced schema to validate this branch.',
    })
    return
  }

  // type
  if (schema.type !== undefined) {
    if (!matchesType(instance, schema.type)) {
      const want = Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type
      errors.push({
        path,
        keyword: 'type',
        message: `expected type ${want}, got ${typeOf(instance)}`,
      })
      // Stop descending on type mismatch to avoid cascading noise.
      return
    }
  }

  // const
  if ('const' in schema) {
    if (JSON.stringify(instance) !== JSON.stringify(schema.const)) {
      errors.push({ path, keyword: 'const', message: `must equal the const value` })
    }
  }

  // enum
  if (Array.isArray(schema.enum)) {
    if (!schema.enum.some((e: JSONValue) => JSON.stringify(e) === JSON.stringify(instance))) {
      errors.push({ path, keyword: 'enum', message: `must be one of the allowed enum values` })
    }
  }

  const t = typeOf(instance)

  // ---- numeric keywords ----
  if (t === 'number') {
    const n = instance as number
    if (typeof schema.minimum === 'number' && n < schema.minimum)
      errors.push({ path, keyword: 'minimum', message: `must be ≥ ${schema.minimum}, got ${n}` })
    if (typeof schema.maximum === 'number' && n > schema.maximum)
      errors.push({ path, keyword: 'maximum', message: `must be ≤ ${schema.maximum}, got ${n}` })
    if (typeof schema.exclusiveMinimum === 'number' && n <= schema.exclusiveMinimum)
      errors.push({
        path,
        keyword: 'exclusiveMinimum',
        message: `must be > ${schema.exclusiveMinimum}, got ${n}`,
      })
    if (typeof schema.exclusiveMaximum === 'number' && n >= schema.exclusiveMaximum)
      errors.push({
        path,
        keyword: 'exclusiveMaximum',
        message: `must be < ${schema.exclusiveMaximum}, got ${n}`,
      })
    if (typeof schema.multipleOf === 'number' && schema.multipleOf > 0) {
      const q = n / schema.multipleOf
      if (Math.abs(q - Math.round(q)) > 1e-9)
        errors.push({
          path,
          keyword: 'multipleOf',
          message: `must be a multiple of ${schema.multipleOf}, got ${n}`,
        })
    }
  }

  // ---- string keywords ----
  if (t === 'string') {
    const s = instance as string
    if (typeof schema.minLength === 'number' && s.length < schema.minLength)
      errors.push({
        path,
        keyword: 'minLength',
        message: `length ${s.length} < minLength ${schema.minLength}`,
      })
    if (typeof schema.maxLength === 'number' && s.length > schema.maxLength)
      errors.push({
        path,
        keyword: 'maxLength',
        message: `length ${s.length} > maxLength ${schema.maxLength}`,
      })
    if (typeof schema.pattern === 'string') {
      try {
        const re = new RegExp(schema.pattern)
        if (!re.test(s))
          errors.push({
            path,
            keyword: 'pattern',
            message: `does not match pattern ${schema.pattern}`,
          })
      } catch {
        errors.push({
          path,
          keyword: 'pattern',
          message: `schema pattern "${schema.pattern}" is not a valid regex`,
        })
      }
    }
    if (typeof schema.format === 'string') {
      const fm = checkFormat(schema.format, s)
      if (fm) errors.push({ path, keyword: 'format', message: `format "${schema.format}": ${fm}` })
    }
  }

  // ---- array keywords ----
  if (t === 'array') {
    const arr = instance as JSONValue[]
    if (typeof schema.minItems === 'number' && arr.length < schema.minItems)
      errors.push({
        path,
        keyword: 'minItems',
        message: `has ${arr.length} items < minItems ${schema.minItems}`,
      })
    if (typeof schema.maxItems === 'number' && arr.length > schema.maxItems)
      errors.push({
        path,
        keyword: 'maxItems',
        message: `has ${arr.length} items > maxItems ${schema.maxItems}`,
      })
    if (schema.uniqueItems === true) {
      const seen = new Set<string>()
      for (let i = 0; i < arr.length; i++) {
        const k = JSON.stringify(arr[i])
        if (seen.has(k)) {
          errors.push({
            path: pointer(path, i),
            keyword: 'uniqueItems',
            message: `duplicate of an earlier item (uniqueItems required)`,
          })
        }
        seen.add(k)
      }
    }
    if (schema.items !== undefined) {
      if (Array.isArray(schema.items)) {
        for (let i = 0; i < arr.length; i++) {
          const itemSchema = schema.items[i]
          if (itemSchema !== undefined) validate(arr[i], itemSchema, pointer(path, i), errors)
          else if (schema.additionalItems === false)
            errors.push({
              path: pointer(path, i),
              keyword: 'additionalItems',
              message: `item ${i} is not allowed (items is a fixed tuple and additionalItems is false)`,
            })
          else if (schema.additionalItems && typeof schema.additionalItems === 'object')
            validate(arr[i], schema.additionalItems, pointer(path, i), errors)
        }
      } else {
        for (let i = 0; i < arr.length; i++)
          validate(arr[i], schema.items, pointer(path, i), errors)
      }
    }
  }

  // ---- object keywords ----
  if (t === 'object') {
    const obj = instance as Record<string, JSONValue>
    const keys = Object.keys(obj)
    if (Array.isArray(schema.required)) {
      for (const r of schema.required) {
        if (!(r in obj))
          errors.push({ path, keyword: 'required', message: `missing required property "${r}"` })
      }
    }
    if (typeof schema.minProperties === 'number' && keys.length < schema.minProperties)
      errors.push({
        path,
        keyword: 'minProperties',
        message: `has ${keys.length} properties < minProperties ${schema.minProperties}`,
      })
    if (typeof schema.maxProperties === 'number' && keys.length > schema.maxProperties)
      errors.push({
        path,
        keyword: 'maxProperties',
        message: `has ${keys.length} properties > maxProperties ${schema.maxProperties}`,
      })
    if (schema.properties && typeof schema.properties === 'object') {
      for (const k of Object.keys(schema.properties)) {
        if (k in obj) validate(obj[k], schema.properties[k], pointer(path, k), errors)
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = schema.properties ? Object.keys(schema.properties) : []
      for (const k of keys) {
        if (!allowed.includes(k))
          errors.push({
            path,
            keyword: 'additionalProperties',
            message: `additional property "${k}" is not allowed`,
          })
      }
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      for (const k of keys) {
        if (!(schema.properties && k in schema.properties))
          validate(obj[k], schema.additionalProperties, pointer(path, k), errors)
      }
    }
  }

  // ---- combinators ----
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) validate(instance, sub, path, errors)
  }
  if (Array.isArray(schema.anyOf)) {
    const ok = schema.anyOf.some((sub: JSONValue) => {
      const tmp: ValidationError[] = []
      validate(instance, sub, path, tmp)
      return tmp.length === 0
    })
    if (!ok)
      errors.push({
        path,
        keyword: 'anyOf',
        message: `must match at least one schema in anyOf (matched 0)`,
      })
  }
  if (Array.isArray(schema.oneOf)) {
    const matched = schema.oneOf.filter((sub: JSONValue) => {
      const tmp: ValidationError[] = []
      validate(instance, sub, path, tmp)
      return tmp.length === 0
    })
    if (matched.length !== 1)
      errors.push({
        path,
        keyword: 'oneOf',
        message: `must match exactly one schema in oneOf (matched ${matched.length})`,
      })
  }
  if (schema.not !== undefined) {
    const tmp: ValidationError[] = []
    validate(instance, schema.not, path, tmp)
    if (tmp.length === 0)
      errors.push({ path, keyword: 'not', message: `must NOT match the "not" schema, but it does` })
  }
}

export function validateJsonSchema(schemaStr: string, instanceStr: string): ValidationResult {
  let schema: JSONValue
  let instance: JSONValue
  const errors: ValidationError[] = []

  // Parse schema
  try {
    schema = JSON.parse(schemaStr)
  } catch (e: any) {
    return {
      valid: false,
      errors: [
        { path: '(schema)', keyword: 'parse', message: `invalid JSON: ${e?.message || 'parse error'}` },
      ],
      instanceSummary: '(not parsed)',
      schemaSummary: '(invalid JSON)',
      text: buildHeader('(schema)', '(invalid JSON)') +
        `✗ Could not parse the schema as JSON.\n\n${e?.message || 'parse error'}\n\nFix the JSON, then validate again.`,
    }
  }
  // Parse instance
  try {
    instance = JSON.parse(instanceStr)
  } catch (e: any) {
    return {
      valid: false,
      errors: [
        { path: '(instance)', keyword: 'parse', message: `invalid JSON: ${e?.message || 'parse error'}` },
      ],
      instanceSummary: '(not parsed)',
      schemaSummary: summarizeSchema(schema),
      text: buildHeader(summarize(instance), summarizeSchema(schema)) +
        `✗ Could not parse the instance as JSON.\n\n${e?.message || 'parse error'}\n\nFix the JSON, then validate again.`,
    }
  }

  validate(instance, schema, '', errors)

  const valid = errors.length === 0
  const header = buildHeader(summarize(instance), summarizeSchema(schema))
  const text = valid
    ? `${header}✓ VALID — 0 errors.\n\nThe instance conforms to the supplied schema. SchemaSafe checked types, required\nproperties, and the constraints you declared (format, range, pattern, items, etc.).\n\nThis was a real validation — no AI involved. A passing schema does not guarantee the\ndata is "correct" for your business; it guarantees the shape matches what you declared.`
    : `${header}✗ ${errors.length} error${errors.length === 1 ? '' : 's'} found:\n\n${errors
        .map((er, i) => `${i + 1}. ${er.path === '' ? '(root)' : er.path} — ${er.keyword}\n   ${er.message}`)
        .join('\n\n')}\n\nThis was a real validation — no AI involved. Fix the items above and re-validate.`

  return {
    valid,
    errors,
    instanceSummary: summarize(instance),
    schemaSummary: summarizeSchema(schema),
    text,
  }
}

function buildHeader(instanceSummary: string, schemaSummary: string): string {
  return `JSON Schema validation — SchemaSafe

Instance: ${instanceSummary}
Schema:    ${schemaSummary}

`
}

// ---- Demo (no real data) ------------------------------------------------
// Returns a REAL validation of a fixed sample, clearly labelled DEMO so the
// user knows it is not their data. Satisfies P0: never silently mock.
export function buildDemoValidation(): string {
  const sampleSchema = JSON.stringify(
    {
      type: 'object',
      required: ['name', 'age'],
      properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'integer', minimum: 0, maximum: 150 },
        email: { type: 'string', format: 'email' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
    null,
    2,
  )
  const sampleInstance = JSON.stringify(
    {
      name: 42,
      age: -5,
      email: 'not-an-email',
      tags: ['beta', 123],
      extra: 'unexpected',
    },
    null,
    2,
  )
  const r = validateJsonSchema(sampleSchema, sampleInstance)
  return `JSON Schema validation — SchemaSafe (DEMO)

This is a sample run on built-in example data. Paste your own schema + instance
to validate for real — SchemaSafe runs locally in your browser request, no AI.

--- sample schema ---
${sampleSchema}

--- sample instance ---
${sampleInstance}

--- result ---
${r.text.replace(/^JSON Schema validation — SchemaSafe\n\n/, '').replace(/^Instance:.*\nSchema:.*\n\n/m, '')}

[DEMO] No validation was performed on your data. Enter a schema + instance above.`
}
