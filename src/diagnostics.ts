/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

/** To demonstrate code actions associated with Diagnostics problems, this file provides a mock diagnostics entries. */

import * as vscode from "vscode";
import { ReqIDParser, ReqInfo } from "./parser";


/** Code that is used to associate diagnostic entries with code actions. */
export const REQDEF_MENTION = "requirement_id";
export const DUPTITLE_MENTION = "requirement_dup_title";

export enum DiagnosticMismatch {

  NoMismatch = 0,
  DuplicateID = 1,
  DuplicateTitle = 2,
}

/** String to detect in the text document. */
const REGEXID: string = "^id\\: SOAR-(\\d+)-(.*)-(\\d+)";

const REGEXTITLE: string = "^title\\:(?<title>[.*\\s\\S]*?)applicability\\:";


function getReq(txt: vscode.TextLine, regexp: RegExp): string | null {
  const matches = txt.text.match(regexp);
  if (matches) {
    const source = `SOAR-${matches[1]}-${matches[2]}-${matches[3]}`;
    return source;
  }
  return null;
}

function getTile(txt: vscode.TextLine): string | null {
  const matches = txt.text.match(REGEXTITLE);
  if (matches) {
    const source = matches[1].trim();
    return source;
  }
  return null;
}

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

  // check duplicate IDs
  for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
    const lineOfText = doc.lineAt(lineIndex);
    let matches = lineOfText.text.match(regexp);
    if (matches) {
      let severity = vscode.DiagnosticSeverity.Information;
      let mismatch = DiagnosticMismatch.NoMismatch;
      if (alreadyExist(diagnostics, getReq(lineOfText, regexp))) {
        severity = vscode.DiagnosticSeverity.Error;
        mismatch = DiagnosticMismatch.DuplicateID;
      }
      const diag = createDiagnostic(doc, lineOfText, lineIndex, severity, regexp, mismatch);
      if (diag !== null) {
        diagnostics.push(diag);
      }
    }
  }

  // check duplicate titles
  const parser = new ReqIDParser(doc);
  const reqs = parser.getReqInfo();
  for (let k in reqs) {
    for (let kk in reqs) {
      if (k !== kk) {
        const id1 = reqs[k].id;
        const title1 = reqs[k].title;
        const id2 = reqs[kk].id;
        const title2 = reqs[kk].title;
        if (id1 !== id2 && title1 === title2) {
          const severity = vscode.DiagnosticSeverity.Error;
          const mismatch = DiagnosticMismatch.DuplicateTitle;
          const line = Number.parseInt(kk)+1;
          const diag = createDiagnosticDupTitle(doc, id2, doc.lineAt(line), line, severity, mismatch, title1, Number.parseInt(k)+1, id1);
          if (diag !== null) {
            diagnostics.push(diag);
          }
        }
      }
    }
  }


  reqdefDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnosticDupTitle(
  doc: vscode.TextDocument,
  id: string,
  lineOfText: vscode.TextLine,
  lineIndex: number,
  severity: vscode.DiagnosticSeverity,
  mismatch: DiagnosticMismatch,
  title: string,
  duplicateIndex: number,
  duplicateID: string
): vscode.Diagnostic | null {

  let index = lineOfText.text.length;
  const range = new vscode.Range(
    lineIndex,
    6,
    lineIndex,
    lineOfText.text.length
  );

  const diagnostic = new vscode.Diagnostic(range, id, severity);

  diagnostic.message = "Duplicate title with " + duplicateID;
  diagnostic.range = range;

  const range2 = new vscode.Range(
    duplicateIndex,
    6,
    duplicateIndex,
    title.length
  );

  diagnostic.relatedInformation = [
    new vscode.DiagnosticRelatedInformation(
      new vscode.Location(doc.uri, range2),
      "duplicated title"
    ),
  ];

  diagnostic.source = id;
  diagnostic.code = DUPTITLE_MENTION;

  //console.log("createDiag: " + diagnostic.source);

  return diagnostic;
}

function createDiagnostic(
  doc: vscode.TextDocument,
  lineOfText: vscode.TextLine,
  lineIndex: number,
  severity: vscode.DiagnosticSeverity,
  regexp: RegExp,
  mismatch: DiagnosticMismatch
): vscode.Diagnostic | null {

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
    switch (mismatch) {
      case DiagnosticMismatch.DuplicateID:
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(doc.uri, range2),
            "duplicated id"
          ),
        ];
        break;

      case DiagnosticMismatch.DuplicateTitle:
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(doc.uri, range2),
            "duplicated title"
          ),
        ];
        break;
    }
  }
  diagnostic.source = source;
  diagnostic.code = REQDEF_MENTION;

  //console.log("createDiag: " + diagnostic.source);

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

function alreadyExist(diagnostics: vscode.Diagnostic[], text: string | null): boolean {
  for (let i = 0; i < diagnostics.length; i++) {
    if (
      diagnostics[i].code === REQDEF_MENTION &&
      diagnostics[i].source === text
    ) {
      return true;
    }
  }
  return false;
}
