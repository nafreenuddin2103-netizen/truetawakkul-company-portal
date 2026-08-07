import crypto from 'crypto';

export class OtpService {
  public static generateCode(): string {
    const num = crypto.randomInt(100000, 1000000);
    return num.toString();
  }

  public static hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  public static verifyOtp(plainOtp: string, hashedOtp: string): boolean {
    const computed = this.hashOtp(plainOtp);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hashedOtp));
  }
}
