/**
 * Command handler contract for VS Code command adapters.
 * Handles UI concerns (progress notifications, user input, error display).
 * Delegates business logic to use cases.
 */
export interface ICommandHandler<TInput = void, TOutput = void> {
	/**
	 * Executes the command with UI integration.
	 * @param input - Command-specific input (optional)
	 * @returns Promise resolving when command completes
	 */
	execute(input?: TInput): Promise<TOutput>;
}
