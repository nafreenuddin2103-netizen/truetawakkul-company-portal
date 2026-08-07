import { OnboardingStatus } from '../enums/onboarding-status.enum.js';

export interface OnboardingApplicationProps {
  id: string;
  applicationNumber: string;
  masjidId: string;
  status: OnboardingStatus;
  currentStep: number;
  masjidNameEnglish: string;
  city: string;
  state: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  draftPayload?: Record<string, unknown>;
  isLocked: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class OnboardingApplicationEntity {
  constructor(private readonly props: OnboardingApplicationProps) {}

  get id(): string {
    return this.props.id;
  }

  get applicationNumber(): string {
    return this.props.applicationNumber;
  }

  get masjidId(): string {
    return this.props.masjidId;
  }

  get status(): OnboardingStatus {
    return this.props.status;
  }

  get currentStep(): number {
    return this.props.currentStep;
  }

  get masjidNameEnglish(): string {
    return this.props.masjidNameEnglish;
  }

  get city(): string {
    return this.props.city;
  }

  get isLocked(): boolean {
    return this.props.isLocked;
  }

  get version(): number {
    return this.props.version;
  }

  public toJSON(): OnboardingApplicationProps {
    return { ...this.props };
  }
}
