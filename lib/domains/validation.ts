/**
 * Domain Normalization and Strict Validation
 * RFC 1123 compliant hostname parsing and security sanitization.
 */

export function normalizeDomain(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let domain = raw.trim().toLowerCase();

  // Strip protocol (http:// or https://)
  domain = domain.replace(/^https?:\/\//, '');

  // Strip any userinfo (e.g. user:pass@)
  domain = domain.replace(/^[^/@]+@/, '');

  // Strip paths, query strings, and fragments
  domain = domain.replace(/[/?#].*$/, '');

  // Strip port numbers (e.g. :3000)
  domain = domain.replace(/:\d+$/, '');

  // Strip trailing dot (DNS root)
  domain = domain.replace(/\.+$/, '');

  return domain.trim();
}

export function validateDomain(hostname: string): { valid: boolean; error?: string } {
  if (!hostname) {
    return { valid: false, error: 'Domain name is required' };
  }

  // Reject leading or trailing dots
  if (hostname.startsWith('.') || hostname.endsWith('.')) {
    return { valid: false, error: 'Domain cannot begin or end with a dot' };
  }

  // Length limits per RFC 1035 / 1123
  if (hostname.length < 3 || hostname.length > 253) {
    return { valid: false, error: 'Domain name must be between 3 and 253 characters' };
  }

  // Reject wildcards
  if (hostname.includes('*')) {
    return { valid: false, error: 'Wildcard domains are not supported' };
  }

  // Reject localhost
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { valid: false, error: 'Localhost cannot be used as a custom domain' };
  }

  // Reject IPv4 addresses
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    return { valid: false, error: 'IP addresses cannot be used as custom domains' };
  }

  // Reject IPv6 addresses
  if (hostname.includes(':') || hostname.startsWith('[') || hostname.endsWith(']')) {
    return { valid: false, error: 'IPv6 addresses cannot be used as custom domains' };
  }

  // Check for forbidden characters
  if (/[_~`!@#$%^&*()+=|\\{}[\]:;"'<>,?/]/.test(hostname)) {
    return { valid: false, error: 'Domain contains invalid characters' };
  }

  // Check reserved / private TLDs
  const reservedTlds = ['.local', '.internal', '.lan', '.test', '.example', '.invalid'];
  if (reservedTlds.some((tld) => hostname.endsWith(tld))) {
    return { valid: false, error: 'Private and reserved internal domains cannot be used' };
  }

  // Check root app collision
  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || 'pingr.site').toLowerCase();
  if (hostname === appDomain || hostname === `www.${appDomain}`) {
    return { valid: false, error: 'The apex application domain cannot be used as a custom status page' };
  }

  // Split into labels
  const labels = hostname.split('.');
  if (labels.length < 2) {
    return { valid: false, error: 'Please enter a fully-qualified domain name (e.g. status.yourcompany.com)' };
  }

  // Validate each label
  for (const label of labels) {
    if (label.length === 0) {
      return { valid: false, error: 'Domain cannot contain consecutive dots' };
    }
    if (label.length > 63) {
      return { valid: false, error: 'Domain label exceeds 63 characters' };
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return { valid: false, error: 'Domain labels cannot begin or end with a hyphen' };
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      return { valid: false, error: 'Domain labels must only contain letters, numbers, and hyphens' };
    }
  }

  // Validate TLD (last label)
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) {
    return { valid: false, error: 'Domain must have a valid top-level domain (e.g. .com, .org, .site)' };
  }

  return { valid: true };
}
