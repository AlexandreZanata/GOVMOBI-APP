import { Repository, ObjectLiteral, EntityManager } from 'typeorm';

export abstract class BaseRepository<T extends ObjectLiteral> {
  protected constructor(protected readonly repository: Repository<T>) {}

  public async findById(id: string): Promise<T | null> {
    // We assume the entity has an 'id' property of type string.
    // In TypeORM this is usually queried with { where: { id } }
    // however for a pure generic we might need a workaround or assume the shape.
    const result = await this.repository.findOne({
      where: { id: id as any },
    });
    return result;
  }

  public async save(entity: T, entityManager?: EntityManager): Promise<void> {
    const mgr = entityManager || this.repository.manager;
    // We save using the specific entity target to ensure proper hooks/listeners
    await mgr.save(this.repository.target, entity);
  }

  public async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
