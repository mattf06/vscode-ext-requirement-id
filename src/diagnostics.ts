/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

/** To demonstrate code actions associated with Diagnostics problems, this file provides a mock diagnostics entries. */

import * as vscode from "vscode";

/** Code that is used to associate diagnostic entries with code actions. */
export const REQDEF_MENTION = "requirement_id";

/** String to detect in the text document. */
const REGEXID:string = "^id\\: SOAR-(\\d+)-(.*)-(\\d+)";

/**
 * Analyzes the text document for problems.
 * @param doc text document to analyze
 * @param reqdefDiagnostics diagnostic collection
 */
export function refreshDiagnostics(
  doc: vscode.TextDocument,
  reqdefDiagnostics: vscode.DiagnosticCollection
): void {
  const diagnostics: vscode.Diagnostic[] = [];

  const regexp = new RegExp(vscode.workspace.getConfiguration('requirement').get('regexid') ?? REGEXID);

  for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
    const lineOfText = doc.lineAt(lineIndex);
    
    if (lineOfText.text.match(regexp)) {
      let severity = vscode.DiagnosticSeverity.Information;
      if (alreadyExist(diagnostics, lineOfText.text)) {
        severity = vscode.DiagnosticSeverity.Error;
      }
      const diag = createDiagnostic(doc, lineOfText, lineIndex, severity, regexp);
      if (diag !== null) {
        diagnostics.push(diag);
      }
    }
  }

  reqdefDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnostic(
  doc: vscode.TextDocument,
  lineOfText: vscode.TextLine,
  lineIndex: number,
  severity: vscode.DiagnosticSeverity,
  regexp: RegExp
): vscode.Diagnostic | null {
  // find where in the line of that the 'emoji' is mentioned
  const matches = lineOfText.text.match(regexp);

  if (matches === null || matches?.length < 3) {
    return null;
  }

  let index = lineOfText.text.length;

  // create range that represents, where in the document the word is
  const range = new vscode.Range(
    lineIndex,
    4,
    lineIndex,
    lineOfText.text.length
  );

  const source = `SOAR-${matches[1]}-${matches[2]}-${matches[3]}`;
  const diagnostic = new vscode.Diagnostic(range, source, severity);

  if (severity === vscode.DiagnosticSeverity.Error) {
    const range2 = new vscode.Range(
      lineIndex,
      lineOfText.text.length - 4,
      lineIndex,
      lineOfText.text.length
    );
    diagnostic.message = "cannot have already defined requirement!";
    diagnostic.range = range2;
    diagnostic.relatedInformation = [
      new vscode.DiagnosticRelatedInformation(
        new vscode.Location(doc.uri, range2),
        "duplicated id"
      ),
    ];
  }
  diagnostic.source = source;
  diagnostic.code = REQDEF_MENTION;

  console.log("createDiag: " + diagnostic.source);

  return diagnostic;
}

export function subscribeToDocumentChanges(
  context: vscode.ExtensionContext,
  reqdefDiagnostics: vscode.DiagnosticCollection
): void {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(
      vscode.window.activeTextEditor.document,
      reqdefDiagnostics
    );
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        refreshDiagnostics(editor.document, reqdefDiagnostics);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) =>
      refreshDiagnostics(e.document, reqdefDiagnostics)
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) =>
      reqdefDiagnostics.delete(doc.uri)
    )
  );
}

function alreadyExist(diagnostics: vscode.Diagnostic[], text: string): boolean {
  for (let i = 0; i < diagnostics.length; i++) {
    if (
      diagnostics[i].code === REQDEF_MENTION &&
      diagnostics[i].message.includes(text)
    ) {
      return true;
    }
  }
  return false;
}
