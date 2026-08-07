import { RoleEntity } from '../../domain/entities/role.entity.js';
import { UserRoleCode } from '../../domain/enums/user-role-code.enum.js';

export interface IRoleRepository {
  findByCode(code: UserRoleCode): Promise<RoleEntity | null>;
  findAll(): Promise<RoleEntity[]>;
}
