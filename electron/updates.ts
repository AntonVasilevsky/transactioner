export interface UpdateCheckResult {
  available: boolean
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  error?: string
}

interface GitHubRelease {
  tag_name?: string
  html_url?: string
  draft?: boolean
  prerelease?: boolean
}

const RELEASE_API_URL = 'https://api.github.com/repos/AntonVasilevsky/transactioner/releases/latest'
const ALLOWED_RELEASE_HOST = 'github.com'
const ALLOWED_RELEASE_PATH_PREFIX = '/AntonVasilevsky/transactioner/releases/'

export const normalizeVersion = (version: string) => version.trim().replace(/^v/i, '')

export const compareVersions = (left: string, right: string) => {
  const leftParts = normalizeVersion(left).split('.').map(part => Number.parseInt(part, 10) || 0)
  const rightParts = normalizeVersion(right).split('.').map(part => Number.parseInt(part, 10) || 0)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] || 0
    const rightPart = rightParts[index] || 0
    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }

  return 0
}

export const isAllowedReleaseUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === ALLOWED_RELEASE_HOST &&
      parsed.pathname.startsWith(ALLOWED_RELEASE_PATH_PREFIX)
    )
  } catch {
    return false
  }
}

export const checkForUpdate = async (currentVersion: string): Promise<UpdateCheckResult> => {
  try {
    const response = await fetch(RELEASE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Transactioner'
      }
    })

    if (response.status === 404) {
      return { available: false, currentVersion }
    }

    if (!response.ok) {
      return { available: false, currentVersion, error: `GitHub returned ${response.status}` }
    }

    const release = await response.json() as GitHubRelease
    const latestVersion = normalizeVersion(release.tag_name || '')

    if (!latestVersion || release.draft || !release.html_url || !isAllowedReleaseUrl(release.html_url)) {
      return { available: false, currentVersion }
    }

    return {
      available: compareVersions(latestVersion, currentVersion) > 0,
      currentVersion,
      latestVersion,
      releaseUrl: release.html_url
    }
  } catch (err) {
    return {
      available: false,
      currentVersion,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}
