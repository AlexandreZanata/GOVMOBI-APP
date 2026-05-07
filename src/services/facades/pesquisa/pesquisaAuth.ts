/**
 * @fileoverview Auth headers for Pesquisa API calls.
 */

export function pesquisaAuthHeaders(getToken: () => string | null): Record<string, string> {
  const token = getToken();
  return token
    ? {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}
    : {'Content-Type': 'application/json'};
}
