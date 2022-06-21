// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { subscribeToDocumentChanges, REQDEF_MENTION } from './diagnostics';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "reqdef" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("reqdef.helloWorld", () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage("Hello World from ReqDef!");
  });

  context.subscriptions.push(disposable);

  /*
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { pattern: "**" },
      new ReqDefNumbering(),
      {
        providedCodeActionKinds: ReqDefNumbering.providedCodeActionKinds,
      }
    )
  );
  */

  const reqDefDiagnostics =
    vscode.languages.createDiagnosticCollection("req-def");
	
  context.subscriptions.push(reqDefDiagnostics);

  context.subscriptions.push(
	vscode.languages.registerCodeActionsProvider("markdown", new ReqDefInfo(), {
		providedCodeActionKinds: ReqDefInfo.providedCodeActionKinds
	})
);

  subscribeToDocumentChanges(context, reqDefDiagnostics);
}

interface MyInlineCompletionItem extends vscode.InlineCompletionItem {
  someTrackingId: number;
}

// this method is called when your extension is deactivated
export function deactivate() {}

export class ReqDefNumbering implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction[] | undefined {
    if (!this.isReqDef(document, range)) {
      return;
    }

    const replaceWithSmileyCatFix = this.createFix(document, range, "😺");

    const replaceWithSmileyFix = this.createFix(document, range, "😀");
    // Marking a single fix as `preferred` means that users can apply it with a
    // single keyboard shortcut using the `Auto Fix` command.
    replaceWithSmileyFix.isPreferred = true;

    const replaceWithSmileyHankyFix = this.createFix(document, range, "💩");

    const commandAction = this.createCommand();

    return [
      replaceWithSmileyCatFix,
      replaceWithSmileyFix,
      replaceWithSmileyHankyFix,
      commandAction,
    ];
  }

  private isReqDef(document: vscode.TextDocument, range: vscode.Range) {
    const regexp = /^id\: SOAR-(\d+)-(.*)-(\d+)/;

    const start = range.start;
    const line = document.lineAt(start.line).text;
    const matches = line.match(regexp);

    return matches !== null;
  }

  private createFix(
    document: vscode.TextDocument,
    range: vscode.Range,
    emoji: string
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      `Convert to ${emoji}`,
      vscode.CodeActionKind.QuickFix
    );
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.replace(
      document.uri,
      new vscode.Range(range.start, range.start.translate(0, 2)),
      emoji
    );
    return fix;
  }

  private createCommand(): vscode.CodeAction {
    const action = new vscode.CodeAction(
      "Learn more...",
      vscode.CodeActionKind.Empty
    );
	/*
    action.command = {
      command: COMMAND,
      title: "Learn more about emojis",
      tooltip: "This will open the unicode emoji page.",
    };
	*/
    return action;
  }
}

export class ReqDefInfo implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.Empty
	];

	provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
		// for each diagnostic entry that has the matching `code`, create a code action command
		return context.diagnostics
			.filter(diagnostic => (diagnostic.code === REQDEF_MENTION && diagnostic.severity === vscode.DiagnosticSeverity.Error))
			.map(diagnostic => this.createCommandCodeAction(diagnostic));
	}

	private createCommandCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
		console.log(diagnostic);
		const action = new vscode.CodeAction('Learn more...', diagnostic.severity === vscode.DiagnosticSeverity.Error ? vscode.CodeActionKind.QuickFix : vscode.CodeActionKind.Empty);
		//action.command = { command: COMMAND, title: 'Learn more about emojis', tooltip: 'This will open the unicode emoji page.' };
		action.diagnostics = [diagnostic];
		action.isPreferred = true;
		return action;
	}
}