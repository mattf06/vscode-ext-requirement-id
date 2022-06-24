import * as vscode from "vscode";

const REGEXP_YAML = /```yaml\s([\s\S]*?)\s*(?<req>.*)```/gm;
const REGEXP_REQ = /id:\s(?<id>.*)[\s\S]*?title:\s(?<title>[\w|\W|\s]*)[\s\S]*?applicability:\s(?<appli>.*)[\s\S]*?version:\s(?<ver>.*)[\s\S]*?regulation:\s(?<reg>.*)[\s\S]*?MyFX:\s(?<fx>.*)/i;

export class ReqInfo {
    public id: string;
    public title: string;
    public applicability?: string;
    public version?: string;
    public regulation?: string;
    public myFx?: string;

    constructor(id: string, title: string, applicability?: string, version?: string, regulation?: string, myFx?: string) {
        this.id = id;
        this.title = title;
        if (this.title?.at(0) === '|')
        {
            this.title = this.title.substring(4).split("\r\n ").join().trim();
        }
        else
        {
            this.title = this.title.split("\r\n ").join().trim();
        }
        this.applicability = applicability;
        this.version = version;
        this.regulation = regulation;
        this.myFx = myFx;
    }
}

export class ReqIDParser {
    private doc: vscode.TextDocument;

    constructor(doc: vscode.TextDocument) {
        this.doc = doc;
    }

    public getReqInfo(): Record<number, ReqInfo> {
        let infos: Record<string, ReqInfo> = {};

        const text = this.doc.getText();
        let matches;
        while ((matches = REGEXP_YAML.exec(text)) !== null) {
            const req = matches[1].trim();

            const line = this.doc.lineAt(this.doc.positionAt(matches.index).line+1).lineNumber;

            const matchesreq = REGEXP_REQ.exec(req);
            if (matchesreq && matchesreq.groups?.id) {
                const reqinfo = new ReqInfo(matchesreq.groups?.id,
                    matchesreq.groups?.title, matchesreq.groups?.appli, matchesreq.groups?.ver, matchesreq.groups?.reg, matchesreq.groups?.fx);
                infos[line] = reqinfo;
            }
        }

        return infos;
    }
}