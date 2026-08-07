import { UserEntity } from '../../domain/entities/user.entity.js';
import { UserRoleCode } from '../../domain/enums/user-role-code.enum.js';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByMobilePhone(mobilePhone: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<UserEntity>;
  assignRole(userId: string, roleCode: UserRoleCode, grantedBy: string): Promise<void>;
  getUserRoles(userId: string): Promise<UserRoleCode[]>;
}
