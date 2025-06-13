export class BatchProcessTasksCommand {
  constructor(public readonly operations: { tasks: string[]; action: string }) {}
}
