/**
 * Pure helpers for collapsible admin sidebar groups.
 */

export function findActiveGroupLabel(groups, pathname) {
  for (const group of groups) {
    if (group.items.some((item) => item.path === pathname)) {
      return group.label;
    }
  }
  return null;
}

export function isNavGroupOpen(label, collapsedLabels, activeGroupLabel) {
  if (label === activeGroupLabel) return true;
  return !collapsedLabels.includes(label);
}

export function toggleCollapsedLabel(collapsedLabels, label) {
  if (collapsedLabels.includes(label)) {
    return collapsedLabels.filter((item) => item !== label);
  }
  return [...collapsedLabels, label];
}
