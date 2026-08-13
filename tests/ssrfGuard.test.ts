import { validateUrlForSSRF, SSRFError } from '../src/utils/ssrfGuard';

describe('SSRF Guard Security Utility', () => {
  it('should allow valid public HTTPS URLs', async () => {
    const result = await validateUrlForSSRF('https://httpbin.org/get');
    expect(result.url.hostname).toBe('httpbin.org');
    expect(result.resolvedIp).toBeDefined();
  });

  it('should block localhost and 127.0.0.1', async () => {
    await expect(validateUrlForSSRF('http://127.0.0.1:8080')).rejects.toThrow(SSRFError);
    await expect(validateUrlForSSRF('http://localhost')).rejects.toThrow(SSRFError);
  });

  it('should block private network IP ranges (10.x, 192.168.x, 172.16.x)', async () => {
    await expect(validateUrlForSSRF('http://10.0.0.1/admin')).rejects.toThrow(SSRFError);
    await expect(validateUrlForSSRF('http://192.168.1.1')).rejects.toThrow(SSRFError);
    await expect(validateUrlForSSRF('http://172.16.0.1')).rejects.toThrow(SSRFError);
  });

  it('should block AWS cloud metadata service (169.254.169.254)', async () => {
    await expect(validateUrlForSSRF('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(SSRFError);
  });

  it('should reject non-HTTP/HTTPS protocols like file://, ftp://, gopher://', async () => {
    await expect(validateUrlForSSRF('file:///etc/passwd')).rejects.toThrow(SSRFError);
    await expect(validateUrlForSSRF('ftp://example.com')).rejects.toThrow(SSRFError);
  });
});
