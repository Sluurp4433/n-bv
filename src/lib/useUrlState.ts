import { useSearchParams } from 'react-router-dom'

/**
 * Speglar en enskild query-parameter i URL:en (fungerar med HashRouter).
 * Bevarar övriga parametrar, använder replace (skapar inte historikposter per
 * tangenttryck) och tar bort nyckeln när värdet = initial → rena URL:er.
 * Effekt: webbläsarens bakåt återställer sök/filter, och sökningar blir bokmärkbara.
 */
export function useUrlParam(key: string, initial = ''): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? initial
  const setValue = (v: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v === '' || v === initial) next.delete(key)
        else next.set(key, v)
        return next
      },
      { replace: true }
    )
  }
  return [value, setValue]
}
