import { IRoleRepository } from '../../application/ports/role-repository.port.js';
import { RoleEntity, RoleProps } from '../../domain/entities/role.entity.js';
import { UserRoleCode } from '../../domain/enums/user-role-code.enum.js';
import { db } from '../database/pg-client.js';

export class PgRoleRepository implements IRoleRepository {
  public async findByCode(code: UserRoleCode): Promise<RoleEntity | null> {
    const res = await db.query('SELECT * FROM app.roles WHERE code = $1', [code]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  public async findAll(): Promise<RoleEntity[]> {
    const res = await db.query('SELECT * FROM app.roles ORDER BY code ASC');
    return res.rows.map((row) => this.mapToEntity(row));
  }

  private mapToEntity(row: Record<string, unknown>): RoleEntity {
    const props: RoleProps = {
      id: String(row.id),
      code: row.code as UserRoleCode,
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      isSystem: Boolean(row.is_system),
      createdAt: new Date(String(row.created_at))
    };
    return new RoleEntity(props);
  }
}
