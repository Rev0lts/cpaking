/** Plataforma ativa quando `active` é true ou não definido (retrocompatível). */
export function isPlatformActive(platform) {
  return platform?.active !== false;
}

export function getActivePlatformIds(platforms = []) {
  return new Set(platforms.filter(isPlatformActive).map((p) => p.id));
}

/** Exclui contas vinculadas a plataformas inativas. */
export function filterAccountsByActivePlatforms(accounts = [], platforms = []) {
  const activeIds = getActivePlatformIds(platforms);
  return accounts.filter((a) => a.platform_id && activeIds.has(a.platform_id));
}

export function filterActivePlatforms(platforms = []) {
  return platforms.filter(isPlatformActive);
}

export function filterInactivePlatforms(platforms = []) {
  return platforms.filter((p) => p.active === false);
}
