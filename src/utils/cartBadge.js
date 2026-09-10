/**
 * Header cart badge must match the cart page.
 * Guest leftover in localStorage must not survive after login.
 */
export function resolveCartBadge({
  authLoading,
  isAuthenticated,
  guestCount = 0,
  serverBeats,
  serverCourses,
  serverError = false,
}) {
  if (authLoading) return null;
  if (!isAuthenticated) return Number(guestCount) || 0;
  if (serverError) return 0;
  const beats = Array.isArray(serverBeats) ? serverBeats.length : 0;
  const courses = Array.isArray(serverCourses) ? serverCourses.length : 0;
  return beats + courses;
}
