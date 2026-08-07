import { describe, it, expect } from 'vitest';
import { OtpService } from '../../../src/shared/crypto/otp.service.js';

describe('OtpService Cryptographic Unit Tests', () => {
  it('should generate a 6-digit numeric OTP code', () => {
    const code = OtpService.generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('should hash and verify OTP codes using SHA-256 with timing safety', () => {
    const code = '482910';
    const hash = OtpService.hashOtp(code);
    expect(hash.length).toBe(64); // SHA-256 hex string

    const isValid = OtpService.verifyOtp(code, hash);
    expect(isValid).toBe(true);

    const isInvalid = OtpService.verifyOtp('000000', hash);
    expect(isInvalid).toBe(false);
  });
});
