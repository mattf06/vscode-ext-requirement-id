import * as vscode from "vscode";
import * as path from 'path';

export class ReqIDOutlineProvider
    implements vscode.TreeDataProvider<vscode.Diagnostic>
{
    private _onDidChangeTreeData: vscode.EventEmitter<
        vscode.Diagnostic | vscode.Diagnostic[] | undefined | void
    > = new vscode.EventEmitter<vscode.Diagnostic | vscode.Diagnostic[] | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.Diagnostic | vscode.Diagnostic[] | undefined | void> = this._onDidChangeTreeData.event;

    private _diagnostics: vscode.DiagnosticCollection;
    private editor?: vscode.TextEditor;
    private context: vscode.ExtensionContext;

    constructor(
        context: vscode.ExtensionContext,
        diagnostics: vscode.DiagnosticCollection
    ) {
        this.context = context;
        this._diagnostics = diagnostics;
        const view = vscode.window.createTreeView("ReqIdView", {
            treeDataProvider: this,
            showCollapseAll: true,
        });
        context.subscriptions.push(view);

        vscode.window.onDidChangeActiveTextEditor(() =>
            this.onActiveEditorChanged()
        );
        vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e));

        this.onActiveEditorChanged();
    }

    private onActiveEditorChanged(): void {
        if (vscode.window.activeTextEditor) {
            if (vscode.window.activeTextEditor.document.uri.scheme === "file") {
                const enabled = vscode.window.activeTextEditor.document.languageId === "markdown";
                vscode.commands.executeCommand('setContext', 'reqidOutlineEnabled', enabled);
                if (enabled) {
                    this.editor = vscode.window.activeTextEditor;
                    this.refresh();
                }
            }
        } else {
            vscode.commands.executeCommand('setContext', 'reqidOutlineEnabled',false);
        }
    }

    private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
        if (
            this.editor &&
            changeEvent.document.uri.toString() ===
            this.editor.document.uri.toString()
        ) {
            for (const change of changeEvent.contentChanges) {
                this.refresh();
            }
        }
    }

    public refresh(): void {
        console.log("refresh");
        /*
        if (this.editor && this._diagnostics.has(this.editor.document.uri)) {
            const diagnostics: vscode.Diagnostic[] = [];
            this._diagnostics
                .get(this.editor.document.uri)
                ?.map((diag) => diagnostics.push(diag));
            this._onDidChangeTreeData.fire();
        }
        */
        this._onDidChangeTreeData.fire();
    }

    public select(range: vscode.Range) {
        if (this.editor) {
            this.editor.selection = new vscode.Selection(range.start, range.end);
            this.editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        }
    }

    getTreeItem(
        element: vscode.Diagnostic
    ): vscode.TreeItem /*| Thenable<vscode.TreeItem>*/ {
        if (element.source) {
            const label: string = element.source;
            const treeItem: vscode.TreeItem = new vscode.TreeItem(label);
            treeItem.command = {
                command: 'extension.openReqIdSelection',
                title: '',
                arguments: [element.range],
            };
            if (element.severity !== vscode.DiagnosticSeverity.Error) {
                treeItem.iconPath = {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'check.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'check.svg'))
                };
            }
            else
            {
                treeItem.iconPath = {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'error.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'error.svg'))
                };
            }
            return treeItem;
        } else {
            return new vscode.TreeItem("*");
        }
    }

    getChildren(
        element?: vscode.Diagnostic | undefined
    ): vscode.ProviderResult<vscode.Diagnostic[]> {
        if (this.editor && this._diagnostics.has(this.editor.document.uri)) {
            const diagnostics: vscode.Diagnostic[] = [];
            this._diagnostics
                .get(this.editor.document.uri)
                ?.map((diag) => diagnostics.push(diag));
            return Promise.resolve(diagnostics);
        } else {
            return Promise.resolve([]);
        }
    }
}
