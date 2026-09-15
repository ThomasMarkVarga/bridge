import { describe, it, expect } from 'vitest'
import { filterOptions } from '../Picker.jsx'

const countries = [
  { value: 'AX', label: 'Åland Islands', keywords: 'AX' },
  { value: 'CM', label: 'Cameroon', keywords: 'CM' },
  { value: 'RO', label: 'Romania', keywords: 'RO' },
  { value: 'GB', label: 'United Kingdom', keywords: 'GB uk britain england' },
  { value: 'US', label: 'United States', keywords: 'US usa america' }
]
const values = (query) => filterOptions(countries, query).map((o) => o.value)

describe('the picker search', () => {
  it('shows everything until something is typed', () => {
    expect(values('  ')).toHaveLength(countries.length)
  })

  it('finds a country by its code or another name people use', () => {
    expect(values('uk')).toEqual(['GB'])
    expect(values('USA')).toEqual(['US'])
  })

  it('ignores accents', () => {
    expect(values('aland')).toEqual(['AX'])
  })

  it('lists names that start with the search before names that only contain it', () => {
    expect(values('ro')).toEqual(['RO', 'CM'])
    expect(values('united')).toEqual(['GB', 'US'])
  })
})
