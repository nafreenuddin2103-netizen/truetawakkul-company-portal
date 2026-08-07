import { UserRoleCode } from '../enums/user-role-code.enum.js';

export interface RoleProps {
  id: string;
  code: UserRoleCode;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: Date;
}

export class RoleEntity {
  constructor(private readonly props: RoleProps) {}

  get id(): string {
    return this.props.id;
  }

  get code(): UserRoleCode {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  public toJSON(): RoleProps {
    return { ...this.props };
  }
}
