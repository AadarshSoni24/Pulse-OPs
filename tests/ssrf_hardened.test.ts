import { validateUrlForSSRF, validateRedirectTarget, SSRFError } from '../src/utils/ssrfGuard';

describe('Hardened SSRF Guard & Redirect Protection Suite', () => {
  describe('Direct Hostname and IP Range Blocking', () => {
    it('should allow valid public domain URLs', async () => {
      const result = await validateUrlForSSRF('https://example.com');
      expect(result.url.hostname).toBe('example.com');
      expect(result.resolvedIp).toBeDefined();
    });

    it('should block 127.0.0.1, localhost, and 0.0.0.0', async () => {
      await expect(validateUrlForSSRF('http://127.0.0.1')).rejects.toThrow(SSRFError);
      await expect(validateUrlForSSRF('http://localhost')).rejects.toThrow(SSRFError);
      await expect(validateUrlForSSRF('http://0.0.0.0')).rejects.toThrow(SSRFError);
    });

    it('should block IPv6 loopback (::1)', async () => {
      await expect(validateUrlForSSRF('http://[::1]')).rejects.toThrow(SSRFError);
    });

    it('should block IPv4-mapped IPv6 addresses (::ffff:127.0.0.1)', async () => {
      await expect(validateUrlForSSRF('http://[::ffff:127.0.0.1]')).rejects.toThrow(SSRFError);
    });

    it('should block private IPv4 subnets (10.x, 172.16.x, 192.168.x)', async () => {
      await expect(validateUrlForSSRF('http://10.10.1.5/internal')).rejects.toThrow(SSRFError);
      await expect(validateUrlForSSRF('http://172.16.0.2')).rejects.toThrow(SSRFError);
      await expect(validateUrlForSSRF('http://192.168.0.100')).rejects.toThrow(SSRFError);
    });

    it('should block AWS cloud metadata IP (169.254.169.254)', async () => {
      await expect(validateUrlForSSRF('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(SSRFError);
    });
  });

  describe('HTTP Redirect Target Validation', () => {
    it('should allow redirect to legitimate public URL', async () => {
      const target = await validateRedirectTarget('https://example.com/start', 'https://example.com/final');
      expect(target).toBe('https://example.com/final');
    });

    it('should allow relative redirect to public URL', async () => {
      const target = await validateRedirectTarget('https://example.com/v1/test', '/v2/test');
      expect(target).toBe('https://example.com/v2/test');
    });

    it('should reject redirect targeting internal IP 169.254.169.254', async () => {
      await expect(
        validateRedirectTarget('https://legitimate-site.com', 'http://169.254.169.254/latest/user-data')
      ).rejects.toThrow(SSRFError);
    });

    it('should reject redirect targeting localhost or 127.0.0.1', async () => {
      await expect(
        validateRedirectTarget('https://legitimate-site.com', 'http://127.0.0.1/admin')
      ).rejects.toThrow(SSRFError);
    });
  });
});
