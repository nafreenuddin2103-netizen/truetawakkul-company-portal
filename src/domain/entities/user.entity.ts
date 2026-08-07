import { UserStatus } from '../enums/user-status.enum.js';
import { UserRoleCode } from '../enums/user-role-code.enum.js';

export interface UserProps {
  id: string;
  fullName: string;
  mobilePhone: string;
  whatsappPhone?: string | null;
  email?: string | null;
  designation?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  status: UserStatus;
  roles?: UserRoleCode[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class UserEntity {
  constructor(private readonly props: UserProps) {}

  get id(): string {
    return this.props.id;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get mobilePhone(): string {
    return this.props.mobilePhone;
  }

  get email(): string | null | undefined {
    return this.props.email;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get roles(): UserRoleCode[] {
    return this.props.roles ?? [];
  }

  get version(): number {
    return this.props.version;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public hasRole(roleCode: UserRoleCode): boolean {
    return this.roles.includes(roleCode);
  }

  public isCompanySuperAdmin(): boolean {
    return this.hasRole(UserRoleCode.COMPANY_SUPER_ADMIN);
  }

  public toJSON(): UserProps {
    return { ...this.props };
  }
}
