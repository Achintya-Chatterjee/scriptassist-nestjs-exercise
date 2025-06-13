import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddIndexesToTasksTable1749845894657 implements MigrationInterface {
  name = 'AddIndexesToTasksTable1749845894657';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_priority',
        columnNames: ['priority'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('tasks', 'IDX_tasks_priority');
    await queryRunner.dropIndex('tasks', 'IDX_tasks_status');
    await queryRunner.dropIndex('tasks', 'IDX_tasks_user_id');
  }
}
